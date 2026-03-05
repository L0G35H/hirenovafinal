/**
 * TalentLens – Google Login (login.html only)
 * 
 * NO auth guard here. Only runs on login page.
 */
import { auth, provider } from "./firebase.js";
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const googleBtn = document.getElementById("googleLogin");

  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        console.log("Google Login Success:", user.email);

        // Store role
        localStorage.setItem("tl_role", "candidate");

        // Redirect after successful Google login
        window.location.href = "/upload.html";
      } catch (error) {
        console.error("Google Auth Error:", error);
      }
    });
  }
});
