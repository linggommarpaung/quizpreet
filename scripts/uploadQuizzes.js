// scripts/uploadQuizzes.js

// IMPORTANT: To run this script, you need to be in the project root directory
// and execute: node scripts/uploadQuizzes.js
// Make sure you have Node.js installed.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env dari client/.env
const envPath = path.resolve(__dirname, '../client/.env');
if (fs.existsSync(envPath)) {
  const envFileContent = fs.readFileSync(envPath, 'utf8');
  envFileContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const firstEqual = trimmed.indexOf('=');
      if (firstEqual !== -1) {
        const key = trimmed.substring(0, firstEqual).trim();
        const value = trimmed.substring(firstEqual + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    }
  });
}

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

// Konfigurasi Firebase diambil dari variabel lingkungan
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const uploadQuizzes = async () => {
  console.log('Starting quiz upload...');

  // Dynamically import the ES Module
  const { quizData } = await import('../client/src/data/quizData.js');

  const quizzesCollectionRef = collection(db, 'quizzes');

  // Using a `for...of` loop to handle async operations correctly
  for (const quizId of Object.keys(quizData)) {
    const quiz = quizData[quizId];
    const quizDocRef = doc(quizzesCollectionRef, quizId);

    try {
      await setDoc(quizDocRef, {
        title: quiz.title,
        questions: quiz.questions,
      });
      console.log(`✅ Successfully uploaded quiz with ID: ${quizId}`);
    } catch (error) {
      console.error(`❌ Error uploading quiz ${quizId}:`, error);
    }
  }

  console.log('\n🎉 All quizzes have been processed.');
  // The script will hang, you need to manually exit with Ctrl+C.
  // This is because the Firestore connection remains open.
  // For a more robust solution, we would use Firebase Admin SDK which allows closing the connection.
  process.exit(0);
};

uploadQuizzes();
