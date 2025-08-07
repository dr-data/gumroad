# frozen_string_literal: true

require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Cloudflare production environment configuration
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot. This eager loads most of Rails and
  # your application in memory, allowing both threaded web servers
  # and those relying on copy on write to perform better.
  # Rake tasks automatically ignore this option for performance.
  config.eager_load = true

  # Full error reports are disabled and caching is turned on.
  config.consider_all_requests_local = false
  config.action_controller.perform_caching = true

  # Ensures that a master key has been made available in ENV["RAILS_MASTER_KEY"], config/master.key, or an environment
  # key such as config/credentials/production.key. This key is used to decrypt credentials (and other encrypted files).
  # config.require_master_key = true

  # Disable serving static files from `public/`, relying on Cloudflare Pages to do so instead.
  config.public_file_server.enabled = false

  # Compress JavaScripts and CSS.
  config.assets.js_compressor = :terser
  config.assets.css_compressor = :sass

  # Do not fall back to assets pipeline if a precompiled asset is missed.
  config.assets.compile = false

  # Enable serving of images, stylesheets, and JavaScripts from Cloudflare Pages/R2.
  config.asset_host = ENV.fetch("ASSET_HOST", "https://gumroad.pages.dev")

  # Specifies the header that your server uses for sending files.
  # For Cloudflare, we don't need these as static files are served by Cloudflare Pages
  # config.action_dispatch.x_sendfile_header = "X-Sendfile" # for Apache
  # config.action_dispatch.x_sendfile_header = "X-Accel-Redirect" # for NGINX

  # Store uploaded files on R2 or external storage service
  config.active_storage.service = :cloudflare_r2

  # Mount Action Cable outside main process or domain.
  # For Cloudflare deployment, you might need external WebSocket service
  # config.action_cable.mount_path = nil
  # config.action_cable.url = "wss://cable.gumroad.com/cable"
  # config.action_cable.allowed_request_origins = [ "https://gumroad.com", "https://*.gumroad.com" ]

  # Assume all access to the app is happening through a SSL-terminating reverse proxy (Cloudflare).
  config.assume_ssl = true

  # Force all access to the app over SSL, use Strict-Transport-Security, and use secure cookies.
  config.force_ssl = true

  # Log to STDOUT by default for Cloudflare Workers/Pages
  config.logger = ActiveSupport::Logger.new(STDOUT)
    .tap  { |logger| logger.formatter = ::Logger::Formatter.new }
    .then { |logger| ActiveSupport::TaggedLogging.new(logger) }

  # Prepend all log lines with the following tags.
  config.log_tags = [:request_id, :remote_ip]

  # "info" includes generic and useful information about system operation, but avoids logging too much
  # information to avoid inadvertent exposure of personally identifiable information (PII). If you
  # want to log everything, set the level to "debug".
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Use Cloudflare KV or Redis for caching
  if ENV["REDIS_URL"].present?
    config.cache_store = :redis_cache_store, { url: ENV["REDIS_URL"], namespace: "gumroad_cf" }
  else
    # Fallback to memory cache for simple deployments
    config.cache_store = :memory_store, { size: 64.megabytes }
  end

  # Use a real queuing backend for Active Job (and separate queues per environment).
  # For Cloudflare, you might need external queue service like Sidekiq with Redis
  config.active_job.queue_adapter = :sidekiq

  config.action_mailer.perform_caching = false

  # Email delivery configuration for Cloudflare deployment
  if ENV["RESEND_API_KEY"].present?
    config.action_mailer.delivery_method = :smtp
    config.action_mailer.smtp_settings = {
      address: "smtp.resend.com",
      port: 587,
      domain: "gumroad.com",
      user_name: "resend",
      password: ENV["RESEND_API_KEY"],
      authentication: "plain",
      enable_starttls_auto: true
    }
  elsif ENV["SENDGRID_API_KEY"].present?
    config.action_mailer.delivery_method = :smtp
    config.action_mailer.smtp_settings = {
      address: "smtp.sendgrid.net",
      port: 587,
      domain: "gumroad.com",
      user_name: "apikey",
      password: ENV["SENDGRID_API_KEY"],
      authentication: "plain",
      enable_starttls_auto: true
    }
  end

  # Ignore bad email addresses and do not raise email delivery errors.
  # Set this to true and configure the email server for immediate delivery to raise delivery errors.
  config.action_mailer.raise_delivery_errors = true

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = [I18n.default_locale]

  # Send deprecation notices to registered listeners.
  config.active_support.report_deprecations = true

  # Log disallowed deprecations.
  config.active_support.disallowed_deprecation = :log

  # Do not dump schema after migrations.
  config.active_record.dump_schema_after_migration = false

  # Enable DNS rebinding protection and other `Host` header attacks.
  config.hosts = [
    "gumroad.com",
    "www.gumroad.com",
    "gumroad.pages.dev",
    /.*\.gumroad\.com/,
    /.*\.pages\.dev/
  ]

  # Trust Cloudflare proxy
  config.force_ssl = true
  
  # Cloudflare-specific middleware configurations
  config.middleware.use Rack::Attack
  
  # Trust Cloudflare IPs for IP forwarding
  # Cloudflare IP ranges: https://www.cloudflare.com/ips/
  config.action_dispatch.trusted_proxies = ActionDispatch::RemoteIp::TRUSTED_PROXIES + [
    IPAddr.new("173.245.48.0/20"),
    IPAddr.new("103.21.244.0/22"),
    IPAddr.new("103.22.200.0/22"),
    IPAddr.new("103.31.4.0/22"),
    IPAddr.new("141.101.64.0/18"),
    IPAddr.new("108.162.192.0/18"),
    IPAddr.new("190.93.240.0/20"),
    IPAddr.new("188.114.96.0/20"),
    IPAddr.new("197.234.240.0/22"),
    IPAddr.new("198.41.128.0/17"),
    IPAddr.new("162.158.0.0/15"),
    IPAddr.new("104.16.0.0/13"),
    IPAddr.new("104.24.0.0/14"),
    IPAddr.new("172.64.0.0/13"),
    IPAddr.new("131.0.72.0/22")
  ]

  # Configure secure headers for Cloudflare
  config.force_ssl = true
  config.ssl_options = {
    hsts: {
      expires: 31536000,
      subdomains: true,
      preload: true
    }
  }
end