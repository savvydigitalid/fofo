// =======================================================
// FOFo x HOHo V3.2: FINAL FIX DATA FETCHING (NO BUGS)
// =======================================================

// --- CONFIGURATION ---
// Link CSV asli lo (jangan diubah)
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
// PART 1: INIT & ROUTING
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
    // Tampilkan Layout Admin (Putih)
    const adminContainer = document.querySelector('.max-w-5xl');
    if(adminContainer) adminContainer.classList.remove('hidden');
    
    const tvContainer = document.getElementById('view-staff-tv');
    if(tvContainer) tvContainer.classList.add('hidden');
    
    // Load FoFo Data
    loadIdeas();
    const form = document.getElementById('idea-form');
    if(form) form.addEventListener('submit', handleFormSubmit);
    
    // Listeners tambahan untuk preview
    const impactInput = document.getElementById('impact');
    if(impactInput) impactInput.addEventListener('input', updateScorePreview);
    
    const effortInput = document.getElementById('effort');
    if(effortInput) effortInput.addEventListener('input', updateScorePreview);

    filterIdeas('all');
}

function initTVMode() {
    // Hide Admin, Show TV (Gelap)
    document.querySelector('.max-w-5xl').classList.add('hidden'); 
    document.body.classList.remove('bg-gray-50', 'text-gray-800'); 
    document.body.classList.add('bg-gray-900'); 
    document.getElementById('view-staff-tv').classList.remove('hidden');

    // Auto Fetch Data (TV Mode selalu fetch true)
    fetchHohoSheet(true); 
    setInterval(() => fetchHohoSheet(true), 300000); // Refresh 5 min

    // Init Gacha Wheel
    setTimeout(() => {
        if(window.initWheel) window.initWheel();
    }, 1000);
}

// =======================================================
// PART 2: FOFO LOGIC (INPUT IDE, EDIT, DELETE)
// =======================================================
const loadIdeas = () => {
    const storedIdeas = localStorage.getItem('fofoIdeas');
    if (storedIdeas) {
        ideas = JSON.parse(storedIdeas).map(idea => ({ ...idea, status: idea.status || 'parked' }));
    }
    renderIdeas(); 
};
const saveIdeas = () => localStorage.setItem('fofoIdeas', JSON.stringify(ideas));
const getNetScore = (impact, effort) => impact - effort;

// --- FORM SUBMIT ---
const handleFormSubmit = (event) => {
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
};

const updateScorePreview = () => {
    const impact = parseInt(document.getElementById('impact').value);
    const effort = parseInt(document.getElementById('effort').value);
    const container = document.getElementById('score-preview-container');
    const label = document.getElementById('score-preview-label');
    const net = document.getElementById('score-preview-net');

    if (!isNaN(impact) && !isNaN(effort)) {
        const { label: txt, color, netScore } = getPriorityLabel(impact, effort);
        label.textContent = txt;
        label.className = `inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full text-white shadow-md ${color}`;
        net.textContent = `Net Score: ${netScore}`;
        container.classList.remove('hidden'); container.classList.add('flex');
    } else {
        container.classList.add('hidden'); container.classList.remove('flex');
    }
};

const getPriorityLabel = (impact, effort) => {
    const netScore = getNetScore(impact, effort);
    let label = netScore >= 4 ? 'QUICK WIN! ⚡️' : (netScore >= 0 ? 'BIG BET 🧠' : 'TIME WASTER 🗑️');
    let color = netScore >= 4 ? 'bg-green-500' : (netScore >= 0 ? 'bg-indigo-500' : 'bg-red-500');
    return { label, color, netScore };
};

const getFilteredAndSortedIdeas = () => {
    let filtered = ideas;
    if (currentFilter !== 'all') filtered = ideas.filter(idea => idea.status === currentFilter);
    let sorted = [...filtered];
    if (currentSort === 'score') {
        sorted.sort((a, b) => getNetScore(b.impact, b.effort) - getNetScore(a.impact, a.effort)); 
    } else {
        const order = ['parked', 'validated', 'building', 'done'];
        sorted.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
    }
    return sorted;
};

const renderIdeas = () => {
    const listContainer = document.getElementById('idea-list');
    const countElement = document.getElementById('idea-count');
    if (!listContainer) return;
    
    const ideasToRender = getFilteredAndSortedIdeas();
    listContainer.innerHTML = '';
    if (countElement) countElement.textContent = ideasToRender.length; 

    ideasToRender.forEach((idea, index) => {
        const priority = getPriorityLabel(idea.impact, idea.effort);
        
        let statusStyle = { text: 'Unknown', color: 'bg-gray-200' };
        if(idea.status === 'parked') statusStyle = { text: 'Parked', color: 'bg-gray-100 text-gray-600' };
        if(idea.status === 'validated') statusStyle = { text: 'Validated', color: 'bg-yellow-100 text-yellow-700' };
        if(idea.status === 'building') statusStyle = { text: 'Building', color: 'bg-indigo-100 text-indigo-700' };
        if(idea.status === 'done') statusStyle = { text: 'Done', color: 'bg-green-100 text-green-700' };

        const ideaCard = document.createElement('div');
        ideaCard.className = `bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-4`;
        
        let actionBtn = '';
        if(idea.status === 'parked') actionBtn = `<button onclick="updateStatus(${index}, 'validated')" class="px-3 py-1 text-xs font-bold text-yellow-600 bg-yellow-50 rounded hover:bg-yellow-100">Validate</button>`;
        else if(idea.status === 'validated') actionBtn = `<button onclick="updateStatus(${index}, 'building')" class="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100">Build</button>`;

        ideaCard.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-gray-800">${idea.title}</h3>
                    <div class="flex gap-2 mt-2">
                        <span class="px-2 py-0.5 rounded text-xs font-bold ${statusStyle.color}">${statusStyle.text}</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="px-2 py-1 rounded text-xs text-white font-bold ${priority.color}">${priority.label}</span>
                    <div class="text-xs text-gray-400 mt-1">I:${idea.impact} / E:${idea.effort}</div>
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-gray-100 flex gap-2 justify-end">
                ${actionBtn}
                <button onclick="deleteIdea(${index})" class="text-xs text-red-400 hover:text-red-600">Delete</button>
            </div>
        `;
        listContainer.appendChild(ideaCard);
    });
};

// --- Expose FoFo Functions ---
window.handleFormSubmit = handleFormSubmit; 
window.deleteIdea = (index) => {
    const originalIndex = ideas.findIndex(i => i.title === getFilteredAndSortedIdeas()[index].title);
    if(originalIndex !== -1) { ideas.splice(originalIndex, 1); saveIdeas(); renderIdeas(); }
};
window.updateStatus = (index, status) => {
    const originalIndex = ideas.findIndex(i => i.title === getFilteredAndSortedIdeas()[index].title);
    if(originalIndex !== -1) { ideas[originalIndex].status = status; saveIdeas(); renderIdeas(); }
};
window.filterIdeas = (filter) => { currentFilter = filter; renderIdeas(); };
window.sortIdeas = (sort) => { currentSort = sort; renderIdeas(); };
window.exportIdeas = () => { 
    if (ideas.length === 0) return alert("Kosong!");
    const dataStr = JSON.stringify(ideas, null, 2); 
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dataStr], { type: "application/json" }));
    a.download = `fofo_backup.json`;
    a.click(); 
};
window.importIdeas = (event) => { 
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) { ideas = data; saveIdeas(); renderIdeas(); alert("Success!"); }
        } catch (error) { alert("File Error"); }
    };
    reader.readAsText(file);
};


// =======================================================
// PART 3: HOHO DATA FETCHING & PARSING
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
            // Regex split untuk menangani koma dalam kutip
            const c = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',');
            // Clean up quotes
            const cleanC = c.map(col => col ? col.replace(/^"|"$/g, '').trim() : '');

            // Pastikan kolom User (Index 1) ada dan valid
            if (cleanC.length < 10 || !cleanC[1]) return null;
            
            return {
                date: cleanC[3] || '',
                user: cleanC[1],
                role: cleanC[2] || 'Staff',
                taskPerc: parseFloat(cleanC[4]) || 0,
                taskXP: parseInt(cleanC[5]) || 0,
                learnXP: parseInt(cleanC[9]) || 0,
                totalXP: (parseInt(cleanC[5]) || 0) + (parseInt(cleanC[9]) || 0)
            };
        }).filter(i => i !== null);

        allSheetData = data;

        if (isTV) {
            renderTVDashboard(data);
        } else {
            // Logic Admin Dashboard - FIXED CALL (Langsung panggil function)
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
// PART 4: HOHO ADMIN DASHBOARD
// =======================================================
window.switchTab = (tab) => {
    document.getElementById('view-ideas').classList.toggle('hidden', tab !== 'ideas');
    document.getElementById('view-hoho').classList.toggle('hidden', tab !== 'hoho');
};

window.checkHohoLogin = () => {
    if (document.getElementById('hoho-password').value === HOHO_PASSWORD) {
        document.getElementById('hoho-login').classList.add('hidden');
        document.getElementById('hoho-dashboard').classList.remove('hidden');
        // Fetch data saat login berhasil
        fetchHohoSheet(false);
    } else { alert("Password Salah!"); }
};

const populateUserFilter = (data) => {
    const users = [...new Set(data.map(d => d.user))].sort();
    const select = document.getElementById('filter-user');
    if(select) {
        select.innerHTML = '<option value="all">Semua Staff</option>';
        users.forEach(u => select.innerHTML += `<option value="${u}">${u}</option>`);
    }
};

window.processHohoData = () => { processHohoData(); }; // Expose wrapper

const processHohoData = () => {
    const start = document.getElementById('filter-start-date').value;
    const end = document.getElementById('filter-end-date').value;
    
    // Multi-Select Logic
    const select = document.getElementById('filter-user');
    const selectedUsers = Array.from(select.selectedOptions).map(o => o.value);

    const startDate = start ? parseDate(start) : new Date('2000-01-01');
    const endDate = end ? parseDate(end) : new Date('2099-12-31');
    endDate.setHours(23,59,59);

    const filtered = allSheetData.filter(d => {
        const dDate = parseDate(d.date);
        const isDateValid = !isNaN(dDate.getTime()) && dDate >= startDate && dDate <= endDate;
        // Logic: Kalo gak pilih apa2, atau pilih 'all', atau user termasuk yg dipilih
        const isUserMatch = selectedUsers.length === 0 || selectedUsers.includes('all') || selectedUsers.includes(d.user);
        return isDateValid && isUserMatch;
    });

    updateHohoUI(filtered, selectedUsers);
};

const updateHohoUI = (data, selectedUsers) => {
    const userStats = {};
    data.forEach(d => {
        if(!userStats[d.user]) userStats[d.user] = { 
            user: d.user, role: d.role, sumXP: 0, sumPerc: 0, count: 0, sumTaskXP: 0, sumLearnXP: 0 
        };
        userStats[d.user].sumXP += d.totalXP;
        userStats[d.user].sumPerc += d.taskPerc;
        userStats[d.user].sumTaskXP += d.taskXP;
        userStats[d.user].sumLearnXP += d.learnXP;
        userStats[d.user].count++;
    });
    
    const leaderboard = Object.values(userStats).sort((a,b) => b.sumXP - a.sumXP)
        .map(u => ({...u, avgPerc: (u.count > 0 ? (u.sumPerc/u.count).toFixed(1) : 0)}));

    // Date Stats for Chart
    const dateStats = {};
    data.forEach(d => {
        if(!dateStats[d.date]) dateStats[d.date] = { sum: 0, count: 0 };
        dateStats[d.date].sum += d.taskPerc;
        dateStats[d.date].count++;
    });
    const dates = Object.keys(dateStats).sort();
    const trend = dates.map(d => (dateStats[d].sum / dateStats[d].count).toFixed(1));

    // Cards
    const grandTotalXP = leaderboard.reduce((acc, curr) => acc + curr.sumXP, 0);
    document.getElementById('stat-total-xp').innerText = grandTotalXP.toLocaleString() + " XP";
    
    const totalPerc = data.reduce((acc, curr) => acc + curr.taskPerc, 0);
    const grandAvg = data.length > 0 ? (totalPerc / data.length).toFixed(1) : 0;
    document.getElementById('stat-avg-dopamine').innerText = grandAvg + "%";
    document.getElementById('stat-bar-dopamine').style.width = grandAvg + "%";

    if(leaderboard[0]) {
        document.getElementById('stat-top-user').innerText = leaderboard[0].user;
        document.getElementById('stat-top-role').innerText = leaderboard[0].role;
    } else {
        document.getElementById('stat-top-user').innerText = "-";
        document.getElementById('stat-top-role').innerText = "-";
    }

    renderCharts(leaderboard.slice(0, 10), dates, trend, selectedUsers);
    
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    leaderboard.forEach((u, i) => {
        let icon = i===0?'👑':(i===1?'🥈':(i===2?'🥉':`#${i+1}`));
        tbody.innerHTML += `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-6 py-4 font-bold text-gray-600">${icon}</td>
                <td class="px-6 py-4 font-medium text-gray-900">${u.user} <span class="text-xs text-gray-400 block">${u.role}</span></td>
                <td class="px-6 py-4 text-center"><span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">${u.avgPerc}%</span></td>
                <td class="px-6 py-4 text-right text-gray-600">${u.sumTaskXP}</td>
                <td class="px-6 py-4 text-right text-gray-600">${u.sumLearnXP}</td>
                <td class="px-6 py-4 text-right font-bold text-indigo-600">${u.sumXP} XP</td>
            </tr>`;
    });
};

const renderCharts = (topUsers, labels, data, selectedUsers) => {
    const ctx1 = document.getElementById('chart-comparison').getContext('2d');
    if (chartInstanceComp) chartInstanceComp.destroy();
    chartInstanceComp = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: topUsers.map(u => u.user),
            datasets: [{ label: 'Total XP', data: topUsers.map(u => u.sumXP), backgroundColor: '#4f46e5' }]
        },
        options: { responsive: true }
    });

    const ctx2 = document.getElementById('chart-trend').getContext('2d');
    if (chartInstanceTrend) chartInstanceTrend.destroy();
    
    let label = 'Avg Team Task %';
    if(selectedUsers.length > 0 && !selectedUsers.includes('all')) label = `Selected Staff Task %`;

    chartInstanceTrend = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 100 } } }
    });
};

// =======================================================
// PART 5: WEEKLY PRESET & GACHA
// =======================================================
window.setFilterPreset = (type) => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);
    
    const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    if (type === 'thisWeek') {
        const day = start.getDay() || 7;
        if (day !== 1) start.setHours(-24 * (day - 1));
        end = new Date(); 
    } 
    else if (type === 'lastWeek') {
        const day = start.getDay() || 7;
        start.setHours(-24 * (day - 1 + 7));
        end = new Date(start);
        end.setDate(end.getDate() + 6);
    }
    else if (type === 'thisMonth') {
        start.setDate(1);
        end = new Date(); 
    }

    document.getElementById('filter-start-date').value = formatDate(start);
    document.getElementById('filter-end-date').value = formatDate(end);
    processHohoData();
};

window.runGacha = () => { /* Logic Gacha (Opsional, sudah ada di versi sebelumnya) */ };
window.initWheel = () => { /* Logic Wheel */ };
// ... Sisa fungsi Gacha bisa di-copy dari V3.0 kalau butuh ...
