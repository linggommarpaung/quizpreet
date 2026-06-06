
// client/src/contexts/AuthContext.jsx

import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../config/firebaseConfig';
import {
  GoogleAuthProvider,
  signInWithPopup, // <-- Menggunakan Popup lagi
  signOut as firebaseSignout,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  linkWithCredential,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  updateProfile,
  deleteUser, 
} from 'firebase/auth';
import {
    ref, 
    uploadBytesResumable, 
    getDownloadURL,
    listAll,
    deleteObject 
} from 'firebase/storage';
import { 
    doc, 
    setDoc, 
    getDoc, 
    serverTimestamp, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    deleteDoc,
    orderBy,
    limit,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const navigate = useNavigate();

  // --- LOGIKA SINKRONISASI LEVEL PENGGUNA ---
  const syncUserLevel = useCallback(async (user, userData) => {
    const currentStreak = userData.streak || 0;
    const currentLevel = userData.level || 1;
    const calculatedLevel = Math.floor(currentStreak / 100) + 1;

    if (currentLevel !== calculatedLevel) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, { level: calculatedLevel });
        return { ...userData, level: calculatedLevel };
      } catch (error) {
        console.error("Gagal menyinkronkan level pengguna:", error);
        return userData;
      }
    }
    return userData;
  }, []);


  const handleUserDocument = useCallback(async (user, displayName = null) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const username = user.email.split('@')[0] + `_${uuidv4().slice(0, 4)}`;
      try {
        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: displayName || user.displayName || user.email.split('@')[0],
          username: username,
          email: user.email,
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${displayName || user.email}`,
          createdAt: serverTimestamp(),
          emailVerified: user.emailVerified,
          score: 0,
          role: 'regular',
          level: 1,      
          streak: 0,     
          diamonds: 0,   
          hearts: 5,     
        });
      } catch (error) {
        console.error("Gagal membuat dokumen pengguna:", error);
        toast.error('Gagal menyimpan data pengguna.');
      }
    } else {
        await updateDoc(userDocRef, {
            emailVerified: user.emailVerified,
        });
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        let userData = userDoc.data();
        const syncedUserData = await syncUserLevel(user, userData);
        const freshData = { ...user, ...syncedUserData };
        setCurrentUser(freshData);
      }
    } 
  }, [syncUserLevel]);

  const signOut = useCallback(() => {
    firebaseSignout(auth).then(() => {
      setCurrentUser(null);
      setIsEmailVerified(false);
      navigate('/');
      toast.success('Anda berhasil keluar.');
    }).catch(() => {
        toast.error('Gagal keluar.');
    });
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            await user.reload();
            const userDocRef = doc(db, 'users', user.uid);
            let userDoc;

            try {
                userDoc = await getDoc(userDocRef);
            } catch (error) {
                console.error("Gagal mengambil dokumen pengguna:", error);
                setLoading(false);
                return;
            }

            if (user.emailVerified) {
                setIsEmailVerified(true);
                let userData;
                if (userDoc.exists()) {
                    userData = userDoc.data();
                } else {
                    await handleUserDocument(user);
                    const newUserDoc = await getDoc(userDocRef);
                    userData = newUserDoc.data();
                }

                const syncedUserData = await syncUserLevel(user, userData);
                setCurrentUser({ ...user, ...syncedUserData });

            } else {
                setIsEmailVerified(false);
                setCurrentUser(user);
            }
        } else {
            setCurrentUser(null);
            setIsEmailVerified(false);
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, [handleUserDocument, syncUserLevel]);

    const updateUserProfile = useCallback(async ({ displayName, username }) => {
        if (!currentUser) throw new Error("Tidak ada pengguna yang login.");

        if (username !== currentUser.username) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const error = new Error("Username sudah digunakan.");
                toast.error(error.message);
                throw error;
            }
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { displayName, username });
        await updateProfile(auth.currentUser, { displayName });
        await refreshUserData();
    }, [currentUser, refreshUserData]);

    const updateProfilePicture = useCallback(async (file, onProgress) => {
        if (!currentUser) throw new Error("Tidak ada pengguna yang login.");
        const fileRef = ref(storage, `avatars/${currentUser.uid}/${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    console.error("Upload gagal:", error);
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await updateProfile(auth.currentUser, { photoURL: downloadURL });
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    await updateDoc(userDocRef, { photoURL: downloadURL });
                    await refreshUserData();
                    resolve();
                }
            );
        });
    }, [currentUser, refreshUserData]);

    const getLeaderboardData = useCallback(async () => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('score', 'desc'), limit(100));
        try {
            const querySnapshot = await getDocs(q);
            const leaderboard = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return leaderboard;
        } catch (error) {
            console.error("Error getting leaderboard data: ", error);
            toast.error('Gagal mengambil data papan peringkat.');
            return [];
        }
    }, []);

  const value = useMemo(() => ({
    currentUser,
    loading,
    isEmailVerified,
    refreshUserData,
    signOut,
    updateUserProfile,
    updateProfilePicture,
    getLeaderboardData,
    updateUserData: async (uid, data) => {
        const userDocRef = doc(db, 'users', uid);
        try {
          await updateDoc(userDocRef, data);
          await refreshUserData();
        } catch (error) {
          console.error("Gagal memperbarui data pengguna:", error);
          toast.error('Gagal memperbarui data pengguna.');
        }
    },
    resendVerificationEmail: async () => {
        if (auth.currentUser) {
          try {
            await sendEmailVerification(auth.currentUser);
            toast.success('Email verifikasi baru telah dikirim!');
          } catch (error) {
            toast.error('Gagal mengirim ulang email verifikasi.');
          }
        }
    },
    signUpWithEmail: async (email, password, displayName) => {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          await handleUserDocument(user, displayName);
          await sendEmailVerification(user);
          toast.success('Akun berhasil dibuat! Silakan cek email untuk verifikasi.');
          navigate('/verify-email');
        } catch (error) {
          toast.error(error.message);
        }
    },
    signInWithEmail: async (email, password) => {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          if (!userCredential.user.emailVerified) {
            toast.error('Email Anda belum diverifikasi.');
            navigate('/verify-email');
            return;
          }
        } catch (error) {
          toast.error('Email atau password salah.');
        }
    },
    // --- FUNGSI signInWithGoogle DIKEMBALIKAN KE VERSI POP-UP ---
    signInWithGoogle: async () => {
        try {
          const googleProvider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, googleProvider);
          const user = result.user;
    
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
              await handleUserDocument(user);
              toast.success(`Selamat datang, ${user.displayName}!`);
          } else {
              toast.success(`Selamat datang kembali, ${user.displayName}!`);
          }
          navigate('/dashboard');
    
        } catch (error) {
            if (error.code === 'auth/account-exists-with-different-credential') {
                const email = error.customData.email;
                const credential = GoogleAuthProvider.credentialFromError(error);
                const methods = await fetchSignInMethodsForEmail(auth, email);
                
                if (methods[0] === 'password') {
                    const password = prompt('Akun dengan email ini sudah ada. Masukkan password Anda untuk menautkan akun Google.');
                    if (password) {
                        try {
                            const userCredential = await signInWithEmailAndPassword(auth, email, password);
                            await linkWithCredential(userCredential.user, credential);
                            toast.success('Akun Google berhasil ditautkan!');
                            navigate('/dashboard');
                        } catch (linkError) {
                            toast.error('Gagal menautkan akun. Password salah?');
                        }
                    }
                }
            } else if (error.code !== 'auth/popup-closed-by-user') {
                toast.error('Gagal masuk dengan Google.');
            }
        }
    },
    sendPasswordReset: async (email) => {
        try {
          await sendPasswordResetEmail(auth, email);
          toast.success('Link reset password telah dikirim ke email Anda.');
        } catch (error) {
          toast.error('Gagal mengirim email reset.');
        }
    },
    deleteAccount: async () => {
        const user = auth.currentUser;
        if (!user) throw new Error("Pengguna tidak ditemukan.");
        try {
            const userStorageRef = ref(storage, `avatars/${user.uid}`);
            const listResult = await listAll(userStorageRef);
            const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
            await Promise.all(deletePromises);
            await deleteDoc(doc(db, 'users', user.uid));
            await deleteUser(user);
            navigate('/');
            toast.success('Akun Anda telah dihapus.');
        } catch (error) {
            console.error("Gagal menghapus akun:", error);
            if (error.code === 'auth/requires-recent-login') {
                toast.error('Perlu login ulang untuk keamanan.');
            } else {
                toast.error('Gagal menghapus akun.');
            }
            throw error;
        }
      },

  }), [currentUser, loading, isEmailVerified, refreshUserData, signOut, handleUserDocument, navigate, updateUserProfile, updateProfilePicture, getLeaderboardData]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
