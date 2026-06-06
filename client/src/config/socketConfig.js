// client/src/config/socketConfig.js

/**
 * Mendapatkan URL server Socket.io secara dinamis.
 * Prioritas:
 * 1. Variabel lingkungan VITE_BACKEND_URL dari file .env
 * 2. Hostname saat ini di browser (localhost / IP lokal) dengan port 5000
 * 3. IP fallback default (http://192.168.1.250:5000)
 */
export const getSocketUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;

    // Jika berjalan di localhost, hubungkan ke port 5000 lokal
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }

    // Jika berjalan menggunakan IP lokal (misalnya mabar via Wi-Fi), gunakan IP yang sama
    const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (ipPattern.test(hostname)) {
      return `${protocol}//${hostname}:5000`;
    }
  }

  // Fallback default
  return 'http://192.168.1.250:5000';
};

export const SOCKET_URL = getSocketUrl();
