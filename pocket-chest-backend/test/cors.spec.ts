import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupDatabase, setupTestEnvironment, testFetch } from './utils/test-setup';

describe('CORS Headers', () => {
	beforeAll(async () => {
		await setupDatabase();
	});

	beforeEach(async () => {
		await setupTestEnvironment();
	});

	it('should handle OPTIONS requests', async () => {
		const response = await testFetch('http://example.com/api/chest', {
			method: 'OPTIONS',
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, OPTIONS');
	});

	it('should include CORS headers in all responses', async () => {
		const response = await testFetch('http://example.com/api/chest', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({}),
		});

		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('should include CORS headers in error responses', async () => {
		const response = await testFetch('http://example.com/api/nonexistent', {
			method: 'GET',
		});

		expect(response.status).toBe(404);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('should include CORS headers in config endpoint', async () => {
		const response = await testFetch('http://example.com/api/config', {
			method: 'GET',
		});

		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('should include CORS headers in retrieval endpoint', async () => {
		const response = await testFetch('http://example.com/api/retrieve/FAKE01', {
			method: 'GET',
		});

		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('should include CORS headers in download endpoint', async () => {
		const response = await testFetch('http://example.com/api/download/fake-file-id', {
			headers: {
				Authorization: 'Bearer fake-token',
			},
		});

		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});
});
