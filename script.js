// =======================================================
// FOFo & HOHo V2.7: SUPER APP (Fix Parkir Ide + Multi-Select)
// =======================================================

// --- CONFIGURATION ---
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlXrKn7kJ_UH_WnxmhGSjsLMWJ8n_3CzfI3f_8zxeWl4x-PtSNIJVSHet-YIq9K4dCGcF-OjXR3mOU/pub?gid=0&single=true&output=csv'; 
const HOHO_PASSWORD = "admin"; 

// --- STATE VARIABLES ---
let ideas = [];
let allSheetData = [];
let chartInstanceComp = null;
let chartInstanceTrend = null;
let currentFilter = 'all'; 
let currentSort = 'default';

// =======================================================
// PART 1: FOFo LOGIC (IDEAS)
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

const filterIdeas = (filter) => { 
    currentFilter = filter; 
    // Logic highlight button sederhana
    document.querySelectorAll('[id^="filter-"]').forEach(btn => {
        if(btn.id === `filter-${filter}`) {
            btn.className = "px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-bold shadow-md transition-all";
        } else {
            btn.className = "px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-bold shadow-sm transition-all";
        }
    });
    renderIdeas(); 
};
const sortIdeas = (sort) => { currentSort = sort; renderIdeas(); };

const getPriorityLabel = (impact, effort) => {
    const netScore = getNetScore(impact, effort);
    let label = netScore >= 4 ? 'QUICK WIN! ⚡️' : (netScore >= 0 ? 'BIG BET 🧠' : 'TIME WASTER 🗑️');
    let color = netScore >= 4 ? 'bg-green-500 shadow-green-200' : (netScore >= 0 ? 'bg-indigo-500 shadow-indigo-200' : 'bg-red-500 shadow-red-200');
    return { label, color, netScore };
};

const calculateAndRenderTotalScore = () => {
    const activeIdeas = ideas.filter(idea => idea.status !== 'done');
    const totalNetScore = activeIdeas.reduce((sum, idea) => sum + getNetScore(idea.impact, idea.effort), 0);
    const scoreElement = document.getElementById('total-score');
    if (scoreElement) {
        scoreElement.textContent = `Total Score: ${totalNetScore}`;
        scoreElement.className = `text-sm font-bold px-3 py-1 rounded-full text-white ${totalNetScore > 5 ? 'bg-green-500' : (totalNetScore >= 0 ? 'bg-yellow-500' : 'bg-red-500')}`;
    }
};

const getStatusStyle = (status) => {
    switch (status) {
        case 'parked': return { text: 'Parked', icon:'🅿️', color: 'bg-gray-100 text-gray-600 border-gray-200' };
        case 'validated': return { text: 'Validated', icon:'✨', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
        case 'building': return { text: 'Building', icon:'🔨', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
        case 'done': return { text: 'DONE', icon:'🎉', color: 'bg-green-50 text-green-700 border-green-200' };
        default: return { text: 'Unknown', icon:'?', color: 'bg-gray-100' };
    }
};

const updateStatus = (index, newStatus) => {
    const ideaToUpdate = getFilteredAndSortedIdeas()[index];
    const originalIndex = ideas.findIndex(idea => idea.title === ideaToUpdate.title && idea.impact === ideaToUpdate.impact);
    if (originalIndex !== -1) { ideas[originalIndex].status = newStatus; saveIdeas(); renderIdeas(); }
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
        const status = getStatusStyle(idea.status);
        const ideaCard = document.createElement('div');
        ideaCard.className = `group bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden`;
        
        let actionBtn = '';
        if(idea.status === 'parked') actionBtn = `<button onclick="updateStatus(${index}, 'validated')" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 border text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border-yellow-100">Validate ✨</button>`;
        else if(idea.status === 'validated') actionBtn = `<button onclick="updateStatus(${index}, 'building')" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 border text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-100">Build 🔨</button>`;

        ideaCard.innerHTML = `
            <div class="flex justify-between items-start mb-4 relative z-10">
                <div class="flex flex-col">
                    <h3 class="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                        ${idea.title}
                        <button onclick="editIdea(${index})" class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 transition-all p-1 rounded-md hover:bg-gray-50">✏️</button>
                    </h3>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.color}">
                            <span class="mr-1.5 text-xs">${status.icon}</span> ${status.text}
                        </span>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <span class="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full text-white shadow-sm ${priority.color}">${priority.label}</span>
                    <div class="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 font-mono">
                        <span class="font-bold">Net:${priority.netScore}</span>
                        <span class="mx-2 text-gray-300">|</span>
                        <span>I:${idea.impact}</span> / <span>E:${idea.effort}</span>
                    </div>
                </div>
            </div>
            <div class="pt-4 border-t border-gray-50 flex items-center justify-between relative z-10">
                <div class="flex gap-2">
                    ${actionBtn}
                    <button onclick="updateStatus(${index}, 'done')" class="${idea.status === 'done' ? 'hidden' : ''} px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-100">Mark Done</button>
                </div>
                <button onclick="deleteIdea(${index})" class="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg">🗑️</button>
            </div>
        `;
        listContainer.appendChild(ideaCard);
    });
    calculateAndRenderTotalScore();
};

const handleFormSubmit = (event) => {
    event.preventDefault(); 
    const title = document.getElementById('title').value;
    const impact = parseInt(document.getElementById('impact').value);
    const effort = parseInt(document.getElementById('effort').value);

    // Validasi input
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

const deleteIdea = (index) => {
    const idea = getFilteredAndSortedIdeas()[index];
    const originalIndex = ideas.findIndex(i => i.title === idea.title && i.impact === idea.impact);
    if (originalIndex !== -1 && confirm(`Hapus "${idea.title}"?`)) {
        ideas.splice(originalIndex, 1); saveIdeas(); renderIdeas(); 
    }
};

const editIdea = (index) => {
    const idea = getFilteredAndSortedIdeas()[index];
    const originalIndex = ideas.findIndex(i => i.title === idea.title && i.impact === idea.impact);
    const newTitle = prompt("Edit Judul Ide:", idea.title);
    if(newTitle && newTitle.trim() !== "") {
        ideas[originalIndex].title = newTitle;
        saveIdeas(); renderIdeas();
    }
};

const exportIdeas = () => {
    if (ideas.length === 0) return alert("Kosong!");
    const dataStr = JSON.stringify(ideas, null, 2); 
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dataStr], { type: "application/json" }));
    a.download = `fofo_backup.json`;
    a.click();
};

const importIdeas = (event) => {
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
// PART 2: HOHO DASHBOARD LOGIC
// =======================================================
const switchTab = (tab) => {
    document.getElementById('view-ideas').classList.toggle('hidden', tab !== 'ideas');
    document.getElementById('view-hoho').classList.toggle('hidden', tab !== 'hoho');
    
    // Simple logic untuk tab button
    const btnIdeas = document.getElementById('tab-ideas');
    const btnHoho = document.getElementById('tab-hoho');
    
    if (tab === 'ideas') {
        btnIdeas.className = "px-6 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white shadow-md transition-all";
        btnHoho.className = "px-6 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all";
    } else {
        btnHoho.className = "px-6 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white shadow-md transition-all";
        btnIdeas.className = "px-6 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all";
    }
};

const checkHohoLogin = () => {
    if (document.getElementById('hoho-password').value === HOHO_PASSWORD) {
        document.getElementById('hoho-login').classList.add('hidden');
        document.getElementById('hoho-dashboard').classList.remove('hidden');
        fetchHohoSheet();
    } else { alert("Password Salah!"); }
};

const parseDate = (dateStr) => {
    const cleanedStr = dateStr.trim().replace(/[\/]/g, '-');
    const parts = cleanedStr.split('-');
    if (parts.length === 3) {
        let year, month, day;
        if (parts[0].length === 4) { [year, month, day] = [parts[0], parts[1], parts[2]]; } 
        else if (parts[2].length === 4) { [day, month, year] = [parts[0], parts[1], parts[2]]; } 
        else { return new Date(dateStr); }
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) return date;
    }
    return new Date(dateStr);
};

const fetchHohoSheet = async () => {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        const rows = text.replace(/\r/g, '').trim().split('\n');
        
        const data = rows.slice(1).map(row => {
            const cols = row.split(',').map(c => c.replace(/"/g, '').trim());
            if (cols.length < 10 || !cols[1]) return null;
            const user = cols[1];
            if (!user || user.length > 50 || user.includes('function')) return null;

            return {
                date: cols[3] || '',
                user: user,
                role: cols[2] || '-',
                taskPerc: parseFloat(cols[4]) || 0,
                taskXP: parseInt(cols[5]) || 0,
                learnXP: parseInt(cols[9]) || 0,
                totalXP: (parseInt(cols[5]) || 0) + (parseInt(cols[9]) || 0)
            };
        }).filter(i => i !== null);

        allSheetData = data;
        populateUserFilter(data);
        processHohoData();
    } catch (err) { alert("Gagal Fetch CSV. Cek Link!"); }
};

const populateUserFilter = (data) => {
    const users = [...new Set(data.map(d => d.user))].filter(u => u).sort();
    const select = document.getElementById('filter-user');
    if(select) {
        select.innerHTML = ''; // Clear default
        users.forEach(u => select.innerHTML += `<option value="${u}">${u}</option>`);
    }
};

const processHohoData = () => {
    const start = document.getElementById('filter-start-date').value;
    const end = document.getElementById('filter-end-date').value;
    
    // MULTI SELECT LOGIC
    const select = document.getElementById('filter-user');
    const selectedUsers = Array.from(select.selectedOptions).map(o => o.value);

    const startDate = start ? parseDate(start) : new Date('2000-01-01');
    const endDate = end ? parseDate(end) : new Date('2099-12-31');
    endDate.setHours(23,59,59);

    const filtered = allSheetData.filter(d => {
        const dDate = parseDate(d.date);
        const isDateValid = !isNaN(dDate.getTime()) && dDate >= startDate && dDate <= endDate;
        // Jika selectedUsers kosong (user gak milih apa2), anggap pilih semua.
        const isUserMatch = selectedUsers.length === 0 || selectedUsers.includes(d.user);
        return isDateValid && isUserMatch;
    });

    updateHohoUI(filtered, selectedUsers);
};

const updateHohoUI = (data, selectedUsers) => {
    // Aggregate per User
    const userStats = {};
    data.forEach(d => {
        if(!userStats[d.user]) userStats[d.user] = { user: d.user, role: d.role, sumXP: 0, sumPerc: 0, count: 0 };
        userStats[d.user].sumXP += d.totalXP;
        userStats[d.user].sumPerc += d.taskPerc;
        userStats[d.user].count++;
    });
    
    const leaderboard = Object.values(userStats).map(u => ({
        ...u, avgPerc: (u.count > 0 ? (u.sumPerc/u.count).toFixed(1) : 0),
        sumTaskXP: 0, // Placeholder jika butuh detail
        sumLearnXP: 0
    })).sort((a,b) => b.sumXP - a.sumXP);

    // Aggregate per Date (Trend)
    const dateStats = {};
    data.forEach(d => {
        if(!dateStats[d.date]) dateStats[d.date] = { sum: 0, count: 0 };
        dateStats[d.date].sum += d.taskPerc;
        dateStats[d.date].count++;
    });
    const dates = Object.keys(dateStats).sort();
    const trend = dates.map(d => (dateStats[d].sum / dateStats[d].count).toFixed(1));

    // Render Cards
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

    // Render Charts
    renderCharts(leaderboard.slice(0, 10), dates, trend, selectedUsers);
    
    // Render Table
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    leaderboard.forEach((u, i) => {
        let icon = i === 0 ? '👑' : (i===1?'🥈':(i===2?'🥉':`#${i+1}`));
        tbody.innerHTML += `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-6 py-4 font-bold text-gray-600">${icon}</td>
                <td class="px-6 py-4 font-medium text-gray-900">${u.user} <span class="text-xs text-gray-400 block">${u.role}</span></td>
                <td class="px-6 py-4 text-center"><span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">${u.avgPerc}%</span></td>
                <td class="px-6 py-4 text-right text-gray-600">-</td>
                <td class="px-6 py-4 text-right text-gray-600">-</td>
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
    chartInstanceTrend = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: selectedUsers.length > 0 ? `Avg Task % (${selectedUsers.length} Staff)` : 'Avg Team Task %',
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

// INIT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    loadIdeas();
    const form = document.getElementById('idea-form');
    if(form) form.addEventListener('submit', handleFormSubmit);
    document.getElementById('impact').addEventListener('input', updateScorePreview);
    document.getElementById('effort').addEventListener('input', updateScorePreview);
});
