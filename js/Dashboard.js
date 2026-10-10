import { ToDoWidget } from './ToDoWidget.js';
import { QuoteWidget } from './QuoteWidget.js';
import { WeatherWidget } from './WeatherWidget.js';
import { HackerNewsWidget } from './HackerNewsWidget.js';
export class Dashboard {
  constructor(container, onChange = () => {}) { this.container = container; this.widgets = []; this.onChange = onChange; this.registry = { todo: ToDoWidget, quote: QuoteWidget, weather: WeatherWidget, news: HackerNewsWidget }; }
  addWidget(type) { const Widget = this.registry[type]; if (!Widget) throw new Error(`Unknown widget type: ${type}`); const widget = new Widget({ id: crypto.randomUUID() }); widget.onClose = id => this.removeWidget(id); const element = widget.render(); element.dataset.widgetType = type; this.widgets.push(widget); this.container.append(element); this.onChange(); return widget; }
  removeWidget(id) { const index = this.widgets.findIndex(widget => widget.id === id); if (index < 0) return; this.widgets[index].destroy(); this.widgets.splice(index, 1); this.onChange(); }
}
