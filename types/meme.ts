export type Audience = 'software-engineers' | 'business-professionals';

export type MemeCaption = {
  id: number;
  top_text: string;
  bottom_text: string;
};

export type GenerateResponse = {
  memes: MemeCaption[];
  error?: string;
};

export type AppState = 'idle' | 'ready' | 'generating' | 'results' | 'error' | 'editing';

// Meme document stored in Firestore (and returned to clients)
export interface SharedMeme {
  id: string;
  userId: string;
  imageUrl: string;       // Firebase Storage download URL
  captionTop: string;
  captionBottom: string;
  createdAt: string;      // ISO 8601 string
  reactions: Record<string, number>;
  totalReactions?: number;
}
