import React, { useState, useEffect } from 'react';
import { Music, Sparkles, Smile, Sliders, Loader2, Disc, User, CheckCircle2, AlertTriangle } from 'lucide-react';
import { RunnerStatus } from '../types';

interface SimulationSandboxProps {
  status: RunnerStatus | null;
  currentSimulatedSong: string | null;
  onSimulateSong: (song: string, artist: string, isPlaying: boolean, prefix?: string) => void;
  onClearSimulatedSong: () => void;
  onSimulateManualBio: (bio: string, overrideTimer?: string) => void;
  onFastForward: (hours: number) => void;
}

// 10 top Tracks from Last.fm data to maximize space use
const SAMPLE_TRACKS = [
  { song: 'Plastic Love', artist: 'Mariya Takeuchi' },
  { song: 'Mayonaka no Door / Stay With Me', artist: 'Miki Matsubara' },
  { song: 'Sparkle', artist: 'Tatsuro Yamashita' },
  { song: '4:00 AM', artist: 'Taeko Onuki' },
  { song: 'Remember Summer Days', artist: 'Anri' },
  { song: 'Ride On Time', artist: 'Tatsuro Yamashita' },
  { song: 'Flyday Chinatown', artist: 'Yasuha' },
  { song: 'Telephone Number', artist: 'Junko Ohashi' },
  { song: 'Dress Down', artist: 'Kaoru Akimoto' },
  { song: 'Midnight Pretenders', artist: 'Tomoko Aran' },
];

const ICON_OPTIONS = [
  { value: '🎶 Playing:', label: '🎶 Playing (Now Playing)', isPlaying: true },
  { value: '🎵 Playing:', label: '🎵 Playing (Now Playing)', isPlaying: true },
  { value: '🎧 Playing:', label: '🎧 Playing (Now Playing)', isPlaying: true },
  { value: '📻 Last Played:', label: '📻 Last Played (Last Played)', isPlaying: false },
  { value: '⏸️ Last Played:', label: '⏸️ Last Played (Last Played)', isPlaying: false },
];

export const SimulationSandbox: React.FC<SimulationSandboxProps> = ({
  status,
  currentSimulatedSong,
  onSimulateSong,
  onClearSimulatedSong,
  onSimulateManualBio,
  onFastForward,
}) => {
  const [selectedType, setSelectedType] = useState<'song' | 'bio'>('bio');
  const [songData, setSongData] = useState({
    song: 'Risalah Hati',
    artist: 'Dewa 19',
    prefix: '🎶 Playing:',
    isPlaying: true,
  });
  const [bioData, setBioData] = useState({ text: '' });
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [bioSource, setBioSource] = useState<'preset' | 'ai' | 'fallback' | 'initial'>('initial');
  const [overrideTimer, setOverrideTimer] = useState<string>('86400'); // default 24h = 86400 seconds

  // Sync staged bio text with active Telegram bio when status changes or initially loads
  useEffect(() => {
    if (status?.currentBio) {
      setBioData({ text: status.currentBio });
    }
  }, [status?.currentBio]);

  // Compute the derived staged bio text
  const stagedBio = selectedType === 'song'
    ? `${songData.prefix} ${songData.song || 'Untitled Track'} - ${songData.artist || 'Unknown Artist'}`
    : bioData.text;

  const cleanStaged = stagedBio.trim();
  const cleanCurrent = (status?.currentBio || '').trim();
  const isDraftUnsaved = cleanStaged !== cleanCurrent && cleanStaged !== '';

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedType === 'song') {
      onSimulateSong(songData.song, songData.artist, songData.isPlaying, songData.prefix);
    } else {
      onSimulateManualBio(bioData.text, overrideTimer);
    }
  };

  const handleFetchRandomBio = async () => {
    setLoadingRandom(true);
    try {
      const res = await fetch('/api/bot/generate-random-bio', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.bio) {
        setSelectedType('bio');
        setBioData({ text: data.bio });
        if (data.source === 'ai') {
          setBioSource('ai');
        } else if (data.source === 'preset') {
          setBioSource('preset');
        } else {
          setBioSource('fallback');
        }
      } else {
        setBioSource('fallback');
      }
    } catch (e) {
      console.error('Failed to fetch AI random bio:', e);
      setBioSource('fallback');
    } finally {
      setLoadingRandom(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
            INTERACTIVE UPDATER
          </h2>
        </div>
      </div>

      {/* 1. Unified Bio Preview Card at the top */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-sky-400" />
            Bio Preview
          </span>
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
              isDraftUnsaved
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
            }`}
          >
            {isDraftUnsaved ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping mr-1" />
                Draft (Unsaved)
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Active on Telegram
              </>
            )}
          </span>
        </div>

        {/* Telegram Bio Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 text-sm font-sans text-slate-100 min-h-[64px] flex items-center break-all relative">
          <span className="font-mono text-slate-100">{stagedBio || <em className="text-slate-600 italic">No bio content...</em>}</span>
          <span className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-500">
            {stagedBio.length}/140 chars
          </span>
        </div>

        {/* Source indicator note if draft from AI/Presets */}
        {selectedType === 'bio' && bioSource !== 'initial' && (
          <div className="text-[11px] font-mono flex items-center gap-1.5 px-1">
            {bioSource === 'ai' && (
              <span className="text-indigo-400">🤖 Generated with Gemini AI (City Pop &amp; Rojak blend)</span>
            )}
            {bioSource === 'preset' && (
              <span className="text-amber-400">☕ Sourced from custom aesthetic local presets</span>
            )}
            {bioSource === 'fallback' && (
              <span className="text-amber-500">⚠️ Gemini is busy (503) — safely fell back to local custom status</span>
            )}
          </div>
        )}

        {/* Marker & Status Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {selectedType === 'song' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Bot Managed (Marker \u200b will be attached)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950 text-amber-300 border border-amber-800/50">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Manual Edit Override (Marker absent)
              </span>
            )}
          </div>
          {isDraftUnsaved && (
            <button
              type="button"
              onClick={() => {
                setSelectedType('bio');
                setBioData({ text: status?.currentBio || '' });
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              Discard Changes
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Vibe Selection (Music Playback Simulator) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              Vibe Selection
            </span>
            {currentSimulatedSong && (
              <button
                id="btn-clear-simulated-song"
                onClick={onClearSimulatedSong}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-mono underline cursor-pointer"
              >
                Reset to Live API
              </button>
            )}
          </div>

          {/* Quick preset buttons from Last.fm top tracks (2-column grid for space maximization) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_TRACKS.map((t) => {
              const isSelected = selectedType === 'song' && songData.song === t.song && songData.artist === t.artist;
              return (
                <button
                  key={t.song}
                  id={`btn-preset-${t.song.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => {
                    setSelectedType('song');
                    setSongData(prev => ({
                      ...prev,
                      song: t.song,
                      artist: t.artist,
                    }));
                  }}
                  className={`text-left text-xs px-3 py-2 rounded-xl transition-all border flex flex-col justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/80 shadow-md shadow-emerald-950/20'
                      : 'bg-slate-950/80 hover:bg-slate-900 border-slate-850 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-semibold truncate text-[11px]">{t.song}</span>
                  <span className="text-[10px] text-slate-500 truncate mt-0.5">{t.artist}</span>
                </button>
              );
            })}
          </div>

          {/* Custom track inputs */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <input
                id="input-sim-song"
                type="text"
                placeholder="Song Title"
                value={songData.song}
                onChange={(e) => {
                  setSelectedType('song');
                  setSongData(prev => ({ ...prev, song: e.target.value }));
                }}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <input
                id="input-sim-artist"
                type="text"
                placeholder="Artist Name"
                value={songData.artist}
                onChange={(e) => {
                  setSelectedType('song');
                  setSongData(prev => ({ ...prev, artist: e.target.value }));
                }}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            
            {/* Music Icon Prefix & Timer Selection */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {/* Left Side: Music Icon Prefix */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Music Icon &amp; Prefix</span>
                <select
                  id="select-music-icon"
                  value={songData.prefix}
                  onChange={(e) => {
                    setSelectedType('song');
                    const val = e.target.value;
                    const opt = ICON_OPTIONS.find(o => o.value === val);
                    if (opt) {
                      setSongData(prev => ({
                        ...prev,
                        prefix: val,
                        isPlaying: opt.isPlaying,
                      }));
                    }
                  }}
                  className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer w-full"
                >
                  {ICON_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Right Side: Timer Override Selection */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Timer Override Selection</span>
                <select
                  id="select-override-timer"
                  value={overrideTimer}
                  onChange={(e) => {
                    setOverrideTimer(e.target.value);
                  }}
                  className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer w-full"
                >
                  <option value="300">5 Minit</option>
                  <option value="600">10 Minit</option>
                  <option value="900">15 Minit</option>
                  <option value="1800">30 Minit</option>
                  <option value="3600">1 Jam</option>
                  <option value="43200">12 Jam</option>
                  <option value="86400">24 Jam</option>
                  <option value="permanent">Permanent (Kekal)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Status Expression (Manual Bio Customizer) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-amber-400" />
              Status Expression
            </span>
          </div>

          {/* Quick presets for manual bio + "Random..." button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {['Coding late night ☕', 'Vacation mode on 🌴', 'Focusing... 📵'].map((preset) => {
              const isSelected = selectedType === 'bio' && bioData.text === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSelectedType('bio');
                    setBioData({ text: preset });
                  }}
                  className={`text-left text-xs px-3 py-2.5 rounded-xl transition-all border flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-950/40 text-amber-200 border-amber-500/80 shadow-md shadow-amber-950/20'
                      : 'bg-slate-950/80 hover:bg-slate-900 border-slate-850 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="truncate">"{preset}"</span>
                </button>
              );
            })}
            
            {/* Random AI-Powered button */}
            <button
              type="button"
              disabled={loadingRandom}
              onClick={handleFetchRandomBio}
              className="text-left text-xs px-3 py-2.5 rounded-xl transition-all border bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-300 border-indigo-900/50 hover:border-indigo-800 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loadingRandom ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                  <span className="font-medium">Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
                  <span className="font-semibold">Random... ✨</span>
                </>
              )}
            </button>
          </div>

          {/* Form input to type custom bio */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Type Your Custom Bio</span>
            <input
              id="input-manual-bio"
              type="text"
              placeholder="Enter manual bio text..."
              maxLength={140}
              value={bioData.text}
              onChange={(e) => {
                setSelectedType('bio');
                setBioData({ text: e.target.value });
              }}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Action Footer with the Single Submit Button */}
      <div className="pt-4 border-t border-slate-800/40 flex flex-col items-center justify-center gap-3">
        {isDraftUnsaved ? (
          <p className="text-[11px] text-amber-400 flex items-center gap-1.5 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            You have unsaved changes in your Bio Preview.
          </p>
        ) : (
          <p className="text-[11px] text-slate-500">
            Customize your track or status statement above, then press below to sync.
          </p>
        )}
        <button
          id="btn-submit-sim-track"
          onClick={handleUpdateStatus}
          disabled={!stagedBio.trim()}
          className="w-full sm:w-auto px-10 py-3 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg hover:shadow-emerald-950/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
        >
          <span>Update your status 🥹✨</span>
        </button>
      </div>
    </div>
  );
};
