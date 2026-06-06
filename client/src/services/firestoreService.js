
// client/src/services/firestoreService.js

import { 
    doc, 
    getDoc, 
    getDocs, 
    collection, 
    writeBatch, 
    arrayUnion, 
    Timestamp, 
    query, 
    orderBy,
    setDoc,
    where
} from "firebase/firestore";
import { db } from "../firebase"; 

// ... (fungsi-fungsi lain tetap sama)

export const getUserProgress = async (userId) => {
    if (!userId) return null;
    try {
        const docRef = doc(db, "userProgress", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return { completedUnits: [] };
    } catch (error) {
        console.error("Error getting user progress:", error);
        throw error;
    }
};

export const getAllDailyPaths = async () => {
    try {
        const pathsQuery = query(collection(db, 'dailyPaths'), orderBy('createdAt', 'asc'));
        const querySnapshot = await getDocs(pathsQuery);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching all daily paths:", error);
        throw error;
    }
};

export const saveUnitCompletion = async (userId, pathId, unitId) => {
    if (!userId || !pathId || !unitId) return;
    const batch = writeBatch(db);
    const timestamp = Timestamp.now();
    const userProgressRef = doc(db, "userProgress", userId);
    const unitIdentifier = `${pathId}_${unitId}`;
    const progressData = { 
        unitIdentifier: unitIdentifier,
        completedAt: timestamp
    };
    batch.set(userProgressRef, { 
        completedUnits: arrayUnion(progressData) 
    }, { merge: true });
    await batch.commit();
};

export const updateUserData = async (userId, dataToUpdate) => {
    if (!userId) return;
    try {
        const userDocRef = doc(db, "users", userId);
        const batch = writeBatch(db);
        batch.update(userDocRef, dataToUpdate);
        await batch.commit();
    } catch (error) {
        console.error("Error updating user data:", error);
        throw error;
    }
};

export const getAppName = async () => {
    try {
        const docRef = doc(db, "adminSetting", "appDetails");
        const docSnap = await getDoc(docRef);
        return (docSnap.exists() && docSnap.data().appName) ? docSnap.data().appName : "Aplikasi Kuis Sejarah";
    } catch (error) {
        console.error("Error getting app name:", error);
        throw error;
    }
};

export const updateAppName = async (newName) => {
    if (!newName) return;
    try {
        const docRef = doc(db, "adminSetting", "appDetails");
        await setDoc(docRef, { appName: newName }, { merge: true });
    } catch (error) {
        console.error("Error updating app name:", error);
        throw error;
    }
};

export const getUsersByRole = async (role) => {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", role));
        const querySnapshot = await getDocs(q);
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        return users;
    } catch (error) {
        console.error("Error getting users by role:", error);
        throw error;
    }
};
