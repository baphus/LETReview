
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  "projectId": "myreviewer-dumqm",
  "appId": "1:771340678457:web:d6bf6829866b489c7ea4e8",
  "storageBucket": "myreviewer-dumqm.firebasestorage.app",
  "apiKey": "AIzaSyDvSVoizJ3Oeq7u_RG4UzwORhQNa-gIwTk",
  "authDomain": "myreviewer-dumqm.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "771340678457"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);

export { app, auth };
