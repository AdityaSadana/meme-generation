'use client';

import { useEffect, useRef } from 'react';
import { drawMeme } from '@/lib/canvas-renderer';
import type { MemeCaption } from '@/types/meme';

interface Props {
  imageUrl: string;
  caption: MemeCaption;
  index: number;
  onEdit: () => void;
}

export default function MemeCanvas({ imageUrl, caption, index, onEdit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;
    drawMeme(canvasRef.current, imageUrl, caption.top_text, caption.bottom_text);
  }, [imageUrl, caption]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meme-${index + 1}.png`;
        a.click();
        URL.revokeObjectURL(url);
      },
      'image/png'
    );
  };

  return (
    <div className="flex flex-col gap-3 bg-[#110820] border border-purple-800/30 rounded-2xl overflow-hidden shadow-xl shadow-purple-950/50 hover:border-purple-600/50 transition-all duration-200 group">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full block"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl" />
      </div>

      <div className="px-4 pb-4 flex flex-col gap-3">
        {(caption.top_text || caption.bottom_text) && (
          <div className="text-xs text-purple-300/60 space-y-1">
            {caption.top_text && (
              <p className="truncate">
                <span className="text-purple-400/60 uppercase tracking-wider text-[10px] mr-1">Top</span>
                {caption.top_text}
              </p>
            )}
            {caption.bottom_text && (
              <p className="truncate">
                <span className="text-purple-400/60 uppercase tracking-wider text-[10px] mr-1">Bot</span>
                {caption.bottom_text}
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-700/40 hover:bg-purple-600/60 border border-purple-600/30 hover:border-purple-500/50 text-purple-200 text-sm font-medium transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download PNG
        </button>
        <button
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/80 to-violet-600/80 hover:from-purple-500 hover:to-violet-500 text-white text-sm font-semibold transition-all shadow-md shadow-purple-900/30"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
          Edit in Canvas
        </button>
      </div>
    </div>
  );
}
