// Test data factories for better test maintainability
export class TestDataFactory {
	static createTestFile(
		options: {
			content?: string;
			filename?: string;
			mimeType?: string;
			size?: number;
		} = {},
	) {
		return new File([options.content || 'test content'], options.filename || 'test.txt', { type: options.mimeType || 'text/plain' });
	}

	static createLargeFile(sizeMB: number) {
		const content = 'x'.repeat(sizeMB * 1024 * 1024);
		return new File([content], `large-${sizeMB}mb.txt`, { type: 'text/plain' });
	}

	static createTextItem(content: string, filename: string) {
		return JSON.stringify({ content, filename });
	}

	static createFormData(files: File[], textItems: string[] = []) {
		const formData = new FormData();
		files.forEach((file) => formData.append('files', file));
		textItems.forEach((item) => formData.append('textItems', item));
		return formData;
	}

	static generateInvalidFilenames() {
		return [
			'../../../etc/passwd', // Path traversal
			'con.txt', // Windows reserved
			'.htaccess', // Hidden file
			'file\x00.txt', // Null byte
			'file<script>.txt', // XSS attempt
			'file' + 'x'.repeat(1000) + '.txt', // Very long filename
		];
	}
}
