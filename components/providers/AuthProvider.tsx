'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  AuthError,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Only this admin email is allowed
const ALLOWED_ADMIN_EMAIL = 'admin@collegesimplified.in';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function getAuthErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Only allow the admin user
      if (firebaseUser && firebaseUser.email === ALLOWED_ADMIN_EMAIL) {
        setUser(firebaseUser);
      } else if (firebaseUser) {
        // Not the allowed admin — sign them out immediately
        signOut(auth);
        setUser(null);
        setError('Access denied. You are not authorized to use this portal.');
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);

    if (email.toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
      setError('Access denied. Only the authorized admin can sign in.');
      throw new Error('Unauthorized email');
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message = getAuthErrorMessage(err as AuthError);
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    await signOut(auth);
  };

  const clearError = () => setError(null);

  const isAdmin = user?.email === ALLOWED_ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, login, logout, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}
