import Link from 'next/link';
import Leaderboard from '@/components/Leaderboard';

const AUDIENCES = [
  {
    emoji: '👩‍💻',
    title: 'Software Engineers',
    examples: ['"It works on my machine"', '"Just a small change"', '"LGTM"'],
  },
  {
    emoji: '💼',
    title: 'Business Professionals',
    examples: ['"Let\'s circle back"', '"Move the needle"', '"Take this offline"'],
  },
];

const STEPS = [
  { number: '01', title: 'Upload a photo', desc: 'Drop any image — a selfie, screenshot, or anything from your camera roll.' },
  { number: '02', title: 'Pick your crowd', desc: 'Choose Software Engineers or Business Professionals to tune the humor.' },
  { number: '03', title: 'Get 6 memes', desc: 'AI reads your image and writes captions that actually land with your audience.' },
  { number: '04', title: 'Edit & share', desc: 'Tweak text, reposition it on the canvas, download as PNG, or get a public link.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* Nav */}
      <nav className="w-full max-w-5xl mx-auto flex items-center justify-between px-6 py-5">
        <span className="text-lg font-bold bg-gradient-to-r from-purple-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
          MemeGen
        </span>
        <Link
          href="/generate"
          className="px-4 py-2 rounded-xl bg-purple-700/40 hover:bg-purple-600/50 border border-purple-500/50 hover:border-purple-400/70 text-purple-100 text-sm font-medium transition-all"
        >
          Open App
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-16 pb-24">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-700/30 text-xs text-purple-300/90">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Powered by AI Vision
        </div>

        <h1 className="text-6xl sm:text-7xl font-bold tracking-tight leading-[1.05] max-w-2xl">
          <span className="bg-gradient-to-br from-purple-200 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
            Memes that
          </span>
          <br />
          <span className="text-white/90">actually land.</span>
        </h1>

        <p className="mt-6 text-purple-200/80 text-lg max-w-md leading-relaxed">
          Upload a photo, pick your audience, and get six ready-to-share memes — tailored to the jokes your crowd actually gets.
        </p>

        <div className="mt-10 flex items-center gap-4 flex-wrap justify-center">
          <Link
            href="/generate"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold text-base transition-all shadow-lg shadow-purple-900/50 hover:shadow-purple-800/60 hover:-translate-y-0.5 active:translate-y-0"
          >
            Generate Memes →
          </Link>
          <span className="text-purple-300/60 text-sm">Free · No sign-up needed</span>
        </div>

        {/* Floating caption examples */}
        <div className="mt-16 flex flex-wrap justify-center gap-3 max-w-lg">
          {[
            'It works on my machine',
            'This could have been an email',
            'Just a small change',
            "Let's circle back",
            'LGTM',
            'Move the needle',
          ].map(text => (
            <span
              key={text}
              className="px-3 py-1.5 rounded-lg bg-purple-950/50 border border-purple-700/40 text-purple-300/80 text-xs font-mono"
            >
              &ldquo;{text}&rdquo;
            </span>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="w-full max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-purple-700/30 to-transparent" />
      </div>

      {/* How it works */}
      <section className="w-full max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-center text-2xl font-bold text-purple-100 mb-12">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map(step => (
            <div key={step.number} className="bg-[#110820] border border-purple-800/20 rounded-2xl p-5 space-y-3">
              <span className="text-3xl font-bold text-purple-600/80 font-mono">{step.number}</span>
              <h3 className="text-purple-100 font-semibold text-sm">{step.title}</h3>
              <p className="text-purple-300/80 text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Audience section */}
      <section className="w-full max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-center text-2xl font-bold text-purple-100 mb-12">Built for your audience</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {AUDIENCES.map(a => (
            <div key={a.title} className="bg-[#110820] border border-purple-800/20 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{a.emoji}</span>
                <h3 className="text-purple-100 font-semibold">{a.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {a.examples.map(ex => (
                  <span key={ex} className="px-2.5 py-1 rounded-lg bg-purple-900/30 border border-purple-700/30 text-purple-200/80 text-xs font-mono">
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <Leaderboard />

      {/* CTA */}
      <section className="w-full max-w-5xl mx-auto px-6 pb-24 text-center">
        <div className="bg-gradient-to-br from-purple-950/60 to-violet-950/40 border border-purple-700/20 rounded-3xl px-8 py-14 space-y-6">
          <h2 className="text-3xl font-bold text-white/90">Ready to meme?</h2>
          <p className="text-purple-200/80 text-base max-w-sm mx-auto">
            Your image never leaves your browser. Captions are generated by AI and rendered locally.
          </p>
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold text-base transition-all shadow-lg shadow-purple-900/50 hover:-translate-y-0.5 active:translate-y-0"
          >
            ✨ Generate Memes
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-purple-400/60 text-xs pb-8">
        Images stay in your browser
      </footer>
    </div>
  );
}
