'use client';

import type { Audience } from '@/types/meme';

interface Props {
  value: Audience;
  onChange: (audience: Audience) => void;
}

const options: { value: Audience; label: string; emoji: string }[] = [
  { value: 'software-engineers',   label: 'Software Engineers',    emoji: '💻' },
  { value: 'business-professionals', label: 'Business Professionals', emoji: '📊' },
];

export default function AudienceSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {options.map(opt => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all
              ${isActive
                ? 'border-purple-500 bg-purple-600/20 text-purple-200 shadow-sm shadow-purple-900/30'
                : 'border-purple-700/40 bg-purple-950/20 text-purple-300/70 hover:border-purple-600/50 hover:text-purple-200'
              }`}
          >
            <span className="text-base leading-none">{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
