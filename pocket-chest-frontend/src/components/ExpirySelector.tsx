'use client';

import { ValidityDays } from '@/lib/types';

interface ExpirySelectorProps {
  value: ValidityDays;
  onChange: (days: ValidityDays) => void;
}

const expiryOptions = [
  { value: 1 as ValidityDays, label: '1 Day', description: 'Expires tomorrow' },
  { value: 3 as ValidityDays, label: '3 Days', description: 'Expires in 3 days' },
  { value: 7 as ValidityDays, label: '1 Week', description: 'Expires in 1 week' },
  { value: 15 as ValidityDays, label: '2 Weeks', description: 'Expires in 2 weeks' },
  { value: -1 as ValidityDays, label: 'Permanent', description: 'Never expires' },
];

export function ExpirySelector({ value, onChange }: ExpirySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Expiry Time
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {expiryOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              p-3 rounded-lg border text-left transition-colors
              ${value === option.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="font-medium text-sm">{option.label}</div>
            <div className="text-xs text-gray-500 mt-1">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}