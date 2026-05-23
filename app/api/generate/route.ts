import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompts';
import type { Audience, GenerateResponse } from '@/types/meme';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.1-pro-preview';

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return Response.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
  }

  let body: { imageBase64: string; mimeType: string; audience: Audience; userPrompt?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { imageBase64, mimeType, audience, userPrompt = '' } = body;
  if (!imageBase64 || !audience) {
    return Response.json({ error: 'imageBase64 and audience are required.' }, { status: 400 });
  }

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const openrouterRes = await fetch(OPENROUTER_URL, {
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
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
            {
              type: 'text',
              text: buildUserPrompt(audience, userPrompt),
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    }),
  });

  console.log(openrouterRes)

  if (!openrouterRes.ok) {
    const err = await openrouterRes.text();
    console.error('OpenRouter error:', err);
    return Response.json({ error: 'AI generation failed. Please try again.' }, { status: 502 });
  }

  const aiData = await openrouterRes.json();
  const raw = aiData.choices?.[0]?.message?.content ?? '';

  let parsed: GenerateResponse;
  try {
    parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.memes) || parsed.memes.length === 0) throw new Error();
  } catch {
    // Fallback: return generic captions so the user isn't stuck
    parsed = {
      memes: [
        { id: 1, top_text: 'When the AI sees your photo', bottom_text: 'But forgets to be funny' },
        { id: 2, top_text: '', bottom_text: 'Try again — blame the algorithm' },
        { id: 3, top_text: 'Parsing error moment', bottom_text: 'Classic' },
      ],
    };
  }

  return Response.json(parsed);
}
