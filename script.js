// =======================================================
// FOFo V1.2: LOGIC LOCALSTORAGE, KANBAN STATUS, & RENAME
// =======================================================

let ideas = [];

// === 1. LOCALSTORAGE HANDLERS ===

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

// === 2. PRIORITAS & DOPAMINE SPARK LOGIC (Scoring) ===

const getPriorityLabel = (impact, effort) => {
    const netScore = impact - effort;
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

// === 3. STATUS KANBAN LOGIC (Visual Progress) ===

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
    if (ideas[index]) {
        ideas[index].status = newStatus;
        saveIdeas();
        renderIdeas();
    }
};

// === 4. RENDERING KE HTML ===

const renderIdeas = () => {
    const listContainer = document.getElementById('idea-list');
    const countElement = document.getElementById('idea-count');
    
    // Sort ideas: Parked/Validated/Building di atas, Done di bawah
    const sortedIdeas = ideas.sort((a, b) => {
        const order = ['parked', 'validated', 'building', 'done'];
        return order.indexOf(a.status) - order.indexOf(b.status);
    });

    listContainer.innerHTML = '';
    countElement.textContent = ideas.length; 

    sortedIdeas.forEach((idea, index) => {
        const priority = getPriorityLabel(idea.impact, idea.effort);
        const status = getStatusStyle(idea.status);
        
        const ideaCard = document.createElement('div');
        const statusBorder = idea.status === 'done' ? 'border-l-4 border-green-500' : 
                             idea.status === 'building' ? 'border-l-4 border-indigo-500' :
                             'border-l-4 border-gray-300';

        ideaCard.className = `card bg-white p-5 rounded-xl shadow-md ${statusBorder}`;
        
        // Template HTML untuk setiap kartu ide
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


// === 5. RENAME HANDLER BARU ===

const renameIdea = (index) => {
    const idea = ideas[index];
    // Gunakan prompt() JavaScript untuk mengambil input baru
    const newTitle = prompt("Ganti Judul Ide:", idea.title);

    if (newTitle !== null && newTitle.trim() !== "" && newTitle !== idea.title) {
        ideas[index].title = newTitle.trim();
        saveIdeas();
        renderIdeas();
        // Dopamine Spark kecil: notifikasi sukses rename
        console.log(`Judul ide berhasil diubah menjadi: ${newTitle.trim()}`);
    }
};

// === 6. FORM & DELETE HANDLER LAMA ===

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
    if (confirm(`Yakin mau mengarsipkan/membunuh ide "${ideas[index].title}"?`)) {
        ideas.splice(index, 1); 
        saveIdeas(); 
        renderIdeas(); 
    }
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
    window.renameIdea = renameIdea; // Tambahkan fungsi rename ke window
});
