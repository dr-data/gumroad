# Cloudflare Next Steps Setup Guide

This guide covers the setup and deployment process for migrating Gumroad infrastructure to Cloudflare Workers and related services.

## Overview

The Cloudflare Next Steps setup includes:
- KV namespace configuration  
- External database service setup
- Cloudflare Workers deployment
- Custom domain and DNS configuration
- Monitoring and alerting setup
- Gradual traffic migration planning

## Prerequisites

### Required Tools
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`
- [PlanetScale CLI](https://github.com/planetscale/cli): For database setup
- [Upstash CLI](https://docs.upstash.com/redis/devops/cli): `npm install -g @upstash/cli`

### Required Environment Variables
```bash
export CLOUDFLARE_API_TOKEN="your_api_token"
export CLOUDFLARE_ACCOUNT_ID="your_account_id" 
export CLOUDFLARE_ZONE_ID="your_zone_id"
```

## Quick Start

### 1. Run Complete Setup (Recommended)
```bash
# Development environment with dry run
./bin/cloudflare-next-steps development --dry-run

# Development environment (actual setup)
./bin/cloudflare-next-steps development

# Staging environment
./bin/cloudflare-next-steps staging

# Production environment  
./bin/cloudflare-next-steps production
```

### 2. Worker-Only Deployment
```bash
# Quick worker deployment
cd cloudflare-worker
npm install
npm run deploy

# Test the deployment
curl https://gumroad-development.your-account.workers.dev/health
```

### 3. Individual Component Setup

#### KV Namespaces
```bash
# Setup KV namespaces for development
./ci_scripts/setup_cloudflare_kv.sh development

# Setup KV namespaces for production
./ci_scripts/setup_cloudflare_kv.sh production
```

#### External Databases
```bash
# Setup PlanetScale database
./ci_scripts/setup_external_databases.sh development planetscale

# Setup Upstash Redis
./ci_scripts/setup_external_databases.sh development upstash

# Setup both databases
./ci_scripts/setup_external_databases.sh development all
```

#### Traffic Migration
```bash
# Generate migration plan
./ci_scripts/traffic_migration.sh development plan

# Set traffic percentage
./ci_scripts/traffic_migration.sh development set 25

# Check current status
./ci_scripts/traffic_migration.sh development status

# Emergency rollback
./ci_scripts/traffic_migration.sh development rollback

# Advance to next phase
./ci_scripts/traffic_migration.sh development next-phase
```

## Detailed Setup Steps

### Step 1: KV Namespace Configuration

KV namespaces are used for:
- **Sessions**: User session data
- **Cache**: Application-level caching
- **Feature Flags**: Runtime feature toggle storage
- **Analytics**: Custom analytics data

The setup script creates these namespaces and generates wrangler.toml bindings configuration.

### Step 2: External Database Services

#### PlanetScale (Primary Database)
- Creates a new database for the environment
- Sets up environment-specific branch
- Generates connection credentials for Workers
- Configures appropriate scaling tier

#### Upstash Redis (Caching)
- Creates Redis database for caching
- Configures regional deployment
- Provides connection URL for Workers
- Sets up monitoring alerts

### Step 3: Cloudflare Workers Deployment

The deployment process:
1. Generates `wrangler.toml` configuration
2. Builds Worker JavaScript bundle
3. Deploys to Cloudflare Workers
4. Configures environment variables
5. Sets up KV namespace bindings
6. Tests deployment endpoints

### Step 4: Custom Domain and DNS Configuration

- Configures CNAME records for custom domains
- Sets up SSL certificates
- Configures DNS verification
- Tests domain accessibility

Example domains:
- Production: `app.gumroad.com`, `api.gumroad.com`
- Staging: `staging-app.gumroad.com`
- Development: `dev-app.gumroad.com`

### Step 5: Monitoring and Alerting

Monitors:
- **Uptime**: Endpoint availability (99.9% threshold)
- **Response Time**: API latency (500ms threshold)
- **Error Rate**: Application errors (1% threshold)
- **Worker CPU**: Resource utilization (80% threshold)

Alerts are configured in Cloudflare Dashboard and can integrate with:
- Slack notifications
- Email alerts
- PagerDuty integration
- Webhook notifications

### Step 6: Traffic Migration Planning

The migration follows a phased approach:

#### Phase 1: Initial Testing (5% traffic)
- Target: New users only
- Duration: 1 week
- Focus: Basic functionality validation

#### Phase 2: Mobile Users (25% traffic)
- Target: Mobile app traffic
- Duration: 1 week  
- Focus: Performance validation

#### Phase 3: Broader Rollout (50% traffic)
- Target: All users except payments
- Duration: 2 weeks
- Focus: Scale testing

#### Phase 4: Full Migration (100% traffic)
- Target: All traffic including payments
- Duration: 1 week
- Focus: Complete transition

## Generated Files

The setup process generates several configuration files:

### Configuration Files
- `wrangler.toml` - Worker configuration
- `wrangler-kv-bindings.toml` - KV namespace bindings
- `traffic-routing.json` - Traffic routing rules

### Documentation Files  
- `traffic-migration-plan-{env}.md` - Detailed migration plan
- `database-monitoring-{env}.json` - Database monitoring config
- `traffic-migration-log-{env}.txt` - Migration activity log

## Environment Variables

### Required for All Environments
```bash
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
```

### Generated During Setup
```bash
CLOUDFLARE_DATABASE_URL=mysql://user:pass@host/db
CLOUDFLARE_REDIS_URL=redis://user:pass@host:port
```

### Traffic Control Variables
```bash
TRAFFIC_PERCENTAGE_NEW_USERS=5
TRAFFIC_PERCENTAGE_MOBILE=0
TRAFFIC_PERCENTAGE_ALL=0
ENABLE_PAYMENT_ROUTING=false
ROLLBACK_THRESHOLD_ERROR_RATE=1.0
ROLLBACK_THRESHOLD_RESPONSE_TIME=500
```

## Troubleshooting

### Common Issues

#### Missing CLI Tools
```bash
# Install Wrangler
npm install -g wrangler

# Install PlanetScale CLI
curl -fsSL https://raw.githubusercontent.com/planetscale/cli/main/install.sh | sh

# Install Upstash CLI
npm install -g @upstash/cli
```

#### Authentication Issues
```bash
# Login to Wrangler
wrangler auth login

# Verify API token
wrangler whoami

# Test API token with curl
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     https://api.cloudflare.com/client/v4/user/tokens/verify
```

#### Database Connection Issues
```bash
# Test PlanetScale connection
pscale auth login
pscale database list

# Test Upstash connection
upstash auth login
upstash redis list
```

### Emergency Procedures

#### Immediate Rollback
```bash
# Rollback traffic immediately
./ci_scripts/traffic_migration.sh production rollback

# Verify rollback
./ci_scripts/traffic_migration.sh production status
```

#### Worker Issues
```bash
# Check Worker logs
wrangler tail --env production

# Rollback Worker deployment
wrangler rollback --env production
```

#### Database Issues
```bash
# Check database status
pscale database show gumroad-production

# Switch to backup connection
# Update CLOUDFLARE_DATABASE_URL to backup
```

## Monitoring and Logs

### Cloudflare Dashboard
- Workers Analytics: https://dash.cloudflare.com/workers
- DNS Settings: https://dash.cloudflare.com/dns
- Security Events: https://dash.cloudflare.com/security/events

### Database Monitoring
- PlanetScale: https://app.planetscale.com/
- Upstash: https://console.upstash.com/

### Application Logs
```bash
# Worker execution logs
wrangler tail --env production

# Database query logs
pscale shell gumroad-production main

# Redis monitoring
upstash redis stats gumroad-production-cache
```

## Support and Escalation

### Internal Contacts
- Engineering Team: #engineering
- DevOps Team: #devops  
- Incident Response: #incidents

### External Support
- Cloudflare Support: https://support.cloudflare.com/
- PlanetScale Support: https://support.planetscale.com/
- Upstash Support: https://support.upstash.com/

## Next Steps After Setup

1. **Validate Configuration**: Test all endpoints and functionality
2. **Update Documentation**: Update internal docs with new URLs
3. **Train Team**: Ensure team knows new deployment process
4. **Monitor Migration**: Watch metrics during traffic migration
5. **Optimize Performance**: Tune based on real traffic patterns
6. **Plan Cleanup**: Remove old infrastructure after successful migration