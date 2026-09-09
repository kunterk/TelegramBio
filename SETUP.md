# Telegram Bio Scrobbler - Configuration Guide

## Quick Start

### 1. Get Your Telegram API Credentials

Visit [Telegram's Developer Site](https://my.telegram.org/apps) and create an app to get:
- `API_ID`
- `API_HASH`

### 2. Get Your Session String

Run this Python script once:

```python
from pyrogram import Client
import asyncio

async def main():
    async with Client("my_account", api_id=YOUR_API_ID, api_hash="YOUR_API_HASH") as app:
        print("Session created! Copy the session string from pyrogram directory.")

asyncio.run(main())
```

The session string will be saved in `./my_account.session`

### 3. Get Your Last.fm API Key

1. Go to [Last.fm API](https://www.last.fm/api)
2. Create a new application
3. Copy your API Key
4. Get your Last.fm username

### 4. Set Environment Variables

**Linux/Mac:**
```bash
export API_ID="123456789"
export API_HASH="abc123def456ghi789"
export SESSION_STRING="your_session_string_here"
export LASTFM_API_KEY="your_lastfm_api_key"
export LASTFM_USERNAME="your_lastfm_username"
```

**Windows (Command Prompt):**
```cmd
set API_ID=123456789
set API_HASH=abc123def456ghi789
set SESSION_STRING=your_session_string_here
set LASTFM_API_KEY=your_lastfm_api_key
set LASTFM_USERNAME=your_lastfm_username
```

**Windows (PowerShell):**
```powershell
$env:API_ID="123456789"
$env:API_HASH="abc123def456ghi789"
$env:SESSION_STRING="your_session_string_here"
$env:LASTFM_API_KEY="your_lastfm_api_key"
$env:LASTFM_USERNAME="your_lastfm_username"
```

### 5. Run the Bot

```bash
# Direct run
python main.py

# With auto-restart (recommended)
python runner.py
```

## Advanced Configuration

### Custom Poll Interval

Change how often the bot checks Last.fm (in seconds):

```bash
export POLL_INTERVAL=60  # Check every 60 seconds instead of default 30
```

**Recommendations:**
- Minimum: 15 seconds (to avoid rate limiting)
- Default: 30 seconds (balanced)
- Maximum: 300 seconds (5 minutes, if you rarely change songs)

### Custom Bio Length

Change the maximum bio length (1-140 characters):

```bash
export BIO_MAX_LEN=100  # Max 100 characters instead of default 140
```

**Note:** Telegram's maximum is 140 characters. Going higher won't help.

## Deployment Options

### Option 1: Local Machine

```bash
python runner.py
```

### Option 2: Docker

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY main.py runner.py ./

CMD ["python", "runner.py"]
```

Build and run:
```bash
docker build -t telegram-bio-scrobbler .
docker run -e API_ID=... -e API_HASH=... -e SESSION_STRING=... -e LASTFM_API_KEY=... -e LASTFM_USERNAME=... telegram-bio-scrobbler
```

### Option 3: Virtual Private Server (VPS)

1. SSH into your VPS
2. Clone the repository
3. Set environment variables
4. Run with `nohup python runner.py &` or use systemd

**Systemd Service Example:**

Create `/etc/systemd/system/telegram-bio-scrobbler.service`:

```ini
[Unit]
Description=Telegram Bio Scrobbler
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/telegram-bio-scrobble
Environment="API_ID=YOUR_API_ID"
Environment="API_HASH=YOUR_API_HASH"
Environment="SESSION_STRING=YOUR_SESSION_STRING"
Environment="LASTFM_API_KEY=YOUR_LASTFM_API_KEY"
Environment="LASTFM_USERNAME=YOUR_LASTFM_USERNAME"
ExecStart=/usr/bin/python3 /home/ubuntu/telegram-bio-scrobble/runner.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable telegram-bio-scrobbler
sudo systemctl start telegram-bio-scrobbler
```

### Option 4: Heroku (Deprecated - Heroku free tier ended)

Consider VPS alternatives like Railway, Render, or Fly.io

## Troubleshooting

### Session Expired
If you get a "session expired" error:
1. Delete `my_account.session` file
2. Re-run the session generation script
3. Update `SESSION_STRING` env var

### Rate Limiting (429 Error)
- Increase `POLL_INTERVAL` to 60+ seconds
- Reduce `BIO_MAX_LEN` if doing heavy updates

### Bot Not Responding
- Check Last.fm API key is correct
- Verify Telegram session string is valid
- Check internet connection

### Logs Not Showing
The bot uses structured logging. Ensure you're running in foreground:
```bash
python main.py  # Shows logs
# vs
nohup python runner.py > output.log 2>&1 &  # Logs to file
```

## Security

- **Never commit** `my_account.session` file (it contains your session)
- **Never share** your `SESSION_STRING`, `API_ID`, `API_HASH`
- Add sensitive files to `.gitignore` (already done)
- Use environment variables, never hardcode credentials

## Performance Tuning

### For Low-Bandwidth Environments
```bash
export POLL_INTERVAL=120  # Check every 2 minutes
export BIO_MAX_LEN=70     # Shorter bios = smaller payload
```

### For Fast Updates
```bash
export POLL_INTERVAL=15   # Check every 15 seconds (minimum recommended)
export BIO_MAX_LEN=140    # Full bio text
```

### For Servers with Limited RAM
The bot is lightweight (~50MB runtime). No special tuning needed.

## Support

- Check [GitHub Issues](https://github.com/kunterk/telegram-bio-scrobble/issues)
- Read main [README.md](README.md) for general info
