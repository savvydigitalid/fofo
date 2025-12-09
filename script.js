// =======================================================
// FOFo x HOHo V3.0: ADMIN + STAFF TV MODE
// =======================================================

// --- CONFIGURATION ---
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQABC...GANTI_INI.../pub?output=csv'; 
const HOHO_PASSWORD = "admin"; 

// --- STATE ---
let ideas = [];
let allSheetData = [];
let tvMode = false; // Flag untuk mode TV

// =======================================================
// PART 1: INIT & ROUTING (The Gatekeeper)
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    // Cek URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');

    if (mode === 'staff') {
        tvMode = true;
        initTVMode(); // Masuk Mode Staff
    } else {
        initAdminMode(); // Masuk Mode Founder Biasa
    }
});

function initAdminMode() {
    // Tampilkan Layout Admin (Putih)
    document.querySelector('.max-w-5xl').classList.remove('hidden');
    document.getElementById('view-staff-tv').classList.add('hidden');
    
    // Load FoFo Data
    loadIdeas();
    const form = document.getElementById('idea-form');
    if(form) form.addEventListener('submit', handleFormSubmit);
    filterIdeas('all');
}

function initTVMode() {
    // Sembunyikan Layout Admin, Tampilkan TV Mode (Gelap)
    document.querySelector('.max-w-5xl').classList.add('hidden'); // Hide main container
    document.body.classList.remove('bg-gray-50', 'text-gray-800'); // Remove light styles
    document.body.classList.add('bg-gray-900'); // Add dark bg
    document.getElementById('view-staff-tv').classList.remove('hidden');

    // Auto Fetch Data tanpa Password
    fetchHohoSheet(true); 
    
    // Auto Refresh setiap 5 menit (biar live di TV)
    setInterval(() => fetchHohoSheet(true), 300000);
}

// =======================================================
// PART 2: DATA FETCHING & PARSING
// =======================================================
const parseDate = (dateStr) => {
    const cleaned = dateStr.trim().replace(/[\/]/g, '-');
    const p = cleaned.split('-');
    if (p.length === 3) {
        if (p[0].length === 4) return new Date(p[0], p[1]-1, p[2]); // YYYY-MM-DD
        if (p[2].length === 4) return new Date(p[2], p[1]-1, p[0]); // DD-MM-YYYY
    }
    return new Date(dateStr);
}

const fetchHohoSheet = async (isTV = false) => {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        const rows = text.replace(/\r/g, '').trim().split('\n');
        
        const data = rows.slice(1).map(row => {
            const c = row.split(',').map(x => x.replace(/"/g, '').trim());
            if (c.length < 10 || !c[1]) return null;
            
            return {
                date: c[3] || '',
                user: c[1],
                role: c[2] || 'Staff',
                taskPerc: parseFloat(c[4]) || 0,
                taskXP: parseInt(c[5]) || 0,
                learnXP: parseInt(c[9]) || 0,
                totalXP: (parseInt(c[5]) || 0) + (parseInt(c[9]) || 0)
            };
        }).filter(i => i !== null);

        allSheetData = data;

        if (isTV) {
            renderTVDashboard(data);
        } else {
            // Logic Admin Dashboard
            populateUserFilter(data);
            processHohoData();
        }
        console.log("Data Updated!");
    } catch (err) { 
        console.error(err);
        if(!isTV) alert("Gagal Fetch CSV."); 
    }
};

// =======================================================
// PART 3: TV MODE RENDERING (GAMIFICATION UI)
// =======================================================
const renderTVDashboard = (data) => {
    // 1. Agregasi Data User (Total XP Semua Waktu / Bulan Ini)
    // Default: Ambil data bulan ini biar relevan
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const filtered = data.filter(d => parseDate(d.date) >= startOfMonth);
    
    const userStats = {};
    filtered.forEach(d => {
        if(!userStats[d.user]) userStats[d.user] = { 
            user: d.user, role: d.role, sumXP: 0, sumPerc: 0, count: 0 
        };
        userStats[d.user].sumXP += d.totalXP;
        userStats[d.user].sumPerc += d.taskPerc;
        userStats[d.user].count++;
    });

    const leaderboard = Object.values(userStats)
        .map(u => ({...u, avgPerc: (u.sumPerc/u.count).toFixed(0)}))
        .sort((a,b) => b.sumXP - a.sumXP);

    // 2. Render Top 3 (Podium)
    const topContainer = document.getElementById('tv-top3-container');
    topContainer.innerHTML = '';
    
    leaderboard.slice(0, 3).forEach((u, i) => {
        let borderClass = i===0 ? 'border-yellow-400' : (i===1 ? 'border-gray-300' : 'border-orange-400');
        let icon = i===0 ? '👑' : (i===1 ? '🥈' : '🥉');
        let glow = i===0 ? 'shadow-[0_0_20px_rgba(250,204,21,0.5)]' : '';

        topContainer.innerHTML += `
            <div class="flex items-center bg-gray-900 p-4 rounded-xl border-2 ${borderClass} ${glow} transform transition hover:scale-105">
                <div class="text-4xl mr-4">${icon}</div>
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-white">${u.user}</h3>
                    <p class="text-xs text-gray-400 uppercase">${u.role}</p>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-black text-white">${u.sumXP}</div>
                    <div class="text-[10px] text-green-400">XP THIS MONTH</div>
                </div>
            </div>
        `;
    });

    // 3. Render List with Battery Bars
    const listContainer = document.getElementById('tv-list-container');
    listContainer.innerHTML = '';
    
    // Cari XP tertinggi buat patokan 100% bar
    const maxXP = leaderboard[0]?.sumXP || 1000;

    leaderboard.forEach((u, i) => {
        const percentage = Math.min(100, (u.sumXP / maxXP) * 100);
        // Bar warna-warni: Ijo buat top, Kuning tengah, Merah bawah
        let barColor = percentage > 80 ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : (percentage > 50 ? 'bg-yellow-500' : 'bg-gray-600');

        listContainer.innerHTML += `
            <div class="mb-4">
                <div class="flex justify-between text-sm mb-1">
                    <span class="font-bold text-white flex gap-2">
                        <span class="text-gray-500">#${i+1}</span> ${u.user}
                    </span>
                    <span class="font-mono text-green-400">${u.sumXP} XP</span>
                </div>
                <div class="w-full bg-gray-900 rounded-full h-4 border border-gray-700 relative overflow-hidden">
                    <div class="${barColor} h-4 rounded-full transition-all duration-1000 relative" style="width: ${percentage}%">
                        <div class="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                    </div>
                </div>
            </div>
        `;
    });
};

// =======================================================
// PART 4: GACHA SYSTEM (Randomizer)
// =======================================================
window.runGacha = () => {
    // Ambil list user dari data yang ada
    const users = [...new Set(allSheetData.map(d => d.user))].filter(u => u);
    if(users.length === 0) return alert("Belum ada data staff!");

    const overlay = document.getElementById('gacha-overlay');
    const display = document.getElementById('gacha-display');
    overlay.classList.remove('hidden');

    let counter = 0;
    let speed = 50;
    
    // Efek ngacak nama cepet
    const interval = setInterval(() => {
        display.innerText = users[Math.floor(Math.random() * users.length)];
        counter++;
        if (counter > 20) speed += 20; // Melambat
        if (counter > 40) {
            clearInterval(interval);
            // Pemenang Final
            const winner = users[Math.floor(Math.random() * users.length)];
            display.innerText = "🎉 " + winner + " 🎉";
            display.classList.add('scale-150'); // Zoom effect
        }
    }, 80);
};

window.closeGacha = () => {
    document.getElementById('gacha-overlay').classList.add('hidden');
    document.getElementById('gacha-display').classList.remove('scale-150');
};

// =======================================================
// PART 5: FOFO & ADMIN LOGIC (Sama seperti V2.8)
// =======================================================
// (Paste fungsi loadIdeas, saveIdeas, filterIdeas, dsb dari V2.8 di sini agar Admin Mode tetap jalan)
// AGAR KODE TIDAK KEPANJANGAN, SAYA PERSINGKAT. 
// TAPI SAAT LO PASTE, PASTIIN FUNGSI renderIdeas, editIdea, DSB MASIH ADA YA!

// --- SIMPLE RE-IMPLEMENTATION FOR CONTEXT ---
const loadIdeas = () => { /* Logic Load LocalStorage */ };
const saveIdeas = () => { /* Logic Save */ };
const renderIdeas = () => { /* Logic Render HTML FoFo */ };
// ... Dan seterusnya fungsi FoFo lainnya ...
const checkHohoLogin = () => {
    if (document.getElementById('hoho-password').value === HOHO_PASSWORD) {
        document.getElementById('hoho-login').classList.add('hidden');
        document.getElementById('hoho-dashboard').classList.remove('hidden');
        fetchHohoSheet(false);
    } else { alert("Password Salah!"); }
};
const populateUserFilter = (data) => { /* Logic Filter */ };
const processHohoData = () => { /* Logic Filter */ };
// ... Pastikan fungsi switchTab juga ada ...
const switchTab = (tab) => {
    document.getElementById('view-ideas').classList.toggle('hidden', tab !== 'ideas');
    document.getElementById('view-hoho').classList.toggle('hidden', tab !== 'hoho');
};
