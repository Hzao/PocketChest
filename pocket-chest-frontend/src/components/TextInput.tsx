'use client';

import { useState } from 'react';
import { TextItem } from '@/lib/types';

interface TextInputProps {
  onTextItemsChange: (items: TextItem[]) => void;
  textItems: TextItem[];
}

export function TextInput({ onTextItemsChange, textItems }: TextInputProps) {
  const [currentText, setCurrentText] = useState('');
  const [currentFilename, setCurrentFilename] = useState('');

  const addTextItem = () => {
    if (!currentText.trim()) return;
    
    const defaultName = `Text ${textItems.length + 1}`;
    const displayName = currentFilename.trim() || defaultName;
    const newItem: TextItem = {
      content: currentText,
      filename: `${displayName}.txt` // Still store as .txt for backend
    };
    
    onTextItemsChange([...textItems, newItem]);
    setCurrentText('');
    setCurrentFilename('');
  };

  const removeTextItem = (index: number) => {
    const newItems = textItems.filter((_, i) => i !== index);
    onTextItemsChange(newItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      addTextItem();
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="border border-gray-300 rounded-lg p-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Content
            </label>
            <textarea
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter text content, code snippets, notes... (Ctrl/Cmd + Enter to add)"
              className="w-full h-48 p-4 border-2 border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label (optional)
              </label>
              <input
                type="text"
                value={currentFilename}
                onChange={(e) => setCurrentFilename(e.target.value)}
                placeholder={`Text ${textItems.length + 1}`}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addTextItem}
                disabled={!currentText.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      </div>

      {textItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Text Items ({textItems.length})</h3>
          {textItems.map((item, index) => {
            // Remove .txt extension for display
            const displayName = item.filename?.endsWith('.txt') 
              ? item.filename.slice(0, -4)
              : item.filename || `Text ${index + 1}`;
            return (
              <div key={index} className="p-3 bg-gray-50 rounded">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 font-mono">
                      {item.content.slice(0, 100)}
                      {item.content.length > 100 ? '...' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {item.content.length} characters
                    </p>
                  </div>
                  <button
                    onClick={() => removeTextItem(index)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}