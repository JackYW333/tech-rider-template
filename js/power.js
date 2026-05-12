const powerTbody = document.getElementById('power-tbody');
const btnAddPower = document.getElementById('btn-add-power');

let powerDragSrc = null;

function renumberPower() {
  powerTbody.querySelectorAll('tr').forEach((tr, i) => {
    tr.querySelector('.ch-num').textContent = i + 1;
  });
}

function addPowerDragHandle(tr) {
  const td = tr.querySelector('.drag-handle-cell');
  td.innerHTML = '<span class="drag-handle" title="Drag to reorder">&#8597;</span>';
}

function addPowerDeleteButton(tr) {
  const td = document.createElement('td');
  const btn = document.createElement('button');
  btn.className = 'row-delete';
  btn.title = 'Delete row';
  btn.textContent = '×';
  btn.addEventListener('click', () => { tr.remove(); renumberPower(); });
  td.appendChild(btn);
  tr.appendChild(td);
}

function enablePowerDrag(tr) {
  tr.draggable = true;

  tr.addEventListener('dragstart', e => {
    powerDragSrc = tr;
    e.dataTransfer.effectAllowed = 'move';
    const blank = document.createElement('img');
    e.dataTransfer.setDragImage(blank, 0, 0);
    requestAnimationFrame(() => tr.classList.add('dragging'));
  });

  tr.addEventListener('dragend', () => {
    tr.classList.remove('dragging');
    powerTbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
    powerDragSrc = null;
  });

  tr.addEventListener('dragover', e => {
    e.preventDefault();
    if (!powerDragSrc || powerDragSrc === tr) return;
    powerTbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
    tr.classList.add('drag-over');
    const rect = tr.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      powerTbody.insertBefore(powerDragSrc, tr);
    } else {
      powerTbody.insertBefore(powerDragSrc, tr.nextSibling);
    }
    renumberPower();
  });

  tr.addEventListener('dragleave', () => tr.classList.remove('drag-over'));
  tr.addEventListener('drop', e => { e.preventDefault(); tr.classList.remove('drag-over'); });
}

function buildPowerRow(num) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="drag-handle-cell"></td>
    <td class="ch-num">${num}</td>
    <td contenteditable="true" spellcheck="false"></td>
    <td contenteditable="true" spellcheck="false"></td>
    <td contenteditable="true" spellcheck="false"></td>
  `;
  addPowerDragHandle(tr);
  addPowerDeleteButton(tr);
  enablePowerDrag(tr);
  return tr;
}

btnAddPower.addEventListener('click', () => {
  const row = buildPowerRow(powerTbody.querySelectorAll('tr').length + 1);
  powerTbody.appendChild(row);
  row.querySelectorAll('[contenteditable]')[0].focus();
});
