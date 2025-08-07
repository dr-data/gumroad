#!/bin/bash
# Cloudflare KV Namespace Setup Helper Script

set -e

ENVIRONMENT=${1:-development}
ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID}
API_TOKEN=${CLOUDFLARE_API_TOKEN}

if [ -z "$ACCOUNT_ID" ] || [ -z "$API_TOKEN" ]; then
    echo "❌ Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables are required"
    exit 1
fi

echo "🗄️  Setting up Cloudflare KV Namespaces for $ENVIRONMENT environment"

# KV Namespaces to create
declare -A KV_NAMESPACES=(
    ["sessions"]="gumroad-sessions-$ENVIRONMENT"
    ["cache"]="gumroad-cache-$ENVIRONMENT"
    ["feature-flags"]="gumroad-feature-flags-$ENVIRONMENT"
    ["analytics"]="gumroad-analytics-$ENVIRONMENT"
)

create_kv_namespace() {
    local purpose=$1
    local name=$2
    
    echo "Creating KV namespace: $name ($purpose)"
    
    if command -v wrangler &> /dev/null; then
        wrangler kv:namespace create "$name" --env "$ENVIRONMENT"
    else
        echo "Using Cloudflare API directly..."
        curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces" \
             -H "Authorization: Bearer $API_TOKEN" \
             -H "Content-Type: application/json" \
             --data "{\"title\":\"$name\"}"
    fi
    
    echo "✅ Created: $name"
}

# Create each KV namespace
for purpose in "${!KV_NAMESPACES[@]}"; do
    name="${KV_NAMESPACES[$purpose]}"
    create_kv_namespace "$purpose" "$name"
done

echo "✅ All KV namespaces created successfully!"

# Generate wrangler.toml KV bindings configuration
echo ""
echo "📝 Add these KV bindings to your wrangler.toml:"
echo ""
for purpose in "${!KV_NAMESPACES[@]}"; do
    name="${KV_NAMESPACES[$purpose]}"
    binding=$(echo "$purpose" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
    cat << EOF
[[kv_namespaces]]
binding = "$binding"
id = "$name"

EOF
done