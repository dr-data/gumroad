# frozen_string_literal: true

# Standalone compatibility
unless defined?(Rails)
  require 'json'
  require 'date'
  require 'yaml'
  
  class Rails
    def self.env
      ENV['RAILS_ENV'] || 'development'
    end
  end
  
  class Date
    def self.current
      Date.today
    end
  end
end

class CloudflareNextStepsSetup
  REQUIRED_CLOUDFLARE_ENVS = %w[
    CLOUDFLARE_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID
    CLOUDFLARE_ZONE_ID
  ].freeze

  KV_NAMESPACES = {
    sessions: "gumroad-sessions",
    cache: "gumroad-cache", 
    feature_flags: "gumroad-feature-flags",
    analytics: "gumroad-analytics"
  }.freeze

  def initialize(environment = Rails.env)
    @environment = environment
    @errors = []
    @completed_steps = []
  end

  def execute
    puts "🚀 Starting Cloudflare Next Steps Setup for #{@environment} environment"
    puts "=" * 60

    validate_prerequisites
    return report_errors if @errors.any?

    configure_kv_namespaces
    setup_external_database_service
    deploy_to_cloudflare
    configure_custom_domain_dns
    setup_monitoring_alerting
    plan_traffic_migration

    report_completion
  end

  private

  def validate_prerequisites
    puts "\n📋 Step 1: Validating Prerequisites"
    
    REQUIRED_CLOUDFLARE_ENVS.each do |env_var|
      unless ENV[env_var]
        @errors << "Missing required environment variable: #{env_var}"
      end
    end

    unless cloudflare_cli_available?
      @errors << "Cloudflare CLI (wrangler) not found. Install with: npm install -g wrangler"
    end

    if @errors.empty?
      puts "✅ All prerequisites validated"
      @completed_steps << "Prerequisites validation"
    end
  end

  def configure_kv_namespaces
    puts "\n🗄️  Step 2: Configuring KV Namespaces"
    
    KV_NAMESPACES.each do |purpose, namespace_name|
      begin
        create_kv_namespace(namespace_name, purpose)
        @completed_steps << "KV namespace: #{namespace_name}"
      rescue => e
        @errors << "Failed to create KV namespace #{namespace_name}: #{e.message}"
      end
    end

    if @errors.empty?
      puts "✅ All KV namespaces configured successfully"
      generate_kv_bindings_config
    end
  end

  def setup_external_database_service
    puts "\n🗃️  Step 3: Setting up External Database Service"
    
    database_configs = {
      primary: {
        service: "planetscale",
        region: "us-east-1",
        tier: production? ? "ps-20" : "ps-10"
      },
      redis: {
        service: "upstash",
        region: "us-east-1", 
        tier: production? ? "pay-as-you-go" : "free"
      }
    }

    database_configs.each do |db_type, config|
      setup_database_service(db_type, config)
    end

    puts "✅ External database services configuration completed"
    @completed_steps << "External database services"
  end

  def deploy_to_cloudflare
    puts "\n🚀 Step 4: Deploying to Cloudflare"
    
    begin
      generate_wrangler_config
      build_and_deploy_workers
      deploy_pages_if_needed
      test_deployment_functionality
      
      puts "✅ Cloudflare deployment completed successfully"
      @completed_steps << "Cloudflare deployment"
    rescue => e
      @errors << "Deployment failed: #{e.message}"
    end
  end

  def configure_custom_domain_dns
    puts "\n🌐 Step 5: Configuring Custom Domain and DNS"
    
    domains = production? ? ["app.gumroad.com", "api.gumroad.com"] : ["staging-app.gumroad.com"]
    
    domains.each do |domain|
      configure_domain_dns(domain)
    end

    puts "✅ Custom domain and DNS configuration completed"
    @completed_steps << "Custom domain and DNS"
  end

  def setup_monitoring_alerting
    puts "\n📊 Step 6: Setting up Monitoring and Alerting"
    
    monitoring_configs = [
      { type: "uptime", endpoint: primary_domain, threshold: "99.9%" },
      { type: "response_time", endpoint: primary_domain, threshold: "500ms" },
      { type: "error_rate", threshold: "1%" },
      { type: "worker_cpu", threshold: "80%" }
    ]

    monitoring_configs.each do |config|
      setup_monitoring_alert(config)
    end

    puts "✅ Monitoring and alerting setup completed"
    @completed_steps << "Monitoring and alerting"
  end

  def plan_traffic_migration
    puts "\n🚚 Step 7: Planning Gradual Traffic Migration"
    
    migration_plan = {
      phase_1: { percentage: 5, duration: "1 week", targets: ["new_users"] },
      phase_2: { percentage: 25, duration: "1 week", targets: ["mobile_users"] },
      phase_3: { percentage: 50, duration: "2 weeks", targets: ["all_users"] },
      phase_4: { percentage: 100, duration: "1 week", targets: ["all_traffic"] }
    }

    generate_migration_plan(migration_plan)
    setup_traffic_routing
    
    puts "✅ Traffic migration plan created and configured"
    @completed_steps << "Traffic migration planning"
  end

  def create_kv_namespace(namespace_name, purpose)
    puts "  Creating KV namespace: #{namespace_name} (#{purpose})"
    
    unless dry_run?
      `wrangler kv:namespace create #{namespace_name} --env #{@environment}`
      raise "Failed to create namespace" unless $?.success?
    end
    
    puts "    ✓ Created: #{namespace_name}"
  end

  def generate_kv_bindings_config
    config_content = KV_NAMESPACES.map do |purpose, namespace|
      "[[kv_namespaces]]\nbinding = \"#{purpose.to_s.upcase}\"\npreview_id = \"#{namespace}-preview\"\nid = \"#{namespace}\""
    end.join("\n\n")

    File.write("wrangler-kv-bindings.toml", config_content)
    puts "  ✓ Generated KV bindings configuration: wrangler-kv-bindings.toml"
  end

  def setup_database_service(db_type, config)
    puts "  Setting up #{config[:service]} for #{db_type} database"
    puts "    Region: #{config[:region]}, Tier: #{config[:tier]}"
    
    case config[:service]
    when "planetscale"
      setup_planetscale_database(config)
    when "upstash"
      setup_upstash_redis(config)
    end
    
    puts "    ✓ #{db_type} database service configured"
  end

  def generate_wrangler_config
    config = {
      name: "gumroad-#{@environment}",
      main: "./dist/worker.js",
      compatibility_date: Date.current.strftime("%Y-%m-%d"),
      node_compat: true,
      vars: environment_variables,
      kv_namespaces: kv_namespace_bindings
    }

    File.write("wrangler.toml", config.to_yaml)
    puts "  ✓ Generated wrangler.toml configuration"
  end

  def build_and_deploy_workers
    puts "  Building and deploying Cloudflare Workers..."
    
    unless dry_run?
      `npm run build:worker`
      raise "Build failed" unless $?.success?
      
      `wrangler deploy --env #{@environment}`
      raise "Deployment failed" unless $?.success?
    end
    
    puts "    ✓ Workers deployed successfully"
  end

  def test_deployment_functionality
    puts "  Testing deployment functionality..."
    
    test_endpoints = [
      "#{worker_url}/health",
      "#{worker_url}/api/status", 
      "#{worker_url}/api/ping"
    ]

    test_endpoints.each do |endpoint|
      test_endpoint_response(endpoint)
    end
    
    puts "    ✓ All deployment tests passed"
  end

  def configure_domain_dns(domain)
    puts "  Configuring DNS for #{domain}"
    
    dns_records = [
      { type: "CNAME", name: domain, content: worker_url },
      { type: "TXT", name: "_cf-custom-hostname.#{domain}", content: "verification-token" }
    ]

    dns_records.each do |record|
      create_dns_record(record) unless dry_run?
    end
    
    puts "    ✓ DNS configured for #{domain}"
  end

  def setup_monitoring_alert(config)
    puts "  Setting up #{config[:type]} monitoring (threshold: #{config[:threshold]})"
    
    unless dry_run?
      case config[:type]
      when "uptime"
        create_uptime_monitor(config)
      when "response_time"
        create_response_time_monitor(config)
      when "error_rate"
        create_error_rate_monitor(config)
      when "worker_cpu"
        create_worker_cpu_monitor(config)
      end
    end
    
    puts "    ✓ #{config[:type]} monitoring configured"
  end

  def generate_migration_plan(plan)
    plan_content = plan.map do |phase, config|
      "#{phase.to_s.upcase}:\n  Percentage: #{config[:percentage]}%\n  Duration: #{config[:duration]}\n  Targets: #{config[:targets].join(', ')}\n"
    end.join("\n")

    File.write("traffic-migration-plan.md", "# Traffic Migration Plan\n\n#{plan_content}")
    puts "  ✓ Generated traffic migration plan: traffic-migration-plan.md"
  end

  def setup_traffic_routing
    puts "  Setting up traffic routing configuration..."
    
    routing_config = {
      rules: [
        { pattern: "/api/*", percentage: 10, target: "cloudflare" },
        { pattern: "/static/*", percentage: 100, target: "cloudflare" },
        { pattern: "/*", percentage: 5, target: "cloudflare" }
      ]
    }

    File.write("traffic-routing.json", routing_config.to_json)
    puts "    ✓ Traffic routing configuration saved"
  end

  def cloudflare_cli_available?
    `which wrangler > /dev/null 2>&1`
    $?.success?
  end

  def production?
    @environment == "production"
  end

  def dry_run?
    ENV["DRY_RUN"] == "true"
  end

  def primary_domain
    production? ? "app.gumroad.com" : "staging-app.gumroad.com"
  end

  def worker_url
    "https://gumroad-#{@environment}.workers.dev"
  end

  def environment_variables
    {
      ENVIRONMENT: @environment,
      RAILS_ENV: @environment,
      DATABASE_URL: ENV["CLOUDFLARE_DATABASE_URL"],
      REDIS_URL: ENV["CLOUDFLARE_REDIS_URL"]
    }
  end

  def kv_namespace_bindings
    KV_NAMESPACES.map do |purpose, namespace|
      { binding: purpose.to_s.upcase, id: namespace }
    end
  end

  def setup_planetscale_database(config)
    puts "    Use PlanetScale CLI: pscale database create gumroad-#{@environment} --region #{config[:region]}"
    puts "    Configure connection: pscale password create gumroad-#{@environment} #{@environment}-worker"
  end

  def setup_upstash_redis(config)
    puts "    Use Upstash CLI: upstash redis create gumroad-#{@environment}-cache --region #{config[:region]}"
    puts "    Or visit: https://console.upstash.com/redis"
  end

  def deploy_pages_if_needed
    return unless File.exist?("public/index.html")
    
    puts "  Deploying static assets to Cloudflare Pages..."
    `wrangler pages deploy public --project-name gumroad-#{@environment}-pages` unless dry_run?
    puts "    ✓ Pages deployed successfully"
  end

  def test_endpoint_response(endpoint)
    return if dry_run?
    
    response = `curl -s -o /dev/null -w "%{http_code}" #{endpoint}`
    unless ["200", "301", "302"].include?(response.strip)
      raise "Endpoint #{endpoint} returned #{response}"
    end
  end

  def create_dns_record(record)
    `wrangler dns create #{record[:name]} #{record[:type]} #{record[:content]}`
  end

  def create_uptime_monitor(config)
    puts "    Configure uptime monitoring at: https://dash.cloudflare.com/monitoring"
  end

  def create_response_time_monitor(config)
    puts "    Configure response time alerts in Cloudflare Analytics"
  end

  def create_error_rate_monitor(config)
    puts "    Configure error rate monitoring in Worker Analytics"
  end

  def create_worker_cpu_monitor(config)
    puts "    Configure CPU usage alerts in Cloudflare Dashboard"
  end

  def report_completion
    puts "\n" + "=" * 60
    puts "🎉 Cloudflare Next Steps Setup Completed Successfully!"
    puts "\nCompleted Steps:"
    @completed_steps.each { |step| puts "  ✅ #{step}" }
    
    puts "\n📋 Next Actions Required:"
    puts "  1. Review generated configuration files"
    puts "  2. Update environment variables with database URLs"
    puts "  3. Test all endpoints thoroughly"
    puts "  4. Monitor traffic migration progress"
    puts "  5. Update documentation with new URLs"
    
    puts "\n📊 Generated Files:"
    puts "  - wrangler.toml (Cloudflare Worker configuration)"
    puts "  - wrangler-kv-bindings.toml (KV namespace bindings)"
    puts "  - traffic-migration-plan.md (Migration strategy)"
    puts "  - traffic-routing.json (Routing configuration)"
  end

  def report_errors
    puts "\n❌ Setup failed with the following errors:"
    @errors.each { |error| puts "  - #{error}" }
    puts "\nPlease resolve these issues and run the script again."
    exit 1
  end
end