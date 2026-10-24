// Đường dẫn file: public/app.js

// Bản đồ ánh xạ Tên Đội / Mã FIFA sang mã ISO 2 ký tự để hiển thị Quốc kỳ
const COUNTRY_ISO_MAP = {
  'Argentina': 'ar', 'ARG': 'ar',
  'Brazil': 'br', 'BRA': 'br',
  'France': 'fr', 'FRA': 'fr',
  'Spain': 'es', 'ESP': 'es',
  'England': 'gb-eng', 'ENG': 'gb-eng',
  'Germany': 'de', 'GER': 'de',
  'Portugal': 'pt', 'POR': 'pt',
  'Netherlands': 'nl', 'NED': 'nl',
  'Italy': 'it', 'ITA': 'it',
  'Belgium': 'be', 'BEL': 'be',
  'Croatia': 'hr', 'CRO': 'hr',
  'Uruguay': 'uy', 'URU': 'uy',
  'Colombia': 'co', 'COL': 'co',
  'Mexico': 'mx', 'MEX': 'mx',
  'USA': 'us', 'United States': 'us',
  'Canada': 'ca', 'CAN': 'ca',
  'Japan': 'jp', 'JPN': 'jp',
  'South Korea': 'kr', 'Korea Republic': 'kr', 'KOR': 'kr',
  'Morocco': 'ma', 'MAR': 'ma',
  'Senegal': 'sn', 'SEN': 'sn',
  'Switzerland': 'ch', 'SUI': 'ch',
  'Denmark': 'dk', 'DEN': 'dk',
  'Poland': 'pl', 'POL': 'pl',
  'Australia': 'au', 'AUS': 'au',
  'Iran': 'ir', 'IRN': 'ir',
  'Saudi Arabia': 'sa', 'KSA': 'sa',
  'Qatar': 'qa', 'QAT': 'qa',
  'Ecuador': 'ec', 'ECU': 'ec',
  'Serbia': 'rs', 'SRB': 'rs',
  'Cameroon': 'cm', 'CMR': 'cm',
  'Ghana': 'gh', 'GHA': 'gh',
  'Tunisia': 'tn', 'TUN': 'tn',
  'Wales': 'gb-wls', 'WAL': 'gb-wls',
  'Costa Rica': 'cr', 'CRC': 'cr',
  'Norway': 'no', 'NOR': 'no',
  'Czechia': 'cz', 'Czech Republic': 'cz', 'CZE': 'cz',
  'South Africa': 'za', 'RSA': 'za',
  'Egypt': 'eg', 'EGY': 'eg',
  'Nigeria': 'ng', 'NGA': 'ng',
  'Algeria': 'dz', 'ALG': 'dz',
  'Ivory Coast': 'ci', 'CIV': 'ci',
  'Chile': 'cl', 'CHI': 'cl',
  'Peru': 'pe', 'PER': 'pe',
  'Paraguay': 'py', 'PAR': 'py',
  'Venezuela': 've', 'VEN': 've',
  'Ukraine': 'ua', 'UKR': 'ua',
  'Sweden': 'se', 'SWE': 'se',
  'Austria': 'at', 'AUT': 'at',
  'Turkey': 'tr', 'Türkiye': 'tr', 'TUR': 'tr',
  'Scotland': 'gb-sct', 'SCO': 'gb-sct',
  'New Zealand': 'nz', 'NZL': 'nz',
  'Panama': 'pa', 'PAN': 'pa',
  'Jamaica': 'jm', 'JAM': 'jm',
  'Uzbekistan': 'uz', 'UZB': 'uz'
};

function getFlagHtml(teamName, fifaCode, sizeClass = 'w-6 h-4') {
  const key = COUNTRY_ISO_MAP[teamName] || COUNTRY_ISO_MAP[fifaCode] || null;
  if (key) {
    return `<img src="https://flagcdn.com/w80/${key}.png" alt="${teamName || 'Flag'}" class="${sizeClass} object-cover rounded-xs shadow-2xs shrink-0 border border-slate-200" loading="lazy" />`;
  }
  return `<span class="inline-flex items-center justify-center ${sizeClass} rounded-xs bg-slate-200 text-[9px] font-bold text-slate-600 shrink-0">${(fifaCode || teamName || 'WC').slice(0, 3).toUpperCase()}</span>`;
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Trạng thái toàn cục của ứng dụng
const state = {
  currentView: 'matches',
  selectedStage: 'Groups',
  selectedGroup: 'A',
  allStandings: [],
  allTeams: [],
  selectedTeamId: null,
  allPlayers: []
};

// ==================== ĐIỀU HƯỚNG GIỮA CÁC MÀN HÌNH ====================
function switchView(viewName) {
  state.currentView = viewName;

  document.querySelectorAll('.view-section').forEach((sec) => sec.classList.add('hidden'));
  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) targetSection.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    const isCurrent = btn.dataset.view === viewName || (viewName === 'player-detail' && btn.dataset.view === 'players');
    btn.classList.toggle('active', isCurrent);
  });

  const titleMap = {
    'matches': 'Match Results',
    'tournament': 'Tournament',
    'teams': 'Team Stats',
    'players': 'Player Stats',
    'player-detail': 'Player Stats'
  };
  document.getElementById('topbar-title').textContent = titleMap[viewName] || 'WC 2026';

  if (viewName === 'matches') loadMatchesView();
  if (viewName === 'tournament') loadTournamentView();
  if (viewName === 'teams') loadTeamsView();
  if (viewName === 'players') loadPlayersView();
}

// ==================== 1. MÀN HÌNH MATCH RESULTS ====================
function createMatchCardHtml(m) {
  const hasScore = m.home_score !== null && m.away_score !== null;
  const scoreDisplay = hasScore ? `${m.home_score} - ${m.away_score}` : (m.kickoff_time || 'VS');
  const badgeText = m.result_type && m.result_type !== 'Regular' && m.result_type !== 'Normal'
    ? m.result_type
    : (m.statuss || 'FT');

  return `
    <div onclick="openMatchModal(${m.match_id})" class="bg-white rounded-xl border border-slate-200 px-6 py-4 shadow-2xs hover:shadow-md hover:border-blue-300 transition cursor-pointer grid grid-cols-12 items-center gap-2">
      <!-- Đội chủ nhà -->
      <div class="col-span-4 flex items-center gap-3">
        ${getFlagHtml(m.home_team_name, m.home_fifa_code, 'w-7 h-5')}
        <div>
          <p class="text-xs font-bold text-slate-900 leading-tight">${m.home_team_name}</p>
          <p class="text-[10px] text-slate-400 font-medium">${m.stage_name || ''}</p>
        </div>
      </div>

      <!-- Tỷ số & Ngày thi đấu -->
      <div class="col-span-4 flex flex-col items-center justify-center text-center">
        <span class="text-[10px] text-slate-400 font-medium mb-0.5">${formatShortDate(m.datee)}</span>
        <span class="text-lg font-extrabold text-brand-navy tabular-nums tracking-tight">${scoreDisplay}</span>
        <span class="mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold uppercase">${badgeText}</span>
      </div>

      <!-- Đội khách -->
      <div class="col-span-4 flex items-center justify-end gap-3 text-right">
        <div>
          <p class="text-xs font-bold text-slate-900 leading-tight">${m.away_team_name}</p>
          <p class="text-[10px] text-slate-400 font-medium">${m.stage_name || ''}</p>
        </div>
        ${getFlagHtml(m.away_team_name, m.away_fifa_code, 'w-7 h-5')}
      </div>
    </div>
  `;
}

async function loadMatchesView() {
  try {
    const res = await fetch('/api/matches');
    const json = await res.json();
    if (!json.success) return;

    document.getElementById('matches-last-updated').textContent =
      `Last updated: ${new Date().toLocaleTimeString()}`;

    const matches = json.data || [];
    const todayList = [];
    const pastList = [];
    const upcomingList = [];

    matches.forEach((m) => {
      const statusLower = (m.statuss || '').toLowerCase();
      if (statusLower.includes('live') || statusLower.includes('today')) {
        todayList.push(m);
      } else if (statusLower.includes('upcoming') || statusLower.includes('scheduled') || m.home_score === null) {
        upcomingList.push(m);
      } else {
        pastList.push(m);
      }
    });

    document.getElementById('matches-today-list').innerHTML = todayList.length
      ? todayList.map(createMatchCardHtml).join('')
      : `<p class="text-xs text-slate-400 italic">No live matches right now.</p>`;

    // Mặc định hiển thị các trận nổi bật nhất (Chung kết, Tranh hạng 3...) ở đầu danh sách Past
    document.getElementById('matches-past-list').innerHTML = pastList.length
      ? pastList.slice(0, 15).map(createMatchCardHtml).join('')
      : `<p class="text-xs text-slate-400 italic">No past matches found.</p>`;

    document.getElementById('matches-upcoming-list').innerHTML = upcomingList.length
      ? upcomingList.slice(0, 10).map(createMatchCardHtml).join('')
      : `<p class="text-xs text-slate-400 italic">No upcoming matches scheduled.</p>`;
  } catch (err) {
    console.error('Lỗi tải Match Results:', err);
  }
}

// ==================== 2. MÀN HÌNH TOURNAMENT ====================
function renderGroupPills(groups) {
  const container = document.getElementById('tournament-group-tabs');
  container.innerHTML = groups.map((g) => {
    const cleanGroup = g.replace(/^Group\s+/i, '').trim();
    const isActive = cleanGroup === state.selectedGroup;
    return `
      <button onclick="selectTournamentGroup('${cleanGroup}')" class="group-pill ${isActive ? 'active' : ''} px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
        Group ${cleanGroup}
      </button>
    `;
  }).join('');
}

async function loadTournamentView() {
  try {
    const res = await fetch('/api/standings');
    const json = await res.json();
    if (!json.success) return;

    state.allStandings = json.data || [];
    document.getElementById('tournament-sync-time').textContent =
      `Last synced: ${new Date().toLocaleString()}`;

    // Trích xuất danh sách các bảng duy nhất (A -> L)
    const uniqueGroups = [...new Set(state.allStandings.map((r) => r.groupp))].filter(Boolean).sort();
    if (uniqueGroups.length > 0 && !uniqueGroups.includes(state.selectedGroup)) {
      state.selectedGroup = uniqueGroups[0].replace(/^Group\s+/i, '').trim();
    }

    renderGroupPills(uniqueGroups);
    await updateTournamentContent();
  } catch (err) {
    console.error('Lỗi tải Tournament:', err);
  }
}

async function selectTournamentGroup(groupCode) {
  state.selectedGroup = groupCode;
  const uniqueGroups = [...new Set(state.allStandings.map((r) => r.groupp))].filter(Boolean).sort();
  renderGroupPills(uniqueGroups);
  await updateTournamentContent();
}

async function updateTournamentContent() {
  const standingsWrapper = document.getElementById('standings-card-wrapper');
  const matchesWrapper = document.getElementById('tournament-matches-wrapper');
  const groupTabs = document.getElementById('tournament-group-tabs');

  if (state.selectedStage === 'Groups') {
    groupTabs.classList.remove('hidden');
    standingsWrapper.classList.remove('hidden');
    matchesWrapper.className = 'lg:col-span-6 space-y-3';

    document.getElementById('standings-group-title').textContent = `Group ${state.selectedGroup} — Standings`;
    document.getElementById('tournament-matches-title').textContent = `Group ${state.selectedGroup} — Matches`;

    const groupRows = state.allStandings.filter(
      (r) => r.groupp === state.selectedGroup || r.groupp === `Group ${state.selectedGroup}`
    );

    document.getElementById('standings-tbody').innerHTML = groupRows.map((row) => {
      const rankBadgeClass = row.is_qualified
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-600 border-red-100';
      const gdFormatted = row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff;
      const gdColor = row.goal_diff > 0 ? 'text-emerald-600' : (row.goal_diff < 0 ? 'text-red-500' : 'text-slate-500');

      return `
        <tr class="hover:bg-slate-50/80 transition">
          <td class="py-3 px-2">
            <span class="w-5 h-5 rounded-full border ${rankBadgeClass} inline-flex items-center justify-center text-[10px] font-bold">
              ${row.group_rank}
            </span>
          </td>
          <td class="py-3 px-2">
            <div class="flex items-center gap-2.5">
              ${getFlagHtml(row.team_name, row.fifa_code_name, 'w-5 h-3.5')}
              <span class="font-bold text-slate-800">${row.team_name}</span>
              ${row.is_qualified ? '<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-extrabold">ADV</span>' : ''}
            </div>
          </td>
          <td class="py-3 px-2 text-center text-slate-600 tabular-nums">${row.played}</td>
          <td class="py-3 px-2 text-center text-slate-600 tabular-nums">${row.won}</td>
          <td class="py-3 px-2 text-center text-slate-600 tabular-nums">${row.drawn}</td>
          <td class="py-3 px-2 text-center text-slate-600 tabular-nums">${row.lost}</td>
          <td class="py-3 px-2 text-center font-bold tabular-nums ${gdColor}">${gdFormatted}</td>
          <td class="py-3 px-2 text-center font-extrabold text-slate-900 tabular-nums">${row.pts}</td>
        </tr>
      `;
    }).join('');

    // Lấy các trận thuộc bảng đang chọn
    const res = await fetch(`/api/matches?group=${encodeURIComponent(state.selectedGroup)}`);
    const json = await res.json();
    const groupMatches = (json.data || []).filter((m) => !m.is_knockout);
    document.getElementById('tournament-matches-list').innerHTML = groupMatches.length
      ? groupMatches.map(createMatchCardHtml).join('')
      : `<p class="text-xs text-slate-400 italic">No matches found for Group ${state.selectedGroup}.</p>`;
  } else {
    // Hiển thị các vòng đấu loại trực tiếp (R32, R16, Quarter-finals, Semi-finals, Final)
    groupTabs.classList.add('hidden');
    standingsWrapper.classList.add('hidden');
    matchesWrapper.className = 'lg:col-span-12 space-y-3';
    document.getElementById('tournament-matches-title').textContent = `${state.selectedStage} — Matches`;

    const res = await fetch(`/api/matches?stage=${encodeURIComponent(state.selectedStage)}`);
    const json = await res.json();
    document.getElementById('tournament-matches-list').innerHTML = (json.data || []).length
      ? json.data.map(createMatchCardHtml).join('')
      : `<p class="text-xs text-slate-400 italic">No matches found for this stage.</p>`;
  }
}

// ==================== 3. MÀN HÌNH TEAM STATS ====================
async function loadTeamsView() {
  try {
    if (state.allTeams.length === 0) {
      const res = await fetch('/api/teams');
      const json = await res.json();
      if (json.success) {
        state.allTeams = json.data || [];
        document.getElementById('teams-count-badge').textContent = `${state.allTeams.length} teams`;
      }
    }

    if (!state.selectedTeamId && state.allTeams.length > 0) {
      const brazil = state.allTeams.find((t) => t.team_name.toLowerCase() === 'brazil');
      state.selectedTeamId = brazil ? brazil.team_id : state.allTeams[0].team_id;
    }

    renderTeamQuickPicks(state.allTeams);
    if (state.selectedTeamId) {
      await loadSingleTeamDashboard(state.selectedTeamId);
    }
  } catch (err) {
    console.error('Lỗi tải Team Stats:', err);
  }
}

function renderTeamQuickPicks(teamsList) {
  const preferredNames = ['Brazil', 'France', 'Argentina', 'Spain', 'England'];
  const quickTeams = [];

  preferredNames.forEach((name) => {
    const found = teamsList.find((t) => t.team_name.toLowerCase() === name.toLowerCase());
    if (found) quickTeams.push(found);
  });

  teamsList.forEach((t) => {
    if (quickTeams.length < 6 && !quickTeams.some((qt) => qt.team_id === t.team_id)) {
      quickTeams.push(t);
    }
  });

  const remainingCount = Math.max(0, teamsList.length - quickTeams.length);
  const container = document.getElementById('team-quick-picks');

  container.innerHTML = quickTeams.map((t) => {
    const isActive = t.team_id === state.selectedTeamId;
    return `
      <button onclick="selectTeam(${t.team_id})" class="team-pill ${isActive ? 'active' : ''} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition">
        ${getFlagHtml(t.team_name, t.fifa_code_name, 'w-4 h-3')}
        <span>${t.team_name}</span>
      </button>
    `;
  }).join('') + (remainingCount > 0 ? `<span class="text-[11px] text-slate-400 font-medium ml-1">+${remainingCount} more</span>` : '');
}

async function selectTeam(teamId) {
  state.selectedTeamId = teamId;
  renderTeamQuickPicks(state.allTeams);
  await loadSingleTeamDashboard(teamId);
}

async function loadSingleTeamDashboard(teamId) {
  try {
    const res = await fetch(`/api/teams/${teamId}`);
    const json = await res.json();
    if (!json.success || !json.overview) return;

    const ov = json.overview;
    const form = json.recentForm || [];
    const topPlayer = json.topRatedPlayer;
    const squad = json.squad || [];

    // 1. Render Hero Banner
    document.getElementById('team-hero-banner').innerHTML = `
      <div class="flex items-center gap-4">
        <div class="p-2 bg-white/10 rounded-xl border border-white/15">
          ${getFlagHtml(ov.team_name, ov.fifa_code_name, 'w-14 h-10')}
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-blue-200">
            GROUP ${ov.groupp} · ${ov.confederation || 'FIFA'}
          </p>
          <h2 class="text-2xl font-extrabold tracking-tight mt-0.5">${ov.team_name}</h2>
        </div>
      </div>
      <div class="text-right text-xs space-y-1">
        <p class="text-blue-200">Coach: <strong class="text-white">${ov.coach_name || 'N/A'}</strong></p>
        <p class="text-blue-200">FIFA Rank: <strong class="text-white">#${ov.fifa_ranking_per_tournament || '-'}</strong> · Elo: <strong class="text-white">${ov.elo_rating || '-'}</strong></p>
      </div>
    `;

    // 2. Render 6 thẻ KPI
    const gdSign = ov.goal_diff > 0 ? `+${ov.goal_diff}` : ov.goal_diff;
    document.getElementById('team-kpi-grid').innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">PLAYED</p>
        <p class="text-2xl font-extrabold text-brand-navy mt-1 tabular-nums">${ov.played}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">WON</p>
        <p class="text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">${ov.won}</p>
        <p class="text-[10px] text-slate-400 mt-0.5">${ov.win_rate_pct}% win rate</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">DRAWN</p>
        <p class="text-2xl font-extrabold text-slate-600 mt-1 tabular-nums">${ov.drawn}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">LOST</p>
        <p class="text-2xl font-extrabold text-red-600 mt-1 tabular-nums">${ov.lost}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">GOAL DIFF</p>
        <p class="text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">${gdSign}</p>
        <p class="text-[10px] text-slate-400 mt-0.5">${ov.goals_for} for · ${ov.goals_against} against</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">POINTS</p>
        <p class="text-2xl font-extrabold text-brand-navy mt-1 tabular-nums">${ov.points}</p>
      </div>
    `;

    // 3. Render Recent Form
    document.getElementById('team-form-badges').innerHTML = form.length
      ? form.map((f) => {
          const color = f.form_result === 'W'
            ? 'bg-emerald-600'
            : (f.form_result === 'L' ? 'bg-red-600' : 'bg-slate-400');
          return `<span class="w-6 h-6 rounded-md ${color} text-white text-xs font-extrabold inline-flex items-center justify-center">${f.form_result}</span>`;
        }).join('')
      : `<span class="text-xs text-slate-400">N/A</span>`;

    document.getElementById('team-form-details').innerHTML = form.slice(0, 3).map((f) =>
      `<p class="text-[11px] text-slate-500">vs ${f.opponent_name}: <strong class="text-slate-700">${f.team_score}-${f.opponent_score}</strong></p>`
    ).join('');

    // 4. Render Performance Bars
    const ratingPct = Math.min(100, Math.round((ov.team_avg_rating / 10) * 100));
    document.getElementById('team-performance-bars').innerHTML = `
      <div>
        <div class="flex justify-between text-[11px] font-bold mb-1">
          <span class="text-slate-600">Possession</span>
          <span class="text-brand-navy tabular-nums">${ov.avg_possession}%</span>
        </div>
        <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-brand-navy rounded-full" style="width: ${ov.avg_possession}%"></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-[11px] font-bold mb-1">
          <span class="text-slate-600">Shot Accuracy</span>
          <span class="text-emerald-600 tabular-nums">${ov.shot_accuracy_pct}%</span>
        </div>
        <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-emerald-600 rounded-full" style="width: ${ov.shot_accuracy_pct}%"></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-[11px] font-bold mb-1">
          <span class="text-slate-600">Avg Rating</span>
          <span class="text-amber-600 tabular-nums">${ov.team_avg_rating}</span>
        </div>
        <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-amber-500 rounded-full" style="width: ${ratingPct}%"></div>
        </div>
      </div>
    `;

    // 5. Render Cầu thủ xuất sắc nhất đội (TEAM TOP RATED)
    const topBanner = document.getElementById('team-top-rated-banner');
    if (topPlayer) {
      topBanner.innerHTML = `
        <div onclick="openPlayerDetail(${topPlayer.player_id})" class="flex items-center gap-3 cursor-pointer">
          <span class="text-xl">🥇</span>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-amber-700">TEAM TOP RATED</p>
            <p class="text-xs font-extrabold text-brand-navy hover:underline">${topPlayer.player_name}</p>
          </div>
        </div>
        <div class="flex items-center gap-5 text-center">
          <div>
            <p class="text-sm font-extrabold text-red-600 tabular-nums">${topPlayer.goals}</p>
            <p class="text-[9px] font-bold uppercase text-slate-400">GOALS</p>
          </div>
          <div>
            <p class="text-sm font-extrabold text-brand-navy tabular-nums">${topPlayer.assists}</p>
            <p class="text-[9px] font-bold uppercase text-slate-400">ASSISTS</p>
          </div>
          <div>
            <p class="text-sm font-extrabold text-emerald-600 tabular-nums">${topPlayer.avg_rating}</p>
            <p class="text-[9px] font-bold uppercase text-slate-400">RATING</p>
          </div>
        </div>
      `;
    } else {
      topBanner.innerHTML = `<p class="text-xs text-slate-500">No player rating data available.</p>`;
    }

    // 6. Render Squad & Sân bóng Starting XI
    document.getElementById('team-squad-title').textContent = `Squad · ${squad.length} players`;

    const countByPos = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    squad.forEach((p) => {
      const pos = (p.position || '').toUpperCase();
      if (pos.includes('GK') || pos.includes('GOAL')) countByPos.GK++;
      else if (pos.includes('DEF') || pos.includes('DF') || pos.includes('BACK')) countByPos.DEF++;
      else if (pos.includes('MID') || pos.includes('MF')) countByPos.MID++;
      else countByPos.FWD++;
    });

    document.getElementById('team-position-counts').innerHTML = `
      <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-700">● GK ${countByPos.GK}</span>
      <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">● DEF ${countByPos.DEF}</span>
      <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700">● MID ${countByPos.MID}</span>
      <span class="px-2 py-0.5 rounded bg-red-50 text-red-700">● FWD ${countByPos.FWD}</span>
    `;

    const startingXI = squad.filter((p) => p.is_starting === 1).slice(0, 11);
    const playersOnPitch = startingXI.length >= 7 ? startingXI : squad.slice(0, 11);

    const gkRow = playersOnPitch.slice(0, 1);
    const defRow = playersOnPitch.slice(1, 5);
    const midRow = playersOnPitch.slice(5, 8);
    const fwdRow = playersOnPitch.slice(8, 11);

    const renderPitchRow = (rowPlayers, circleColor) => `
      <div class="flex items-center justify-around">
        ${rowPlayers.map((p, idx) => `
          <div onclick="openPlayerDetail(${p.player_id})" class="flex flex-col items-center cursor-pointer group">
            <div class="w-9 h-9 rounded-full ${circleColor} border-2 border-white shadow-md flex items-center justify-center text-xs font-extrabold group-hover:scale-110 transition">
              ${(p.player_id % 26) + 1}
            </div>
            <span class="mt-1 text-[11px] font-bold text-white drop-shadow-xs max-w-[90px] truncate">${p.player_name.split(' ').pop()}</span>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('team-pitch-lineup').innerHTML = `
      ${renderPitchRow(gkRow, 'bg-red-600')}
      ${renderPitchRow(defRow, 'bg-blue-700')}
      ${renderPitchRow(midRow, 'bg-blue-800')}
      ${renderPitchRow(fwdRow, 'bg-red-700')}
    `;
  } catch (err) {
    console.error('Lỗi tải chi tiết Team Dashboard:', err);
  }
}

// ==================== 4. MÀN HÌNH PLAYER STATS (GOLDEN BOOT) ====================
function getPosBadgeHtml(pos) {
  const p = (pos || 'FWD').toUpperCase();
  if (p.includes('FWD') || p.includes('FW') || p.includes('ST')) {
    return `<span class="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[9px] font-extrabold">FWD</span>`;
  }
  if (p.includes('MID') || p.includes('MF')) {
    return `<span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-extrabold">MID</span>`;
  }
  return `<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-extrabold">${p.slice(0, 3)}</span>`;
}

async function loadPlayersView(searchQuery = '') {
  try {
    const url = searchQuery
      ? `/api/players?search=${encodeURIComponent(searchQuery)}`
      : '/api/players';
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) return;

    state.allPlayers = json.data || [];
    const topFive = state.allPlayers.slice(0, 10);

    document.getElementById('players-subtitle').textContent =
      `Golden Boot leaderboard · Top ${Math.min(10, state.allPlayers.length)} of ${json.totalPlayers} players`;

    document.getElementById('players-tbody').innerHTML = topFive.map((p, index) => {
      const rankIcon = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : p.rank_no));
      const ratingColor = p.avg_rating >= 8.5 ? 'text-amber-500' : 'text-emerald-600';

      return `
        <tr onclick="openPlayerDetail(${p.player_id})" class="hover:bg-slate-50/90 transition cursor-pointer">
          <td class="py-3.5 px-4 font-bold text-slate-400 text-center">${rankIcon}</td>
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-3">
              ${getFlagHtml(p.team_name, p.fifa_code_name, 'w-6 h-4')}
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900">${p.player_name}</span>
                  ${getPosBadgeHtml(p.position)}
                </div>
                <p class="text-[11px] text-slate-400">${p.team_name}</p>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-4 text-center font-extrabold text-red-600 text-sm tabular-nums">${p.goals}</td>
          <td class="py-3.5 px-4 text-center font-bold text-brand-navy tabular-nums">${p.assists}</td>
          <td class="py-3.5 px-4 text-center text-slate-500 tabular-nums">${p.shots}</td>
          <td class="py-3.5 px-4 text-center text-slate-500 tabular-nums">${p.mins_per_game}'</td>
          <td class="py-3.5 px-4 text-center font-extrabold ${ratingColor} tabular-nums">${p.avg_rating}</td>
        </tr>
      `;
    }).join('');

    // Render Top 3 Podium Cards
    const podiumThree = state.allPlayers.slice(0, 3);
    const medals = ['🥇', '🥈', '🥉'];
    document.getElementById('players-podium-grid').innerHTML = podiumThree.map((p, i) => `
      <div onclick="openPlayerDetail(${p.player_id})" class="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col items-center">
        <div class="text-2xl mb-2">${medals[i]}</div>
        ${getFlagHtml(p.team_name, p.fifa_code_name, 'w-7 h-5')}
        <h3 class="text-sm font-extrabold text-brand-navy mt-2.5">${p.player_name}</h3>
        <p class="text-[11px] text-slate-400 mb-4">${p.team_name}</p>
        <div class="flex items-center justify-center gap-6 border-t border-slate-100 pt-3 w-full">
          <div>
            <p class="text-lg font-extrabold text-red-600 tabular-nums">${p.goals}</p>
            <p class="text-[9px] font-bold uppercase text-slate-400">GOALS</p>
          </div>
          <div>
            <p class="text-lg font-extrabold text-brand-navy tabular-nums">${p.assists}</p>
            <p class="text-[9px] font-bold uppercase text-slate-400">ASSISTS</p>
          </div>
          <div>
            <p class="text-lg font-extrabold text-emerald-600 tabular-nums">${p.avg_rating}</p>
            <p class="text-[9px] font-bold uppercase text-slate-400">RATING</p>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải Player Stats:', err);
  }
}

// ==================== 5. MÀN HÌNH PLAYER DETAIL ====================
async function openPlayerDetail(playerId) {
  try {
    const res = await fetch(`/api/players/${playerId}`);
    const json = await res.json();
    if (!json.success || !json.data) return;

    const p = json.data;
    switchView('player-detail');

    document.getElementById('player-detail-hero').innerHTML = `
      <div class="flex items-center gap-4">
        <div class="p-2 bg-white/10 rounded-xl border border-white/15">
          ${getFlagHtml(p.team_name, p.fifa_code_name, 'w-14 h-10')}
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-blue-200">
            🥇 RANK #${p.rank_no} · ${p.team_name.toUpperCase()}
          </p>
          <h2 class="text-2xl font-extrabold tracking-tight mt-0.5">${p.player_name}</h2>
          <div class="flex items-center gap-2 mt-2">
            <span class="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase">${p.position || 'FWD'}</span>
            <span class="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-semibold">${p.matches_played} matches</span>
            <span class="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-semibold">${p.minutes_played} mins</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-6 bg-white/10 px-5 py-3 rounded-xl border border-white/15 text-center">
        <div>
          <p class="text-3xl font-extrabold text-white tabular-nums">${p.goals}</p>
          <p class="text-[9px] font-bold uppercase tracking-wider text-blue-200">GOALS</p>
        </div>
        <div>
          <p class="text-3xl font-extrabold text-blue-200 tabular-nums">${p.assists}</p>
          <p class="text-[9px] font-bold uppercase tracking-wider text-blue-200">ASSISTS</p>
        </div>
      </div>
    `;

    document.getElementById('player-detail-kpis').innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">RATING</p>
        <p class="text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">${p.avg_rating}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">GOALS/GAME</p>
        <p class="text-2xl font-extrabold text-red-600 mt-1 tabular-nums">${p.goals_per_game}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">MINS/GOAL</p>
        <p class="text-2xl font-extrabold text-brand-navy mt-1 tabular-nums">${p.mins_per_goal}'</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">SHOTS</p>
        <p class="text-2xl font-extrabold text-slate-700 mt-1 tabular-nums">${p.shots}</p>
        <p class="text-[10px] text-slate-400 mt-0.5">${p.shot_conversion_pct}% conv.</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-2xs">
        <p class="text-[10px] font-bold uppercase text-slate-400">PENALTIES</p>
        <p class="text-2xl font-extrabold text-amber-600 mt-1 tabular-nums">${p.penalty_goals}</p>
      </div>
    `;

    const ratingWidth = Math.min(100, Math.round((p.avg_rating / 10) * 100));
    const convWidth = Math.min(100, p.shot_conversion_pct);
    const gaWidth = Math.min(100, Math.round((p.goals_and_assists / 15) * 100));

    document.getElementById('player-detail-bars').innerHTML = `
      <div>
        <div class="flex justify-between text-xs font-bold mb-1.5">
          <span class="text-slate-700">Match Rating</span>
          <span class="text-emerald-600 tabular-nums">${p.avg_rating} / 10</span>
        </div>
        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-emerald-600 rounded-full" style="width: ${ratingWidth}%"></div>
        </div>
      </div>

      <div>
        <div class="flex justify-between text-xs font-bold mb-1.5">
          <span class="text-slate-700">Shot Conversion</span>
          <span class="text-brand-navy tabular-nums">${p.shot_conversion_pct}%</span>
        </div>
        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-brand-blue rounded-full" style="width: ${convWidth}%"></div>
        </div>
      </div>

      <div>
        <div class="flex justify-between text-xs font-bold mb-1.5">
          <span class="text-slate-700">Goals + Assists</span>
          <span class="text-red-600 tabular-nums">${p.goals_and_assists}</span>
        </div>
        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-red-600 rounded-full" style="width: ${gaWidth}%"></div>
        </div>
      </div>
    `;

    document.getElementById('player-detail-footer-id').innerHTML =
      `Player ID: ${p.player_id} · <span class="text-brand-blue font-medium">/playerstats/${p.player_id}</span>`;
  } catch (err) {
    console.error('Lỗi tải Player Detail:', err);
  }
}

// ==================== 6. MODAL CHI TIẾT TRẬN ĐẤU (MATCH CENTER) ====================
async function openMatchModal(matchId) {
  const modal = document.getElementById('match-modal');
  const body = document.getElementById('modal-match-body');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  body.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Đang tải dữ liệu từ SQL Server...</p>`;

  try {
    const res = await fetch(`/api/matches/${matchId}`);
    const json = await res.json();
    if (!json.success || !json.matchInfo) {
      body.innerHTML = `<p class="text-xs text-red-500">Không tìm thấy chi tiết trận đấu.</p>`;
      return;
    }

    const info = json.matchInfo;
    const stats = json.teamStats || [];
    const events = json.events || [];

    document.getElementById('modal-match-stage').textContent =
      `${info.stage_name || 'Match'} · ${formatShortDate(info.datee)}`;

    const homeStat = stats.find((s) => s.team_id === info.home_team_id) || {};
    const awayStat = stats.find((s) => s.team_id === info.away_team_id) || {};

    body.innerHTML = `
      <!-- Tỷ số & xG -->
      <div class="bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-200">
        <div class="flex items-center gap-3">
          ${getFlagHtml(info.home_team_name, info.home_fifa_code, 'w-8 h-6')}
          <div>
            <p class="text-sm font-extrabold text-slate-900">${info.home_team_name}</p>
            <p class="text-[11px] text-slate-400">xG: ${info.home_xg}</p>
          </div>
        </div>
        <div class="text-center">
          <p class="text-2xl font-extrabold text-brand-navy tabular-nums">${info.home_score ?? '-'} : ${info.away_score ?? '-'}</p>
          <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-600">${info.result_type || info.statuss || 'FT'}</span>
        </div>
        <div class="flex items-center gap-3 text-right">
          <div>
            <p class="text-sm font-extrabold text-slate-900">${info.away_team_name}</p>
            <p class="text-[11px] text-slate-400">xG: ${info.away_xg}</p>
          </div>
          ${getFlagHtml(info.away_team_name, info.away_fifa_code, 'w-8 h-6')}
        </div>
      </div>

      <!-- Thông tin Sân vận động, Trọng tài & Cầu thủ xuất sắc nhất -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
        <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p class="text-slate-400 font-bold uppercase text-[9px]">STADIUM</p>
          <p class="font-bold text-slate-800 mt-0.5">${info.stadium_name || 'N/A'}</p>
          <p class="text-slate-500">${info.city || ''} (${info.capacity ? info.capacity.toLocaleString() : '-'} seats)</p>
        </div>
        <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p class="text-slate-400 font-bold uppercase text-[9px]">REFEREE</p>
          <p class="font-bold text-slate-800 mt-0.5">${info.referee_name || 'N/A'}</p>
          <p class="text-slate-500">${info.referee_country || ''} · ${info.avg_cards_per_match || 0} cards/match</p>
        </div>
        <div class="p-3 rounded-lg bg-amber-50 border border-amber-100">
          <p class="text-amber-700 font-bold uppercase text-[9px]">PLAYER OF THE MATCH</p>
          <p class="font-extrabold text-brand-navy mt-0.5">⭐ ${info.player_of_the_match_name || homeStat.player_of_the_match || 'N/A'}</p>
        </div>
      </div>

      <!-- Thống kê đối đầu (match_team_statistics) -->
      ${stats.length >= 2 ? `
        <div class="space-y-2 text-xs">
          <h4 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">TEAM STATISTICS</h4>
          <div class="grid grid-cols-3 text-center py-1.5 border-b border-slate-100 font-semibold">
            <span>${homeStat.possession_pct ?? 50}%</span>
            <span class="text-slate-400">Possession</span>
            <span>${awayStat.possession_pct ?? 50}%</span>
          </div>
          <div class="grid grid-cols-3 text-center py-1.5 border-b border-slate-100 font-semibold">
            <span>${homeStat.total_shots ?? 0} (${homeStat.shows_on_target ?? 0})</span>
            <span class="text-slate-400">Shots (On Target)</span>
            <span>${awayStat.total_shots ?? 0} (${awayStat.shows_on_target ?? 0})</span>
          </div>
          <div class="grid grid-cols-3 text-center py-1.5 border-b border-slate-100 font-semibold">
            <span>${homeStat.corners ?? 0}</span>
            <span class="text-slate-400">Corners</span>
            <span>${awayStat.corners ?? 0}</span>
          </div>
          <div class="grid grid-cols-3 text-center py-1.5 font-semibold">
            <span>${homeStat.fouls ?? 0}</span>
            <span class="text-slate-400">Fouls</span>
            <span>${awayStat.fouls ?? 0}</span>
          </div>
        </div>
      ` : ''}

      <!-- Dòng thời gian sự kiện (match_events) -->
      <div class="space-y-2">
        <h4 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">MATCH EVENTS (${events.length})</h4>
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          ${events.length ? events.map((ev) => `
            <div class="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
              <span class="font-extrabold text-brand-navy w-10 tabular-nums">${ev.minutee}'</span>
              <span class="font-semibold text-slate-800 flex-1">${ev.player_name || 'Player'} <span class="text-slate-400 font-normal">(${ev.team_name})</span></span>
              <span class="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold">${ev.event_type}</span>
            </div>
          `).join('') : `<p class="text-xs text-slate-400 italic">No match events recorded.</p>`}
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<p class="text-xs text-red-500">Lỗi tải chi tiết trận đấu.</p>`;
  }
}

// ==================== KHỞI TẠO SỰ KIỆN KHI TẢI TRANG ====================
document.addEventListener('DOMContentLoaded', () => {
  // Chuyển đổi menu ở Sidebar
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Nút Refresh ở Match Results
  document.getElementById('btn-refresh-matches').addEventListener('click', loadMatchesView);

  // Chuyển đổi Vòng đấu ở Tournament
  document.querySelectorAll('.stage-pill').forEach((pill) => {
    pill.addEventListener('click', async () => {
      document.querySelectorAll('.stage-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedStage = pill.dataset.stage;
      await updateTournamentContent();
    });
  });

  // Ô tìm kiếm Đội tuyển ở Team Stats
  document.getElementById('team-search-input').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q
      ? state.allTeams.filter((t) => t.team_name.toLowerCase().includes(q) || (t.fifa_code_name || '').toLowerCase().includes(q))
      : state.allTeams;
    renderTeamQuickPicks(filtered);
  });

  // Ô tìm kiếm Cầu thủ ở Player Stats
  let searchTimeout = null;
  document.getElementById('player-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadPlayersView(e.target.value);
    }, 250);
  });

  // Nút quay lại Bảng xếp hạng từ Player Detail
  document.getElementById('btn-back-leaderboard').addEventListener('click', () => {
    switchView('players');
  });

  // Đóng Modal Match Center
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    const modal = document.getElementById('match-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });

  // Mở màn hình mặc định
  switchView('matches');
});