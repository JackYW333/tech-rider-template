const monitorTbody = document.getElementById('monitor-tbody');
const btnAddMonitor = document.getElementById('btn-add-monitor');

let monitorDragSrc = null;

function renumberMonitors() {
  monitorTbody.querySelectorAll('tr').forEach((tr, i) => {
    tr.querySelector('.ch-num').textContent = i + 1;
  });
}

function addMonitorDragHandle(tr) {
  const td = tr.querySelector('.drag-handle-cell');
  td.innerHTML = '<span class="drag-handle" title="Drag to reorder">&#8597;</span>';
}

function addMonitorDeleteButton(tr) {
  const td = document.createElement('td');
  const btn = document.createElement('button');
  btn.className = 'row-delete';
  btn.title = 'Delete row';
  btn.textContent = '×';
  btn.addEventListener('click', () => { tr.remove(); renumberMonitors(); });
  td.appendChild(btn);
  tr.appendChild(td);
}

function enableMonitorDrag(tr) {
  tr.draggable = true;

  tr.addEventListener('dragstart', e => {
    monitorDragSrc = tr;
    e.dataTransfer.effectAllowed = 'move';
    const blank = document.createElement('img');
    e.dataTransfer.setDragImage(blank, 0, 0);
    requestAnimationFrame(() => tr.classList.add('dragging'));
  });

  tr.addEventListener('dragend', () => {
    tr.classList.remove('dragging');
    monitorTbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
    monitorDragSrc = null;
  });

  tr.addEventListener('dragover', e => {
    e.preventDefault();
    if (!monitorDragSrc || monitorDragSrc === tr) return;
    monitorTbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
    tr.classList.add('drag-over');
    const rect = tr.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      monitorTbody.insertBefore(monitorDragSrc, tr);
    } else {
      monitorTbody.insertBefore(monitorDragSrc, tr.nextSibling);
    }
    renumberMonitors();
  });

  tr.addEventListener('dragleave', () => tr.classList.remove('drag-over'));
  tr.addEventListener('drop', e => { e.preventDefault(); tr.classList.remove('drag-over'); });
}

function buildMonitorRow(num) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="drag-handle-cell"></td>
    <td class="ch-num">${num}</td>
    <td contenteditable="true" spellcheck="false"></td>
    <td class="type-cell"><select class="monitor-type"><option>Wedge</option><option>IEM</option></select></td>
    <td contenteditable="true" spellcheck="false"></td>
  `;
  addMonitorDragHandle(tr);
  addMonitorDeleteButton(tr);
  enableMonitorDrag(tr);
  return tr;
}

btnAddMonitor.addEventListener('click', () => {
  const row = buildMonitorRow(monitorTbody.querySelectorAll('tr').length + 1);
  monitorTbody.appendChild(row);
  row.querySelectorAll('[contenteditable]')[0].focus();
});

// Initialise pre-existing rows
monitorTbody.querySelectorAll('tr').forEach(tr => {
  addMonitorDragHandle(tr);
  addMonitorDeleteButton(tr);
  enableMonitorDrag(tr);
});
