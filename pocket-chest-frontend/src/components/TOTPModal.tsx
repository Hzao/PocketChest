'use client';

import { useState } from 'react';

interface TOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (token: string) => Promise<void>;
  error?: string;
  allowCancel?: boolean;
}

export function TOTPModal({ isOpen, onClose, onSubmit, error, allowCancel = true }: TOTPModalProps) {
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (token.length !== 6) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(token);
      setToken('');
    } catch (error) {
      // Error handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTokenChange = (value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setToken(digits);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">
            Enter your 6-digit TOTP code from your authenticator app
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              TOTP Code
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full p-4 text-center text-2xl font-mono font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              autoComplete="one-time-code"
              autoFocus
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                Check your authenticator app
              </p>
              <p className={`text-xs ${
                token.length === 6 ? 'text-green-600' : 'text-gray-400'
              }`}>
                {token.length}/6
              </p>
            </div>
          </div>

          <div className={`flex gap-3 ${!allowCancel ? 'justify-center' : ''}`}>
            {allowCancel && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={token.length !== 6 || isSubmitting}
              className={`${allowCancel ? 'flex-1' : 'w-full'} py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin text-sm">⏳</div>
                  Verifying...
                </span>
              ) : (
                'Authenticate'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              🔒 This service only accepts uploads from authorized users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}