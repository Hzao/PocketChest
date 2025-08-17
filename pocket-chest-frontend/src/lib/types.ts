export interface CreateChestResponse {
  sessionId: string;
  uploadToken: string;
  expiresIn: number;
}

export interface UploadedFile {
  fileId: string;
  filename: string;
  isText: boolean;
}

export interface UploadResponse {
  uploadedFiles: UploadedFile[];
}

export interface CompleteUploadResponse {
  retrievalCode: string;
  expiryDate: string;
}

export interface FileInfo {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  isText: boolean;
  fileExtension: string;
}

export interface RetrieveResponse {
  files: FileInfo[];
  chestToken: string;
  expiryDate: string;
}

export interface TextItem {
  content: string;
  filename?: string;
}

export type ValidityDays = 1 | 3 | 7 | 15 | -1;

// Multipart upload types
export interface CreateMultipartUploadResponse {
  fileId: string;
  uploadId: string;
}

export interface UploadPartResponse {
  etag: string;
  partNumber: number;
}

export interface UploadPart {
  partNumber: number;
  etag: string;
}

export interface MultipartUploadProgress {
  fileId: string;
  filename: string;
  uploadedParts: number;
  totalParts: number;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
}

export interface FileUploadProgress {
  fileId: string;
  filename: string;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  isText: boolean;
  status: 'waiting' | 'starting' | 'uploading' | 'finalizing' | 'completed' | 'error';
}