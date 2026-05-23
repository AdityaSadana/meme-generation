import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import ClientLayout from '@/components/ClientLayout';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'MemeGen — AI Meme Generator',
  description: 'Upload a photo and get 3 hilarious memes tailored for Software Engineers or Business Professionals.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
