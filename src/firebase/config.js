import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyASmPjNdBFly7ndXk0n-FFbWT-2DQLlevI",
  authDomain: "corujinhalegal2-5c7c9.firebaseapp.com",
  projectId: "corujinhalegal2-5c7c9",
  storageBucket: "corujinhalegal2-5c7c9.appspot.com",
  messagingSenderId: "711736746096",
  appId: "1:711736746096:web:dd3a64784367133dd414b5"
};

// garante que só cria UMA instância do Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
