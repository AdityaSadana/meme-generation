'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SharedMeme } from '@/types/meme';

const EMOJIS = ['🤣', '💀', '🔥', '👏', '😭', '🤦', '😅', '✨'];

interface Props {
  userId: string;
  refreshKey: number;
}

export default function MyMemes({ userId, refreshKey }: Props) {
  const [memes, setMemes]     = useState<SharedMeme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'memes'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );
    getDocs(q)
      .then(snap => {
        const docs = snap.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            // Convert Firestore Timestamp to ISO string if needed
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : (data.createdAt ?? new Date().toISOString()),
          } as SharedMeme;
        });
        setMemes(docs);
      })
      .finally(() => setLoading(false));
  }, [userId, refreshKey]);

  if (loading || memes.length === 0) return null;

  return (
    <section className="w-full max-w-5xl space-y-4 mt-10">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-700/40 to-transparent" />
        <p className="text-purple-400/70 text-sm font-medium tracking-wide uppercase">My Shared Memes</p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-700/40 to-transparent" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {memes.map(meme => (
          <GalleryCard key={meme.id} meme={meme} />
        ))}
      </div>
    </section>
  );
}

function GalleryCard({ meme }: { meme: SharedMeme }) {
  const activeReactions = EMOJIS.filter(e => (meme.reactions[e] ?? 0) > 0);
  const totalReactions  = Object.values(meme.reactions).reduce((s, n) => s + n, 0);

  return (
    <Link
      href={`/meme/${meme.id}`}
      target="_blank"
      className="group flex flex-col bg-[#110820] border border-purple-800/30 rounded-2xl overflow-hidden hover:border-purple-600/50 transition-all duration-200 shadow-lg shadow-purple-950/40"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-black overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={meme.imageUrl}
          alt="Shared meme"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-lg">
            View
          </span>
        </div>
      </div>

      {/* Reactions */}
      <div className="px-3 py-2.5 space-y-1.5">
        {activeReactions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {activeReactions.map(emoji => (
              <span
                key={emoji}
                className="flex items-center gap-1 bg-purple-900/30 border border-purple-700/20 rounded-lg px-2 py-0.5 text-xs"
              >
                <span>{emoji}</span>
                <span className="text-purple-300/70 tabular-nums font-medium">
                  {meme.reactions[emoji]}
                </span>
              </span>
            ))}
          </div>
        ) : (
        <p className="text-xs text-purple-400/50 italic">No reactions yet</p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-purple-400/50 font-mono truncate">{meme.id}</p>
          {totalReactions > 0 && (
            <p className="text-[10px] text-purple-400/50 shrink-0 ml-1">{totalReactions} total</p>
          )}
        </div>
      </div>
    </Link>
  );
}
