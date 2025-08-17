import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupDatabase, setupTestEnvironment, createTestSession, testFetch } from './utils/test-setup';

describe('POST /api/chest/:sessionId/complete - Complete Upload', () => {
	let sessionId: string;
	let uploadToken: string;
	let fileIds: string[] = [];

	beforeAll(async () => {
		await setupDatabase();
	});

	beforeEach(async () => {
		await setupTestEnvironment();
		const session = await createTestSession();
		sessionId = session.sessionId;
		uploadToken = session.uploadToken;

		// Upload some files
		const formData = new FormData();
		const file1 = new File(['content 1'], 'file1.txt', { type: 'text/plain' });
		const file2 = new File(['content 2'], 'file2.txt', { type: 'text/plain' });
		formData.append('files', file1);
		formData.append('files', file2);

		const uploadResponse = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
			},
			body: formData,
		});

		const uploadData = (await uploadResponse.json()) as any;
		fileIds = uploadData.uploadedFiles.map((f: any) => f.fileId);
	});

	it('should complete upload and generate retrieval code', async () => {
		const response = await testFetch(`http://example.com/api/chest/${sessionId}/complete`, {
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

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data).toHaveProperty('retrievalCode');
		expect(data).toHaveProperty('expiryDate');
		expect(data.retrievalCode).toMatch(/^[A-Z0-9]{6}$/);
		expect(typeof data.expiryDate).toBe('string');
	});

	it('should handle permanent chests (validityDays: -1)', async () => {
		// Create another session for permanent test
		const session = await createTestSession();
		const tempSessionId = session.sessionId;
		const tempUploadToken = session.uploadToken;

		// Upload file
		const formData = new FormData();
		formData.append('files', new File(['temp'], 'temp.txt'));
		const uploadResponse = await testFetch(`http://example.com/api/chest/${tempSessionId}/upload`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${tempUploadToken}` },
			body: formData,
		});
		const uploadData = (await uploadResponse.json()) as any;
		const tempFileIds = uploadData.uploadedFiles.map((f: any) => f.fileId);

		const response = await testFetch(`http://example.com/api/chest/${tempSessionId}/complete`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${tempUploadToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				fileIds: tempFileIds,
				validityDays: -1,
			}),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data.expiryDate).toBeNull();
	});

	it('should reject invalid fileIds format', async () => {
		const response = await testFetch(`http://example.com/api/chest/${sessionId}/complete`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				fileIds: ['invalid-uuid'],
				validityDays: 7,
			}),
		});

		expect(response.status).toBe(400);
	});

	it('should reject fileIds from other sessions', async () => {
		const response = await testFetch(`http://example.com/api/chest/${sessionId}/complete`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				fileIds: ['00000000-0000-4000-8000-000000000000'],
				validityDays: 7,
			}),
		});

		expect(response.status).toBe(400);
	});

	it('should handle malformed JSON gracefully', async () => {
		const response = await testFetch(`http://example.com/api/chest/${sessionId}/complete`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
				'Content-Type': 'application/json',
			},
			body: 'invalid json{',
		});

		expect(response.status).toBe(500); // JSON parse errors are handled as 500 in this backend
	});

	it('should reject unauthorized requests', async () => {
		const response = await testFetch(`http://example.com/api/chest/${sessionId}/complete`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				fileIds,
				validityDays: 7,
			}),
		});

		expect(response.status).toBe(401);
	});
});
