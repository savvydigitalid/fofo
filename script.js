// =======================================================
// FOFo V2.0: IDEAS + HOHO DASHBOARD
// =======================================================

// --- CONFIGURATION ---
// GANTI LINK INI DENGAN LINK CSV DARI 'PUBLISH TO WEB' GOOGLE SHEET LO
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlXrKn7kJ_UH_WnxmhGSjsLMWJ8n_3CzfI3f_8zxeWl4x-PtSNIJVSHet-YIq9K4dCGcF-OjXR3mOU/pub?gid=0&single=true&output=csv';

const HOHO_PASSWORD = "admin"; // GANTI PASSWORD DISINI

// --- GLOBAL VARIABLES ---
let ideas = [];
let currentFilter = 'all'; 
let currentSort = 'default'; 

// =======================================================
// 1. TAB SYSTEM & LOGIN LOGIC
// =======================================================

const switchTab = (tabName) => {
    const viewIdeas = document.getElementById('view-ideas');
    const viewHoho = document.getElementById('view-hoho');
    const btnIdeas = document.getElementById('tab-ideas');
    const btnHoho = document.getElementById('tab-hoho');

    if (tabName === 'ideas') {
        viewIdeas.classList.remove('hidden');
        viewHoho.classList.add('hidden');
        
        // Active State Style
        btnIdeas.className = "px-4 py-2 rounded-lg text-sm font-bold bg-white shadow-sm text-gray-900 transition-all";
        btnHoho.className = "px-4 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-900 transition-all";
    } else {
        viewIdeas.classList.add('hidden');
        viewHoho.classList.remove('hidden');

        // Active State Style
        btnHoho.className = "px-4 py-2 rounded-lg text-sm font-bold bg-white shadow-sm text-gray-900 transition-all";
        btnIdeas.className = "px-4 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-900 transition-all";
    }
};

const checkHohoLogin = () => {
    const input = document.getElementById('hoho-password').value;
    const loginGate = document.getElementById('hoho-login');
    const dashboard = document.getElementById('hoho-dashboard');

    if (input === HOHO_PASSWORD) {
        loginGate.classList.add('hidden');
        dashboard.classList.remove('hidden');
        fetchHohoData(); // Auto fetch data saat login berhasil
    } else {
        alert("Password Salah! Akses Ditolak 🚫");
        document.getElementById('hoho-password').value = '';
    }
};

// =======================================================
// 2. HOHO DASHBOARD LOGIC (Google Sheets)
// =======================================================

const fetchHohoData = async () => {
    const loading = document.getElementById('hoho-loading');
    const list = document.getElementById('staff-list');
    
    // Reset View
    list.innerHTML = '';
    loading.classList.remove('hidden');

    try {
        const response = await fetch(SHEET_CSV_URL);
        const dataText = await response.text();
        
        // Parse CSV manual (Simple Parser)
        const rows = dataText.split('\n').map(row => row.split(','));
        const headers = rows[0]; // Baris pertama adalah header
        const staffData = rows.slice(1); // Sisanya data

        loading.classList.add('hidden');

        staffData.forEach(row => {
            // Asumsi urutan kolom: Nama, Role, XP, Gold (Sesuaikan index array [0], [1] dst dgn sheet lo)
            // Bersihkan data dari tanda kutip jika ada
            const name = row[0]?.replace(/"/g, '') || 'Unknown';
            const role = row[1]?.replace(/"/g, '') || '-';
            const xp = row[2]?.replace(/"/g, '') || '0';
            const gold = row[3]?.replace(/"/g, '') || '0';

            // Jangan render baris kosong
            if (!name || name.trim() === '') return;

            const card = document.createElement('div');
            card.className = "bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between";
            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                        ${name.charAt(0)}
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-900">${name}</h3>
                        <p class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md inline-block">${role}</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-bold text-yellow-600 flex items-center justify-end gap-1">
                        <span>💰</span> ${gold} G
                    </div>
                    <div class="text-xs font-bold text-indigo-600 flex items-center justify-end gap-1 mt-1">
                        <span>⭐</span> ${xp} XP
                    </div>
                </div>
            `;
            list.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        loading.classList.add('hidden');
        list.innerHTML = `<p class="text-center text-red-500">Gagal mengambil data. Pastikan Link CSV benar.</p>`;
    }
};

// =======================================================
// 3. CORE LOGIC (IDEAS APP) - Tetap Sama
// =======================================================

// ... (Disini kode loadIdeas, saveIdeas, renderIdeas, dll dari V1.9 lo)
// ... (Copas bagian bawah dari script V1.9 sebelumnya KECUALI bagian INIT)
// Biar gak kepanjangan, gue tulis bagian INIT-nya aja di bawah.
// Pastikan fungsi-fungsi loadIdeas, saveIdeas, dll TETAP ADA di file ini ya.

const loadIdeas = () => {
    const storedIdeas = localStorage.getItem('fofoIdeas');
    if (storedIdeas) {
        ideas = JSON.parse(storedIdeas).map(idea => ({ ...idea, status: idea.status || 'parked' }));
    }
    renderIdeas(); 
};
const saveIdeas = () => localStorage.setItem('fofoIdeas', JSON.stringify(ideas));
const getNetScore = (impact, effort) => impact - effort;

// ... (Paste sisa logic V1.9 disini: getFilteredAndSortedIdeas, filterIdeas, sortIdeas, renderIdeas, dll) ...
// GUE TULIS SINGKAT BIAR GAK OVERWHELMING, TAPI HARUSNYA KODE LENGKAP V1.9 LO ADA DISINI.

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    loadIdeas(); 
    
    // Listener Idea Form
    const form = document.getElementById('idea-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('title').value;
            const impact = parseInt(document.getElementById('impact').value);
            const effort = parseInt(document.getElementById('effort').value);
            if (!title) return;
            ideas.unshift({ title, impact, effort, status: 'parked' });
            saveIdeas(); renderIdeas();
            form.reset(); updateScorePreview();
        });
    }

    // Listener Preview
    document.getElementById('impact')?.addEventListener('input', updateScorePreview);
    document.getElementById('effort')?.addEventListener('input', updateScorePreview);
    
    // Expose Functions
    window.switchTab = switchTab;
    window.checkHohoLogin = checkHohoLogin;
    window.fetchHohoData = fetchHohoData;
    // ... expose fungsi idea lainnya ...
});
