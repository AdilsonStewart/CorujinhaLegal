// src/firebase.js
// Inicializa o Firebase apenas uma vez (evita erro app/duplicate-app)

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC1Xv2mPNf4s2oY-Jeh2ev3x0O6qkKNqt4",
  authDomain: "deixacomigo-727ff.firebaseapp.com",
  projectId: "deixacomigo-727ff",
  storageBucket: "deixacomigo-727ff.firebasestorage.app",
  messagingSenderId: "304342645043",
  appId: "1:304342645043:web:893af23b41547a29a1a646"
};

// Se já existir app inicializado, usa ele; senão inicializa
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);

export { db };
