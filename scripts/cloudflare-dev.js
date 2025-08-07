#!/usr/bin/env node

/**
 * Cloudflare development helper script
 * Provides utilities for Cloudflare deployment development and testing
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const command = process.argv[2];

function runCommand(cmd, description) {
  console.log(`🔧 ${description}...`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log(`✅ ${description} completed successfully`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

function checkRequirements() {
  console.log('🔍 Checking Cloudflare deployment requirements...');
  
  const requiredFiles = [
    'wrangler.toml',
    'functions/_worker.js',
    'functions/api/[[path]].js',
    '.env.cloudflare.example'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(__dirname, '..', file)));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:', missingFiles);
    process.exit(1);
  }
  
  console.log('✅ All required files present');
  
  // Check if wrangler is installed
  try {
    execSync('npx wrangler --version', { stdio: 'pipe' });
    console.log('✅ Wrangler CLI available');
  } catch (error) {
    console.error('❌ Wrangler CLI not available. Run: npm install');
    process.exit(1);
  }
  
  // Check if authenticated
  try {
    execSync('npx wrangler whoami', { stdio: 'pipe' });
    console.log('✅ Authenticated with Cloudflare');
  } catch (error) {
    console.warn('⚠️  Not authenticated with Cloudflare. Run: npx wrangler auth login');
  }
}

function showHelp() {
  console.log(`
🚀 Cloudflare Development Helper

Usage: node scripts/cloudflare-dev.js <command>

Commands:
  check       Check deployment requirements
  build       Build assets for Cloudflare
  dev         Start local development server
  preview     Preview deployment locally
  deploy      Deploy to Cloudflare Pages
  logs        View deployment logs
  status      Check deployment status
  clean       Clean build artifacts
  init        Initialize Cloudflare configuration
  help        Show this help message

Examples:
  node scripts/cloudflare-dev.js check
  node scripts/cloudflare-dev.js build
  node scripts/cloudflare-dev.js preview
  node scripts/cloudflare-dev.js deploy

Environment Setup:
  1. Copy .env.cloudflare.example to .env.cloudflare
  2. Update with your Cloudflare credentials
  3. Run: npx wrangler auth login
  4. Run: node scripts/cloudflare-dev.js init
`);
}

switch (command) {
  case 'check':
    checkRequirements();
    break;
    
  case 'build':
    runCommand('npm run build:cloudflare', 'Building assets for Cloudflare');
    break;
    
  case 'dev':
    console.log('🔧 Starting local development server...');
    console.log('This will start Cloudflare Pages dev server with Workers');
    runCommand('npx wrangler pages dev public --project-name gumroad --kv CACHE --compatibility-date 2024-08-07', 'Local development server');
    break;
    
  case 'preview':
    runCommand('npm run build:cloudflare', 'Building assets');
    runCommand('npx wrangler pages dev public --project-name gumroad', 'Starting preview server');
    break;
    
  case 'deploy':
    checkRequirements();
    runCommand('npm run build:cloudflare', 'Building assets');
    runCommand('npx wrangler pages deploy public --project-name gumroad', 'Deploying to Cloudflare Pages');
    break;
    
  case 'logs':
    runCommand('npx wrangler pages deployment tail --project-name gumroad', 'Viewing deployment logs');
    break;
    
  case 'status':
    runCommand('npx wrangler pages deployment list --project-name gumroad', 'Checking deployment status');
    break;
    
  case 'clean':
    console.log('🧹 Cleaning build artifacts...');
    const artifactPaths = [
      'public/_headers',
      'public/_redirects',
      'public/index.html',
      'public/deployment-manifest.json',
      '.wrangler'
    ];
    
    artifactPaths.forEach(artifactPath => {
      const fullPath = path.join(__dirname, '..', artifactPath);
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
        console.log(`🗑️  Removed ${artifactPath}`);
      }
    });
    console.log('✅ Cleanup completed');
    break;
    
  case 'init':
    console.log('🚀 Initializing Cloudflare configuration...');
    console.log('This will create KV namespaces and R2 buckets');
    
    try {
      console.log('Creating KV namespace for caching...');
      execSync('npx wrangler kv:namespace create "CACHE"', { stdio: 'inherit' });
      
      console.log('Creating R2 bucket for assets...');
      execSync('npx wrangler r2 bucket create gumroad-assets', { stdio: 'inherit' });
      
      console.log('\n✅ Cloudflare resources created!');
      console.log('\n📝 Next steps:');
      console.log('1. Update wrangler.toml with the KV namespace ID from above');
      console.log('2. Configure your environment variables in .env.cloudflare');
      console.log('3. Run: node scripts/cloudflare-dev.js deploy');
      
    } catch (error) {
      console.error('❌ Initialization failed. Make sure you are authenticated with Cloudflare.');
      console.log('Run: npx wrangler auth login');
    }
    break;
    
  case 'help':
  default:
    showHelp();
    break;
}