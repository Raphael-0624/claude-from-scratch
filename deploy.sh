#!/bin/bash
set -e

echo "🚀 Deploying Claude From Scratch..."

# Build
echo "📦 Building..."
npm run build

# Check nginx config
echo "🔍 Checking Nginx configuration..."
sudo nginx -t

# Reload nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Deployed successfully!"
echo "🌐 Access at: http://YOUR_IP/claude_from_scratch/"
