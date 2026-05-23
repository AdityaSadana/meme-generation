import type { Audience, GenerateResponse } from '@/types/meme';

const SE_MEMES: GenerateResponse['memes'] = [
  {
    id: 1,
    top_text: "When the PR passes CI on the first try",
    bottom_text: "Must be someone else's code",
  },
  {
    id: 2,
    top_text: "Me: just a quick fix",
    bottom_text: "3 days and 47 changed files later",
  },
  {
    id: 3,
    top_text: "Works on my machine",
    bottom_text: "Ship it inside a Docker container",
  },
];

const BIZ_MEMES: GenerateResponse['memes'] = [
  {
    id: 1,
    top_text: "This meeting could have been an email",
    bottom_text: "But here we are, hour two",
  },
  {
    id: 2,
    top_text: "Q4 targets looking great!",
    bottom_text: "*frantically updates the pivot table*",
  },
  {
    id: 3,
    top_text: "Let's circle back on that",
    bottom_text: "Translation: I have absolutely no idea",
  },
];

export function getMockMemes(audience: Audience): GenerateResponse {
  return {
    memes: audience === 'software-engineers' ? SE_MEMES : BIZ_MEMES,
  };
}
