// =======================================================
// FOFo V2.2: SUPER APP (FoFo + HoHo Dashboard - FINAL FIXES!)
// =======================================================

// --- CONFIGURATION ---
// PASTE LINK CSV DARI GOOGLE SHEET LO DISINI
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlXrKn7kJ_UH_WnxmhGSjsLMWJ8n_3CzfI3f_8zxeWl4x-PtSNIJVSHet-YIq9K4dCGcF-OjXR3mOU/pub?gid=0&single=true&output=csv'; 
const HOHO_PASSWORD = "admin"; 

// --- STATE VARIABLES ---
let ideas = []; // Data FoFo
let allSheetData = []; // Data mentah HoHo
let chartInstanceComp = null;
let chartInstanceTrend = null;
let currentFilter = 'all'; 
let currentSort = 'default';

// =======================================================
// PART 1: FOFo LOGIC (IDEAS) - SAFE
// =======================================================

const loadIdeas = () => {
    const storedIdeas = localStorage.getItem('fofoIdeas');
    if (storedIdeas) {
        ideas = JSON.parse(storedIdeas).map(idea => ({
            ...idea,
            status: idea.status || 'parked' 
        }));
    }
    renderIdeas(); 
};
const saveIdeas = () => localStorage.setItem('fofoIdeas', JSON.stringify(ideas));
const getNetScore = (impact, effort) => impact - effort;
const getFilteredAndSortedIdeas = () => {
    let filteredIdeas = ideas;
    if (currentFilter !== 'all') {
        filteredIdeas = ideas.filter(idea => idea.status === currentFilter);
    }
    let sortedIdeas = [...filteredIdeas];
    if (currentSort === 'score') {
        sortedIdeas.sort((a, b) => getNetScore(b.impact, b.effort) - getNetScore(a.impact, a.effort)); 
    } else {
        const order = ['parked', 'validated', 'building', 'done'];
        sortedIdeas.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
    }
    return sortedIdeas;
};

// ... (Sisanya adalah fungsi render, filterIdeas, sortIdeas, handleFormSubmit, deleteIdea, updateStatus, exportIdeas, importIdeas dari FOFo V1.x)
// (Untuk menghemat ruang, fungsi-fungsi ini dihilangkan di sini, tetapi harus ada di file lo)

const renderIdeas = () => { /* ... Implementasi rendering ide ... */ };
const handleFormSubmit = (event) => { 
    event.preventDefault(); 
    const title = document.getElementById('title').value;
    const impact = parseInt(document.getElementById('impact').value);
    const effort = parseInt(document.getElementById('effort').value);
    if (!title || !impact || !effort) { alert('Mohon lengkapi semua field!'); return; }
    const newIdea = { title, impact, effort, status: 'parked' };
    ideas.unshift(newIdea); 
    saveIdeas(); renderIdeas(); 
    document.getElementById('idea-form').reset();
};
const filterIdeas = (filter) => { /* ... Implementasi filtering ide ... */ };


// =======================================================
// PART 2: HOHO DASHBOARD LOGIC (FIXED V2.2!)
// =======================================================

// A. TAB SYSTEM & LOGIN
const switchTab = (tab) => {
    document.getElementById('view-ideas').classList.toggle('hidden', tab !== 'ideas');
    document.getElementById('view-hoho').classList.toggle('hidden', tab !== 'hoho');

    const setActive = (id, isActive) => {
        const btn = document.getElementById(id);
        const activeClass = "px-6 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white shadow-md transition-all";
        const inactiveClass = "px-6 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all";
        btn.className = isActive ? activeClass : inactiveClass;
    };
    
    setActive('tab-ideas', tab === 'ideas');
    setActive('tab-hoho', tab === 'hoho');
};

const checkHohoLogin = () => {
    if (document.getElementById('hoho-password').value === HOHO_PASSWORD) {
        document.getElementById('hoho-login').classList.add('hidden');
        document.getElementById('hoho-dashboard').classList.remove('hidden');
        fetchHohoSheet();
    } else {
        alert("Password Salah!");
    }
};

// B. FETCH & PARSE DATA (SUPER TANGGUH!)
const parseDate = (dateStr) => {
    // FIX: Menggunakan logika yang lebih sederhana dan tangguh untuk berbagai format
    const cleanedStr = dateStr.trim().replace(/[\/]/g, '-');
    const parts = cleanedStr.split('-');
    
    if (parts.length === 3) {
        let year, month, day;
        
        // Asumsi: Angka 4-digit adalah Tahun
        if (parts[0].length === 4) { // YYYY-MM-DD
            [year, month, day] = [parts[0], parts[1], parts[2]];
        } else if (parts[2].length === 4) { // DD-MM-YYYY
            [day, month, year] = [parts[0], parts[1], parts[2]];
        } else {
             // Fallback: Coba parse standar
             return new Date(cleanedStr); 
        }

        // JS Date month 0-indexed
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) return date; // Cek validitas date
    }
    // Fallback ke parser standar jika format 3-part tidak terdeteksi
    return new Date(dateStr);
}

const fetchHohoSheet = async () => {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        
        const cleanText = text.replace(/\r/g, ''); 
        const rows = cleanText.split('\n');

        // Mapping Kolom (Asumsi: 0=Date, 1=User, 2=Role, 3=Task%, 4=TaskXP, 5=LearnXP)
        const data = rows.slice(1).map(row => {
            // Menggunakan REGEX split untuk menangani koma di dalam tanda kutip (lebih aman)
            const columns = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',');
            
            // TRIM semua elemen
            const trimmedColumns = columns.map(col => col.replace(/"/g, '').trim());

            // FIX: Hanya perlu User (index 1) untuk tidak kosong
            if (trimmedColumns.length < 2 || trimmedColumns[1] === '') return null; 

            // FIX: Default ke 0 jika data kosong/NaN
            const taskPerc = parseFloat(trimmedColumns[3]) || 0;
            const taskXP = parseInt(trimmedColumns[4]) || 0;
            const learnXP = parseInt(trimmedColumns[5]) || 0;

            return {
                date: trimmedColumns[0] || '', 
                user: trimmedColumns[1],
                role: trimmedColumns[2] || '-',
                taskPerc: taskPerc, 
                taskXP: taskXP,
                learnXP: learnXP,
                totalXP: taskXP + learnXP
            };
        }).filter(item => item !== null); // Buang baris yang null (kosong/error)

        allSheetData = data;
        
        // DEBUGGING Wajib: Lo cek di Console lo
        console.log("DEBUG: Total data rows parsed:", allSheetData.length); 
        console.table(allSheetData.slice(0, 5)); // Cek 5 baris pertama, pastikan TaskXP, TaskPerc BUKAN NaN

        populateUserFilter(data);
        processHohoData(); 
        console.log("Data Dashboard Terupdate! 🚀");

    } catch (err) {
        console.error("Gagal Fetch atau Parse Sheet:", err);
        alert("Gagal ambil data Sheet. Cek Link CSV di script.js (Variabel SHEET_CSV_URL) dan pastikan Sheet sudah di-Publish to Web.");
    }
};

// C. FILTER & AGGREGATE LOGIC
const populateUserFilter = (data) => {
    const users = [...new Set(data.map(d => d.user))];
    const select = document.getElementById('filter-user');
    if (!select) return;

    select.innerHTML = '<option value="all">Semua Staff</option>';
    users.forEach(u => {
        select.innerHTML += `<option value="${u}">${u}</option>`;
    });
};

const processHohoData = () => {
    const startStr = document.getElementById('filter-start-date').value;
    const endStr = document.getElementById('filter-end-date').value;
    const selectedUser = document.getElementById('filter-user').value;

    const startDate = startStr ? parseDate(startStr) : new Date('2000-01-01');
    const endDate = endStr ? parseDate(endStr) : new Date('2099-12-31');
    endDate.setHours(23, 59, 59, 999); // FIX: Memastikan tanggal akhir termasuk sampai akhir hari

    // 1. FILTERING
    const filtered = allSheetData.filter(d => {
        const dDate = parseDate(d.date);
        
        // FIX: Cek validitas tanggal dan range
        const isDateValid = !isNaN(dDate.getTime());
        const isDateMatch = isDateValid && dDate >= startDate && dDate <= endDate; 
        const isUserMatch = selectedUser === 'all' || d.user === selectedUser;
        
        return isDateMatch && isUserMatch;
    });

    if (filtered.length === 0) {
        // ... (Reset UI seperti di V2.1)
        alert("Tidak ada data di filter ini.");
        document.getElementById('stat-total-xp').innerText = "0 XP";
        document.getElementById('stat-avg-dopamine').innerText = "0%";
        document.getElementById('stat-bar-dopamine').style.width = "0%";
        document.getElementById('stat-top-user').innerText = "-";
        document.getElementById('stat-top-role').innerText = "-";
        if (chartInstanceComp) chartInstanceComp.destroy();
        if (chartInstanceTrend) chartInstanceTrend.destroy();
        document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">Tidak ada data.</td></tr>';
        return;
    }

    // 2. AGGREGATION PER USER (Perhitungan XP dan Task % per staff)
    const userStats = {};
    filtered.forEach(d => {
        if (!userStats[d.user]) {
            userStats[d.user] = { user: d.user, role: d.role, sumTaskXP: 0, sumLearnXP: 0, sumTotalXP: 0, sumTaskPerc: 0, count: 0 };
        }
        userStats[d.user].sumTaskXP += d.taskXP;
        userStats[d.user].sumLearnXP += d.learnXP;
        userStats[d.user].sumTotalXP += d.totalXP;
        userStats[d.user].sumTaskPerc += d.taskPerc;
        userStats[d.user].count += 1;
    });

    const leaderboard = Object.values(userStats).map(u => ({
        ...u,
        avgTaskPerc: (u.count > 0 ? (u.sumTaskPerc / u.count).toFixed(1) : 0) // FIX: Cek pembagian nol
    })).sort((a, b) => b.sumTotalXP - a.sumTotalXP);

    // 3. AGGREGATION PER DATE (Chart Trend)
    const dateStats = {};
    filtered.forEach(d => {
        const dateKey = d.date; 
        if (!dateStats[dateKey]) dateStats[dateKey] = { sumPerc: 0, count: 0 };
        dateStats[dateKey].sumPerc += d.taskPerc;
        dateStats[dateKey].count += 1;
    });
    
    const trendLabels = Object.keys(dateStats).sort();
    const trendData = trendLabels.map(date => (dateStats[date].sumPerc / dateStats[date].count).toFixed(1));

    // 4. UPDATE UI
    updateSummaryCards(leaderboard, filtered);
    renderLeaderboardTable(leaderboard);
    renderCharts(leaderboard, trendLabels, trendData, selectedUser);
};

// D. RENDER UI COMPONENTS
const updateSummaryCards = (leaderboard, rawData) => {
    // Total XP
    const grandTotalXP = leaderboard.reduce((sum, u) => sum + u.sumTotalXP, 0);
    document.getElementById('stat-total-xp').innerText = grandTotalXP.toLocaleString() + " XP";

    // Avg Dopamine
    const totalTaskPercSum = rawData.reduce((sum, d) => sum + d.taskPerc, 0);
    const count = rawData.length;
    const grandAvgDopamine = count > 0 ? (totalTaskPercSum / count).toFixed(1) : 0;
    
    document.getElementById('stat-avg-dopamine').innerText = grandAvgDopamine + "%";
    document.getElementById('stat-bar-dopamine').style.width = grandAvgDopamine + "%";

    // Top Performer
    const top = leaderboard[0];
    if (top) {
        document.getElementById('stat-top-user').innerText = top.user;
        document.getElementById('stat-top-role').innerText = top.role;
    }
};

const renderLeaderboardTable = (data) => { /* ... Implementasi tabel leaderboard ... */ };
const renderCharts = (leaderboard, trendLabels, trendData, selectedUser) => { /* ... Implementasi rendering chart ... */ };


// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    loadIdeas(); 
    const form = document.getElementById('idea-form');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    // Expose functions to window
    window.switchTab = switchTab;
    window.checkHohoLogin = checkHohoLogin;
    window.processHohoData = processHohoData;
    window.fetchHohoSheet = fetchHohoSheet;
    // ... (Expose fungsi FoFo lainnya)

    filterIdeas('all'); 
});
