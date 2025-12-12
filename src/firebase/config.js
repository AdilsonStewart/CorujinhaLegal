// /src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// CONFIGURAÇÃO DIRETA - SEM VARIÁVEIS DE AMBIENTE
const firebaseConfig = {
  apiKey: "AIzaSyASmPjNdBFly7ndXk0n-FFbWT-2DQLlevI",
  authDomain: "corujinhalegal2-5c7c9.firebaseapp.com",
  projectId: "corujinhalegal2-5c7c9",
  storageBucket: "corujinhalegal2-5c7c9.firebasestorage.app",
  messagingSenderId: "711736746096",
  appId: "1:711736746096:web:dd3a64784367133dd414b5"
};

// Inicialização SIMPLES
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("🔥 Firebase configurado");
export { db };
