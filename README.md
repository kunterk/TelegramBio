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
