import { initializeApp, getApps } from 'firebase/app';
import {
  getRedirectResult,
  getAuth,
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
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

const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const missingConfigKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

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

const REDIRECT_PENDING_KEY = 'mol-google-redirect-pending';

function stateDoc(uid: string) {
  return doc(db, 'users', uid, 'reactPrototype', 'main');
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function toSyncUser(user: User | null): SyncUser | null {
  return user ? {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  } : null;
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

export function describeFirebaseAuthError(error: unknown): string {
  const { code, message } = firebaseErrorParts(error);
  if (code === 'auth/operation-not-allowed') {
    return `${code}: Google sign-in is not enabled in Firebase Authentication. Enable Google provider in Firebase Console.`;
  }
  if (code === 'auth/unauthorized-domain') {
    return `${code}: This domain is not authorized in Firebase Authentication. Add the Netlify/local domain to Authorized domains.`;
  }
  if (code === 'auth/popup-blocked') {
    return `${code}: Popup was blocked. The app will try redirect sign-in instead.`;
  }
  if (code === 'auth/popup-closed-by-user') {
    return `${code}: Popup was closed before sign-in completed. The app will try redirect sign-in instead.`;
  }
  if (code === 'auth/cancelled-popup-request') {
    return `${code}: Another popup request interrupted sign-in. Try once more or use redirect.`;
  }
  if (code === 'auth/operation-not-supported-in-this-environment') {
    return `${code}: Popup sign-in is not supported here. The app will use redirect sign-in.`;
  }
  if (code === 'auth/missing-config') {
    return `${code}: Missing Firebase config: ${message}`;
  }
  return `${code}: ${message}`;
}

export function getFirebaseConfigProblem(): string | null {
  if (!missingConfigKeys.length) return null;
  return `Missing Firebase config values: ${missingConfigKeys.join(', ')}`;
}

export function onAuthChanged(callback: (user: SyncUser | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, user => callback(toSyncUser(user)));
}

function markRedirectPending() {
  try {
    sessionStorage.setItem(REDIRECT_PENDING_KEY, '1');
  } catch {
    // Ignore storage failures; Firebase redirect can still proceed.
  }
}

function consumeRedirectPending(): boolean {
  try {
    const wasPending = sessionStorage.getItem(REDIRECT_PENDING_KEY) === '1';
    sessionStorage.removeItem(REDIRECT_PENDING_KEY);
    return wasPending;
  } catch {
    return false;
  }
}

export async function signInWithGoogle(): Promise<'popup' | 'redirect'> {
  const configProblem = getFirebaseConfigProblem();
  if (configProblem) {
    throw { code: 'auth/missing-config', message: configProblem };
  }
  await setPersistence(auth, browserLocalPersistence);
  const provider = googleProvider();
  if (isMobileAuthEnvironment()) {
    markRedirectPending();
    await signInWithRedirect(auth, provider);
    return 'redirect';
  }
  try {
    await signInWithPopup(auth, provider);
    return 'popup';
  } catch (error) {
    const { code } = firebaseErrorParts(error);
    console.error('Google sign-in popup failed:', describeFirebaseAuthError(error), error);
    if (POPUP_FALLBACK_CODES.has(code)) {
      markRedirectPending();
      await signInWithRedirect(auth, googleProvider());
      return 'redirect';
    }
    throw error;
  }
}

export async function handleGoogleRedirectResult(): Promise<SyncUser | null> {
  const hadPendingRedirect = consumeRedirectPending();
  try {
    const result = await getRedirectResult(auth);
    const user = result?.user ?? auth.currentUser;
    console.info('Firebase redirect check complete:', user ? `signed in as ${user.email ?? user.uid}` : 'no redirect user');
    if (!user && hadPendingRedirect) {
      throw {
        code: 'auth/no-redirect-user',
        message: 'Returned from Google sign-in without a Firebase user. Check authorized domains and browser redirect storage.',
      };
    }
    return toSyncUser(user);
  } catch (error) {
    console.error('Google redirect sign-in failed:', describeFirebaseAuthError(error), error);
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
