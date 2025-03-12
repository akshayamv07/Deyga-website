// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js"
import { 
    collection, 
    getDocs, getDoc,
    addDoc, 
    deleteDoc,  
    doc,
    query,
    where,
    setDoc,
    updateDoc,
    orderBy,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAEKhrMZU8vn4D4PgnQzxjh1EIyMozEQ6A",
  authDomain: "onlineshopping-13e43.firebaseapp.com",
  projectId: "onlineshopping-13e43",
  storageBucket: "onlineshopping-13e43.firebasestorage.app",
  messagingSenderId: "120366173328",
  appId: "1:120366173328:web:235f72c8be9f5453ec9c15",
  measurementId: "G-TDSC4YK5S8"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export Firebase Modules

export { auth, db, storage, collection, getDocs, addDoc, setDoc, deleteDoc,updateDoc, doc,orderBy,query,where, serverTimestamp,getDoc };
