#!/bin/bash
# ==============================================================================
# ZenSend - Production Deployment Script (Ubuntu / Oracle Cloud)
# Powered by Zentyr
# ==============================================================================
# Usage:
#   chmod +x deploy/deploy.sh
#   ./deploy/deploy.sh
# ==============================================================================

set -e

echo "🚀 Starting ZenSend deployment..."

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "📂 Project root: $ROOT_DIR"

# 1. Check Node / Bun runtime
if command -v bun &> /dev/null; then
  PKG_MGR="bun"
elif command -v npm &> /dev/null; then
  PKG_MGR="npm"
else
  echo "❌ Neither 'bun' nor 'npm' found in PATH. Please install Node.js or Bun first."
  exit 1
fi

echo "📦 Using package manager: $PKG_MGR"

# 2. Pull latest git changes if in git repository
if [ -d ".git" ]; then
  echo "📥 Pulling latest changes from git..."
  git pull --rebase || echo "⚠️ Git pull failed or no remote configured, proceeding with local files..."
fi

# 3. Install dependencies
echo "📥 Installing dependencies..."
if [ "$PKG_MGR" = "bun" ]; then
  bun install --frozen-lockfile || bun install
else
  npm ci || npm install
fi

# 4. Build client and server bundles
echo "🏗️ Building Next.js application & Signaling Server..."
if [ "$PKG_MGR" = "bun" ]; then
  bun run build
else
  npm run build
fi

# Verify build outputs
if [ ! -f "server.js" ] || [ ! -f "signaling-policy.js" ] || [ ! -f "abuse-policy.js" ]; then
  echo "❌ Error: Server build output files (server.js, signaling-policy.js, abuse-policy.js) are missing!"
  exit 1
fi
echo "✅ Build artifacts verified."

# 5. Restart service (PM2 or Systemd)
RESTARTED=false

if command -v pm2 &> /dev/null; then
  if pm2 describe zensend-server &> /dev/null; then
    echo "🔄 Reloading PM2 process 'zensend-server'..."
    pm2 reload zensend-server || pm2 restart zensend-server
    RESTARTED=true
  elif [ -f "deploy/ecosystem.config.js" ]; then
    echo "▶️ Starting PM2 process from deploy/ecosystem.config.js..."
    pm2 start deploy/ecosystem.config.js
    pm2 save
    RESTARTED=true
  fi
fi

if [ "$RESTARTED" = false ] && systemctl is-active --quiet signaling.service 2>/dev/null; then
  echo "🔄 Restarting systemd service 'signaling.service'..."
  sudo systemctl restart signaling.service
  RESTARTED=true
fi

# 6. Health Check
echo "🔍 Performing health check..."
PORT="${PORT:-3002}"
sleep 2

HEALTH_CHECK_URL="http://127.0.0.1:${PORT}/zensend/health"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || true)

if [ "$HEALTH_STATUS" = "200" ]; then
  echo "✅ Health check passed (HTTP 200) at $HEALTH_CHECK_URL"
else
  # Try fallback path without /zensend
  FALLBACK_URL="http://127.0.0.1:${PORT}/health"
  FALLBACK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FALLBACK_URL" || true)
  if [ "$FALLBACK_STATUS" = "200" ]; then
    echo "✅ Health check passed (HTTP 200) at $FALLBACK_URL"
  else
    echo "⚠️ Warning: Health check returned status: $HEALTH_STATUS. Check PM2/service logs."
  fi
fi

echo "=================================================================="
echo "🎉 ZenSend deployed successfully!"
echo "=================================================================="
