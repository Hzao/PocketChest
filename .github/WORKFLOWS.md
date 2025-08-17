# GitHub Actions Configuration

This directory contains GitHub Actions workflows for the PocketChest project.

## Workflows

### Backend Tests (`backend-tests.yml`)
A simple workflow that runs the backend test suite.

**Triggers:**
- Push to `master`, `main`, or `develop` branches (when backend files change)
- Pull requests to `master`, `main`, or `develop` branches (when backend files change)

**Features:**
- Runs tests
- Type checking with TypeScript
- Test artifact upload

### Backend CI (`backend-ci.yml`)
A comprehensive CI pipeline that includes linting, testing, security checks, and build verification.

**Triggers:**
- Push to `master`, `main`, or `develop` branches (when backend files change)
- Pull requests to `master`, `main`, or `develop` branches (when backend files change)

**Jobs:**
1. **Lint and Format Check**: TypeScript type checking, ESLint (if configured), Prettier (if configured)
2. **Test Suite**: Runs tests
3. **Security Audit**: npm audit and dependency vulnerability checks
4. **Build Verification**: Wrangler dry-run deployment and type generation

## Required GitHub Secrets

To fully utilize these workflows, configure the following secrets in your GitHub repository:

### Optional Secrets
- `TEST_JWT_SECRET`: JWT secret for tests (defaults to a test value if not set)
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token for Wrangler operations (optional for dry-run)

### Setting up Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret" for each secret you want to configure

## Workflow Features

### Path-based Triggering
Workflows only run when backend files are modified, improving efficiency:
- `pocket-chest-backend/**`
- `.github/workflows/backend-*.yml`

### Concurrency Control
The CI workflow uses concurrency groups to cancel in-progress runs when new commits are pushed to the same branch.

### Testing
Tests run to ensure code quality and functionality.

### Caching
Both workflows use caching to speed up dependency installation.

### Conditional Steps
The workflows intelligently detect available tools (ESLint, Prettier) and only run relevant steps.

## Test Environment

The workflows set up the following test environment:
- `JWT_SECRET`: Test JWT secret for authentication
- `REQUIRE_TOTP`: Disabled for testing
- `NODE_ENV`: Set to 'test'

## Coverage Reporting

**Note**: Coverage reporting is currently disabled due to Cloudflare Workers environment limitations. The `@vitest/coverage-v8` package uses Node.js APIs (`node:inspector`) that are not available in the Workers runtime. This is a known limitation documented in the [Cloudflare Workers testing guide](https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/#module-resolution).

## Artifacts

Test results are uploaded as artifacts with a 7-day retention period.

## Troubleshooting

### Tests Failing
1. Check that all dependencies are properly listed in `package.json`
2. Ensure test environment variables are correctly configured
3. Verify that tests pass locally with `npm test`

### Wrangler Dry-run Failing
1. Check that `wrangler.jsonc` configuration is valid
2. Ensure Cloudflare API token has appropriate permissions (if using real token)
3. The dry-run step is designed to work without real credentials

### ESLint/Prettier Steps Skipped
This is normal if these tools aren't installed in your project. The workflow automatically detects available tools.