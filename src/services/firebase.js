import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBi63NsMa55eOkPamaS7wlT6C9hWQKHSps',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'precificaai-vivi-9b5f6.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'precificaai-vivi-9b5f6',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'precificaai-vivi-9b5f6.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '139370645736',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:139370645736:web:1c32b62fe712470e4b615d',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
