import { DECK, type Card } from "../data/cards";
import { renderCardBack, renderSealedCardFace } from "../components/cardFace";
import { DeckStorageError, type DeckStore } from "../state/store";
import { escapeHtml, type DeckRecords } from "./deckShared";

/**
 * The one wording source for the daily card's live status line. It is read both
 * when rendering the view and when revealing in place, so the text never drifts.
 */
export function dailyDrawMessage(
  card: Card | undefined,
  peek: Card | undefined,
  hasEligibleCard: boolean,
): string {
  if (card) return `Today's invitation: ${card.name}.`;
  if (peek) return "Tap the card to reveal today's invitation.";
  return hasEligibleCard ? "A date-seeded card, chosen once for today." : "Every invitation in this deck has been Lived.";
}

/**
 * The dealt card as one stack of two preloaded faces: the face-down back is the
 * tap control, and the sealed front waits behind it. Keeping both faces in one
 * card lets the store subscription flip between them without replacing the DOM,
 * so the idle wobble (owned by the card container) never restarts. The face
 * that is not live stays inert and hidden from assistive tech, so the invitation
 * leaks nothing before the deal.
 */
function renderDailyCardStack(card: Card, revealed: boolean): string {
  const back = `<div class="daily-draw__side daily-draw__side--back"${revealed ? ' inert aria-hidden="true"' : ""}>
      <button class="daily-draw__tap" type="button" data-action="daily-draw" aria-label="Reveal today's invitation">
        <span class="daily-draw__tap-card">${renderCardBack(card)}</span>
      </button>
    </div>`;
  const front = `<div class="daily-draw__side daily-draw__side--front"${revealed ? "" : ' inert aria-hidden="true"'}>
      ${renderSealedCardFace(card)}
    </div>`;

  return `<div class="daily-draw__card ${revealed ? "is-revealed" : "is-peeking"}" data-flip-card="${escapeHtml(card.id)}">
    <div class="daily-draw__flip">${back}${front}</div>
  </div>`;
}

function renderDailyCard(
  records: DeckRecords,
  dailyDrawCardId?: string,
  dailyDrawError?: string,
  peekCardId?: string,
): string {
  const card = dailyDrawCardId ? DECK.find((item) => item.id === dailyDrawCardId) : undefined;
  const peek = !card && peekCardId ? DECK.find((item) => item.id === peekCardId) : undefined;
  const hasEligibleCard = DECK.some((item) => records[item.id]?.state !== "lived");
  const message = dailyDrawMessage(card, peek, hasEligibleCard);
  const dealt = card ?? peek;
  // "Tap to reveal" leads the bottom group; the card itself is the reveal control.
  const hint = `<div class="daily-draw__hint-slot">${peek ? '<p class="daily-draw__hint" data-action="daily-draw">Tap to reveal</p>' : '<span aria-hidden="true"></span>'}</div>`;

  return `<section class="daily-draw" aria-labelledby="home-title">
    <div class="daily-draw__stage">${dealt ? renderDailyCardStack(dealt, !!card) : ""}</div>
    <div class="daily-draw__bottom">
      ${hint}
      <div class="daily-draw__intro">
        <p class="daily-draw__eyebrow">The card of the day</p>
        <h2 id="home-title" tabindex="-1">One invitation, chosen for today.</h2>
      </div>
      <p class="daily-draw__message" role="status" aria-live="polite">${escapeHtml(message)}</p>
      ${dailyDrawError ? `<p class="draw-storage-error" data-draw-error="daily" role="alert" tabindex="-1">${escapeHtml(dailyDrawError)}</p>` : ""}
    </div>
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

/**
 * The home card's rendered identity. A render rebuilds the view unless the same
 * card is transitioning from face-down to drawn, which must flip in place so the
 * wobble animation is never torn down.
 */
export interface HomeCardState {
  cardId?: string | undefined;
  revealed: boolean;
}

/**
 * True only when the existing DOM shows the back of a card that has just been
 * drawn. Every other change rebuilds, because the content genuinely differs.
 */
export function shouldFlipInPlace(previous: HomeCardState | undefined, next: HomeCardState): boolean {
  return previous !== undefined
    && next.revealed
    && !previous.revealed
    && next.cardId !== undefined
    && next.cardId === previous.cardId;
}

/**
 * Flip the already-rendered stack from the back to the front without touching
 * the DOM that owns the wobble. Also swaps which face is reachable and updates
 * the live message, so the subscription-driven reveal is invisible to motion.
 */
function revealDailyCard(container: HTMLElement, card: Card): void {
  const stack = container.querySelector<HTMLElement>("[data-flip-card]");
  if (!stack) return;

  stack.classList.remove("is-peeking");
  stack.classList.add("is-revealed");
  const back = stack.querySelector<HTMLElement>(".daily-draw__side--back");
  const front = stack.querySelector<HTMLElement>(".daily-draw__side--front");
  back?.setAttribute("inert", "");
  back?.setAttribute("aria-hidden", "true");
  front?.removeAttribute("inert");
  front?.removeAttribute("aria-hidden");

  const hintSlot = container.querySelector<HTMLElement>(".daily-draw__hint-slot");
  if (hintSlot) hintSlot.innerHTML = '<span aria-hidden="true"></span>';
  // A retry after a failed deal must clear the error left from the last render.
  container.querySelector<HTMLElement>('[data-draw-error="daily"]')?.remove();
  const message = container.querySelector<HTMLElement>(".daily-draw__message");
  if (message) message.textContent = dailyDrawMessage(card, undefined, true);
}

/** Mount the home screen and return its refresh hook. */
export function mountHomeView(container: HTMLElement, store: DeckStore): () => void {
  let dailyDrawError: string | undefined;
  let renderState: HomeCardState | undefined;

  const render = (): void => {
    const card = store.getDailyDraw();
    const peek = card ? undefined : store.peekDailyDraw();
    const cardId = (card ?? peek)?.id;
    const next: HomeCardState = { ...(cardId ? { cardId } : {}), revealed: !!card };

    // Drawing fires the store subscription synchronously. Rebuilding the view
    // would tear down the card the bob animation lives on, so a peek that
    // becomes its own draw flips the existing stack in place instead.
    if (card && shouldFlipInPlace(renderState, next)) {
      revealDailyCard(container, card);
      renderState = next;
      return;
    }

    container.innerHTML = renderHomeView(store.getRecords(), card?.id, dailyDrawError, peek?.id);
    renderState = next;
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
        // The draw's store notification already flipped the preloaded faces in
        // place; hand focus to the revealed card's action.
        container.querySelector<HTMLElement>(".daily-draw__side--front .card-face__reveal")?.focus();
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
