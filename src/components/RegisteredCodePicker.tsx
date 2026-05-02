import { useMemo } from 'react';
import { translate, type Language } from '@/lib/data';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
  language: Language;
  hintEmptyKey: string;
}

export function RegisteredCodePicker({ value, onChange, options, disabled, language, hintEmptyKey }: Props) {
  const sorted = useMemo(() => [...new Set(options)].filter(Boolean).sort((a, b) => a.localeCompare(b)), [options]);

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 font-mono ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <option value="">{translate('None', language)}</option>
        {sorted.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      {sorted.length === 0 && (
        <p className="text-[11px] text-amber-400/90">{translate(hintEmptyKey, language)}</p>
      )}
    </div>
  );
}
