// client/src/services/authService.js
import { 
    getAuth, 
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    signInWithRedirect,
    getRedirectResult
} from "firebase/auth";
import app from "../firebase";

const auth = getAuth(app);

export const login = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Firebase Login Error:", error.message);
        throw error;
    }
};

export const signup = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Firebase Signup Error:", error.message);
        throw error;
    }
};

export const forgotPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { message: 'Email reset password telah dikirim.' };
    } catch (error) {
        console.error("Firebase Forgot Password Error:", error.message);
        throw error;
    }
};

export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithRedirect(auth, provider);
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        throw error;
    }
};

export const handleGoogleRedirectResult = async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            const user = result.user;
            console.log("Google sign-in successful:", user);
            return {
                displayName: user.displayName,
                email: user.email,
            };
        }
        return null;
    } catch (error) {
        console.error("Google Redirect Result Error:", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
        throw error;
    }
}
