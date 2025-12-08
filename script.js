// =======================================================
// FOFo V2.3: SUPER APP (FoFo + HoHo Dashboard - FINAL MERGED FIX)
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
// PART 1: FOFo LOGIC (IDEAS) - DARI V1.6 STABLE
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

// --- FOFo RENDERING & HANDLERS ---
// (Semua fungsi FoFo seperti renderIdeas, updateStatus, handleFormSubmit, exportIdeas, dll. harus ada di sini)
// Karena lo sudah upload V1.6, gue asumsikan fungsi-fungsi ini sudah ada dan bekerja di file lo, jadi gue hilangkan di sini untuk fokus pada HoHo.

// Placeholder untuk fungsi FoFo yang dibutuhkan HoHo
const renderIdeas = () => { 
    // Logic render ideas (Harusnya ada di file lo)
    const listContainer = document.getElementById('idea-list');
    if (listContainer) listContainer.innerHTML = '';
    // ...
}; 
const filterIdeas = (filter) => { 
    currentFilter = filter; 
    // Logic filter UI (Harusnya ada di file lo)
    renderIdeas(); 
};

// =======================================================
// PART 2: HOHO DASHBOARD LOGIC (FIXED V2.3!)
// =======================================================

// A. TAB SYSTEM & LOGIN
const switchTab = (tab) => {
    document.getElementById('view-ideas').classList.toggle('hidden', tab !== 'ideas');
    document.getElementById('view-hoho').classList.toggle('hidden', tab !== 'hoho');

    const setActive = (id, isActive) => {
        const btn = document.getElementById(id);
        const activeClass = "px-6 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white shadow-md transition-all";
        const inactiveClass = "px-6 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all";
        if(btn) btn.className = isActive ? activeClass : inactiveClass;
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

// B. FETCH & PARSE DATA (SUPER FIX)
const parseDate = (dateStr) => {
    const cleanedStr = dateStr.trim().replace(/[\/]/g, '-');
    const parts = cleanedStr.split('-');
    
    if (parts.length === 3) {
        let year, month, day;
        
        // FIX: Prioritas ke YYYY-MM-DD
        if (parts[0].length === 4) { // YYYY-MM-DD
            [year, month, day] = [parts[0], parts[1], parts[2]];
        } else if (parts[2].length === 4) { // DD-MM-YYYY
            [day, month, year] = [parts[0], parts[1], parts[2]];
        } else {
             return new Date(dateStr); 
        }
        
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) return date;
    }
    return new Date(dateStr);
}

const fetchHohoSheet = async () => {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        
        const cleanText = text.replace(/\r/g, '').trim(); 
        const rows = cleanText.split('\n');

        // Mapping Kolom (Asumsi lo: 0=Date, 1=User, 2=Role, 3=Task%, 4=TaskXP, 5=LearnXP)
        const data = rows.slice(1).map(row => {
            // FIX: Hanya split dengan koma dan trim (lebih aman)
            const columns = row.split(',').map(col => col.replace(/"/g, '').trim());

            if (columns.length < 6 || columns[1] === '') return null; 

            // FIX: Default ke 0 jika data kosong/NaN
            const taskPerc = parseFloat(columns[3]) || 0;
            const taskXP = parseInt(columns[4]) || 0;
            const learnXP = parseInt(columns[5]) || 0;

            return {
                date: columns[0] || '', 
                user: columns[1],
                role: columns[2] || '-',
                taskPerc: taskPerc, 
                taskXP: taskXP,
                learnXP: learnXP,
                totalXP: taskXP + learnXP
            };
        }).filter(item => item !== null);

        allSheetData = data;
        
        // DEBUGGING: Cek di Console F12 lo
        console.log("------------------------------------------");
        console.log("DEBUG: Total data rows parsed:", allSheetData.length); 
        if (allSheetData.length > 0) {
            console.log("DEBUG: 5 Baris pertama:");
            console.table(allSheetData.slice(0, 5));
        } else {
            console.log("DEBUG: Parsing berhasil, tapi data 0. Cek CSV lo.");
        }
        console.log("------------------------------------------");
        

        populateUserFilter(data);
        processHohoData(); 
        console.log("Data Dashboard Terupdate! 🚀");

    } catch (err) {
        console.error("Gagal Fetch atau Parse Sheet:", err);
        alert("Gagal ambil data Sheet. Cek 1. Link CSV di script.js 2. Sheet sudah di-Publish to Web.");
    }
};

// C. FILTER & AGGREGATE LOGIC
const populateUserFilter = (data) => {
    const users = [...new Set(data.map(d => d.user))].filter(u => u !== ''); // Filter user kosong
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
    endDate.setHours(23, 59, 59, 999); 

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
        alert("Tidak ada data di filter ini. Cek Console (F12) untuk melihat data mentah yang terbaca.");
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

    // 2. AGGREGATION PER USER 
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
        avgTaskPerc: (u.count > 0 ? (u.sumTaskPerc / u.count).toFixed(1) : 0)
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

    // Avg Dopamine (dihitung dari total data point harian)
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

const renderLeaderboardTable = (data) => {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach((u, i) => {
        let rankColor = i === 0 ? 'text-yellow-600 font-bold' : (i===1 ? 'text-gray-600' : (i===2 ? 'text-orange-700' : 'text-gray-500'));
        let rankIcon = i === 0 ? '👑' : (i===1 ? '🥈' : (i===2 ? '🥉' : `#${i+1}`));
        
        tbody.innerHTML += `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-6 py-4 ${rankColor}">${rankIcon}</td>
                <td class="px-6 py-4 font-medium text-gray-900">
                    ${u.user} <span class="text-xs text-gray-400 block">${u.role}</span>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">${u.avgTaskPerc}%</span>
                </td>
                <td class="px-6 py-4 text-right text-gray-600">${u.sumTaskXP}</td>
                <td class="px-6 py-4 text-right text-gray-600">${u.sumLearnXP}</td>
                <td class="px-6 py-4 text-right font-bold text-indigo-600">${u.sumTotalXP} XP</td>
            </tr>
        `;
    });
};

const renderCharts = (leaderboard, trendLabels, trendData, selectedUser) => {
    // 1. COMPARISON CHART (Bar)
    const ctxComp = document.getElementById('chart-comparison');
    if (!ctxComp) return;
    const ctx = ctxComp.getContext('2d');
    if (chartInstanceComp) chartInstanceComp.destroy();

    const top10 = leaderboard.slice(0, 10); 
    
    chartInstanceComp = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top10.map(u => u.user),
            datasets: [
                { label: 'Task XP', data: top10.map(u => u.sumTaskXP), backgroundColor: '#4f46e5', stack: 'Stack 0' },
                { label: 'Learning XP', data: top10.map(u => u.sumLearnXP), backgroundColor: '#f59e0b', stack: 'Stack 0' }
            ]
        },
        options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }
    });

    // 2. TREND CHART (Line)
    const ctxTrend = document.getElementById('chart-trend');
    if (!ctxTrend) return;
    const ctx2 = ctxTrend.getContext('2d');
    if (chartInstanceTrend) chartInstanceTrend.destroy();
    
    chartInstanceTrend = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: trendLabels,
            datasets: [{
                label: selectedUser === 'all' ? 'Rata-rata Task % Team' : `Task % ${selectedUser}`,
                data: trendData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 100 } } } 
    });
};


// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    loadIdeas(); 
    
    // (Tambahkan kembali semua form handler dan expose functions FoFo lo di sini)
    // Expose HoHo functions to window
    window.switchTab = switchTab;
    window.checkHohoLogin = checkHohoLogin;
    window.processHohoData = processHohoData;
    window.fetchHohoSheet = fetchHohoSheet;
    
    // Aktifkan filter 'all' saat pertama kali dimuat
    filterIdeas('all'); 
});
