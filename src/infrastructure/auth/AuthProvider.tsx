"use client";

import { useState, useEffect, createContext, useContext, ReactNode, FC } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/client';
import { useSearchParams } from 'next/navigation';
import { FAKE_USER } from '../demo/demo-data';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const params = useSearchParams();
  const isDemoMode = params.get('demo') === 'true';

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setUser(FAKE_USER as User);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);
  
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);