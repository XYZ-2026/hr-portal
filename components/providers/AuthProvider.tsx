'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  AuthError,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Department } from '@/types';

// Only this admin email is allowed as administrator
const ALLOWED_ADMIN_EMAIL = 'admin@collegesimplified.in';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    department: Department,
    role: string
  ) => Promise<void>;
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
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message = getAuthErrorMessage(err as AuthError);
      setError(message);
      throw err;
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    department: Department,
    role: string
  ) => {
    setError(null);
    try {
      // 1. Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Set display name in auth profile
      await updateProfile(firebaseUser, { displayName: name });

      // 3. Match with pre-existing employee onboarded by admin (using email check)
      const empCollection = collection(db, 'employees');
      const q = query(empCollection, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      let existingEmp: any = null;
      let existingDocId: string | null = null;

      querySnapshot.forEach((doc) => {
        existingEmp = doc.data();
        existingDocId = doc.id;
      });

      if (existingEmp && existingDocId) {
        // Link existing profile: copy it to a doc named firebaseUser.uid and delete the old one
        const newDocRef = doc(db, 'employees', firebaseUser.uid);
        await setDoc(newDocRef, {
          ...existingEmp,
          id: firebaseUser.uid, // update ID to match user's UID
          name: name || existingEmp.name, // prefer entered name during signup
          role: role || existingEmp.role,
          department: department || existingEmp.department,
          status: 'Active',
        });

        // If the old document has a different ID, delete the old document
        if (existingDocId !== firebaseUser.uid) {
          await deleteDoc(doc(db, 'employees', existingDocId));
        }
      } else {
        // Create a completely new employee profile in Firestore
        const empId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
        const docRef = doc(db, 'employees', firebaseUser.uid);
        await setDoc(docRef, {
          id: firebaseUser.uid,
          employeeId: empId,
          name,
          email: email.toLowerCase(),
          role,
          department,
          salary: 0,
          joiningDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          status: 'Active',
        });
      }

      setUser(firebaseUser);
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
  const isEmployee = user ? user.email !== ALLOWED_ADMIN_EMAIL : false;

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAdmin, isEmployee, login, signup, logout, error, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}
