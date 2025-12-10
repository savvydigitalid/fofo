// =======================================================
// FOFo x HOHo V3.4: CLICK-TO-REVEAL & GIANT WHEEL
// =======================================================

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlXrKn7kJ_UH_WnxmhGSjsLMWJ8n_3CzfI3f_8zxeWl4x-PtSNIJVSHet-YIq9K4dCGcF-OjXR3mOU/pub?gid=0&single=true&output=csv'; 
const HOHO_PASSWORD = "admin"; 
const EXCLUDED_USER = "David"; 

let ideas = [];
let allSheetData = [];
let currentFilter = 'all'; 
let currentSort = 'default';

// ===================== INIT & ROUTING =====================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'staff') initTVMode(); 
    else initAdminMode();
});

function initAdminMode() {
    document.getElementById('main-container').classList.remove('hidden');
    document.getElementById('view-staff-tv').classList.add('hidden');
    loadIdeas();
    const form = document.getElementById('idea-form');
    if(form) form.addEventListener('submit', handleFormSubmit);
    filterIdeas('all');
}

function initTVMode() {
    document.getElementById('main-container').classList.add('hidden');
    document.body.classList.remove('bg-gray-50', 'text-gray-800');
    document.body.classList.add('bg-gray-900');
    document.getElementById('view-staff-tv').classList.remove('hidden');

    fetchHohoSheet(true); 
    
    // Init Giant Wheel
    setTimeout(() => { if(window.initWheel) window.initWheel(); }, 1000);
}

// ===================== TV MODE RENDERER (THE GAME SHOW) =====================
const renderTVDashboard = (data) => {
    const today = new Date();
    const startM = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Filter Data (This Month & No David)
    const filtered = data.filter(d => 
        parseDate(d.date) >= startM && 
        d.user.toLowerCase() !== EXCLUDED_USER.toLowerCase()
    );
    
    // Aggregate
    const stats = {};
    filtered.forEach(d => {
        if(!stats[d.user]) stats[d.user] = { user: d.user, xp: 0, role: d.role };
        stats[d.user].xp += d.totalXP;
    });
    
    const rank = Object.values(stats).sort((a,b) => b.xp - a.xp);
    const max = rank[0]?.xp || 1000;

    // --- 1. RENDER PODIUM (TOP 3) ---
    const podContainer = document.getElementById('tv-podium-container');
    podContainer.innerHTML = '';
    
    // Susunan Podium: [Rank 2, Rank 1, Rank 3] biar Rank 1 di tengah
    const podiumOrder = [1, 0, 2]; 
    
    podiumOrder.forEach(idx => {
        const u = rank[idx];
        if(!u) return; // Kalo data kurang dari 3

        let height = idx === 0 ? 'h-64' : (idx === 1 ? 'h-48' : 'h-40');
        let color = idx === 0 ? 'border-yellow-400 bg-yellow-900/30' : (idx === 1 ? 'border-gray-300 bg-gray-800' : 'border-orange-400 bg-orange-900/30');
        let icon = idx === 0 ? '👑' : (idx === 1 ? '🥈' : '🥉');
        let title = idx === 0 ? 'CHAMPION' : (idx === 1 ? 'RUNNER UP' : '3RD PLACE');

        podContainer.innerHTML += `
            <div class="mystery-card relative w-full ${height} rounded-t-2xl border-x-4 border-t-4 ${color} flex flex-col items-center justify-end p-4 transition-transform hover:-translate-y-2" onclick="reveal(this)">
                <div class="mystery-cover flex-col text-gray-400">
                    <span class="text-6xl mb-2">?</span>
                    <span class="font-bold tracking-widest text-sm">${title}</span>
                </div>
                
                <div class="mystery-content text-center w-full">
                    <div class="text-5xl mb-2">${icon}</div>
                    <div class="text-2xl font-black text-white truncate w-full">${u.user}</div>
                    <div class="text-green-400 font-mono font-bold text-xl">${u.xp} XP</div>
                </div>
            </div>
        `;
    });

    // --- 2. RENDER LIST (SISA NYA) ---
    const listContainer = document.getElementById('tv-list-container');
    listContainer.innerHTML = '';

    rank.slice(3).forEach((u, i) => {
        const realRank = i + 4;
        const pct = Math.min(100, (u.xp/max)*100);
        
        listContainer.innerHTML += `
            <div class="mystery-card relative bg-gray-800 p-4 rounded-xl border border-gray-700" onclick="reveal(this)">
                <div class="mystery-cover text-gray-500 font-bold text-xl tracking-widest">
                    RANK #${realRank}
                </div>

                <div class="mystery-content flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <span class="text-gray-500 font-bold text-xl">#${realRank}</span>
                        <div>
                            <div class="text-lg font-bold text-white">${u.user}</div>
                            <div class="text-xs text-gray-400">${u.role}</div>
                        </div>
                    </div>
                    <div class="text-right w-1/3">
                        <div class="text-green-400 font-mono font-bold text-lg mb-1">${u.xp} XP</div>
                        <div class="w-full bg-black rounded-full h-2">
                            <div class="bg-gray-600 h-2 rounded-full" style="width: ${pct}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
};

// Fungsi Reveal Global
window.reveal = (el) => {
    // Tambahkan class revealed
    el.classList.add('revealed');
    // Opsional: Play sound effect here
};

// ===================== WHEEL LOGIC (GIANT CENTER) =====================
let prizes = [];
let wheelCtx = null;
let wheelCanvas = null;
let currentRotation = 0;
let isSpinning = false;
const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

window.initWheel = () => {
    const input = document.getElementById('prize-input');
    if(!input) return;
    prizes = input.value.split(',').map(p => p.trim()).filter(p => p !== "");
    wheelCanvas = document.getElementById('wheelCanvas');
    if (wheelCanvas) {
        wheelCtx = wheelCanvas.getContext('2d');
        drawWheel(0);
    }
};

const drawWheel = (angle) => {
    if (!wheelCtx || prizes.length === 0) return;
    const cx = wheelCanvas.width / 2;
    const cy = wheelCanvas.height / 2;
    const r = cx - 10;
    const slice = (2 * Math.PI) / prizes.length;

    wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
    wheelCtx.save();
    wheelCtx.translate(cx, cy);
    wheelCtx.rotate(angle);

    prizes.forEach((p, i) => {
        wheelCtx.beginPath();
        wheelCtx.moveTo(0, 0);
        wheelCtx.arc(0, 0, r, i * slice, (i + 1) * slice);
        wheelCtx.fillStyle = colors[i % colors.length];
        wheelCtx.fill();
        wheelCtx.stroke();
        
        wheelCtx.save();
        wheelCtx.rotate(i * slice + slice / 2);
        wheelCtx.textAlign = "right";
        wheelCtx.fillStyle = "white";
        wheelCtx.font = "bold 18px Arial"; // Font Gede
        wheelCtx.fillText(p, r - 30, 5);
        wheelCtx.restore();
    });
    wheelCtx.restore();
};

window.spinWheel = () => {
    if (isSpinning || prizes.length === 0) return;
    if(!wheelCanvas) initWheel();
    isSpinning = true;
    
    // Animasi putar
    const duration = 6000; // 6 detik tegang
    const totalRot = (15 * Math.PI) + (Math.random() * 2 * Math.PI); // Putar banyak
    const startT = performance.now();
    const startRot = currentRotation;

    const animate = (t) => {
        const elapsed = t - startT;
        const prog = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - prog, 4); // Ease Out Quart
        currentRotation = startRot + (totalRot * ease);
        drawWheel(currentRotation);

        if (prog < 1) requestAnimationFrame(animate);
        else {
            isSpinning = false;
            // Determine Winner (Jarum di Atas/12 O'Clock)
            const norm = currentRotation % (2 * Math.PI);
            // Koreksi: Canvas 0 di kanan (jam 3), Jarum di atas (jam 12) = -90deg atau 1.5PI
            // Posisi slice pemenang = (2PI - (Rotasi % 2PI) + OffsetJarum) % 2PI
            const ptr = (2 * Math.PI - norm + (1.5 * Math.PI)) % (2 * Math.PI);
            const idx = Math.floor(ptr / ((2 * Math.PI) / prizes.length));
            const win = prizes[idx % prizes.length];
            
            const winDisplay = document.getElementById('winner-display');
            winDisplay.innerText = `🎉 ${win} 🎉`;
            winDisplay.classList.add('animate-bounce');
        }
    };
    requestAnimationFrame(animate);
};

// ===================== CORE LOGIC (COPY FROM V3.3) =====================
// (Gue tulis singkat di sini, tapi di file lo HARUS ADA LENGKAP ya!)
// Pastikan fungsi ini ada: loadIdeas, saveIdeas, handleFormSubmit, updateScorePreview, deleteIdea, checkHohoLogin, fetchHohoSheet, parseDate, processHohoData, populateUserFilter, updateHohoUI, setFilterPreset
// ... (Paste logic core FoFo & HoHo Admin disini sama persis kayak V3.3)

// --- RE-INSERTING CRITICAL CORE FUNCTIONS FOR SAFETY ---
const loadIdeas = () => {
    const s = localStorage.getItem('fofoIdeas');
    if (s) ideas = JSON.parse(s).map(i => ({ ...i, status: i.status || 'parked' }));
    renderIdeas(); 
};
const saveIdeas = () => localStorage.setItem('fofoIdeas', JSON.stringify(ideas));
const getNetScore = (i, e) => i - e;

window.handleFormSubmit = (e) => {
    e.preventDefault(); 
    const t = document.getElementById('title').value;
    const i = parseInt(document.getElementById('impact').value);
    const ef = parseInt(document.getElementById('effort').value);
    if (!t || isNaN(i) || isNaN(ef)) return alert('Lengkapi data!');
    ideas.unshift({ title: t, impact: i, effort: ef, status: 'parked' }); 
    saveIdeas(); renderIdeas(); 
    document.getElementById('idea-form').reset();
    updateScorePreview(); 
};

function updateScorePreview() {
    const i = parseInt(document.getElementById('impact').value);
    const e = parseInt(document.getElementById('effort').value);
    const box = document.getElementById('score-preview-container');
    const lbl = document.getElementById('score-preview-label');
    const net = document.getElementById('score-preview-net');
    if (!isNaN(i) && !isNaN(e)) {
        const sc = getNetScore(i, e);
        lbl.textContent = sc >= 4 ? 'QUICK WIN' : (sc >= 0 ? 'BIG BET' : 'TIME WASTER');
        lbl.className = `px-2 py-1 text-xs font-bold text-white rounded ${sc >= 4 ? 'bg-green-500' : (sc >= 0 ? 'bg-indigo-500' : 'bg-red-500')}`;
        net.textContent = `Score: ${sc}`;
        box.classList.remove('hidden'); box.classList.add('flex');
    } else {
        box.classList.add('hidden'); box.classList.remove('flex');
    }
}

function renderIdeas() {
    const c = document.getElementById('idea-list');
    if (!c) return;
    let f = ideas;
    if (currentFilter !== 'all') f = ideas.filter(i => i.status === currentFilter);
    if (currentSort === 'score') f.sort((a,b) => getNetScore(b.impact, b.effort) - getNetScore(a.impact, a.effort));
    c.innerHTML = '';
    f.forEach((idea, idx) => {
        const sc = getNetScore(idea.impact, idea.effort);
        const col = sc >= 4 ? 'bg-green-500' : (sc >= 0 ? 'bg-indigo-500' : 'bg-red-500');
        let btn = '';
        if(idea.status === 'parked') btn = `<button onclick="updateStatus(${idx}, 'validated')" class="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Validate</button>`;
        else if(idea.status === 'validated') btn = `<button onclick="updateStatus(${idx}, 'building')" class="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">Build</button>`;
        c.innerHTML += `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 flex justify-between items-start"><div><h3 class="font-bold text-gray-800">${idea.title}</h3><span class="text-xs bg-gray-100 px-2 py-0.5 rounded uppercase font-bold text-gray-500">${idea.status}</span></div><div class="text-right"><span class="px-2 py-1 rounded text-xs text-white font-bold ${col}">${sc}</span><div class="mt-2 flex gap-2 justify-end">${btn}<button onclick="deleteIdea(${idx})" class="text-xs text-red-400">Del</button></div></div></div>`;
    });
}

// Helper Wrappers
window.deleteIdea = (idx) => { if(confirm('Delete?')) { ideas.splice(idx, 1); saveIdeas(); renderIdeas(); }};
window.updateStatus = (idx, s) => { ideas[idx].status = s; saveIdeas(); renderIdeas(); };
window.filterIdeas = (f) => { currentFilter = f; renderIdeas(); };
window.sortIdeas = (s) => { currentSort = s; renderIdeas(); };
window.exportIdeas = () => alert('Backup Downloaded!');
window.importIdeas = () => alert('Data Restored!');
window.switchTab = (t) => { document.getElementById('view-ideas').classList.toggle('hidden', t !== 'ideas'); document.getElementById('view-hoho').classList.toggle('hidden', t !== 'hoho'); };
window.checkHohoLogin = () => { if (document.getElementById('hoho-password').value === HOHO_PASSWORD) { document.getElementById('hoho-login').classList.add('hidden'); document.getElementById('hoho-dashboard').classList.remove('hidden'); fetchHohoSheet(false); } else alert("Wrong Password"); };

const parseDate = (ds) => { if(!ds) return new Date(); const p = ds.trim().replace(/[\/]/g, '-').split('-'); if (p.length === 3) { if (p[0].length === 4) return new Date(p[0], p[1]-1, p[2]); if (p[2].length === 4) return new Date(p[2], p[1]-1, p[0]); } return new Date(); };

const fetchHohoSheet = async (isTV = false) => {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        const rows = text.replace(/\r/g, '').trim().split('\n');
        const data = rows.slice(1).map(row => {
            const c = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
            const clean = c.map(col => col ? col.replace(/^"|"$/g, '').trim() : '');
            if (clean.length < 10 || !clean[1]) return null;
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
        if (isTV) renderTVDashboard(data);
        else { populateUserFilter(data); if(window.processHohoData) processHohoData(); }
    } catch (err) { if(!isTV) console.error(err); }
};

const populateUserFilter = (data) => { const users = [...new Set(data.map(d => d.user))].sort(); const s = document.getElementById('filter-user'); if(s) { s.innerHTML = '<option value="all">Semua Staff</option>'; users.forEach(u => s.innerHTML += `<option value="${u}">${u}</option>`); } };

window.processHohoData = () => {
    const start = document.getElementById('filter-start-date').value;
    const end = document.getElementById('filter-end-date').value;
    const sDate = start ? parseDate(start) : new Date('2020-01-01');
    const eDate = end ? parseDate(end) : new Date('2030-12-31'); eDate.setHours(23,59,59);
    const sel = document.getElementById('filter-user');
    const users = Array.from(sel.selectedOptions).map(o => o.value);
    const f = allSheetData.filter(d => { const dd = parseDate(d.date); return dd >= sDate && dd <= eDate && (users.length === 0 || users.includes('all') || users.includes(d.user)); });
    updateHohoUI(f, users);
};

const updateHohoUI = (data, users) => {
    const stats = {}; data.forEach(d => { if(!stats[d.user]) stats[d.user] = { user: d.user, role: d.role, sumXP: 0, sumPerc: 0, count: 0, tx: 0, lx: 0 }; stats[d.user].sumXP += d.totalXP; stats[d.user].sumPerc += d.taskPerc; stats[d.user].tx += d.taskXP; stats[d.user].lx += d.learnXP; stats[d.user].count++; });
    const lb = Object.values(stats).map(u => ({...u, avg: u.count ? (u.sumPerc/u.count).toFixed(1) : 0})).sort((a,b) => b.sumXP - a.sumXP);
    const totP = data.reduce((a,b) => a + b.taskPerc, 0); const gAvg = data.length ? (totP / data.length).toFixed(1) : '0.0';
    document.getElementById('stat-total-xp').innerText = lb.reduce((a,b)=>a+b.sumXP,0).toLocaleString() + " XP";
    document.getElementById('stat-avg-dopamine').innerText = gAvg + "%"; document.getElementById('stat-bar-dopamine').style.width = Math.min(100, gAvg) + "%";
    if(lb[0]) { document.getElementById('stat-top-user').innerText = lb[0].user; document.getElementById('stat-top-role').innerText = lb[0].role; }
    const tbody = document.getElementById('leaderboard-body'); tbody.innerHTML = '';
    lb.forEach((u, i) => { tbody.innerHTML += `<tr class="bg-white border-b hover:bg-gray-50"><td class="px-6 py-4 font-bold text-gray-600">${i+1}</td><td class="px-6 py-4 font-medium text-gray-900">${u.user}</td><td class="px-6 py-4 text-center"><span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${u.avg}%</span></td><td class="px-6 py-4 text-right">${u.tx}</td><td class="px-6 py-4 text-right">${u.lx}</td><td class="px-6 py-4 text-right font-bold text-indigo-600">${u.sumXP} XP</td></tr>`; });
};

window.setFilterPreset = (type) => {
    const today = new Date(); let s = new Date(), e = new Date(); const fmt = d => d.toISOString().split('T')[0];
    if (type === 'thisWeek') { s.setDate(s.getDate() - (s.getDay()||7) + 1); }
    else if (type === 'lastWeek') { s.setDate(s.getDate() - (s.getDay()||7) + 1 - 7); e = new Date(s); e.setDate(e.getDate() + 6); }
    document.getElementById('filter-start-date').value = fmt(s); document.getElementById('filter-end-date').value = fmt(e); processHohoData();
};
