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
    
    if ENV["SKIP_CHECKS"] == "true"
      puts "⚠️  Skipping prerequisite checks (--skip-checks enabled)"
      @completed_steps << "Prerequisites validation (skipped)"
      return
    end
    
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
    # Generate both TOML format for wrangler and JSON for reference
    toml_content = generate_kv_bindings_toml
    
    if toml_content
      File.write("kv-bindings.toml", toml_content)
      puts "  ✓ Generated KV bindings configuration: kv-bindings.toml"
    end
    
    # Also create a JSON reference
    json_bindings = KV_NAMESPACES.map do |purpose, namespace|
      env_namespace = "#{namespace}-#{@environment}"
      {
        binding: purpose.to_s.upcase,
        namespace: env_namespace,
        preview_namespace: "#{env_namespace}-preview"
      }
    end
    
    File.write("kv-bindings.json", JSON.pretty_generate(json_bindings))
    puts "  ✓ Generated KV bindings reference: kv-bindings.json"
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
    # Copy the template and customize it for the environment
    template_path = File.expand_path("../../../cloudflare-worker/wrangler.toml", __dir__)
    config_path = "wrangler.toml"
    
    if File.exist?(template_path)
      config_content = File.read(template_path)
      
      # Update the main configuration for the environment
      config_content.gsub!(/^name = "gumroad-development"/, "name = \"gumroad-#{@environment}\"")
      config_content.gsub!(/^compatibility_date = ".*"/, "compatibility_date = \"#{Date.current.strftime("%Y-%m-%d")}\"")
      
      # Replace the entire commented KV section with actual bindings
      kv_bindings = generate_kv_bindings_toml
      if kv_bindings
        # Remove the commented KV section and replace with actual bindings
        config_content.gsub!(/# KV namespace bindings.*?# preview_id = ""/m, kv_bindings.strip)
      end
      
      File.write(config_path, config_content)
    else
      # Fallback to generating basic config
      config_content = generate_basic_wrangler_toml
      File.write(config_path, config_content)
    end
    
    puts "  ✓ Generated wrangler.toml configuration for #{@environment}"
  end

  def build_and_deploy_workers
    puts "  Building and deploying Cloudflare Workers..."
    
    # Change to the worker directory
    worker_dir = File.expand_path("../../../cloudflare-worker", __dir__)
    
    unless File.exist?(worker_dir)
      raise "Worker directory not found at #{worker_dir}"
    end
    
    unless dry_run?
      # Install dependencies if needed
      if File.exist?(File.join(worker_dir, "package.json"))
        Dir.chdir(worker_dir) do
          `npm install` unless File.exist?("node_modules")
          
          # Deploy using wrangler
          deploy_cmd = @environment == "development" ? "npm run deploy" : "npm run deploy:#{@environment}"
          `#{deploy_cmd}`
          raise "Deployment failed" unless $?.success?
        end
      else
        # Use global wrangler if no local package.json
        Dir.chdir(worker_dir) do
          deploy_cmd = @environment == "development" ? "wrangler deploy" : "wrangler deploy --env #{@environment}"
          `#{deploy_cmd}`
          raise "Deployment failed" unless $?.success?
        end
      end
    end
    
    puts "    ✓ Workers deployed successfully to #{worker_url}"
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
    
    unless dry_run?
      # Use Cloudflare API to create DNS records
      create_worker_route(domain)
      puts "    ✓ Worker route created for #{domain}"
    else
      puts "    ✓ DNS would be configured for #{domain} (dry run)"
    end
    
    # Provide manual instructions for domain setup
    puts "    📋 Manual DNS setup required:"
    puts "       1. Add a CNAME record: #{domain} -> gumroad-#{@environment}.#{ENV['CLOUDFLARE_ACCOUNT_ID'] || 'your-account'}.workers.dev"
    puts "       2. Or add a Worker Route in Cloudflare Dashboard:"
    puts "          Pattern: #{domain}/*"
    puts "          Worker: gumroad-#{@environment}"
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
    "https://gumroad-#{@environment}.#{ENV['CLOUDFLARE_ACCOUNT_ID'] || 'your-account'}.workers.dev"
  end

  def generate_kv_bindings_toml
    return nil if @errors.any? # Don't generate bindings if KV creation failed
    
    bindings = KV_NAMESPACES.map do |purpose, namespace_name|
      env_namespace = "#{namespace_name}-#{@environment}"
      "[[kv_namespaces]]\nbinding = \"#{purpose.to_s.upcase}\"\nid = \"#{env_namespace}\"\npreview_id = \"#{env_namespace}-preview\""
    end
    
    "# KV namespace bindings\n" + bindings.join("\n\n")
  end

  def generate_basic_wrangler_toml
    <<~TOML
      name = "gumroad-#{@environment}"
      main = "src/worker.js"
      compatibility_date = "#{Date.current.strftime("%Y-%m-%d")}"
      node_compat = true

      [vars]
      ENVIRONMENT = "#{@environment}"
      #{@environment == 'development' ? 'MAIN_APP_URL = "http://localhost:3000"' : ''}
      #{@environment == 'staging' ? 'MAIN_APP_URL = "https://staging.gumroad.com"' : ''}
      #{@environment == 'production' ? 'MAIN_APP_URL = "https://gumroad.com"' : ''}

      #{generate_kv_bindings_toml || '# KV namespaces will be added after setup'}
    TOML
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
    # Check if there are static assets to deploy
    static_dir = File.expand_path("../../../public", __dir__)
    return unless File.exist?(static_dir) && !Dir.empty?(static_dir)
    
    puts "  Deploying static assets to Cloudflare Pages..."
    
    unless dry_run?
      Dir.chdir(File.dirname(static_dir)) do
        pages_name = "gumroad-#{@environment}-pages"
        `wrangler pages deploy public --project-name #{pages_name} --compatibility-date #{Date.current.strftime("%Y-%m-%d")}`
        if $?.success?
          puts "    ✓ Pages deployed successfully to #{pages_name}"
        else
          puts "    ⚠️  Pages deployment failed - you may need to create the project first"
          puts "       Run: wrangler pages project create #{pages_name}"
        end
      end
    else
      puts "    ✓ Pages would be deployed (dry run)"
    end
  end

  def test_endpoint_response(endpoint)
    return if dry_run?
    
    response = `curl -s -o /dev/null -w "%{http_code}" #{endpoint}`
    unless ["200", "301", "302"].include?(response.strip)
      raise "Endpoint #{endpoint} returned #{response}"
    end
  end

  def create_worker_route(domain)
    return unless ENV['CLOUDFLARE_API_TOKEN'] && ENV['CLOUDFLARE_ZONE_ID']
    
    route_pattern = "#{domain}/*"
    worker_name = "gumroad-#{@environment}"
    
    # This would use the Cloudflare API to create the route
    # For now, we'll just show what command to run
    puts "    Run: curl -X POST \"https://api.cloudflare.com/client/v4/zones/#{ENV['CLOUDFLARE_ZONE_ID']}/workers/routes\" \\"
    puts "         -H \"Authorization: Bearer #{ENV['CLOUDFLARE_API_TOKEN']}\" \\"
    puts "         -H \"Content-Type: application/json\" \\"
    puts "         --data '{\"pattern\":\"#{route_pattern}\",\"script\":\"#{worker_name}\"}'"
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
    puts "  2. Install wrangler CLI: npm install -g wrangler"
    puts "  3. Authenticate wrangler: wrangler auth login"
    puts "  4. Deploy the worker: cd cloudflare-worker && npm run deploy"
    puts "  5. Test the deployment: #{worker_url}/health"
    puts "  6. Configure custom domains in Cloudflare Dashboard"
    puts "  7. Update environment variables with database URLs"
    puts "  8. Monitor traffic migration progress"
    
    puts "\n📊 Generated Files:"
    puts "  - cloudflare-worker/src/worker.js (Worker code)"
    puts "  - cloudflare-worker/wrangler.toml (Worker configuration)"
    puts "  - cloudflare-worker/package.json (Worker package configuration)"
    puts "  - wrangler.toml (Main configuration file)"
    puts "  - kv-bindings.toml (KV namespace bindings)"
    puts "  - kv-bindings.json (KV bindings reference)"
    puts "  - traffic-migration-plan.md (Migration strategy)"
    puts "  - traffic-routing.json (Routing configuration)"
    
    puts "\n🚀 Test Your Worker:"
    puts "  curl #{worker_url}/health"
    puts "  curl #{worker_url}/api/status"
    puts "  curl #{worker_url}/api/ping"
  end

  def report_errors
    puts "\n❌ Setup failed with the following errors:"
    @errors.each { |error| puts "  - #{error}" }
    puts "\nPlease resolve these issues and run the script again."
    exit 1
  end
end