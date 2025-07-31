import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"; // 🔐 NUEVO

const firebaseConfig = {
  apiKey: "AIzaSyDNcfScAnhfHXIzoc0ks9kQ_1bn8gfGmvY",
  authDomain: "ambitomexreservas.firebaseapp.com",
  projectId: "ambitomexreservas",
  storageBucket: "ambitomexreservas.firebasestorage.app",
  messagingSenderId: "914518869349",
  appId: "1:914518869349:web:1b85ceca2481cb24e84d8c",
  measurementId: "G-X6ZXLY5BB4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // 🔐 NUEVO

export { db, auth }; // 🔐 Exportamos auth