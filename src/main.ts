import { describeApp } from "./app";
import { mountDeckView } from "./views/deck";
import { mountArchiveView } from "./views/archive";
import { browserDeckStorage, createDeckStore } from "./state/store";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `<main class="app-shell">
    <header class="app-intro">
      <p class="app-intro__eyebrow">A collectible adventure game</p>
      <h1>Proof of Life</h1>
      <p class="app-intro__copy">${describeApp()}. A pristine deck holds the life you could live; each card is an invitation to bring back evidence of the life that happened.</p>
    </header>
    <div id="deck-view"></div>
    <div id="archive-view" hidden></div>
  </main>`;

  const deckView = app.querySelector<HTMLElement>("#deck-view");
  const archiveView = app.querySelector<HTMLElement>("#archive-view");
  if (deckView && archiveView) {
    const store = createDeckStore(browserDeckStorage());
    let refreshArchive = (): void => undefined;
    const showArchive = (): void => {
      refreshArchive();
      deckView.hidden = true;
      archiveView.hidden = false;
      archiveView.querySelector<HTMLElement>("#archive-title")?.focus();
    };
    const showDeck = (): void => {
      archiveView.hidden = true;
      deckView.hidden = false;
      deckView.querySelector<HTMLElement>("#deck-title")?.focus();
    };

    refreshArchive = mountArchiveView(archiveView, store, showDeck);
    mountDeckView(deckView, store, showArchive);
  }
}
