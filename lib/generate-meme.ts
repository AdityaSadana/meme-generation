import type { Audience, GenerateResponse } from '@/types/meme';

export async function generateMemes(
  imageBase64: string,
  mimeType: string,
  audience: Audience,
  userPrompt = '',
): Promise<GenerateResponse> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType, audience, userPrompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'AI generation failed. Please try again.');
  }

  return res.json();
}
