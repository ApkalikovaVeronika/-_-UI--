import { UIComponent } from "./UIComponent.js";

const WEATHER_CODE_LABELS = {
  0: "ясно",
  1: "преимущественно ясно",
  2: "переменная облачность",
  3: "пасмурно",
  45: "туман",
  48: "изморозь",
  51: "слабая морось",
  53: "морось",
  55: "сильная морось",
  61: "слабый дождь",
  63: "дождь",
  65: "сильный дождь",
  71: "слабый снег",
  73: "снег",
  75: "сильный снег",
  80: "ливень",
  81: "ливень",
  82: "сильный ливень",
  95: "гроза",
  96: "гроза с градом",
  99: "сильная гроза с градом",
};

export class WeatherWidget extends UIComponent {
  constructor(config) {
    super({
      ...config,
      title: "Weather / Погода",
      label: "paris / париж",
    });

    this.stateElement = null;
    this.abortController = null;
    this.timeoutId = null;
    this.requestId = 0;
    this.timeoutRequestId = null;
    this.hasLoadedOnce = false;
    this.addCleanup(() => this.cancelRequest());
  }

  render() {
    super.render();

    if (!this.stateElement) {
      this.renderContent();
    }

    if (!this.hasLoadedOnce) {
      this.hasLoadedOnce = true;
      this.loadWeather();
    }

    return this.element;
  }

  renderContent() {
    this.clearContent();

    const actions = document.createElement("div");
    actions.className = "widget-actions";

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.className = "print-button compact";
    refreshButton.textContent = "Refresh / обновить";
    refreshButton.setAttribute("aria-label", "Refresh weather / обновить погоду");

    this.addEvent(refreshButton, "click", () => this.loadWeather());

    this.stateElement = document.createElement("div");
    this.stateElement.className = "api-state";
    this.stateElement.setAttribute("aria-live", "polite");

    actions.append(refreshButton);
    this.contentElement.append(actions, this.stateElement);
  }

  async loadWeather() {
    const currentRequestId = this.requestId + 1;
    this.requestId = currentRequestId;
    this.cancelRequest();

    this.abortController = new AbortController();
    this.timeoutRequestId = null;
    this.timeoutId = window.setTimeout(() => {
      this.timeoutRequestId = currentRequestId;
      this.abortController?.abort();
    }, 10000);

    this.showMessage("Loading Paris weather / загружаем погоду Парижа...", "loading");

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", "48.8566");
    url.searchParams.set("longitude", "2.3522");
    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    );
    url.searchParams.set("timezone", "Europe/Paris");

    try {
      const response = await fetch(url, { signal: this.abortController.signal });

      if (!response.ok) {
        throw new Error(`Open-Meteo вернул статус ${response.status}`);
      }

      const data = await response.json();

      if (currentRequestId !== this.requestId || this.destroyed) {
        return;
      }

      this.renderWeather(data);
    } catch (error) {
      if (error.name === "AbortError") {
        if (this.timeoutRequestId === currentRequestId && currentRequestId === this.requestId) {
          this.showError("Open-Meteo timed out / не ответил за отведённое время.");
        }
        return;
      }

      if (currentRequestId === this.requestId && !this.destroyed) {
        this.showError("Could not load weather / не удалось загрузить погоду. Try again.");
      }
    } finally {
      if (currentRequestId === this.requestId) {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = null;
        this.abortController = null;
      }
    }
  }

  renderWeather(data) {
    const current = data?.current;

    if (!current || typeof current.temperature_2m !== "number") {
      this.showMessage("Open-Meteo returned no data / Open-Meteo вернул пустой ответ.", "empty");
      return;
    }

    this.stateElement.replaceChildren();
    this.stateElement.className = "api-state success weather-report";

    const city = document.createElement("p");
    city.className = "weather-city";
    city.textContent = "Paris, France";

    const temperature = document.createElement("p");
    temperature.className = "weather-temperature";
    temperature.textContent = `${Math.round(current.temperature_2m)}°C`;

    const condition = document.createElement("p");
    condition.className = "weather-condition";
    const codeLabel = WEATHER_CODE_LABELS[current.weather_code] ?? `код ${current.weather_code}`;
    condition.textContent = codeLabel;

    const details = document.createElement("dl");
    details.className = "weather-details";

    this.appendDetail(details, "Humidity / влажность", `${current.relative_humidity_2m}%`);
    this.appendDetail(details, "Wind / ветер", `${current.wind_speed_10m} км/ч`);
    this.appendDetail(details, "Updated / обновлено", this.formatDateTime(current.time));

    this.stateElement.append(city, temperature, condition, details);
  }

  appendDetail(list, termText, valueText) {
    const term = document.createElement("dt");
    term.textContent = termText;

    const value = document.createElement("dd");
    value.textContent = valueText;

    list.append(term, value);
  }

  formatDateTime(value) {
    if (!value) {
      return "not specified / не указано";
    }

    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  showMessage(message, state) {
    this.stateElement.className = `api-state ${state}`;
    this.stateElement.replaceChildren();

    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    this.stateElement.append(paragraph);
  }

  showError(message) {
    this.stateElement.className = "api-state error";
    this.stateElement.replaceChildren();

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.className = "print-button compact";
    retryButton.textContent = "Retry / повторить";
    this.addEvent(retryButton, "click", () => this.loadWeather(), { once: true });

    this.stateElement.append(paragraph, retryButton);
  }

  cancelRequest() {
    window.clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.timeoutRequestId = null;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
