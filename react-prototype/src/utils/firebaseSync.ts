import { initializeApp, getApps } from 'firebase/app';
import {
  getRedirectResult,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { normalizePrototypeState, type PrototypeState } from './storage';

const fallbackConfig = {
  apiKey: 'AIzaSyAF8C4yKsjfq2FYRCDcjqxCckPldW_wcj4',
  authDomain: 'scholarly-engine.firebaseapp.com',
  projectId: 'scholarly-engine',
  storageBucket: 'scholarly-engine.firebasestorage.app',
  messagingSenderId: '83098653152',
  appId: '1:83098653152:web:a8a2ef40c22bf7fbd29b85',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export type SyncUser = Pick<User, 'uid' | 'email' | 'displayName'>;

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
]);

function stateDoc(uid: string) {
  return doc(db, 'users', uid, 'reactPrototype', 'main');
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function firebaseErrorParts(error: unknown): { code: string; message: string } {
  const e = error as { code?: unknown; message?: unknown };
  return {
    code: typeof e?.code === 'string' ? e.code : 'unknown',
    message: typeof e?.message === 'string' ? e.message : String(error),
  };
}

function isMobileAuthEnvironment(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return coarsePointer || mobileUserAgent;
}

export function formatFirebaseAuthError(error: unknown): string {
  const { code, message } = firebaseErrorParts(error);
  return `${code}: ${message}`;
}

export function onAuthChanged(callback: (user: SyncUser | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, user => callback(user ? {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  } : null));
}

export async function signInWithGoogle(): Promise<'popup' | 'redirect'> {
  const provider = googleProvider();
  if (isMobileAuthEnvironment()) {
    await signInWithRedirect(auth, provider);
    return 'redirect';
  }
  try {
    await signInWithPopup(auth, provider);
    return 'popup';
  } catch (error) {
    const { code } = firebaseErrorParts(error);
    console.error('Google sign-in popup failed:', code, error);
    if (POPUP_FALLBACK_CODES.has(code)) {
      await signInWithRedirect(auth, googleProvider());
      return 'redirect';
    }
    throw error;
  }
}

export async function handleGoogleRedirectResult(): Promise<void> {
  try {
    await getRedirectResult(auth);
  } catch (error) {
    console.error('Google redirect sign-in failed:', formatFirebaseAuthError(error), error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function loadCloudState(uid: string): Promise<PrototypeState | null> {
  const snap = await getDoc(stateDoc(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return normalizePrototypeState(data?.state ?? data);
}

export async function saveCloudState(uid: string, state: PrototypeState): Promise<void> {
  await setDoc(stateDoc(uid), {
    state: normalizePrototypeState(state),
    savedAt: state.savedAt,
    savedAtDateKey: state.savedAtDateKey,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
