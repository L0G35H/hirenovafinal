/**
 * TalentLens – Candidates Leaderboard (candidates.js)
 */

checkAuth();

const PAGE_SIZE = 10;
let currentPage = 1;
let allCandidates = [];
let debounceTimer;

async function loadCandidates() {
    const scoreMin = parseFloat(document.getElementById('filterScore').value) || 0;
    const jobRoleId = document.getElementById('filterJob').value;
    const skill = document.getElementById('filterSkill').value.trim();

    const params = new URLSearchParams();
    if (scoreMin > 0) params.set('score_min', scoreMin);
    if (jobRoleId) params.set('job_role_id', jobRoleId);
    if (skill) params.set('skill', skill);

    try {
        const data = await apiGet(`/api/candidates?${params.toString()}`);
        if (!data) return;
        allCandidates = data;
        currentPage = 1;
        renderCandidates();
        document.getElementById('candidateCount').textContent = data.length;
    } catch (e) {
        showToast('Failed to load candidates: ' + e.message, 'error');
    }
}

function renderCandidates() {
    const tbody = document.getElementById('candidatesBody');
    const start = (currentPage - 1) * PAGE_SIZE;
    const page = allCandidates.slice(start, start + PAGE_SIZE);

    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = start + PAGE_SIZE >= allCandidates.length;
    document.getElementById('pageNum').textContent = currentPage;

    if (!page.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-slate-400">
      <svg class="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      No candidates found. <a href="/upload.html" class="underline" style="color:var(--navy)">Upload a resume</a> to start.
    </td></tr>`;
        return;
    }

    tbody.innerHTML = page.map(c => {
        const matched = (c.matched_skills || []).slice(0, 3);
        const extra = (c.matched_skills || []).length - 3;
        return `
    <tr class="animate-fade-in">
      <td>${rankBadge(c.rank)}</td>
      <td>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
               style="background:linear-gradient(135deg,var(--navy),var(--teal))">${(c.name || '?')[0].toUpperCase()}</div>
          <div>
            <p class="font-semibold text-slate-700">${c.name || '—'}</p>
            <p class="text-slate-400 text-xs">${c.email || ''}</p>
          </div>
        </div>
      </td>
      <td><span class="text-slate-600 text-sm">${c.job_role || '—'}</span></td>
      <td>
        <div class="flex items-center gap-2">
          <span class="score-badge ${scoreClass(c.score)}">${c.score ?? 0}%</span>
        </div>
        <div class="progress-bar mt-1 w-20"><div class="progress-fill" style="width:${c.score}%;background:${c.score >= 80 ? '#22c55e' : c.score >= 60 ? '#f59e0b' : '#ef4444'}"></div></div>
      </td>
      <td>
        <div class="flex flex-wrap gap-1">
          ${matched.map(s => `<span class="skill-chip skill-matched">${s}</span>`).join('')}
          ${extra > 0 ? `<span class="skill-chip skill-detected">+${extra}</span>` : ''}
        </div>
      </td>
      <td><span class="text-slate-500 text-sm">${formatDate(c.upload_date)}</span></td>
      <td>
        <a href="/candidate_detail.html?id=${c.candidate_id}" 
           class="text-sm font-semibold hover:underline" style="color:var(--navy)">View →</a>
      </td>
    </tr>`;
    }).join('');
}

function changePage(dir) {
    const maxPage = Math.ceil(allCandidates.length / PAGE_SIZE);
    currentPage = Math.max(1, Math.min(maxPage, currentPage + dir));
    renderCandidates();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearFilters() {
    document.getElementById('filterJob').value = '';
    document.getElementById('filterScore').value = '';
    document.getElementById('filterSkill').value = '';
    loadCandidates();
}

function debounceLoad() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadCandidates, 400);
}

// Load job roles for filter
async function loadJobFilter() {
    const sel = document.getElementById('filterJob');
    const jobs = await apiGet('/api/jobs');
    if (!jobs) return;
    jobs.forEach(j => {
        const opt = document.createElement('option');
        opt.value = j.id;
        opt.textContent = j.role_name;
        sel.appendChild(opt);
    });
}

// Init
loadJobFilter();
loadCandidates();
