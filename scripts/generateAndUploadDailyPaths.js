
// scripts/generateAndUploadDailyPaths.js
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

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, writeBatch, Timestamp } from "firebase/firestore";

// Konfigurasi Firebase diambil dari variabel lingkungan
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase App Initialized for data migration.");

// ===============================================================
// FUNGSI HELPER & UTAMA
// ===============================================================

/**
 * Menghasilkan ID unik berbasis waktu dan angka acak.
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Fungsi utama untuk memigrasikan dan memperbarui data jalur harian yang ada.
 * TIDAK MENGHAPUS DATA YANG ADA.
 */
async function migrateAndUpdateData() {
  console.log(`Memulai proses migrasi data (mode aman)...`);

  const pathsCollectionRef = collection(db, "dailyPaths");
  const querySnapshot = await getDocs(pathsCollectionRef);
  
  if (querySnapshot.empty) {
      console.log("Tidak ada dokumen di 'dailyPaths' untuk dimigrasikan.");
      return;
  }

  const batch = writeBatch(db);
  let documentsMigrated = 0;

  console.log(`Ditemukan ${querySnapshot.size} dokumen tema untuk diperiksa.`);

  for (const document of querySnapshot.docs) {
    const docData = document.data();
    let needsUpdate = false;

    // Cek apakah data sudah memiliki struktur baru.
    // Asumsi: jika unitId bukan string panjang, maka itu adalah struktur lama.
    if (!docData.units || docData.units.length === 0 || typeof docData.units[0].unitId !== 'string' || docData.units[0].unitId.length < 10) {
        needsUpdate = true;
    }

    if (needsUpdate) {
        console.log(`  -> Migrasi diperlukan untuk dokumen: ${document.id}`);
        documentsMigrated++;

        const migratedUnits = docData.units.map(unit => {
            // Jika unitId sudah ada dan valid, gunakan itu. Jika tidak, buat yang baru.
            const newUnitId = (typeof unit.unitId === 'string' && unit.unitId.length > 10) ? unit.unitId : generateUniqueId();

            const migratedQuestions = unit.questions.map(q => {
                // Jika ID pertanyaan sudah ada dan valid, gunakan itu. Jika tidak, buat yang baru.
                const newQuestionId = (typeof q.id === 'string' && q.id.length > 10) ? q.id : generateUniqueId();
                return { ...q, id: newQuestionId };
            });

            return { 
                ...unit, 
                unitId: newUnitId, 
                questions: migratedQuestions 
            };
        });

        // Membuat objek pembaruan hanya dengan field yang diubah
        const updatePayload = {
            ...docData, // Salin semua data lama
            units: migratedUnits, // Timpa dengan unit yang sudah dimigrasi
            id: document.id, // Pastikan `id` field ada
            theme: docData.theme || document.id, // Pastikan `theme` field ada
            createdAt: docData.createdAt || Timestamp.now(), // Tambahkan createdAt jika tidak ada
            showOn: docData.showOn !== undefined ? docData.showOn : "" // Tambahkan showOn jika tidak ada
        };

        batch.set(document.ref, updatePayload); // Gunakan set untuk menimpa dokumen dengan struktur yang benar
    } else {
        console.log(`  -> Dokumen ${document.id} sudah menggunakan struktur baru, dilewati.`);
    }
  }

  if (documentsMigrated > 0) {
    await batch.commit();
    console.log(`\nProses migrasi selesai. ${documentsMigrated} dokumen telah diperbarui dengan aman.`);
  } else {
    console.log("\nTidak ada dokumen yang memerlukan migrasi. Semua sudah dalam format terbaru.");
  }
}

// ===============================================================
// EKSEKUSI
// ===============================================================

migrateAndUpdateData()
  .then(() => {
    console.log("Eksekusi skrip migrasi data berhasil.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Terjadi kesalahan fatal saat migrasi data:", err);
    process.exit(1);
  });
