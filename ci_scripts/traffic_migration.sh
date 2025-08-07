#!/bin/bash
# Traffic Migration Planning and Control Script

set -e

ENVIRONMENT=${1:-development}
ACTION=${2:-plan}
PERCENTAGE=${3:-5}

echo "🚚 Traffic Migration Control for $ENVIRONMENT environment"
echo "Action: $ACTION"

generate_migration_plan() {
    local env=$1
    local plan_file="traffic-migration-plan-$env.md"
    
    cat > "$plan_file" << EOF
# Traffic Migration Plan - $env Environment

## Overview
Gradual migration of traffic from existing infrastructure to Cloudflare Workers.

## Migration Phases

### Phase 1: Initial Testing (Week 1)
- **Traffic**: 5% of new users
- **Duration**: 1 week
- **Target**: New user registrations and API calls
- **Rollback**: Immediate if error rate > 1%
- **Success Criteria**: 
  - Error rate < 0.5%
  - Response time < 200ms
  - No user complaints

### Phase 2: Expand to Mobile (Week 2)  
- **Traffic**: 25% of mobile users
- **Duration**: 1 week
- **Target**: Mobile app traffic and API endpoints
- **Rollback**: Within 30 minutes if issues detected
- **Success Criteria**:
  - Error rate < 0.3%
  - Response time < 150ms
  - Mobile performance metrics maintained

### Phase 3: Broader User Base (Weeks 3-4)
- **Traffic**: 50% of all users
- **Duration**: 2 weeks  
- **Target**: All user types, excluding payments
- **Rollback**: Automated if thresholds exceeded
- **Success Criteria**:
  - Error rate < 0.2%
  - Response time < 100ms
  - Database performance stable

### Phase 4: Full Migration (Week 5)
- **Traffic**: 100% of all traffic
- **Duration**: 1 week
- **Target**: All traffic including payments
- **Rollback**: Manual override available
- **Success Criteria**:
  - Error rate < 0.1%
  - Response time < 100ms
  - All systems stable

## Monitoring During Migration

### Key Metrics
- Response time (p50, p95, p99)
- Error rate by endpoint
- Database connection count
- Memory usage
- CPU utilization
- User experience metrics

### Alert Thresholds
- Error rate > 1%: Immediate rollback
- Response time > 500ms: Investigation required
- Database connections > 80%: Scale database
- Memory usage > 90%: Scale workers

## Rollback Procedures

### Automatic Rollback Triggers
- Error rate exceeds threshold for 5 minutes
- Response time degrades by > 2x for 3 minutes
- Database connection failures > 10%

### Manual Rollback Process
1. Update traffic routing percentage to 0%
2. Verify all traffic routes to original infrastructure
3. Monitor for 10 minutes to ensure stability
4. Investigate root cause before re-attempting

## Communication Plan

### Stakeholders
- Engineering Team
- DevOps Team  
- Customer Support
- Product Management

### Notification Channels
- Slack: #releases, #engineering
- Email: engineering-alerts@gumroad.com
- Dashboard: Migration status page

### Schedule
- Pre-migration: 1 hour notice
- During migration: Real-time updates every 15 minutes
- Post-migration: Summary report within 24 hours

## Testing Checklist

### Pre-Migration
- [ ] All health checks passing
- [ ] Monitoring dashboards configured
- [ ] Rollback procedures tested
- [ ] Team notified and available

### During Migration
- [ ] Monitor key metrics continuously
- [ ] Verify user experience
- [ ] Check error logs
- [ ] Validate database performance

### Post-Migration
- [ ] Generate performance report
- [ ] Document lessons learned
- [ ] Update migration procedures
- [ ] Plan next phase

## Environment Variables for Traffic Control

\`\`\`bash
# Cloudflare Worker environment variables
TRAFFIC_PERCENTAGE_NEW_USERS=5
TRAFFIC_PERCENTAGE_MOBILE=0
TRAFFIC_PERCENTAGE_ALL=0
ENABLE_PAYMENT_ROUTING=false
ROLLBACK_THRESHOLD_ERROR_RATE=1.0
ROLLBACK_THRESHOLD_RESPONSE_TIME=500
\`\`\`

## Manual Traffic Control Commands

\`\`\`bash
# Set traffic percentage
./ci_scripts/traffic_migration.sh $ENVIRONMENT set 25

# Get current traffic status  
./ci_scripts/traffic_migration.sh $ENVIRONMENT status

# Emergency rollback
./ci_scripts/traffic_migration.sh $ENVIRONMENT rollback

# Enable next phase
./ci_scripts/traffic_migration.sh $ENVIRONMENT next-phase
\`\`\`
EOF

    echo "✅ Migration plan generated: $plan_file"
}

set_traffic_percentage() {
    local env=$1
    local percentage=$2
    
    echo "Setting traffic percentage to $percentage% for $env environment"
    
    # Update Cloudflare Worker environment variables
    if command -v wrangler &> /dev/null; then
        wrangler secret put TRAFFIC_PERCENTAGE --env "$env" <<< "$percentage"
        echo "✅ Traffic percentage updated to $percentage%"
    else
        echo "❌ Wrangler CLI not found. Update manually:"
        echo "   wrangler secret put TRAFFIC_PERCENTAGE --env $env"
        echo "   Value: $percentage"
    fi
    
    # Log the change
    echo "$(date): Traffic set to $percentage% for $env" >> "traffic-migration-log-$env.txt"
}

get_traffic_status() {
    local env=$1
    
    echo "Getting traffic status for $env environment..."
    
    if command -v wrangler &> /dev/null; then
        echo "Current traffic routing configuration:"
        wrangler secret list --env "$env" | grep -E "(TRAFFIC|ROLLBACK)" || echo "No traffic configuration found"
    else
        echo "❌ Wrangler CLI not available. Check manually in Cloudflare dashboard."
    fi
    
    # Show recent log entries
    if [ -f "traffic-migration-log-$env.txt" ]; then
        echo ""
        echo "Recent traffic changes:"
        tail -5 "traffic-migration-log-$env.txt"
    fi
}

emergency_rollback() {
    local env=$1
    
    echo "🚨 EMERGENCY ROLLBACK for $env environment"
    echo "Setting traffic percentage to 0%..."
    
    set_traffic_percentage "$env" 0
    
    # Notify team
    echo "$(date): EMERGENCY ROLLBACK - Traffic set to 0% for $env" >> "traffic-migration-log-$env.txt"
    echo "✅ Emergency rollback completed"
    echo "📋 Next steps:"
    echo "  1. Investigate root cause"
    echo "  2. Fix issues"
    echo "  3. Test thoroughly before re-enabling traffic"
}

next_phase() {
    local env=$1
    
    echo "Advancing to next migration phase for $env environment..."
    
    # Read current percentage from log or default to 0
    current_percentage=0
    if [ -f "traffic-migration-log-$env.txt" ]; then
        current_percentage=$(grep -o "Traffic set to [0-9]*%" "traffic-migration-log-$env.txt" | tail -1 | grep -o "[0-9]*" || echo "0")
    fi
    
    # Determine next phase percentage
    case $current_percentage in
        0) next_percentage=5 ;;
        5) next_percentage=25 ;;
        25) next_percentage=50 ;;
        50) next_percentage=100 ;;
        100) 
            echo "✅ Already at 100% traffic. Migration complete!"
            return
            ;;
        *)
            echo "❌ Unknown current percentage: $current_percentage%"
            return
            ;;
    esac
    
    echo "Advancing from $current_percentage% to $next_percentage%"
    set_traffic_percentage "$env" "$next_percentage"
}

# Main execution based on action
case $ACTION in
    "plan")
        generate_migration_plan "$ENVIRONMENT"
        ;;
    "set")
        if [ -z "$PERCENTAGE" ]; then
            echo "❌ Percentage required for 'set' action"
            echo "Usage: $0 $ENVIRONMENT set <percentage>"
            exit 1
        fi
        set_traffic_percentage "$ENVIRONMENT" "$PERCENTAGE"
        ;;
    "status")
        get_traffic_status "$ENVIRONMENT"
        ;;
    "rollback")
        emergency_rollback "$ENVIRONMENT"
        ;;
    "next-phase")
        next_phase "$ENVIRONMENT"
        ;;
    *)
        echo "❌ Unknown action: $ACTION"
        echo "Available actions: plan, set, status, rollback, next-phase"
        echo "Usage: $0 <environment> <action> [percentage]"
        exit 1
        ;;
esac