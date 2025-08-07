# Gumroad Cloudflare Worker

This directory contains the Cloudflare Worker implementation for Gumroad's migration to Cloudflare.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   export CLOUDFLARE_API_TOKEN="your-api-token"
   export CLOUDFLARE_ACCOUNT_ID="your-account-id"
   export CLOUDFLARE_ZONE_ID="your-zone-id"
   ```

3. **Deploy to Development**
   ```bash
   npm run deploy
   ```

4. **Deploy to Production**
   ```bash
   npm run deploy:production
   ```

## Available Scripts

- `npm run dev` - Start local development server
- `npm run deploy` - Deploy to development environment
- `npm run deploy:staging` - Deploy to staging environment  
- `npm run deploy:production` - Deploy to production environment
- `npm run test` - Run worker locally for testing
- `npm run logs` - View worker logs

## Worker Endpoints

Once deployed, your worker will be available at:
- Development: `https://gumroad-development.your-account.workers.dev`
- Staging: `https://gumroad-staging.your-account.workers.dev`
- Production: `https://gumroad-production.your-account.workers.dev`

### Available Endpoints

- `GET /health` - Health check with basic worker info
- `GET /api/status` - Detailed status including KV store tests
- `GET /api/ping` - Simple ping/pong test
- `GET /*` - All other requests (proxies to main app in production)

## Configuration

The worker configuration is managed in `wrangler.toml`. Key settings:

- **KV Namespaces**: Session storage, caching, feature flags, analytics
- **Environment Variables**: Database URLs, service endpoints
- **Routes**: Custom domain routing patterns

## Development

The worker is built using Cloudflare Workers standard format:

```javascript
export default {
  async fetch(request, env, ctx) {
    // Handle request
  }
}
```

### Adding New Routes

Edit `src/worker.js` and add new route handlers in the main switch statement.

### Testing Locally

```bash
npm run dev
# Worker will be available at http://localhost:8787
```

## Deployment

Deployment is handled automatically by the setup scripts, but you can also deploy manually:

```bash
# Deploy to development
wrangler deploy

# Deploy to specific environment
wrangler deploy --env production
```

## Monitoring

After deployment, monitor your worker:

```bash
# View real-time logs
npm run logs

# View logs for specific environment
npm run logs:production
```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   - Ensure `CLOUDFLARE_API_TOKEN` is set correctly
   - Run `wrangler auth login` if needed

2. **KV Namespace Not Found**
   - Run the KV setup script: `../ci_scripts/setup_cloudflare_kv.sh`
   - Check that KV namespace IDs in `wrangler.toml` are correct

3. **Domain Routing Issues**
   - Verify routes are configured in Cloudflare Dashboard
   - Check that custom domains are properly set up

### Getting Help

- Check the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- View logs with `npm run logs`
- Test endpoints directly: `curl https://your-worker.workers.dev/health`