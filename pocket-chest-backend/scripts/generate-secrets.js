#!/usr/bin/env node

const crypto = require('crypto');

/**
 * Generate secure secrets for PocketChest deployment
 * Usage:
 *   node generate-secrets.js                    # Generate JWT + single TOTP key
 *   node generate-secrets.js user1 user2 user3  # Generate JWT + multiple TOTP keys
 *   node generate-secrets.js --totp-only user4  # Generate only TOTP key (for adding later)
 */

console.log('🔐 PocketChest Secret Generator\n');

console.log('💡 Use Case Guide:');
console.log('   • Private/Team Use: Enable TOTP for secure access with known users');
console.log('   • Public Use: Disable TOTP (set REQUIRE_TOTP="false") to allow anyone to share');
console.log("   • TOTP setup is complex because it's designed for private deployments\n");

// Generate JWT Secret (256-bit base64)
function generateJWTSecret() {
	return crypto.randomBytes(32).toString('base64');
}

// Generate TOTP Secret (160-bit base32)
function generateTOTPSecret() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // base32 alphabet
	let result = '';
	for (let i = 0; i < 32; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Parse command line arguments
const args = process.argv.slice(2);
const totpOnly = args[0] === '--totp-only';
const keyNames = totpOnly ? args.slice(1) : args;

// Default to 'admin' if no key names provided
if (keyNames.length === 0) {
	keyNames.push('admin');
}

// Generate JWT secret (unless TOTP-only mode)
let jwtSecret = '';
if (!totpOnly) {
	console.log('1. JWT SECRET (Required)');
	console.log('   Used for signing authentication tokens');
	jwtSecret = generateJWTSecret();
	console.log(`   Generated: ${jwtSecret}\n`);
}

// Generate TOTP secrets for each key name
console.log(`${totpOnly ? '1' : '2'}. TOTP SETUP (${keyNames.length} ${keyNames.length === 1 ? 'User' : 'Users'})`);
console.log('   Used for Two-Factor Authentication\n');

const totpPairs = [];
const qrUrls = [];
const issuer = 'PocketChest';

keyNames.forEach((keyName, index) => {
	const totpSecret = generateTOTPSecret();
	const pair = `${keyName}:${totpSecret}`;
	const otpUrl = `otpauth://totp/${issuer}:${keyName}?secret=${totpSecret}&issuer=${issuer}`;

	totpPairs.push(pair);
	qrUrls.push({ keyName, otpUrl });

	console.log(`   User ${index + 1}: ${keyName}`);
	console.log(`   TOTP Secret: ${totpSecret}`);
	console.log(`   Setup URL: ${otpUrl}\n`);
});

const combinedTotpSecrets = totpPairs.join(',');

console.log(`${totpOnly ? '2' : '3'}. AUTHENTICATOR APP SETUP`);
console.log('   Add each user to your authenticator app (Google Authenticator, 1Password, etc.):\n');

qrUrls.forEach(({ keyName, otpUrl }) => {
	console.log(`   ${keyName}:`);
	console.log(`   • Method 1: Paste this URL into your authenticator app`);
	console.log(`     ${otpUrl}`);
	console.log(`   • Method 2: Manually add with these details:`);
	console.log(`     - Account: ${keyName}`);
	console.log(`     - Secret Key: ${totpPairs.find((p) => p.startsWith(keyName + ':'))?.split(':')[1]}`);
	console.log(`     - Issuer: ${issuer}\n`);
});

console.log(`${totpOnly ? '3' : '4'}. COMBINED TOTP SECRETS FOR CLOUDFLARE`);
console.log(`   Format: ${combinedTotpSecrets}\n`);

console.log(`${totpOnly ? '4' : '5'}. CLOUDFLARE WORKER SECRETS SETUP`);
console.log('   Run these commands from the pocket-chest-backend directory:\n');

if (!totpOnly) {
	console.log(`   # 1. Navigate to backend directory`);
	console.log(`   cd pocket-chest-backend\n`);

	console.log(`   # 2. REQUIRE_TOTP should be set in wrangler.jsonc (not as a secret)`);
	console.log(`   # Add to vars section: "REQUIRE_TOTP": "true"\n`);

	console.log(`   # 3. Set JWT secret`);
	console.log(`   wrangler secret put JWT_SECRET`);
	console.log(`   # When prompted, enter: ${jwtSecret}\n`);

	console.log(`   # 4. Set TOTP secrets`);
}

if (totpOnly) {
	console.log(`   # Navigate to backend directory`);
	console.log(`   cd pocket-chest-backend\n`);

	console.log(`   # ⚠️  IMPORTANT: Cloudflare secrets are hidden - you cannot view existing values`);
	console.log(`   # RECOMMENDED: Generate keys for ALL users (existing + new) and update everyone's apps`);
	console.log(`   # ALTERNATIVE: If you saved existing secrets, combine manually: existing_secrets,${combinedTotpSecrets}`);
	console.log(`   # Either way, update the secret:`);
}

console.log(`   wrangler secret put TOTP_SECRETS`);
console.log(`   # When prompted, enter: ${combinedTotpSecrets}\n`);

console.log('⚠️  SECURITY NOTES:');
console.log('   • Never commit these secrets to version control');
console.log('   • Use Cloudflare Worker Secrets, not environment variables');
console.log('   • Keep your TOTP secret safe - it cannot be recovered');
console.log('   • Each deployment should use unique secrets\n');

console.log('✅ Setup complete! Use the wrangler commands above to configure your secrets.');
