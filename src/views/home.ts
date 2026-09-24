import { DECK } from "../data/cards";
import { renderCardFace } from "../components/cardFace";
import { DeckStorageError, type DeckStore } from "../state/store";
import { escapeHtml, type DeckRecords } from "./deckShared";

function renderDailyCard(records: DeckRecords, dailyDrawCardId?: string, dailyDrawError?: string): string {
  const card = dailyDrawCardId ? DECK.find((item) => item.id === dailyDrawCardId) : undefined;
  const hasEligibleCard = DECK.some((item) => records[item.id]?.state !== "lived");
  const message = card
    ? `Today's invitation: ${card.name}.`
    : hasEligibleCard
      ? "A date-seeded card, chosen once for today."
      : "Every invitation in this deck has been Lived.";
  const revealedCard = card
    ? `<div class="daily-draw__face" data-draw-animation="true" role="group" tabindex="-1" aria-label="Today's card: ${escapeHtml(card.name)}">${renderCardFace(card, records[card.id])}<button class="card-detail__open" type="button" data-action="open-card" data-card-id="${card.id}">Open card details</button></div>`
    : "";

  return `<section class="daily-draw" aria-labelledby="home-title">
    <div class="daily-draw__intro">
      <p class="daily-draw__eyebrow">The card of the day</p>
      <h2 id="home-title" tabindex="-1">One invitation, chosen for today.</h2>
      <p class="daily-draw__intro-copy">The date decides the card. Once revealed, today's deal stays yours across reloads.</p>
    </div>
    <button class="daily-draw__button" type="button" data-action="daily-draw"${card || !hasEligibleCard ? " disabled" : ""}>${card ? "Today's card is revealed" : "Reveal today's invitation"}</button>
    <p class="daily-draw__message" role="status" aria-live="polite">${escapeHtml(message)}</p>
    ${dailyDrawError ? `<p class="draw-storage-error" data-draw-error="daily" role="alert" tabindex="-1">${escapeHtml(dailyDrawError)}</p>` : ""}
    ${revealedCard ? `<div class="daily-draw__reveal">${revealedCard}</div>` : ""}
  </section>`;
}

/**
 * The home screen: the daily card and nothing else. The Gallery (whole deck,
 * filters, random deal) and the Archive are small links from here.
 */
export function renderHomeView(records: DeckRecords = {}, dailyDrawCardId?: string, dailyDrawError?: string): string {
  return `${renderDailyCard(records, dailyDrawCardId, dailyDrawError)}
  <nav class="home-links" aria-label="Explore the deck">
    <button class="gallery-open" type="button" data-action="open-gallery">Open the Gallery</button>
    <button class="archive-open" type="button" data-action="open-archive">Open the Archive</button>
  </nav>`;
}

/** Mount the home screen and return its refresh hook. */
export function mountHomeView(
  container: HTMLElement,
  store: DeckStore,
  handlers: {
    onOpenGallery: () => void;
    onOpenArchive: () => void;
    onOpenCard: (cardId: string) => void;
  },
): () => void {
  let dailyDrawError: string | undefined;
  const render = (): void => {
    container.innerHTML = renderHomeView(store.getRecords(), store.getDailyDraw()?.id, dailyDrawError);
  };
  render();

  const scheduleDailyRefresh = (): void => {
    const now = new Date();
    const nextLocalMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    window.setTimeout(() => {
      render();
      scheduleDailyRefresh();
    }, nextLocalMidnight.getTime() - now.getTime() + 25);
  };
  scheduleDailyRefresh();

  container.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-action="open-gallery"]')) {
      handlers.onOpenGallery();
      return;
    }
    if (target.closest('[data-action="open-archive"]')) {
      handlers.onOpenArchive();
      return;
    }
    const openCardButton = target.closest<HTMLButtonElement>('[data-action="open-card"]');
    if (openCardButton?.dataset.cardId) {
      handlers.onOpenCard(openCardButton.dataset.cardId);
      return;
    }
    if (!target.closest('[data-action="daily-draw"]')) return;

    dailyDrawError = undefined;
    void (async () => {
      try {
        const card = await store.drawDaily();
        if (!card) {
          render();
          return;
        }
        render();
        container.querySelector<HTMLElement>(".daily-draw__face")?.focus();
      } catch (error) {
        if (!(error instanceof DeckStorageError)) throw error;
        dailyDrawError = error.message;
        render();
        container.querySelector<HTMLElement>('[data-draw-error="daily"]')?.focus();
      }
    })();
  });

  return render;
}