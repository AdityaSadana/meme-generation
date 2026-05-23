'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SharedMeme } from '@/types/meme';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [memes, setMemes] = useState<SharedMeme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const toMeme = (d: { id: string; data: () => Record<string, unknown> }): SharedMeme => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : (data.createdAt ?? new Date().toISOString()),
      } as SharedMeme;
    };

    // First try ordering by totalReactions (requires the field to exist on docs)
    const qSorted = query(
      collection(db, 'memes'),
      orderBy('totalReactions', 'desc'),
      limit(9),
    );

    const runFallback = () =>
      getDocs(query(collection(db, 'memes'), orderBy('createdAt', 'desc'), limit(50)))
        .then(fallbackSnap => {
          const all = fallbackSnap.docs.map(toMeme);
          const sorted = all
            .map(m => ({
              ...m,
              totalReactions: m.totalReactions ?? Object.values(m.reactions ?? {}).reduce((s, n) => s + n, 0),
            }))
            .sort((a, b) => (b.totalReactions ?? 0) - (a.totalReactions ?? 0))
            .slice(0, 9);
          setMemes(sorted);
        });

    getDocs(qSorted)
      .then(snap => {
        if (!snap.empty) {
          setMemes(snap.docs.map(toMeme));
          return;
        }
        // No docs have totalReactions yet — fall back to client-side sort
        return runFallback();
      })
      .catch(() => runFallback()) // index missing or query error → fallback
      .finally(() => setLoading(false));
  }, []);

  if (loading || memes.length === 0) return null;

  const top3 = memes.slice(0, 3);
  const rest = memes.slice(3);

  return (
    <section className="w-full max-w-5xl mx-auto px-6 pb-24">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-10">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-700/30 to-transparent" />
        <h2 className="text-2xl font-bold text-purple-200/80 whitespace-nowrap">🏆 Leaderboard</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-700/30 to-transparent" />
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {top3.map((meme, i) => {
          const total = meme.totalReactions ?? Object.values(meme.reactions).reduce((s, n) => s + n, 0);
          const topEmojis = Object.entries(meme.reactions)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

          return (
            <Link
              key={meme.id}
              href={`/meme/${meme.id}`}
              target="_blank"
              className={`group relative flex flex-col bg-[#110820] rounded-2xl overflow-hidden border transition-all duration-200 shadow-xl
                ${i === 0
                  ? 'border-yellow-500/40 shadow-yellow-900/20 hover:border-yellow-400/60'
                  : i === 1
                  ? 'border-slate-400/30 shadow-slate-900/20 hover:border-slate-300/50'
                  : 'border-orange-700/30 shadow-orange-900/20 hover:border-orange-600/50'
                }`}
            >
              {/* Rank badge */}
              <div className="absolute top-2 left-2 z-10 text-xl leading-none">{MEDAL[i]}</div>

              {/* Thumbnail */}
              <div className="relative aspect-video bg-black overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meme.imageUrl}
                  alt="Meme"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>

              {/* Stats */}
              <div className="px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {topEmojis.map(([emoji, count]) => (
                      <span key={emoji} className="flex items-center gap-0.5 text-xs text-purple-300/70">
                        <span>{emoji}</span>
                        <span className="tabular-nums font-medium">{count}</span>
                      </span>
                    ))}
                  </div>
                  <span className={`text-xs font-bold tabular-nums
                    ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : 'text-orange-400'}`}>
                    {total} total
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Ranks 4–9 */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {rest.map((meme, i) => {
            const total = meme.totalReactions ?? Object.values(meme.reactions).reduce((s, n) => s + n, 0);
            return (
              <Link
                key={meme.id}
                href={`/meme/${meme.id}`}
                target="_blank"
                className="group relative flex flex-col bg-[#110820] border border-purple-800/20 rounded-xl overflow-hidden hover:border-purple-600/40 transition-all duration-200"
              >
                <div className="absolute top-1.5 left-1.5 z-10 bg-black/60 text-purple-300/70 text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono">
                  #{i + 4}
                </div>
                <div className="aspect-video bg-black overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meme.imageUrl}
                    alt="Meme"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-purple-400/50 truncate font-mono">{meme.id.slice(0, 8)}</span>
                  <span className="text-[10px] text-purple-300/60 font-semibold tabular-nums shrink-0 ml-1">{total} ✨</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
