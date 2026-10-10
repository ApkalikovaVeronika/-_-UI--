import { UIComponent } from './UIComponent.js';
export class ToDoWidget extends UIComponent {
  constructor(config) { super({ ...config, title: 'Notes / список дел', label: 'liste privée / личные заметки' }); this.tasks = []; }
  render() {
    super.render(); if (this.contentElement.childElementCount) return this.element;
    const form = document.createElement('form'); form.className = 'todo-form';
    const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'Добавить заметку…'; input.maxLength = 160; input.setAttribute('aria-label', 'Текст новой задачи');
    const add = document.createElement('button'); add.type = 'submit'; add.className = 'print-button compact'; add.textContent = 'Добавить';
    form.append(input, add); const list = document.createElement('ul'); list.className = 'todo-list'; const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = 'Пока здесь тихо.';
    this.contentElement.append(form, empty, list);
    this.addEvent(form, 'submit', e => { e.preventDefault(); const value = input.value.trim(); if (!value) return; this.tasks.push({ id: crypto.randomUUID(), text: value, done: false }); input.value = ''; this.drawTasks(list, empty); input.focus(); });
    this.drawTasks(list, empty); return this.element;
  }
  drawTasks(list, empty) { list.replaceChildren(); empty.hidden = this.tasks.length > 0; this.tasks.forEach(task => { const li = document.createElement('li'); const label = document.createElement('label'); label.className = task.done ? 'task-done' : ''; const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.done; check.setAttribute('aria-label', `Выполнено: ${task.text}`); check.addEventListener('change', () => { task.done = check.checked; label.classList.toggle('task-done', task.done); }); const text = document.createElement('span'); text.textContent = task.text; label.append(check, text); const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'text-button'; remove.textContent = 'удалить'; remove.setAttribute('aria-label', `Удалить задачу: ${task.text}`); remove.addEventListener('click', () => { this.tasks = this.tasks.filter(t => t.id !== task.id); this.drawTasks(list, empty); }); li.append(label, remove); list.append(li); }); }
}
