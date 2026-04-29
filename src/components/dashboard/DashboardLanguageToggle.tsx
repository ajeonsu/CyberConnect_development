'use client';

import { Languages } from 'lucide-react';
import type { Language } from '@/lib/data';

interface Props {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  className?: string;
}

export function DashboardLanguageToggle({ language, onLanguageChange, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={() => onLanguageChange(language === 'en' ? 'ja' : 'en')}
      className={`flex items-center gap-1.5 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-gray-300 hover:text-white hover:border-surface-500 text-xs font-medium transition-all shrink-0 ${className}`}
      title={language === 'en' ? 'Switch to Japanese' : '英語に切り替え'}
    >
      <Languages className="w-3.5 h-3.5" />
      {language === 'en' ? 'EN' : 'JP'}
    </button>
  );
}
