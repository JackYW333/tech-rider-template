// Hide meta fields that are empty during export, restore after
function prepareMetaForExport() {
  const venue = document.getElementById('meta-venue');
  const date  = document.getElementById('meta-date');
  const sep   = document.getElementById('meta-sep-1');
  const hidden = [];
  if (!venue.textContent.trim()) { venue.style.display = 'none'; hidden.push(venue); }
  if (!date.textContent.trim())  { date.style.display  = 'none'; hidden.push(date);  }
  if (!venue.textContent.trim() && !date.textContent.trim()) {
    sep.style.display = 'none'; hidden.push(sep);
  }
  return hidden;
}

async function loadHtml2Canvas() {
  if (typeof html2canvas !== 'undefined') return;
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  document.head.appendChild(script);
  await new Promise((resolve, reject) => {
    script.onload  = resolve;
    script.onerror = reject;
  });
}

function getActName() {
  return document.querySelector('.act-name').textContent.trim().replace(/\s+/g, '-').toLowerCase() || 'tech-rider';
}


async function captureElement(el, width) {
  return html2canvas(el, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    width:  width || el.offsetWidth,
    windowWidth: width || document.documentElement.offsetWidth,
  });
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/jpeg', 0.92);
  link.click();
}

// Stack two canvases vertically at the width of the bottom canvas
function stackCanvases(top, bottom, gap = 0) {
  const w = bottom.width;
  const scaledTopH = Math.round(top.height * (w / top.width));
  const out = document.createElement('canvas');
  out.width  = w;
  out.height = scaledTopH + gap + bottom.height;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(top,    0, 0, w, scaledTopH);
  ctx.drawImage(bottom, 0, scaledTopH + gap);
  return out;
}

// PDF: landscape so the 860px stage fits on one page
document.getElementById('btn-export-pdf').addEventListener('click', () => {
  window.print();
});

document.getElementById('btn-export-jpg').addEventListener('click', async () => {
  const hideEls  = document.querySelectorAll(
    '.header-actions, .stage-toolbar, .stage-controls, .stage-hint, .table-actions, .row-delete, .drag-handle-cell, .rotate-handle, .resize-handle'
  );
  const hiddenMeta = [];

  function cleanup() {
    document.body.classList.remove('exporting');
    hideEls.forEach(el => el.style.visibility = '');
    hiddenMeta.forEach(el => el.style.display = '');
  }

  try {
    await loadHtml2Canvas();
    const name = getActName();

    hideEls.forEach(el => el.style.visibility = 'hidden');
    hiddenMeta.push(...prepareMetaForExport());
    document.body.classList.add('exporting');


    // Header (only if user has filled something in)
    const actName  = document.querySelector('.act-name').textContent.trim();
    const venueVal = document.getElementById('meta-venue').textContent.trim();
    const dateVal  = document.getElementById('meta-date').textContent.trim();
    const hasHeader = actName !== 'Act Name' || venueVal !== '' || dateVal !== '';
    const contentWidth  = document.querySelector('main').offsetWidth;
    const headerCanvas  = hasHeader ? await captureElement(document.querySelector('.header'), contentWidth) : null;

    function withHeader(c) {
      return headerCanvas ? stackCanvases(headerCanvas, c, 0) : c;
    }

    const hasStage  = document.querySelectorAll('#stage .stage-item').length > 0;
    const hasInputs = Array.from(document.querySelectorAll('#input-tbody td[contenteditable]'))
                        .some(td => td.textContent.trim() !== '');
    const monitorEl = document.getElementById('section-monitors');
    const notesEl   = document.querySelector('.notes-box');
    const hasMonitors = Array.from(monitorEl.querySelectorAll('tbody td[contenteditable]'))
                          .some(td => td.textContent.trim() !== '');
    const hasNotes    = notesEl.textContent.trim() !== '';

    let downloadCount = 0;

    // --- File 1: Stage plot (skipped if empty) ---
    if (hasStage) {
      const stageCanvas = await captureElement(document.getElementById('section-stage'));
      downloadCanvas(withHeader(stageCanvas), `${name}-stage-plot.jpg`);
      downloadCount++;
    }

    // --- Input list + Monitor mix + Notes ---
    if (hasInputs || hasMonitors || hasNotes) {
      if (downloadCount > 0) await new Promise(r => setTimeout(r, 400));

      // Measure combined display height of all three sections + gaps between them
      const A4_HEIGHT = 960; // ~A4 portrait content area at 96dpi
      const GAP = 40;        // gap between stacked sections (matches 80px canvas gap / scale 2)
      let combinedH = 0;
      if (hasInputs)   combinedH += document.getElementById('section-inputs').offsetHeight;
      if (hasMonitors) combinedH += (combinedH > 0 ? GAP : 0) + monitorEl.offsetHeight;
      if (hasNotes)    combinedH += (combinedH > 0 ? GAP : 0) + document.getElementById('section-notes').offsetHeight;

      if (combinedH <= A4_HEIGHT) {
        // Everything fits on one page — combine into a single file
        let combined = null;
        if (hasInputs) combined = await captureElement(document.getElementById('section-inputs'));
        if (hasMonitors) {
          const c = await captureElement(monitorEl);
          combined = combined ? stackCanvases(combined, c, 80) : c;
        }
        if (hasNotes) {
          const c = await captureElement(document.getElementById('section-notes'));
          combined = combined ? stackCanvases(combined, c, 80) : c;
        }
        downloadCanvas(withHeader(combined), `${name}-input-list.jpg`);

      } else {
        // Too tall — input list on its own, monitors+notes together
        if (hasInputs) {
          const inputCanvas = await captureElement(document.getElementById('section-inputs'));
          downloadCanvas(withHeader(inputCanvas), `${name}-input-list.jpg`);
        }
        if (hasMonitors || hasNotes) {
          await new Promise(r => setTimeout(r, 400));
          let monNotesCanvas = null;
          if (hasMonitors) monNotesCanvas = await captureElement(monitorEl);
          if (hasNotes) {
            const c = await captureElement(document.getElementById('section-notes'));
            monNotesCanvas = monNotesCanvas ? stackCanvases(monNotesCanvas, c, 80) : c;
          }
          downloadCanvas(withHeader(monNotesCanvas), `${name}-monitors.jpg`);
        }
      }
    }

  } catch (err) {
    console.error('JPG export failed:', err);
    alert(`Export failed: ${err && err.message ? err.message : err}`);
  } finally {
    cleanup();
  }
});
