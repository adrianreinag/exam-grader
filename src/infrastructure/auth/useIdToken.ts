"use client";

import { useState, useEffect } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth';
import { auth } from '../firebase/client';

export function useIdToken() {
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user: User | null) => {
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
      } else {
        setIdToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return idToken;
}