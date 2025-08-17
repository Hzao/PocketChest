import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupDatabase, setupTestEnvironment, createTestSession, testFetch } from './utils/test-setup';

describe('POST /api/chest/:sessionId/upload - Upload Files', () => {
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

	it('should upload regular files and store in R2', async () => {
		const formData = new FormData();
		const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
		formData.append('files', file);

		const response = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
			},
			body: formData,
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data.uploadedFiles).toHaveLength(1);
		expect(data.uploadedFiles[0]).toHaveProperty('fileId');
		expect(data.uploadedFiles[0]).toHaveProperty('filename', 'test.txt');
		expect(data.uploadedFiles[0]).toHaveProperty('isText', false);
	});

	it('should upload text items as files', async () => {
		const formData = new FormData();
		const textItem = JSON.stringify({
			content: 'Hello world text content',
			filename: 'hello.txt',
		});
		formData.append('textItems', textItem);

		const response = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
			},
			body: formData,
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data.uploadedFiles).toHaveLength(1);
		expect(data.uploadedFiles[0]).toHaveProperty('isText', true);
		expect(data.uploadedFiles[0]).toHaveProperty('filename', 'hello.txt');
	});

	it('should handle empty file uploads', async () => {
		const formData = new FormData();
		const file = new File([''], 'empty.txt', { type: 'text/plain' });
		formData.append('files', file);

		const response = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
			},
			body: formData,
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data.uploadedFiles).toHaveLength(1);
		expect(data.uploadedFiles[0].filename).toBe('empty.txt');
	});

	it('should handle files with special characters in filename', async () => {
		const formData = new FormData();
		const specialFilename = 'file with spaces & symbols (1).txt';
		const file = new File(['content'], specialFilename, { type: 'text/plain' });
		formData.append('files', file);

		const response = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
			},
			body: formData,
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data.uploadedFiles[0].filename).toBe(specialFilename);
	});

	it('should handle multiple text items upload', async () => {
		const formData = new FormData();
		const textItem1 = JSON.stringify({
			content: 'First text item',
			filename: 'text1.txt',
		});
		const textItem2 = JSON.stringify({
			content: 'Second text item',
			filename: 'text2.txt',
		});
		formData.append('textItems', textItem1);
		formData.append('textItems', textItem2);

		const response = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
			},
			body: formData,
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data.uploadedFiles).toHaveLength(2);
		expect(data.uploadedFiles.every((f) => f.isText)).toBe(true);
	});

	it('should handle large file uploads within limits', async () => {
		const formData = new FormData();
		const largeContent = 'A'.repeat(1024 * 1024); // 1MB of 'A's
		const file = new File([largeContent], 'large-file.txt', { type: 'text/plain' });
		formData.append('files', file);

		const response = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
			},
			body: formData,
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as any;
		expect(data.uploadedFiles).toHaveLength(1);
	});

	it('should reject invalid JWT token', async () => {
		const formData = new FormData();
		const file = new File(['test'], 'test.txt');
		formData.append('files', file);

		const response = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			headers: {
				Authorization: 'Bearer invalid-token',
			},
			body: formData,
		});

		expect(response.status).toBe(401);
	});

	it('should reject uploads without authorization header', async () => {
		const formData = new FormData();
		const file = new File(['test'], 'test.txt');
		formData.append('files', file);

		const response = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			body: formData,
		});

		expect(response.status).toBe(401);
	});

	it('should reject uploads to non-existent sessionId', async () => {
		const formData = new FormData();
		const file = new File(['test'], 'test.txt');
		formData.append('files', file);

		const response = await testFetch('http://example.com/api/chest/00000000-0000-4000-8000-000000000000/upload', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
			},
			body: formData,
		});

		expect(response.status).toBe(400);
	});
});
