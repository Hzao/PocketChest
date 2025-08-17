'use client';

import { useState } from 'react';
import { FileUploadProgress } from '@/lib/types';

interface UploadProgressProps {
  files: File[];
  textItems: { content: string; filename?: string }[];
  isUploading: boolean;
  progress: {
    percentage: number;
    loaded: number;
    total: number;
  };
  fileProgress?: FileUploadProgress[];
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
  onRetry: () => void;
  onCancel?: () => void;
}

export function UploadProgress({
  files,
  textItems,
  isUploading,
  progress,
  fileProgress = [],
  uploadStatus,
  error,
  onRetry,
  onCancel
}: UploadProgressProps) {
  if (uploadStatus === 'idle') return null;

  const totalItems = files.length + textItems.length;
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: FileUploadProgress['status']): string => {
    switch (status) {
      case 'waiting': return '⏳';
      case 'starting': return '🔄';
      case 'uploading': return '📤';
      case 'finalizing': return '⚙️';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  const getStatusColor = (status: FileUploadProgress['status']): string => {
    switch (status) {
      case 'waiting': return 'text-gray-500';
      case 'starting': return 'text-yellow-500';
      case 'uploading': return 'text-blue-500';
      case 'finalizing': return 'text-purple-500';
      case 'completed': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getFileProgress = (filename: string): FileUploadProgress | undefined => {
    return fileProgress.find(fp => fp.filename === filename);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {uploadStatus === 'uploading' && '📤 Uploading...'}
          {uploadStatus === 'success' && '✅ Upload Complete'}
          {uploadStatus === 'error' && '❌ Upload Failed'}
        </h3>
        {onCancel && uploadStatus === 'uploading' && (
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {(uploadStatus === 'uploading' || uploadStatus === 'success') && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{totalItems} item(s)</span>
            <span>
              {uploadStatus === 'success' ? '100%' : `${progress.percentage}%`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                uploadStatus === 'success' 
                  ? 'bg-green-500' 
                  : 'bg-blue-500'
              }`}
              style={{ 
                width: `${uploadStatus === 'success' ? 100 : progress.percentage}%` 
              }}
            />
          </div>
          {progress.total > 0 && (
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatFileSize(progress.loaded)} uploaded</span>
              <span>{formatFileSize(progress.total)} total</span>
            </div>
          )}
        </div>
      )}

      {/* File List with Individual Progress */}
      <div className="space-y-3">
        {files.map((file, index) => {
          const fileProgressData = getFileProgress(file.name);
          return (
            <div key={index} className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {fileProgressData 
                      ? getStatusIcon(fileProgressData.status)
                      : (uploadStatus === 'success' ? '✅' : '📄')
                    }
                  </span>
                  <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium capitalize ${
                    fileProgressData 
                      ? getStatusColor(fileProgressData.status)
                      : 'text-gray-500'
                  }`}>
                    {fileProgressData?.status || (uploadStatus === 'success' ? 'completed' : 'waiting')}
                  </span>
                  {fileProgressData && (
                    <span className="text-xs text-gray-500">
                      {fileProgressData.percentage}%
                    </span>
                  )}
                </div>
              </div>
              
              {/* Individual File Progress Bar */}
              {fileProgressData && fileProgressData.status !== 'waiting' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        fileProgressData.status === 'completed' 
                          ? 'bg-green-500' 
                          : fileProgressData.status === 'uploading'
                          ? 'bg-blue-500'
                          : fileProgressData.status === 'starting'
                          ? 'bg-yellow-500'
                          : fileProgressData.status === 'finalizing'
                          ? 'bg-purple-500'
                          : fileProgressData.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                      }`}
                      style={{ width: `${fileProgressData.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatFileSize(fileProgressData.uploadedBytes)}</span>
                    <span>{formatFileSize(fileProgressData.totalBytes)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {textItems.map((item, index) => {
          const filename = item.filename || `text-${index + 1}.txt`;
          const fileProgressData = getFileProgress(filename);
          return (
            <div key={index} className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {fileProgressData 
                      ? getStatusIcon(fileProgressData.status)
                      : (uploadStatus === 'success' ? '✅' : '📝')
                    }
                  </span>
                  <span className="text-sm font-medium truncate">
                    {item.filename?.endsWith('.txt') 
                      ? item.filename.slice(0, -4) 
                      : item.filename || `Text ${index + 1}`}
                  </span>
                  <span className="text-xs text-gray-500">({item.content.length} chars)</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">TEXT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium capitalize ${
                    fileProgressData 
                      ? getStatusColor(fileProgressData.status)
                      : 'text-gray-500'
                  }`}>
                    {fileProgressData?.status || (uploadStatus === 'success' ? 'completed' : 'waiting')}
                  </span>
                  {fileProgressData && (
                    <span className="text-xs text-gray-500">
                      {fileProgressData.percentage}%
                    </span>
                  )}
                </div>
              </div>
              
              {/* Individual File Progress Bar */}
              {fileProgressData && fileProgressData.status !== 'waiting' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        fileProgressData.status === 'completed' 
                          ? 'bg-green-500' 
                          : fileProgressData.status === 'uploading'
                          ? 'bg-blue-500'
                          : fileProgressData.status === 'starting'
                          ? 'bg-yellow-500'
                          : fileProgressData.status === 'finalizing'
                          ? 'bg-purple-500'
                          : fileProgressData.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                      }`}
                      style={{ width: `${fileProgressData.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatFileSize(fileProgressData.uploadedBytes)}</span>
                    <span>{formatFileSize(fileProgressData.totalBytes)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error State */}
      {uploadStatus === 'error' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600">❌</span>
            <span className="font-medium text-red-900">Upload Failed</span>
          </div>
          <p className="text-red-700 text-sm mb-3">{error || 'An error occurred during upload'}</p>
          <div className="flex gap-2">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              🔄 Retry Upload
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success State */}
      {uploadStatus === 'success' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✅</span>
            <span className="font-medium text-green-900">Upload Completed Successfully!</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            All {totalItems} item(s) have been uploaded and are ready to share.
          </p>
        </div>
      )}
    </div>
  );
}