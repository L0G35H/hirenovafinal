/**
 * TalentLens – Dashboard Analytics (dashboard.js)
 */

checkAuth();

let skillChart, scoreChart;

async function loadDashboard() {
    try {
        const [analytics, jobs] = await Promise.all([
            apiGet('/api/analytics'),
            apiGet('/api/jobs'),
        ]);

        if (!analytics) return;

        // KPI Cards
        document.getElementById('kpiTotal').textContent = analytics.total_resumes ?? 0;
        document.getElementById('kpiAnalyzed').textContent = analytics.total_analyzed ?? 0;
        document.getElementById('kpiAvg').textContent = (analytics.avg_score ?? 0) + '%';
        document.getElementById('kpiJobs').textContent = (jobs ?? []).length;

        // Skill Bar Chart
        const topSkills = analytics.top_skills?.slice(0, 10) || [];
        renderSkillChart(topSkills);

        // Score Distribution Donut
        renderScoreChart(analytics.score_distribution || {});

        // Top Candidates Table
        renderTopTable(analytics.top_candidates || []);

        // Achievement Intelligence Summary
        renderIntelligenceList('topProjectsList', analytics.top_projects || [], '📁', '#ede9fe', '#5b21b6');
        renderIntelligenceList('topCertsList', analytics.top_certifications || [], '🎓', '#dbeafe', '#1e40af');
        renderIntelligenceList('topAchievesList', analytics.top_achievements || [], '🏆', '#fef3c7', '#92400e');

    } catch (e) {
        showToast('Failed to load analytics: ' + e.message, 'error');
    }
}

function renderSkillChart(skills) {
    const ctx = document.getElementById('skillChart')?.getContext('2d');
    if (!ctx) return;
    if (skillChart) skillChart.destroy();

    skillChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: skills.map(s => s.skill),
            datasets: [{
                label: 'Occurrences',
                data: skills.map(s => s.count),
                backgroundColor: skills.map((_, i) => `hsl(${220 + i * 12}, 65%, ${55 - i * 2}%)`),
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderScoreChart(dist) {
    const ctx = document.getElementById('scoreChart')?.getContext('2d');
    if (!ctx) return;
    if (scoreChart) scoreChart.destroy();

    scoreChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['0–40%', '40–60%', '60–80%', '80–100%'],
            datasets: [{
                data: [dist['0-40'] || 0, dist['40-60'] || 0, dist['60-80'] || 0, dist['80-100'] || 0],
                backgroundColor: ['#f87171', '#facc15', '#60a5fa', '#34d399'],
                borderWidth: 2,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: { legend: { display: false } }
        }
    });
}

function renderTopTable(candidates) {
    const tbody = document.getElementById('topCandidatesBody');
    if (!tbody) return;

    if (!candidates.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">
      No candidates yet. <a href="/upload.html" class="underline" style="color:var(--navy)">Upload a resume</a> to get started.
    </td></tr>`;
        return;
    }

    tbody.innerHTML = candidates.map((c, i) => `
    <tr>
      <td>${rankBadge(i + 1)}</td>
      <td>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
               style="background:linear-gradient(135deg,var(--navy),var(--teal))">${(c.name || '?')[0].toUpperCase()}</div>
          <span class="font-semibold text-slate-700">${c.name || '—'}</span>
        </div>
      </td>
      <td><span class="text-slate-500 text-sm">${c.job_role || '—'}</span></td>
      <td><span class="score-badge ${scoreClass(c.score)}">${c.score ?? 0}%</span></td>
      <td><span class="text-slate-600 text-sm">${c.matched ?? 0} skills</span></td>
      <td>
        <a href="/candidate_detail.html?id=${c.candidate_id}" class="text-sm font-semibold hover:underline" style="color:var(--navy)">View →</a>
      </td>
    </tr>
  `).join('');
}

function renderIntelligenceList(containerId, items, icon, bgColor, textColor) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!items.length) {
        el.innerHTML = `<p class="text-slate-400 text-sm italic">No data yet — upload resumes to populate.</p>`;
        return;
    }
    el.innerHTML = items.slice(0, 6).map((item, i) => `
        <div class="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
            <span class="text-xs font-bold w-5 text-center rounded-full py-0.5" 
                  style="background:${bgColor};color:${textColor}">${i + 1}</span>
            <span class="text-sm text-slate-700 flex-1 truncate" title="${item.name}">${icon} ${item.name}</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full" 
                  style="background:${bgColor};color:${textColor}">${item.count}</span>
        </div>
    `).join('');
}

// Init
loadDashboard();
