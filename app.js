const STORAGE_KEY = 'wine_cellar_app_data_v6';

// Structure de données globale
let appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  cellars: [],
  activeCellarId: null
};

// DOM Elements
const cellarSelect = document.getElementById('cellar-select');
const cellarGrid = document.getElementById('cellar-grid');
const searchInput = document.getElementById('search-input');

// Stats DOM
const statTotal = document.getElementById('stat-total');
const statRouge = document.getElementById('stat-rouge');
const statBlanc = document.getElementById('stat-blanc');
const statRose = document.getElementById('stat-rose');
const statPetillant = document.getElementById('stat-petillant');

// Modals
const modalCellarConfig = document.getElementById('modal-cellar-config');
const modalBottle = document.getElementById('modal-bottle');

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();

  if (!appData.cellars || appData.cellars.length === 0) {
    openCellarConfigModal(true);
  } else {
    if (!appData.activeCellarId || !appData.cellars.find(c => c.id === appData.activeCellarId)) {
      appData.activeCellarId = appData.cellars[0].id;
    }
    initApp();
  }
});

function setupEventListeners() {
  cellarSelect.addEventListener('change', (e) => {
    appData.activeCellarId = e.target.value;
    saveAndRefresh();
  });

  document.getElementById('btn-new-cellar').addEventListener('click', () => openCellarConfigModal(false));
  document.getElementById('btn-config').addEventListener('click', () => openCellarConfigModal(false));
  document.getElementById('btn-close-cellar-config').addEventListener('click', () => {
    if (appData.cellars.length > 0) modalCellarConfig.classList.remove('active');
  });
  document.getElementById('form-cellar-config').addEventListener('submit', saveCellarConfig);
  document.getElementById('btn-delete-cellar').addEventListener('click', deleteCurrentCellar);

  document.getElementById('btn-close-bottle').addEventListener('click', () => modalBottle.classList.remove('active'));
  document.getElementById('form-bottle').addEventListener('submit', saveBottle);
  document.getElementById('btn-delete-bottle').addEventListener('click', deleteBottle);

  searchInput.addEventListener('input', handleSearch);

  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('input-import').addEventListener('change', importData);
}

function initApp() {
  renderCellarSelector();
  renderGrid();
  updateStats();
}

function saveAndRefresh() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  initApp();
}

function getCurrentCellar() {
  return appData.cellars.find(c => c.id === appData.activeCellarId);
}

function renderCellarSelector() {
  cellarSelect.innerHTML = '';
  appData.cellars.forEach(cellar => {
    const opt = document.createElement('option');
    opt.value = cellar.id;
    opt.textContent = cellar.name;
    if (cellar.id === appData.activeCellarId) opt.selected = true;
    cellarSelect.appendChild(opt);
  });
}

function renderGrid() {
  const cellar = getCurrentCellar();
  if (!cellar) return;

  const cols = cellar.cols || 6;
  const rows = cellar.rows || 4;

  cellarGrid.style.gridTemplateColumns = `repeat(${cols}, 90px)`;
  cellarGrid.innerHTML = '';

  if (!cellar.bottles) cellar.bottles = {};

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r}_${c}`;
      const bottle = cellar.bottles[key];
      const slotEl = document.createElement('div');
      
      slotEl.className = 'slot' + (bottle && bottle.name ? ` occupied ${bottle.type || 'rouge'}` : '');
      slotEl.dataset.key = key;

      if (bottle && bottle.name) {
        let yearHtml = '';
        if (bottle.year) {
          yearHtml = '<span class="slot-year">' + escapeHtml(String(bottle.year)) + '</span>';
        }
        slotEl.innerHTML = '<span class="slot-name">' + escapeHtml(bottle.name) + '</span>' + yearHtml;
      } else {
        slotEl.innerHTML = '<span class="slot-plus">+</span>';
      }

      slotEl.addEventListener('click', () => openBottleModal(r, c));
      cellarGrid.appendChild(slotEl);
    }
  }
}

function updateStats() {
  const cellar = getCurrentCellar();
  if (!cellar) return;

  const totalSlots = (cellar.rows || 4) * (cellar.cols || 6);
  const bottles = cellar.bottles || {};
  
  let countRouge = 0, countBlanc = 0, countRose = 0, countPetillant = 0;
  let occupiedCount = 0;

  Object.keys(bottles).forEach(key => {
    const [r, c] = key.split('_').map(Number);
    if (r < cellar.rows && c < cellar.cols && bottles[key].name) {
      occupiedCount++;
      const type = bottles[key].type || 'rouge';
      if (type === 'rouge') countRouge++;
      else if (type === 'blanc') countBlanc++;
      else if (type === 'rose') countRose++;
      else if (type === 'petillant') countPetillant++;
    }
  });

  statTotal.textContent = `${occupiedCount} / ${totalSlots}`;
  statRouge.textContent = countRouge;
  statBlanc.textContent = countBlanc;
  statRose.textContent = countRose;
  statPetillant.textContent = countPetillant;
}

function openCellarConfigModal(isFirstCreation) {
  const cellar = isFirstCreation ? null : getCurrentCellar();
  
  document.getElementById('cellar-modal-title').textContent = cellar ? 'Modifier la cave' : 'Créer une nouvelle cave';
  document.getElementById('btn-delete-cellar').style.display = (cellar && appData.cellars.length > 1) ? 'block' : 'none';

  document.getElementById('cellar-name-input').value = cellar ? cellar.name : '';
  document.getElementById('rows-input').value = cellar ? cellar.rows : 4;
  document.getElementById('cols-input').value = cellar ? cellar.cols : 6;

  modalCellarConfig.dataset.editingId = cellar ? cellar.id : '';
  modalCellarConfig.classList.add('active');
}

function saveCellarConfig(e) {
  e.preventDefault();
  const name = document.getElementById('cellar-name-input').value.trim();
  const rows = parseInt(document.getElementById('rows-input').value, 10);
  const cols = parseInt(document.getElementById('cols-input').value, 10);
  const editingId = modalCellarConfig.dataset.editingId;

  if (editingId) {
    const cellar = appData.cellars.find(c => c.id === editingId);
    if (cellar) {
      cellar.name = name;
      cellar.rows = rows;
      cellar.cols = cols;
    }
  } else {
    const newCellar = {
      id: 'cellar_' + Date.now(),
      name: name,
      rows: rows,
      cols: cols,
      bottles: {}
    };
    appData.cellars.push(newCellar);
    appData.activeCellarId = newCellar.id;
  }

  modalCellarConfig.classList.remove('active');
  saveAndRefresh();
}

function deleteCurrentCellar() {
  if (appData.cellars.length <= 1) {
    alert('Vous devez conserver au moins une cave.');
    return;
  }
  if (confirm('Voulez-vous vraiment supprimer cette cave et tout son contenu ?')) {
    appData.cellars = appData.cellars.filter(c => c.id !== appData.activeCellarId);
    appData.activeCellarId = appData.cellars[0].id;
    modalCellarConfig.classList.remove('active');
    saveAndRefresh();
  }
}

function openBottleModal(row, col) {
  const cellar = getCurrentCellar();
  const key = `${row}_${col}`;
  const bottle = cellar.bottles[key] || {};

  document.getElementById('modal-bottle-title').textContent = `Emplacement [Ligne ${row+1}, Colonne ${col+1}]`;
  document.getElementById('bottle-row').value = row;
  document.getElementById('bottle-col').value = col;
  
  document.getElementById('bottle-name').value = bottle.name || '';
  document.getElementById('bottle-type').value = bottle.type || 'rouge';
  document.getElementById('bottle-year').value = bottle.year || '';
  document.getElementById('bottle-domain').value = bottle.domain || '';
  document.getElementById('bottle-giver').value = bottle.giver || '';

  document.getElementById('btn-delete-bottle').style.display = bottle.name ? 'block' : 'none';
  modalBottle.classList.add('active');
}

function saveBottle(e) {
  e.preventDefault();
  const cellar = getCurrentCellar();
  const r = document.getElementById('bottle-row').value;
  const c = document.getElementById('bottle-col').value;
  const key = `${r}_${c}`;

  cellar.bottles[key] = {
    name: document.getElementById('bottle-name').value.trim(),
    type: document.getElementById('bottle-type').value,
    year: document.getElementById('bottle-year').value.trim(),
    domain: document.getElementById('bottle-domain').value.trim(),
    giver: document.getElementById('bottle-giver').value.trim(),
  };

  modalBottle.classList.remove('active');
  saveAndRefresh();
}

function deleteBottle() {
  const cellar = getCurrentCellar();
  const r = document.getElementById('bottle-row').value;
  const c = document.getElementById('bottle-col').value;
  const key = `${r}_${c}`;

  if (cellar.bottles[key]) {
    delete cellar.bottles[key];
  }

  modalBottle.classList.remove('active');
  saveAndRefresh();
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const cellar = getCurrentCellar();
  const slots = cellarGrid.querySelectorAll('.slot');

  slots.forEach(slot => {
    const key = slot.dataset.key;
    const bottle = cellar.bottles[key];

    if (!query) {
      slot.classList.remove('highlight');
      return;
    }

    if (bottle && bottle.name) {
      const match = (
        bottle.name.toLowerCase().includes(query) ||
        (bottle.domain && bottle.domain.toLowerCase().includes(query)) ||
        (bottle.giver && bottle.giver.toLowerCase().includes(query)) ||
        (bottle.year && bottle.year.toString().includes(query))
      );
      slot.classList.toggle('highlight', match);
    } else {
      slot.classList.remove('highlight');
    }
  });
}

function exportData() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mes_caves_a_vin_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (parsed.cellars && Array.isArray(parsed.cellars)) {
        appData = parsed;
        if (!appData.activeCellarId && appData.cellars.length > 0) {
          appData.activeCellarId = appData.cellars[0].id;
        }
        saveAndRefresh();
        alert('Caves restaurées avec succès !');
      } else {
        alert('Format de fichier invalide.');
      }
    } catch (err) {
      alert('Erreur lors de la lecture du fichier JSON.');
    }
  };
  reader.readAsText(file);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
