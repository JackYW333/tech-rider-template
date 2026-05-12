const STORAGE_KEY = 'techRider_v1';

// ── Serialise ────────────────────────────────────────────────

function serializeStage() {
  return Array.from(document.querySelectorAll('#stage .stage-item')).map(item => {
    const icon  = item.querySelector('.icon');
    const label = item.querySelector('.item-label');
    // Type stored as data attribute; fall back to img src for legacy saves
    let type = icon.dataset.type || '';
    if (!type) {
      const img = icon.querySelector('img');
      if (img) {
        const match = img.src.match(/assets\/icons\/(.+)\.svg/);
        type = match ? match[1] : '';
      }
    }
    return {
      type,
      left:     item.style.left,
      top:      item.style.top,
      rotation: icon._rotation || 0,
      size:     icon._size     || null,
      label:    label.textContent,
    };
  });
}

function serializeTable(tbodyId) {
  return Array.from(document.getElementById(tbodyId).querySelectorAll('tr')).map(tr => {
    const cells   = tr.querySelectorAll('td[contenteditable]');
    const phantom = tr.querySelector('input[type="checkbox"]');
    const select  = tr.querySelector('select.monitor-type');
    return {
      cells:       Array.from(cells).map(c => c.textContent),
      phantom:     phantom ? phantom.checked : null,
      monitorType: select  ? select.value    : null,
    };
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getState()));
}

// ── Restore ──────────────────────────────────────────────────

function restoreStage(items) {
  if (!items || !items.length) return;
  // addItem is defined in stage.js — call it then patch position/rotation/label
  items.forEach(({ type, left, top, rotation, size, label }) => {
    if (!type) return;
    addItem(type);
    const item = document.querySelector('#stage .stage-item:last-child');
    item.style.left = left;
    item.style.top  = top;
    const icon = item.querySelector('.icon');
    if (rotation) {
      icon._rotation = rotation;
      icon.style.transform = `rotate(${rotation}deg)`;
    }
    if (size) setIconSize(item, icon, size);
    item.querySelector('.item-label').textContent = label;
  });
}

function restoreTable(tbodyId, rows, buildRowFn) {
  if (!rows || !rows.length) return;
  const tbody = document.getElementById(tbodyId);
  // Clear pre-existing rows
  tbody.innerHTML = '';
  rows.forEach((row, i) => {
    const tr = buildRowFn(i + 1);
    tbody.appendChild(tr);
    const cells = tr.querySelectorAll('td[contenteditable]');
    row.cells.forEach((text, j) => { if (cells[j]) cells[j].textContent = text; });
    const phantom = tr.querySelector('input[type="checkbox"]');
    if (phantom && row.phantom !== null) phantom.checked = row.phantom;
    const select = tr.querySelector('select.monitor-type');
    if (select && row.monitorType) select.value = row.monitorType;
  });
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  applyState(JSON.parse(raw));
}

// ── File export / import ─────────────────────────────────────

function getState() {
  return {
    actName:    document.querySelector('.act-name').textContent,
    actSubtitle:document.querySelector('.act-subtitle').textContent,
    venue:      document.getElementById('meta-venue').textContent,
    date:       document.getElementById('meta-date').textContent,
    notes:      document.querySelector('.notes-box').textContent,
    stage:      serializeStage(),
    inputs:     serializeTable('input-tbody'),
    monitors:   serializeTable('monitor-tbody'),
  };
}

document.getElementById('btn-settings-export').addEventListener('click', () => {
  const state    = getState();
  const actName  = state.actName.trim().replace(/\s+/g, '-').toLowerCase() || 'tech-rider';
  const blob     = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link     = document.createElement('a');
  link.href      = URL.createObjectURL(blob);
  link.download  = `${actName}-settings.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.getElementById('input-settings-file').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const state = JSON.parse(e.target.result);
      // Clear existing stage items before restoring
      document.querySelectorAll('#stage .stage-item').forEach(el => el.remove());
      applyState(state);
      saveState();
    } catch {
      alert('Invalid settings file.');
    }
  };
  reader.readAsText(file);
  this.value = ''; // reset so the same file can be re-imported
});

function applyState(state) {
  if (state.actName) {
    document.querySelector('.act-name').textContent = state.actName;
    document.querySelector('.act-name').dispatchEvent(new Event('input'));
  }
  if (state.actSubtitle) document.querySelector('.act-subtitle').textContent = state.actSubtitle;
  if (state.venue)       document.getElementById('meta-venue').textContent   = state.venue;
  if (state.date)        document.getElementById('meta-date').textContent    = state.date;
  if (state.notes)       document.querySelector('.notes-box').textContent    = state.notes;
  restoreStage(state.stage);
  restoreTable('input-tbody',   state.inputs,   buildRow);
  restoreTable('monitor-tbody', state.monitors, buildMonitorRow);
  document.getElementById('meta-venue').dispatchEvent(new Event('input'));
}

// ── Clear functions ──────────────────────────────────────────

function clearStage() {
  document.querySelectorAll('#stage .stage-item').forEach(el => el.remove());
}

function clearInputs() {
  const tbody = document.getElementById('input-tbody');
  tbody.innerHTML = '';
  const row = buildRow(1);
  tbody.appendChild(row);
}

function clearAll() {
  clearStage();
  clearInputs();
  document.getElementById('monitor-tbody').innerHTML = '';
  const mrow = buildMonitorRow(1);
  document.getElementById('monitor-tbody').appendChild(mrow);
  document.querySelector('.act-name').textContent     = 'Act Name';
  document.querySelector('.act-subtitle').textContent = 'Tech Rider';
  document.getElementById('meta-venue').textContent   = '';
  document.getElementById('meta-date').textContent    = '';
  document.querySelector('.notes-box').textContent    = '';
  document.getElementById('meta-venue').dispatchEvent(new Event('input'));
  saveState();
}

document.getElementById('btn-clear-stage').addEventListener('click', () => {
  if (!confirm('Clear all items from the stage plot?')) return;
  clearStage();
  saveState();
});

document.getElementById('btn-clear-inputs').addEventListener('click', () => {
  if (!confirm('Clear all rows from the input list?')) return;
  clearInputs();
  saveState();
});

document.getElementById('btn-clear-monitors').addEventListener('click', () => {
  if (!confirm('Clear all monitor mixes?')) return;
  const tbody = document.getElementById('monitor-tbody');
  tbody.innerHTML = '';
  tbody.appendChild(buildMonitorRow(1));
  saveState();
});

document.getElementById('btn-clear-all').addEventListener('click', () => {
  if (!confirm('Clear everything — stage plot, input list, monitors, notes, and header? This cannot be undone.')) return;
  clearAll();
});

// ── Auto-save ────────────────────────────────────────────────

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 600);
}

// Observe DOM changes in main content areas
const observer = new MutationObserver(scheduleSave);
observer.observe(document.querySelector('main'), { subtree: true, childList: true, characterData: true, attributes: true });

// Also save on header field edits
document.querySelector('.act-name').addEventListener('input', scheduleSave);
document.querySelector('.act-subtitle').addEventListener('input', scheduleSave);
document.getElementById('meta-venue').addEventListener('input', scheduleSave);
document.getElementById('meta-date').addEventListener('input', scheduleSave);

// Load on startup
window.addEventListener('load', loadState);
