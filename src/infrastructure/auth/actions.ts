import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase/client";

export async function loginWithGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Error during Google login:", error);
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error during logout:", error);
  }
}