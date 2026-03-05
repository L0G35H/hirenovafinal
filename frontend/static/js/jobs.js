/**
 * TalentLens – Job Role Manager (jobs.js)
 */

checkAuth();

let allSkillCategories = {};
let jobRoles = [];

// ── Load skill categories from API ────────────────────────────────────────────
async function loadSkillCategories() {
  const data = await apiGet('/api/analytics/skills');
  if (!data) return;
  allSkillCategories = data;
  renderSkillCheckboxes();
}

function renderSkillCheckboxes(selectedSkills = []) {
  const container = document.getElementById('skillsContainer');
  container.innerHTML = '';

  Object.entries(allSkillCategories).forEach(([category, skills]) => {
    const group = document.createElement('div');
    group.innerHTML = `
      <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">${category}</p>
      <div class="flex flex-wrap">
        ${skills.map(skill => `
          <label>
            <input type="checkbox" class="skill-checkbox" value="${skill}" 
                   ${selectedSkills.includes(skill) ? 'checked' : ''} 
                   onchange="updateSelectedCount()" />
            <span class="skill-label">${skill}</span>
          </label>`).join('')}
      </div>
    `;
    container.appendChild(group);
  });
  updateSelectedCount();
}

function updateSelectedCount() {
  const checked = document.querySelectorAll('.skill-checkbox:checked').length;
  document.getElementById('selectedCount').textContent = `(${checked} selected)`;
}

function getSelectedSkills() {
  return [...document.querySelectorAll('.skill-checkbox:checked')].map(el => el.value);
}

// ── Load existing job roles ───────────────────────────────────────────────────
async function loadJobRoles() {
  const data = await apiGet('/api/jobs');
  if (data === null) return;
  jobRoles = data;
  document.getElementById('jobCount').textContent = data.length;
  renderJobRolesList(data);
}

function renderJobRolesList(jobs) {
  const container = document.getElementById('jobRolesList');
  if (!jobs.length) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
      <p>No job roles yet. Create your first one!</p>
    </div>`;
    return;
  }

  container.innerHTML = jobs.map(job => `
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-fade-in">
      <div class="flex items-start justify-between mb-3">
        <div>
          <h3 class="font-bold text-base" style="color:var(--navy)">${job.role_name}</h3>
          <p class="text-slate-400 text-xs mt-0.5">${job.description || 'No description'}</p>
        </div>
        <div class="flex gap-2">
          <button onclick="editJob('${job.id}')" 
                  class="text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                  style="background:rgba(26,45,90,0.07);color:var(--navy)">Edit</button>
          <button onclick="deleteJob('${job.id}')" 
                  class="text-xs font-semibold px-3 py-1.5 rounded-lg transition bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-1 mb-3">
        ${(job.required_skills || []).map(s => `<span class="skill-chip skill-detected">${s}</span>`).join('')}
      </div>
      <div class="flex gap-4 text-xs text-slate-500">
        <span>🎯 Min Score: <strong>${job.min_score_threshold ?? 60}%</strong></span>
        <span>💼 Experience: <strong>${job.experience_required || 'Any'}</strong></span>
        <span>📋 Skills: <strong>${(job.required_skills || []).length}</strong></span>
      </div>
    </div>
  `).join('');
}

// ── Save Job Role (Create or Update) ─────────────────────────────────────────
async function saveJobRole() {
  const roleName = document.getElementById('roleName').value.trim();
  const roleDesc = document.getElementById('roleDesc').value.trim();
  const minScore = parseFloat(document.getElementById('minScore').value);
  const expReq = document.getElementById('expRequired').value;
  const skills = getSelectedSkills();
  const editingId = document.getElementById('editingJobId').value;

  if (!roleName) { showToast('Role name is required.', 'error'); return; }
  if (!skills.length) { showToast('Select at least one required skill.', 'error'); return; }

  const body = {
    role_name: roleName,
    description: roleDesc,
    required_skills: skills,
    min_score_threshold: minScore || 60,
    experience_required: expReq,
  };

  try {
    let result;
    const headers = await authHeader();
    if (editingId) {
      result = await fetch(`/api/jobs/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
    } else {
      result = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
    }
    const data = await result.json();
    if (!result.ok) throw new Error(data.detail || 'Save failed');

    showToast(editingId ? 'Job role updated!' : 'Job role created!', 'success');
    resetForm();
    loadJobRoles();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── Edit ──────────────────────────────────────────────────────────────────────
function editJob(jobId) {
  const job = jobRoles.find(j => j.id === jobId);
  if (!job) return;

  document.getElementById('editingJobId').value = jobId;
  document.getElementById('roleName').value = job.role_name;
  document.getElementById('roleDesc').value = job.description || '';
  document.getElementById('minScore').value = job.min_score_threshold;
  document.getElementById('expRequired').value = job.experience_required || 'Any';
  document.getElementById('formTitle').textContent = 'Edit Job Role';
  document.getElementById('saveJobBtnText').textContent = 'Update Job Role';
  document.getElementById('cancelBtn').classList.remove('hidden');

  renderSkillCheckboxes(job.required_skills || []);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteJob(jobId) {
  if (!confirm('Delete this job role? This cannot be undone.')) return;
  try {
    const { status, data } = await apiDelete(`/api/jobs/${jobId}`);
    if (status >= 400) throw new Error(data.detail);
    showToast('Job role deleted.', 'success');
    loadJobRoles();
    if (document.getElementById('editingJobId').value === jobId) cancelEdit();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── Cancel edit ───────────────────────────────────────────────────────────────
function cancelEdit() {
  resetForm();
}

function resetForm() {
  document.getElementById('editingJobId').value = '';
  document.getElementById('roleName').value = '';
  document.getElementById('roleDesc').value = '';
  document.getElementById('minScore').value = '60';
  document.getElementById('expRequired').value = 'Any';
  document.getElementById('formTitle').textContent = 'Create New Job Role';
  document.getElementById('saveJobBtnText').textContent = 'Create Job Role';
  document.getElementById('cancelBtn').classList.add('hidden');
  renderSkillCheckboxes([]);
}

// Init
loadSkillCategories();
loadJobRoles();
