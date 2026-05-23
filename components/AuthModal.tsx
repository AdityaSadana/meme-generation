'use client';

import { useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type AuthError,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type Mode = 'signin' | 'signup';

function firebaseErrorMessage(err: unknown): string {
  const code = (err as AuthError)?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: Props) {
  const [mode, setMode]                       = useState<Mode>('signin');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState<string | null>(null);
  const [submitting, setSubmitting]           = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    onClose();
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: cred.user.email,
          createdAt: serverTimestamp(),
        });
      }
      close();
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-[#0f0720] border border-purple-800/40 rounded-2xl shadow-2xl shadow-purple-950/60">

        {/* Close */}
        <button
          onClick={close}
          className="absolute top-3 right-3 px-5 rounded-lg text-purple-400/60 hover:text-purple-300 hover:bg-purple-800/20 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="pt-6 px-6 pb-2 text-center space-y-1">
          <h2 className="text-xl font-bold">
            <span className="bg-gradient-to-r from-purple-300 to-violet-300 bg-clip-text text-transparent">
              MemeGen
            </span>
          </h2>
          <p className="text-purple-300/50 text-xs">
            {mode === 'signin' ? 'Welcome back.' : 'Create your account.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-800/30 mt-4">
          {(['signin', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-3 text-sm font-medium transition-colors
                ${mode === m
                  ? 'text-purple-200 bg-purple-800/20 border-b-2 border-purple-500'
                  : 'text-purple-400/60 hover:text-purple-300/80'
                }`}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-widest text-purple-300/60">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-purple-800/40 bg-purple-950/30 px-4 py-2.5 text-sm text-purple-200 placeholder-purple-500/40 focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-widest text-purple-300/60">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full rounded-xl border border-purple-800/40 bg-purple-950/30 px-4 py-2.5 text-sm text-purple-200 placeholder-purple-500/40 focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-widest text-purple-300/60">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-xl border border-purple-800/40 bg-purple-950/30 px-4 py-2.5 text-sm text-purple-200 placeholder-purple-500/40 focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400/80 bg-red-950/20 border border-red-800/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:from-purple-800 disabled:to-violet-800 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
              </span>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
