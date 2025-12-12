import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

console.log("🔥 Firebase config carregada");

// Inicializações SEPARADAS com try-catch
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase App inicializado");
  
  // Configuração SIMPLES - sem opções extras
  db = getFirestore(app);
  console.log("✅ Firestore conectado");
  
} catch (error) {
  console.error("❌ ERRO ao inicializar Firebase:", error.message);
  // db fica como null, mas não quebra
  db = null;
}

export { db };
