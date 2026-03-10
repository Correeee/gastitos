import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsBg7FmpY5JNIhdaSuRbkkaS_7b_jD4tw",
  authDomain: "divisor-de-cuentas-33738.firebaseapp.com",
  projectId: "divisor-de-cuentas-33738",
  storageBucket: "divisor-de-cuentas-33738.firebasestorage.app",
  messagingSenderId: "1015606967563",
  appId: "1:1015606967563:web:c6fe93c557114e15c2b60e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
