// Firebase configuration and initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD3qNZAvDAo3LMZgWt6UdsyyuD6bafQEaE',
  authDomain: 'hr-dashboard-247de.firebaseapp.com',
  projectId: 'hr-dashboard-247de',
  storageBucket: 'hr-dashboard-247de.firebasestorage.app',
  messagingSenderId: '946982120267',
  appId: '1:946982120267:web:dce855ded231c1c27896ce',
};

// Prevent re-initialization in hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
