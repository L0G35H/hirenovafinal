/**
 * TalentLens - Candidate Upload Portal JS
 * Isolated from admin logic. Only submits resume and shows success/error messages.
 */

import { auth, provider, db } from './firebase.js';
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// -- DOM Elements
const authSection = document.getElementById('authSection');
const uploadSection = document.getElementById('uploadSection');
const authError = document.getElementById('authError');
const userAvatar = document.getElementById('userAvatar');
const userEmail = document.getElementById('userEmail');
const jobRoleSelect = document.getElementById('jobRoleSelect');
const uploadForm = document.getElementById('uploadForm');
const resumeFile = document.getElementById('resumeFile');
const dropZone = document.getElementById('dropZone');
const fileInfo = document.getElementById('fileInfo');
const dropDefault = document.getElementById('dropDefault');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const submitBtn = document.getElementById('submitBtn');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const progressPct = document.getElementById('progressPct');
const progressMsg = document.getElementById('progressMsg');
const statusBanner = document.getElementById('statusBanner');
const successState = document.getElementById('successState');

// -- Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Logged in
        authSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');

        userEmail.textContent = user.email;
        userAvatar.textContent = user.email.charAt(0).toUpperCase();

        // Load roles
        await loadJobRoles();
    } else {
        // Logged out
        authSection.classList.remove('hidden');
        uploadSection.classList.add('hidden');
        uploadForm.reset();
        clearFile();
        hideStatus();
        successState.classList.add('hidden');
        uploadForm.classList.remove('hidden');
    }
});

// -- Error Helper
function showAuthError(msg) {
    authError.textContent = msg;
    authError.classList.remove('hidden');
}

function parseAuthError(error) {
    if (error.code === 'auth/invalid-credential') return 'Invalid email or password.';
    if (error.code === 'auth/user-not-found') return 'No account found with this email.';
    if (error.code === 'auth/wrong-password') return 'Incorrect password.';
    if (error.code === 'auth/unauthorized-domain') return 'Domain not authorized for Google Sign-In. Use http://localhost:8000 instead of 127.0.0.1, or add this domain in the Firebase Console Settings.';
    return error.message;
}

// -- Login Handlers
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.textContent = 'Signing in...';
    btn.disabled = true;
    authError.classList.add('hidden');

    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;

    try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        // Ensure user record exists in firestore with candidate role
        const userRef = doc(db, 'users', cred.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, { email: cred.user.email, role: 'candidate' });
        }
    } catch (error) {
        showAuthError(parseAuthError(error));
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
});

const googleBtn = document.getElementById("google-login-btn");

googleBtn?.addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, provider);

        // Ensure user record exists in firestore with candidate role
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, { email: result.user.email, role: 'candidate' });
        }

        console.log("Google login success:", result.user);
    } catch (error) {
        console.error("Google login error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            showAuthError(parseAuthError(error));
        }
    }
});

document.getElementById('signOutBtn')?.addEventListener('click', () => {
    signOut(auth);
});

// -- Load Job Roles
async function loadJobRoles() {
    try {
        const res = await fetch('/api/jobs');
        if (!res.ok) throw new Error('Failed to load roles');
        const roles = await res.json();

        if (roles && roles.length > 0) {
            jobRoleSelect.innerHTML = '<option value="">Select a job role...</option>' +
                roles.map(r => `<option value="${r.id}">${r.role_name}</option>`).join('');
        } else {
            jobRoleSelect.innerHTML = '<option value="">No open roles available</option>';
        }
    } catch (error) {
        jobRoleSelect.innerHTML = '<option value="">Error loading roles</option>';
    }
}

// -- Drag and Drop handling
function clearFile() {
    resumeFile.value = '';
    dropDefault.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    hideStatus();
}

// Map globally to allow onclick="clearFile()" in HTML
window.clearFile = clearFile;

dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-teal-500', 'bg-teal-50');
});

dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-teal-500', 'bg-teal-50');
});

dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-teal-500', 'bg-teal-50');
    if (e.dataTransfer.files.length) {
        resumeFile.files = e.dataTransfer.files;
        handleFileSelect();
    }
});

resumeFile?.addEventListener('change', handleFileSelect);

function handleFileSelect() {
    hideStatus();
    const file = resumeFile.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        showStatus('❌ Please select a PDF file', 'error');
        clearFile();
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showStatus('❌ File size exceeds 10MB limit', 'error');
        clearFile();
        return;
    }

    fileName.textContent = file.name;
    fileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    dropDefault.classList.add('hidden');
    fileInfo.classList.remove('hidden');
}

// -- Status Rendering
function showStatus(msg, type) {
    statusBanner.textContent = msg;
    statusBanner.classList.remove('hidden', 'bg-red-50', 'text-red-600', 'bg-amber-50', 'text-amber-700', 'bg-green-50', 'text-green-700');

    if (type === 'error') {
        statusBanner.classList.add('bg-red-50', 'text-red-600');
    } else if (type === 'warning') {
        statusBanner.classList.add('bg-amber-50', 'text-amber-700');
    } else {
        statusBanner.classList.add('bg-green-50', 'text-green-700');
    }
}

function hideStatus() {
    statusBanner.classList.add('hidden');
}

// -- Form Submission
uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatus();

    const file = resumeFile.files[0];
    if (!file) {
        showStatus('❌ Please select a resume PDF to upload', 'error');
        return;
    }

    const name = document.getElementById('candName').value.trim();
    const phone = document.getElementById('candPhone').value.trim();
    const edu = document.getElementById('candEdu').value.trim();
    const exp = document.getElementById('candExp').value;
    const roleId = document.getElementById('jobRoleSelect').value;
    const email = auth.currentUser?.email;

    if (!roleId) {
        showStatus('❌ Please select a job role', 'error');
        return;
    }

    if (!name || !email) {
        showStatus('❌ Name and Email are required', 'error');
        return;
    }

    // Prepare FormData
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('name', name);
    formData.append('email', email);  // Enforced from auth
    formData.append('phone', phone);
    formData.append('education', edu);
    formData.append('experience', exp);
    formData.append('job_role_id', roleId);

    // Update UI
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="animate-pulse">Uploading...</span>';
    progressWrap.classList.remove('hidden');

    // Fake progress animation for UX
    let pct = 0;
    const progressInterval = setInterval(() => {
        pct += Math.random() * 15;
        if (pct > 90) pct = 90;
        progressBar.style.width = pct + '%';
        progressPct.textContent = Math.round(pct) + '%';
    }, 400);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        progressPct.textContent = '100%';

        const data = await res.json();

        if (!res.ok) {
            if (res.status === 409) {
                showStatus('⚠️ Resume already submitted. You cannot submit multiple times for the same role.', 'warning');
            } else {
                throw new Error(data.detail || 'Upload failed');
            }
            return;
        }

        // SCENARIO: SUCCESS
        // We INTENTIONALLY ignore all skill/score/analytics from response.
        // We only show the success screen.
        uploadForm.classList.add('hidden');
        successState.classList.remove('hidden');

    } catch (error) {
        clearInterval(progressInterval);
        progressWrap.classList.add('hidden');
        showStatus('❌ Upload failed: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '🚀 Submit Resume';
        setTimeout(() => {
            if (!successState.classList.contains('hidden')) return;
            progressWrap.classList.add('hidden');
        }, 1000);
    }
});
