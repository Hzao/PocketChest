// Database types
export interface Session {
	session_id: string;
	retrieval_code: string | null;
	upload_complete: boolean;
	expiry_date: number | null;
	created_at: number;
	updated_at: number;
}

export interface FileRecord {
	file_id: string;
	session_id: string;
	original_filename: string;
	mime_type: string;
	file_size: number;
	file_extension: string | null;
	is_text: boolean;
	created_at: number;
}

// API Request/Response types
export interface CreateChestRequest {
	totpToken?: string;
}

export interface CreateChestResponse {
	sessionId: string;
	uploadToken: string;
	expiresIn: number;
}

export interface UploadFileResponse {
	uploadedFiles: Array<{
		fileId: string;
		filename: string;
		isText: boolean;
	}>;
}

// Multipart upload types
export interface CreateMultipartUploadRequest {
	filename: string;
	mimeType: string;
	fileSize: number;
}

export interface CreateMultipartUploadResponse {
	fileId: string;
	uploadId: string;
}

export interface UploadPartRequest {
	partNumber: number;
	data: ArrayBuffer;
}

export interface UploadPartResponse {
	etag: string;
	partNumber: number;
}

export interface CompleteMultipartUploadRequest {
	parts: Array<{
		partNumber: number;
		etag: string;
	}>;
}

export interface CompleteMultipartUploadResponse {
	fileId: string;
	filename: string;
}

export interface CompleteUploadRequest {
	fileIds: string[];
	validityDays: number; // 1, 3, 7, 15, or -1 for permanent
}

export interface CompleteUploadResponse {
	retrievalCode: string;
	expiryDate: string | null;
}

export interface RetrieveChestResponse {
	files: Array<{
		fileId: string;
		filename: string;
		size: number;
		mimeType: string;
		isText: boolean;
		fileExtension: string | null;
	}>;
	chestToken: string;
	expiryDate: string | null;
}

// JWT Payload types
export interface UploadJWTPayload {
	sessionId: string;
	type: 'upload';
	iat: number;
	exp: number;
}

export interface ChestJWTPayload {
	sessionId: string;
	type: 'chest';
	iat: number;
	exp: number;
}

export interface MultipartJWTPayload {
	sessionId: string;
	fileId: string;
	uploadId: string;
	filename: string;
	mimeType: string;
	fileSize: number;
	type: 'multipart';
	iat: number;
	exp: number;
}

// Cloudflare Env type
export interface Env {
	DB: D1Database;
	R2_STORAGE: R2Bucket;
	JWT_SECRET: string;
	TOTP_SECRETS?: string; // Format: "name1:secret1,name2:secret2"
	REQUIRE_TOTP?: string; // "true" to require TOTP authentication
}
