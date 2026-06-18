export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDCLLr_g6MBdQbJvQ-puM8bXbI0L4icF3Q",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "letreview.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "letreview",
  storageBucket: "letreview.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "719794505288",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:719794505288:web:70fd1f9a0d58d1aeb27a7d",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-5V556KZ0HZ",
};
