// =======================================================
// FOFo x HOHo V4.0: CLEAN SLATE FIX
// =======================================================

// --- CONFIGURATION ---
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlXrKn7kJ_UH_WnxmhGSjsLMWJ8n_3CzfI3f_8zxeWl4x-PtSNIJVSHet-YIq9K4dCGcF-OjXR3mOU/pub?gid=0&single=true&output=csv'; 
const HOHO_PASSWORD = "admin"; 

// --- STATE ---
let ideas = [];
let allSheetData = [];
let chartInstanceComp = null;
let chartInstanceTrend = null;
let currentFilter = 'all'; 
let currentSort = 'default';

// =======================================================
// 1. INIT & ROUTING
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    // Cek URL Parameter (?mode=staff)
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    if (mode === 'staff') {
        initTVMode(); 
    } else {
        initAdminMode(); 
    }
});

function initAdminMode() {
    // Show Main Container
    const mainContainer = document.getElementById('main-container');
    if(mainContainer) mainContainer.classList.remove('hidden');
    
    // Load Data FoFo
    loadIdeas();
    
    // Attach Listeners FoFo
    const form = document.getElementById('idea-form');
    if(form) form.addEventListener('submit', handleFormSubmit);
    
    const impactInput = document.getElementById('impact');
    if(impactInput) impactInput.addEventListener('input', updateScorePreview);
    
    const effortInput = document.getElementById('effort');
    if(effortInput) effortInput.addEventListener('input', updateScorePreview);

    // Default Tab
    filterIdeas('all');
}

function initTVMode() {
    // Hide Main, Show TV
    document.getElementById('main-container').classList.add('hidden');
    document.body.classList.remove('bg-gray-50', 'text-gray-800');
    document.body.classList.add('bg-gray-900');
    
    const tvContainer = document.getElementById('view-staff-tv');
    tvContainer.classList.remove('hidden');
    tvContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-screen"><h1 class="text-6xl font-bold text-green-400 mb-4">HOHO ARENA</h1><p class="text-xl">Loading Live Data...</p></div>`;

    // Fetch Data for TV
    fetchHohoSheet(true);
    setInterval(() => fetchHohoSheet(true), 300000); // 5 min refresh
}

// =======================================================
// 2. FOFo LOGIC (IDEAS)
// =======================================================
function loadIdeas() {
    const storedIdeas = localStorage.getItem('fofoIdeas');
    if (storedIdeas) {
        ideas = JSON.parse(storedIdeas).map(idea => ({ ...idea, status: idea.status || 'parked' }));
    }
    renderIdeas(); 
}

function saveIdeas() {
    localStorage.setItem('fofoIdeas', JSON.stringify(ideas));
}

function getNetScore(impact, effort) {
    return impact - effort;
}

function handleFormSubmit(event) {
    event.preventDefault(); 
    const title = document.getElementById('title').value;
    const impact = parseInt(document.getElementById('impact').value);
    const effort = parseInt(document.getElementById('effort').value);

    if (!title || isNaN(impact) || isNaN(effort)) {
        alert('Mohon lengkapi Judul, Impact, dan Effort!');
        return;
    }
    ideas.unshift({ title, impact, effort, status: 'parked' }); 
    saveIdeas(); renderIdeas(); 
    document.getElementById('idea-form').reset();
    updateScorePreview(); 
}

function updateScorePreview() {
    const impact = parseInt(document.getElementById('impact').value);
    const effort = parseInt(document.getElementById('effort').value);
    const container = document.getElementById('score-preview-container');
    const label = document.getElementById('score-preview-label');
    const net = document.getElementById('score-preview-net');

    if (!isNaN(impact) && !isNaN(effort)) {
        const score = getNetScore(impact, effort);
        let txt = score >= 4 ? 'QUICK WIN' : (score >= 0 ? 'BIG BET' : 'TIME WASTER');
        let col = score >= 4 ? 'bg-green-500' : (score >= 0 ? 'bg-indigo-500' : 'bg-red-500');
        
        label.textContent = txt;
        label.className = `px-2 py-1 text-xs font-bold text-white rounded ${col}`;
        net.textContent = `Score: ${score}`;
        container.classList.remove('hidden'); container.classList.add('flex');
    } else {
        container.classList.add('hidden'); container.classList.remove('flex');
    }
}

function renderIdeas() {
    const listContainer = document.getElementById('idea-list');
    if (!listContainer) return;
    
    let filtered = ideas;
    if (currentFilter !== 'all') filtered = ideas.filter(i => i.status === currentFilter);
    
    if(currentSort === 'score') {
        filtered.sort((a,b) => getNetScore(b.impact, b.effort) - getNetScore(a.impact, a.effort));
    }

    listContainer.innerHTML = '';
    filtered.forEach((idea, index) => {
        const score = getNetScore(idea.impact, idea.effort);
        let badgeColor = score >= 4 ? 'bg-green-500' : (score >= 0 ? 'bg-indigo-500' : 'bg-red-500');
        
        const card = document.createElement('div');
        card.className = "bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start";
        card.innerHTML = `
            <div>
                <h3 class="font-bold text-gray-800">${idea.title}</h3>
                <span class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold uppercase mt-1 inline-block">${idea.status}</span>
            </div>
            <div class="text-right">
                <span class="px-2 py-1 rounded text-xs text-white font-bold ${badgeColor}">${score}</span>
                <button onclick="deleteIdea('${idea.title}')" class="block text-xs text-red-400 mt-2 hover:text-red-600">Hapus</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// Helper Wrappers for Window Scope
window.deleteIdea = (title) => {
    if(confirm('Hapus ide ini?')) {
        ideas = ideas.filter(i => i.title !== title);
        saveIdeas(); renderIdeas();
    }
};
window.filterIdeas = (f) => { 
    currentFilter = f; 
    document.querySelectorAll('[id^="filter-"]').forEach(b => {
        b.className = b.id === `filter-${f}` ? "px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-bold shadow-md" : "px-3 py-1 bg-gray-200 rounded-full text-xs font-bold";
    });
    renderIdeas(); 
};
window.sortIdeas = (s) => { currentSort = s; renderIdeas(); };
window.exportIdeas = () => { /* ... export logic ... */ alert('Exported!'); };
window.importIdeas = () => { /* ... import logic ... */ alert('Imported!'); };


// =======================================================
// 3. HOHO LOGIC (DASHBOARD)
// =======================================================
window.switchTab = (tab) => {
    const ideasView = document.getElementById('view-ideas');
    const hohoView = document.getElementById('view-hoho');
    
    if(tab === 'ideas') {
        ideasView.classList.remove('hidden');
        hohoView.classList.add('hidden');
        // Style Buttons
        document.getElementById('tab-ideas').classList.add('bg-indigo-600', 'text-white');
        document.getElementById('tab-ideas').classList.remove('text-gray-500');
        document.getElementById('tab-hoho').classList.remove('bg-indigo-600', 'text-white');
        document.getElementById('tab-hoho').classList.add('text-gray-500');
    } else {
        ideasView.classList.add('hidden');
        hohoView.classList.remove('hidden');
        // Style Buttons
        document.getElementById('tab-hoho').classList.add('bg-indigo-600', 'text-white');
        document.getElementById('tab-hoho').classList.remove('text-gray-500');
        document.getElementById('tab-ideas').classList.remove('bg-indigo-600', 'text-white');
        document.getElementById('tab-ideas').classList.add('text-gray-500');
    }
};

window.checkHohoLogin = () => {
    const pass = document.getElementById('hoho-password').value;
    if (pass === HOHO_PASSWORD) {
        document.getElementById('hoho-login').classList.add('hidden');
        document.getElementById('hoho-dashboard').classList.remove('hidden');
        fetchHohoSheet(false);
    } else {
        alert("Password Salah!");
    }
};

const parseDate = (dateStr) => {
    if(!dateStr) return new Date();
    const parts = dateStr.trim().replace(/[\/]/g, '-').split('-');
    if (parts.length === 3) {
        if (parts[0].length === 4) return new Date(parts[0], parts[1]-1, parts[2]); // YYYY-MM-DD
        if (parts[2].length === 4) return new Date(parts[2], parts[1]-1, parts[0]); // DD-MM-YYYY
    }
    return new Date();
};

const fetchHohoSheet = async (isTV = false) => {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        const rows = text.replace(/\r/g, '').trim().split('\n');
        
        const data = rows.slice(1).map(row => {
            // Regex split handling quotes
            const c = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',');
            const clean = c.map(col => col ? col.replace(/^"|"$/g, '').trim() : '');
            
            if (clean.length < 10 || !clean[1]) return null;

            // MAPPING SESUAI REQUEST: 
            // 1=User, 3=Date, 4=Task%, 5=TaskXP, 9=LearnXP
            return {
                date: clean[3] || '',
                user: clean[1],
                role: clean[2] || 'Staff',
                taskPerc: parseFloat(clean[4]) || 0,
                taskXP: parseInt(clean[5]) || 0,
                learnXP: parseInt(clean[9]) || 0,
                totalXP: (parseInt(clean[5]) || 0) + (parseInt(clean[9]) || 0)
            };
        }).filter(i => i !== null);

        allSheetData = data;

        if (isTV) {
            renderTVDashboard(data); // TV MODE
        } else {
            populateUserFilter(data); // ADMIN MODE
            if(window.processHohoData) processHohoData();
        }
        console.log("HoHo Data Loaded:", data.length, "rows");
    } catch (err) {
        console.error(err);
        if(!isTV) alert("Gagal Fetch CSV.");
    }
};

const populateUserFilter = (data) => {
    const users = [...new Set(data.map(d => d.user))].sort();
    const select = document.getElementById('filter-user');
    if(select) {
        select.innerHTML = '<option value="all">Semua Staff</option>';
        users.forEach(u => select.innerHTML += `<option value="${u}">${u}</option>`);
    }
};

window.processHohoData = () => {
    const startEl = document.getElementById('filter-start-date');
    const endEl = document.getElementById('filter-end-date');
    
    // Default date if empty
    const startDate = startEl.value ? new Date(startEl.value) : new Date('2020-01-01');
    const endDate = endEl.value ? new Date(endEl.value) : new Date('2030-12-31');
    endDate.setHours(23,59,59);

    const select = document.getElementById('filter-user');
    const selectedUsers = Array.from(select.selectedOptions).map(o => o.value);

    const filtered = allSheetData.filter(d => {
        const dDate = parseDate(d.date);
        const dateMatch = dDate >= startDate && dDate <= endDate;
        const userMatch = selectedUsers.length === 0 || selectedUsers.includes('all') || selectedUsers.includes(d.user);
        return dateMatch && userMatch;
    });

    updateHohoUI(filtered, selectedUsers);
};

window.setFilterPreset = (type) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    // Helper Format YYYY-MM-DD
    const fmt = (d) => d.toISOString().split('T')[0];

    if (type === 'thisWeek') {
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day + 1);
    } else if (type === 'lastWeek') {
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day + 1 - 7);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
    } else if (type === 'thisMonth') {
        start.setDate(1);
    }

    document.getElementById('filter-start-date').value = fmt(start);
    document.getElementById('filter-end-date').value = fmt(end);
    processHohoData();
};

const updateHohoUI = (data, selectedUsers) => {
    // Aggregations
    const userStats = {};
    data.forEach(d => {
        if(!userStats[d.user]) userStats[d.user] = { user: d.user, role: d.role, sumXP: 0, sumPerc: 0, count: 0, tx: 0, lx: 0 };
        userStats[d.user].sumXP += d.totalXP;
        userStats[d.user].sumPerc += d.taskPerc;
        userStats[d.user].tx += d.taskXP;
        userStats[d.user].lx += d.learnXP;
        userStats[d.user].count++;
    });

    const leaderboard = Object.values(userStats)
        .map(u => ({...u, avg: u.count ? (u.sumPerc/u.count).toFixed(1) : 0}))
        .sort((a,b) => b.sumXP - a.sumXP);

    // Update Cards
    const totalXP = leaderboard.reduce((a,b) => a + b.sumXP, 0);
    document.getElementById('stat-total-xp').innerText = totalXP.toLocaleString() + " XP";
    
    // Render Table
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    leaderboard.forEach((u, i) => {
        let icon = i===0?'👑':(i===1?'🥈':(i===2?'🥉':`#${i+1}`));
        tbody.innerHTML += `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-6 py-4 font-bold text-gray-600">${icon}</td>
                <td class="px-6 py-4 font-medium text-gray-900">${u.user} <span class="text-xs block text-gray-400">${u.role}</span></td>
                <td class="px-6 py-4 text-center"><span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${u.avg}%</span></td>
                <td class="px-6 py-4 text-right">${u.tx}</td>
                <td class="px-6 py-4 text-right">${u.lx}</td>
                <td class="px-6 py-4 text-right font-bold text-indigo-600">${u.sumXP} XP</td>
            </tr>`;
    });

    // Render Charts (Simplified for stability)
    renderCharts(leaderboard.slice(0, 10));
};

const renderCharts = (topUsers) => {
    const ctx1 = document.getElementById('chart-comparison');
    if(ctx1 && topUsers.length > 0) {
        if(chartInstanceComp) chartInstanceComp.destroy();
        chartInstanceComp = new Chart(ctx1.getContext('2d'), {
            type: 'bar',
            data: {
                labels: topUsers.map(u => u.user),
                datasets: [{ label: 'Total XP', data: topUsers.map(u => u.sumXP), backgroundColor: '#4f46e5' }]
            }
        });
    }
};

// =======================================================
// 4. TV MODE RENDERER
// =======================================================
const renderTVDashboard = (data) => {
    const container = document.getElementById('view-staff-tv');
    
    // Filter Bulan Ini
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const filtered = data.filter(d => parseDate(d.date) >= startOfMonth);

    // Aggregasi
    const stats = {};
    filtered.forEach(d => {
        if(!stats[d.user]) stats[d.user] = { user: d.user, xp: 0 };
        stats[d.user].xp += d.totalXP;
    });
    
    const rank = Object.values(stats).sort((a,b) => b.xp - a.xp);
    const maxXP = rank[0]?.xp || 1000;

    let html = `
    <div class="h-screen flex flex-col p-8">
        <div class="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
            <h1 class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">HOHO ARENA</h1>
            <div class="text-right text-gray-400 font-mono text-xl">LIVE TRACKER</div>
        </div>
        
        <div class="grid grid-cols-3 gap-8 h-full">
            <div class="col-span-1 space-y-4">
                <h2 class="text-2xl font-bold text-yellow-400 mb-4 uppercase">👑 Kings of the Month</h2>
                ${rank.slice(0,3).map((u,i) => `
                    <div class="bg-gray-800 p-6 rounded-2xl border-2 ${i===0?'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)]':'border-gray-600'} flex items-center">
                        <div class="text-5xl mr-4">${i===0?'🥇':(i===1?'🥈':'🥉')}</div>
                        <div>
                            <div class="text-2xl font-bold text-white">${u.user}</div>
                            <div class="text-xl text-green-400 font-mono">${u.xp} XP</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="col-span-2 bg-gray-800 rounded-3xl p-6 border border-gray-700 overflow-y-auto">
                <h2 class="text-2xl font-bold text-green-400 mb-6 uppercase">Squad Rankings</h2>
                <div class="space-y-4">
                    ${rank.map((u,i) => {
                        const pct = (u.xp / maxXP) * 100;
                        const color = pct > 80 ? 'bg-green-500' : (pct > 50 ? 'bg-yellow-500' : 'bg-gray-600');
                        return `
                        <div>
                            <div class="flex justify-between text-white mb-1 font-bold">
                                <span>#${i+1} ${u.user}</span>
                                <span>${u.xp} XP</span>
                            </div>
                            <div class="w-full bg-gray-900 rounded-full h-4">
                                <div class="${color} h-4 rounded-full transition-all duration-1000" style="width: ${pct}%"></div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>
    </div>`;
    
    container.innerHTML = html;
};
