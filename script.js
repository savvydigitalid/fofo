// =======================================================
// FOFo V2.0: SUPER APP (FoFo + HoHo Dashboard)
// =======================================================

// --- CONFIGURATION ---
// PASTE LINK CSV DARI GOOGLE SHEET LO DISINI
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQABC...GANTI_INI.../pub?output=csv'; 
const HOHO_PASSWORD = "admin"; 

// --- STATE VARIABLES ---
let ideas = [];
let allSheetData = []; // Data mentah dari sheet
let chartInstanceComp = null;
let chartInstanceTrend = null;

// =======================================================
// PART 1: FOFO LOGIC (IDEAS) - TETAP AMAN
// =======================================================

const loadIdeas = () => {
    const storedIdeas = localStorage.getItem('fofoIdeas');
    if (storedIdeas) ideas = JSON.parse(storedIdeas);
    renderIdeas(); 
};
const saveIdeas = () => localStorage.setItem('fofoIdeas', JSON.stringify(ideas));

// ... (Rendering Logic FoFo yang sudah stabil gue persingkat biar muat, tapi fungsinya tetap sama)
const renderIdeas = () => {
    const list = document.getElementById('idea-list');
    list.innerHTML = '';
    ideas.forEach((idea, index) => {
        const net = idea.impact - idea.effort;
        let color = net >= 4 ? 'bg-green-500' : (net >= 0 ? 'bg-indigo-500' : 'bg-red-500');
        let label = net >= 4 ? 'QUICK WIN' : (net >= 0 ? 'BIG BET' : 'TIME WASTER');
        
        list.innerHTML += `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
                <h3 class="font-bold text-gray-800">${idea.title}</h3>
                <p class="text-xs text-gray-400">Imp: ${idea.impact} | Eff: ${idea.effort}</p>
            </div>
            <div class="text-right">
                <span class="px-3 py-1 text-[10px] font-bold text-white rounded-full ${color}">${label}</span>
                <button onclick="deleteIdea(${index})" class="block text-xs text-red-400 mt-2 hover:text-red-600">Hapus</button>
            </div>
        </div>`;
    });
};

const handleFormSubmit = (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const impact = parseInt(document.getElementById('impact').value);
    const effort = parseInt(document.getElementById('effort').value);
    ideas.unshift({ title, impact, effort });
    saveIdeas(); renderIdeas();
    document.getElementById('idea-form').reset();
};

const deleteIdea = (idx) => {
    if(confirm('Hapus?')) { ideas.splice(idx, 1); saveIdeas(); renderIdeas(); }
};

// =======================================================
// PART 2: HOHO DASHBOARD LOGIC (NEW!)
// =======================================================

// A. TAB SYSTEM & LOGIN
const switchTab = (tab) => {
    const ids = ['view-ideas', 'view-hoho'];
    const btns = ['tab-ideas', 'tab-hoho'];
    
    document.getElementById('view-ideas').classList.toggle('hidden', tab !== 'ideas');
    document.getElementById('view-hoho').classList.toggle('hidden', tab !== 'hoho');

    // Style active button
    document.getElementById('tab-ideas').className = tab === 'ideas' 
        ? "px-6 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white shadow-md transition-all"
        : "px-6 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all";
    
    document.getElementById('tab-hoho').className = tab === 'hoho'
        ? "px-6 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white shadow-md transition-all"
        : "px-6 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all";
};

const checkHohoLogin = () => {
    if (document.getElementById('hoho-password').value === HOHO_PASSWORD) {
        document.getElementById('hoho-login').classList.add('hidden');
        document.getElementById('hoho-dashboard').classList.remove('hidden');
        fetchHohoSheet(); // Load data saat login
    } else {
        alert("Password Salah!");
    }
};

// B. FETCH & PARSE DATA
const fetchHohoSheet = async () => {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        
        // CSV Parser Sederhana
        const rows = text.split('\n').map(r => r.split(','));
        const data = rows.slice(1).map(row => {
            // Mapping Kolom (Sesuaikan Index [0], [1] dst dengan Sheet lo)
            // Asumsi: 0=Date, 1=User, 2=Role, 3=Task%, 4=TaskXP, 5=LearnXP
            return {
                date: row[0]?.replace(/"/g, '').trim(), // String YYYY-MM-DD
                user: row[1]?.replace(/"/g, '').trim(),
                role: row[2]?.replace(/"/g, '').trim(),
                taskPerc: parseFloat(row[3]) || 0,
                taskXP: parseInt(row[4]) || 0,
                learnXP: parseInt(row[5]) || 0,
                totalXP: (parseInt(row[4]) || 0) + (parseInt(row[5]) || 0)
            };
        }).filter(item => item.user && item.date); // Buang baris kosong

        allSheetData = data;
        populateUserFilter(data);
        processHohoData(); // Render awal (Semua data)
        alert("Data Dashboard Terupdate! 🚀");

    } catch (err) {
        console.error(err);
        alert("Gagal ambil data Sheet. Cek Link CSV.");
    }
};

// C. FILTER & AGGREGATE LOGIC
const populateUserFilter = (data) => {
    const users = [...new Set(data.map(d => d.user))];
    const select = document.getElementById('filter-user');
    select.innerHTML = '<option value="all">Semua Staff</option>';
    users.forEach(u => {
        select.innerHTML += `<option value="${u}">${u}</option>`;
    });
};

const processHohoData = () => {
    const startStr = document.getElementById('filter-start-date').value;
    const endStr = document.getElementById('filter-end-date').value;
    const selectedUser = document.getElementById('filter-user').value;

    const startDate = startStr ? new Date(startStr) : new Date('2000-01-01');
    const endDate = endStr ? new Date(endStr) : new Date('2099-12-31');

    // 1. FILTERING
    const filtered = allSheetData.filter(d => {
        const dDate = new Date(d.date);
        const isDateMatch = dDate >= startDate && dDate <= endDate;
        const isUserMatch = selectedUser === 'all' || d.user === selectedUser;
        return isDateMatch && isUserMatch;
    });

    if (filtered.length === 0) return alert("Tidak ada data di filter ini.");

    // 2. AGGREGATION PER USER (Untuk Leaderboard & Chart Comparison)
    const userStats = {};
    filtered.forEach(d => {
        if (!userStats[d.user]) {
            userStats[d.user] = { 
                user: d.user, role: d.role, 
                sumTaskXP: 0, sumLearnXP: 0, sumTotalXP: 0, 
                sumTaskPerc: 0, count: 0 
            };
        }
        userStats[d.user].sumTaskXP += d.taskXP;
        userStats[d.user].sumLearnXP += d.learnXP;
        userStats[d.user].sumTotalXP += d.totalXP;
        userStats[d.user].sumTaskPerc += d.taskPerc;
        userStats[d.user].count += 1;
    });

    // Convert ke Array & Hitung Rata-rata
    const leaderboard = Object.values(userStats).map(u => ({
        ...u,
        avgTaskPerc: (u.sumTaskPerc / u.count).toFixed(1)
    })).sort((a, b) => b.sumTotalXP - a.sumTotalXP); // Sort by Total XP High to Low

    // 3. AGGREGATION PER DATE (Untuk Chart Trend)
    // Jika user spesifik dipilih, kita lihat trend dia. Jika 'all', kita lihat rata-rata team.
    const dateStats = {};
    filtered.forEach(d => {
        if (!dateStats[d.date]) dateStats[d.date] = { sumPerc: 0, count: 0 };
        dateStats[d.date].sumPerc += d.taskPerc;
        dateStats[d.date].count += 1;
    });
    
    // Sort date secara kronologis
    const trendLabels = Object.keys(dateStats).sort();
    const trendData = trendLabels.map(date => (dateStats[date].sumPerc / dateStats[date].count).toFixed(1));

    // 4. UPDATE UI
    updateSummaryCards(leaderboard, filtered);
    renderLeaderboardTable(leaderboard);
    renderCharts(leaderboard, trendLabels, trendData, selectedUser);
};

// D. RENDER UI COMPONENTS
const updateSummaryCards = (leaderboard, rawData) => {
    // Total XP Team di periode ini
    const grandTotalXP = leaderboard.reduce((sum, u) => sum + u.sumTotalXP, 0);
    document.getElementById('stat-total-xp').innerText = grandTotalXP.toLocaleString() + " XP";

    // Avg Dopamine Team
    const grandAvgDopamine = (leaderboard.reduce((sum, u) => sum + parseFloat(u.avgTaskPerc), 0) / leaderboard.length).toFixed(1);
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
    const ctxComp = document.getElementById('chart-comparison').getContext('2d');
    if (chartInstanceComp) chartInstanceComp.destroy();

    // Data for Comparison: Top 10 Users
    const top10 = leaderboard.slice(0, 10); 
    
    chartInstanceComp = new Chart(ctxComp, {
        type: 'bar',
        data: {
            labels: top10.map(u => u.user),
            datasets: [
                {
                    label: 'Task XP',
                    data: top10.map(u => u.sumTaskXP),
                    backgroundColor: '#4f46e5', // Indigo
                    stack: 'Stack 0',
                },
                {
                    label: 'Learning XP',
                    data: top10.map(u => u.sumLearnXP),
                    backgroundColor: '#f59e0b', // Amber
                    stack: 'Stack 0',
                }
            ]
        },
        options: {
            responsive: true,
            scales: { x: { stacked: true }, y: { stacked: true } }
        }
    });

    // 2. TREND CHART (Line)
    const ctxTrend = document.getElementById('chart-trend').getContext('2d');
    if (chartInstanceTrend) chartInstanceTrend.destroy();

    chartInstanceTrend = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: trendLabels,
            datasets: [{
                label: selectedUser === 'all' ? 'Rata-rata Task % Team' : `Task % ${selectedUser}`,
                data: trendData,
                borderColor: '#10b981', // Emerald
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: { y: { min: 0, max: 100 } }
        }
    });
};

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    loadIdeas();
    const form = document.getElementById('idea-form');
    if(form) form.addEventListener('submit', handleFormSubmit);

    // Export functions to global
    window.switchTab = switchTab;
    window.checkHohoLogin = checkHohoLogin;
    window.processHohoData = processHohoData;
    window.fetchHohoSheet = fetchHohoSheet;
    window.deleteIdea = deleteIdea;
    // ... (tambahkan fungsi lain jika perlu)
});
