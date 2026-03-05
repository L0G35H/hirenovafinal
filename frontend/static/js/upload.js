/**
 * TalentLens – Resume Upload Logic (upload.js)
 */

checkAuth();

let selectedFile = null;

// ── Drag & Drop ───────────────────────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('resumeFile');

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
});

function setFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Only PDF files are supported.', 'error');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast('File is too large. Maximum size is 10MB.', 'error');
        return;
    }
    selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
    document.getElementById('fileInfo').classList.remove('hidden');
    dropZone.style.borderColor = 'var(--gold)';
}

function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    document.getElementById('fileInfo').classList.add('hidden');
    dropZone.style.borderColor = '';
}

// ── Load Job Roles ─────────────────────────────────────────────────────────────
async function loadJobRoles() {
    const select = document.getElementById('jobRoleSelect');
    const jobs = await apiGet('/api/jobs');
    if (!jobs || !jobs.length) return;
    jobs.forEach(j => {
        const opt = document.createElement('option');
        opt.value = j.id;
        opt.textContent = `${j.role_name} (min ${j.min_score_threshold}%)`;
        select.appendChild(opt);
    });
}
loadJobRoles();

// ── Animated progress steps ────────────────────────────────────────────────────
const progressSteps = [
    { msg: 'Uploading PDF…', pct: 10 },
    { msg: 'Extracting text from PDF…', pct: 30 },
    { msg: 'Running OCR if needed…', pct: 50 },
    { msg: 'Detecting skills with AI…', pct: 70 },
    { msg: 'Calculating match score…', pct: 90 },
    { msg: 'Saving to database…', pct: 95 },
];

function runProgressAnimation(callback) {
    let i = 0;
    const interval = setInterval(() => {
        if (i >= progressSteps.length) { clearInterval(interval); callback(); return; }
        document.getElementById('progressMsg').textContent = progressSteps[i].msg;
        document.getElementById('progressBar').style.width = progressSteps[i].pct + '%';
        i++;
    }, 500);
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submitResume() {
    const name = document.getElementById('candName').value.trim();
    const email = document.getElementById('candEmail').value.trim();
    const phone = document.getElementById('candPhone').value.trim();
    const exp = document.getElementById('candExp').value;
    const edu = document.getElementById('candEdu').value.trim();
    const jobRoleId = document.getElementById('jobRoleSelect').value;

    if (!selectedFile) { showToast('Please select a PDF resume.', 'error'); return; }
    if (!name) { showToast('Candidate name is required.', 'error'); return; }
    if (!email) { showToast('Email is required.', 'error'); return; }
    if (!jobRoleId) { showToast('Please select a job role.', 'error'); return; }

    // Show progress
    document.getElementById('resultPlaceholder').classList.add('hidden');
    document.getElementById('resultPanel').classList.add('hidden');
    document.getElementById('progressPanel').classList.remove('hidden');
    document.getElementById('submitBtn').disabled = true;

    const formData = new FormData();
    formData.append('resume', selectedFile);
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('experience', exp);
    formData.append('education', edu);
    formData.append('job_role_id', jobRoleId);

    // Start animation, then make the real API call
    let apiDone = false;
    let apiResult = null;
    let apiError = null;

    authHeader().then(headers => {
        fetch('/api/upload', {
            method: 'POST',
            headers: headers,
            body: formData,
        }).then(r => r.json().then(d => ({ status: r.status, data: d }))).then(r => {
            apiResult = r;
            apiDone = true;
        }).catch(e => { apiError = e; apiDone = true; });
    });

    runProgressAnimation(async () => {
        // Wait for API if still running
        while (!apiDone) await new Promise(r => setTimeout(r, 100));

        document.getElementById('progressPanel').classList.add('hidden');
        document.getElementById('submitBtn').disabled = false;

        if (apiError || (apiResult && apiResult.status >= 400)) {
            const msg = apiError?.message || apiResult?.data?.detail || 'Upload failed';
            showToast(msg, 'error', 5000);
            document.getElementById('resultPlaceholder').classList.remove('hidden');
            return;
        }

        const d = apiResult.data;
        showToast(`✅ ${d.candidate_name} analyzed — Score: ${d.score}%`, 'success', 5000);
        renderResult(d);
    });
}

function renderResult(data) {
    const analysis = data.analysis || {};
    document.getElementById('resultPanel').classList.remove('hidden');
    document.getElementById('progressBar').style.width = '100%';

    // Score circle
    const score = data.score ?? 0;
    const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
    document.getElementById('scoreValue').textContent = score + '%';
    document.getElementById('scoreValue').style.color = scoreColor;
    document.getElementById('scoreCircle').style.background =
        `conic-gradient(${scoreColor} ${score * 3.6}deg, #e2e8f0 0deg)`;
    document.getElementById('scoreName').textContent = data.candidate_name || '—';
    document.getElementById('scoreRole').textContent = 'Score: ' + score + '%';

    // Matched skills
    const matched = analysis.matched_skills || [];
    document.getElementById('matchedCount').textContent = `(${matched.length})`;
    document.getElementById('matchedSkills').innerHTML = matched.length
        ? matched.map(s => `<span class="skill-chip skill-matched">${s}</span>`).join('')
        : '<span class="text-slate-400 text-sm">No required skills matched.</span>';

    // Missing skills
    const missing = analysis.missing_skills || [];
    document.getElementById('missingCount').textContent = `(${missing.length})`;
    document.getElementById('missingSkills').innerHTML = missing.length
        ? missing.map(s => `<span class="skill-chip skill-missing">${s}</span>`).join('')
        : '<span class="text-green-600 text-sm font-semibold">🎉 All required skills found!</span>';

    // All detected
    const detected = analysis.detected_skills || [];
    document.getElementById('detectedSkills').innerHTML = detected.length
        ? detected.map(s => `<span class="skill-chip skill-detected">${s}</span>`).join('')
        : '<span class="text-slate-400 text-sm">No skills detected.</span>';

    // View detail link
    if (data.candidate_id) {
        document.getElementById('viewDetailBtn').href = `/candidate_detail.html?id=${data.candidate_id}`;
    }
}
