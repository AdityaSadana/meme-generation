'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SharedMeme } from '@/types/meme';

const EMOJIS = ['🤣', '💀', '🔥', '👏', '😭', '🤦', '😅', '✨'];
const VALID_EMOJIS = new Set(EMOJIS);

export default function MemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [meme, setMeme]           = useState<SharedMeme | null>(null);
  const [notFound, setNotFound]   = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [reacting, setReacting]   = useState<string | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'memes', id)).then(snap => {
      if (!snap.exists()) { setNotFound(true); return; }
      const data = snap.data();
      const memeData: SharedMeme = {
        ...data,
        id: snap.id,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : (data.createdAt ?? new Date().toISOString()),
      } as SharedMeme;
      setMeme(memeData);
      setReactions(memeData.reactions ?? {});
    });
  }, [id]);

  const handleReact = async (emoji: string) => {
    if (reacting || !VALID_EMOJIS.has(emoji)) return;
    setReacting(emoji);
    // optimistic update
    setReactions(prev => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
    try {
      await updateDoc(doc(db, 'memes', id), {
        [`reactions.${emoji}`]: increment(1),
      });
    } catch {
      // revert optimistic on error
      setReactions(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] ?? 1) - 1) }));
    } finally {
      setReacting(null);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-5xl">🤔</p>
        <h1 className="text-2xl font-bold text-purple-200">Meme not found</h1>
        <p className="text-purple-400/50 text-sm">This link may have expired or never existed.</p>
        <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm transition-colors">
          ← Back to MemeGen
        </Link>
      </div>
    );
  }

  if (!meme) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const createdAt = new Date(meme.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10">
      {/* Nav */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8 text-xs text-purple-500/50">
        <Link href="/" className="flex items-center gap-1.5 hover:text-purple-400/70 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          MemeGen
        </Link>
        <span className="font-mono text-purple-700/40 hidden sm:block">{id}</span>
      </div>

      <div className="w-full max-w-2xl space-y-5">
        {/* Meme image */}
        <div className="rounded-2xl overflow-hidden border border-purple-800/30 shadow-2xl shadow-purple-950/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meme.imageUrl} alt="Shared meme" className="w-full block" />
        </div>

        {/* Reactions */}
        <div className="bg-[#0f0720] border border-purple-800/30 rounded-2xl p-5 space-y-3">
          <p className="text-xs uppercase tracking-widest text-purple-500/50">React</p>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(emoji => {
              const count = reactions[emoji] ?? 0;
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  disabled={reacting !== null}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all
                    ${count > 0
                      ? 'border-purple-500/50 bg-purple-600/20 text-purple-200'
                      : 'border-purple-800/30 bg-purple-950/20 text-purple-400/60 hover:border-purple-600/40 hover:text-purple-300/80'
                    }
                    ${reacting === emoji ? 'scale-110' : 'hover:scale-105'}
                    disabled:cursor-default`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  {count > 0 && (
                    <span className="text-xs font-semibold tabular-nums">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-end text-xs text-purple-600/40 px-1">
          <span>{createdAt}</span>
        </div>
      </div>
    </div>
  );
}
