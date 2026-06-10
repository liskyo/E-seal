if (window.__rendererInit) {
  console.warn('renderer already initialized');
} else {
  window.__rendererInit = true;

const pdfjsLib = window.pdfjsLib;
const uploadBtn = document.getElementById('uploadPdf');
const currentFileLabel = document.getElementById('currentFile');
const sealListEl = document.getElementById('sealList');
const viewerContainer = document.getElementById('viewerContainer');
const pageInfoEl = document.getElementById('pageInfo');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const exportBtn = document.getElementById('exportPdf');
const sizeSlider = document.getElementById('sizeSlider');
const sizeValue = document.getElementById('sizeValue');
const deleteStampBtn = document.getElementById('deleteStamp');
const showDateToggle = document.getElementById('showDateToggle');
const dateSizeSlider = document.getElementById('dateSizeSlider');
const dateSizeValue = document.getElementById('dateSizeValue');
const dateYOffsetSlider = document.getElementById('dateYOffsetSlider');
const dateYOffsetValue = document.getElementById('dateYOffsetValue');

let seals = [];
let selectedSealNames = new Set();
let pdfBytes = null;
let pdfDoc = null;
let totalPages = 0;
let currentPage = 1;
let pageMeta = {};
let placements = [];
let pdfBaseName = '';
let selectedPlacementId = null;
let pdfBase64 = null;

const dateSealTopLines = ['家崎科技', '股份有限公司'];
const dateSealBottom = '機密文件';

function generateDateStampBase64() {
  const canvas = document.createElement('canvas');
  const size = 420;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const red = '#e11d48';
  const d = new Date();
  const dateText = `${d.getFullYear()}-${addZero(d.getMonth() + 1)}-${addZero(d.getDate())}`;

  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = red;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = red;
  ctx.textAlign = 'center';

  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(dateSealTopLines[0], size / 2, 110);
  ctx.fillText(dateSealTopLines[1], size / 2, 150);

  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(dateText, size / 2, size / 2 + 12);

  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(dateSealBottom, size / 2, size - 80);

  return canvas.toDataURL('image/png').split(',')[1];
}

const addZero = (n) => (n < 10 ? `0${n}` : `${n}`);
const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const formatDateTag = () => {
  const d = new Date();
  return `${d.getFullYear()}${addZero(d.getMonth() + 1)}${addZero(d.getDate())}用印`;
};
const formatDateDisplay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${addZero(d.getMonth() + 1)}-${addZero(d.getDate())}`;
};

function createTextImage(text, fontSize = 12) {
  const stampColor = getStampColor();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize}px sans-serif`;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width + fontSize * 0.5);
  const height = Math.ceil(fontSize * 2);
  canvas.width = width;
  canvas.height = height;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = stampColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + 1);
  return {
    base64: canvas.toDataURL('image/png').split(',')[1],
    width,
    height,
  };
}

function getStampColor() {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const val = css.getPropertyValue('--stamp-red').trim();
  return val || '#e11d48';
}

const base64ToUint8 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const uint8ToBase64 = (bytes) => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
};

function ensureBridge() {
  if (!window.api) {
    console.error('window.api missing');
    alert('介面橋接未載入，請重啟應用程式。');
    return false;
  }
  if (!pdfjsLib) {
    console.error('pdfjsLib missing');
    alert('PDF 模組載入失敗，請重啟應用程式。');
    return false;
  }
  return true;
}

async function loadSeals() {
  if (!ensureBridge()) return;
  seals = await window.api.listSeals();
  renderSealList();
}

function renderSealList() {
  sealListEl.innerHTML = '';
  seals.forEach((seal) => {
    const card = document.createElement('div');
    card.className = 'seal-card';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = seal.name;
    checkbox.id = `seal-${seal.name}`;
    checkbox.addEventListener('change', () => onSelectSeal(seal.name, checkbox.checked, checkbox));

    const label = document.createElement('label');
    label.setAttribute('for', checkbox.id);
    label.textContent = seal.name;

    const img = document.createElement('img');
    img.src = `data:image/png;base64,${seal.base64}`;
    img.alt = seal.name;
    img.title = '點擊將章加入當前頁面';
    img.style.cursor = 'pointer';
    img.addEventListener('click', async () => {
      await addStampInstance(seal.name);
    });

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.appendChild(checkbox);
    row.appendChild(label);

    card.appendChild(img);
    card.appendChild(row);
    sealListEl.appendChild(card);
  });
  updateSealCheckboxState();
}

function onSelectSeal(name, checked, checkboxEl) {
  if (checked) {
    if (selectedSealNames.size >= 2) {
      checkboxEl.checked = false;
      return;
    }
    selectedSealNames.add(name);
  } else {
    selectedSealNames.delete(name);
  }
  updateSealCheckboxState();
}

function updateSealCheckboxState() {
  const allChecks = sealListEl.querySelectorAll('input[type="checkbox"]');
  const limitReached = selectedSealNames.size >= 2;
  allChecks.forEach((ck) => {
    if (!ck.checked) ck.disabled = limitReached;
  });
}

function updateSizeControls() {
  const placement = placements.find((p) => p.id === selectedPlacementId);
  if (!placement) {
    sizeSlider.disabled = true;
    deleteStampBtn.disabled = true;
    showDateToggle.disabled = true;
    showDateToggle.checked = false;
    dateSizeSlider.disabled = true;
    dateSizeValue.textContent = '-';
    dateYOffsetSlider.disabled = true;
    dateYOffsetValue.textContent = '-';
    sizeValue.textContent = '-';
    return;
  }
  sizeSlider.disabled = false;
  deleteStampBtn.disabled = false;
  showDateToggle.disabled = false;
  showDateToggle.checked = !!placement.withDate;
  dateSizeSlider.disabled = false;
  dateSizeSlider.value = Math.round((placement.dateScale || 1) * 100);
  dateSizeValue.textContent = `${Math.round((placement.dateScale || 1) * 100)}%`;
  dateYOffsetSlider.disabled = false;
  dateYOffsetSlider.value = Math.round(placement.dateYOffset || 0);
  dateYOffsetValue.textContent = `${Math.round(placement.dateYOffset || 0)}px`;
  sizeSlider.value = Math.round(placement.width);
  sizeValue.textContent = Math.round(placement.width);
}

uploadBtn.addEventListener('click', async () => {
  if (!ensureBridge()) return;
  const result = await window.api.selectPdf();
  if (!result) return;
  console.log('[upload] got file', result.filePath, 'len', result.base64?.length);
  pdfBase64 = result.base64;
  pdfBytes = base64ToUint8(result.base64);
  const parts = result.filePath.split(/\\|\//);
  const filename = parts[parts.length - 1];
  pdfBaseName = filename.replace(/\.pdf$/i, '');
  currentFileLabel.textContent = filename;
  await loadPdf();
});

async function loadPdf() {
  if (!ensureBridge()) return;
  try {
    console.log('[loadPdf] pdfBytes', pdfBytes?.length, 'pdfjsLib keys', Object.keys(pdfjsLib || {}));
    if (!pdfBytes) {
      alert('尚未取得 PDF 檔案，請重新上傳。');
      return;
    }
    const task = pdfjsLib.getDocument({ data: pdfBytes, disableWorker: true });
    console.log('[loadPdf] task', !!task, 'has promise', !!task?.promise, 'has then', !!task?.then);
    if (!task) {
      alert('PDF 載入初始化失敗，請重新上傳。');
      return;
    }
    if (task.promise) {
      pdfDoc = await task.promise;
    } else if (typeof task.then === 'function') {
      pdfDoc = await task;
    } else {
      alert('PDF 載入初始化失敗，請重新上傳。');
      return;
    }
    if (!pdfDoc) {
      alert('PDF 載入失敗，請確認檔案是否正常。');
      return;
    }
    totalPages = pdfDoc.numPages;
    currentPage = 1;
    pageMeta = {};
    placements = [];
    renderPage(currentPage);
    updatePageInfo();
  } catch (err) {
    console.error('PDF 載入失敗', err);
    alert('PDF 載入失敗，請確認檔案或稍後再試。');
  }
}

function updatePageInfo() {
  if (!pdfDoc) {
    pageInfoEl.textContent = '';
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    exportBtn.disabled = true;
    return;
  }
  pageInfoEl.textContent = `頁面 ${currentPage} / ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  exportBtn.disabled = false;
}

prevPageBtn.addEventListener('click', () => switchPage(currentPage - 1));
nextPageBtn.addEventListener('click', () => switchPage(currentPage + 1));

function switchPage(target) {
  if (!pdfDoc) return;
  if (target < 1 || target > totalPages) return;
  currentPage = target;
  // 避免選中不在本頁的印章
  const currentIds = placements.filter((p) => p.page === currentPage).map((p) => p.id);
  if (!currentIds.includes(selectedPlacementId)) {
    selectedPlacementId = null;
  }
  renderPage(currentPage);
  updatePageInfo();
}

async function renderPage(pageNumber) {
  viewerContainer.innerHTML = '';
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const scale = 1.3;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.className = 'canvas-layer';
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const wrapper = document.createElement('div');
    wrapper.className = 'page-wrapper';
    wrapper.appendChild(canvas);

    const overlay = document.createElement('div');
    overlay.className = 'overlay-layer';
    overlay.style.width = `${viewport.width}px`;
    overlay.style.height = `${viewport.height}px`;
    wrapper.appendChild(overlay);

    viewerContainer.appendChild(wrapper);

    pageMeta[pageNumber] = {
      scale,
      viewWidth: viewport.width,
      viewHeight: viewport.height,
      pdfWidth: viewport.width / scale,
      pdfHeight: viewport.height / scale,
    };

    await page.render({ canvasContext: context, viewport }).promise;
    rebuildPlacementsForPage(pageNumber, overlay);
  } catch (err) {
    console.error('頁面渲染失敗', err);
    alert('PDF 無法顯示，請確認檔案格式或重開應用程式。');
  }
}

function rebuildPlacementsForPage(pageNumber, overlayEl) {
  const pagePlacements = placements.filter((p) => p.page === pageNumber);
  pagePlacements.forEach((p) => {
    const el = createStampElement(p);
    overlayEl.appendChild(el);
    setupDrag(el, p.id);
    if (p.id === selectedPlacementId) {
      el.classList.add('selected');
    }
  });
  updateSizeControls();
}

async function addStampInstance(sealName) {
  if (!pdfDoc) return;
  if (!selectedSealNames.has(sealName)) return;

  const isIssueSeal = sealName === '發行章';
  const defaultSize = isIssueSeal ? 100 : 120;
  const defaultDateScale = isIssueSeal ? 0.6 : 1;
  const defaultDateYOffset = 2;
  const margin = 20;

  for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
    try {
      if (!pageMeta[pageNum]) {
        const page = await pdfDoc.getPage(pageNum);
        const scale = 1.3;
        const viewport = page.getViewport({ scale });
        pageMeta[pageNum] = {
          scale,
          viewWidth: viewport.width,
          viewHeight: viewport.height,
          pdfWidth: viewport.width / scale,
          pdfHeight: viewport.height / scale,
        };
      }

      const meta = pageMeta[pageNum];
      const id = makeId();
      const newPlacement = {
        id,
        sealName,
        page: pageNum,
        x: Math.max(0, meta.viewWidth - defaultSize - margin),
        y: Math.max(0, meta.viewHeight - defaultSize - margin),
        width: defaultSize,
        height: defaultSize,
        withDate: true,
        dateScale: defaultDateScale,
        dateYOffset: defaultDateYOffset,
      };
      placements.push(newPlacement);

      if (pageNum === currentPage) {
        const overlay = viewerContainer.querySelector('.overlay-layer');
        if (overlay) {
          const el = createStampElement(newPlacement);
          overlay.appendChild(el);
          setupDrag(el, newPlacement.id);
          setSelected(newPlacement.id);
        }
      }
    } catch (err) {
      console.error(`無法在第 ${pageNum} 頁加入印章`, err);
    }
  }
  updateSizeControls();
}

function createStampElement(placement) {
  const seal = seals.find((s) => s.name === placement.sealName);
  const wrapper = document.createElement('div');
  wrapper.className = 'stamp-instance';
  wrapper.draggable = false;
  wrapper.dataset.id = placement.id;
  wrapper.style.width = `${placement.width}px`;
  wrapper.style.height = `${placement.height}px`;
  wrapper.style.left = `${placement.x}px`;
  wrapper.style.top = `${placement.y}px`;
  wrapper.style.position = 'absolute';

  const img = document.createElement('img');
  img.className = 'stamp-img';
  img.src = `data:image/png;base64,${seal.base64}`;
  img.alt = placement.sealName;
  wrapper.appendChild(img);

  if (placement.withDate) {
    const dateOverlay = document.createElement('div');
    dateOverlay.className = 'stamp-date';
    const fontSize = Math.max(10, placement.width * 0.13 * (placement.dateScale || 1));
    dateOverlay.style.fontSize = `${fontSize}px`;
    dateOverlay.style.transform = `translateY(${placement.dateYOffset || 0}px)`;
    dateOverlay.textContent = formatDateDisplay();
    wrapper.appendChild(dateOverlay);
  }

  wrapper.title = `${placement.sealName} (點擊選取，雙擊移除)`;
  wrapper.addEventListener('click', () => setSelected(placement.id));
  wrapper.addEventListener('dblclick', () => removePlacement(placement.id));
  return wrapper;
}

function setupDrag(el, id) {
  interact(el).draggable({
    listeners: {
      start() { el.classList.add('dragging'); },
      move(event) {
        const placement = placements.find((p) => p.id === id);
        if (!placement) return;
        placement.x += event.dx;
        placement.y += event.dy;
        el.style.left = `${placement.x}px`;
        el.style.top = `${placement.y}px`;
      },
      end() { el.classList.remove('dragging'); },
    },
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true,
      }),
    ],
  });
}

function removePlacement(id) {
  placements = placements.filter((p) => p.id !== id);
  const node = viewerContainer.querySelector(`.stamp-instance[data-id="${id}"]`);
  if (node) node.remove();
  if (selectedPlacementId === id) {
    selectedPlacementId = null;
    updateSizeControls();
  }
}

function setSelected(id) {
  selectedPlacementId = id;
  const nodes = viewerContainer.querySelectorAll('.stamp-instance');
  nodes.forEach((node) => {
    if (node.dataset.id === id) node.classList.add('selected');
    else node.classList.remove('selected');
  });
  updateSizeControls();
}

sizeSlider.addEventListener('input', () => {
  const placement = placements.find((p) => p.id === selectedPlacementId);
  if (!placement) return;
  const val = Math.max(40, Number(sizeSlider.value) || placement.width);
  placement.width = val;
  placement.height = val;
  sizeValue.textContent = Math.round(val);
  const el = viewerContainer.querySelector(`.stamp-instance[data-id="${placement.id}"]`);
  if (el) {
    el.style.width = `${placement.width}px`;
    el.style.height = `${placement.height}px`;
    const overlay = el.querySelector('.stamp-date');
    if (overlay) {
      const fontSize = Math.max(10, placement.width * 0.13 * (placement.dateScale || 1));
      overlay.style.fontSize = `${fontSize}px`;
      overlay.style.transform = `translateY(${placement.dateYOffset || 0}px)`;
    }
  }
});

deleteStampBtn.addEventListener('click', () => {
  if (!selectedPlacementId) return;
  removePlacement(selectedPlacementId);
  setSelected(null);
});

showDateToggle.addEventListener('change', () => {
  const placement = placements.find((p) => p.id === selectedPlacementId);
  if (!placement) return;
  placement.withDate = showDateToggle.checked;
  const el = viewerContainer.querySelector(`.stamp-instance[data-id="${placement.id}"]`);
  if (!el) return;
  const overlay = el.querySelector('.stamp-date');
  if (placement.withDate) {
    if (!overlay) {
      const dateOverlay = document.createElement('div');
      dateOverlay.className = 'stamp-date';
      dateOverlay.style.fontSize = `${Math.max(10, placement.width * 0.13 * (placement.dateScale || 1))}px`;
      dateOverlay.style.transform = `translateY(${placement.dateYOffset || 0}px)`;
      dateOverlay.textContent = formatDateDisplay();
      el.appendChild(dateOverlay);
    } else {
      overlay.textContent = formatDateDisplay();
      overlay.style.fontSize = `${Math.max(10, placement.width * 0.13 * (placement.dateScale || 1))}px`;
      overlay.style.transform = `translateY(${placement.dateYOffset || 0}px)`;
    }
  } else if (overlay) {
    overlay.remove();
  }
});

dateSizeSlider.addEventListener('input', () => {
  const placement = placements.find((p) => p.id === selectedPlacementId);
  if (!placement) return;
  const scale = Math.max(0.6, Math.min(1.6, (Number(dateSizeSlider.value) || 100) / 100));
  placement.dateScale = scale;
  dateSizeValue.textContent = `${Math.round(scale * 100)}%`;
  const el = viewerContainer.querySelector(`.stamp-instance[data-id="${placement.id}"]`);
  if (!el) return;
  const overlay = el.querySelector('.stamp-date');
  if (overlay) {
    const fontSize = Math.max(10, placement.width * 0.13 * scale);
    overlay.style.fontSize = `${fontSize}px`;
  }
});

dateYOffsetSlider.addEventListener('input', () => {
  const placement = placements.find((p) => p.id === selectedPlacementId);
  if (!placement) return;
  const offset = Math.round(Number(dateYOffsetSlider.value) || 0);
  placement.dateYOffset = offset;
  dateYOffsetValue.textContent = `${offset}px`;
  const el = viewerContainer.querySelector(`.stamp-instance[data-id="${placement.id}"]`);
  if (!el) return;
  const overlay = el.querySelector('.stamp-date');
  if (overlay) {
    overlay.style.transform = `translateY(${offset}px)`;
  }
});

exportBtn.addEventListener('click', async () => {
  if (!pdfBytes || !pdfDoc) return;
  if (selectedSealNames.size === 0) {
    alert('請先勾選用印模組 (最多 2 個)');
    return;
  }
  if (!ensureBridge()) return;
  const outputName = buildSuggestedName();
  const savePath = await window.api.chooseSavePath(outputName);
  if (!savePath) return;

  exportBtn.disabled = true;
  exportBtn.textContent = '生成中...';
  try {
    const stampedBase64 = await buildStampedPdf();
    const res = await window.api.writePdf({ filePath: savePath, base64: stampedBase64 });
    if (res?.ok) {
      alert('PDF 已匯出');
    } else {
      alert(res?.message || '匯出失敗');
    }
  } catch (err) {
    console.error(err);
    alert(`匯出過程發生錯誤：${err.message || err}`);
  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = '輸出 PDF';
  }
});

function buildSuggestedName() {
  const selected = Array.from(selectedSealNames);
  const dateTag = formatDateTag().replace('用印', '');
  const sealPart = selected.join('_');
  const base = pdfBaseName || 'output';
  return `${base}_${sealPart}_${dateTag}.pdf`;
}

async function buildStampedPdf() {
  const { PDFDocument, degrees } = PDFLib;
  let sourceBytes = pdfBytes;
  if (!sourceBytes || (sourceBytes.length === 0)) {
    if (pdfBase64) {
      sourceBytes = base64ToUint8(pdfBase64);
    }
  }
  if (!sourceBytes || (sourceBytes.length === 0)) {
    throw new Error('無有效 PDF 來源');
  }
  if (!(sourceBytes instanceof Uint8Array)) {
    sourceBytes = new Uint8Array(sourceBytes);
  }

  const pdfDocLib = await PDFDocument.load(sourceBytes);
  const imageCache = new Map();

  console.log(`[Export] Starting. Placements count: ${placements.length}`);
  let drawCount = 0;

  const dateStampText = formatDateDisplay();

  for (const placement of placements) {
    const pageIndex = placement.page - 1;
    const page = pdfDocLib.getPage(pageIndex);
    let meta = pageMeta[placement.page];
    
    if (!meta) {
      console.warn(`[Export] Missing meta for page ${placement.page}, but we can use scale 1.3.`);
      meta = { scale: 1.3 };
    }

    const pdfJsPage = await pdfDoc.getPage(placement.page);
    const vp = pdfJsPage.getViewport({ scale: meta.scale });
    const m = vp.transform;
    const det = m[0] * m[3] - m[1] * m[2];
    const inv = [
      m[3] / det, -m[1] / det, -m[2] / det, m[0] / det,
      (m[2] * m[5] - m[3] * m[4]) / det,
      (m[1] * m[4] - m[0] * m[5]) / det
    ];
    const applyTransform = (pt) => [
      inv[0] * pt[0] + inv[2] * pt[1] + inv[4],
      inv[1] * pt[0] + inv[3] * pt[1] + inv[5]
    ];

    let img = imageCache.get(placement.sealName);
    if (!img) {
      const seal = seals.find((s) => s.name === placement.sealName);
      const imgBytes = base64ToUint8(seal.base64);
      img = await pdfDocLib.embedPng(imgBytes);
      imageCache.set(placement.sealName, img);
    }

    const px = placement.x;
    const py = placement.y;
    const pw = placement.width;
    const ph = placement.height;

    // Map UI canvas points to absolute PDF coordinate space
    const pBL = applyTransform([px, py + ph]); // Visual Bottom-Left
    const pBR = applyTransform([px + pw, py + ph]); // Visual Bottom-Right
    const pTL = applyTransform([px, py]); // Visual Top-Left

    const pdfX = pBL[0];
    const pdfY = pBL[1];
    const pdfW = Math.hypot(pBR[0] - pBL[0], pBR[1] - pBL[1]);
    const pdfH = Math.hypot(pTL[0] - pBL[0], pTL[1] - pBL[1]);
    const rad = Math.atan2(pBR[1] - pBL[1], pBR[0] - pBL[0]);

    page.drawImage(img, {
      x: pdfX,
      y: pdfY,
      width: pdfW,
      height: pdfH,
      rotate: degrees((rad * 180) / Math.PI),
    });

    if (placement.withDate) {
      const dateCenterText = dateStampText;
      const fontSizePx = Math.max(10, placement.width * 0.13 * (placement.dateScale || 1));
      const centerImg = createTextImage(dateCenterText, fontSizePx);
      const centerPng = await pdfDocLib.embedPng(base64ToUint8(centerImg.base64));
      
      let drawH = (centerImg.height / meta.scale);
      let drawW = (centerImg.width / meta.scale);
      if (drawW > pdfW * 0.9) {
        drawW = pdfW * 0.9;
        drawH = drawW * (centerPng.height / centerPng.width);
      }

      const tcx = px + pw / 2;
      const tcy = py + ph / 2 + (placement.dateYOffset || 0);
      const tw_px = drawW * meta.scale;
      const th_px = drawH * meta.scale;

      const tBL = applyTransform([tcx - tw_px / 2, tcy + th_px / 2]);
      const tBR = applyTransform([tcx + tw_px / 2, tcy + th_px / 2]);
      const tPdfW = Math.hypot(tBR[0] - tBL[0], tBR[1] - tBL[1]);
      const tRad = Math.atan2(tBR[1] - tBL[1], tBR[0] - tBL[0]);

      page.drawImage(centerPng, {
        x: tBL[0],
        y: tBL[1],
        width: tPdfW,
        height: drawH,
        rotate: degrees((tRad * 180) / Math.PI),
      });
    }
    drawCount++;
  }

  console.log(`[Export] Finished. Total stamps drawn: ${drawCount}`);
  if (drawCount === 0 && placements.length > 0) {
    alert('偵測到印章資料但未能成功繪製到 PDF，請確認預覽是否正常。');
  }

  const stampedBytes = await pdfDocLib.save();
  return uint8ToBase64(stampedBytes);
}

loadSeals();

}
