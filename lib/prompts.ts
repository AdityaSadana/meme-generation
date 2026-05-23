import type { Audience } from '@/types/meme';

const AUDIENCE_CONTEXT: Record<Audience, string> = {
  'software-engineers': `
Target audience: Software Engineers / Developers.
Relatable hooks: pull requests, code reviews, CI/CD pipelines, flaky tests, "it works on my machine",
tech debt, on-call alerts, standup meetings, story point estimation, sprint planning, production incidents,
"just a small change", merge conflicts, rubber duck debugging, Stack Overflow, copy-pasting from AI.
Tone: dry, self-aware, slightly nihilistic — devs laugh at their own pain.`.trim(),

  'business-professionals': `
Target audience: Business Professionals / Corporate workers.
Relatable hooks: all-hands meetings, OKRs, synergy, "let's circle back", "take this offline",
"this could have been an email", Q4 crunch, slide decks, stakeholder management, "quick Zoom call",
KPIs, pivot, bandwidth, "move the needle", performance reviews, corporate jargon overload.
Tone: knowing, slightly cynical — office workers laughing at corporate absurdity.`.trim(),
};

export function buildSystemPrompt(): string {
  return `You are a meme caption generator. Analyze the image provided and create exactly 3 funny,
punchy meme captions. Return ONLY valid JSON — no markdown, no explanation, nothing else.

Required format:
{
  "memes": [
    { "id": 1, "top_text": "...", "bottom_text": "..." },
    { "id": 2, "top_text": "...", "bottom_text": "..." },
    { "id": 3, "top_text": "...", "bottom_text": "..." }
  ]
}

Rules:
- top_text: ≤8 words. Use empty string "" if the joke works better with only bottom text.
- bottom_text: ≤10 words. Must always have content.
- All 3 captions must be distinct — different angles, not variations of the same joke.
- Observe what is literally happening in the photo, then map it to an audience-relatable situation.
- Punchy > clever. Short > long. Specific > generic.`;
}

export function buildUserPrompt(audience: Audience, userHint: string): string {
  const ctx = AUDIENCE_CONTEXT[audience];
  const hint = userHint.trim()
    ? `\n\nAdditional context from the creator: "${userHint.trim()}"`
    : '';
  return `${ctx}${hint}\n\nGenerate 3 meme captions for the image above.`;
}
