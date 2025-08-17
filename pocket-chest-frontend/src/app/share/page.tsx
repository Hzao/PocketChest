'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileUpload } from '@/components/FileUpload';
import { TextInput } from '@/components/TextInput';
import { ExpirySelector } from '@/components/ExpirySelector';
import { TOTPModal } from '@/components/TOTPModal';
import { UploadProgress } from '@/components/UploadProgress';
import { usePocketChest } from '@/hooks/usePocketChest';
import { PocketChestAPI } from '@/lib/api';
import { TextItem, ValidityDays } from '@/lib/types';

export default function SharePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [validityDays, setValidityDays] = useState<ValidityDays>(7);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showTOTPModal, setShowTOTPModal] = useState(false);
  const [totpError, setTotpError] = useState<string>('');
  const [sessionData, setSessionData] = useState<{sessionId: string, uploadToken: string} | null>(null);
  
  // Config state
  const [configLoaded, setConfigLoaded] = useState(false);
  const [requireTOTP, setRequireTOTP] = useState(false);
  
  const { 
    uploadWithSession, 
    retryUpload, 
    cancelUpload, 
    isUploading, 
    uploadProgress, 
    uploadStatus, 
    fileProgress,
    error, 
    clearError 
  } = usePocketChest();
  const api = new PocketChestAPI();

  // Fetch config and initialize session
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // First, fetch server configuration
        const config = await api.getConfig();
        setRequireTOTP(config.requireTOTP);
        setConfigLoaded(true);
        
        // Then initialize session based on config
        if (config.requireTOTP) {
          setShowTOTPModal(true);
        } else {
          // No TOTP required, create session immediately
          setIsAuthenticating(true);
          const session = await api.createChest();
          setSessionData({ sessionId: session.sessionId, uploadToken: session.uploadToken });
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Show error state or fallback
      } finally {
        setIsAuthenticating(false);
      }
    };

    initializeApp();
  }, []);

  const handleTOTPSubmit = async (totpToken: string) => {
    setTotpError('');
    setIsAuthenticating(true);
    
    try {
      const session = await api.createChest(totpToken);
      setSessionData({ sessionId: session.sessionId, uploadToken: session.uploadToken });
      setIsAuthenticated(true);
      setShowTOTPModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setTotpError(message);
      throw error; // Re-throw to let modal handle UI state
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleTOTPClose = () => {
    // Don't allow closing if TOTP is required - they need to authenticate
    if (requireTOTP && !isAuthenticated) {
      return;
    }
    setShowTOTPModal(false);
    setTotpError('');
  };

  const handleUpload = async () => {
    if (files.length === 0 && textItems.length === 0) {
      alert('Please add files or text to share');
      return;
    }

    if (!sessionData) {
      alert('Session not ready. Please try again.');
      return;
    }
    
    // Scroll to top to show upload progress
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Fallback for older browsers
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }, 100);
    
    try {
      const result = await uploadWithSession(
        sessionData.sessionId,
        sessionData.uploadToken,
        files,
        textItems,
        validityDays
      );
      setUploadResult(result.retrievalCode);
      setFiles([]);
      setTextItems([]);
    } catch (error) {
      console.error('Upload failed:', error);
      // Error is handled by the uploadProgress component
    }
  };

  const handleRetry = async () => {
    if (!sessionData) return;
    
    try {
      const result = await retryUpload(
        sessionData.sessionId,
        sessionData.uploadToken,
        files,
        textItems,
        validityDays
      );
      setUploadResult(result.retrievalCode);
      setFiles([]);
      setTextItems([]);
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  const handleCancel = () => {
    cancelUpload();
    // Reset local page state
    setUploadResult(null);
    setCopied(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show loading state until config is loaded and authentication is complete
  if (!configLoaded || (requireTOTP && !isAuthenticated) || isAuthenticating) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mt-4 mb-2">📤 Share Files & Text</h1>
            <p className="text-xl text-gray-600">Upload files or text to get a shareable code</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <div className="text-8xl mb-6">
                {!configLoaded ? '🎯' : (requireTOTP ? '🔐' : '⏳')}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {!configLoaded ? 'Opening the Chest...' : (requireTOTP ? 'Authentication Required' : 'Preparing Session')}
              </h2>
              <p className="text-gray-600 mb-6">
                {!configLoaded
                  ? 'Checking what treasures await inside! 🗝️✨'
                  : (requireTOTP 
                    ? 'Please authenticate with your TOTP code to proceed'
                    : 'Setting up your upload session...'
                  )
                }
              </p>
              {isAuthenticating && (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin text-xl">⏳</div>
                  <span>Authenticating...</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* TOTP Modal */}
        <TOTPModal
          isOpen={showTOTPModal}
          onClose={handleTOTPClose}
          onSubmit={handleTOTPSubmit}
          error={totpError}
          allowCancel={false}
        />
      </main>
    );
  }

  if (uploadResult) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mt-4 mb-2">Upload Successful!</h1>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <div className="text-8xl mb-6">✅</div>
              <h2 className="text-3xl font-bold text-green-700 mb-4">Files Shared Successfully</h2>
              <p className="text-gray-600 mb-8 text-lg">Your files are uploaded and ready to share!</p>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <p className="text-sm text-gray-600 mb-3 font-medium">Share this retrieval code:</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <code className="text-3xl font-mono font-bold text-blue-600 bg-white px-6 py-3 rounded-lg border-2 border-blue-200">
                    {uploadResult}
                  </code>
                  <button
                    onClick={() => copyToClipboard(uploadResult)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      copied
                        ? 'text-green-600 bg-green-50 border-green-200'
                        : 'text-blue-600 hover:bg-blue-50 border-blue-200 hover:border-blue-300'
                    }`}
                    title="Copy to clipboard"
                  >
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Recipients can use this code at {window.location.origin}/retrieve
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setUploadResult(null);
                    clearError();
                  }}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
                >
                  Share More Files
                </button>
                <Link 
                  href="/"
                  className="block w-full py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold text-center"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4 mb-2">📤 Share Files & Text</h1>
          <p className="text-xl text-gray-600">Upload files or text to get a shareable code</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex justify-between items-center">
              <p className="text-red-700">{error}</p>
              <button onClick={clearError} className="text-red-500 hover:text-red-700">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        <UploadProgress
          files={files}
          textItems={textItems}
          isUploading={isUploading}
          progress={uploadProgress}
          fileProgress={fileProgress}
          uploadStatus={uploadStatus}
          error={error || undefined}
          onRetry={handleRetry}
          onCancel={handleCancel}
        />

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="space-y-8">
            {/* Text Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📝 Text Content</h2>
              <TextInput textItems={textItems} onTextItemsChange={setTextItems} />
            </div>
            
            {/* Files Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📁 Files</h2>
              <FileUpload files={files} onFilesChange={setFiles} />
            </div>
            
            <ExpirySelector value={validityDays} onChange={setValidityDays} />
            
            <button
              onClick={handleUpload}
              disabled={isUploading || (files.length === 0 && textItems.length === 0)}
              className="w-full py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin text-xl">⏳</div>
                  Uploading...
                </span>
              ) : (
                'Upload & Generate Code'
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}