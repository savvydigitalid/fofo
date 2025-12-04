// =======================================================
// FOFo V1.0: LOGIC LOCALSTORAGE & FORM HANDLER
// =======================================================

// Variabel global untuk menyimpan semua ide
let ideas = [];

// === 1. LOCALSTORAGE HANDLERS ===

// Ambil ide dari LocalStorage saat apps dibuka
const loadIdeas = () => {
    const storedIdeas = localStorage.getItem('fofoIdeas');
    if (storedIdeas) {
        ideas = JSON.parse(storedIdeas);
    }
    renderIdeas(); // Panggil render setelah data dimuat
};

// Simpan ide ke LocalStorage setiap ada perubahan
const saveIdeas = () => {
    localStorage.setItem('fofoIdeas', JSON.stringify(ideas));
};

// === 2. PRIORITAS & DOPAMINE SPARK LOGIC ===

const getPriorityLabel = (impact, effort) => {
    const netScore = impact - effort;
    let label = '';
    let color = '';

    if (netScore >= 4) {
        // Impact JAUH lebih tinggi dari Effort
        label = 'QUICK WIN!';
        color = 'bg-green-500 hover:bg-green-600'; // Dopamine Green
    } else if (netScore >= 0) {
        // Impact/Effort seimbang, atau Impact sedikit lebih besar
        label = 'BIG BET';
        color = 'bg-indigo-500 hover:bg-indigo-600'; // Dopamine Blue/Purple
    } else {
        // Effort JAUH lebih tinggi dari Impact
        label = 'TIME WASTER';
        color = 'bg-red-500 hover:bg-red-600'; // Dopamine Red (signal avoidance)
    }

    return { label, color, netScore };
};

// === 3. RENDERING KE HTML ===

const renderIdeas = () => {
    const listContainer = document.getElementById('idea-list');
    const countElement = document.getElementById('idea-count');
    
    listContainer.innerHTML = ''; // Kosongkan list lama
    countElement.textContent = ideas.length; // Update counter

    ideas.forEach((idea, index) => {
        const priority = getPriorityLabel(idea.impact, idea.effort);
        
        const ideaCard = document.createElement('div');
        ideaCard.className = 'card bg-white p-5 rounded-xl shadow-md border-l-4 border-indigo-200';
        
        // Template HTML untuk setiap kartu ide
        ideaCard.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">${idea.title}</h3>
                    <p class="text-sm text-gray-500 mt-1">
                        Impact: ${idea.impact} | Effort: ${idea.effort} | Net Score: ${priority.netScore}
                    </p>
                </div>
                <span class="inline-block px-3 py-1 text-xs font-semibold uppercase rounded-full text-white ${priority.color}">
                    ${priority.label}
                </span>
            </div>
            <div class="mt-4 flex space-x-2">
                <button onclick="deleteIdea(${index})" 
                        class="text-xs text-red-600 hover:text-red-800 transition duration-150">
                    Kill/Archive
                </button>
            </div>
        `;
        listContainer.appendChild(ideaCard);
    });
};

// === 4. FORM HANDLER ===

const handleFormSubmit = (event) => {
    event.preventDefault(); // Mencegah halaman reload

    const title = document.getElementById('title').value;
    const impact = parseInt(document.getElementById('impact').value);
    const effort = parseInt(document.getElementById('effort').value);

    // Validasi sederhana
    if (!title || !impact || !effort) {
        alert('Mohon lengkapi semua field!');
        return;
    }

    const newIdea = {
        title: title,
        impact: impact,
        effort: effort,
        // Status awal: Parked
        status: 'parked' 
    };

    ideas.unshift(newIdea); // Tambahkan ide baru di paling atas
    saveIdeas(); // Simpan ke LocalStorage
    renderIdeas(); // Render ulang tampilan
    
    // Clear form setelah submit
    document.getElementById('idea-form').reset();
};

// === 5. ACTION HANDLERS ===

const deleteIdea = (index) => {
    if (confirm(`Yakin mau mengarsipkan/membunuh ide "${ideas[index].title}"?`)) {
        ideas.splice(index, 1); // Hapus ide dari array
        saveIdeas(); // Simpan perubahan
        renderIdeas(); // Render ulang
    }
};


// === 6. INIT (Start Apps) ===

// Listener utama yang dijalankan saat apps dimuat
document.addEventListener('DOMContentLoaded', () => {
    loadIdeas(); // Muat data lama
    
    const form = document.getElementById('idea-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit); // Hubungkan form ke fungsi submit
    }
});
