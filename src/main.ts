import { describeApp } from "./app";
import { DECK } from "./data/cards";
import { mountHomeView } from "./views/home";
import { mountGalleryView } from "./views/gallery";
import { mountArchiveView } from "./views/archive";
import { mountCardDetail, type CardDetailAction, type EvidenceEntryState } from "./views/cardDetail";
import { mountHashRouter, type AppRoute } from "./router";
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
    <div id="home-view"></div>
    <div id="gallery-view" hidden></div>
    <div id="archive-view" hidden></div>
    <div id="card-detail-view" hidden></div>
  </main>`;

  const homeView = app.querySelector<HTMLElement>("#home-view");
  const galleryView = app.querySelector<HTMLElement>("#gallery-view");
  const archiveView = app.querySelector<HTMLElement>("#archive-view");
  const cardDetailView = app.querySelector<HTMLElement>("#card-detail-view");
  if (homeView && galleryView && archiveView && cardDetailView) {
    const store = createDeckStore(browserDeckStorage());
    let refreshArchive = (): void => undefined;
    let refreshHome = (): void => undefined;
    let refreshGallery = (): void => undefined;
    let removeCardDetailActions = (): void => undefined;
    let navigate = (_route: AppRoute): void => undefined;
    let activeRoute: AppRoute = "deck";
    // Owned here so an unsaved deposit draft survives re-renders (e.g. when
    // another tab changes the card while the form is open).
    const detailEvidence: EvidenceEntryState = { open: false };

    const showCardDetail = (cardId: string, shouldFocus: boolean): void => {
      const card = DECK.find((item) => item.id === cardId);
      if (!card) {
        navigate("deck");
        return;
      }

      removeCardDetailActions();
      removeCardDetailActions = mountCardDetail(
        cardDetailView,
        card,
        store.getRecords()[cardId],
        {
          onAction: (action: CardDetailAction) => {
            if (action === "open-archive") {
              navigate("archive");
            } else {
              navigate("deck");
            }
          },
          onSubmitEvidence: (cardIdToSubmit, evidence) => store.submitEvidence(cardIdToSubmit, evidence),
        },
        detailEvidence,
      );
      if (shouldFocus) {
        const focusTarget = ".card-detail";
        cardDetailView.querySelector<HTMLElement>(focusTarget)?.focus();
      }
    };

    const showRoute = (route: AppRoute, shouldFocus: boolean): void => {
      activeRoute = route;
      const showHome = route === "deck";
      const showGallery = route === "gallery";
      const showArchive = route === "archive";
      const showCard = typeof route !== "string";
      if (showArchive) refreshArchive();
      if (showGallery) refreshGallery();
      if (!showCard) detailEvidence.open = false;
      homeView.hidden = !showHome;
      galleryView.hidden = !showGallery;
      archiveView.hidden = !showArchive;
      cardDetailView.hidden = !showCard;
      if (typeof route !== "string") {
        showCardDetail(route.cardId, shouldFocus);
        return;
      }
      removeCardDetailActions();
      removeCardDetailActions = (): void => undefined;
      if (shouldFocus) {
        const heading = showArchive ? "#archive-title" : showGallery ? "#gallery-title" : "#home-title";
        (showArchive ? archiveView : showGallery ? galleryView : homeView).querySelector<HTMLElement>(heading)?.focus();
      }
    };

    refreshArchive = mountArchiveView(archiveView, store, () => navigate("deck"));
    refreshHome = mountHomeView(homeView, store, {
      onOpenGallery: () => navigate("gallery"),
      onOpenArchive: () => navigate("archive"),
      onOpenCard: (cardId) => navigate({ type: "card", cardId }),
    });
    refreshGallery = mountGalleryView(galleryView, store, () => navigate("deck"));
    navigate = mountHashRouter(window, showRoute).navigate;

    store.subscribe(() => {
      // Archive and gallery re-render on every deck change; preserve focus
      // within whichever one the user is interacting with.
      for (const [view, refresh] of [[archiveView, refreshArchive], [galleryView, refreshGallery]] as const) {
        const focusedElement = view.contains(document.activeElement)
          ? document.activeElement as HTMLElement
          : undefined;
        const focusedId = focusedElement?.id;
        const focusedAction = focusedElement?.dataset.action;
        refresh();
        if (focusedId) {
          view.querySelector<HTMLElement>(`#${focusedId}`)?.focus({ preventScroll: true });
        } else if (focusedAction) {
          view.querySelector<HTMLElement>(`[data-action="${focusedAction}"]`)?.focus({ preventScroll: true });
        }
      }
      refreshHome();
      if (typeof activeRoute === "string") return;

      const focusedAction = cardDetailView.querySelector<HTMLElement>("button:focus[data-action]")?.dataset.action;
      showCardDetail(activeRoute.cardId, false);
      if (focusedAction) {
        cardDetailView.querySelector<HTMLElement>(`[data-action="${focusedAction}"]`)?.focus({ preventScroll: true });
      }
    });
  }
}