import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

function getFirebaseApp(): FirebaseApp | undefined {
  if (typeof window === "undefined") return undefined;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return undefined;

  if (!app && getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else if (!app) {
    app = getApps()[0];
  }
  return app;
}

export function getFirebaseAuth(): Auth | undefined {
  if (typeof window === "undefined") return undefined;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return undefined;

  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  return auth;
}

/**
 * Set up invisible reCAPTCHA verifier for phone auth.
 * Must be called before signInWithPhoneNumber.
 * The container element must exist in the DOM.
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier | undefined {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) return undefined;

  return new RecaptchaVerifier(firebaseAuth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved — will proceed with phone auth
    },
  });
}

/**
 * Send OTP to phone number via Firebase.
 * Returns a ConfirmationResult to verify the code later.
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new Error("Firebase not initialized");

  return signInWithPhoneNumber(firebaseAuth, phoneNumber, recaptchaVerifier);
}

/**
 * Verify the OTP code and get the Firebase ID token.
 * The ID token is sent to our backend for session creation.
 */
export async function verifyPhoneOtp(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<string> {
  const userCredential = await confirmationResult.confirm(code);
  const idToken = await userCredential.user.getIdToken();
  return idToken;
}
