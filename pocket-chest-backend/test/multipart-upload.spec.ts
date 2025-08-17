import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupDatabase, setupTestEnvironment, createTestSession, testFetch } from './utils/test-setup';

describe('Multipart Upload', () => {
	let sessionId: string;
	let uploadToken: string;

	beforeAll(async () => {
		await setupDatabase();
	});

	beforeEach(async () => {
		await setupTestEnvironment();
		const session = await createTestSession();
		sessionId = session.sessionId;
		uploadToken = session.uploadToken;
	});

	describe('POST /api/chest/:sessionId/multipart/create', () => {
		it('should create multipart upload successfully', async () => {
			const response = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${uploadToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					filename: 'large-file.bin',
					mimeType: 'application/octet-stream',
					fileSize: 10485760, // 10MB
				}),
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data).toHaveProperty('fileId');
			expect(data).toHaveProperty('uploadId'); // This is actually the JWT token
			expect(typeof data.fileId).toBe('string');
			expect(typeof data.uploadId).toBe('string');
		});

		it('should reject multipart upload creation with invalid parameters', async () => {
			const response = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${uploadToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					filename: '', // Empty filename
					mimeType: 'application/octet-stream',
					fileSize: 0, // Zero file size
				}),
			});

			expect(response.status).toBe(400);
		});

		it('should reject unauthorized requests', async () => {
			const response = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/create`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					filename: 'test.txt',
					mimeType: 'text/plain',
					fileSize: 100,
				}),
			});

			expect(response.status).toBe(401);
		});
	});

	describe('PUT /api/chest/:sessionId/multipart/:fileId/part/:partNumber', () => {
		let fileId: string;
		let multipartToken: string;

		beforeEach(async () => {
			// Create multipart upload first
			const createResponse = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${uploadToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					filename: 'test.txt',
					mimeType: 'text/plain',
					fileSize: 100,
				}),
			});

			const createData = (await createResponse.json()) as any;
			fileId = createData.fileId;
			multipartToken = createData.uploadId;
		});

		it('should upload part successfully', async () => {
			const partData = new TextEncoder().encode('This is part 1 content');
			const response = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/${fileId}/part/1`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${multipartToken}`,
				},
				body: partData,
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data).toHaveProperty('etag');
			expect(data).toHaveProperty('partNumber', 1);
		});

		it('should reject part upload with invalid part number', async () => {
			const response = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/${fileId}/part/0`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${multipartToken}`,
				},
				body: 'test content',
			});

			expect(response.status).toBe(400);
		});

		it('should reject part upload with empty body', async () => {
			const response = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/${fileId}/part/1`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${multipartToken}`,
				},
				body: '',
			});

			expect(response.status).toBe(400);
		});

		it('should reject operations with invalid multipart JWT', async () => {
			const response = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/${fileId}/part/1`, {
				method: 'PUT',
				headers: {
					Authorization: 'Bearer invalid-token',
				},
				body: 'test content',
			});

			expect(response.status).toBe(401);
		});
	});

	describe('POST /api/chest/:sessionId/multipart/:fileId/complete', () => {
		it('should handle complete multipart upload workflow', async () => {
			// 1. Create multipart upload
			const createResponse = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${uploadToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					filename: 'test-multipart.txt',
					mimeType: 'text/plain',
					fileSize: 100,
				}),
			});

			expect(createResponse.status).toBe(200);
			const createData = (await createResponse.json()) as any;
			const fileId = createData.fileId;
			const multipartToken = createData.uploadId;

			// 2. Upload part
			const partData = new TextEncoder().encode('This is part 1 of the multipart upload test file content.');
			const uploadPartResponse = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/${fileId}/part/1`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${multipartToken}`,
				},
				body: partData,
			});

			expect(uploadPartResponse.status).toBe(200);
			const partData1 = (await uploadPartResponse.json()) as any;
			expect(partData1).toHaveProperty('etag');
			expect(partData1).toHaveProperty('partNumber', 1);

			// 3. Complete multipart upload
			const completeResponse = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/${fileId}/complete`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${multipartToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					parts: [
						{
							partNumber: 1,
							etag: partData1.etag,
						},
					],
				}),
			});

			expect(completeResponse.status).toBe(200);
			const completeData = (await completeResponse.json()) as any;
			expect(completeData).toHaveProperty('fileId', fileId);
			expect(completeData).toHaveProperty('filename', 'test-multipart.txt');
		});

		it('should reject completion with invalid parts array', async () => {
			// Create multipart upload first
			const createResponse = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${uploadToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					filename: 'test.txt',
					mimeType: 'text/plain',
					fileSize: 100,
				}),
			});

			const createData = (await createResponse.json()) as any;
			const fileId = createData.fileId;
			const multipartToken = createData.uploadId;

			// Try to complete with empty parts array
			const response = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/${fileId}/complete`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${multipartToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					parts: [],
				}),
			});

			expect(response.status).toBe(400);
		});

		it('should reject unauthorized completion requests', async () => {
			const response = await testFetch(`http://example.com/api/chest/${sessionId}/multipart/fake-file-id/complete`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					parts: [{ partNumber: 1, etag: 'fake-etag' }],
				}),
			});

			expect(response.status).toBe(401);
		});
	});
});
