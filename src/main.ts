import { describeApp } from "./app";
import { DECK } from "./data/cards";
import { mountDeckView } from "./views/deck";
import { mountArchiveView } from "./views/archive";
import { mountCardDetail } from "./views/cardDetail";
import { mountHashRouter, type AppRoute } from "./router";
import { browserDeckStorage, createDeckStore, DeckStorageError } from "./state/store";
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
    <div id="card-detail-view" hidden></div>
  </main>`;

  const deckView = app.querySelector<HTMLElement>("#deck-view");
  const archiveView = app.querySelector<HTMLElement>("#archive-view");
  const cardDetailView = app.querySelector<HTMLElement>("#card-detail-view");
  if (deckView && archiveView && cardDetailView) {
    const store = createDeckStore(browserDeckStorage());
    let refreshArchive = (): void => undefined;
    let openEvidenceInDeck = (_cardId: string): void => undefined;
    let pendingEvidenceCardId: string | undefined;
    let removeCardDetailActions = (): void => undefined;
    let navigate = (_route: AppRoute): void => undefined;

    const showCardDetail = (cardId: string, shouldFocus: boolean, drawError?: string): void => {
      const card = DECK.find((item) => item.id === cardId);
      if (!card) {
        navigate("deck");
        return;
      }

      removeCardDetailActions();
      removeCardDetailActions = mountCardDetail(cardDetailView, card, store.getRecords()[cardId], (action, selectedCard) => {
        if (action === "draw") {
          try {
            if (!store.draw(selectedCard.id)) return;
            showCardDetail(selectedCard.id, true);
          } catch (error) {
            if (!(error instanceof DeckStorageError)) throw error;
            showCardDetail(selectedCard.id, true, error.message);
          }
        } else if (action === "open-evidence") {
          pendingEvidenceCardId = selectedCard.id;
          navigate("deck");
        } else if (action === "open-archive") {
          navigate("archive");
        } else {
          navigate("deck");
        }
      }, drawError);
      if (shouldFocus) {
        const focusTarget = drawError ? ".card-detail__error" : ".card-detail";
        cardDetailView.querySelector<HTMLElement>(focusTarget)?.focus();
      }
    };

    const showRoute = (route: AppRoute, shouldFocus: boolean): void => {
      const showArchive = route === "archive";
      const showCard = typeof route !== "string";
      if (showArchive) refreshArchive();
      deckView.hidden = showArchive || showCard;
      archiveView.hidden = !showArchive;
      cardDetailView.hidden = !showCard;
      if (typeof route !== "string") showCardDetail(route.cardId, shouldFocus);
      else {
        removeCardDetailActions();
        removeCardDetailActions = (): void => undefined;
      }
      if (!showCard && !showArchive && pendingEvidenceCardId) {
        openEvidenceInDeck(pendingEvidenceCardId);
        pendingEvidenceCardId = undefined;
      } else if (shouldFocus) {
        const heading = showArchive ? "#archive-title" : "#deck-title";
        (showArchive ? archiveView : deckView).querySelector<HTMLElement>(heading)?.focus();
      }
    };

    refreshArchive = mountArchiveView(archiveView, store, () => navigate("deck"));
    const deckControls = mountDeckView(
      deckView,
      store,
      () => navigate("archive"),
      (cardId) => navigate({ type: "card", cardId }),
    );
    openEvidenceInDeck = deckControls.openEvidence;
    navigate = mountHashRouter(window, showRoute).navigate;
  }
}
