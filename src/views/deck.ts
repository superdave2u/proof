import { DECK, territories, type Card, type Territory } from "../data/cards";
import { renderCardFace, type CardFaceRecord } from "../components/cardFace";
import { isValidEvidence, MAX_ARTIFACT_BYTES, type Evidence } from "../state/evidence";
import { browserDeckStorage, createDeckStore, type DeckStore } from "../state/store";

export type DeckStateFilter = "all" | CardFaceRecord["state"];
export type DeckTerritoryFilter = "all" | Territory;

export interface DeckFilters {
  territory: DeckTerritoryFilter;
  state: DeckStateFilter;
}

export type DeckRecords = Readonly<Record<string, CardFaceRecord | undefined>>;

const DEFAULT_FILTERS: DeckFilters = { territory: "all", state: "all" };

function stateFor(card: Card, records: DeckRecords): CardFaceRecord["state"] {
  return records[card.id]?.state ?? "undiscovered";
}

/** Keep filtering independent of the browser so its combinations stay auditable. */
export function filterDeck(
  cards: readonly Card[],
  records: DeckRecords,
  filters: DeckFilters = DEFAULT_FILTERS,
): Card[] {
  return cards.filter((card) => {
    const matchesTerritory = filters.territory === "all" || card.territory === filters.territory;
    const matchesState = filters.state === "all" || stateFor(card, records) === filters.state;
    return matchesTerritory && matchesState;
  });
}

interface EvidenceDraft {
  date: string;
  note: string;
  fileName?: string;
}

function renderEvidenceForm(card: Card, error?: string, draft?: EvidenceDraft): string {
  const formId = `evidence-form-${card.id}`;
  const today = localDateValue(new Date());
  return `<section class="evidence-entry" aria-labelledby="${formId}-title">
    <h3 id="${formId}-title" tabindex="-1">Deposit your Proof of Life</h3>
    <p>Keep the evidence of the life that happened. A note is required; a photo is optional.</p>
    <form data-evidence-form="${card.id}">
      <label for="${formId}-date">Date lived
        <input id="${formId}-date" name="date" type="date" value="${escapeHtml(draft?.date || today)}" required>
      </label>
      <label for="${formId}-note">Evidence note
        <textarea id="${formId}-note" name="note" rows="3" required placeholder="A sentence, a recipe, a list of names…">${escapeHtml(draft?.note ?? "")}</textarea>
      </label>
      ${draft?.fileName ? `<p class="evidence-entry__file">Selected artifact: ${escapeHtml(draft.fileName)}</p>` : ""}
      <label for="${formId}-artifact">Artifact photo <span>(optional)</span>
        <input id="${formId}-artifact" name="artifact" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
      </label>
      <p class="evidence-entry__hint">Images up to ${Math.floor(MAX_ARTIFACT_BYTES / 1024)} KiB are stored with this card in this browser.</p>
      ${error ? `<p class="evidence-entry__error" role="alert">${escapeHtml(error)}</p>` : ""}
      <div class="evidence-entry__actions">
        <button type="submit">Deposited my Proof of Life</button>
        <button type="button" data-action="cancel-evidence">Keep this card drawn</button>
      </div>
    </form>
  </section>`;
}

function renderCardTile(
  card: Card,
  records: DeckRecords,
  evidenceCardId?: string,
  evidenceError?: string,
  evidenceDraft?: EvidenceDraft,
): string {
  const record = records[card.id];
  const state = stateFor(card, records);
  const collectorNumber = String(card.number).padStart(2, "0");

  if (state === "undiscovered") {
    const territoryName = card.territory.charAt(0).toUpperCase() + card.territory.slice(1);
    const symbol = territories.find((item) => item.territory === card.territory)?.symbol;

    return `<article class="deck-card-back deck-card-back--${card.territory}" data-card-id="${card.id}" data-state="undiscovered" aria-label="${territoryName} ${collectorNumber} of 52, undiscovered card">
      <span class="deck-card-back__territory">${territoryName}</span>
      <span class="deck-card-back__sigil" aria-hidden="true">${symbol}</span>
      <span class="deck-card-back__number">${collectorNumber}<span aria-hidden="true">/52</span></span>
      <span class="deck-card-back__state">Undiscovered</span>
    </article>`;
  }

  const evidenceControls = state === "drawn"
    ? `<button class="evidence-entry__open" type="button" data-action="open-evidence" data-card-id="${card.id}">Deposit my Proof of Life</button>${evidenceCardId === card.id ? renderEvidenceForm(card, evidenceError, evidenceDraft) : ""}`
    : "";

  return `<div class="deck-card-revealed" data-card-id="${card.id}" data-state="${state}">
    <p class="deck-card-revealed__state">${state === "lived" ? "Lived · in the Archive" : "Drawn"}</p>
    ${renderCardFace(card, record)}
    ${evidenceControls}
  </div>`;
}

function renderCards(
  cards: readonly Card[],
  records: DeckRecords,
  evidenceCardId?: string,
  evidenceError?: string,
  evidenceDraft?: EvidenceDraft,
): string {
  if (cards.length === 0) {
    return '<p class="deck-empty">No cards match these filters. The rest of the deck is still here when you are ready.</p>';
  }

  return cards.map((card) => renderCardTile(card, records, evidenceCardId, evidenceError, evidenceDraft)).join("");
}

function localDateValue(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return character;
    }
  });
}

function renderDrawRitual(records: DeckRecords, lastDrawnCardId?: string): string {
  const card = lastDrawnCardId ? DECK.find((item) => item.id === lastDrawnCardId) : undefined;
  const hasEligibleCard = DECK.some((item) => records[item.id]?.state !== "lived");
  const message = card
    ? `You have been dealt: ${card.name}.`
    : hasEligibleCard
      ? "The deck is ready when you are."
      : "Every adventure in this deck has been Lived.";
  const revealedCard = card
    ? `<div class="draw-reveal__face" data-draw-animation="true" role="group" tabindex="-1" aria-label="Dealt card: ${escapeHtml(card.name)}">${renderCardFace(card, records[card.id])}</div>`
    : "";

  return `<section class="draw-ritual" aria-labelledby="draw-ritual-title">
    <div class="draw-ritual__intro">
      <p class="draw-ritual__eyebrow">The deal</p>
      <h2 id="draw-ritual-title">Let the deck deal your next adventure.</h2>
      <p>A random card, not a task list. Take the invitation at your own pace.</p>
    </div>
    <button class="draw-ritual__button" type="button" data-action="draw"${hasEligibleCard ? "" : " disabled"}>Draw an adventure</button>
    <p class="draw-ritual__message" role="status" aria-live="polite">${escapeHtml(message)}</p>
    ${revealedCard ? `<div class="draw-reveal">${revealedCard}</div>` : ""}
  </section>`;
}

function renderDailyDraw(records: DeckRecords, dailyDrawCardId?: string): string {
  const card = dailyDrawCardId ? DECK.find((item) => item.id === dailyDrawCardId) : undefined;
  const hasEligibleCard = DECK.some((item) => records[item.id]?.state !== "lived");
  const message = card
    ? `Today's adventure: ${card.name}.`
    : hasEligibleCard
      ? "A date-seeded card, chosen once for today."
      : "Every adventure in this deck has been Lived.";
  const revealedCard = card
    ? `<div class="daily-draw__face" data-draw-animation="true" role="group" tabindex="-1" aria-label="Today's card: ${escapeHtml(card.name)}">${renderCardFace(card, records[card.id])}</div>`
    : "";

  return `<section class="daily-draw" aria-labelledby="daily-draw-title">
    <div class="daily-draw__intro">
      <p class="daily-draw__eyebrow">The card of the day</p>
      <h2 id="daily-draw-title">One adventure, chosen for today.</h2>
      <p>The date decides the card. Once revealed, today's deal stays yours across reloads.</p>
    </div>
    <button class="daily-draw__button" type="button" data-action="daily-draw"${card || !hasEligibleCard ? " disabled" : ""}>${card ? "Today's card is revealed" : "Reveal today's adventure"}</button>
    <p class="daily-draw__message" role="status" aria-live="polite">${escapeHtml(message)}</p>
    ${revealedCard ? `<div class="daily-draw__reveal">${revealedCard}</div>` : ""}
  </section>`;
}

function resultSummary(visible: number, lived: number): string {
  const cardWord = visible === 1 ? "card" : "cards";
  return `Showing ${visible} ${cardWord}. ${lived} of ${DECK.length} cards lived.`;
}

function renderTerritoryOptions(selected: DeckTerritoryFilter): string {
  return [
    `<option value="all"${selected === "all" ? " selected" : ""}>All territories</option>`,
    ...territories.map(({ territory }) => {
      const name = territory.charAt(0).toUpperCase() + territory.slice(1);
      return `<option value="${territory}"${selected === territory ? " selected" : ""}>${name}</option>`;
    }),
  ].join("");
}

function renderStateOptions(selected: DeckStateFilter): string {
  const options: { value: DeckStateFilter; label: string }[] = [
    { value: "all", label: "All states" },
    { value: "undiscovered", label: "Undiscovered" },
    { value: "drawn", label: "Drawn" },
    { value: "lived", label: "Lived" },
  ];

  return options.map(({ value, label }) =>
    `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`,
  ).join("");
}

/** Render the home-screen deck; absent records intentionally remain face-down. */
export function renderDeckView(
  records: DeckRecords = {},
  filters: DeckFilters = DEFAULT_FILTERS,
  lastDrawnCardId?: string,
  dailyDrawCardId?: string,
  evidenceCardId?: string,
  evidenceError?: string,
  evidenceMessage?: string,
  evidenceDraft?: EvidenceDraft,
): string {
  const livedCount = DECK.filter((card) => stateFor(card, records) === "lived").length;
  const visibleCards = filterDeck(DECK, records, filters);

  return `${renderDailyDraw(records, dailyDrawCardId)}
  ${renderDrawRitual(records, lastDrawnCardId)}
  <section class="deck-view" aria-labelledby="deck-title">
    <div class="deck-view__heading">
      <div>
        <p class="deck-view__eyebrow">The deck</p>
        <h2 id="deck-title">Your next adventure is in here.</h2>
        <p class="deck-view__description">A card is an invitation, not an obligation. The evidence is the life that happens along the way.</p>
      </div>
      <p class="deck-view__lived-count" aria-label="${livedCount} of ${DECK.length} cards lived"><span>${livedCount}</span> / ${DECK.length}<small>lived</small></p>
    </div>
    <div class="deck-controls" role="group" aria-label="Filter the deck">
      <label for="deck-filter-territory">Territory
        <select id="deck-filter-territory" name="territory">${renderTerritoryOptions(filters.territory)}</select>
      </label>
      <label for="deck-filter-state">State
        <select id="deck-filter-state" name="state">${renderStateOptions(filters.state)}</select>
      </label>
    </div>
     <p class="deck-results" id="deck-result-summary" aria-live="polite">${resultSummary(visibleCards.length, livedCount)}</p>
     ${evidenceMessage ? `<p class="evidence-entry__success" role="status" tabindex="-1">${escapeHtml(evidenceMessage)}</p>` : ""}
     <div class="deck-grid" id="deck-grid" aria-label="Adventure cards">${renderCards(visibleCards, records, evidenceCardId, evidenceError, evidenceDraft)}</div>
  </section>`;
}

function territoryFilter(value: string): DeckTerritoryFilter {
  return value === "all" || territories.some((item) => item.territory === value)
    ? value as DeckTerritoryFilter
    : "all";
}

function stateFilter(value: string): DeckStateFilter {
  return value === "all" || value === "undiscovered" || value === "drawn" || value === "lived"
    ? value
    : "all";
}

/** Mount a responsive, accessible deck and update only its results when filters change. */
export function mountDeckView(
  container: HTMLElement,
  store: DeckStore = createDeckStore(browserDeckStorage()),
): void {
  let filters = { ...DEFAULT_FILTERS };
  let lastDrawnCardId: string | undefined;
  let dailyDrawCardId = store.getDailyDraw()?.id;
  let evidenceCardId: string | undefined;
  let evidenceError: string | undefined;
  let evidenceMessage: string | undefined;
  let evidenceDraft: EvidenceDraft | undefined;
  let evidenceDraftFile: File | undefined;
  const render = (): void => {
    dailyDrawCardId = store.getDailyDraw()?.id;
    container.innerHTML = renderDeckView(
      store.getRecords(), filters, lastDrawnCardId, dailyDrawCardId, evidenceCardId, evidenceError, evidenceMessage, evidenceDraft,
    );
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

    if (target.closest('[data-action="daily-draw"]')) {
      const card = store.drawDaily();
      if (!card) return;
      render();
      container.querySelector<HTMLElement>(".daily-draw__face")?.focus();
      return;
    }
    const openEvidenceButton = target.closest<HTMLButtonElement>('[data-action="open-evidence"]');
    if (openEvidenceButton) {
      evidenceCardId = openEvidenceButton.dataset.cardId;
      evidenceError = undefined;
      evidenceMessage = undefined;
      evidenceDraft = undefined;
      evidenceDraftFile = undefined;
      render();
      container.querySelector<HTMLInputElement>(`#evidence-form-${evidenceCardId}-date`)?.focus();
      return;
    }
    if (target.closest('[data-action="cancel-evidence"]')) {
      evidenceCardId = undefined;
      evidenceError = undefined;
      evidenceDraft = undefined;
      evidenceDraftFile = undefined;
      render();
      return;
    }
    if (!target.closest('[data-action="draw"]')) return;

    const card = store.draw();
    if (!card) return;
    lastDrawnCardId = card.id;
    render();
    container.querySelector<HTMLElement>(".draw-reveal__face")?.focus();
  });

  container.addEventListener("change", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;

    if (target.name === "territory") filters = { ...filters, territory: territoryFilter(target.value) };
    else if (target.name === "state") filters = { ...filters, state: stateFilter(target.value) };
    else return;

    const records = store.getRecords();
    const cards = filterDeck(DECK, records, filters);
    const grid = container.querySelector<HTMLElement>("#deck-grid");
    const summary = container.querySelector<HTMLElement>("#deck-result-summary");
    if (grid) grid.innerHTML = renderCards(cards, records, evidenceCardId, evidenceError, evidenceDraft);
    if (summary) {
      const livedCount = DECK.filter((card) => stateFor(card, records) === "lived").length;
      summary.textContent = resultSummary(cards.length, livedCount);
    }
  });

  container.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || !target.matches("[data-evidence-form]")) return;
    event.preventDefault();
    const dateInput = target.elements.namedItem("date");
    const noteInput = target.elements.namedItem("note");
    const artifactInput = target.elements.namedItem("artifact");
    if (!(dateInput instanceof HTMLInputElement) || !(noteInput instanceof HTMLTextAreaElement)
      || !(artifactInput instanceof HTMLInputElement)) return;

    const cardId = target.dataset.evidenceForm;
    if (!cardId || !target.reportValidity()) return;
    const file = artifactInput.files?.[0] ?? evidenceDraftFile;
    evidenceDraft = {
      date: dateInput.value,
      note: noteInput.value,
      ...(file ? { fileName: file.name } : {}),
    };
    evidenceDraftFile = file;
    target.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = true; });
    void (async () => {
      try {
        let evidence: Evidence = { date: dateInput.value, note: noteInput.value };
        if (file) {
          if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) {
            throw new Error("Choose a PNG, JPEG, WebP, or GIF image.");
          }
          if (file.size <= 0 || file.size > MAX_ARTIFACT_BYTES) {
            throw new Error(`Choose an image no larger than ${Math.floor(MAX_ARTIFACT_BYTES / 1024)} KiB.`);
          }
          const artifact = await readArtifact(file);
          evidence = { ...evidence, artifact };
        }
        if (!isValidEvidence(evidence)) {
          throw new Error("Enter a valid date and a note describing the evidence of this adventure.");
        }
        if (!store.submitEvidence(cardId, evidence)) {
          throw new Error("This card could not be saved in this browser. Your card remains Drawn; free storage space and try again.");
        }
        const card = DECK.find((item) => item.id === cardId);
        evidenceCardId = undefined;
        evidenceError = undefined;
        evidenceMessage = card ? `${card.name} is now Lived. Your evidence is in the Archive.` : "Your evidence is in the Archive.";
        evidenceDraft = undefined;
        evidenceDraftFile = undefined;
        render();
        container.querySelector<HTMLElement>(".evidence-entry__success")?.focus();
      } catch (error) {
        evidenceError = error instanceof Error ? error.message : "The artifact could not be read. Try another image.";
        render();
        container.querySelector<HTMLElement>(`#evidence-form-${cardId}-title`)?.focus();
      }
    })();
  });
}

function readArtifact(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The selected image could not be read."));
    }, { once: true });
    reader.addEventListener("error", () => reject(new Error("The selected image could not be read.")), { once: true });
    reader.addEventListener("abort", () => reject(new Error("Reading the selected image was cancelled.")), { once: true });
    reader.readAsDataURL(file);
  });
}
