# Telegram Bio Scrobbler - Deployment Guide

This guide covers deploying TelegramBio to various platforms with persistent background execution.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [VPS/Linux Server](#vpslinux-server)
4. [Cloud Platforms](#cloud-platforms)
5. [Monitoring & Health Checks](#monitoring--health-checks)
6. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **npm** or **bun** package manager
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/kunterk/TelegramBio.git
cd TelegramBio

# Install dependencies
npm install
# or with bun:
bun install

# Create environment file
cp .env.example .env
```

### Configure Environment Variables

Edit `.env` with your credentials:

```env
# Telegram Credentials (from my.telegram.org)
API_ID=123456789
API_HASH=abc123def456ghi789jkl012mno345

# Telegram Session (generated via web UI or script)
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
# Auto-reloads on file changes
```

### Build for Production

```bash
npm run build
# Creates optimized dist/ with server.cjs and frontend bundle
```

### Run Production Build

```bash
npm start
# Runs compiled dist/server.cjs on port 3000
```

---

## Docker Deployment

### Quick Start with Docker

```bash
docker build -t telegram-bio-scrobbler .
docker run -d \
  --name telegram-bio \
  -p 3000:3000 \
  -e API_ID=123456789 \
  -e API_HASH=abc123def456ghi789 \
  -e SESSION_STRING=your_session \
  -e LASTFM_API_KEY=your_key \
  -e LASTFM_USERNAME=your_username \
  telegram-bio-scrobbler
```

### Multi-Stage Dockerfile (Production-Optimized)

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /build
COPY package*.json bun.lock ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy only built artifacts
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.cjs"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/status', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
```

### Docker Compose (Full Stack)

Create `docker-compose.yml`:

```yaml
version: '3.9'

services:
  telegram-bio:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: telegram-bio-scrobbler
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      API_ID: ${API_ID}
      API_HASH: ${API_HASH}
      SESSION_STRING: ${SESSION_STRING}
      LASTFM_API_KEY: ${LASTFM_API_KEY}
      LASTFM_USERNAME: ${LASTFM_USERNAME}
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}
      POLL_INTERVAL: ${POLL_INTERVAL:-30}
      BIO_MAX_LEN: ${BIO_MAX_LEN:-140}
    volumes:
      - ./bot_state.json:/app/bot_state.json
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Run with:

```bash
cp .env.example .env
# Edit .env with your credentials
docker-compose up -d

# View logs
docker-compose logs -f telegram-bio

# Stop
docker-compose down
```

### Docker Deployment to Production

**Push to Docker Registry (Docker Hub):**

```bash
docker build -t yourusername/telegram-bio-scrobbler:latest .
docker login
docker push yourusername/telegram-bio-scrobbler:latest
```

**Pull and run on server:**

```bash
docker pull yourusername/telegram-bio-scrobbler:latest
docker run -d --name telegram-bio --restart unless-stopped \
  -p 3000:3000 \
  -e API_ID=... -e API_HASH=... -e SESSION_STRING=... \
  -e LASTFM_API_KEY=... -e LASTFM_USERNAME=... \
  yourusername/telegram-bio-scrobbler:latest
```

---

## VPS/Linux Server

### Prerequisites

- Linux server (Ubuntu 22.04 LTS recommended)
- SSH access
- Sudo privileges
- ~500MB free disk space

### Step 1: Install Node.js

```bash
# Using NodeSource repository (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # v18.x.x
npm --version   # 9.x.x
```

### Step 2: Clone Repository

```bash
cd /opt  # or your preferred directory
sudo git clone https://github.com/kunterk/TelegramBio.git
sudo chown -R $(whoami):$(whoami) TelegramBio
cd TelegramBio
```

### Step 3: Install Dependencies & Build

```bash
npm ci  # Clean install (production)
npm run build
```

### Step 4: Create Environment File

```bash
cp .env.example .env
nano .env  # Edit with your credentials
chmod 600 .env  # Restrict permissions
```

### Step 5: Systemd Service Setup

Create `/etc/systemd/system/telegram-bio.service`:

```bash
sudo nano /etc/systemd/system/telegram-bio.service
```

Add the following:

```ini
[Unit]
Description=Telegram Bio Scrobbler - Auto bio updater
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/TelegramBio

# Load environment file
EnvironmentFile=/opt/TelegramBio/.env

# Start command
ExecStart=/usr/bin/node /opt/TelegramBio/dist/server.cjs

# Auto-restart on crash
Restart=on-failure
RestartSec=10
StartLimitInterval=600
StartLimitBurst=5

# Process management
KillMode=mixed
KillSignal=SIGTERM

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/TelegramBio

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=telegram-bio

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable telegram-bio      # Start on boot
sudo systemctl start telegram-bio       # Start now
sudo systemctl status telegram-bio      # Check status
```

### Step 6: View Logs

```bash
# Real-time logs
sudo journalctl -u telegram-bio -f

# Last 50 lines
sudo journalctl -u telegram-bio -n 50

# Today's logs
sudo journalctl -u telegram-bio --since today
```

### Step 7: Nginx Reverse Proxy (Optional)

Install Nginx:

```bash
sudo apt-get install -y nginx
```

Create `/etc/nginx/sites-available/telegram-bio`:

```nginx
upstream telegram_bio {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificate (get from Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://telegram_bio;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/telegram-bio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Setup SSL with Let's Encrypt:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com
```

---

## Cloud Platforms

### Railway

1. **Push to GitHub** (required)
2. **Create Railway Project:**
   - Visit [railway.app](https://railway.app)
   - Connect GitHub repo
   - Select TelegramBio
3. **Configure Variables:**
   - Go to Project Settings → Variables
   - Add all environment variables from `.env`
4. **Deploy:**
   - Railway auto-deploys on push to `main`
   - Logs available in dashboard

### Render

1. **Create New Web Service:**
   - Connect GitHub repo
   - Set build command: `npm ci && npm run build`
   - Set start command: `node dist/server.cjs`
2. **Environment:**
   - Add all variables from `.env` in Render dashboard
3. **Deploy:**
   - Render auto-deploys on commit

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Initialize app
flyctl launch --image node:18-alpine

# Add environment variables
flyctl secrets set API_ID=... API_HASH=... SESSION_STRING=...

# Deploy
flyctl deploy

# Monitor
flyctl logs
```

### AWS EC2

Similar to VPS setup:

```bash
# Launch Ubuntu 22.04 LTS instance
# SSH into instance
ssh -i key.pem ubuntu@your-instance-ip

# Follow VPS setup steps above
```

Then optionally use:
- **Application Load Balancer (ALB)** for HTTPS/routing
- **Systems Manager Session Manager** for access without SSH
- **CloudWatch** for monitoring

---

## Monitoring & Health Checks

### Health Check Endpoint

The app provides a health status endpoint:

```bash
curl http://localhost:3000/api/status
```

Response example:

```json
{
  "isRunning": true,
  "pollInterval": 30,
  "lastChecked": 1694274048123,
  "lastSong": "🎶 Playing: Song - Artist",
  "currentBio": "🎶 Playing: Song - Artist​",
  "isBotManaged": true,
  "inGracePeriod": false,
  "backoff": 5,
  "consecutiveFailures": 0,
  "lastError": null,
  "hasTelegramCredentials": true,
  "hasApiKey": true
}
```

### Monitoring Tools

**Uptime Monitoring:**

```bash
# Using systemd-watchdog (restart if process dies)
# Already configured in systemd service above

# Using uptimerobot.com
# Set monitor URL: http://yourdomain.com/api/status
# Expected HTTP 200
```

**Disk Space Monitoring:**

```bash
# Check state file size (should be <1KB)
du -sh /opt/TelegramBio/bot_state.json

# Monitor disk space
df -h
```

**Process Monitoring:**

```bash
# Check memory/CPU usage
ps aux | grep "node dist/server.cjs"

# Monitor in real-time
top -p $(pgrep -f "node dist/server.cjs")
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check systemd errors
sudo systemctl status telegram-bio
sudo journalctl -u telegram-bio -n 50

# Test build manually
node /opt/TelegramBio/dist/server.cjs

# Verify permissions
ls -la /opt/TelegramBio/dist/
ls -la /opt/TelegramBio/.env
```

### Container Won't Run (Docker)

```bash
# Build with verbose output
docker build --progress=plain -t telegram-bio-scrobbler .

# Run with interactive terminal for debugging
docker run -it --env-file .env telegram-bio-scrobbler

# Check container logs
docker logs <container-id>
```

### Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process (if safe)
sudo kill -9 <PID>

# Or change port in server code / nginx proxy
```

### Session Expired

The app stores session in memory. If it expires:

1. Regenerate session string using web UI
2. Update `.env`
3. Restart service: `sudo systemctl restart telegram-bio`

### High Memory Usage

Check if bot is stuck in loop:

```bash
# View logs
sudo journalctl -u telegram-bio -f

# Check for errors
grep ERROR /var/log/syslog
```

Restart if needed:

```bash
sudo systemctl restart telegram-bio
```

### Last.fm or Telegram API Errors

**Check configuration:**

```bash
# Verify environment variables are loaded
sudo systemctl show-environment | grep -E "API_ID|LASTFM"

# Test Last.fm connection via web UI
# Visit http://localhost:3000 → Settings → Test Last.fm
```

---

## Security Best Practices

1. **Protect `.env` file:**
   ```bash
   chmod 600 .env
   sudo chown root:root .env  # Or your service user
   ```

2. **Use HTTPS in production** (via Nginx/Let's Encrypt)

3. **Restrict service user permissions:**
   ```bash
   sudo useradd -r -s /bin/false telegram-bio  # No shell, no login
   ```

4. **Keep dependencies updated:**
   ```bash
   npm audit
   npm update
   ```

5. **Firewall rules:**
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

---

## Performance Tuning

| Setting | Recommendation |
|---------|-----------------|
| `POLL_INTERVAL` | 30s (balanced), 15s (fast), 60s+ (low bandwidth) |
| `BIO_MAX_LEN` | 140 (full), 100 (conservative) |
| Node.js memory | Default (~256MB available for bot), increase if needed: `--max-old-space-size=512` |
| Nginx workers | `worker_processes auto;` in nginx.conf |

---

## Support

- 📖 [Main README](README.md)
- 🐛 [GitHub Issues](https://github.com/kunterk/TelegramBio/issues)
- 💬 [Discussions](https://github.com/kunterk/TelegramBio/discussions)
