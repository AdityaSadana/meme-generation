'use client';

import { useState, useCallback, useRef } from 'react';
import ImageUploader from '@/components/ImageUploader';
import AudienceSelector from '@/components/AudienceSelector';
import MemeGrid from '@/components/MemeGrid';
import MemeEditor from '@/components/MemeEditor';
import MyMemes from '@/components/MyMemes';
import AuthModal from '@/components/AuthModal';
import { resizeImageToBase64 } from '@/lib/image-utils';
import { generateMemes } from '@/lib/generate-meme';
import { useAuth } from '@/contexts/AuthContext';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { Audience, AppState, GenerateResponse, MemeCaption } from '@/types/meme';

export default function Home() {
  const { user } = useAuth();
  const signOut = () => firebaseSignOut(auth);

  const [authOpen, setAuthOpen] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>('software-engineers');
  const [appState, setAppState] = useState<AppState>('idle');
  const [memes, setMemes] = useState<GenerateResponse['memes']>([]);
  const [error, setError] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [editingCaption, setEditingCaption] = useState<MemeCaption | null>(null);
  const [galleryRefresh, setGalleryRefresh] = useState(0);

  const audienceRef = useRef<HTMLElement>(null);
  const resultsRef  = useRef<HTMLDivElement>(null);

  const handleImageSelected = useCallback((url: string, file: File) => {
    setPreviewUrl(url);
    setImageFile(file);
    setAppState('ready');
    setMemes([]);
    setError(null);
    setTimeout(() => audienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, []);

  const handleGenerate = async () => {
    if (!imageFile || appState === 'generating') return;
    setAppState('generating');
    setError(null);

    try {
      const { base64, mimeType } = await resizeImageToBase64(imageFile, 1024);
      const data = await generateMemes(base64, mimeType, audience, userPrompt);
      setMemes(data.memes);
      setAppState('results');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setAppState('error');
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setImageFile(null);
    setMemes([]);
    setError(null);
    setAppState('idle');
  };

  const handleEditMeme = (caption: MemeCaption) => {
    setEditingCaption(caption);
    setAppState('editing');
  };

  const handleBackFromEditor = () => {
    setEditingCaption(null);
    setAppState('results');
  };

  const canGenerate = appState === 'ready' || appState === 'generating' || appState === 'results' || appState === 'error';

  return (
    <div className="flex flex-col items-center px-4 py-10">
      {/* Auth Modal */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />  
        
      {/* Top nav */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-8 text-xs text-purple-300/50">
        {user ? (
          <span className="truncate max-w-[180px]">{user.email}</span>
        ) : (
          <span />
        )}
        {user ? (
          <button onClick={signOut} className="hover:text-purple-200 transition-colors cursor-pointer">
            Sign out
          </button>
        ) : (
          <button onClick={() => setAuthOpen(true)} className="hover:text-purple-200 transition-colors cursor-pointer">
            Sign in
          </button>
        )}
      </div>

      {/* Header */}
      <header className="text-center mb-10 space-y-3">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-purple-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
            MemeGen
          </span>
        </h1>
        <p className="text-purple-300/60 text-base max-w-sm mx-auto">
          Upload a photo. Pick your crowd. Get 3 memes that actually land.
        </p>
      </header>

      {/* Main card */}
      <main className={`w-full space-y-6 ${appState === 'editing' ? 'max-w-5xl' : 'max-w-xl'}`}>
        {appState === 'editing' && editingCaption ? (
          <MemeEditor
            imageUrl={previewUrl!}
            caption={editingCaption}
            onBack={handleBackFromEditor}
            onMemeShared={() => setGalleryRefresh(k => k + 1)}
            onNeedAuth={() => setAuthOpen(true)}
          />
        ) : (
          <>
            {/* Step 1 — Upload */}
            <section className="space-y-2">
              <StepLabel number={1} label="Upload or snap a photo" active={appState === 'idle'} done={!!previewUrl} />
              <ImageUploader onImageSelected={handleImageSelected} previewUrl={previewUrl} />
            </section>

            {/* Step 2 — Audience */}
            {appState !== 'idle' && (
              <section ref={audienceRef} className="space-y-2 scroll-mt-6">
                <StepLabel number={2} label="Choose your audience" active done />
                <AudienceSelector value={audience} onChange={setAudience} />
              </section>
            )}

            {/* Step 3 — Generate */}
            {canGenerate && (
              <section className="space-y-2">
                <StepLabel number={3} label="Generate memes" active done={appState === 'results'} />
                <div className="relative">
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder='Optional: add context or a theme… e.g. "make it about Monday standups"'
                    rows={2}
                    maxLength={200}
                    className="w-full resize-none rounded-xl border border-purple-800/40 bg-purple-950/20 px-4 py-3 text-sm text-purple-200 placeholder-purple-500/50 focus:outline-none focus:border-purple-500/60 focus:bg-purple-900/20 transition-colors"
                  />
                  {userPrompt.length > 0 && (
                    <span className="absolute bottom-2 right-3 text-[10px] text-purple-400/60">
                      {userPrompt.length}/200
                    </span>
                  )}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={appState === 'generating'}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:from-purple-800 disabled:to-violet-800 disabled:cursor-not-allowed text-white font-semibold text-base transition-all shadow-lg shadow-purple-900/50 hover:shadow-purple-800/60 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {appState === 'generating' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Conjuring memes…
                    </span>
                  ) : appState === 'results' ? (
                    '✨ Regenerate'
                  ) : (
                    '✨ Generate Memes'
                  )}
                </button>
              </section>
            )}

            {/* Error */}
            {appState === 'error' && error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            {/* Results */}
            {appState === 'results' && memes.length > 0 && (
              <div ref={resultsRef} className="scroll-mt-6">
                <MemeGrid imageUrl={previewUrl!} memes={memes} onEditMeme={handleEditMeme} />
              </div>
            )}

            {/* Reset */}
            {appState !== 'idle' && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleReset}
                  className="text-sm text-purple-400/60 hover:text-purple-300 transition-colors"
                >
                  Start over
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-purple-400/40 text-xs">
        Built with AI · Images stay in your browser
      </footer>

      {/* Creator gallery */}
      {user && (
        <MyMemes userId={user.userId} refreshKey={galleryRefresh} />
      )}
    </div>
  );
}

function StepLabel({
  number, label, active, done,
}: {
  number: number; label: string; active: boolean; done: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
        ${done
          ? 'bg-purple-500 text-white'
          : active
            ? 'bg-purple-800/60 text-purple-300 border border-purple-600/60'
            : 'bg-purple-950/40 text-purple-500/60 border border-purple-800/20'
        }`}
      >
        {done ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : number}
      </div>
      <span className={`text-sm font-medium ${done ? 'text-purple-300' : active ? 'text-purple-300/80' : 'text-purple-500/60'}`}>
        {label}
      </span>
    </div>
  );
}
