'use client';

import MemeCanvas from './MemeCanvas';
import type { MemeCaption } from '@/types/meme';

interface Props {
  imageUrl: string;
  memes: MemeCaption[];
  onEditMeme: (caption: MemeCaption) => void;
}

export default function MemeGrid({ imageUrl, memes, onEditMeme }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-700/40 to-transparent" />
        <p className="text-purple-400/70 text-sm font-medium tracking-wide uppercase">
          Your Memes
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-700/40 to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {memes.map((caption, i) => (
          <MemeCanvas key={caption.id} imageUrl={imageUrl} caption={caption} index={i} onEdit={() => onEditMeme(caption)} />
        ))}
      </div>
    </div>
  );
}
