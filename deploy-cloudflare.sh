#!/bin/bash

# Deploy Gumroad to Cloudflare
# This script deploys both Workers and Pages

set -e

echo "🚀 Starting Cloudflare deployment..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Authenticate with Cloudflare (if not already)
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please authenticate with Cloudflare:"
    wrangler login
fi

# Deploy Workers
echo "📦 Deploying Cloudflare Workers..."
cd cloudflare-workers

# Install dependencies
npm install

# Deploy to staging first
echo "🧪 Deploying to staging..."
wrangler deploy --env staging

# Ask for confirmation to deploy to production
read -p "Deploy to production? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌍 Deploying to production..."
    wrangler deploy
else
    echo "⏸️  Production deployment skipped"
fi

cd ..

# Deploy Pages
echo "🌐 Deploying Cloudflare Pages..."
cd cloudflare-pages

# Install dependencies and build
npm install
npm run build

echo "📄 Pages built successfully!"
echo "ℹ️  To deploy Pages, either:"
echo "   1. Connect your GitHub repo to Cloudflare Pages dashboard"
echo "   2. Use: wrangler pages deploy dist --project-name gumroad-pages"

cd ..

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure KV namespaces in Cloudflare dashboard"
echo "   2. Set up R2 buckets for file storage"
echo "   3. Configure environment variables and secrets"
echo "   4. Set up custom domain (if needed)"
echo "   5. Configure external database connection"