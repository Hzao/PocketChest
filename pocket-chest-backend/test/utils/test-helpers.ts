// Test helper functions for common operations
import { expect } from 'vitest';
import { testFetch } from './test-setup';

export class TestWorkflow {
	/**
	 * Complete end-to-end workflow: create chest -> upload -> complete -> retrieve
	 */
	static async createCompleteChest(files: File[], textItems: string[] = []) {
		// 1. Create chest
		const createResponse = await testFetch('http://example.com/api/chest', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});
		const { sessionId, uploadToken } = (await createResponse.json()) as any;

		// 2. Upload files
		const formData = new FormData();
		files.forEach((file) => formData.append('files', file));
		textItems.forEach((item) => formData.append('textItems', item));

		const uploadResponse = await testFetch(`http://example.com/api/chest/${sessionId}/upload`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${uploadToken}` },
			body: formData,
		});
		const uploadData = (await uploadResponse.json()) as any;

		// 3. Complete upload
		const completeResponse = await testFetch(`http://example.com/api/chest/${sessionId}/complete`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${uploadToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				fileIds: uploadData.uploadedFiles.map((f: any) => f.fileId),
				validityDays: 7,
			}),
		});
		const { retrievalCode } = (await completeResponse.json()) as any;

		// 4. Get retrieval info
		const retrieveResponse = await testFetch(`http://example.com/api/retrieve/${retrievalCode}`);
		const retrieveData = (await retrieveResponse.json()) as any;

		return {
			sessionId,
			uploadToken,
			retrievalCode,
			chestToken: retrieveData.chestToken,
			files: retrieveData.files,
		};
	}

	/**
	 * Create a multipart upload workflow
	 */
	static async createMultipartUpload(_filename: string, _content: string) {
		// Implementation for multipart upload workflow
		// TODO: Implement multipart upload helper
	}
}

export class TestAssertions {
	/**
	 * Assert valid UUID format
	 */
	static expectValidUUID(value: string) {
		expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
	}

	/**
	 * Assert valid retrieval code format
	 */
	static expectValidRetrievalCode(code: string) {
		expect(code).toMatch(/^[A-Z0-9]{6}$/);
	}

	/**
	 * Assert CORS headers
	 */
	static expectCORSHeaders(response: Response) {
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	}

	/**
	 * Assert error response format
	 */
	static async expectErrorResponse(response: Response, expectedStatus: number, expectedError?: string) {
		expect(response.status).toBe(expectedStatus);
		const data = (await response.json()) as any;
		expect(data).toHaveProperty('error');
		if (expectedError) {
			expect(data.error).toBe(expectedError);
		}
	}
}
