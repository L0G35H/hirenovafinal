/**
 * TalentLens – Firebase Authentication Helpers
 */
import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/**
 * Logout user — signs out from Firebase and clears localStorage
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem("tl_token");
    localStorage.removeItem("tl_user");
    localStorage.removeItem("tl_role");
    window.location.href = "/login.html";
  } catch (error) {
    console.error("Logout Error:", error);
    throw error;
  }
};

export const getStoredToken = () => {
  return localStorage.getItem("tl_token");
};

export const getStoredUser = () => {
  return localStorage.getItem("tl_user");
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("tl_token");
};
