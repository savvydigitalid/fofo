// =======================================================
// FOFo V1.9: FINAL STABLE (Clean Code, No Syntax Error, Real-Time Preview)
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

const filterIdeas = (filter) => {
    currentFilter = filter;
    
    // Style untuk tombol filter (Dopamine colors)
    const activeClasses = ['bg-indigo-600', 'text-white', 'shadow-md', 'scale-105'];
    const inactiveClasses = ['bg-white', 'text-gray-600', 'hover:bg-gray-50', 'border', 'border-gray-200'];

    document.querySelectorAll('[id^="filter-"]').forEach(btn => {
        btn.classList.remove(...activeClasses);
        btn.classList.add(...inactiveClasses);
    });

    const activeBtn = document.getElementById(`filter-${filter}`);
    if (activeBtn) {
        activeBtn.classList.remove(...inactiveClasses);
        activeBtn.classList.add(...activeClasses);
    }

    renderIdeas();
};

const sortIdeas = (sort) => {
    currentSort = sort;
    renderIdeas();
};


// === 3. SCORING & PREVIEW LOGIC ===

const getPriorityLabel = (impact, effort) => {
    const netScore = getNetScore(impact, effort);
    let label = '';
    let color = '';

    if (netScore >= 4) {
        label = 'QUICK WIN! ⚡️';
        color = 'bg-green-500 shadow-green-200';
    } else if (netScore >= 0) {
        label = 'BIG BET 🧠';
        color = 'bg-indigo-500 shadow-indigo-200';
    } else {
        label = 'TIME WASTER 🗑️';
        color = 'bg-red-500 shadow-red-200';
    }

    return { label, color, netScore };
};

const updateScorePreview = () => {
    const impactInput = document.getElementById('impact');
    const effortInput = document.getElementById('effort');
    const previewContainer = document.getElementById('score-preview-container');
    const previewLabel = document.getElementById('score-preview-label');
    const previewNet = document.getElementById('score-preview-net');

    const impact = parseInt(impactInput.value);
    const effort = parseInt(effortInput.value);

    // Tampilkan preview HANYA jika kedua input sudah diisi angka 1-5
    if (impact >= 1 && impact <= 5 && effort >= 1 && effort <= 5) {
        const { label, color, netScore } = getPriorityLabel(impact, effort);
        
        previewLabel.textContent = label;
        // Reset class dan set class baru
        previewLabel.className = `inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full text-white shadow-md ${color}`;
        
        previewNet.textContent = `Net Score: ${netScore}`;
        
        previewContainer.classList.remove('hidden');
        previewContainer.classList.add('flex'); // Pake flex biar rapi
    } else {
        previewContainer.classList.add('hidden');
        previewContainer.classList.remove('flex');
    }
};

const calculateAndRenderTotalScore = () => {
    const activeIdeas = ideas.filter(idea => idea.status !== 'done');
    const totalImpact = activeIdeas.reduce((sum, idea) => sum + idea.impact, 0);
    const totalEffort = activeIdeas.reduce((sum, idea) => sum + idea.effort, 0);
    const totalNetScore = totalImpact - totalEffort;

    const scoreElement = document.getElementById('total-score');
    if (!scoreElement) return;

    scoreElement.textContent = `Total Score: ${totalNetScore}`;
    
    // Warna background dashboard score
    if (totalNetScore > 5) {
        scoreElement.className = 'text-sm font-bold px-4 py-2 rounded-xl bg-green-100 text-green-700 border border-green-200'; 
    } else if (totalNetScore >= 0) {
        scoreElement.className = 'text-sm font-bold px-4 py-2 rounded-xl bg-yellow-100 text-yellow-700 border border-yellow-200'; 
    } else {
        scoreElement.className = 'text-sm font-bold px-4 py-2 rounded-xl bg-red-100 text-red-700 border border-red-200'; 
    }
};

// === 4. STATUS & KANBAN LOGIC ===

const getStatusStyle = (status) => {
    switch (status) {
        case 'parked': return { text: 'Parked', icon:'🅿️', color: 'bg-gray-50 text-gray-600 border-gray-200' };
        case 'validated': return { text: 'Validated', icon:'✨', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
        case 'building': return { text: 'Building', icon:'🔨', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
        case 'done': return { text: 'DONE', icon:'🎉', color: 'bg-green-50 text-green-700 border-green-200' };
        default: return { text: 'Unknown', icon:'?', color: 'bg-gray-100' };
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

// === 5. RENDERING (UI CARD BARU) ===

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
        // Style Card ala HoHo (Rounded, Shadow, Clean)
        ideaCard.className = `group bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden`;
        
        ideaCard.innerHTML = `
            <div class="flex justify-between items-start mb-4 relative z-10">
                <div class="flex flex-col">
                    <h3 class="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                        ${idea.title}
                        <button onclick="editIdea(${index})" class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 transition-all p-1 rounded-md hover:bg-gray-50" title="Edit Ide">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                    </h3>
                    <div class="flex items-center gap-2 mt-2">
                         <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.color}">
                            <span class="mr-1.5 text-xs">${status.icon}</span> ${status.text}
                        </span>
                    </div>
                </div>
                
                <div class="flex flex-col items-end gap-2">
                    <span class="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full text-white shadow-sm ${priority.color}">
                        ${priority.label}
                    </span>
                    <div class="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 font-mono">
                        <span class="font-bold">Net:${priority.netScore}</span>
                        <span class="mx-2 text-gray-300">|</span>
                        <span>I:${idea.impact}</span>
                        <span class="text-gray-300">/</span>
                        <span>E:${idea.effort}</span>
                    </div>
                </div>
            </div>
            
            <div class="pt-4 border-t border-gray-50 flex items-center justify-between relative z-10">
                <div class="flex gap-2">
                    ${getActionButton(idea.status, index)}
                    <button onclick="updateStatus(${index}, 'done')" class="${idea.status === 'done' ? 'hidden' : ''} px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-100">
                        Mark Done
                    </button>
                </div>
                <button onclick="deleteIdea(${index})" class="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg" title="Delete Idea">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        `;
        listContainer.appendChild(ideaCard);
    });
    
    // Panggil fungsi total score setiap render
    calculateAndRenderTotalScore();
};

const getActionButton = (currentStatus, index) => {
    const baseClass = "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 border";
    switch (currentStatus) {
        case 'parked':
            return `<button onclick="updateStatus(${index}, 'validated')" class="${baseClass} text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border-yellow-100">Validate ✨</button>`;
        case 'validated':
            return `<button onclick="updateStatus(${index}, 'building')" class="${baseClass} text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-100">Build 🔨</button>`;
        default: return '';
    }
};

// === 6. HANDLERS (EDIT, IMPORT/EXPORT) ===

const editIdea = (index) => {
    const idea = getFilteredAndSortedIdeas()[index];
    let originalIndex = ideas.findIndex(i => i.title === idea.title && i.impact === idea.impact && i.effort === idea.effort);

    const newTitle = prompt("Edit Judul Ide:", idea.title);
    if (newTitle !== null && newTitle.trim() === "") return;
    
    const newImpact = parseInt(prompt(`Edit Impact (1-5):`, idea.impact));
    const newEffort = parseInt(prompt(`Edit Effort (1-5):`, idea.effort));

    if (isNaN(newImpact) || isNaN(newEffort) || newImpact < 1 || newImpact > 5) {
        alert("Skor harus angka 1-5.");
        return;
    }

    if (originalIndex !== -1) {
        ideas[originalIndex].title = newTitle.trim() || idea.title;
        ideas[originalIndex].impact = newImpact;
        ideas[originalIndex].effort = newEffort;
        saveIdeas();
        renderIdeas(); 
    }
};

const handleFormSubmit = (event) => {
    event.preventDefault(); 
    const title = document.getElementById('title').value;
    const impact = parseInt(document.getElementById('impact').value);
    const effort = parseInt(document.getElementById('effort').value);

    if (!title || !impact || !effort) return;

    ideas.unshift({ title, impact, effort, status: 'parked' }); 
    saveIdeas(); 
    renderIdeas(); 
    
    document.getElementById('idea-form').reset();
    updateScorePreview(); // Reset preview
};

const deleteIdea = (index) => {
    const idea = getFilteredAndSortedIdeas()[index];
    const originalIndex = ideas.findIndex(i => i.title === idea.title && i.impact === idea.impact);
    if (originalIndex !== -1 && confirm(`Hapus "${idea.title}"?`)) {
        ideas.splice(originalIndex, 1); 
        saveIdeas(); 
        renderIdeas(); 
    }
};

const exportIdeas = () => {
    if (ideas.length === 0) return alert("Kosong bro!");
    const dataStr = JSON.stringify(ideas, null, 2); 
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dataStr], { type: "application/json" }));
    a.download = `fofo_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
};

const importIdeas = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data) && confirm(`Import ${data.length} ide? Data lama akan ditimpa.`)) {
                ideas = data;
                saveIdeas();
                renderIdeas();
            }
        } catch (error) { alert("File JSON rusak/salah."); }
    };
    reader.readAsText(file);
};

// === 7. INIT (START) ===

document.addEventListener('DOMContentLoaded', () => {
    loadIdeas(); 
    
    const form = document.getElementById('idea-form');
    if (form) form.addEventListener('submit', handleFormSubmit); 
    
    // Listener Real-time Preview
    document.getElementById('impact').addEventListener('input', updateScorePreview);
    document.getElementById('effort').addEventListener('input', updateScorePreview);
    
    // Expose Global Functions
    window.deleteIdea = deleteIdea;
    window.updateStatus = updateStatus;
    window.editIdea = editIdea;
    window.sortIdeas = sortIdeas;
    window.filterIdeas = filterIdeas;
    window.exportIdeas = exportIdeas;
    window.importIdeas = importIdeas;
    
    filterIdeas('all'); 
});
