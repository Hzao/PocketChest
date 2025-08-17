import { UploadJWTPayload, ChestJWTPayload, MultipartJWTPayload } from './types';

// TOTP utility functions
function base32Encode(buffer: Uint8Array): string {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let result = '';
	let bits = 0;
	let value = 0;

	for (let i = 0; i < buffer.length; i++) {
		value = (value << 8) | buffer[i];
		bits += 8;

		while (bits >= 5) {
			result += alphabet[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}

	if (bits > 0) {
		result += alphabet[(value << (5 - bits)) & 31];
	}

	// Pad to multiple of 8
	while (result.length % 8 !== 0) {
		result += '=';
	}

	return result;
}

function base32Decode(str: string): Uint8Array {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	str = str.toUpperCase().replace(/=+$/, '');

	let bits = 0;
	let value = 0;
	const result: number[] = [];

	for (let i = 0; i < str.length; i++) {
		const index = alphabet.indexOf(str[i]);
		if (index === -1) throw new Error('Invalid base32 character');

		value = (value << 5) | index;
		bits += 5;

		if (bits >= 8) {
			result.push((value >>> (bits - 8)) & 255);
			bits -= 8;
		}
	}

	return new Uint8Array(result);
}

async function hmacSHA1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
	const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);

	const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
	return new Uint8Array(signature);
}

export function generateTOTPSecret(): string {
	const buffer = new Uint8Array(20); // 160 bits
	crypto.getRandomValues(buffer);
	return base32Encode(buffer);
}

export async function generateTOTP(secret: string, timeStep: number = Math.floor(Date.now() / 1000 / 30)): Promise<string> {
	const secretBytes = base32Decode(secret);
	const timeBuffer = new ArrayBuffer(8);
	const timeView = new DataView(timeBuffer);
	timeView.setUint32(4, timeStep, false); // Big-endian

	const hmac = await hmacSHA1(secretBytes, new Uint8Array(timeBuffer));
	const offset = hmac[hmac.length - 1] & 0x0f;

	const code =
		(((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)) %
		1000000;

	return code.toString().padStart(6, '0');
}

export async function verifyTOTP(token: string, secret: string, window: number = 1): Promise<boolean> {
	const currentTime = Math.floor(Date.now() / 1000 / 30);

	// Check current time and ±window steps
	for (let i = -window; i <= window; i++) {
		const expectedToken = await generateTOTP(secret, currentTime + i);
		if (token === expectedToken) {
			return true;
		}
	}

	return false;
}

export function parseTOTPSecrets(secretsEnv: string): Map<string, string> {
	const secrets = new Map<string, string>();

	if (!secretsEnv) return secrets;

	// Format: "name1:secret1,name2:secret2"
	const pairs = secretsEnv.split(',');
	for (const pair of pairs) {
		const [name, secret] = pair.trim().split(':');
		if (name && secret) {
			secrets.set(name.trim(), secret.trim());
		}
	}

	return secrets;
}

export async function verifyAnyTOTP(token: string, secretsEnv: string): Promise<boolean> {
	const secrets = parseTOTPSecrets(secretsEnv);

	for (const [_name, secret] of secrets) {
		if (await verifyTOTP(token, secret)) {
			return true;
		}
	}

	return false;
}

// Generate UUID v4
export function generateUUID(): string {
	return crypto.randomUUID();
}

// Generate 6-character alphanumeric retrieval code
export function generateRetrievalCode(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < 6; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Helper function to safely encode UTF-8 strings to base64url
function base64UrlEncode(str: string): string {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(str);
	const base64 = btoa(String.fromCharCode(...bytes));
	return base64.replace(/[=]/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Helper function to safely decode base64url to UTF-8 strings
function base64UrlDecode(str: string): string {
	// Add padding if needed
	const padded = str.replace(/-/g, '+').replace(/_/g, '/');
	const padding = '='.repeat((4 - (padded.length % 4)) % 4);
	const base64 = padded + padding;

	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	const decoder = new TextDecoder();
	return decoder.decode(bytes);
}

// Simple JWT implementation for Cloudflare Workers
async function signJWT(payload: object, secret: string): Promise<string> {
	const header = {
		alg: 'HS256',
		typ: 'JWT',
	};

	const encoder = new TextEncoder();
	const headerB64 = base64UrlEncode(JSON.stringify(header));
	const payloadB64 = base64UrlEncode(JSON.stringify(payload));

	const message = `${headerB64}.${payloadB64}`;
	const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
	const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
		.replace(/[=]/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');

	return `${message}.${signatureB64}`;
}

async function verifyJWT(token: string, secret: string): Promise<any> {
	const parts = token.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	const [headerB64, payloadB64, signatureB64] = parts;

	// Verify signature
	const encoder = new TextEncoder();
	const message = `${headerB64}.${payloadB64}`;
	const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);

	const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
	const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(message));

	if (!isValid) {
		throw new Error('Invalid JWT signature');
	}

	// Decode payload
	const payload = JSON.parse(base64UrlDecode(payloadB64));

	// Check expiration
	if (payload.exp && Date.now() / 1000 > payload.exp) {
		throw new Error('JWT token expired');
	}

	return payload;
}

export async function createUploadJWT(sessionId: string, secret: string): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const payload: UploadJWTPayload = {
		sessionId,
		type: 'upload',
		iat: now,
		exp: now + 24 * 60 * 60, // 24 hours
	};

	return signJWT(payload, secret);
}

export async function createChestJWT(sessionId: string, expiryTimestamp: number | null, secret: string): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const payload: ChestJWTPayload = {
		sessionId,
		type: 'chest',
		iat: now,
		exp: expiryTimestamp || now + 365 * 24 * 60 * 60, // Use session expiry or 1 year for permanent
	};

	return signJWT(payload, secret);
}

export async function verifyUploadJWT(token: string, secret: string): Promise<UploadJWTPayload> {
	const payload = await verifyJWT(token, secret);
	if (payload.type !== 'upload') {
		throw new Error('Invalid token type');
	}
	return payload as UploadJWTPayload;
}

export async function verifyChestJWT(token: string, secret: string): Promise<ChestJWTPayload> {
	const payload = await verifyJWT(token, secret);
	if (payload.type !== 'chest') {
		throw new Error('Invalid token type');
	}
	return payload as ChestJWTPayload;
}

export async function createMultipartJWT(
	sessionId: string,
	fileId: string,
	uploadId: string,
	filename: string,
	mimeType: string,
	fileSize: number,
	secret: string,
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);

	// Multipart uploads get 48 hours regardless of session expiry
	const expiry = now + 48 * 60 * 60; // 48 hours

	const payload: MultipartJWTPayload = {
		sessionId,
		fileId,
		uploadId,
		filename,
		mimeType,
		fileSize,
		type: 'multipart',
		iat: now,
		exp: expiry,
	};

	return signJWT(payload, secret);
}

export async function verifyMultipartJWT(token: string, secret: string): Promise<MultipartJWTPayload> {
	const payload = await verifyJWT(token, secret);
	if (payload.type !== 'multipart') {
		throw new Error('Invalid token type');
	}
	return payload as MultipartJWTPayload;
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

// Validate retrieval code format
export function isValidRetrievalCode(code: string): boolean {
	const codeRegex = /^[A-Z0-9]{6}$/;
	return codeRegex.test(code);
}

// Calculate expiry timestamp
export function calculateExpiry(validityDays: number): number | null {
	if (validityDays === -1) {
		return null; // Permanent
	}
	return Math.floor(Date.now() / 1000) + validityDays * 24 * 60 * 60;
}

// Get current timestamp
export function getCurrentTimestamp(): number {
	return Math.floor(Date.now() / 1000);
}
