'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

export function initializeFirebase() {
  if (!getApps().length) {
    // Firebase App Hosting provides FIREBASE_WEBAPP_CONFIG at build time which gets
    // inlined into the client bundle. The Firebase JS SDK's initializeApp() reads it
    // automatically. However, since our apphosting.yaml explicitly defines the config
    // values as NEXT_PUBLIC_* env vars that populate firebaseConfig, we use the explicit
    // config to ensure consistent behavior across environments.
    let firebaseApp: FirebaseApp;
    try {
      // Try auto-init first (uses FIREBASE_WEBAPP_CONFIG from App Hosting)
      firebaseApp = initializeApp();
    } catch (e) {
      // Fall back to explicit config (works in all environments)
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
