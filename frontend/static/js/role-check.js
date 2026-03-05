/**
 * TalentLens – Auth Guard (Protected Pages Only)
 * 
 * This file must ONLY be loaded on protected pages:
 *   - dashboard.html
 *   - upload.html
 *   - candidates.html
 *   - candidate_detail.html
 *   - jobs.html
 * 
 * Do NOT load this on login.html (causes redirect loop).
 */
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── Auth State Listener ──────────────────────────────────────────────────────
// Firebase will fire this callback once auth state is determined.
// If user is null → not logged in → redirect to login.
// If user exists → logged in → stay on page.
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is logged in — update UI
    console.log("Authenticated:", user.email);
    localStorage.setItem("tl_user", user.email);

    // Update sidebar/header user display
    const sidebarEl = document.getElementById("sidebarUser");
    const headerEl = document.getElementById("headerUser");
    if (sidebarEl) sidebarEl.textContent = user.email;
    if (headerEl) headerEl.textContent = user.email;
  } else {
    // No user → redirect to login
    console.log("Not authenticated, redirecting to login.");
    window.location.href = "/login.html";
  }
});

// ── Logout Button ────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      localStorage.removeItem("tl_token");
      localStorage.removeItem("tl_user");
      localStorage.removeItem("tl_role");
      window.location.href = "/login.html";
    });
  }
});

// ── Global helper for app.js ─────────────────────────────────────────────────
window.getCurrentUserEmail = () => {
  return localStorage.getItem("tl_user") || "Admin";
};

window.getFirebaseToken = async () => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
};
