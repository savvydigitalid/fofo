// =======================================================
// FOFo x HOHo V3.0: ADMIN + STAFF TV MODE
// =======================================================

// --- CONFIGURATION ---
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlXrKn7kJ_UH_WnxmhGSjsLMWJ8n_3CzfI3f_8zxeWl4x-PtSNIJVSHet-YIq9K4dCGcF-OjXR3mOU/pub?gid=0&single=true&output=csv'; 
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
// =======================================================
// PART 4: CUSTOM SPINNING WHEEL SYSTEM (CANVAS)
// =======================================================

let prizes = [];
let wheelCtx = null;
let wheelCanvas = null;
let currentRotation = 0;
let isSpinning = false;

// Warna-warni Roda (Cyberpunk Theme)
const wheelColors = [
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
];

// 1. Inisialisasi Roda dari Input
window.initWheel = () => {
    const input = document.getElementById('prize-input').value;
    // Pisahkan text berdasarkan koma, lalu bersihkan spasi
    prizes = input.split(',').map(p => p.trim()).filter(p => p !== "");
    
    wheelCanvas = document.getElementById('wheelCanvas');
    if (!wheelCanvas) return;
    
    wheelCtx = wheelCanvas.getContext('2d');
    drawWheel(0); // Gambar posisi awal (0 derajat)
    document.getElementById('winner-display').innerText = "";
};

// 2. Fungsi Menggambar Roda
const drawWheel = (rotationAngle) => {
    if (!wheelCtx || prizes.length === 0) return;

    const centerX = wheelCanvas.width / 2;
    const centerY = wheelCanvas.height / 2;
    const radius = wheelCanvas.width / 2 - 10; // Padding dikit
    const sliceAngle = (2 * Math.PI) / prizes.length; // Besar sudut per slice

    wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
    
    wheelCtx.save();
    wheelCtx.translate(centerX, centerY);
    wheelCtx.rotate(rotationAngle); // Putar kanvas sesuai animasi

    prizes.forEach((prize, i) => {
        // Gambar Potongan Pie
        const startAngle = i * sliceAngle;
        const endAngle = (i + 1) * sliceAngle;

        wheelCtx.beginPath();
        wheelCtx.moveTo(0, 0);
        wheelCtx.arc(0, 0, radius, startAngle, endAngle);
        wheelCtx.fillStyle = wheelColors[i % wheelColors.length];
        wheelCtx.fill();
        wheelCtx.stroke(); // Garis pemisah

        // Gambar Teks Hadiah
        wheelCtx.save();
        wheelCtx.rotate(startAngle + sliceAngle / 2);
        wheelCtx.textAlign = "right";
        wheelCtx.fillStyle = "white";
        wheelCtx.font = "bold 14px Arial";
        wheelCtx.fillText(prize, radius - 20, 5);
        wheelCtx.restore();
    });

    wheelCtx.restore();
    
    // Gambar Lingkaran Tengah (Pemanis)
    wheelCtx.beginPath();
    wheelCtx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    wheelCtx.fillStyle = "#1f2937"; // Gray-800
    wheelCtx.fill();
    wheelCtx.lineWidth = 4;
    wheelCtx.strokeStyle = "#ffffff";
    wheelCtx.stroke();
};

// 3. Logika Spin (Animasi Fisika)
window.spinWheel = () => {
    if (isSpinning || prizes.length === 0) return;
    
    // Pastikan wheel ter-init
    if(!wheelCanvas) initWheel();

    isSpinning = true;
    document.getElementById('winner-display').innerText = "SPINNING...";
    document.getElementById('spin-btn').disabled = true;
    document.getElementById('spin-btn').classList.add('opacity-50');

    // Random putaran: Minimal 5x putaran penuh (1800 derajat) + random offset
    const spinDuration = 5000; // 5 detik
    const randomOffset = Math.random() * 2 * Math.PI; // Posisi berhenti acak
    const totalRotation = (10 * Math.PI) + randomOffset; // 5 putaran penuh + sisa
    
    const startTime = performance.now();
    const startRotation = currentRotation; // Lanjut dari posisi terakhir

    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        
        // Easing Function (Ease Out Quart): Mulai cepat, berhenti pelan
        const easeOut = 1 - Math.pow(1 - progress, 4);
        
        // Hitung rotasi saat ini
        currentRotation = startRotation + (totalRotation * easeOut);
        
        // Gambar ulang roda
        drawWheel(currentRotation);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            document.getElementById('spin-btn').disabled = false;
            document.getElementById('spin-btn').classList.remove('opacity-50');
            determineWinner(currentRotation);
        }
    };

    requestAnimationFrame(animate);
};

// 4. Menentukan Pemenang
const determineWinner = (finalRotation) => {
    // Normalisasi rotasi ke 0 - 2PI (satu lingkaran)
    const normalizedRotation = finalRotation % (2 * Math.PI);
    
    // Karena jarum ada di ATAS (270 derajat atau 1.5 PI dalam canvas), kita harus sesuaikan
    // Canvas start angle (0) itu di KANAN (jam 3).
    // Jadi kalau jarum di jam 12, kita harus hitung offsetnya.
    
    // Hitung sudut jarum relatif terhadap roda yang berputar
    // Rumus: (2PI - normalizedRotation + Offset Jarum) % 2PI
    const pointerAngle = (2 * Math.PI - normalizedRotation + (1.5 * Math.PI)) % (2 * Math.PI);
    
    const sliceAngle = (2 * Math.PI) / prizes.length;
    const winningIndex = Math.floor(pointerAngle / sliceAngle);
    
    // Ambil nama pemenang
    // Index kadang bisa off by 1 tergantung rotasi, kita clamp biar aman
    const winner = prizes[winningIndex % prizes.length];

    // Tampilkan Hasil
    const display = document.getElementById('winner-display');
    display.innerText = `🎉 ${winner} 🎉`;
    display.classList.add('animate-bounce');
    
    // Dopamine Confetti (Optional: Alert dulu buat MVP)
    setTimeout(() => alert(`Selamat! Hasilnya: ${winner}`), 100);
};

// Load Wheel saat masuk TV Mode
// (Panggil ini di dalam fungsi initTVMode lo yang sebelumnya)
// Tambahkan baris ini di dalam initTVMode():
// setTimeout(initWheel, 1000); // Delay dikit biar HTML ready
