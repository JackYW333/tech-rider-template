const ICONS = {
  vocal:      { label: 'Vocal' },
  drums:      { label: 'Drums' },
  'guitar-electric': { label: 'Electric' },
  'guitar-acoustic': { label: 'Acoustic' },
  bass:       { label: 'Bass' },
  keys:       { label: 'Keys' },
  'amp-guitar': { label: 'Guitar Amp' },
  'amp-bass':   { label: 'Bass Amp' },
  di:         { label: 'DI' },
  monitor:    { label: 'Monitor' },
  laptop:     { label: 'Laptop' },
  power:      { label: 'Power' },
};

const TOOL_GROUPS = [
  { label: 'Instruments', types: ['vocal', 'guitar-electric', 'guitar-acoustic', 'bass', 'drums', 'keys'] },
  { label: 'Amps',        types: ['amp-guitar', 'amp-bass'] },
  { label: 'Equipment',   types: ['di', 'monitor', 'laptop', 'power'] },
];

const stage = document.getElementById('stage');
const GRID  = 40;
let snapEnabled = false;

function snapVal(v) { return snapEnabled ? Math.round(v / GRID) * GRID : v; }

(function buildToolbar() {
  const toolbar = document.getElementById('stage-toolbar');
  TOOL_GROUPS.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = 'tool-group';

    const labelEl = document.createElement('span');
    labelEl.className = 'tool-group-label';
    labelEl.textContent = group.label;

    const buttonsEl = document.createElement('div');
    buttonsEl.className = 'tool-group-buttons';

    group.types.forEach(type => {
      const cfg = ICONS[type];
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.dataset.type = type;
      btn.title = cfg.label;

      btn.textContent = cfg.toolbarLabel !== undefined ? cfg.toolbarLabel : cfg.label;
      btn.addEventListener('click', () => addItem(type));
      buttonsEl.appendChild(btn);
    });

    groupEl.appendChild(labelEl);
    groupEl.appendChild(buttonsEl);
    toolbar.appendChild(groupEl);
  });
})();

// ── Undo / Redo ───────────────────────────────────────────────
const undoStack = [];
const redoStack = [];

function pushUndo(action) {
  undoStack.push(action);
  if (undoStack.length > 16) undoStack.shift();
  redoStack.length = 0; // new user action invalidates redo history
}

function applyUndoRedo(action, targetStack) {
  let inverse;

  if (action.type === 'add') {
    inverse = { type: 'remove', item: action.item, left: action.item.style.left, top: action.item.style.top };
    action.item.remove();

  } else if (action.type === 'remove') {
    inverse = { type: 'add', item: action.item };
    stage.appendChild(action.item);
    action.item.style.left = action.left;
    action.item.style.top  = action.top;

  } else if (action.type === 'move') {
    inverse = { type: 'move', item: action.item, left: action.item.style.left, top: action.item.style.top };
    action.item.style.left = action.left;
    action.item.style.top  = action.top;

  } else if (action.type === 'rotate') {
    const current = action.icon._rotation || 0;
    inverse = { type: 'rotate', icon: action.icon, rotation: current };
    action.icon._rotation = action.rotation;
    action.icon.style.transform = action.rotation ? `rotate(${action.rotation}deg)` : '';

  } else if (action.type === 'resize') {
    const current = action.icon._size || action.icon.offsetWidth;
    inverse = { type: 'resize', item: action.item, icon: action.icon, size: current };
    setIconSize(action.item, action.icon, action.size);
  }

  if (inverse) {
    targetStack.push(inverse);
    if (targetStack.length > 16) targetStack.shift();
  }
}

document.addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey)) return;
  if (e.key.toLowerCase() !== 'z') return;
  e.preventDefault();

  if (e.shiftKey) {
    const action = redoStack.pop();
    if (action) applyUndoRedo(action, undoStack);
  } else {
    const action = undoStack.pop();
    if (action) applyUndoRedo(action, redoStack);
  }
});

document.getElementById('btn-snap').addEventListener('click', function () {
  snapEnabled = !snapEnabled;
  this.textContent = snapEnabled ? 'Snap: On' : 'Snap: Off';
  this.style.background = snapEnabled ? 'var(--accent)' : '';
  this.style.color      = snapEnabled ? '#111' : '';
});

function addItem(type) {
  const cfg = ICONS[type];
  const item = document.createElement('div');
  item.className = 'stage-item';
  item.style.left = '40px';
  item.style.top = '40px';

  const icon = document.createElement('div');
  icon.className = 'icon';
  icon.dataset.type = type;
  if (ICON_SVG && ICON_SVG[type]) {
    icon.innerHTML = ICON_SVG[type];
    const svg = icon.querySelector('svg');
    if (svg) { svg.setAttribute('aria-label', cfg.label); }
  } else {
    // Fallback to img if inline SVG not available
    const img = document.createElement('img');
    img.src = `assets/icons/${type}.svg`;
    img.alt = cfg.label;
    img.draggable = false;
    icon.appendChild(img);
  }

  const label = document.createElement('div');
  label.className = 'item-label';
  label.contentEditable = 'true';
  label.spellcheck = false;
  label.textContent = cfg.label;
  label.addEventListener('mousedown', e => e.stopPropagation());

  const rotateHandle = document.createElement('div');
  rotateHandle.className = 'rotate-handle';
  rotateHandle.title = 'Drag to rotate';
  rotateHandle.textContent = '↻';

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  resizeHandle.title = 'Drag to resize';

  item.appendChild(rotateHandle);
  item.appendChild(icon);
  icon.appendChild(resizeHandle);
  item.appendChild(label);

  // Right-click to delete
  item.addEventListener('contextmenu', e => {
    e.preventDefault();
    pushUndo({ type: 'remove', item, left: item.style.left, top: item.style.top });
    item.remove();
  });

  makeRotatable(item, rotateHandle);
  makeResizable(item, icon, resizeHandle);
  makeDraggable(item);
  stage.appendChild(item);
  pushUndo({ type: 'add', item });
}

function setIconSize(item, icon, size) {
  const clamped = Math.max(24, Math.min(240, Math.round(size)));
  icon._size = clamped;
  icon.style.width  = clamped + 'px';
  icon.style.height = clamped + 'px';
  item.style.width  = Math.max(70, clamped) + 'px';
}

function makeResizable(item, icon, handle) {
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();

    const startX    = e.clientX;
    const startY    = e.clientY;
    const startSize = icon._size || icon.offsetWidth;

    function onMove(e) {
      const delta   = ((e.clientX - startX) + (e.clientY - startY)) / 2;
      setIconSize(item, icon, startSize + delta);
    }

    function onUp() {
      if (icon._size !== startSize) {
        pushUndo({ type: 'resize', item, icon, size: startSize });
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}

function makeRotatable(item, handle) {
  const icon = item.querySelector('.icon');

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();

    const rect = icon.getBoundingClientRect();
    const centerX = rect.left + rect.width  / 2;
    const centerY = rect.top  + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const startRotation = icon._rotation || 0;

    function onMove(e) {
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      let rotation = startRotation + (angle - startAngle);
      if (snapEnabled) rotation = Math.round(rotation / 90) * 90;
      icon._rotation = rotation;
      icon.style.transform = `rotate(${rotation}deg)`;
    }

    function onUp() {
      const finalRotation = icon._rotation || 0;
      if (finalRotation !== startRotation) {
        pushUndo({ type: 'rotate', icon, rotation: startRotation });
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function makeDraggable(el) {
  let startX, startY, startLeft, startTop;

  el.addEventListener('mousedown', e => {
    if (e.target.classList.contains('item-label')) return;
    if (e.target.classList.contains('rotate-handle')) return;
    e.preventDefault();

    const rect = stage.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = elRect.left - rect.left;
    startTop = elRect.top - rect.top;

    el.style.zIndex = 100;

    function onMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const stageW = stage.offsetWidth;
      const stageH = stage.offsetHeight;
      const newLeft = snapVal(Math.max(0, Math.min(stageW - el.offsetWidth, startLeft + dx)));
      const newTop  = snapVal(Math.max(0, Math.min(stageH - el.offsetHeight, startTop + dy)));
      el.style.left = newLeft + 'px';
      el.style.top  = newTop  + 'px';
    }

    function onUp() {
      el.style.zIndex = '';
      if (el.style.left !== startLeft + 'px' || el.style.top !== startTop + 'px') {
        pushUndo({ type: 'move', item: el, left: startLeft + 'px', top: startTop + 'px' });
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Touch support
  el.addEventListener('touchstart', e => {
    if (e.target.classList.contains('item-label')) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = stage.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    startX = touch.clientX;
    startY = touch.clientY;
    startLeft = elRect.left - rect.left;
    startTop = elRect.top - rect.top;
    el.style.zIndex = 100;

    function onTouchMove(e) {
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const stageW = stage.offsetWidth;
      const stageH = stage.offsetHeight;
      const newLeft = snapVal(Math.max(0, Math.min(stageW - el.offsetWidth, startLeft + dx)));
      const newTop  = snapVal(Math.max(0, Math.min(stageH - el.offsetHeight, startTop + dy)));
      el.style.left = newLeft + 'px';
      el.style.top  = newTop  + 'px';
    }

    function onTouchEnd() {
      el.style.zIndex = '';
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    }

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
  }, { passive: false });
}
