const STORAGE_KEY = 'carnet-paris-layout-v2';
const MOBILE_BREAKPOINT = 760;
const MOBILE_STORAGE_KEY = `${STORAGE_KEY}-mobile`;

export class CanvasEditor {
  constructor({ canvases, toolbar, dashboard, countElement }) {
    this.canvases = [...canvases]; this.toolbar = toolbar; this.dashboard = dashboard; this.countElement = countElement;
    this.selected = null; this.zCounter = 10; this.drag = null; this.resize = null; this.editMode = true;
    this.storageKey = this.getStorageKey();
    this.layout = this.readLayout();
    this.bindToolbar(); this.prepareExistingItems();
    const hasSavedLayout = Object.keys(this.layout).length > 0;
    this.restore();
    if (!hasSavedLayout && this.isMobileLayout()) { this.applyMobileDefaults(); this.save(); }
    this.bindCanvasEvents(); this.refreshSelection();
  }
  isMobileLayout() { return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches; }
  getStorageKey() { return this.isMobileLayout() ? MOBILE_STORAGE_KEY : STORAGE_KEY; }
  readLayout() { try { return JSON.parse(localStorage.getItem(this.storageKey || this.getStorageKey()) || '{}'); } catch { return {}; } }
  applyMobileDefaults() {
    const hero = document.querySelector('.hero');
    const board = document.querySelector('#dashboard-grid');
    if (!hero || !board) return;
    const width = Math.max(280, hero.clientWidth);
    const imageWidth = Math.min(145, Math.floor((width - 36) / 2));
    const positions = [
      ['.word-fragmenta', 0, 285, Math.min(width * .78, 300)],
      ['.word-carnet', width * .48, 340, Math.min(width * .5, 180)],
      ['.word-nuit', width * .08, 470, Math.min(width * .9, 320)],
      ['.word-brumaire', width * .38, 610, Math.min(width * .6, 220)],
      ['.archive-tile:nth-of-type(1)', 0, 365, imageWidth],
      ['.archive-tile:nth-of-type(2)', width - imageWidth, 390, imageWidth],
      ['.archive-tile:nth-of-type(3)', 0, 555, imageWidth],
      ['.archive-tile:nth-of-type(4)', width - imageWidth, 570, imageWidth],
      ['.archive-tile:nth-of-type(5)', width * .43, 730, imageWidth],
      ['.archive-tile:nth-of-type(6)', 0, 760, imageWidth]
    ];
    positions.forEach(([selector, x, y, w]) => {
      const el = hero.querySelector(selector);
      if (!el) return;
      el.style.position = 'absolute'; el.style.left = `${Math.max(0, Math.min(width - 90, x))}px`; el.style.top = `${y}px`;
      if (w) el.style.width = `${Math.max(100, Math.min(width - 8, w))}px`;
      el.dataset.x = el.style.left.replace('px', ''); el.dataset.y = String(y); if (w) el.dataset.w = String(w);
    });
    hero.style.minHeight = '940px';
    board.style.minHeight = `${Math.max(500, this.dashboard.widgets.length * 320 + 30)}px`;
    this.dashboard.widgets.forEach((widget, i) => {
      const el = widget.element; const x = 0; const y = i * 325 + 12;
      el.style.position = 'absolute'; el.style.left = `${x}px`; el.style.top = `${y}px`;
      el.style.width = `min(100%, ${Math.max(260, width - 2)}px)`; el.dataset.x = String(x); el.dataset.y = String(y);
    });
  }
  save() {
    if (this.restoring) return;
    const data = {};
    document.querySelectorAll('[data-item-id]').forEach(el => { const id = el.dataset.itemId; data[id] = { zone: el.closest('[data-canvas-zone]')?.dataset.canvasZone, x: el.dataset.x, y: el.dataset.y, w: el.dataset.w, h: el.dataset.h, z: el.style.zIndex, locked: el.dataset.locked === 'true', type: el.dataset.widgetType, text: el.dataset.editorType === 'text' ? el.textContent : undefined }; });
    try { localStorage.setItem(this.getStorageKey(), JSON.stringify(data)); } catch { this.announce('Не удалось сохранить раскладку. Возможно, хранилище заполнено.'); }
  }
  prepareExistingItems() {
    const hero = document.querySelector('.hero'); hero.dataset.canvasZone = 'hero'; hero.classList.add('editor-canvas');
    const board = document.querySelector('#dashboard-grid'); board.dataset.canvasZone = 'board'; board.classList.add('editor-canvas');
    document.querySelectorAll('.archive-tile').forEach((el, i) => { el.dataset.itemId = `archive-${i+1}`; el.dataset.editorType = 'image'; el.classList.add('canvas-item'); hero.append(el); });
    document.querySelectorAll('.word-field span').forEach((el, i) => { el.dataset.itemId = `word-${i+1}`; el.dataset.editorType = 'text'; el.classList.add('canvas-item'); hero.append(el); });
    document.querySelector('.archive-grid')?.remove(); document.querySelector('.word-field')?.remove();
    document.querySelectorAll('.archive-tile img').forEach(img => { img.addEventListener('error', () => { img.hidden = true; const placeholder = document.createElement('div'); placeholder.className = 'image-placeholder'; placeholder.textContent = img.alt || 'archive image'; img.parentElement.insertBefore(placeholder, img); }); });
    this.canvases.forEach(canvas => canvas.addEventListener('pointerdown', e => { const item = e.target.closest('.canvas-item'); if (item && canvas.contains(item)) this.select(item); }));
    document.querySelectorAll('.canvas-item').forEach((el) => {
      if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
      if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.dataset.editorType === 'text' ? `Текстовый элемент: ${el.textContent.trim()}` : `Изображение: ${el.querySelector('img')?.alt || 'архивный элемент'}`);
      el.addEventListener('keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target === el && !['INPUT','TEXTAREA','BUTTON'].includes(event.target.tagName)) { event.preventDefault(); this.select(el); }
      });
    });
  }
  restore() {
    this.restoring = true;
    const saved = this.layout;
    Object.entries(saved).forEach(([id, d]) => { if (d.type && !document.querySelector(`[data-item-id="${id}"]`)) { const widget = this.dashboard.addWidget(d.type); widget.id = id; widget.element.dataset.itemId = id; } });
    document.querySelectorAll('[data-item-id]').forEach(el => { const d = saved[el.dataset.itemId]; if (!d) return; if (d.zone && document.querySelector(`[data-canvas-zone="${d.zone}"]`)) document.querySelector(`[data-canvas-zone="${d.zone}"]`).append(el); this.applyGeometry(el, d); if (d.text && el.dataset.editorType === 'text') el.textContent = d.text; });
    this.restoring = false; this.save();
  }
  applyGeometry(el, d) { if (d.x != null && d.y != null) { el.style.position = 'absolute'; el.style.left = `${Number(d.x)}px`; el.style.top = `${Number(d.y)}px`; el.dataset.x = d.x; el.dataset.y = d.y; } if (d.w) { el.style.width = `${Number(d.w)}px`; el.dataset.w = d.w; } if (d.h) { el.style.height = `${Number(d.h)}px`; el.dataset.h = d.h; } if (d.z) el.style.zIndex = d.z; if (d.locked) el.dataset.locked = 'true'; }
  bindCanvasEvents() {
    this.canvases.forEach(canvas => {
      canvas.addEventListener('pointerdown', e => {
        const handle = e.target.closest('.resize-handle');
        const item = e.target.closest('.canvas-item');
        if (!item || !canvas.contains(item) || e.button !== 0) return;
        this.select(item);
        if (handle) { if (item.dataset.locked === 'true' || !this.editMode) return; e.preventDefault(); this.startResize(e, item, canvas); return; }
        if (item.dataset.locked === 'true') return;
        if (e.target.closest('button, input, textarea, a, select, label')) return;
        if (!this.editMode) return;
        if (item.dataset.editorType === 'widget' && !e.target.closest('.drag-handle')) return;
        e.preventDefault(); this.startDrag(e, item, canvas);
      });
    });
    window.addEventListener('pointermove', e => this.pointerMove(e));
    window.addEventListener('pointerup', () => this.endPointer());
    window.addEventListener('pointercancel', () => this.endPointer());
    window.addEventListener('keydown', e => this.keyMove(e));
    let wasMobile = this.isMobileLayout();
    window.addEventListener('resize', () => {
      const nowMobile = this.isMobileLayout();
      if (nowMobile !== wasMobile) { wasMobile = nowMobile; this.storageKey = this.getStorageKey(); this.layout = this.readLayout(); location.reload(); return; }
      this.save();
    });
    this.dashboard.onChange = () => { this.updateCount(); this.save(); };
  }
  startDrag(e, item, canvas) {
    if (!item.style.position || item.parentElement !== canvas) { const rect = item.getBoundingClientRect(), cr = canvas.getBoundingClientRect(); canvas.append(item); item.style.position = 'absolute'; item.style.left = `${rect.left - cr.left + canvas.scrollLeft}px`; item.style.top = `${rect.top - cr.top + canvas.scrollTop}px`; }
    const rect = item.getBoundingClientRect(); this.drag = { item, canvas, pointerId: e.pointerId, x: e.clientX, y: e.clientY, left: parseFloat(item.style.left) || 0, top: parseFloat(item.style.top) || 0, startRect: rect };
    try { item.setPointerCapture?.(e.pointerId); } catch {}
    item.classList.add('is-dragging'); this.raise(item);
  }
  startResize(e, item, canvas) { this.resize = { item, canvas, pointerId: e.pointerId, x: e.clientX, y: e.clientY, w: item.getBoundingClientRect().width, h: item.getBoundingClientRect().height }; item.classList.add('is-resizing'); try { item.setPointerCapture?.(e.pointerId); } catch {} e.preventDefault(); }
  pointerMove(e) {
    if (this.drag) { const d = this.drag; if (e.pointerId !== d.pointerId) return; const maxX = Math.max(0, d.canvas.clientWidth - 50), maxY = Math.max(0, d.canvas.scrollHeight - 40); const left = Math.max(0, Math.min(maxX, d.left + e.clientX - d.x)); const top = Math.max(0, Math.min(maxY, d.top + e.clientY - d.y)); d.item.style.left = `${left}px`; d.item.style.top = `${top}px`; d.item.dataset.x = left; d.item.dataset.y = top; }
    if (this.resize) { const r = this.resize; if (e.pointerId !== r.pointerId) return; r.item.style.width = `${Math.max(110, r.w + e.clientX - r.x)}px`; r.item.style.height = `${Math.max(80, r.h + e.clientY - r.y)}px`; r.item.dataset.w = parseFloat(r.item.style.width); r.item.dataset.h = parseFloat(r.item.style.height); }
  }
  endPointer() { if (this.drag) this.drag.item.classList.remove('is-dragging'); if (this.resize) this.resize.item.classList.remove('is-resizing'); if (this.drag || this.resize) this.save(); this.drag = null; this.resize = null; }
  select(item) {
    if (!item) return;
    this.selected?.classList.remove('is-selected');
    this.selected?.querySelector(':scope > .resize-handle')?.remove();
    this.selected = item; item.classList.add('is-selected');
    if (!item.querySelector(':scope > .resize-handle')) { const handle = document.createElement('button'); handle.type = 'button'; handle.className = 'resize-handle'; handle.setAttribute('aria-label','Изменить размер элемента'); handle.title = 'Потяните, чтобы изменить размер'; item.append(handle); }
    this.refreshSelection();
  }
  raise(item) { this.zCounter = Math.max(this.zCounter + 1, ...[...this.canvases].flatMap(c => [...c.querySelectorAll('.canvas-item')].map(el => Number(el.style.zIndex) || 1))); item.style.zIndex = this.zCounter; }
  bindToolbar() {
    this.toolbar?.addEventListener('click', e => { const button = e.target.closest('[data-editor-action]'); if (!button) return; const action = button.dataset.editorAction;
      if (action === 'add-text') this.addText();
      if (action === 'upload') document.querySelector('#image-upload').click();
      if (action === 'front' && this.selected) this.raise(this.selected);
      if (action === 'back' && this.selected) { this.selected.style.zIndex = '1'; this.zCounter = Math.max(this.zCounter, 10); }
      if (action === 'lock' && this.selected) { this.selected.dataset.locked = this.selected.dataset.locked === 'true' ? 'false' : 'true'; button.textContent = this.selected.dataset.locked === 'true' ? 'Снять закрепление' : 'Закрепить / снять'; }
      if (action === 'delete' && this.selected) this.deleteSelected();
      if (action === 'reset') this.reset();
      if (action === 'edit') { this.editMode = !this.editMode; button.setAttribute('aria-pressed', String(this.editMode)); button.textContent = this.editMode ? 'Режим: редактирование' : 'Режим: просмотр'; }
      this.refreshSelection(); this.save();
    });
    document.querySelector('#image-upload')?.addEventListener('change', e => { [...e.target.files].forEach(file => { if (!file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = () => this.addImage(String(reader.result), file.name); reader.readAsDataURL(file); }); e.target.value = ''; });
  }
  addText() { const value = prompt('Текст нового фрагмента:'); if (!value?.trim()) return; const el = document.createElement('div'); el.className = 'canvas-item user-text'; el.dataset.itemId = `text-${crypto.randomUUID()}`; el.dataset.editorType = 'text'; el.textContent = value.trim(); el.tabIndex = 0; el.setAttribute('aria-label', `Текстовый элемент: ${value.trim()}`); this.canvases[0].append(el); this.applyGeometry(el, { x: 80, y: 300, w: 250 }); this.raise(el); this.select(el); this.save(); }
  addImage(src, name) { const figure = document.createElement('figure'); figure.className = 'archive-tile canvas-item user-image'; figure.dataset.itemId = `image-${crypto.randomUUID()}`; figure.dataset.editorType = 'image'; figure.tabIndex = 0; figure.setAttribute('aria-label', `Изображение: ${name}`); const img = document.createElement('img'); img.src = src; img.alt = name; const caption = document.createElement('figcaption'); caption.textContent = name; figure.append(img, caption); this.canvases[0].append(figure); this.applyGeometry(figure, { x: 90, y: 250, w: 190 }); this.raise(figure); this.select(figure); this.save(); }
  deleteSelected() { const el = this.selected; if (!el) return; if (el.dataset.editorType === 'widget') { this.dashboard.removeWidget(el.dataset.itemId); } else el.remove(); this.selected = null; this.refreshSelection(); this.save(); }
  keyMove(e) { if (!this.selected || !this.editMode || ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return; if (e.key === 'Delete' || e.key === 'Backspace') { if (this.selected.dataset.editorType !== 'widget' || document.activeElement === document.body) { e.preventDefault(); this.deleteSelected(); } return; } const step = e.shiftKey ? 10 : 2; const directions = { ArrowLeft: [-step,0], ArrowRight:[step,0], ArrowUp:[0,-step], ArrowDown:[0,step] }; if (!directions[e.key] || this.selected.dataset.locked === 'true') return; e.preventDefault(); const [dx,dy] = directions[e.key]; const x = Math.max(0,(parseFloat(this.selected.style.left)||0)+dx), y = Math.max(0,(parseFloat(this.selected.style.top)||0)+dy); this.selected.style.left = `${x}px`; this.selected.style.top = `${y}px`; this.selected.dataset.x = x; this.selected.dataset.y = y; this.save(); }
  reset() { if (!confirm('Сбросить расположение и удалить добавленные элементы?')) return; localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(MOBILE_STORAGE_KEY); document.querySelectorAll('.user-image,.user-text').forEach(el => el.remove()); this.selected?.classList.remove('is-selected'); this.selected = null; location.reload(); }
  refreshSelection() {
    const has = Boolean(this.selected);
    this.toolbar?.querySelectorAll('[data-needs-selection]').forEach(b => b.disabled = !has);
    const lockButton = this.toolbar?.querySelector('[data-editor-action="lock"]');
    if (lockButton) lockButton.textContent = this.selected?.dataset.locked === 'true' ? 'Снять закрепление' : 'Закрепить / снять';
    this.updateCount();
  }
  updateCount() { if (this.countElement) this.countElement.textContent = `${document.querySelectorAll('.canvas-item').length} элементов · выберите и перетащите`; }
  announce(message) { const el = document.querySelector('#editor-status'); if (el) el.textContent = message; }
}
