import { UIComponent } from "./UIComponent.js";

export class HackerNewsWidget extends UIComponent {
  constructor(config) {
    super({
      ...config,
      title: "News / Хроника",
      label: "hacker news / технологии",
    });

    this.stateElement = null;
    this.abortController = null;
    this.timeoutId = null;
    this.timeoutRequestId = null;
    this.requestId = 0;
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
      this.loadStories();
    }

    return this.element;
  }

  renderContent() {
    this.clearContent();

    const note = document.createElement("p");
    note.className = "source-note";
    note.textContent = "Technology stories from Hacker News / технологическая хроника, не новости Парижа.";

    const actions = document.createElement("div");
    actions.className = "widget-actions";

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.className = "print-button compact";
    refreshButton.textContent = "Reload / обновить";
    refreshButton.setAttribute("aria-label", "Reload Hacker News / обновить Hacker News");

    this.addEvent(refreshButton, "click", () => this.loadStories());

    this.stateElement = document.createElement("div");
    this.stateElement.className = "api-state";
    this.stateElement.setAttribute("aria-live", "polite");

    actions.append(refreshButton);
    this.contentElement.append(note, actions, this.stateElement);
  }

  async loadStories() {
    const currentRequestId = this.requestId + 1;
    this.requestId = currentRequestId;
    this.cancelRequest();

    this.abortController = new AbortController();
    this.timeoutRequestId = null;
    this.timeoutId = window.setTimeout(() => {
      this.timeoutRequestId = currentRequestId;
      this.abortController?.abort();
    }, 10000);

    this.showMessage("Loading Hacker News / загружаем Hacker News...", "loading");

    try {
      const idsResponse = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
        signal: this.abortController.signal,
      });

      if (!idsResponse.ok) {
        throw new Error(`Hacker News вернул статус ${idsResponse.status}`);
      }

      const ids = await idsResponse.json();

      if (!Array.isArray(ids) || ids.length === 0) {
        this.showMessage("Hacker News returned no stories / пустой список историй.", "empty");
        return;
      }

      const storyIds = ids.slice(0, 5);
      const stories = await Promise.all(
        storyIds.map((id) =>
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            signal: this.abortController.signal,
          }).then((response) => {
            if (!response.ok) {
              throw new Error(`Story ${id} returned ${response.status}`);
            }
            return response.json();
          }),
        ),
      );

      if (currentRequestId !== this.requestId || this.destroyed) {
        return;
      }

      const validStories = stories.filter((story) => story && story.type === "story" && story.title);
      this.renderStories(validStories);
    } catch (error) {
      if (error.name === "AbortError") {
        if (this.timeoutRequestId === currentRequestId && currentRequestId === this.requestId) {
          this.showError("Hacker News timed out / не ответил за отведённое время.");
        }
        return;
      }

      if (currentRequestId === this.requestId && !this.destroyed) {
        this.showError("Could not load Hacker News / не удалось загрузить Hacker News.");
      }
    } finally {
      if (currentRequestId === this.requestId) {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = null;
        this.abortController = null;
      }
    }
  }

  renderStories(stories) {
    if (stories.length === 0) {
      this.showMessage("No suitable stories found / подходящих историй не найдено.", "empty");
      return;
    }

    this.stateElement.replaceChildren();
    this.stateElement.className = "api-state success";

    const list = document.createElement("ol");
    list.className = "news-list";

    stories.forEach((story) => {
      const item = document.createElement("li");

      const link = document.createElement("a");
      link.textContent = story.title;
      link.href = this.getSafeStoryUrl(story);
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const meta = document.createElement("p");
      meta.className = "story-meta";
      meta.textContent = typeof story.score === "number" ? `${story.score} points` : "points n/a";

      item.append(link, meta);
      list.append(item);
    });

    this.stateElement.append(list);
  }

  getSafeStoryUrl(story) {
    const fallback = `https://news.ycombinator.com/item?id=${story.id}`;

    if (!story.url) {
      return fallback;
    }

    try {
      const url = new URL(story.url);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : fallback;
    } catch {
      return fallback;
    }
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
    this.addEvent(retryButton, "click", () => this.loadStories(), { once: true });

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
