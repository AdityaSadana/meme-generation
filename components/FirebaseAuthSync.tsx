'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Watches Firebase auth state and syncs it into AuthContext.
// Isolated here so a Firebase error never breaks the modal open/close logic.
export default function FirebaseAuthSync() {
  const { updateUser } = useAuth();

  useEffect(() => {
    return onAuthStateChanged(auth, fbUser => {
      updateUser(fbUser ? { userId: fbUser.uid, email: fbUser.email ?? '' } : null);
    });
  }, [updateUser]);

  return null;
}
