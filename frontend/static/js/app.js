/**
 * TalentLens – Shared Utilities (app.js)
 * Loaded on every page.
 */

const API_BASE = '';  // Same origin (FastAPI serves frontend)

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('tl_token'); }
function getUser() { return window.getCurrentUserEmail ? window.getCurrentUserEmail() : 'Admin'; }

async function authHeader() {
  if (window.getFirebaseToken) {
    const token = await window.getFirebaseToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function checkAuth() {
  // Redirection is handled asynchronously by role-check.js
  // This function now only handles UI population
  const el = document.getElementById('sidebarUser') || document.getElementById('headerUser');
  if (el) el.textContent = getUser();
}

function logout() {
  localStorage.removeItem('tl_token');
  localStorage.removeItem('tl_user');
  if (window.logoutBtn) { document.getElementById('logoutBtn').click(); return; }
  window.location.href = '/login.html';
}

// ── Toast Notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const existing = document.getElementById('tl-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'tl-toast';
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="text-lg flex-shrink-0">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
      </span>
      <span class="flex-1">${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="text-current opacity-60 hover:opacity-100 ml-2 text-lg leading-none">×</button>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiGet(path) {
  const headers = await authHeader();
  const res = await fetch(API_BASE + path, { headers });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

async function apiPost(path, body) {
  const headers = await authHeader();
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function apiDelete(path) {
  const headers = await authHeader();
  const res = await fetch(API_BASE + path, {
    method: 'DELETE',
    headers,
  });
  return { status: res.status, data: await res.json() };
}

// ── Format helpers ────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function scoreClass(score) {
  if (score >= 80) return 'score-excellent';
  if (score >= 60) return 'score-good';
  if (score >= 40) return 'score-average';
  return 'score-poor';
}

function rankBadge(rank) {
  const cls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-n';
  return `<span class="rank-badge ${cls}">${rank}</span>`;
}

// ── Set dashboard date ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const dateEl = document.getElementById('dashboardDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }
  // Set header username
  const userEl = document.getElementById('headerUser');
  if (userEl) userEl.textContent = getUser();
  const sidebarEl = document.getElementById('sidebarUser');
  if (sidebarEl) sidebarEl.textContent = getUser();
});
