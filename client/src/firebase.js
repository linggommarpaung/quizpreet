// client/src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
//import { getFunctions } from 'firebase/functions'; // Impor getFunctions
import { firebaseConfig } from "./config/firebaseConfig";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
//export const functions = getFunctions(app); // Inisialisasi dan ekspor functions

export default app;
