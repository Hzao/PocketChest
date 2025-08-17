import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupDatabase, setupTestEnvironment, createTestSession, testFetch } from './utils/test-setup';

describe('GET /api/retrieve/:retrievalCode - Get Chest Contents', () => {
	let retrievalCode: string;
	let sessionId: string;

	beforeAll(async () => {
		await setupDatabase();
	});

	beforeEach(async () => {
		await setupTestEnvironment();

		// Create a complete chest for retrieval tests
		const session = await createTestSession();
		sessionId = session.sessionId;
		const uploadToken = session.uploadToken;

		// Upload files
		const formData = new FormData();
		formData.append('files', new File(['test content'], 'test-retrieve.txt', { type: 'text/plain' }));
		const textItem = JSON.stringify({
			content: 'Text content for retrieval',
			filename: 'text-retrieve.txt',
		});
		formData.append('textItems', textItem);

		const uploadResponse = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${uploadToken}` },
			body: formData,
		});
		const uploadData = (await uploadResponse.json()) as any;
		const fileIds = uploadData.uploadedFiles.map((f: any) => f.fileId);

		// Complete upload
		const completeResponse = await testFetch(`http://example.com/api/chest/${sessionId}/complete`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				fileIds,
				validityDays: 7,
			}),
		});
		const completeData = (await completeResponse.json()) as any;
		retrievalCode = completeData.retrievalCode;
	});

	it('should return file list for valid retrieval code', async () => {
		const response = await testFetch(`http://example.com/api/retrieve/${retrievalCode}`, {
			method: 'GET',
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data).toHaveProperty('files');
		expect(data).toHaveProperty('chestToken');
		expect(data).toHaveProperty('expiryDate');
		expect(data.files).toHaveLength(2);

		// Check file metadata
		const regularFile = data.files.find((f: any) => !f.isText);
		const textFile = data.files.find((f: any) => f.isText);

		expect(regularFile).toHaveProperty('filename', 'test-retrieve.txt');
		expect(regularFile).toHaveProperty('mimeType', 'text/plain');
		expect(regularFile).toHaveProperty('isText', false);

		expect(textFile).toHaveProperty('filename', 'text-retrieve.txt');
		expect(textFile).toHaveProperty('isText', true);
	});

	it('should reject invalid retrieval code format', async () => {
		const response = await testFetch('http://example.com/api/retrieve/INVALID', {
			method: 'GET',
		});

		expect(response.status).toBe(400);
	});

	it('should reject non-existent retrieval codes', async () => {
		const response = await testFetch('http://example.com/api/retrieve/ABCD99', {
			method: 'GET',
		});

		expect(response.status).toBe(404);
	});

	it('should handle retrieval with various malformed codes', async () => {
		const testCodes = ['12345', 'ABCDEFG', 'ABC123!'];

		for (const code of testCodes) {
			const response = await testFetch(`http://example.com/api/retrieve/${code}`, {
				method: 'GET',
			});

			// Some malformed codes return 400 (invalid format), others return 404 (not found)
			// This depends on the specific validation logic in the backend
			expect([400, 404]).toContain(response.status);
		}
	});

	it('should include CORS headers', async () => {
		const response = await testFetch(`http://example.com/api/retrieve/${retrievalCode}`, {
			method: 'GET',
		});

		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('should return chest token for authenticated downloads', async () => {
		const response = await testFetch(`http://example.com/api/retrieve/${retrievalCode}`, {
			method: 'GET',
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data.chestToken).toBeDefined();
		expect(typeof data.chestToken).toBe('string');
		expect(data.chestToken.split('.')).toHaveLength(3); // JWT format
	});
});
