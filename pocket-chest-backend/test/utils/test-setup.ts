import { env } from 'cloudflare:test';
import { generateTOTPSecret } from '../../src/utils';

// Test environment setup
export const TEST_JWT_SECRET = 'test-jwt-secret-for-vitest-only';
export const TEST_TOTP_SECRET = generateTOTPSecret();
export const TEST_TOTP_SECRETS = `test:${TEST_TOTP_SECRET}`;

export async function setupDatabase() {
	const statements = [
		`CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      retrieval_code TEXT UNIQUE,
      upload_complete BOOLEAN DEFAULT FALSE,
      expiry_date INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`,
		`CREATE TABLE IF NOT EXISTS files (
      file_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_extension TEXT,
      is_text BOOLEAN DEFAULT FALSE,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    )`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_retrieval_code ON sessions(retrieval_code)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expiry_date)`,
		`CREATE INDEX IF NOT EXISTS idx_files_session_id ON files(session_id)`,
	];

	// Use batch for schema creation for better performance
	const schemaOperations = statements.map((statement) => env.DB.prepare(statement));
	await env.DB.batch(schemaOperations);
}

export async function setupTestEnvironment() {
	// Set environment variables for each test
	env.JWT_SECRET = TEST_JWT_SECRET;
	env.TOTP_SECRETS = TEST_TOTP_SECRETS;
	env.REQUIRE_TOTP = 'false'; // Disable TOTP for most tests unless specifically testing it

	await cleanupDatabase();
}

export async function cleanupDatabase() {
	await env.DB.prepare('DELETE FROM files').run();
	await env.DB.prepare('DELETE FROM sessions').run();
}

// Wrapper for fetch that ensures proper environment variable handling
export async function testFetch(url: string, init?: RequestInit): Promise<Response> {
	const { env, createExecutionContext, waitOnExecutionContext } = await import('cloudflare:test');
	const worker = (await import('../../src/index')).default;

	const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
	const request = new IncomingRequest(url, init);

	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);

	return response;
}

export async function createTestSession() {
	const createResponse = await testFetch('http://example.com/api/chest', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({}),
	});

	const createData = (await createResponse.json()) as any;
	return {
		sessionId: createData.sessionId,
		uploadToken: createData.uploadToken,
	};
}
