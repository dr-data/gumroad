#!/bin/bash
# External Database Services Setup Helper Script

set -e

ENVIRONMENT=${1:-development}
DB_SERVICE=${2:-planetscale}

echo "🗃️  Setting up external database services for $ENVIRONMENT environment"

setup_planetscale() {
    local env=$1
    local db_name="gumroad-$env"
    
    echo "Setting up PlanetScale database: $db_name"
    
    if command -v pscale &> /dev/null; then
        echo "✅ PlanetScale CLI found"
        
        # Create database
        echo "Creating database: $db_name"
        pscale database create "$db_name" --region us-east-1 || echo "Database may already exist"
        
        # Create branch for environment
        echo "Creating branch: $env"
        pscale branch create "$db_name" "$env" || echo "Branch may already exist"
        
        # Create password for workers
        echo "Creating password for workers..."
        pscale password create "$db_name" "$env" "${env}-worker" --role writer
        
        echo "✅ PlanetScale setup completed"
        echo "📋 Next steps:"
        echo "  1. Copy the connection string from the output above"
        echo "  2. Set CLOUDFLARE_DATABASE_URL environment variable"
        echo "  3. Run migrations: pscale shell $db_name $env"
        
    else
        echo "❌ PlanetScale CLI not found. Install with:"
        echo "   curl -fsSL https://raw.githubusercontent.com/planetscale/cli/main/install.sh | sh"
        echo ""
        echo "Manual setup instructions:"
        echo "  1. Visit https://planetscale.com/dashboard"
        echo "  2. Create database: $db_name"
        echo "  3. Create branch: $env"
        echo "  4. Generate password for connection"
        exit 1
    fi
}

setup_upstash_redis() {
    local env=$1
    local redis_name="gumroad-$env-cache"
    
    echo "Setting up Upstash Redis: $redis_name"
    
    if command -v upstash &> /dev/null; then
        echo "✅ Upstash CLI found"
        
        # Create Redis database
        echo "Creating Redis database: $redis_name"
        upstash redis create "$redis_name" --region us-east-1 || echo "Redis may already exist"
        
        echo "✅ Upstash Redis setup completed"
        echo "📋 Next steps:"
        echo "  1. Get connection details: upstash redis list"
        echo "  2. Set CLOUDFLARE_REDIS_URL environment variable"
        
    else
        echo "❌ Upstash CLI not found. Install with:"
        echo "   npm install -g @upstash/cli"
        echo ""
        echo "Manual setup instructions:"
        echo "  1. Visit https://console.upstash.com/"
        echo "  2. Create Redis database: $redis_name"
        echo "  3. Select region: us-east-1"
        echo "  4. Copy connection URL"
        exit 1
    fi
}

setup_database_monitoring() {
    local env=$1
    
    echo "Setting up database monitoring for $env..."
    
    cat > "database-monitoring-$env.json" << EOF
{
  "monitoring": {
    "planetscale": {
      "metrics": ["connection_count", "query_latency", "storage_usage"],
      "alerts": {
        "high_connection_count": { "threshold": 80, "unit": "percent" },
        "slow_queries": { "threshold": 1000, "unit": "ms" },
        "storage_usage": { "threshold": 85, "unit": "percent" }
      }
    },
    "upstash": {
      "metrics": ["memory_usage", "operations_per_second", "latency"],
      "alerts": {
        "high_memory_usage": { "threshold": 90, "unit": "percent" },
        "high_ops": { "threshold": 10000, "unit": "ops/sec" },
        "high_latency": { "threshold": 50, "unit": "ms" }
      }
    }
  }
}
EOF
    
    echo "✅ Database monitoring configuration saved to database-monitoring-$env.json"
}

# Main execution
case $DB_SERVICE in
    "planetscale")
        setup_planetscale "$ENVIRONMENT"
        ;;
    "upstash")
        setup_upstash_redis "$ENVIRONMENT"
        ;;
    "all")
        setup_planetscale "$ENVIRONMENT"
        setup_upstash_redis "$ENVIRONMENT"
        ;;
    *)
        echo "❌ Unknown database service: $DB_SERVICE"
        echo "Supported services: planetscale, upstash, all"
        exit 1
        ;;
esac

setup_database_monitoring "$ENVIRONMENT"

echo ""
echo "🎉 Database services setup completed!"
echo "Remember to update your environment variables with the connection URLs."