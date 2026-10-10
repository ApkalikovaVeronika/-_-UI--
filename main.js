import { Dashboard } from './js/Dashboard.js';
import { CanvasEditor } from './js/CanvasEditor.js';

const board = document.querySelector('#dashboard-grid');
const count = document.querySelector('#dashboard-count');
const empty = document.querySelector('#empty-dashboard');
const dashboard = new Dashboard(board, updateDashboard);
function updateDashboard() {
  if (count) count.textContent = `${dashboard.widgets.length} активных виджетов`;
  if (empty) empty.hidden = dashboard.widgets.length > 0;
}

document.querySelectorAll('[data-widget]').forEach(button => {
  button.addEventListener('click', () => {
    const widget = dashboard.addWidget(button.dataset.widget);
    if (editor) { editor.save(); editor.select(widget.element); }
  });
});
let editor;
editor = new CanvasEditor({ canvases: [document.querySelector('.hero'), board], toolbar: document.querySelector('#editor-toolbar'), dashboard, countElement: count });
updateDashboard();
