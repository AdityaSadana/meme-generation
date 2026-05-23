'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemeCaption } from '@/types/meme';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type TextAlign = 'left' | 'center' | 'right';

interface TextElement {
  id: string;
  text: string;
  x: number;         // canvas pixel — anchor point for the chosen alignment
  y: number;         // canvas pixel — baseline of the first line
  fontSize: number;  // canvas pixels
  color: string;
  strokeColor: string;
  align: TextAlign;
  bold: boolean;
}

interface BBox { left: number; top: number; right: number; bottom: number }

// ─── Pure helpers (no component state) ───────────────────────────────────────

const FILL_COLORS   = ['#ffffff', '#000000', '#ffff00', '#ff4444', '#ff8c00', '#a855f7'];
const STROKE_COLORS = ['#000000', '#ffffff', '#1a0030'];

function applyFont(ctx: CanvasRenderingContext2D, el: TextElement) {
  ctx.font = `${el.bold ? 'bold' : 'normal'} ${el.fontSize}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = el.align;
  ctx.lineJoin   = 'round';
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = word; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function getBBox(ctx: CanvasRenderingContext2D, el: TextElement, canvasWidth: number): BBox {
  applyFont(ctx, el);
  const maxW   = canvasWidth * 0.92;
  const lines  = wrapLines(ctx, el.text.toUpperCase(), maxW);
  const lh     = el.fontSize * 1.15;
  const maxLW  = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
  const w      = Math.min(maxLW, maxW);
  let left: number;
  if      (el.align === 'center') left = el.x - w / 2;
  else if (el.align === 'left')   left = el.x;
  else                            left = el.x - w;
  const top = el.y - el.fontSize;
  return { left: left - 6, top: top - 6, right: left + w + 6, bottom: top + lines.length * lh + 6 };
}

function renderCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  elements: TextElement[],
  selectedId: string | null,
) {
  if (canvas.width !== img.width)   canvas.width  = img.width;
  if (canvas.height !== img.height) canvas.height = img.height;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const maxW = canvas.width * 0.92;

  for (const el of elements) {
    applyFont(ctx, el);
    const lines = wrapLines(ctx, el.text.toUpperCase(), maxW);
    const lh    = el.fontSize * 1.15;

    ctx.lineWidth   = Math.max(3, el.fontSize / 7);
    ctx.strokeStyle = el.strokeColor;
    ctx.fillStyle   = el.color;

    lines.forEach((line, i) => {
      const y = el.y + i * lh;
      ctx.strokeText(line, el.x, y);
      ctx.fillText(line, el.x, y);
    });

    // selection indicator (drawn after text so it's on top)
    if (el.id === selectedId) {
      const box = getBBox(ctx, el, canvas.width);
      ctx.save();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.9)';
      ctx.lineWidth   = Math.max(2, canvas.width / 400);
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
      // corner handles
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
      const hs = Math.max(5, canvas.width / 200);
      for (const [hx, hy] of [
        [box.left, box.top], [box.right, box.top],
        [box.left, box.bottom], [box.right, box.bottom],
      ]) {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      }
      ctx.restore();
    }
  }
}

function getCanvasCoords(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect  = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  imageUrl: string;
  caption: MemeCaption;
  onBack: () => void;
  onMemeShared?: () => void;
  onNeedAuth?: () => void;
}

export default function MemeEditor({ imageUrl, caption, onBack, onMemeShared, onNeedAuth }: Props) {
  const { user } = useAuth();
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [img, setImg]           = useState<HTMLImageElement | null>(null);
  const [elements, setElements] = useState<TextElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>('top');
  const [saved, setSaved]           = useState(false);
  const [shareUrl, setShareUrl]     = useState<string | null>(null);
  const [sharing, setSharing]       = useState(false);
  const [copied, setCopied]         = useState(false);
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null);

  // ── Load image + seed initial text positions ──────────────────────────────
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const fs = Math.round(image.width / 28);
      setElements([
        {
          id: 'top', text: caption.top_text || 'Top text',
          x: image.width / 2, y: image.height * 0.09,
          fontSize: fs, color: '#ffffff', strokeColor: '#000000',
          align: 'center', bold: true,
        },
        {
          id: 'bottom', text: caption.bottom_text || 'Bottom text',
          x: image.width / 2, y: image.height * 0.93,
          fontSize: fs, color: '#ffffff', strokeColor: '#000000',
          align: 'center', bold: true,
        },
      ]);
      setImg(image);
    };
    image.src = imageUrl;
  }, [imageUrl, caption]);

  // ── Render canvas whenever state changes ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img || elements.length === 0) return;
    renderCanvas(canvas, img, elements, selectedId);
  }, [img, elements, selectedId]);

  // ── Hit test ──────────────────────────────────────────────────────────────
  const hitTest = useCallback((cx: number, cy: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d')!;
    // iterate in reverse render order so topmost text wins
    for (const el of [...elements].reverse()) {
      const box = getBBox(ctx, el, canvas.width);
      if (cx >= box.left && cx <= box.right && cy >= box.top && cy <= box.bottom) return el.id;
    }
    return null;
  }, [elements]);

  // ── Mouse ─────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
    const hit = hitTest(x, y);
    setSelectedId(hit);
    setSaved(false);
    setShareUrl(null);
    if (hit) {
      const el = elements.find(el => el.id === hit)!;
      dragging.current = { id: hit, ox: x - el.x, oy: y - el.y };
    } else {
      dragging.current = null;
    }
  }, [elements, hitTest]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    if (dragging.current) {
      const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
      const { id, ox, oy } = dragging.current;
      setElements(prev => prev.map(el => el.id === id ? { ...el, x: x - ox, y: y - oy } : el));
      canvas.style.cursor = 'grabbing';
    } else {
      const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
      canvas.style.cursor = hitTest(x, y) ? 'grab' : 'default';
    }
  }, [hitTest]);

  const onMouseUp = useCallback(() => {
    dragging.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, []);

  // ── Touch ─────────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const t = e.touches[0];
    const { x, y } = getCanvasCoords(canvas, t.clientX, t.clientY);
    const hit = hitTest(x, y);
    setSelectedId(hit);
    if (hit) {
      const el = elements.find(el => el.id === hit)!;
      dragging.current = { id: hit, ox: x - el.x, oy: y - el.y };
    }
  }, [elements, hitTest]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!dragging.current) return;
    const canvas = canvasRef.current!;
    const t = e.touches[0];
    const { x, y } = getCanvasCoords(canvas, t.clientX, t.clientY);
    const { id, ox, oy } = dragging.current;
    setElements(prev => prev.map(el => el.id === id ? { ...el, x: x - ox, y: y - oy } : el));
  }, []);

  // ── Update selected element ───────────────────────────────────────────────
  const update = useCallback((changes: Partial<TextElement>) => {
    if (!selectedId) return;
    setSaved(false);
    setElements(prev => prev.map(el => el.id === selectedId ? { ...el, ...changes } : el));
  }, [selectedId]);

  const selectedEl = elements.find(el => el.id === selectedId) ?? null;

  // ── Save (clears selection so borders disappear) ──────────────────────────
  const handleSave = () => {
    setSelectedId(null);
    setSaved(true);
    setShareUrl(null);
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'memegen.png'; a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !user) return;
    setSharing(true);
    try {
      const memeId = `${user.userId.slice(0, 8)}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
      const topEl = elements.find(e => e.id === 'top');
      const botEl = elements.find(e => e.id === 'bottom');

      // Upload JPEG to Firebase Storage
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.82);
      });
      const storageRef = ref(storage, `memes/${user.userId}/${memeId}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const imageUrl = await getDownloadURL(storageRef);

      // Write meme doc to Firestore (no email field)
      await setDoc(doc(db, 'memes', memeId), {
        id: memeId,
        userId: user.userId,
        imageUrl,
        captionTop: topEl?.text ?? '',
        captionBottom: botEl?.text ?? '',
        createdAt: serverTimestamp(),
        reactions: {},
      });

      setShareUrl(`${window.location.origin}/meme/${memeId}`);
      onMemeShared?.();
    } catch { /* silent — could add an error toast here */ }
    finally { setSharing(false); }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to memes
        </button>
        <span className="text-purple-800/60">|</span>
        <span className="text-purple-400/60 text-xs">Click a text label to select · Drag to reposition</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* ── Canvas ── */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl overflow-hidden border border-purple-800/30 bg-[#0f0720] shadow-xl shadow-purple-950/40">
            <canvas
              ref={canvasRef}
              className="w-full block"
              style={{ touchAction: 'none' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => { dragging.current = null; }}
            />
          </div>
        </div>

        {/* ── Properties panel ── */}
        <div className="w-full lg:w-68 shrink-0 space-y-3">
          {/* Tab selector */}
          <div className="flex gap-2">
            {elements.map(el => (
              <button
                key={el.id}
                onClick={() => setSelectedId(el.id)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all border
                  ${selectedId === el.id
                    ? 'bg-purple-600/30 border-purple-500/50 text-purple-200'
                    : 'bg-purple-950/20 border-purple-800/30 text-purple-400/70 hover:text-purple-400/80'
                  }`}
              >
                {el.id} text
              </button>
            ))}
          </div>

          {selectedEl ? (
            <div className="bg-[#110820] border border-purple-800/30 rounded-2xl p-4 space-y-5">

              {/* Text */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase tracking-widest text-purple-300/60">Text</label>
                <textarea
                  value={selectedEl.text}
                  onChange={e => update({ text: e.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-lg bg-purple-950/30 border border-purple-700/30 px-3 py-2 text-sm text-purple-200 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              {/* Font size */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase tracking-widest text-purple-300/60">Size</label>
                  <span className="text-xs text-purple-400/60 font-mono tabular-nums">{selectedEl.fontSize}px</span>
                </div>
                <input
                  type="range" min={14} max={160} value={selectedEl.fontSize}
                  onChange={e => update({ fontSize: Number(e.target.value) })}
                  className="w-full h-1.5 accent-purple-500 rounded-full"
                />
              </div>

              {/* Fill color */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-widest text-purple-300/60">Fill</label>
                <div className="flex gap-2 flex-wrap">
                  {FILL_COLORS.map(c => (
                    <button
                      key={c} title={c}
                      onClick={() => update({ color: c })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        selectedEl.color === c ? 'border-purple-400 scale-110 shadow-md' : 'border-white/10 hover:border-purple-500/50'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Stroke color */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-widest text-purple-300/60">Outline</label>
                <div className="flex gap-2">
                  {STROKE_COLORS.map(c => (
                    <button
                      key={c} title={c}
                      onClick={() => update({ strokeColor: c })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        selectedEl.strokeColor === c ? 'border-purple-400 scale-110' : 'border-white/10 hover:border-purple-500/50'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Alignment */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-widest text-purple-300/60">Align</label>
                <div className="flex gap-2">
                  {(['left', 'center', 'right'] as TextAlign[]).map(a => (
                    <button
                      key={a}
                      onClick={() => update({ align: a })}
                      title={a}
                      className={`flex-1 py-2 rounded-lg text-xs transition-all border ${
                        selectedEl.align === a
                          ? 'bg-purple-600/30 border-purple-500/50 text-purple-200'
                          : 'bg-purple-950/20 border-purple-800/20 text-purple-400/70 hover:text-purple-400'
                      }`}
                    >
                      {a === 'left' ? (
                        <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 4h16v2H2V4zm0 4h10v2H2V8zm0 4h16v2H2v-2zm0 4h10v2H2v-2z"/>
                        </svg>
                      ) : a === 'center' ? (
                        <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 4h16v2H2V4zm3 4h10v2H5V8zm-3 4h16v2H2v-2zm3 4h10v2H5v-2z"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 4h16v2H2V4zm6 4h10v2H8V8zM2 12h16v2H2v-2zm6 4h10v2H8v-2z"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-widest text-purple-300/60">Weight</label>
                <div className="flex gap-2">
                  {[true, false].map(bold => (
                    <button
                      key={String(bold)}
                      onClick={() => update({ bold })}
                      className={`flex-1 py-2 rounded-lg text-sm transition-all border ${
                        selectedEl.bold === bold
                          ? 'bg-purple-600/30 border-purple-500/50 text-purple-200'
                          : 'bg-purple-950/20 border-purple-800/20 text-purple-400/70 hover:text-purple-400'
                      } ${bold ? 'font-bold' : 'font-normal'}`}
                    >
                      {bold ? 'Bold' : 'Regular'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#110820] border border-dashed border-purple-800/20 rounded-2xl p-6 text-center">
              <p className="text-purple-300/50 text-sm">Click a text on the canvas to edit it</p>
            </div>
          )}

          {/* Save / Download / Share */}
          {saved ? (
            <div className="space-y-2">
              <button
                onClick={download}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download PNG
              </button>

              {/* Share section */}
              {shareUrl ? (
                <div className="rounded-xl border border-purple-600/30 bg-purple-900/20 p-3 space-y-2">
                  <p className="text-xs text-purple-300/70 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Public link created
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 min-w-0 rounded-lg bg-purple-950/40 border border-purple-700/30 px-2.5 py-1.5 text-xs text-purple-300 font-mono truncate focus:outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-purple-700/40 hover:bg-purple-600/50 border border-purple-600/30 text-purple-200 text-xs font-medium transition-colors"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={user ? handleShare : (onNeedAuth ?? (() => {}))}
                  disabled={sharing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-purple-600/40 bg-purple-800/20 hover:bg-purple-700/30 text-purple-300 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sharing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating link…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                      </svg>
                      Get Public Link
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
