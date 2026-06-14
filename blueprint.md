# Blueprint Aplikasi Kuis Sejarah

## Ringkasan Proyek

Dokumen ini adalah sumber kebenaran tunggal untuk aplikasi kuis sejarah, sebuah platform gamifikasi yang dirancang untuk memberikan pengalaman belajar yang interaktif dan menarik. Aplikasi ini mencakup otentikasi pengguna yang aman, manajemen profil, jalur pembelajaran visual, dan sistem papan peringkat kompetitif untuk mendorong keterlibatan pengguna.

## Desain dan Fitur yang Telah Diimplementasikan

### 1. Otentikasi Pengguna & Manajemen Profil
- **Pendaftaran & Login Multi-Metode**: Pengguna dapat mendaftar dan masuk menggunakan email/password atau akun Google.
- **Verifikasi Email**: Alur verifikasi email wajib untuk pendaftaran berbasis email guna memastikan validitas pengguna.
- **Manajemen Akun**: 
    - Pengguna dapat memperbarui nama tampilan, username unik (dengan validasi minimal 5 karakter), dan foto profil mereka (terbatas pada file gambar di bawah 5MB).
    - Peran pengguna (misalnya, "Regular") ditampilkan di halaman profil sebagai informasi yang tidak dapat diedit, memberikan kejelasan status akun.
- **Penghapusan Akun yang Aman**: Proses penghapusan akun bersifat komprehensif dan aman:
    - **Konfirmasi Ganda**: Pengguna harus mengetikkan email mereka secara manual (fungsi *paste* dinonaktifkan) sebagai konfirmasi sebelum akun dapat dihapus, untuk memastikan tindakan yang disengaja dan mencegah penghapusan yang tidak disengaja.
    - **Pembersihan Total**: Proses ini secara otomatis menghapus data pengguna dari Firebase Authentication, dokumen dari Firestore, dan semua file terkait (misalnya, avatar) dari Cloud Storage.

### 2. Manajemen Persetujuan Privasi (GDPR)
- **Spanduk Persetujuan**: Saat pertama kali mengunjungi situs, pengguna akan disambut dengan spanduk persetujuan cookie (GDPR). Pilihan pengguna (`Setuju` atau `Tolak`) disimpan di `localStorage` untuk sesi berikutnya.
- **Pembatasan Pendaftaran**: Jika pengguna menolak persetujuan, fungsionalitas pendaftaran akan dinonaktifkan secara menyeluruh:
    - Tombol untuk menavigasi ke halaman pendaftaran/login di halaman utama akan dinonaktifkan.
    - Formulir pendaftaran dan metode pendaftaran via Google tidak akan dapat digunakan, dengan pesan yang jelas ditampilkan kepada pengguna.
- **Pengelolaan Preferensi**: Pengguna dapat mengubah keputusan persetujuan mereka kapan saja melalui halaman profil.
    - Di bawah "Pengaturan Privasi", terdapat tombol "Ubah Persetujuan Cookie".
    - Mengklik tombol ini akan menghapus preferensi yang tersimpan dan memuat ulang halaman, sehingga spanduk persetujuan akan ditampilkan kembali untuk memungkinkan pengguna membuat pilihan baru.

### 3. Atribut & Sistem Gamifikasi Pengguna
- **Penyimpanan di Firestore**: Setiap pengguna yang mendaftar secara otomatis mendapatkan serangkaian atribut gamifikasi yang disimpan di dokumen Firestore mereka.
- **Atribut Default**:
    - `level`: Dimulai dari **1**.
    - `streak`: Dimulai dari **0** (dilambangkan dengan ikon api 🔥).
    - `diamonds`: Dimulai dari **0** (dilambangkan dengan ikon permata 💎).
    - `hearts`: Dimulai dari **5** (dilambangkan dengan ikon hati ❤️), mewakili nyawa atau kesempatan dalam kuis. Jumlahnya akan berkurang jika pengguna salah menjawab dan tidak bisa bernilai negatif (minimal 0).
- **Tujuan**: Atribut ini menjadi dasar untuk mekanik gamifikasi di masa depan, seperti sistem hadiah, progresi level, dan tantangan harian/mingguan.

### 4. Aturan Keamanan (Security Rules)
- **Firestore**: Aturan `firestore.rules` mengamankan data pengguna, memastikan pengguna hanya dapat membaca/menulis data mereka sendiri dan bahwa username baru harus unik.
- **Cloud Storage**: Aturan `storage.rules` telah disempurnakan untuk menangani izin secara spesifik untuk operasi unggah dan hapus file.

### 5. Struktur & Navigasi Aplikasi
- **Routing Aman**: Menggunakan `react-router-dom`, rute dilindungi untuk memastikan hanya pengguna terautentikasi yang dapat mengakses halaman internal.
- **Navigasi Intuitif**: Bilah navigasi bawah tetap di halaman dashboard menyediakan akses cepat ke fitur-fitur utama.

### 6. Halaman Utama (Dashboard)
- **Antarmuka Gamifikasi**: Terinspirasi dari Duolingo, dashboard menampilkan jalur pembelajaran visual.
- **Header Dinamis**: Menampilkan statistik pengguna secara *real-time* termasuk **Level, Streak, Diamonds, dan Hearts**, beserta nama dan avatar pengguna.

### 7. Papan Peringkat (Leaderboard) Dinamis
- **Peringkat Real-time**: Menampilkan 10 pengguna dengan skor tertinggi dari Firestore, dengan sorotan visual pada pengguna yang sedang login.

### 8. Sistem Kuis dan Penilaian
- **Mesin Kuis Interaktif**: Antarmuka kuis dengan umpan balik visual instan.
- **Pratinjau Perolehan Poin**: Pengguna dapat melihat akumulasi poin, streak, dan diamond yang mereka dapatkan *selama* kuis berlangsung.
- **Penghitung Waktu Mundur**: Setiap pertanyaan kini memiliki penghitung waktu mundur 10 detik. Jika waktu habis, jawaban dianggap salah dan kuis berlanjut ke pertanyaan berikutnya.
- **Manajemen Nyawa (Hearts)**: Saat pengguna salah menjawab, satu nyawa (`heart`) akan dikurangi. Sistem memastikan bahwa jumlah nyawa tidak dapat bernilai negatif (minimal 0). Jika nyawa pengguna habis, kuis akan otomatis dihentikan.
- **Pembaruan Skor Otomatis**: Skor pengguna diperbarui secara atomik di Firestore setelah kuis selesai.
- **Penyimpanan Progres**: Progres penyelesaian kuis pengguna disimpan di koleksi `quizProgress` untuk melacak unit mana yang telah diselesaikan.
- **Modal Penyelesaian Kuis**: Setelah menyelesaikan satu unit, sebuah modal akan muncul dengan pesan dan umpan balik yang disesuaikan berdasarkan skor persentase:
    - **75-100%**: "Luar Biasa!"
    - **50-74%**: "Bagus!"
    - **0-49%**: "Tetap Semangat!"
    - Modal ini juga menampilkan ringkasan jumlah jawaban benar, salah, total persentase skor, serta **perolehan poin, streak, dan diamond** yang didapat dari unit tersebut.

### 9. Jalur Pembelajaran Berurutan (Sequential Learning Path)
- **Progresi Linear**: Pengguna harus menyelesaikan unit kuis secara berurutan. Unit berikutnya tidak akan bisa diakses sebelum unit sebelumnya diselesaikan.
- **Status Unit Visual**: Kartu unit di dasbor memiliki tiga status visual yang jelas:
    - **Selesai (`completed`)**: Untuk unit yang telah berhasil diselesaikan oleh pengguna. Kartu ini memiliki gaya yang berbeda dan tombolnya dinonaktifkan.
    - **Aktif**: Unit pertama yang belum selesai. Ini adalah satu-satunya unit yang dapat dimulai oleh pengguna.
    - **Terkunci (`locked`)**: Semua unit setelah unit aktif. Kartu-kartu ini digelapkan, ditandai dengan ikon gembok, dan tidak dapat diklik, memberikan indikasi visual yang jelas tentang jalur pembelajaran.
- **Umpan Balik Interaktif**: Jika pengguna mencoba mengakses unit yang terkunci, sebuah notifikasi *toast* akan muncul untuk memberitahu mereka agar menyelesaikan unit sebelumnya terlebih dahulu.

### 10. Manajemen Konten (Admin)
- **Impor dari JSON**: Di halaman tambah tema, admin dapat mengklik tombol "Impor dari JSON" untuk mengunggah file `.json`. Fitur ini secara otomatis membaca file dan mengisi semua bidang formulir—termasuk nama tema, tanggal penjadwalan, unit, pertanyaan, dan opsi jawaban—sehingga mempercepat proses pembuatan kuis secara signifikan.
- **Ekspor ke JSON**: Di halaman manajemen kuis, setiap tema memiliki tombol ekspor yang memungkinkan admin mengunduh data lengkap dari tema tersebut ke dalam sebuah file `.json` sebagai cadangan atau untuk digunakan kembali.

### 11. Sistem Tema Dinamis (Mode Terang & Gelap)
- **Dukungan Tema Ganda**: Aplikasi ini sekarang mendukung tema terang dan gelap yang dapat diganti secara dinamis, memberikan fleksibilitas visual dan kenyamanan bagi pengguna dalam berbagai kondisi pencahayaan.
- **Implementasi Berbasis Variabel CSS**: Implementasi ini menggunakan CSS Custom Properties (Variabel) untuk memastikan konsistensi dan kemudahan pemeliharaan. Satu set variabel warna global didefinisikan dalam `index.css` untuk mode terang (`:root`) dan gelap (`[data-theme='dark']`). Variabel ini mencakup warna latar belakang, teks, kartu, batas, bayangan, serta warna status spesifik seperti `correct` (benar) dan `incorrect` (salah) untuk kuis.
- **Kontrol Pengguna yang Mudah**: 
    - Manajemen tema ditangani oleh `ThemeContext` dan hook `useTheme`.
    - Pengguna dapat dengan mudah beralih antar tema menggunakan tombol *toggle* di bilah sisi (`Sidebar`).
    - Pilihan tema pengguna disimpan secara otomatis di `localStorage` untuk menjaga konsistensi di seluruh sesi.
- **Cakupan Komprehensif**: Seluruh antarmuka pengguna, termasuk halaman login, dasbor, profil, kuis, dan semua komponen UI, telah diperbarui untuk menggunakan variabel tema ini, memastikan pengalaman visual yang terpadu dan mulus.

### 12. Keamanan & Konfigurasi Lingkungan (.env)
- **Penyimpanan Kredensial Aman**: Semua kredensial Firebase dan detail konfigurasi sensitif dipindahkan dari kode sumber (hardcoded) ke file `client/.env`.
- **Pengabaian Git (.gitignore)**: File konfigurasi `.gitignore` di tingkat root dan folder client diperbarui untuk mengecualikan semua file `.env` lokal, sehingga mencegah informasi kredensial ter-push secara tidak sengaja ke repositori GitHub publik.
- **Dukungan Skrip Latar Belakang (Node.js)**: Skrip otomatisasi dan migrasi di folder `scripts/` disesuaikan untuk memuat variabel lingkungan dari `.env` secara dinamis, serta dimigrasikan sepenuhnya ke modul ESM (`type: "module"`).
- **Template `.env.example`**: Disediakan file contoh konfigurasi `.env.example` untuk memudahkan setup lingkungan baru tanpa membocorkan kunci asli.
- **Koneksi Socket Dinamis**: Alamat server Socket.io diubah dari hardcoded IP lokal menjadi dinamis menggunakan helper `socketConfig.js`. Sekarang URL ini dapat dikonfigurasi via variabel lingkungan `VITE_BACKEND_URL` dengan fallback otomatis ke `localhost` atau IP host client saat ini.

## Rencana Selanjutnya

- Penyempurnaan lebih lanjut pada sistem gamifikasi, termasuk hadiah untuk menyelesaikan seluruh jalur harian dan event spesial.
- Menambahkan lebih banyak variasi tipe pertanyaan dalam kuis (misalnya, mencocokkan, isian singkat).

## Penyebaran (Deployment)

Aplikasi telah dideploy dan dikonfigurasi sepenuhnya ke web menggunakan **Firebase Suite**:
- **Hosting URL**: [https://quizpreet-68102274-594ae.web.app](https://quizpreet-68102274-594ae.web.app)
- **Project Console**: [Firebase Console - quizpreet-68102274-594ae](https://console.firebase.google.com/project/quizpreet-68102274-594ae/overview)
- **Integrasi Firebase**: File `firebase.json` dikonfigurasi untuk mengelola `firestore` (rules/indexes), `storage` (rules), dan `hosting` secara bersamaan.
- Aturan Keamanan Tambahan:
    - **Firestore**: Aturan keamanan baru diimplementasikan untuk `chapters`, `metadata`, `global_chats`, `personal_chats`, `lobbyGroups` (untuk belajar kelompok/mabar regu beserta subkoleksi `signals` untuk WebRTC signaling).
    - **Storage**: Aturan keamanan untuk `avatars` dan berkas PDF materi `materi_pdf` (dengan validasi tipe file PDF dan ukuran maks 20MB untuk admin) aktif.
- **Perintah Build & Deploy**: `npm run build && npx -y firebase-tools@latest deploy` atau menggunakan script npm `npm run b-d` (skrip ini juga meluncurkan build frontend).

## Rencana Perubahan Saat Ini: Perbaikan Izin Firestore Lobby Group
- **Masalah**: Kesalahan izin Firestore (Permission Denied) saat membuat/bergabung kelompok belajar karena aturan keamanan untuk `lobbyGroups` belum dikonfigurasi.
- **Langkah Perbaikan**:
  1. Menambahkan aturan izin baca/tulis bagi user yang terautentikasi (`request.auth != null`) pada `/lobbyGroups/{roomId}` dan subkoleksi `/lobbyGroups/{roomId}/signals/{signalId}` di `firestore.rules`.
  2. Melakukan deploy aturan Firestore yang baru menggunakan Firebase CLI.
  3. Memverifikasi fungsionalitas pembuatan grup mabar di aplikasi.
