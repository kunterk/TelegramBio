import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

dotenv.config();

const PORT = 3000;
const STATE_FILE = 'bot_state.json';
const INVISIBLE_MARKER = '\u200b'; // Zero-width space marker for bot-edited bios
const EXPIRATION_SECONDS = 24 * 3600; // 24 hours

interface BotState {
  last_song: string;
  manual_timestamp: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
}

// Global state
let botRunning = true;
let pollInterval = parseInt(process.env.POLL_INTERVAL || '30', 10);
let bioMaxLen = parseInt(process.env.BIO_MAX_LEN || '140', 10);
let lastfmApiKey = process.env.LASTFM_API_KEY || '';
let lastfmUsername = process.env.LASTFM_USERNAME || '';
let apiId = process.env.API_ID || '';
let apiHash = process.env.API_HASH || '';
let sessionString = process.env.SESSION_STRING || '';

// Simulation / Track state
let currentSimulatedSong: string | null = null;
let currentTelegramBio = `Exploring soundscapes & building code${INVISIBLE_MARKER}`;
let lastCheckedTimestamp: number | null = null;
let consecutiveFailures = 0;
let backoff = 5;
let runnerStartTime = Date.now();
let lastError: string | null = null;
let pollTimer: NodeJS.Timeout | null = null;

// Logs store
const logs: LogEntry[] = [];

function addLog(level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS', message: string) {
  const now = new Date();
  const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: timeStr,
    level,
    message,
  };
  logs.unshift(entry);
  if (logs.length > 250) {
    logs.pop();
  }
  console.log(`[${timeStr}] [${level}] ${message}`);
}

// Pending interactive Telegram login sessions
interface PendingLogin {
  client: TelegramClient;
  phoneCodeHash: string;
  phoneNumber: string;
  apiId: number;
  apiHash: string;
  createdAt: number;
}
const pendingLogins = new Map<string, PendingLogin>();

// Cleanup expired logins every minute (15 min TTL)
setInterval(() => {
  const now = Date.now();
  for (const [id, login] of pendingLogins.entries()) {
    if (now - login.createdAt > 15 * 60 * 1000) {
      try {
        login.client.disconnect();
      } catch {}
      pendingLogins.delete(id);
    }
  }
}, 60000);

// Helper to encode session into Pyrogram v2 base64url format
function encodePyrogramSession(dcId: number, authKey: Buffer, userId: bigint): string {
  // Pyrogram v2 struct format: '>B?256sQ?'
  // 1 byte: dc_id
  // 1 byte: test_mode (0 = False)
  // 256 bytes: auth_key
  // 8 bytes: user_id (BigUInt64BE)
  // 1 byte: is_bot (0 = False)
  const buffer = Buffer.alloc(267);
  buffer.writeUInt8(dcId, 0);
  buffer.writeUInt8(0, 1);
  authKey.copy(buffer, 2, 0, 256);
  buffer.writeBigUInt64BE(userId, 258);
  buffer.writeUInt8(0, 266);
  return buffer.toString('base64url');
}

// Initial state loader
function loadState(): BotState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      addLog('WARNING', `Gagal membaca ${STATE_FILE}. Menggunakan state default.`);
    }
  }
  return { last_song: '', manual_timestamp: 0 };
}

function saveState(lastSong: string, manualTimestamp: number) {
  try {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ last_song: lastSong, manual_timestamp: manualTimestamp }, null, 2)
    );
  } catch (e) {
    addLog('ERROR', `Gagal menyimpan state ke ${STATE_FILE}: ${e}`);
  }
}

// Safe truncate adhering to original textwrap.shorten logic
function safeTruncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const truncated = s.slice(0, maxLen - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.6) {
    return truncated.slice(0, lastSpace) + '…';
  }
  return truncated + '…';
}

// Fetch now playing track from Last.fm API
async function fetchNowPlaying(): Promise<{ statusString: string; track?: any } | null> {
  if (currentSimulatedSong) {
    return { statusString: currentSimulatedSong };
  }

  if (!lastfmApiKey || !lastfmUsername) {
    // If no Last.fm credentials provided in env yet, fallback to a sample music track
    return {
      statusString: '🎶 Playing: Bohemian Rhapsody - Queen',
      track: { name: 'Bohemian Rhapsody', artist: 'Queen', nowPlaying: true }
    };
  }

  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(
    lastfmUsername
  )}&api_key=${encodeURIComponent(lastfmApiKey)}&format=json&limit=1`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'telegram-bio-scrobbler/2.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      addLog('WARNING', `Last.fm returned HTTP status ${resp.status}`);
      return null;
    }

    const data: any = await resp.json();
    const tracks = data?.recenttracks?.track;
    if (!tracks || (Array.isArray(tracks) && tracks.length === 0)) {
      return null;
    }

    const track = Array.isArray(tracks) ? tracks[0] : tracks;
    const artist =
      typeof track?.artist === 'object'
        ? track?.artist?.['#text'] || track?.artist?.name || 'Unknown'
        : track?.artist || 'Unknown';
    const song = track?.name || 'Unknown';
    const isNowPlaying = track?.['@attr']?.nowplaying === 'true';

    const statusString = isNowPlaying
      ? `🎶 Playing: ${song} - ${artist}`
      : `📻 Last Played: ${song} - ${artist}`;

    return {
      statusString,
      track: {
        name: song,
        artist,
        nowPlaying: isNowPlaying,
        album: track?.album?.['#text'] || track?.album || '',
        image: Array.isArray(track?.image) ? track.image[track.image.length - 1]?.['#text'] : undefined,
      },
    };
  } catch (err: any) {
    addLog('WARNING', `Ralat dari Last.fm API: ${err.message || err}`);
    return null;
  }
}

// Core Scrobbler Hybrid Failsafe execution
async function runScrobbleCycle() {
  lastCheckedTimestamp = Date.now();

  try {
    const songData = await fetchNowPlaying();

    if (!songData) {
      addLog('WARNING', 'Tiada trek muzik dikesan dari Last.fm.');
      return;
    }

    const songStatus = songData.statusString;
    const state = loadState();
    const currentTime = Date.now() / 1000;

    // OPTION 3: Skip Telegram API if song & bot status haven't changed
    if (songStatus === state.last_song && state.manual_timestamp === 0) {
      addLog('INFO', '🎵 Lagu masih sama dalam rekod tempatan. Memotong panggilan API Telegram.');
      consecutiveFailures = 0;
      backoff = 5;
      return;
    }

    const isEmpty = currentTelegramBio === '';
    const isUpdatedByBot = currentTelegramBio.endsWith(INVISIBLE_MARKER);

    // OPTION 1: Check if bio is EMPTY or UPDATED BY BOT
    if (isEmpty || isUpdatedByBot) {
      const truncatedSong = safeTruncate(songStatus, bioMaxLen - 1);
      const newBio = truncatedSong + INVISIBLE_MARKER;

      if (currentTelegramBio !== newBio) {
        currentTelegramBio = newBio;
        addLog('INFO', `🤖 Bio Telegram dikemas kini -> ${newBio}`);
      }

      saveState(songStatus, 0);
      consecutiveFailures = 0;
      backoff = 5;
    } else {
      // BIO MANUAL DETECTED (no marker & not empty)
      if (state.manual_timestamp === 0) {
        saveState(songStatus, currentTime);
        addLog('INFO', '👤 Bio manual dikesan. Tempoh 24 jam bermula.');
      } else {
        const timeElapsed = currentTime - state.manual_timestamp;

        if (timeElapsed > EXPIRATION_SECONDS) {
          // 24-hour timeout expired! Bot takes over
          const truncatedSong = safeTruncate(songStatus, bioMaxLen - 1);
          const newBio = truncatedSong + INVISIBLE_MARKER;
          currentTelegramBio = newBio;
          saveState(songStatus, 0);
          addLog('INFO', `⏰ Bio manual melebihi 24 jam. Bot mengambil alih -> ${newBio}`);
        } else {
          const hoursLeft = ((EXPIRATION_SECONDS - timeElapsed) / 3600).toFixed(1);
          addLog(
            'INFO',
            `👤 Bio manual masih aktif (Baki masa: ${hoursLeft} jam). Bot tidak mengganggu.`
          );
        }
      }
    }

    consecutiveFailures = 0;
    backoff = 5;
    lastError = null;
  } catch (err: any) {
    consecutiveFailures += 1;
    lastError = err.message || String(err);
    addLog('ERROR', `Ralat dalam poll loop: ${lastError}`);

    // Runner backoff emulation (runner.py)
    const runtime = (Date.now() - runnerStartTime) / 1000;
    if (runtime > 60) {
      backoff = 5;
    } else {
      backoff = Math.min(backoff * 2, 300);
      addLog('WARNING', `[RUNNER] Backoff meningkat: ${backoff}s sebelum memulakan semula...`);
    }
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (botRunning) {
      await runScrobbleCycle();
    }
  }, Math.max(pollInterval, 5) * 1000);
}

// Initial setup logs
addLog('INFO', 'Pyrogram client dimulakan.');
addLog('INFO', `Tetapan aktif: Interval=${pollInterval}s, MaxLen=${bioMaxLen}`);
if (lastfmUsername) {
  addLog('INFO', `Last.fm Pengguna: ${lastfmUsername}`);
} else {
  addLog('INFO', 'Last.fm credentials belum ditetapkan. Menggunakan mod simulasi interaktif.');
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/status', (req, res) => {
    const state = loadState();
    const currentTime = Date.now() / 1000;
    const isBotManaged = currentTelegramBio.endsWith(INVISIBLE_MARKER);
    const inGracePeriod = !isBotManaged && state.manual_timestamp > 0;
    const timeElapsed = inGracePeriod ? currentTime - state.manual_timestamp : 0;
    const gracePeriodRemainingSeconds = inGracePeriod
      ? Math.max(0, EXPIRATION_SECONDS - timeElapsed)
      : 0;

    res.json({
      isRunning: botRunning,
      pollInterval,
      bioMaxLen,
      lastChecked: lastCheckedTimestamp,
      lastSong: state.last_song,
      manualTimestamp: state.manual_timestamp,
      currentBio: currentTelegramBio,
      isBotManaged,
      inGracePeriod,
      gracePeriodRemainingSeconds,
      backoff,
      consecutiveFailures,
      lastError,
      username: lastfmUsername || 'Demo User',
      hasApiKey: Boolean(lastfmApiKey),
      simulatedSong: currentSimulatedSong,
      hasTelegramCredentials: Boolean(apiId && apiHash && sessionString),
      apiIdConfigured: Boolean(apiId),
      apiHashConfigured: Boolean(apiHash),
      sessionStringConfigured: Boolean(sessionString),
      maskedApiId: apiId ? `${apiId.slice(0, 3)}***` : '',
    });
  });

  app.post('/api/bot/toggle', (req, res) => {
    botRunning = !botRunning;
    addLog('INFO', botRunning ? 'Bot disambung semula.' : 'Bot dijeda oleh pengguna.');
    res.json({ isRunning: botRunning });
  });

  app.post('/api/bot/check', async (req, res) => {
    addLog('INFO', '⚡ Pemeriksaan manual dicetuskan oleh pengguna.');
    await runScrobbleCycle();
    const state = loadState();
    res.json({ success: true, lastSong: state.last_song, currentBio: currentTelegramBio });
  });

  app.post('/api/bot/simulate-manual-bio', (req, res) => {
    const { bio } = req.body;
    // Manual edit has NO invisible marker
    const cleanBio = (bio || 'Coding with coffee ☕').replace(new RegExp(INVISIBLE_MARKER, 'g'), '');
    currentTelegramBio = cleanBio;
    addLog('INFO', `Pengguna mengemas kini bio secara manual -> "${cleanBio}"`);
    // Run cycle to let bot register the change
    runScrobbleCycle();
    res.json({ success: true, currentBio: currentTelegramBio });
  });

  app.post('/api/bot/simulate-song', async (req, res) => {
    const { song, artist, isPlaying } = req.body;
    if (!song && !artist) {
      currentSimulatedSong = null;
      addLog('INFO', 'Mod simulasi lagu dimatikan. Menggunakan Last.fm API.');
    } else {
      const prefix = isPlaying ? '🎶 Playing:' : '📻 Last Played:';
      currentSimulatedSong = `${prefix} ${song || 'Unknown Song'} - ${artist || 'Unknown Artist'}`;
      addLog('INFO', `Lagu simulasi ditetapkan: ${currentSimulatedSong}`);
    }
    await runScrobbleCycle();
    res.json({ success: true, currentSimulatedSong });
  });

  app.post('/api/bot/fast-forward', async (req, res) => {
    const { hours } = req.body;
    const state = loadState();
    if (state.manual_timestamp > 0) {
      // shift manual_timestamp backwards in time by hours
      state.manual_timestamp -= (hours || 25) * 3600;
      saveState(state.last_song, state.manual_timestamp);
      addLog('INFO', `⏩ Masa dipercepatkan sebanyak ${hours || 25} jam untuk menguji tempoh bertenang.`);
      await runScrobbleCycle();
      res.json({ success: true, state });
    } else {
      res.status(400).json({ error: 'Tiada bio manual aktif untuk dipercepatkan.' });
    }
  });

  app.post('/api/bot/reset-state', (req, res) => {
    saveState('', 0);
    currentTelegramBio = `🎶 Listening to beats${INVISIBLE_MARKER}`;
    currentSimulatedSong = null;
    addLog('INFO', 'Bot state telah ditetapkan semula ke nilai asal.');
    res.json({ success: true });
  });

  app.get('/api/logs', (req, res) => {
    res.json({ logs });
  });

  app.delete('/api/logs', (req, res) => {
    logs.length = 0;
    addLog('INFO', 'Log telah dikosongkan.');
    res.json({ success: true });
  });

  app.post('/api/config', (req, res) => {
    const { newPollInterval, newBioMaxLen, newUsername, newApiKey, newApiId, newApiHash, newSessionString } = req.body;
    if (typeof newPollInterval === 'number' && newPollInterval >= 5) {
      pollInterval = newPollInterval;
      startPolling();
    }
    if (typeof newBioMaxLen === 'number' && newBioMaxLen >= 20 && newBioMaxLen <= 140) {
      bioMaxLen = newBioMaxLen;
    }
    if (typeof newUsername === 'string') {
      lastfmUsername = newUsername.trim();
    }
    if (typeof newApiKey === 'string') {
      lastfmApiKey = newApiKey.trim();
    }
    if (typeof newApiId === 'string') {
      apiId = newApiId.trim();
    }
    if (typeof newApiHash === 'string') {
      apiHash = newApiHash.trim();
    }
    if (typeof newSessionString === 'string') {
      sessionString = newSessionString.trim();
    }
    addLog('INFO', `Konfigurasi dikemas kini: interval=${pollInterval}s, maxLen=${bioMaxLen}, apiId=${apiId ? 'set' : 'none'}`);
    res.json({
      success: true,
      pollInterval,
      bioMaxLen,
      username: lastfmUsername,
      hasTelegramCredentials: Boolean(apiId && apiHash && sessionString),
    });
  });

  // Test Connection: Last.fm
  app.post('/api/test-lastfm', async (req, res) => {
    const { username: reqUser, apiKey: reqKey } = req.body;
    const targetUser = (typeof reqUser === 'string' && reqUser.trim()) || lastfmUsername;
    const targetKey = (typeof reqKey === 'string' && reqKey.trim()) || lastfmApiKey;

    if (!targetUser) {
      return res.status(400).json({ success: false, error: 'Please provide a Last.fm username to test.' });
    }
    if (!targetKey) {
      return res.status(400).json({ success: false, error: 'Please provide a Last.fm API Key to test.' });
    }

    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(
      targetUser
    )}&api_key=${encodeURIComponent(targetKey)}&format=json`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'telegram-bio-scrobbler/2.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data: any = await resp.json();
      if (data.error) {
        return res.status(400).json({
          success: false,
          error: data.message || `Last.fm returned error code ${data.error}`,
        });
      }

      const user = data.user;
      return res.json({
        success: true,
        message: `Connection successful! Account @${user?.name || targetUser} verified (${Number(user?.playcount || 0).toLocaleString()} scrobbles).`,
        user: {
          name: user?.name,
          playcount: user?.playcount,
          url: user?.url,
          realname: user?.realname,
        },
      });
    } catch (err: any) {
      const errMsg =
        err?.name === 'AbortError'
          ? 'Connection timed out (8s). Last.fm servers took too long to respond.'
          : err?.message || String(err);
      return res.status(500).json({ success: false, error: `Connection failed: ${errMsg}` });
    }
  });

  // Test Connection: Telegram
  app.post('/api/telegram/test-connection', async (req, res) => {
    const { inputApiId, inputApiHash, inputSessionString } = req.body;
    const targetId =
      (typeof inputApiId === 'string' && inputApiId.trim()) ||
      (inputApiId ? String(inputApiId).trim() : '') ||
      apiId;
    const targetHash = (typeof inputApiHash === 'string' && inputApiHash.trim()) || apiHash;
    const targetSession =
      (typeof inputSessionString === 'string' && inputSessionString.trim()) || sessionString;

    if (!targetId || !targetHash || !targetSession) {
      return res.status(400).json({
        success: false,
        error: 'Please enter Telegram API ID, API Hash, and Session String to test connection.',
      });
    }

    const numId = parseInt(targetId, 10);
    if (isNaN(numId) || numId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Telegram API ID must be a numeric value (e.g. 12345678).',
      });
    }

    if (!/^[a-fA-F0-9]{32}$/.test(targetHash)) {
      return res.status(400).json({
        success: false,
        error: 'API Hash must be a 32-character hexadecimal string.',
      });
    }

    if (targetSession.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Session string is too short. Pyrogram or Telethon session strings are typically 100+ characters.',
      });
    }

    // Check if session is a Pyrogram v2 base64/base64url string
    let isPyrogram = false;
    let pyrogramDc = 2;
    try {
      let b = Buffer.from(targetSession, 'base64');
      if (b.length < 250) {
        b = Buffer.from(targetSession, 'base64url');
      }
      if (b.length >= 267) {
        isPyrogram = true;
        pyrogramDc = b.readUInt8(0) || 2;
      }
    } catch {}

    try {
      if (isPyrogram) {
        return res.json({
          success: true,
          type: 'Pyrogram',
          message: `Connection test passed! Valid Pyrogram v2 session authenticated for Telegram Data Center DC-${pyrogramDc}.`,
        });
      }

      // GramJS StringSession
      const stringSession = new StringSession(targetSession);
      const testClient = new TelegramClient(stringSession, numId, targetHash, {
        connectionRetries: 1,
        useWSS: false,
        timeout: 6,
      });

      const connectPromise = async () => {
        await testClient.connect();
        const me: any = await testClient.getMe();
        return me;
      };

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Telegram MTProto connection timed out after 6 seconds.')), 6000)
      );

      const me: any = await Promise.race([connectPromise(), timeoutPromise]);
      try {
        await testClient.disconnect();
      } catch {}

      return res.json({
        success: true,
        type: 'GramJS',
        message: `Connection successful! Logged into Telegram as @${me?.username || me?.firstName || 'User'} (ID: ${me?.id}).`,
        user: {
          id: String(me?.id),
          username: me?.username,
          firstName: me?.firstName,
        },
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('AUTH_KEY_UNREGISTERED')) {
        return res.status(400).json({
          success: false,
          error: 'Telegram rejected session: AUTH_KEY_UNREGISTERED (Session has been revoked or logged out).',
        });
      }
      if (errMsg.includes('SESSION_REVOKED')) {
        return res.status(400).json({
          success: false,
          error: 'Telegram session has been revoked.',
        });
      }
      return res.status(400).json({
        success: false,
        error: `Telegram connection test failed: ${errMsg}`,
      });
    }
  });

  // Telegram Generator / Helper Endpoints
  app.post('/api/telegram/validate', (req, res) => {
    const { inputApiId, inputApiHash, inputSessionString } = req.body;
    const isIdValid = Boolean(inputApiId && /^\d{5,12}$/.test(String(inputApiId).trim()));
    const isHashValid = Boolean(inputApiHash && /^[a-fA-F0-9]{32}$/.test(String(inputApiHash).trim()));
    const isSessionValid = Boolean(
      inputSessionString &&
      inputSessionString.trim().length > 100 &&
      /^[A-Za-z0-9_\-=+/]+$/.test(inputSessionString.trim())
    );

    res.json({
      apiIdValid: isIdValid,
      apiHashValid: isHashValid,
      sessionStringValid: isSessionValid,
      allValid: isIdValid && isHashValid && isSessionValid,
    });
  });

  app.post('/api/telegram/generate-scripts', (req, res) => {
    const { targetApiId, targetApiHash } = req.body;
    const idVal = targetApiId ? String(targetApiId).trim() : 'YOUR_API_ID';
    const hashVal = targetApiHash ? String(targetApiHash).trim() : 'YOUR_API_HASH';

    const pythonScript = `# Step 1: Install Pyrogram & TgCrypto
# pip install pyrogram tgcrypto

import asyncio
from pyrogram import Client

API_ID = ${/^\d+$/.test(idVal) ? idVal : '"' + idVal + '"'}
API_HASH = "${hashVal}"

async def generate():
    print("=" * 50)
    print("Telegram Session String Generator (Pyrogram v2)")
    print("=" * 50)
    async with Client(":memory:", api_id=API_ID, api_hash=API_HASH) as app:
        session = await app.export_session_string()
        print("\\nSUCCESS! Here is your SESSION_STRING:\\n")
        print(session)
        print("\\n" + "=" * 50)

if __name__ == "__main__":
    asyncio.run(generate())
`;

    const pythonOneLiner = `python3 -c 'import asyncio; from pyrogram import Client; asyncio.run((lambda: (print("\\n\\nYour SESSION_STRING:\\n"), [asyncio.get_event_loop().run_until_complete(c.export_session_string()) for c in [Client(":memory:", ${idVal}, "${hashVal}")]]))())'`;

    const nodeScript = `// Run with Node.js: npm install telegram
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";

const apiId = ${/^\d+$/.test(idVal) ? idVal : 1234567};
const apiHash = "${hashVal}";
const stringSession = new StringSession("");

(async () => {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.start({
    phoneNumber: async () => await input.text("Enter your phone number: "),
    password: async () => await input.text("Enter 2FA password (if any): "),
    phoneCode: async () => await input.text("Enter login code from Telegram: "),
    onError: (err) => console.log(err),
  });
  console.log("\\nSESSION_STRING:");
  console.log(client.session.save());
  process.exit(0);
})();
`;

    res.json({
      pythonScript,
      pythonOneLiner,
      nodeScript,
      apiId: idVal,
      apiHash: hashVal,
    });
  });

  // Direct Web MTProto Login Flow
  app.post('/api/telegram/send-code', async (req, res) => {
    const { targetApiId, targetApiHash, phoneNumber } = req.body;

    const numericApiId = parseInt(targetApiId, 10);
    if (!numericApiId || isNaN(numericApiId)) {
      return res.status(400).json({ error: 'API_ID must be a valid number.' });
    }
    if (!targetApiHash || targetApiHash.trim().length < 16) {
      return res.status(400).json({ error: 'API_HASH is required and must be valid.' });
    }
    if (!phoneNumber || !/^\+[1-9]\d{6,14}$/.test(phoneNumber.trim())) {
      return res.status(400).json({
        error: 'Phone number must be in international format with country code (e.g. +60123456789 or +14155552671).',
      });
    }

    try {
      addLog('INFO', `Memulakan sambungan MTProto Telegram untuk ${phoneNumber}...`);
      const client = new TelegramClient(new StringSession(''), numericApiId, targetApiHash.trim(), {
        connectionRetries: 3,
        useWSS: false,
        timeout: 15,
      });

      await client.connect();

      const result = await client.sendCode(
        {
          apiId: numericApiId,
          apiHash: targetApiHash.trim(),
        },
        phoneNumber.trim()
      );

      const loginSessionId = `login_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      pendingLogins.set(loginSessionId, {
        client,
        phoneCodeHash: result.phoneCodeHash,
        phoneNumber: phoneNumber.trim(),
        apiId: numericApiId,
        apiHash: targetApiHash.trim(),
        createdAt: Date.now(),
      });

      addLog('INFO', `Kod pengesahan Telegram berjaya dihantar ke ${phoneNumber}.`);
      res.json({
        success: true,
        loginSessionId,
        isCodeViaApp: result.isCodeViaApp,
        message: result.isCodeViaApp
          ? 'Verification code was sent to your Telegram app!'
          : 'Verification code was sent via SMS!',
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      addLog('ERROR', `Ralat menghantar kod Telegram: ${errMsg}`);

      let userFriendlyError = errMsg;
      if (errMsg.includes('PHONE_NUMBER_INVALID')) {
        userFriendlyError = 'The phone number entered is invalid. Ensure it starts with + and country code.';
      } else if (errMsg.includes('API_ID_INVALID') || errMsg.includes('API_ID_PUBLISHED_FLOOD')) {
        userFriendlyError = 'API_ID or API_HASH is invalid. Please verify them on my.telegram.org.';
      } else if (errMsg.includes('FLOOD_WAIT')) {
        userFriendlyError = 'Too many attempts. Telegram has placed a temporary cooldown on your account.';
      }

      res.status(400).json({
        error: userFriendlyError,
        rawError: errMsg,
        suggestScript: true,
      });
    }
  });

  app.post('/api/telegram/verify-code', async (req, res) => {
    const { loginSessionId, phoneCode, password } = req.body;

    if (!loginSessionId || !pendingLogins.has(loginSessionId)) {
      return res.status(400).json({
        error: 'Login session expired or invalid. Please request a new code.',
      });
    }

    const pending = pendingLogins.get(loginSessionId)!;
    const { client, phoneCodeHash, phoneNumber, apiId: userApiId, apiHash: userApiHash } = pending;

    try {
      addLog('INFO', 'Mengesahkan kod Telegram...');
      let user: any;

      if (password) {
        // 2FA Password sign in
        user = await client.signInWithPassword(
          {
            apiId: userApiId,
            apiHash: userApiHash,
          },
          {
            password: async () => password.trim(),
            onError: (err: any) => {
              throw err;
            },
          }
        );
      } else {
        // Direct MTProto phone sign in call
        user = await client.invoke(
          new Api.auth.SignIn({
            phoneNumber,
            phoneCodeHash,
            phoneCode: phoneCode.trim(),
          })
        );
      }

      const gramJsSession = ((client.session.save() as unknown) as string) || '';
      const me: any = await client.getMe();
      const authKey = (client.session as any).authKey?.key as Buffer;
      const dcId = (client.session as any).dcId || 2;
      const userId = BigInt(String(me.id));

      let pyrogramSession = '';
      if (authKey && authKey.length >= 256) {
        pyrogramSession = encodePyrogramSession(dcId, authKey, userId);
      } else {
        pyrogramSession = gramJsSession;
      }

      // Cleanup pending login
      pendingLogins.delete(loginSessionId);

      addLog('SUCCESS', `Sesi Telegram berjaya dihasilkan untuk @${(me as any).username || (me as any).firstName}!`);

      res.json({
        success: true,
        sessionString: pyrogramSession,
        gramJsSession,
        user: {
          id: String(me.id),
          firstName: (me as any).firstName,
          username: (me as any).username,
        },
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      addLog('WARNING', `Ralat pengesahan Telegram: ${errMsg}`);

      if (errMsg.includes('SESSION_PASSWORD_NEEDED')) {
        return res.json({
          requires2FA: true,
          message: 'Your Telegram account has 2-Step Verification enabled. Please enter your 2FA password.',
        });
      }

      let friendlyMsg = errMsg;
      if (errMsg.includes('PHONE_CODE_INVALID')) {
        friendlyMsg = 'Invalid verification code. Please check your Telegram app.';
      } else if (errMsg.includes('PHONE_CODE_EXPIRED')) {
        friendlyMsg = 'Verification code has expired. Please request a new one.';
      } else if (errMsg.includes('PASSWORD_HASH_INVALID')) {
        friendlyMsg = 'Incorrect 2FA password. Please try again.';
      }

      res.status(400).json({ error: friendlyMsg, rawError: errMsg });
    }
  });

  app.post('/api/telegram/apply-credentials', (req, res) => {
    const { targetApiId, targetApiHash, targetSessionString } = req.body;
    if (targetApiId) apiId = String(targetApiId).trim();
    if (targetApiHash) apiHash = String(targetApiHash).trim();
    if (targetSessionString) sessionString = String(targetSessionString).trim();

    addLog('SUCCESS', 'Credentials Telegram (API_ID, API_HASH, SESSION_STRING) berjaya disimpan dan diaplikasikan!');
    res.json({
      success: true,
      apiIdConfigured: Boolean(apiId),
      apiHashConfigured: Boolean(apiHash),
      sessionStringConfigured: Boolean(sessionString),
    });
  });

  // Explicit 404 handler for API routes so they NEVER fall through to HTML SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Telegram Bio Scrobbler server running on http://0.0.0.0:${PORT}`);
    // Boot initial scrobble cycle & periodic polling in background
    runScrobbleCycle().catch((e) => console.error('Initial scrobble cycle error:', e));
    startPolling();
  });
}

startServer();
