'use client';

import { useState, useEffect } from 'react';
import { usePocketChest } from '@/hooks/usePocketChest';
import { PocketChestAPI } from '@/lib/api';
import { FileInfo } from '@/lib/types';

interface FileWithContent extends FileInfo {
  content?: string;
  blob?: Blob;
}

interface RetrieveClientProps {
  code: string;
  onBack?: () => void;
}

export function RetrieveClient({ code, onBack }: RetrieveClientProps) {
  const [files, setFiles] = useState<FileWithContent[]>([]);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [chestToken, setChestToken] = useState<string>('');
  const [hasRetrieved, setHasRetrieved] = useState(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  
  const { retrieve, downloadSingleFile, isRetrieving, error, clearError } = usePocketChest();
  const api = new PocketChestAPI();

  useEffect(() => {
    if (code && !hasRetrieved) {
      handleRetrieve();
    }
  }, [code]);

  const handleRetrieve = async () => {
    if (!code) return;
    
    try {
      const result = await retrieve(code);
      setFiles(result.files);
      setExpiryDate(result.expiryDate);
      setChestToken(result.chestToken);
      setHasRetrieved(true);
    } catch (error) {
      console.error('Retrieval failed:', error);
    }
  };

  const handleDownload = async (file: FileWithContent) => {
    try {
      await downloadSingleFile(file.fileId, chestToken, file.filename);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };


  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const copyTextToClipboard = (content: string, fileId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFileId(fileId);
    setTimeout(() => setCopiedFileId(null), 2000);
  };

  if (isRetrieving) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-xl">Retrieving files...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">Retrieval Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PocketChest</h1>
          <p className="text-xl text-gray-600">Retrieval Code: <code className="font-mono font-bold text-blue-600">{code}</code></p>
        </div>

{files.length > 0 && (
          <div className="space-y-8">
            {/* Text Content Section */}
            {files.some(f => f.isText) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">📝 Text Content</h2>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {files.filter(f => f.isText).map((file, index) => {
                    // Remove .txt extension for display
                    const displayName = file.filename.endsWith('.txt') 
                      ? file.filename.slice(0, -4)
                      : file.filename;
                    return (
                    <div key={file.fileId} className="flex-shrink-0 w-80 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2 truncate">
                        {displayName}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {formatFileSize(file.size)}
                      </p>
                      
                      {file.content && (
                        <div>
                          <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto mb-3">
                            <pre className="text-sm whitespace-pre-wrap font-mono">{file.content}</pre>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => copyTextToClipboard(file.content!, file.fileId)}
                              className={`flex-1 text-xs px-3 py-2 rounded transition-colors ${
                                copiedFileId === file.fileId
                                  ? 'bg-green-500 text-white'
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              {copiedFileId === file.fileId ? '✓ Copied!' : '📋 Copy'}
                            </button>
                            <button
                              onClick={() => handleDownload(file)}
                              className="flex-1 text-xs px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              📄 Download as .txt
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Files Section */}
            {files.some(f => !f.isText) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">📁 Files ({files.filter(f => !f.isText).length})</h2>
                  <p className="text-gray-600">Expires: {formatDate(expiryDate)}</p>
                </div>

                <div className="space-y-4">
                  {files.filter(f => !f.isText).map((file, index) => (
                    <div key={file.fileId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-gray-900 truncate">
                            📄 {file.filename}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)} • {file.mimeType}
                          </p>
                        </div>
                        
                        <div className="ml-4 flex-shrink-0">
                          <button
                            onClick={() => handleDownload(file)}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              ← Enter Another Code
            </button>
          )}
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Upload Files
          </button>
        </div>
      </div>
    </main>
  );
}