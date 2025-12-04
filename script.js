// =======================================================
// FOFo V1.3: LOCALSTORAGE, KANBAN STATUS, RENAME, FILTER & SORT (FIXED)
// =======================================================

let ideas = [];
let currentFilter = 'all'; // Filter default: Tampilkan semua
let currentSort = 'default'; // Sort default: Urutan input

// === 1. LOCALSTORAGE & PERSISTENCE ===

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

const saveIdeas = () => {
    localStorage.setItem('fofoIdeas', JSON.stringify(ideas));
};

// === 2. FILTER & SORT LOGIC ===

const getNetScore = (impact, effort) => impact - effort;

const getFilteredAndSortedIdeas = () => {
    let filteredIdeas = ideas;
    
    // Filtering
    if (currentFilter !== 'all') {
        filteredIdeas = ideas.filter(idea => idea.status === currentFilter);
    }

    // Sorting
    let sortedIdeas = [...filteredIdeas];

    if (currentSort === 'score') {
        sortedIdeas.sort((a, b) => {
            const scoreA = getNetScore(a.impact, a.effort);
            const scoreB = getNetScore(b.impact, b.effort);
            return scoreB - scoreA; // Urutkan dari skor tertinggi
        });
    } else {
        // Sort default (berdasarkan status)
        const order = ['parked', 'validated', 'building', 'done'];
        sortedIdeas.sort((a, b) => {
            return order.indexOf(a.status) - order.indexOf(b.status);
        });
    }

    return sortedIdeas;
};

// Fungsi yang dipanggil saat tombol Filter ditekan
const filterIdeas = (filter) => {
    currentFilter = filter;
    
    // --- LOGIC PENGGANTIAN WARNA TOMBOL SEMENTARA DINONAKTIFKAN ---
    // --- Tombol tidak akan berubah warna, tapi harus berfungsi ---
    
    renderIdeas();
};

// Fungsi yang dipanggil saat tombol Sort ditekan
const sortIdeas = (sort) => {
    currentSort = sort;
    renderIdeas();
};


// === 3. PRIORITAS & DOPAMINE SPARK LOGIC (Scoring) ===

const getPriorityLabel = (impact, effort) => {
    const netScore = getNetScore(impact, effort);
    let label = '';
    let color = '';

    if (netScore >= 4) {
        label = 'QUICK WIN! ⚡️';
        color = 'bg-green-500';
    } else if (netScore >= 0) {
        label = 'BIG BET 🧠';
        color = 'bg-indigo-500';
    } else {
        label = 'TIME WASTER 🗑️';
        color = 'bg-red-500';
    }

    return { label, color, netScore };
};

// === 4. STATUS KANBAN LOGIC ===

const getStatusStyle = (status) => {
    switch (status) {
        case 'parked':
            return { text: 'Parked 🅿️', color: 'bg-gray-300 text-gray-800' };
        case 'validated':
            return { text: 'Validated ✅', color: 'bg-yellow-500 text-white' };
        case 'building':
            return { text: 'Building 🔨', color: 'bg-indigo-500 text-white' };
        case 'done':
            return { text: 'DONE! 🎉', color: 'bg-green-600 text-white' };
        default:
            return { text: 'Unknown', color: 'bg-gray-200' };
    }
};

const updateStatus = (index, newStatus) => {
    // Cari index berdasarkan ide asli sebelum disort/filter
    const ideaToUpdate = getFilteredAndSortedIdeas()[index];
    const originalIndex = ideas.findIndex(idea => idea.title === ideaToUpdate.title && idea.impact === ideaToUpdate.impact);

    if (originalIndex !== -1) {
        ideas[originalIndex].status = newStatus;
        saveIdeas();
        renderIdeas();
    }
};

// === 5. RENDERING KE HTML ===

const renderIdeas = () => {
    const listContainer = document.getElementById('idea-list');
    const countElement = document.getElementById('idea-count');
    
    // Ambil data yang sudah difilter dan disort
    const ideasToRender = getFilteredAndSortedIdeas();

    listContainer.innerHTML = '';
    countElement.textContent = ideasToRender.length; 

    ideasToRender.forEach((idea, index) => {
        const priority = getPriorityLabel(idea.impact, idea.effort);
        const status = getStatusStyle(idea.status);
        
        const ideaCard = document.createElement('div');
        const statusBorder = idea.status === 'done' ? 'border-l-4 border-green-500' : 
                             idea.status === 'building' ? 'border-l-4 border-indigo-500' :
                             'border-l-4 border-gray-300';

        ideaCard.className = `card bg-white p-5 rounded-xl shadow-md ${statusBorder}`;
