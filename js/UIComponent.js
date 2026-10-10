export class UIComponent {
  constructor({ title = 'Widget', id = crypto.randomUUID(), label = '' } = {}) {
    this.title = title;
    this.id = id;
    this.label = label;
    this.element = null;
    this.contentElement = null;
    this.cleanups = [];
    this.destroyed = false;
    this.minimized = false;
  }

  render() {
    if (this.element) return this.element;
    const article = document.createElement('article');
    article.className = 'widget-sheet canvas-item';
    article.dataset.itemId = this.id;
    article.dataset.editorType = 'widget';
    article.style.setProperty('--item-width', '310px');

    const header = document.createElement('header');
    header.className = 'widget-header drag-handle';
    const headingWrap = document.createElement('div');
    const meta = document.createElement('p');
    meta.className = 'widget-meta';
    meta.textContent = this.label || 'carnet / note';
    const heading = document.createElement('h3');
    heading.className = 'widget-title';
    heading.textContent = this.title;
    headingWrap.append(meta, heading);
    const actions = document.createElement('div');
    actions.className = 'widget-chrome';
    const minimize = this.makeButton('−', `Свернуть: ${this.title}`, () => this.toggleMinimize());
    const close = this.makeButton('×', `Удалить: ${this.title}`, () => this.onClose?.(this.id));
    actions.append(minimize, close);
    header.append(headingWrap, actions);
    const content = document.createElement('div');
    content.className = 'widget-content';
    article.append(header, content);
    this.element = article;
    this.contentElement = content;
    this.minimizeButton = minimize;
    return article;
  }

  makeButton(text, label, callback) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    this.addEvent(button, 'click', callback);
    return button;
  }

  addEvent(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this.cleanups.push(() => element.removeEventListener(event, handler, options));
  }

  addCleanup(callback) { this.cleanups.push(callback); }
  clearContent() { this.contentElement?.replaceChildren(); }

  toggleMinimize() {
    this.minimized = !this.minimized;
    this.contentElement.hidden = this.minimized;
    this.element.classList.toggle('is-minimized', this.minimized);
    this.minimizeButton.textContent = this.minimized ? '+' : '−';
    this.minimizeButton.setAttribute('aria-label', `${this.minimized ? 'Развернуть' : 'Свернуть'}: ${this.title}`);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const cleanup of this.cleanups.splice(0).reverse()) {
      try { cleanup(); } catch (error) { console.error('Cleanup failed', error); }
    }
    this.element?.remove();
    this.element = null;
    this.contentElement = null;
  }
}
