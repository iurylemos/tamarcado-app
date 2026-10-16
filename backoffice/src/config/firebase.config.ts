import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { FirebaseUtil } from '../utils/firebase.util';

const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';

const projectId =
  import.meta.env.VITE_FIREBASE_PROJECT_ID ||
  (import.meta.env.DEV ? FirebaseUtil.defaultProjectIdEmulator : undefined);

if (!projectId) {
  throw new Error('Set VITE_FIREBASE_PROJECT_ID before building this frontend for production.');
}

if (import.meta.env.PROD && projectId.startsWith('demo-')) {
  throw new Error('Production frontend builds cannot target an emulator Firebase project.');
}

if (!useEmulators && !import.meta.env.VITE_FIREBASE_API_KEY) {
  throw new Error(
    'Configure Firebase credentials or set VITE_USE_EMULATORS=true for local development.',
  );
}

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FirebaseUtil.defaultKeyEmulator,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || FirebaseUtil.defaultIdEmulator,
    });

export const auth = getAuth(app);
export const db = getFirestore(app, FirebaseUtil.defaultFirestore);
export const functions = getFunctions(app, FirebaseUtil.region);
export const storage = getStorage(app);

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}
