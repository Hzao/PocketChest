import {
  CreateChestResponse,
  UploadResponse,
  CompleteUploadResponse,
  RetrieveResponse,
  TextItem,
  ValidityDays,
  CreateMultipartUploadResponse,
  UploadPartResponse,
  UploadPart,
  MultipartUploadProgress,
  FileUploadProgress,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8787';

export class PocketChestAPI {
  constructor(private baseUrl: string = API_BASE_URL) {}

  async getConfig(): Promise<{ requireTOTP: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/config`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch server config');
    }

    return response.json();
  }

  async createChest(totpToken?: string): Promise<CreateChestResponse> {
    const body = totpToken ? { totpToken } : {};
    
    const response = await fetch(`${this.baseUrl}/api/chest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create chest');
    }

    return response.json();
  }

  async uploadContent(
    sessionId: string,
    uploadToken: string,
    files: File[],
    textItems: TextItem[],
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void,
    onFileProgress?: (progress: FileUploadProgress[]) => void
  ): Promise<UploadResponse> {
    const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB chunk size
    
    // Separate small and large files - split if larger than one chunk
    const smallFiles = files.filter(file => file.size <= CHUNK_SIZE);
    const largeFiles = files.filter(file => file.size > CHUNK_SIZE);
    
    const uploadedFiles: Array<{ fileId: string; filename: string; isText: boolean }> = [];

    // Calculate total size for overall progress (including text items)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0) + 
                     textItems.reduce((sum, textItem) => sum + new TextEncoder().encode(textItem.content).length, 0);
    let completedSize = 0;
    
    // Track individual file progress
    const fileProgressMap = new Map<string, FileUploadProgress>();
    
    // Initialize progress for all files as waiting
    files.forEach(file => {
      fileProgressMap.set(file.name, {
        fileId: '', // Will be set when upload starts
        filename: file.name,
        uploadedBytes: 0,
        totalBytes: file.size,
        percentage: 0,
        isText: false,
        status: 'waiting'
      });
    });
    
    // Initialize progress for text items as waiting
    textItems.forEach((textItem, index) => {
      const textSize = new TextEncoder().encode(textItem.content).length;
      fileProgressMap.set(textItem.filename || `text-${index + 1}`, {
        fileId: '', // Will be set when upload starts
        filename: textItem.filename || `text-${index + 1}`,
        uploadedBytes: 0,
        totalBytes: textSize,
        percentage: 0,
        isText: true,
        status: 'waiting'
      });
    });
    
    const updateFileProgress = () => {
      if (onFileProgress) {
        onFileProgress(Array.from(fileProgressMap.values()));
      }
    };

    // Upload text items first if any
    if (textItems.length > 0) {
      // Mark all text items as starting
      textItems.forEach((textItem, index) => {
        const key = textItem.filename || `text-${index + 1}`;
        const fileProgress = fileProgressMap.get(key);
        if (fileProgress) {
          fileProgress.status = 'starting';
        }
      });
      updateFileProgress();
      
      const result = await this.uploadContentRegular(sessionId, uploadToken, [], textItems);
      
      // Mark all text items as completed and update their fileIds
      result.uploadedFiles.forEach((uploadedFile) => {
        if (uploadedFile.isText) {
          // Find the corresponding text item by filename
          const key = uploadedFile.filename;
          const fileProgress = fileProgressMap.get(key);
          if (fileProgress) {
            fileProgress.fileId = uploadedFile.fileId;
            fileProgress.status = 'completed';
            fileProgress.uploadedBytes = fileProgress.totalBytes;
            fileProgress.percentage = 100;
            // Add text size to completed size for overall progress
            completedSize += fileProgress.totalBytes;
          }
        }
      });
      updateFileProgress();
      
      uploadedFiles.push(...result.uploadedFiles);
    }

    // Upload small files with rolling concurrency (max 3 at a time)
    if (smallFiles.length > 0) {
      const MAX_CONCURRENT_SMALL_FILES = 3;
      let activeUploads = 0;
      let fileIndex = 0;
      
      const uploadNextFile = async (): Promise<void> => {
        if (fileIndex >= smallFiles.length) return;
        
        const file = smallFiles[fileIndex++];
        activeUploads++;
        
        // Mark file as starting
        const fileProgress = fileProgressMap.get(file.name);
        if (fileProgress) {
          fileProgress.status = 'starting';
        }
        updateFileProgress();
        
        try {
          const result = await this.uploadContentRegular(
            sessionId, 
            uploadToken, 
            [file], 
            [], 
            (progress) => {
              // Mark as uploading when progress starts
              const fileProgress = fileProgressMap.get(file.name);
              if (fileProgress) {
                if (fileProgress.status === 'starting') {
                  fileProgress.status = 'uploading';
                }
                fileProgress.uploadedBytes = Math.min(file.size, progress.loaded);
                fileProgress.percentage = Math.round((fileProgress.uploadedBytes / fileProgress.totalBytes) * 100);
                
                if (progress.percentage === 100) {
                  fileProgress.status = 'finalizing';
                  fileProgress.uploadedBytes = fileProgress.totalBytes;
                  fileProgress.percentage = 100;
                }
              }
              updateFileProgress();
              
              // Calculate total progress across all concurrent uploads
              if (onProgress) {
                const currentProgress = Array.from(fileProgressMap.values())
                  .filter(fp => fp.status === 'uploading' || fp.status === 'finalizing')
                  .reduce((sum, fp) => sum + fp.uploadedBytes, 0);
                
                onProgress({
                  loaded: completedSize + currentProgress,
                  total: totalSize,
                  percentage: Math.round(((completedSize + currentProgress) / totalSize) * 100)
                });
              }
            }
          );
          
          // Mark file as completed
          const fileProgress = fileProgressMap.get(file.name);
          if (fileProgress) {
            fileProgress.fileId = result.uploadedFiles[0].fileId;
            fileProgress.status = 'completed';
            fileProgress.uploadedBytes = fileProgress.totalBytes;
            fileProgress.percentage = 100;
            fileProgress.isText = result.uploadedFiles[0].isText;
          }
          
          uploadedFiles.push(...result.uploadedFiles);
          completedSize += file.size;
          updateFileProgress();
          
        } catch (error) {
          const fileProgress = fileProgressMap.get(file.name);
          if (fileProgress) {
            fileProgress.status = 'error';
          }
          updateFileProgress();
          throw error;
          
        } finally {
          activeUploads--;
          
          // Start next file if available and under limit
          if (fileIndex < smallFiles.length && activeUploads < MAX_CONCURRENT_SMALL_FILES) {
            uploadNextFile();
          }
        }
      };
      
      // Start initial uploads (up to 3)
      const initialUploads = Math.min(MAX_CONCURRENT_SMALL_FILES, smallFiles.length);
      const uploadPromises: Promise<void>[] = [];
      
      for (let i = 0; i < initialUploads; i++) {
        uploadPromises.push(uploadNextFile());
      }
      
      // Wait for all small files to complete
      await Promise.all(uploadPromises);
      
      // Process any remaining files (this handles the rolling uploads)
      while (fileIndex < smallFiles.length) {
        await uploadNextFile();
      }
    }

    // Upload large files using multipart upload sequentially
    for (const file of largeFiles) {
      // Mark current large file as starting
      const currentFileProgress = fileProgressMap.get(file.name);
      if (currentFileProgress) {
        currentFileProgress.status = 'starting';
      }
      updateFileProgress();
      
      const result = await this.uploadLargeFile(
        sessionId,
        uploadToken,
        file,
        (progress) => {
          // Update file progress for this specific file
          const activeFileProgress = fileProgressMap.get(file.name);
          if (activeFileProgress) {
            activeFileProgress.fileId = progress.fileId;
            activeFileProgress.uploadedBytes = progress.uploadedBytes;
            activeFileProgress.percentage = progress.percentage;
            activeFileProgress.status = progress.percentage === 100 ? 'finalizing' : 'uploading';
          }
          updateFileProgress();
          
          // Update overall progress - convert MultipartUploadProgress to match small files format
          if (onProgress) {
            onProgress({
              loaded: completedSize + progress.uploadedBytes,
              total: totalSize,
              percentage: Math.round(((completedSize + progress.uploadedBytes) / totalSize) * 100)
            });
          }
        }
      );
      
      // Mark large file as completed
      const completedFileProgress = fileProgressMap.get(file.name);
      if (completedFileProgress) {
        completedFileProgress.fileId = result.fileId;
        completedFileProgress.status = 'completed';
        completedFileProgress.uploadedBytes = completedFileProgress.totalBytes;
        completedFileProgress.percentage = 100;
        completedFileProgress.isText = false;
      }
      
      uploadedFiles.push({
        fileId: result.fileId,
        filename: result.filename,
        isText: false
      });
      
      completedSize += file.size;
      updateFileProgress();
    }

    return { uploadedFiles };
  }

  private async uploadContentRegular(
    sessionId: string,
    uploadToken: string,
    files: File[],
    textItems: TextItem[],
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    textItems.forEach(textItem => {
      formData.append('textItems', JSON.stringify({
        content: textItem.content,
        filename: textItem.filename || `text-${Date.now()}.txt`
      }));
    });

    // Use XMLHttpRequest for progress tracking if onProgress is provided
    if (onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage
            });
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch (error) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.open('POST', `${this.baseUrl}/api/chest/${sessionId}/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${uploadToken}`);
        xhr.send(formData);
      });
    }

    // Fallback to fetch if no progress tracking needed
    const response = await fetch(`${this.baseUrl}/api/chest/${sessionId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${uploadToken}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload files');
    }

    return response.json();
  }

  async completeUpload(
    sessionId: string,
    uploadToken: string,
    fileIds: string[],
    validityDays: ValidityDays = 7
  ): Promise<CompleteUploadResponse> {
    const response = await fetch(`${this.baseUrl}/api/chest/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${uploadToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileIds,
        validityDays
      })
    });

    if (!response.ok) {
      throw new Error('Failed to complete upload');
    }

    return response.json();
  }

  async retrieveChest(retrievalCode: string): Promise<RetrieveResponse> {
    const response = await fetch(`${this.baseUrl}/api/retrieve/${retrievalCode}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Retrieval code not found or expired');
      }
      throw new Error('Failed to retrieve chest');
    }

    return response.json();
  }

  async downloadFile(fileId: string, chestToken: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/download/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${chestToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    return response.blob();
  }

  async downloadTextContent(fileId: string, chestToken: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/download/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${chestToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to download text');
    }

    return response.text();
  }

  triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async downloadFileDirectly(fileId: string, chestToken: string, filename: string): Promise<void> {
    // Create direct download link that bypasses JavaScript memory entirely
    const downloadUrl = `${this.baseUrl}/api/download/${fileId}?token=${encodeURIComponent(chestToken)}&filename=${encodeURIComponent(filename)}`;
    
    // Use direct link approach - browser handles download natively
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Multipart upload methods
  async createMultipartUpload(
    sessionId: string,
    uploadToken: string,
    filename: string,
    mimeType: string,
    fileSize: number
  ): Promise<CreateMultipartUploadResponse> {
    const response = await fetch(`${this.baseUrl}/api/chest/${sessionId}/multipart/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${uploadToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename,
        mimeType,
        fileSize
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create multipart upload');
    }

    return response.json();
  }

  async uploadPart(
    sessionId: string,
    multipartToken: string,
    fileId: string,
    partNumber: number,
    data: ArrayBuffer,
    onPartProgress?: (loaded: number, total: number) => void
  ): Promise<UploadPartResponse> {
    // Use XMLHttpRequest for progress tracking
    if (onPartProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onPartProgress(event.loaded, event.total);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch (error) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            reject(new Error(`Failed to upload part ${partNumber} with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error(`Network error during part ${partNumber} upload`));
        });
        
        xhr.open('PUT', `${this.baseUrl}/api/chest/${sessionId}/multipart/${fileId}/part/${partNumber}`);
        xhr.setRequestHeader('Authorization', `Bearer ${multipartToken}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(data);
      });
    }

    // Fallback to fetch if no progress tracking needed
    const response = await fetch(`${this.baseUrl}/api/chest/${sessionId}/multipart/${fileId}/part/${partNumber}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${multipartToken}`,
        'Content-Type': 'application/octet-stream'
      },
      body: data
    });

    if (!response.ok) {
      throw new Error(`Failed to upload part ${partNumber}`);
    }

    return response.json();
  }

  async completeMultipartUpload(
    sessionId: string,
    multipartToken: string,
    fileId: string,
    parts: UploadPart[]
  ): Promise<{ fileId: string; filename: string }> {
    const response = await fetch(`${this.baseUrl}/api/chest/${sessionId}/multipart/${fileId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${multipartToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ parts })
    });

    if (!response.ok) {
      throw new Error('Failed to complete multipart upload');
    }

    return response.json();
  }

  async uploadLargeFile(
    sessionId: string,
    uploadToken: string,
    file: File,
    onProgress?: (progress: MultipartUploadProgress) => void
  ): Promise<{ fileId: string; filename: string }> {
    const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB chunks
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);

    // Create multipart upload - uploadId is now a JWT token
    const { fileId, uploadId: multipartToken } = await this.createMultipartUpload(
      sessionId,
      uploadToken,
      file.name,
      file.type || 'application/octet-stream',
      file.size
    );

    // Initial progress callback to transition from "starting" to "uploading"
    if (onProgress) {
      onProgress({
        fileId,
        filename: file.name,
        uploadedParts: 0,
        totalParts,
        uploadedBytes: 0,
        totalBytes: file.size,
        percentage: 0
      });
    }

    const uploadedParts: UploadPart[] = [];
    let uploadedBytes = 0;

    // Upload parts with 3 concurrent uploads for better performance
    const concurrencyLimit = Math.min(3, totalParts);
    const partProgress = new Map<number, number>(); // Track progress of each part
    const completedPartSizes = new Map<number, number>(); // Track completed part sizes
    let completedPartsCount = 0;
    
    const calculateTotalProgress = () => {
      let totalUploaded = 0;
      
      // Add completed parts
      completedPartSizes.forEach((size) => {
        totalUploaded += size;
      });
      
      // Add in-progress parts (only if not already completed)
      partProgress.forEach((loaded, partNumber) => {
        if (!completedPartSizes.has(partNumber)) {
          totalUploaded += loaded;
        }
      });
      
      return totalUploaded;
    };
    
    // Upload parts in batches of 3 (or less for small files)
    for (let i = 0; i < totalParts; i += concurrencyLimit) {
      const batchPromises: Promise<void>[] = [];
      
      // Create batch of up to 3 concurrent uploads
      for (let j = 0; j < concurrencyLimit && (i + j) < totalParts; j++) {
        const partNumber = i + j + 1;
        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const chunkSize = chunk.size;
        
        const uploadPromise = (async () => {
          const arrayBuffer = await chunk.arrayBuffer();
          
          const result = await this.uploadPart(
            sessionId, 
            multipartToken, 
            fileId, 
            partNumber, 
            arrayBuffer,
            (loaded, total) => {
              // Update progress for this specific part
              partProgress.set(partNumber, loaded);
              
              // Calculate total progress atomically
              const totalUploaded = calculateTotalProgress();
              
              if (onProgress) {
                onProgress({
                  fileId,
                  filename: file.name,
                  uploadedParts: completedPartsCount,
                  totalParts,
                  uploadedBytes: totalUploaded,
                  totalBytes: file.size,
                  percentage: Math.round((totalUploaded / file.size) * 100)
                });
              }
            }
          );
          
          uploadedParts.push({
            partNumber,
            etag: result.etag
          });
          
          // Atomically mark part as completed
          partProgress.delete(partNumber);
          completedPartSizes.set(partNumber, chunkSize);
          completedPartsCount++;
          
          // Update progress after completion
          if (onProgress) {
            const totalUploaded = calculateTotalProgress();
            
            onProgress({
              fileId,
              filename: file.name,
              uploadedParts: completedPartsCount,
              totalParts,
              uploadedBytes: totalUploaded,
              totalBytes: file.size,
              percentage: Math.round((totalUploaded / file.size) * 100)
            });
          }
        })();
        
        batchPromises.push(uploadPromise);
      }
      
      // Wait for this batch to complete before starting the next batch
      await Promise.all(batchPromises);
    }

    // All parts uploaded, now finalizing
    if (onProgress) {
      onProgress({
        fileId,
        filename: file.name,
        uploadedParts: totalParts,
        totalParts,
        uploadedBytes: file.size,
        totalBytes: file.size,
        percentage: 100
      });
    }

    // Sort parts by part number and complete upload
    uploadedParts.sort((a, b) => a.partNumber - b.partNumber);
    const result = await this.completeMultipartUpload(sessionId, multipartToken, fileId, uploadedParts);

    return result;
  }
}