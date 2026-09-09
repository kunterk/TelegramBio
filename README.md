# Telegram Bio Scrobbler 🎵

A smart Telegram bot that automatically updates your bio with your currently playing track from Last.fm.

## Features ✨

- 🎶 **Real-time Music Tracking** - Automatically fetch your current track from Last.fm
- 🤖 **Intelligent Bio Updates** - Seamlessly update your Telegram bio without manual intervention
- 🛡️ **Respects Manual Edits** - 24-hour grace period for manual bio changes (bot won't interfere)
- ⚡ **Async Performance** - Non-blocking async/await for fast I/O operations
- 🔄 **Automatic Restart** - Exponential backoff with crash prevention
- 📊 **Local State Tracking** - Persistent state file to minimize API calls
- ✋ **Graceful Shutdown** - Clean shutdown on SIGINT/SIGTERM signals
- 📝 **Structured Logging** - Comprehensive logging for debugging

## How It Works 🔍

### Hybrid Failsafe System

The bot uses a three-pronged approach to manage your Telegram bio:

1. **Option 1 - Invisible Marker** 👤
   - Bot adds a zero-width space (`\u200b`) at the end of bio updates
   - Allows bot to detect if it previously updated the bio
   - Enables smart decision-making on future updates

2. **Option 3 - Local State** 💾
   - Stores last known song in `bot_state.json`
   - Skips Last.fm API calls if the song hasn't changed
   - Reduces API rate limiting issues

3. **24-Hour Manual Override** ⏰
   - If you manually edit your bio (without the marker), bot gives you 24 hours
   - After 24 hours, bot resumes automatic updates
   - Perfect for maintaining your bio when needed

### Decision Tree

```
Is song status = last recorded song AND no manual bio detected?
├─ YES → Skip API call (optimize performance)
└─ NO → Proceed to check bio

Is bio EMPTY or contains INVISIBLE_MARKER?
├─ YES → Update bio (bot-managed)
└─ NO → Check manual edit status

Is manual edit timestamp set?
├─ NO → Record timestamp (start 24h countdown)
├─ YES & < 24h → Respect manual bio (don't update)
└─ YES & > 24h → Resume automatic updates
```

## Quick Start 🚀

### 1. Clone and Install
```bash
git clone https://github.com/kunterk/telegram-bio-scrobble.git
cd telegram-bio-scrobble
pip install -r requirements.txt
```

### 2. Set Environment Variables
```bash
export API_ID="your_api_id"
export API_HASH="your_api_hash"
export SESSION_STRING="your_session_string"
export LASTFM_API_KEY="your_lastfm_api_key"
export LASTFM_USERNAME="your_lastfm_username"
```

### 3. Run the Bot
```bash
python runner.py  # With auto-restart (recommended)
# or
python main.py    # Direct run
```

**Detailed setup instructions:** See [SETUP.md](SETUP.md)

## Environment Variables 🔧

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_ID` | ✅ Yes | - | Your Telegram API ID |
| `API_HASH` | ✅ Yes | - | Your Telegram API Hash |
| `SESSION_STRING` | ✅ Yes | - | Your Pyrogram session string |
| `LASTFM_API_KEY` | ✅ Yes | - | Your Last.fm API key |
| `LASTFM_USERNAME` | ✅ Yes | - | Your Last.fm username |
| `POLL_INTERVAL` | ❌ No | `30` | Seconds between Last.fm checks (min 15 recommended) |
| `BIO_MAX_LEN` | ❌ No | `140` | Max characters for Telegram bio (max 140) |

## File Structure 📁

```
telegram-bio-scrobble/
├── main.py              # Core bot logic (async)
├── runner.py            # Process manager with exponential backoff
├── requirements.txt     # Python dependencies (pinned versions)
├── bot_state.json       # State file (auto-generated)
├── .gitignore          # Git ignore rules
├── README.md           # This file
├── SETUP.md            # Detailed installation guide
├── CONTRIBUTING.md     # Contribution guidelines
└── LICENSE             # MIT License
```

## State File (bot_state.json)

The bot maintains a local state file to track:
- **last_song**: Last known song status (avoid duplicate API calls)
- **manual_timestamp**: When manual bio edit was detected (24h protection)

Example:
```json
{
  "last_song": "🎶 Playing: Bohemian Rhapsody - Queen",
  "manual_timestamp": 0
}
```

## Logging 📊

The bot provides structured logging:

```
2026-09-06 10:30:45,123 [INFO] Pyrogram client dimulakan.
2026-09-06 10:30:47,456 [INFO] 🎵 Lagu masih sama. Memotong panggilan API Telegram.
2026-09-06 10:31:17,789 [INFO] 🤖 Bio Telegram dikemas kini -> 🎶 Playing: Song - Artist​
2026-09-06 10:31:47,890 [WARNING] Telegram FloodWait dikesan! Berehat selama 30 saat...
```

## Performance 📈

### API Call Optimization

- **Last.fm**: ~30-second intervals (configurable via `POLL_INTERVAL`)
- **Telegram**: Only calls `get_chat("me")` when song changes
- **State Caching**: Skips ALL API calls if song and manual status unchanged
- **Rate Limit Safe**: Default 30-second interval prevents 429 errors

### Example Daily Usage

```
30s interval = 2,880 checks/day
With state caching:
- 50% cache hit rate = ~1,440 actual API calls
- Telegram calls: Only on song change (varies by user activity)
```

## Troubleshooting 🔧

### "Missing required environment variable"
- Ensure all required env vars are set
- Use `export VAR=value` on Linux/Mac or `set VAR=value` on Windows

### "FloodWait 30 saat"
- Increase `POLL_INTERVAL` to 60+ seconds
- Bot will automatically wait and retry

### Bot keeps restarting
- Check logs for Python errors
- Verify Last.fm API key is valid
- Check Telegram API credentials

### Bio not updating
- Verify SESSION_STRING is still valid
- Check if manual bio is in grace period (24h countdown)
- Verify Last.fm account has recent tracks

## Deployment 🌐

- **Local Machine**: `python runner.py`
- **Docker**: See [SETUP.md](SETUP.md#option-2-docker)
- **VPS/Linux**: Systemd service (see [SETUP.md](SETUP.md#option-3-virtual-private-server-vps))
- **Other**: Railway, Render, Fly.io, etc.

## Architecture 🏗️

### Async Design

```
Main (async)
├── Start Pyrogram Client
├── Register Signal Handlers
├── poll_and_update() loop
│   ├── Fetch from Last.fm (async/aiohttp)
│   ├── Check local state
│   ├── Get Telegram bio (async/Pyrogram)
│   ├── Decide: Update/Skip/Wait
│   └── Wait POLL_INTERVAL (interruptible)
└── Graceful Shutdown
    └── Stop Pyrogram Client
```

### Runner with Backoff

```
Start main.py
├─ Success & runtime > 60s → Reset backoff to 5s
├─ Crash & runtime < 60s → Increase backoff (5→10→20→...→300s)
└─ Repeat
```

## Contributing 🤝

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- How to report bugs
- How to suggest enhancements
- Development guidelines
- Pull request process

## License 📜

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits 🙏

- [Pyrogram](https://pyrogram.org/) - Telegram API library
- [aiohttp](https://docs.aiohttp.org/) - Async HTTP client
- [Last.fm API](https://www.last.fm/api) - Music tracking service

## Support 🤝

For issues, questions, or suggestions:
- 📋 [Open an issue](https://github.com/kunterk/telegram-bio-scrobble/issues)
- 📖 Check [SETUP.md](SETUP.md) for installation help
- 💻 Check [CONTRIBUTING.md](CONTRIBUTING.md) for development

---

**Happy scrobbling!** 🎵
