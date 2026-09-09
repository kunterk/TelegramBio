# Telegram Bio Scrobbler 🎵

A full-stack web application that automatically updates your Telegram bio with your currently playing track from Last.fm. Built with Node.js, Express, React, and TypeScript with a modern, interactive dashboard.

## ✨ Features

- 🎶 **Real-time Music Tracking** - Automatically fetch your current track from Last.fm
- 🤖 **Intelligent Bio Updates** - Seamlessly update your Telegram bio without manual intervention
- 🛡️ **Respects Manual Edits** - 24-hour grace period for manual bio changes (bot won't interfere)
- ⚡ **Web Dashboard** - Interactive UI to control the bot, test connections, and monitor logs
- 🔐 **Secure Session Management** - Built-in Telegram MTProto login flow in the browser
- 🤖 **AI-Generated Bios** - Optional Gemini API integration for creative bio suggestions
- 🔄 **Persistent Background Execution** - Deploy on VPS, Docker, or cloud platforms
- 📊 **Real-time Logging** - Comprehensive activity logs in the dashboard
- ✋ **Graceful Shutdown** - Clean shutdown on signals (SIGTERM/SIGINT)
- 🌐 **Multi-platform** - Runs on local machine, Docker, VPS, or cloud (Railway, Render, Fly.io)

## 🔍 How It Works

### Hybrid Failsafe System

The bot uses a three-pronged approach to manage your Telegram bio:

1. **Invisible Marker** 👤
   - Bot adds a zero-width space (`\u200b`) at the end of bio updates
   - Allows bot to detect if it previously updated the bio
   - Enables smart decision-making on future updates

2. **Local State Tracking** 💾
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

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **npm** or **bun** package manager
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/kunterk/TelegramBio.git
cd TelegramBio

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Environment Variables

```env
# Telegram Credentials (from my.telegram.org)
API_ID=123456789
API_HASH=abc123def456ghi789jkl012mno345

# Telegram Session (generated via web UI)
SESSION_STRING=your_pyrogram_session_here

# Last.fm Credentials (from last.fm/api)
LASTFM_API_KEY=your_lastfm_api_key
LASTFM_USERNAME=your_lastfm_username

# Optional: Gemini API for AI-generated bios
GEMINI_API_KEY=your_gemini_api_key

# Optional: Polling configuration
POLL_INTERVAL=30        # seconds, minimum 5
BIO_MAX_LEN=140         # characters, maximum 140
```

### Run Development Server

```bash
npm run dev
# Server runs on http://localhost:3000
```

### Build for Production

```bash
npm run build
npm start
```

## 🌐 Deployment Options

### Docker (Quick & Easy)

```bash
# Build and run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f telegram-bio

# Stop
docker-compose down
```

**Or manually:**

```bash
docker build -t telegram-bio-scrobbler .
docker run -d --name telegram-bio \
  -p 3000:3000 \
  -e API_ID=... -e API_HASH=... -e SESSION_STRING=... \
  -e LASTFM_API_KEY=... -e LASTFM_USERNAME=... \
  telegram-bio-scrobbler
```

### VPS / Linux Server

Full systemd service setup with auto-restart, logging, and HTTPS reverse proxy:

```bash
# See DEPLOYMENT.md for complete VPS setup guide
# Includes:
# - Node.js installation
# - Systemd service configuration
# - Nginx reverse proxy with SSL
# - Health monitoring
```

### Cloud Platforms

Deploy to your preferred cloud provider:

- **Railway.app** - [See guide in DEPLOYMENT.md](DEPLOYMENT.md#railway)
- **Render.com** - [See guide in DEPLOYMENT.md](DEPLOYMENT.md#render)
- **Fly.io** - [See guide in DEPLOYMENT.md](DEPLOYMENT.md#flyio)
- **AWS EC2** - [See guide in DEPLOYMENT.md](DEPLOYMENT.md#aws-ec2)
- **Heroku** - Use Railway or Render instead

**For comprehensive deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**

## 📋 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_ID` | ✅ Yes | - | Your Telegram API ID from [my.telegram.org](https://my.telegram.org) |
| `API_HASH` | ✅ Yes | - | Your Telegram API Hash from [my.telegram.org](https://my.telegram.org) |
| `SESSION_STRING` | ✅ Yes | - | Your Telegram session (generated via web UI or script) |
| `LASTFM_API_KEY` | ✅ Yes | - | Your Last.fm API key from [last.fm/api](https://www.last.fm/api) |
| `LASTFM_USERNAME` | ✅ Yes | - | Your Last.fm username |
| `GEMINI_API_KEY` | ❌ No | - | Optional: Google Gemini API for AI bio generation |
| `POLL_INTERVAL` | ❌ No | `30` | Seconds between Last.fm checks (minimum 5) |
| `BIO_MAX_LEN` | ❌ No | `140` | Max characters for Telegram bio (maximum 140) |
| `NODE_ENV` | ❌ No | `development` | Set to `production` for production builds |

## 📁 Project Structure

```
TelegramBio/
├── server.ts                # Express backend + API routes (1,200+ lines)
│                           # - Telegram MTProto login flow
│                           # - Last.fm API integration
│                           # - Bio update logic with failsafe
│                           # - REST endpoints for dashboard
├── src/                     # React frontend components (built via Vite)
├── index.html              # SPA entry point
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Node.js dependencies
├── Dockerfile              # Production Docker image
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore           # Docker build optimization
├── bot_state.json          # Runtime state (auto-generated)
├── .env.example            # Environment variable template
├── README.md               # This file
├── DEPLOYMENT.md           # Deployment guide for VPS, Docker, cloud
├── SETUP.md                # Original setup guide
├── CONTRIBUTING.md         # Contributing guidelines
└── LICENSE                 # MIT License
```

## 📊 State File (bot_state.json)

The bot maintains a local state file to track:
- **last_song**: Last known song status (avoid duplicate API calls)
- **manual_timestamp**: When manual bio edit was detected (24h protection)
- **expiration_seconds**: Grace period duration

Example:
```json
{
  "last_song": "🎶 Playing: Bohemian Rhapsody - Queen",
  "manual_timestamp": 0,
  "expiration_seconds": 86400
}
```

## 🎯 API Endpoints

The dashboard communicates with these REST endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Current bot status and stats |
| `/api/bot/toggle` | POST | Start/pause the scrobbler |
| `/api/bot/check` | POST | Manually trigger a check |
| `/api/config` | POST | Update configuration |
| `/api/logs` | GET | Retrieve activity logs |
| `/api/test-lastfm` | POST | Test Last.fm connection |
| `/api/telegram/test-connection` | POST | Test Telegram credentials |
| `/api/telegram/send-code` | POST | Initiate Telegram login |
| `/api/telegram/verify-code` | POST | Verify Telegram login code |

## 🔧 Configuration

### Adjust Polling Interval

```bash
export POLL_INTERVAL=60  # Check every 60 seconds instead of default 30
```

**Recommendations:**
- Minimum: 5 seconds
- Default: 30 seconds (balanced)
- Recommended minimum: 15 seconds (to avoid rate limiting)
- For low bandwidth: 60+ seconds

### Adjust Bio Length

```bash
export BIO_MAX_LEN=100  # Max 100 characters instead of default 140
```

**Note:** Telegram's maximum is 140 characters.

## 📈 Performance

### API Call Optimization

- **Last.fm**: ~30-second intervals (configurable via `POLL_INTERVAL`)
- **Telegram**: Only calls when song changes
- **State Caching**: Skips ALL API calls if song and manual status unchanged
- **Rate Limit Safe**: Default 30-second interval prevents 429 errors
- **Memory Usage**: ~100-150MB typical runtime

### Example Daily Usage

```
30s interval = 2,880 checks/day
With state caching:
- 50% cache hit rate = ~1,440 actual API calls
- Telegram calls: Only on song change (varies by user activity)
```

## 🐛 Troubleshooting

### Bot Won't Start

```bash
# Check environment variables
echo $API_ID $API_HASH $SESSION_STRING

# Run in development mode to see errors
npm run dev

# Check logs (systemd)
sudo journalctl -u telegram-bio -f
```

### Session Expired

Regenerate session string via the web UI:
1. Visit http://localhost:3000
2. Go to Settings → Telegram Credentials
3. Click "Generate New Session"
4. Complete the login flow

### Last.fm Connection Issues

1. Verify API key and username in Settings
2. Click "Test Last.fm" button
3. Check that your account has recent scrobbles

### Port 3000 Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Or run on different port (edit server.ts)
const PORT = 3001;
```

### Docker Issues

```bash
# Check container logs
docker logs telegram-bio

# Rebuild without cache
docker-compose build --no-cache

# Run with verbose output
docker-compose up --progress=plain
```

## 🔒 Security Best Practices

1. **Protect Environment File:**
   ```bash
   chmod 600 .env
   ```

2. **Use HTTPS in Production** (via Nginx/Let's Encrypt)

3. **Keep Dependencies Updated:**
   ```bash
   npm audit
   npm update
   ```

4. **Never Commit Credentials:**
   - `.env` is in `.gitignore`
   - `bot_state.json` is in `.gitignore`
   - Session strings should never be hardcoded

5. **Use Non-Root User** (Docker/VPS):
   ```bash
   # Already configured in Dockerfile
   USER nodejs
   ```

## 🏗️ Architecture

### Tech Stack

- **Backend:** Node.js 18+ + Express
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
- **APIs:** 
  - Telegram (GramJS/Pyrogram)
  - Last.fm REST API
  - Google Gemini (optional)
- **Runtime:** Async/await with graceful shutdown handling

### Data Flow

```
Web Dashboard (React)
    ↓
Express REST API (server.ts)
    ↓
├─ Telegram API (MTProto)
├─ Last.fm API (HTTP)
└─ Local State (bot_state.json)
    ↓
Bot Status & Logs
```

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide (Docker, VPS, Cloud)
- **[SETUP.md](SETUP.md)** - Original Python-based setup (legacy)
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[GitHub Issues](https://github.com/kunterk/TelegramBio/issues)** - Bug reports & feature requests

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- How to report bugs
- How to suggest enhancements
- Development guidelines
- Pull request process

## 📜 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

## 🙏 Credits

- **[Telegram](https://telegram.org/)** - Messaging platform
- **[GramJS](https://gram.js.org/)** - Telegram client library
- **[Last.fm](https://www.last.fm/)** - Music scrobbling service
- **[Google Gemini](https://ai.google.dev/)** - AI bio generation
- **[Express.js](https://expressjs.com/)** - Web framework
- **[React](https://react.dev/)** - UI library
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[Vite](https://vitejs.dev/)** - Build tool

## 💬 Support

For issues, questions, or suggestions:
- 📋 [Open a GitHub Issue](https://github.com/kunterk/TelegramBio/issues)
- 📖 [Check DEPLOYMENT.md](DEPLOYMENT.md) for setup help
- 💬 [GitHub Discussions](https://github.com/kunterk/TelegramBio/discussions)

---

**Built with ❤️ for music lovers who want their Telegram bio to reflect their current vibe**

**Happy scrobbling!** 🎵
