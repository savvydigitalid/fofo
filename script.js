// =======================================================
// FOFo x HOHo V3.5: PHOTOS & FIXED ADMIN DATA
// =======================================================

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlXrKn7kJ_UH_WnxmhGSjsLMWJ8n_3CzfI3f_8zxeWl4x-PtSNIJVSHet-YIq9K4dCGcF-OjXR3mOU/pub?gid=0&single=true&output=csv'; 
const HOHO_PASSWORD = "admin"; 
const EXCLUDED_USER = "David"; 

// --- CONFIG FOTO STAFF (Isi URL Foto disini) ---
// Kalau nama staff ada di sini, fotonya muncul. Kalau gak, pake inisial.
const STAFF_PHOTOS = {
    "David": "https://ui-avatars.com/api/?name=David&background=random", 
    "Setyaningrum": "https://ui-avatars.com/api/?name=Setyaningrum&background=random", 
    // "Nama Staff": "Link Foto",
};

let ideas = [];
let allSheetData = [];
let chartInstanceComp = null;
let chartInstanceTrend = null;
let currentFilter = 'all'; 
let currentSort = 'default';

// ===================== INIT =====================
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
    setInterval(() => fetchHohoSheet(true), 300000);
    setTimeout(() => { if(window.initWheel) window.initWheel(); }, 1000);
}

// ===================== FOFO LOGIC (Singkat) =====================
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
    if (!t || isNaN(i) || isNaN(ef)) return alert('Lengkapi!');
    ideas.unshift({ title: t, impact: i, effort: ef, status: 'parked' }); 
    saveIdeas(); renderIdeas(); 
    document.getElementById('idea-form').reset();
};

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
        c.innerHTML += `<div class="bg-white p-4 rounded-xl shadow-sm border mb-3 flex justify-between"><div><h3 class="font-bold">${idea.title}</h3><span class="text-xs bg-gray-100 px-2 rounded">${idea.status}</span></div><div class="text-right"><span class="px-2 rounded text-white text-xs ${col}">${sc}</span><button onclick="deleteIdea(${idx})" class="block text-xs text-red-400 mt-1">Del</button></div></div>`;
    });
}
window.deleteIdea = (idx) => { if(confirm('Del?')) { ideas.splice(idx, 1); saveIdeas(); renderIdeas(); }};
window.filterIdeas = (f) => { currentFilter = f; renderIdeas(); };
window.sortIdeas = (s) => { currentSort = s; renderIdeas(); };
window.exportIdeas = () => alert('Backup!'); window.importIdeas = () => alert('Restored!');

// ===================== HOHO LOGIC (FIXED) =====================
window.switchTab = (t) => {
    document.getElementById('view-ideas').classList.toggle('hidden', t !== 'ideas');
    document.getElementById('view-hoho').classList.toggle('hidden', t !== 'hoho');
};

window.checkHohoLogin = () => {
    if (document.getElementById('hoho-password').value === HOHO_PASSWORD) {
        document.getElementById('hoho-login').classList.add('hidden');
        document.getElementById('hoho-dashboard').classList.remove('hidden');
        // FORCE FETCH DATA
        fetchHohoSheet(false);
    } else alert("Salah Password");
};

const parseDate = (ds) => {
    if(!ds) return new Date();
    const p = ds.trim().replace(/[\/]/g, '-').split('-');
    if (p.length === 3) {
        if (p[0].length === 4) return new Date(p[0], p[1]-1, p[2]);
        if (p[2].length === 4) return new Date(p[2], p[1]-1, p[0]);
    }
    return new Date();
};

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
                date: clean[3] || '', user: clean[1], role: clean[2] || 'Staff',
                taskPerc: parseFloat(clean[4]) || 0, taskXP: parseInt(clean[5]) || 0,
                learnXP: parseInt(clean[9]) || 0, totalXP: (parseInt(clean[5]) || 0) + (parseInt(clean[9]) || 0)
            };
        }).filter(i => i !== null);

        allSheetData = data;

        if (isTV) renderTVDashboard(data);
        else {
            populateUserFilter(data);
            if(document.getElementById('hoho-dashboard').classList.contains('hidden') === false) {
                processHohoData(); // Auto process if dashboard visible
            }
        }
    } catch (err) { if(!isTV) console.error(err); }
};

const populateUserFilter = (data) => {
    const users = [...new Set(data.map(d => d.user))].sort();
    const s = document.getElementById('filter-user');
    if(s) { s.innerHTML = '<option value="all">Semua Staff</option>'; users.forEach(u => s.innerHTML += `<option value="${u}">${u}</option>`); }
};

window.processHohoData = () => {
    const start = document.getElementById('filter-start-date').value;
    const end = document.getElementById('filter-end-date').value;
    const sDate = start ? parseDate(start) : new Date('2020-01-01');
    const eDate = end ? parseDate(end) : new Date('2030-12-31'); eDate.setHours(23,59,59);
    
    const sel = document.getElementById('filter-user');
    const users = Array.from(sel.selectedOptions).map(o => o.value);

    const f = allSheetData.filter(d => { 
        const dd = parseDate(d.date); 
        return dd >= sDate && dd <= eDate && (users.length === 0 || users.includes('all') || users.includes(d.user)); 
    });
    updateHohoUI(f);
};

// Helper Foto Avatar
const getAvatar = (name) => {
    // Kalau ada di config, pake foto. Kalau gak, pake inisial UI Avatars.
    const url = STAFF_PHOTOS[name] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
    return `<img src="${url}" class="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover">`;
};

const updateHohoUI = (data) => {
    const stats = {}; data.forEach(d => { if(!stats[d.user]) stats[d.user] = { user: d.user, role: d.role, sumXP: 0, sumPerc: 0, count: 0, tx: 0, lx: 0 }; stats[d.user].sumXP += d.totalXP; stats[d.user].sumPerc += d.taskPerc; stats[d.user].tx += d.taskXP; stats[d.user].lx += d.learnXP; stats[d.user].count++; });
    const lb = Object.values(stats).map(u => ({...u, avg: u.count ? (u.sumPerc/u.count).toFixed(1) : 0})).sort((a,b) => b.sumXP - a.sumXP);
    
    // Cards
    document.getElementById('stat-total-xp').innerText = lb.reduce((a,b)=>a+b.sumXP,0).toLocaleString() + " XP";
    const totP = data.reduce((a,b) => a + b.taskPerc, 0); 
    document.getElementById('stat-avg-dopamine').innerText = (data.length ? (totP / data.length).toFixed(1) : '0') + "%";
    if(lb[0]) { document.getElementById('stat-top-user').innerText = lb[0].user; document.getElementById('stat-top-role').innerText = lb[0].role; }

    // Table
    const tbody = document.getElementById('leaderboard-body'); tbody.innerHTML = '';
    lb.forEach((u, i) => { tbody.innerHTML += `<tr class="bg-white border-b hover:bg-gray-50"><td class="px-6 py-4 font-bold text-gray-600">${i+1}</td><td class="px-6 py-4 flex items-center gap-3">${getAvatar(u.user)} <div><div class="font-bold text-gray-900">${u.user}</div><div class="text-xs text-gray-400">${u.role}</div></div></td><td class="px-6 py-4 text-center"><span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${u.avg}%</span></td><td class="px-6 py-4 text-right">${u.tx}</td><td class="px-6 py-4 text-right">${u.lx}</td><td class="px-6 py-4 text-right font-bold text-indigo-600">${u.sumXP} XP</td></tr>`; });
};

window.setFilterPreset = (type) => { /* Logic Preset Mingguan (Sama kayak V3.3) */ 
    const today = new Date(); let s = new Date(), e = new Date(); const fmt = d => d.toISOString().split('T')[0];
    if (type === 'thisWeek') { s.setDate(s.getDate() - (s.getDay()||7) + 1); }
    else if (type === 'lastWeek') { s.setDate(s.getDate() - (s.getDay()||7) + 1 - 7); e = new Date(s); e.setDate(e.getDate() + 6); }
    document.getElementById('filter-start-date').value = fmt(s); document.getElementById('filter-end-date').value = fmt(e); processHohoData();
};

// ===================== TV MODE RENDERER =====================
const renderTVDashboard = (data) => {
    const today = new Date();
    const startM = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Filter + Exclude David
    const filtered = data.filter(d => 
        parseDate(d.date) >= startM && 
        d.user.toLowerCase() !== EXCLUDED_USER.toLowerCase()
    );
    
    const stats = {};
    filtered.forEach(d => {
        if(!stats[d.user]) stats[d.user] = { user: d.user, xp: 0, role: d.role, sumPerc: 0, count: 0 };
        stats[d.user].xp += d.totalXP;
        stats[d.user].sumPerc += d.taskPerc;
        stats[d.user].count++;
    });
    
    const rank = Object.values(stats)
        .map(u => ({...u, avg: u.count ? (u.sumPerc/u.count).toFixed(0) : 0}))
        .sort((a,b) => b.xp - a.xp);
        
    const max = rank[0]?.xp || 1000;

    // 1. PODIUM (TOP 3)
    const podContainer = document.getElementById('tv-top3-container');
    if(podContainer) {
        podContainer.innerHTML = '';
        const order = [1, 0, 2]; // 2, 1, 3
        order.forEach(idx => {
            const u = rank[idx];
            if(!u) return;
            let h = idx === 0 ? 'h-64' : (idx === 1 ? 'h-48' : 'h-40');
            let b = idx === 0 ? 'border-yellow-400 bg-yellow-900/40' : (idx === 1 ? 'border-gray-400 bg-gray-800' : 'border-orange-500 bg-orange-900/40');
            let icon = idx === 0 ? '👑' : (idx === 1 ? '🥈' : '🥉');
            
            // Get Large Avatar for TV
            const avatarUrl = STAFF_PHOTOS[u.user] || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.user)}&background=random&size=128&bold=true`;

            podContainer.innerHTML += `
                <div class="mystery-card relative w-full ${h} rounded-t-2xl border-x-4 border-t-4 ${b} flex flex-col items-center justify-end p-4 transition hover:-translate-y-2" onclick="reveal(this)">
                    <div class="mystery-cover flex-col text-gray-400">
                        <span class="text-5xl mb-2">?</span>
                        <span class="font-bold tracking-widest text-xs uppercase">RANK ${idx+1}</span>
                    </div>
                    <div class="mystery-content text-center w-full flex flex-col items-center">
                        <img src="${avatarUrl}" class="w-16 h-16 rounded-full border-4 border-white mb-2 shadow-lg object-cover">
                        <div class="text-xl font-black text-white truncate w-full">${u.user}</div>
                        <div class="text-green-400 font-mono font-bold">${u.xp} XP</div>
                    </div>
                </div>`;
        });
    }

    // 2. LIST (REVEAL + AVATAR + AVG %)
    const listContainer = document.getElementById('tv-list-container');
    if(listContainer) {
        listContainer.innerHTML = '';
        rank.slice(3).forEach((u, i) => {
            const pct = Math.min(100, (u.xp/max)*100);
            const avatarUrl = STAFF_PHOTOS[u.user] || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.user)}&background=random&size=64`;
            
            listContainer.innerHTML += `
                <div class="mystery-card relative bg-gray-800 p-3 rounded-xl border border-gray-700" onclick="reveal(this)">
                    <div class="mystery-cover text-gray-500 font-bold text-lg tracking-widest">RANK #${i+4}</div>
                    <div class="mystery-content flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-gray-500 font-bold w-6">#${i+4}</span>
                            <img src="${avatarUrl}" class="w-10 h-10 rounded-full border border-gray-500 object-cover">
                            <div>
                                <div class="font-bold text-white text-sm">${u.user}</div>
                                <div class="text-[10px] text-gray-400 flex gap-2">
                                    <span>${u.role}</span>
                                    <span class="text-blue-400 font-bold">• ${u.avg}% Task</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right w-1/3">
                            <div class="text-green-400 font-mono font-bold text-sm mb-1">${u.xp} XP</div>
                            <div class="w-full bg-black rounded-full h-1.5">
                                <div class="bg-gray-500 h-1.5 rounded-full" style="width: ${pct}%"></div>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    }
};

window.reveal = (el) => { el.classList.add('revealed'); };

// Wheel Logic (Sama kayak V3.4)
let prizes = [], wheelCtx, wheelCanvas, currentRotation = 0, isSpinning = false;
window.initWheel = () => { /* ... Paste Wheel Logic V3.4 Disini ... */ };
const drawWheel = (a) => { /* ... */ };
window.spinWheel = () => { /* ... */ };
// (Note: Jangan lupa paste fungsi Wheel lengkapnya dari kode V3.4 biar rodanya muter!)
// SAYA PASTE DISINI BIAR LO GAK BINGUNG
window.initWheel = () => {
    const input = document.getElementById('prize-input');
    if(!input) return;
    prizes = input.value.split(',').map(p => p.trim()).filter(p => p !== "");
    wheelCanvas = document.getElementById('wheelCanvas');
    if (wheelCanvas) { wheelCtx = wheelCanvas.getContext('2d'); drawWheel(0); }
};
const drawWheel = (angle) => {
    if (!wheelCtx || prizes.length === 0) return;
    const cx = 250, cy = 250, r = 240, slice = (2 * Math.PI) / prizes.length; // Ukuran disesuaikan Canvas 500
    const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    wheelCtx.clearRect(0, 0, 500, 500);
    wheelCtx.save(); wheelCtx.translate(cx, cy); wheelCtx.rotate(angle);
    prizes.forEach((p, i) => {
        wheelCtx.beginPath(); wheelCtx.moveTo(0, 0); wheelCtx.arc(0, 0, r, i * slice, (i + 1) * slice);
        wheelCtx.fillStyle = colors[i % colors.length]; wheelCtx.fill(); wheelCtx.stroke();
        wheelCtx.save(); wheelCtx.rotate(i * slice + slice / 2); wheelCtx.textAlign = "right";
        wheelCtx.fillStyle = "white"; wheelCtx.font = "bold 18px Arial"; wheelCtx.fillText(p, r - 30, 5); wheelCtx.restore();
    });
    wheelCtx.restore();
};
window.spinWheel = () => {
    if (isSpinning || prizes.length === 0) return;
    if(!wheelCanvas) initWheel();
    isSpinning = true;
    const duration = 6000, totalRot = (15 * Math.PI) + (Math.random() * 2 * Math.PI);
    const startT = performance.now(), startRot = currentRotation;
    const animate = (t) => {
        const prog = Math.min((t - startT) / duration, 1);
        const ease = 1 - Math.pow(1 - prog, 4);
        currentRotation = startRot + (totalRot * ease);
        drawWheel(currentRotation);
        if (prog < 1) requestAnimationFrame(animate);
        else {
            isSpinning = false;
            const norm = currentRotation % (2 * Math.PI);
            const ptr = (2 * Math.PI - norm + (1.5 * Math.PI)) % (2 * Math.PI);
            const idx = Math.floor(ptr / ((2 * Math.PI) / prizes.length));
            document.getElementById('winner-display').innerText = `🎉 ${prizes[idx % prizes.length]} 🎉`;
        }
    };
    requestAnimationFrame(animate);
};
