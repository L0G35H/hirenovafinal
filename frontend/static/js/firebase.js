import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyA4fCEuZuktnlI7YRsJqhPmdoJwQLJbX64",
  authDomain: "airesume-21d81.firebaseapp.com",
  projectId: "airesume-21d81",
  storageBucket: "airesume-21d81.firebasestorage.app",
  messagingSenderId: "156766806572",
  appId: "1:156766806572:web:765634a45931825d0c2789",
  measurementId: "G-5CMHXXFG7Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
export const provider = new GoogleAuthProvider();

export { app, auth, db, analytics };
