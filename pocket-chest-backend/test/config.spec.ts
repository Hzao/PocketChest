import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupDatabase, setupTestEnvironment, testFetch } from './utils/test-setup';

describe('GET /api/config - Get Configuration', () => {
	beforeAll(async () => {
		await setupDatabase();
	});

	beforeEach(async () => {
		await setupTestEnvironment();
	});

	it('should return server configuration with TOTP disabled', async () => {
		const response = await testFetch('http://example.com/api/config', {
			method: 'GET',
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data).toHaveProperty('requireTOTP', false);
	});

	it('should return consistent configuration', async () => {
		// Test that the configuration endpoint works correctly
		const response = await testFetch('http://example.com/api/config', {
			method: 'GET',
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data).toHaveProperty('requireTOTP');
		expect(typeof data.requireTOTP).toBe('boolean');
	});

	it('should include CORS headers', async () => {
		const response = await testFetch('http://example.com/api/config', {
			method: 'GET',
		});

		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(response.headers.get('Content-Type')).toBe('application/json');
	});
});
