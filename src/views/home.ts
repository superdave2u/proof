import { DECK } from "../data/cards";
import { renderCardBack, renderCardFace } from "../components/cardFace";
import { DeckStorageError, type DeckStore } from "../state/store";
import { escapeHtml, type DeckRecords } from "./deckShared";

/**
 * The home hero: the dealt card waits face-down like a gallery back and is
 * flipped by tapping it. The dealt card is known before the tap (the date
 * seeds the deal), so its back is honest about territory and number while the
 * face stays concealed until tapped.
 */
function renderDailyCard(
  records: DeckRecords,
  dailyDrawCardId?: string,
  dailyDrawError?: string,
  peekCardId?: string,
): string {
  const card = dailyDrawCardId ? DECK.find((item) => item.id === dailyDrawCardId) : undefined;
  const peek = !card && peekCardId ? DECK.find((item) => item.id === peekCardId) : undefined;
  const hasEligibleCard = DECK.some((item) => records[item.id]?.state !== "lived");
  const message = card
    ? `Today's invitation: ${card.name}.`
    : peek
      ? "Tap the card to reveal today's invitation."
      : hasEligibleCard
        ? "A date-seeded card, chosen once for today."
        : "Every invitation in this deck has been Lived.";
  const tapCard = peek
    ? `<button class="daily-draw__tap" type="button" data-action="daily-draw" aria-label="Reveal today's invitation">
        <span class="daily-draw__tap-card">${renderCardBack(peek)}</span>
        <span class="daily-draw__hint">Tap to reveal</span>
      </button>`
    : "";
  // The revealed card is the link itself, exactly like a gallery preview: the
  // full anatomy and the only deposit flow live on the card detail page.
  const revealedCard = card
    ? `<a class="daily-draw__face" data-draw-animation="true" href="#/card/${encodeURIComponent(card.id)}" aria-label="Today's card: ${escapeHtml(card.name)} — open card details">${renderCardFace(card, records[card.id], { preview: true })}</a>`
    : "";

  return `<section class="daily-draw" aria-labelledby="home-title">
    ${revealedCard || tapCard}
    <div class="daily-draw__intro">
      <p class="daily-draw__eyebrow">The card of the day</p>
      <h2 id="home-title" tabindex="-1">One invitation, chosen for today.</h2>
      <p class="daily-draw__intro-copy">The date decides the card. Once revealed, today's deal stays yours across reloads.</p>
    </div>
    <p class="daily-draw__message" role="status" aria-live="polite">${escapeHtml(message)}</p>
    ${dailyDrawError ? `<p class="draw-storage-error" data-draw-error="daily" role="alert" tabindex="-1">${escapeHtml(dailyDrawError)}</p>` : ""}
  </section>`;
}

/**
 * The home screen: the daily card and its story — nothing else. Page
 * navigation lives in the header menu.
 */
export function renderHomeView(
  records: DeckRecords = {},
  dailyDrawCardId?: string,
  dailyDrawError?: string,
  peekCardId?: string,
): string {
  return renderDailyCard(records, dailyDrawCardId, dailyDrawError, peekCardId);
}

/** Mount the home screen and return its refresh hook. */
export function mountHomeView(container: HTMLElement, store: DeckStore): () => void {
  let dailyDrawError: string | undefined;
  const render = (): void => {
    container.innerHTML = renderHomeView(store.getRecords(), store.getDailyDraw()?.id, dailyDrawError, store.peekDailyDraw()?.id);
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