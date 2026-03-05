/**
 * TalentLens – Login Page Logic
 * 
 * NO auth guard runs here. Redirect only after successful login.
 */
import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const adminTab = document.getElementById("adminTab");
  const candidateTab = document.getElementById("candidateTab");
  const formTitle = document.getElementById("formTitle");
  const loginBtn = document.getElementById("loginBtn");
  const portalSubText = document.getElementById("portalSubText");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const googleLoginArea = document.getElementById("googleLoginArea");

  let currentRole = "admin"; // default

  const switchTab = (role) => {
    currentRole = role;
    loginError.classList.add("hidden");
    emailInput.value = "";
    passwordInput.value = "";

    if (role === "admin") {
      adminTab.classList.replace("tab-inactive", "tab-active");
      candidateTab.classList.replace("tab-active", "tab-inactive");
      formTitle.textContent = "Sign in to Admin Dashboard";
      loginBtn.textContent = "Sign In as Admin";
      portalSubText.textContent = "KGiSL Placement Portal · Admin Access";
      googleLoginArea.classList.add("hidden");
    } else {
      candidateTab.classList.replace("tab-inactive", "tab-active");
      adminTab.classList.replace("tab-active", "tab-inactive");
      formTitle.textContent = "Candidate Login";
      loginBtn.textContent = "Sign In as Candidate";
      portalSubText.textContent = "KGiSL Placement Portal · Candidate Access";
      googleLoginArea.classList.remove("hidden");
    }
  };

  adminTab.addEventListener("click", () => switchTab("admin"));
  candidateTab.addEventListener("click", () => switchTab("candidate"));

  // ── Email/Password Login ─────────────────────────────────────────────────
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    loginBtn.textContent = "Signing in...";
    loginBtn.disabled = true;
    loginError.classList.add("hidden");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Store role info
      localStorage.setItem("tl_role", currentRole);

      // Redirect after successful login
      if (currentRole === "admin") {
        window.location.href = "/dashboard.html";
      } else {
        window.location.href = "/upload.html";
      }
    } catch (error) {
      console.error("Login Error:", error);
      loginError.textContent =
        error.message || "Login failed. Please try again.";
      loginError.classList.remove("hidden");
      loginBtn.textContent =
        currentRole === "admin" ? "Sign In as Admin" : "Sign In as Candidate";
      loginBtn.disabled = false;
    }
  });
});
