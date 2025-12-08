// =======================================================
// FOFo V2.1: SUPER APP (FoFo + HoHo Dashboard - FIXES)
// =======================================================

// --- CONFIGURATION ---
// PASTE LINK CSV DARI GOOGLE SHEET LO DISINI
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlXrKn7kJ_UH_WnxmhGSjsLMWJ8n_3CzfI3f_8zxeWl4x-PtSNIJVSHet-YIq9K4dCGcF-OjXR3mOU/pub?gid=0&single=true&output=csv'; 
const HOHO_PASSWORD = "admin"; 

// --- STATE VARIABLES ---
let ideas = []; // Data FoFo
let currentFilter = 'all'; 
let currentSort = 'default';
let allSheetData = []; // Data mentah HoHo
let chartInstanceComp = null;
let chartInstanceTrend = null;

// =======================================================
// PART 1: FOFo LOGIC (IDEAS) - DARI V1.3 LO
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

const filterIdeas = (filter) => {
    currentFilter = filter;
    const activeClasses = ['bg-indigo-500', 'text-white', 'hover:bg-indigo-600'];
    const inactiveClasses = ['bg-white', 'border', 'border-gray-300', 'text-gray-700', 'hover:bg-gray-200'];

    document.querySelectorAll('[id^="filter-"]').forEach(btn => {
        activeClasses.forEach(c => btn.classList.remove(c));
        inactiveClasses.forEach(c => btn.classList.add(c));
    });

    const activeBtn = document.getElementById(`filter-${filter}`);
    if (activeBtn) {
        inactiveClasses.forEach(c => activeBtn.classList.remove(c));
        activeClasses.forEach(c => activeBtn.classList.add(c));
    }
    renderIdeas();
};
const sortIdeas = (sort) => { currentSort = sort; renderIdeas(); };
const getPriorityLabel = (impact, effort) => {
    const netScore = getNetScore(impact, effort);
    let label = netScore >= 4 ? 'QUICK WIN! ⚡️' : (netScore >= 0 ? 'BIG BET 🧠' : 'TIME WASTER 🗑️');
    let color = netScore >= 4 ? 'bg-green-500' : (netScore >= 0 ? 'bg-indigo-500' : 'bg-red-500');
    return { label, color, netScore };
};

const calculateAndRenderTotalScore = () => {
    const activeIdeas = ideas.filter(idea => idea.status !== 'done');
    const totalNetScore = activeIdeas.reduce((sum, idea) => sum + getNetScore(idea.impact, idea.effort), 0);

    const scoreElement = document.getElementById('total-score');
    if (!scoreElement) return;

    scoreElement.textContent = `Total Score: ${totalNetScore}`;
    if (totalNetScore > 5) {
        scoreElement.className = 'text-xl font-extrabold px-3 py-1 rounded-full bg-green-500 text-white';
    } else if (totalNetScore >= 0) {
        scoreElement.className = 'text-xl font-extrabold px-3 py-1 rounded-full bg-yellow-500 text-white';
    } else {
        scoreElement.className = 'text-xl font-extrabold px-3 py-1 rounded-full bg-red-500 text-white';
    }
};

const getStatusStyle = (status) => {
    switch (status) {
        case 'parked': return { text: 'Parked 🅿️', color: 'bg-gray-300 text-gray-800' };
        case 'validated': return { text: 'Validated ✅', color: 'bg-yellow-500 text-white' };
        case 'building': return { text: 'Building 🔨', color: 'bg-indigo-500 text-white' };
        case 'done': return { text: 'DONE! 🎉', color: 'bg-green-600 text-white' };
        default: return { text: 'Unknown', color: 'bg-gray-200' };
    }
};

const updateStatus = (index, newStatus) => {
    const ideaToUpdate = getFilteredAndSortedIdeas()[index];
    const originalIndex = ideas.findIndex(idea => idea.title === ideaToUpdate.title && idea.impact === ideaToUpdate.impact);

    if (originalIndex !== -1) {
        ideas[originalIndex].status = newStatus;
        saveIdeas();
        renderIdeas();
    }
};

const getActionButton = (currentStatus, index) => {
    switch (currentStatus) {
        case 'parked': return `<button onclick="updateStatus(${index}, 'validated')" class="text-xs text-yellow-600 hover:text-yellow-800 transition duration-150 font-medium">Mark as Validated ✅</button>`;
        case 'validated': return `<button onclick="updateStatus(${index}, 'building')" class="text-xs text-indigo-600 hover:text-indigo-800 transition duration-150 font-medium">Move to Building 🔨</button>`;
        default: return '';
    }
};

const renderIdeas = () => {
    const listContainer = document.getElementById('idea-list');
    const countElement = document.getElementById('idea-count');
    const ideasToRender = getFilteredAndSortedIdeas();

    if (!listContainer || !countElement) return;

    listContainer.innerHTML = '';
    countElement.textContent = ideasToRender.length; 

    ideasToRender.forEach((idea, index) => {
        const priority = getPriorityLabel(idea.impact, idea.effort);
        const status = getStatusStyle(idea.status);
        const ideaCard = document.createElement('div');
        const statusBorder = idea.status === 'done' ? 'border-l-4 border-green-500' : (idea.status === 'building' ? 'border-l-4 border-indigo-500' : 'border-l-4 border-gray-300');

        ideaCard.className = `card bg-white p-5 rounded-xl shadow-md ${statusBorder}`;
        
        ideaCard.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex flex-col">
                    <h3 class="text-xl font-bold text-gray-800 flex items-center space-x-2">
                        <span>${idea.title}</span>
                        <button onclick="editIdea(${index})" class="text-gray-400 hover:text-indigo-500 transition duration-150">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-7.586 7.586a1 1 0 000 1.414L10.586 16l-3 3H3a1 1 0 01-1-1v-4L7.586 11.172z" /></svg>
                        </button>
                    </h3>
                    <span class="text-xs font-medium uppercase ${status.color} px-2 py-0.5 rounded-full mt-1 inline-block w-fit">${status.text}</span>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 text-xs font-semibold uppercase rounded-full text-white ${priority.color}">${priority.label}</span>
                    <p class="text-xs text-gray-500 mt-1">I:${idea.impact} / E:${idea.effort} / S:${priority.netScore}</p>
                </div>
            </div>
            <div class="mt-4 flex space-x-3 border-t pt-3">
                ${getActionButton(idea.status, index)}
                <button onclick="updateStatus(${index}, 'done')" 
                        class="text-xs text-green-600 hover:text-green-800 transition duration-150 font-semibold ${idea.status === 'done' ? 'hidden' : ''}">
                    Mark as Done 🎉
                </button>
                <button onclick="deleteIdea(${index})" class="text-xs text-red-600 hover:text-red-800 transition duration-150 ml-auto">Archive/Kill 🗑️</button>
            </div>
        `;
        listContainer.appendChild(ideaCard);
    });
    calculateAndRenderTotalScore();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const editIdea = (index) => {
    const idea = getFilteredAndSortedIdeas()[index];
    let originalIndex = ideas.findIndex(i => i.title === idea.title && i.impact === idea.impact && i.effort === idea.effort);

    const newTitle = prompt("Edit Judul Ide:", idea.title);
    if (newTitle !== null && newTitle.trim() === "") { alert("Judul tidak boleh kosong."); return; }
    
    const newImpactStr = prompt(`Edit Skor Impact (1-5) untuk "${newTitle || idea.title}":`, idea.impact);
    const newImpact = parseInt(newImpactStr);
    
    const newEffortStr = prompt(`Edit Skor Effort (1-5) untuk "${newTitle || idea.title}":`, idea.effort);
    const newEffort = parseInt(newEffortStr);

    if (isNaN(newImpact) || isNaN(newEffort) || newImpact < 1 || newImpact > 5 || newEffort < 1 || newEffort > 5) {
        alert("Skor Impact dan Effort harus berupa angka antara 1 sampai 5.");
        return;
    }

    if (originalIndex !== -1) {
        ideas[originalIndex].title = newTitle.trim() || idea.title;
        ideas[originalIndex].impact = newImpact;
        ideas[originalIndex].effort = newEffort;
        saveIdeas(); renderIdeas();
    }
};

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

const deleteIdea = (index) => {
    const ideaToDelete = getFilteredAndSortedIdeas()[index];
    const originalIndex = ideas.findIndex(i => i.title === ideaToDelete.title && i.impact === ideaToDelete.impact);

    if (originalIndex !== -1 && confirm(`Yakin mau mengarsipkan/membunuh ide "${ideaToDelete.title}"?`)) {
        ideas.splice(originalIndex, 1); 
        saveIdeas(); 
        renderIdeas(); 
    }
};

const exportIdeas = () => {
    if (ideas.length === 0) { alert("Tidak ada ide untuk di-export!"); return; }
    const dataStr = JSON.stringify(ideas, null, 2); 
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `fofo_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Semua data ide berhasil di-download sebagai file .json! 💾");
};

const importIdeas = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData) && importedData.every(item => item.title && item.impact !== undefined)) {
                if (confirm(`Yakin ingin mengimpor ${importedData.length} ide? Data yang ada sekarang akan DITIMPA.`)) {
                    ideas = importedData;
                    saveIdeas();
                    renderIdeas();
                    alert("Data berhasil di-import! 🎉");
                }
            } else {
                alert("Format file .json tidak valid untuk FoFo.");
            }
        } catch (error) {
            alert("Gagal memproses file. Pastikan file JSON valid.");
        }
    };
    reader.readAsText(file);
};


// =======================================================
// PART 2: HOHO DASHBOARD LOGIC (FIXED V2.1!)
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

// B. FETCH & PARSE DATA (FIXED: Improved CSV and Date Parsing)
const parseDate = (dateStr) => {
    // FIX: Normalisasi tanggal dari format umum (DD/MM/YYYY atau YYYY-MM-DD)
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
        // Asumsi: Jika bulan > 12, ini adalah DD/MM/YYYY. Jika tidak, YYYY-MM-DD
        const [p1, p2, p3] = parts.map(p => parseInt(p.trim()));
        let year, month, day;
        if (p2 > 12) { // Contoh: 15/01/2025
            [day, month, year] = [p1, p2, p3]; // Format DD/MM/YYYY
        } else {
            [year, month, day] = [p1, p2, p3]; // Format YYYY-MM-DD
        }
        
        // Buat objek Date (bulan di JS 0-indexed)
        const date = new Date(year, month - 1, day);
        if (!isNaN(date)) return date;
    }
    return new Date('invalid');
}

const fetchHohoSheet = async () => {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        
        // FIX: Hapus carriage return (\r) untuk membersihkan data
        const cleanText = text.replace(/\r/g, ''); 
        const rows = cleanText.split('\n');

        // Mapping Kolom (Asumsi: 0=Date, 1=User, 2=Role, 3=Task%, 4=TaskXP, 5=LearnXP)
        const data = rows.slice(1).map(row => {
            const columns = row.split(',').map(col => col.replace(/"/g, '').trim());
            
            // Buang baris yang tidak lengkap atau kosong
            if (columns.length < 6 || columns[1] === '') return null; 

            const taskXP = parseInt(columns[4]) || 0;
            const learnXP = parseInt(columns[5]) || 0;

            return {
                date: columns[0], // String tanggal mentah
                user: columns[1],
                role: columns[2],
                taskPerc: parseFloat(columns[3]) || 0, // FIX: Pastikan ini angka
                taskXP: taskXP,
                learnXP: learnXP,
                totalXP: taskXP + learnXP
            };
        }).filter(item => item !== null);

        allSheetData = data;
        populateUserFilter(data);
        processHohoData(); 
        console.log("Data Dashboard Terupdate! 🚀");

    } catch (err) {
        console.error(err);
        alert("Gagal ambil data Sheet. Cek Link CSV.");
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
    endDate.setDate(endDate.getDate() + 1); // FIX: Memastikan tanggal akhir termasuk

    // 1. FILTERING
    const filtered = allSheetData.filter(d => {
        const dDate = parseDate(d.date);
        
        // FIX: Menggunakan Date object untuk perbandingan akurat
        const isDateMatch = dDate >= startDate && dDate < endDate; 
        const isUserMatch = selectedUser === 'all' || d.user === selectedUser;
        
        return isDateMatch && isUserMatch;
    });

    if (filtered.length === 0) {
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

    // 2. AGGREGATION PER USER (Leaderboard & Chart Comparison)
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
        avgTaskPerc: (u.sumTaskPerc / u.count).toFixed(1)
    })).sort((a, b) => b.sumTotalXP - a.sumTotalXP);

    // 3. AGGREGATION PER DATE (Chart Trend)
    const dateStats = {};
    filtered.forEach(d => {
        // FIX: Pastikan menggunakan date string yang sama untuk grouping
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

// D. RENDER UI COMPONENTS (FIXED: Average calculation)
const updateSummaryCards = (leaderboard, rawData) => {
    // Total XP Team di periode ini (Validasi XP manual lo harusnya sudah benar sekarang)
    const grandTotalXP = leaderboard.reduce((sum, u) => sum + u.sumTotalXP, 0);
    document.getElementById('stat-total-xp').innerText = grandTotalXP.toLocaleString() + " XP";

    // FIX: Menghitung Rata-rata Dopamine dari data mentah, bukan dari rata-rata per user
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

    const top10 = leaderboard.slice(0, 10); 
    
    chartInstanceComp = new Chart(ctxComp, {
        type: 'bar',
        data: {
            labels: top10.map(u => u.user),
            datasets: [
                {
                    label: 'Task XP',
                    data: top10.map(u => u.sumTaskXP),
                    backgroundColor: '#4f46e5',
                    stack: 'Stack 0',
                },
                {
                    label: 'Learning XP',
                    data: top10.map(u => u.sumLearnXP),
                    backgroundColor: '#f59e0b',
                    stack: 'Stack 0',
                }
            ]
        },
        options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }
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
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        // FIX: Memastikan chart trend memiliki skala
        options: { responsive: true, scales: { y: { min: 0, max: 100 } } } 
    });
};

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    loadIdeas(); 
    
    const form = document.getElementById('idea-form');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    // Expose functions to window
    window.deleteIdea = deleteIdea;
    window.updateStatus = updateStatus;
    window.editIdea = editIdea;
    window.sortIdeas = sortIdeas;
    window.filterIdeas = filterIdeas;
    window.exportIdeas = exportIdeas;
    window.importIdeas = importIdeas;
    
    // HoHo Expose
    window.switchTab = switchTab;
    window.checkHohoLogin = checkHohoLogin;
    window.processHohoData = processHohoData;
    window.fetchHohoSheet = fetchHohoSheet;

    // Aktifkan filter 'all' saat pertama kali dimuat
    filterIdeas('all'); 
});
