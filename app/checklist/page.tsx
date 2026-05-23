import Link from 'next/link';

type Status = 'done' | 'mock' | 'pending';

interface ApiEntry {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  status: Status;
  notes?: string;
}

interface Group {
  title: string;
  icon: string;
  entries: ApiEntry[];
}

const groups: Group[] = [
  {
    title: 'Authentication',
    icon: '🔐',
    entries: [
      { method: 'POST', path: '/api/auth', description: 'Sign in or sign up — returns userId + email', status: 'mock', notes: 'Accepts any credentials, returns crypto.randomUUID(). Replace with real DB + bcrypt.' },
      { method: 'POST', path: '/api/auth/signout', description: 'Invalidate session / clear token', status: 'pending', notes: 'Needed once real sessions/JWTs are introduced.' },
      { method: 'GET',  path: '/api/auth/me', description: 'Return current user from session token', status: 'pending', notes: 'Requires JWT or cookie-based session middleware.' },
    ],
  },
  {
    title: 'Meme Generation',
    icon: '🎭',
    entries: [
      { method: 'POST', path: '/api/generate', description: 'Analyze image via Claude Vision, return 3 caption sets', status: 'mock', notes: 'Returns hardcoded captions. Wire to claude-haiku-4-5-20251001 with image base64 + audience prompt.' },
    ],
  },
  {
    title: 'Saved Memes',
    icon: '💾',
    entries: [
      { method: 'POST',   path: '/api/memes',      description: 'Save a finished meme (image + captions) to user account', status: 'pending', notes: 'Store image in S3/R2, metadata in DB.' },
      { method: 'GET',    path: '/api/memes',      description: 'List all memes saved by the current user', status: 'pending' },
      { method: 'DELETE', path: '/api/memes/[id]', description: 'Delete a saved meme by ID', status: 'pending' },
    ],
  },
  {
    title: 'User Profile',
    icon: '👤',
    entries: [
      { method: 'GET', path: '/api/user', description: 'Get current user profile (display name, avatar, stats)', status: 'pending' },
      { method: 'PUT', path: '/api/user', description: 'Update display name or preferences', status: 'pending' },
    ],
  },
  {
    title: 'Infrastructure',
    icon: '⚙️',
    entries: [
      { method: 'GET', path: '—', description: 'Rate limiting middleware (per IP or per user)', status: 'pending', notes: 'Protect /api/generate from abuse. Use Upstash Redis or Vercel Edge Config.' },
      { method: 'GET', path: '—', description: 'Database setup (users, memes tables)', status: 'pending', notes: 'Recommended: Supabase (Postgres) or PlanetScale (MySQL).' },
      { method: 'GET', path: '—', description: 'Image storage for saved memes', status: 'pending', notes: 'Cloudflare R2 or AWS S3 with presigned URLs.' },
      { method: 'GET', path: '—', description: 'JWT / cookie session management', status: 'pending', notes: 'Replace localStorage mock with httpOnly cookie + server-validated JWT.' },
    ],
  },
];

const STATUS_STYLES: Record<Status, { bg: string; text: string; dot: string; label: string }> = {
  done:    { bg: 'bg-emerald-950/30', text: 'text-emerald-400',  dot: 'bg-emerald-400',  label: 'Done'    },
  mock:    { bg: 'bg-amber-950/30',   text: 'text-amber-400',    dot: 'bg-amber-400',    label: 'Mock'    },
  pending: { bg: 'bg-purple-950/20',  text: 'text-purple-500/60', dot: 'bg-purple-600/50', label: 'Pending' },
};

const METHOD_COLORS: Record<ApiEntry['method'], string> = {
  GET:    'text-sky-400    bg-sky-950/40   border-sky-800/40',
  POST:   'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  PUT:    'text-amber-400  bg-amber-950/40 border-amber-800/40',
  PATCH:  'text-orange-400 bg-orange-950/40 border-orange-800/40',
  DELETE: 'text-red-400    bg-red-950/40   border-red-800/40',
};

export default function ChecklistPage() {
  const total   = groups.flatMap(g => g.entries).length;
  const done    = groups.flatMap(g => g.entries).filter(e => e.status === 'done').length;
  const mocked  = groups.flatMap(g => g.entries).filter(e => e.status === 'mock').length;
  const pending = groups.flatMap(g => g.entries).filter(e => e.status === 'pending').length;

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-1.5 text-purple-400/60 hover:text-purple-300 text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to MemeGen
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-purple-200">API Checklist</h1>
          <p className="text-purple-400/50 text-sm">All backend endpoints needed to ship MemeGen to production.</p>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total',   value: total,   color: 'bg-purple-800/30 text-purple-300  border-purple-700/40' },
            { label: 'Done',    value: done,    color: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40' },
            { label: 'Mock',    value: mocked,  color: 'bg-amber-900/30  text-amber-400   border-amber-800/40' },
            { label: 'Pending', value: pending, color: 'bg-purple-950/30 text-purple-500/70 border-purple-800/30' },
          ].map(p => (
            <div key={p.label} className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium ${p.color}`}>
              <span className="font-bold tabular-nums">{p.value}</span>
              <span className="opacity-70">{p.label}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-purple-500/50">
          {(Object.entries(STATUS_STYLES) as [Status, typeof STATUS_STYLES[Status]][]).map(([s, style]) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              {style.label}
            </span>
          ))}
        </div>

        {/* Groups */}
        {groups.map(group => (
          <section key={group.title} className="space-y-3">
            <h2 className="text-sm font-semibold text-purple-300/80 flex items-center gap-2 uppercase tracking-widest">
              <span>{group.icon}</span>
              {group.title}
            </h2>
            <div className="space-y-2">
              {group.entries.map((entry, i) => {
                const s = STATUS_STYLES[entry.status];
                const m = METHOD_COLORS[entry.method];
                return (
                  <div
                    key={i}
                    className={`flex flex-col sm:flex-row sm:items-start gap-3 rounded-xl border border-purple-800/20 bg-[#0f0720] px-4 py-3.5 ${s.bg}`}
                  >
                    {/* Method badge */}
                    <span className={`shrink-0 self-start text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border font-mono ${m}`}>
                      {entry.method}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start gap-2 justify-between">
                        <code className="text-sm text-purple-200 font-mono">{entry.path}</code>
                        {/* Status */}
                        <span className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${s.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                      <p className="text-sm text-purple-400/60">{entry.description}</p>
                      {entry.notes && (
                        <p className="text-xs text-purple-600/50 italic">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <footer className="text-center text-purple-700/30 text-xs pt-4 pb-8">
          Last updated manually — keep this in sync as you ship each endpoint.
        </footer>
      </div>
    </div>
  );
}
