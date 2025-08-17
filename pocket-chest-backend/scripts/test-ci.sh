#!/bin/bash

# Test script that mimics the CI environment
# Usage: ./scripts/test-ci.sh

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root (parent of scripts directory)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to the project root directory
cd "$PROJECT_ROOT"

echo "🧪 Running PocketChest Backend Tests (CI Mode)"
echo "=============================================="
echo "📁 Working directory: $(pwd)"

# Set test environment variables
export JWT_SECRET="test-jwt-secret-for-github-actions"
export REQUIRE_TOTP="false"
export NODE_ENV="test"

echo "📦 Installing dependencies..."
npm ci

echo "🔍 Running TypeScript type checking..."
npx tsc --noEmit

echo "🧹 Checking for linting tools..."
if npm list eslint >/dev/null 2>&1; then
  echo "  ✅ Running ESLint..."
  npx eslint . --ext .ts,.js
else
  echo "  ⚠️  ESLint not found, skipping..."
fi

if npm list prettier >/dev/null 2>&1; then
  echo "  ✅ Checking Prettier formatting..."
  npx prettier --check .
else
  echo "  ⚠️  Prettier not found, skipping..."
fi

echo "🧪 Running tests..."
npm test
echo "ℹ️  Note: Coverage disabled due to Cloudflare Workers environment limitations"

echo "🔒 Running security audit..."
npm audit --audit-level=moderate || echo "⚠️  Security audit found issues (non-blocking)"

echo "🏗️  Verifying Wrangler configuration..."
if [ -n "${CLOUDFLARE_API_TOKEN}" ]; then
  npx wrangler deploy --dry-run --compatibility-date=2025-01-01
else
  echo "  ⚠️  CLOUDFLARE_API_TOKEN not set, skipping Wrangler verification"
fi

echo ""
echo "✅ All checks completed successfully!"
echo "   Your code is ready for CI/CD pipeline." 