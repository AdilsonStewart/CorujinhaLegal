// Inicialização do Firebase (CorujinhaLegal2)
// Copie este arquivo para src/firebase.js (substitui o antigo) e commit.

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuração fornecida (CorujinhaLegal2)
const firebaseConfig = {
  apiKey: "AIzaSyASmPjNdBFly7ndXk0n-FFbWT-2DQLlevI",
  authDomain: "corujinhalegal2-5c7c9.firebaseapp.com",
  projectId: "corujinhalegal2-5c7c9",
  storageBucket: "corujinhalegal2-5c7c9.firebasestorage.app",
  messagingSenderId: "711736746096",
  appId: "1:711736746096:web:dd3a64784367133dd414b5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
