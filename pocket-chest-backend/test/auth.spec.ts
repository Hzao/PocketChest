import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { generateTOTP, generateTOTPSecret } from '../src/utils';
import { setupDatabase, setupTestEnvironment, testFetch, TEST_TOTP_SECRET, TEST_TOTP_SECRETS } from './utils/test-setup';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Authentication & Authorization', () => {
	beforeAll(async () => {
		await setupDatabase();
	});

	beforeEach(async () => {
		await setupTestEnvironment();
	});

	describe('TOTP Authentication - Disabled', () => {
		beforeEach(async () => {
			// Ensure TOTP is disabled for these tests
			env.REQUIRE_TOTP = 'false';
		});

		it('should handle chest creation when TOTP is disabled', async () => {
			const request = new IncomingRequest('http://example.com/api/chest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data).toHaveProperty('sessionId');
			expect(data).toHaveProperty('uploadToken');
		});

		it('should handle chest creation with TOTP token when TOTP is disabled', async () => {
			// Test that providing a TOTP token when it's not required doesn't break anything
			const validToken = await generateTOTP(TEST_TOTP_SECRET);

			const request = new IncomingRequest('http://example.com/api/chest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					totpToken: validToken,
				}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data).toHaveProperty('sessionId');
			expect(data).toHaveProperty('uploadToken');
		});
	});

	describe('TOTP Authentication - Enabled', () => {
		beforeEach(async () => {
			// Override environment for TOTP-enabled tests
			env.REQUIRE_TOTP = 'true';
			env.TOTP_SECRETS = TEST_TOTP_SECRETS;
		});

		it('should reject chest creation without TOTP when required', async () => {
			const request = new IncomingRequest('http://example.com/api/chest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(401);
			const data = (await response.json()) as any;
			expect(data.error).toBe('TOTP token required');
		});

		it('should reject chest creation with invalid TOTP token', async () => {
			const request = new IncomingRequest('http://example.com/api/chest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					totpToken: '123456', // Invalid token
				}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(401);
			const data = (await response.json()) as any;
			expect(data.error).toBe('Invalid TOTP token');
		});

		it('should accept chest creation with valid TOTP token', async () => {
			// Generate a valid TOTP token
			const validToken = await generateTOTP(TEST_TOTP_SECRET);

			const request = new IncomingRequest('http://example.com/api/chest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					totpToken: validToken,
				}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data).toHaveProperty('sessionId');
			expect(data).toHaveProperty('uploadToken');
		});

		it('should handle missing TOTP_SECRETS configuration', async () => {
			// Temporarily remove TOTP secrets while keeping TOTP required
			const originalSecrets = env.TOTP_SECRETS;
			env.TOTP_SECRETS = undefined;

			const request = new IncomingRequest('http://example.com/api/chest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					totpToken: '123456',
				}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			// Restore original secrets
			env.TOTP_SECRETS = originalSecrets;

			expect(response.status).toBe(500);
			const data = (await response.json()) as any;
			expect(data.error).toBe('TOTP not configured on server');
		});

		it('should validate TOTP token format and timing', async () => {
			// Test with various invalid token formats
			const invalidTokens = [
				{ token: '12345', expectedError: 'Invalid TOTP token' },
				{ token: '1234567', expectedError: 'Invalid TOTP token' },
				{ token: 'abcdef', expectedError: 'Invalid TOTP token' },
				{ token: '', expectedError: 'TOTP token required' }, // Empty token is treated as missing
			];

			for (const { token, expectedError } of invalidTokens) {
				const request = new IncomingRequest('http://example.com/api/chest', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						totpToken: token,
					}),
				});
				const ctx = createExecutionContext();
				const response = await worker.fetch(request, env, ctx);
				await waitOnExecutionContext(ctx);

				expect(response.status).toBe(401);
				const data = (await response.json()) as any;
				expect(data.error).toBe(expectedError);
			}
		});

		it('should handle multiple TOTP secrets', async () => {
			// Test with multiple secrets in the environment
			const secret2 = generateTOTPSecret();
			env.TOTP_SECRETS = `test1:${TEST_TOTP_SECRET},test2:${secret2}`;

			// Valid token from first secret
			const validToken1 = await generateTOTP(TEST_TOTP_SECRET);
			const request1 = new IncomingRequest('http://example.com/api/chest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					totpToken: validToken1,
				}),
			});
			const ctx1 = createExecutionContext();
			const response1 = await worker.fetch(request1, env, ctx1);
			await waitOnExecutionContext(ctx1);

			expect(response1.status).toBe(200);

			// Valid token from second secret
			const validToken2 = await generateTOTP(secret2);
			const request2 = new IncomingRequest('http://example.com/api/chest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					totpToken: validToken2,
				}),
			});
			const ctx2 = createExecutionContext();
			const response2 = await worker.fetch(request2, env, ctx2);
			await waitOnExecutionContext(ctx2);

			expect(response2.status).toBe(200);
		});
	});

	describe('JWT Token Validation', () => {
		it('should create valid tokens that can be used for uploads', async () => {
			const request = new IncomingRequest('http://example.com/api/chest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.uploadToken).toBeDefined();
			expect(typeof data.uploadToken).toBe('string');
		});

		it('should reject invalid JWT tokens', async () => {
			const formData = new FormData();
			formData.append('files', new File(['test'], 'test.txt'));

			const response = await testFetch('http://example.com/api/chest/fake-id/upload', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
				},
				body: formData,
			});

			expect(response.status).toBe(401);
		});

		it('should reject requests without authorization headers', async () => {
			const formData = new FormData();
			formData.append('files', new File(['test'], 'test.txt'));

			const response = await testFetch('http://example.com/api/chest/fake-id/upload', {
				method: 'POST',
				body: formData,
			});

			expect(response.status).toBe(401);
		});

		it('should handle expired or malformed tokens gracefully', async () => {
			const formData = new FormData();
			formData.append('files', new File(['test'], 'test.txt'));

			const response = await testFetch('http://example.com/api/chest/fake-id/upload', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer expired.or.invalid.token',
				},
				body: formData,
			});

			expect(response.status).toBe(401);
		});
	});
});
