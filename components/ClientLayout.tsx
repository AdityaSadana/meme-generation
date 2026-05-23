'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import FirebaseAuthSync from '@/components/FirebaseAuthSync';
import { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FirebaseAuthSync />
      {children}
    </AuthProvider>
  );
}
