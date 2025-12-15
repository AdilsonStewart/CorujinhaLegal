import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Config do CorujinhaLegal2
const firebaseConfig = {
  apiKey: "AIzaSyASmPjNdBFly7ndXk0n-FFbWT-2DQLlevI",
  authDomain: "corujinhalegal2-5c7c9.firebaseapp.com",
  projectId: "corujinhalegal2-5c7c9",
  storageBucket: "corujinhalegal2-5c7c9.firebasestorage.app",
  messagingSenderId: "711736746096",
  appId: "1:711736746096:web:dd3a64784367133dd414b5"
};

// Inicializa apenas se não houver apps já inicializados
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db, app };
