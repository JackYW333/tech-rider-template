const tbody = document.getElementById('input-tbody');
const btnAdd = document.getElementById('btn-add-row');

let dragSrc = null;

function renumberRows() {
  tbody.querySelectorAll('tr').forEach((tr, i) => {
    tr.querySelector('.ch-num').textContent = i + 1;
  });
}

function addDragHandle(tr) {
  const td = document.createElement('td');
  td.className = 'drag-handle-cell';
  td.innerHTML = '<span class="drag-handle" title="Drag to reorder">&#8597;</span>';
  tr.insertBefore(td, tr.firstChild);
}

function addDeleteButton(tr) {
  const td = document.createElement('td');
  const btn = document.createElement('button');
  btn.className = 'row-delete';
  btn.title = 'Delete row';
  btn.textContent = '×';
  btn.addEventListener('click', () => {
    tr.remove();
    renumberRows();
  });
  td.appendChild(btn);
  tr.appendChild(td);
}

function enableRowDrag(tr) {
  tr.draggable = true;

  tr.addEventListener('dragstart', e => {
    dragSrc = tr;
    e.dataTransfer.effectAllowed = 'move';
    // Use a blank image so the ghost doesn't flicker
    const blank = document.createElement('img');
    e.dataTransfer.setDragImage(blank, 0, 0);
    requestAnimationFrame(() => tr.classList.add('dragging'));
  });

  tr.addEventListener('dragend', () => {
    tr.classList.remove('dragging');
    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
    dragSrc = null;
  });

  tr.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragSrc || dragSrc === tr) return;

    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
    tr.classList.add('drag-over');

    // Insert above or below depending on pointer position
    const rect = tr.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      tbody.insertBefore(dragSrc, tr);
    } else {
      tbody.insertBefore(dragSrc, tr.nextSibling);
    }
    renumberRows();
  });

  tr.addEventListener('dragleave', () => {
    tr.classList.remove('drag-over');
  });

  tr.addEventListener('drop', e => {
    e.preventDefault();
    tr.classList.remove('drag-over');
  });
}

function buildRow(num) {
  const tr = document.createElement('tr');
  const cells = [
    `<td class="ch-num">${num}</td>`,
    `<td contenteditable="true" spellcheck="false"></td>`,
    `<td contenteditable="true" spellcheck="false"></td>`,
    `<td contenteditable="true" spellcheck="false">No</td>`,
    `<td class="phantom-cell"><input type="checkbox" /></td>`,
    `<td contenteditable="true" spellcheck="false"></td>`,
  ];
  tr.innerHTML = cells.join('');
  addDragHandle(tr);
  addDeleteButton(tr);
  enableRowDrag(tr);
  return tr;
}

btnAdd.addEventListener('click', () => {
  const row = buildRow(tbody.querySelectorAll('tr').length + 1);
  tbody.appendChild(row);
  row.querySelectorAll('[contenteditable]')[0].focus();
});

// Initialise pre-existing rows
tbody.querySelectorAll('tr').forEach(tr => {
  addDragHandle(tr);
  addDeleteButton(tr);
  enableRowDrag(tr);
});
