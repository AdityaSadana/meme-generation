import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompts';
import type { Audience, GenerateResponse } from '@/types/meme';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.1-pro-preview';

export async function generateMemes(
  imageBase64: string,
  mimeType: string,
  audience: Audience,
  userPrompt = '',
): Promise<GenerateResponse> {
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('NEXT_PUBLIC_OPENROUTER_API_KEY is not set.');

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://memegen.web.app',
      'X-Title': 'MemeGen',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: buildUserPrompt(audience, userPrompt) },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('OpenRouter error:', err);
    throw new Error('AI generation failed. Please try again.');
  }

  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? '';

  try {
    const parsed: GenerateResponse = JSON.parse(raw);
    if (!Array.isArray(parsed.memes) || parsed.memes.length === 0) throw new Error();
    return parsed;
  } catch {
    // Fallback captions so the UI never breaks
    return {
      memes: [
        { id: 1, top_text: 'When the AI sees your photo', bottom_text: 'But forgets to be funny' },
        { id: 2, top_text: '', bottom_text: 'Try again — blame the algorithm' },
        { id: 3, top_text: 'Parsing error moment', bottom_text: 'Classic' },
      ],
    };
  }
}
