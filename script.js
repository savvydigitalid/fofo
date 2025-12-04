// =======================================================
// FOFo V1.3: LOCALSTORAGE, KANBAN STATUS, RENAME, FILTER & SORT (STABLE)
// =======================================================

let ideas = [];
let currentFilter = 'all'; 
let currentSort = 'default'; 

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
    
    if (currentFilter !== 'all') {
        filteredIdeas = ideas.filter(idea => idea.status === currentFilter);
    }

    let sortedIdeas = [...filteredIdeas];

    if (currentSort === 'score') {
        sortedIdeas.sort((a, b) => {
            const scoreA = getNetScore(a.impact, a.effort);
            const scoreB = getNetScore(b.impact, b.effort);
            return scoreB - scoreA; 
        });
    } else {
        const order = ['parked', 'validated', 'building', 'done'];
        sortedIdeas.sort((a, b) => {
            return order.indexOf(a.status) - order.indexOf(b.status);
        });
    }

    return sortedIdeas;
};

// Logik filter yang menggunakan classList (paling stabil)
const filterIdeas = (filter) => {
    currentFilter = filter;
    
    const activeClasses = ['bg-indigo-500', 'text-white', 'hover:bg-indigo-600'];
    const inactiveClasses = ['bg-white', 'border', 'border-gray-300', 'text-gray-700', 'hover:bg-gray-200'];

    document.querySelectorAll('[id^="filter-"]').forEach(btn => {
        // Hapus active, tambah inactive
        activeClasses.forEach(c => btn.classList.remove(c));
        inactiveClasses.forEach(c => btn.classList.add(c));
    });

    const activeBtn = document.getElementById(`filter-${filter}`);
    if (activeBtn) {
        // Hapus inactive, tambah active
        inactiveClasses.forEach(c => activeBtn.classList.remove(c));
        activeClasses.forEach(c => activeBtn.classList.add(c));
    }

    renderIdeas();
};

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
        
        ideaCard.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex flex-col">
                    <h3 class="text-xl font-bold text-gray-800 flex items-center space-x-2">
                        <span>${idea.title}</span>
                        <button onclick="renameIdea(${index})" class="text-gray-400 hover:text-indigo-500 transition duration-150">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-7.586 7.586a1 1 0 000 1.414L10.586 16l-3 3H3a1 1 0 01-1-1v-4L7.586 11.172z" />
                            </svg>
                        </button>
                    </h3>
                    <span class="text-xs font-medium uppercase ${status.color} px-2 py-0.5 rounded-full mt-1 inline-block w-fit">
                        ${status.text}
                    </span>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 text-xs font-semibold uppercase rounded-full text-white ${priority.color}">
                        ${priority.label}
                    </span>
                    <p class="text-xs text-gray-500 mt-1">
                        I:${idea.impact} / E:${idea.effort} / S:${priority.netScore}
                    </p>
                </div>
            </div>
            
            <div class="mt-4 flex space-x-3 border-t pt-3">
                ${getActionButton(idea.status, index)}
                
                <button onclick="updateStatus(${index}, 'done')" 
                        class="text-xs text-green-600 hover:text-green-800 transition duration-150 font-semibold ${idea.status === 'done' ? 'hidden' : ''}">
                    Mark as Done 🎉
                </button>

                <button onclick="deleteIdea(${index})" 
                        class="text-xs text-red-600 hover:text-red-800 transition duration-150 ml-auto">
                    Archive/Kill 🗑️
                </button>
            </div>
        `;
        listContainer.appendChild(ideaCard);
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Fungsi yang menentukan tombol aksi apa yang harus ditampilkan
const getActionButton = (currentStatus, index) => {
    switch (currentStatus) {
        case 'parked':
            return `<button onclick="updateStatus(${index}, 'validated')" 
                        class="text-xs text-yellow-600 hover:text-yellow-800 transition duration-150 font-medium">
                        Mark as Validated ✅
                    </button>`;
        case 'validated':
            return `<button onclick="updateStatus(${index}, 'building')" 
                        class="text-xs text-indigo-600 hover:text-indigo-800 transition duration-150 font-medium">
                        Move to Building 🔨
                    </button>`;
        case 'building':
            return ''; 
        case 'done':
            return '';
        default:
            return '';
    }
};

// === 6. HANDLERS LAMA ===

const renameIdea = (index) => {
    const idea = getFilteredAndSortedIdeas()[index];
    const newTitle = prompt("Ganti Judul Ide:", idea.title);

    if (newTitle !== null && newTitle.trim() !== "" && newTitle !== idea.title) {
        const originalIndex = ideas.findIndex(i => i.title === idea.title && i.impact === idea.impact);
        if (originalIndex !== -1) {
            ideas[originalIndex].title = newTitle.trim();
            saveIdeas();
            renderIdeas();
        }
    }
};

const handleFormSubmit = (event) => {
    event.preventDefault(); 

    const title = document.getElementById('title').value;
    const impact = parseInt(document.getElementById('impact').value);
    const effort = parseInt(document.getElementById('effort').value);

    if (!title || !impact || !effort) {
        alert('Mohon lengkapi semua field!');
        return;
    }

    const newIdea = {
        title: title,
        impact: impact,
        effort: effort,
        status: 'parked'
    };

    ideas.unshift(newIdea); 
    saveIdeas(); 
    renderIdeas(); 
    
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
// === 6.5 DATA SAFETY HANDLERS (IMPORT/EXPORT) ===

const exportIdeas = () => {
    if (ideas.length === 0) {
        alert("Tidak ada ide untuk di-export!");
        return;
    }

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
    
    console.log("Data berhasil di-export.");
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
            console.error(error);
            alert("Gagal memproses file. Pastikan file JSON valid.");
        }
    };
    reader.readAsText(file);
};
// === 7. INIT (Start Apps) ===

document.addEventListener('DOMContentLoaded', () => {
    loadIdeas(); 
    
    const form = document.getElementById('idea-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit); 
    }
    
    // Expose functions to window
    window.deleteIdea = deleteIdea;
    window.updateStatus = updateStatus;
    window.renameIdea = renameIdea;
    window.sortIdeas = sortIdeas;
    window.filterIdeas = filterIdeas;
    window.exportIdeas = exportIdeas;
    window.importIdeas = importIdeas;
    
    // Aktifkan filter 'all' saat pertama kali dimuat
    filterIdeas('all'); 
});
