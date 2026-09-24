import { territories, type Card } from "../data/cards";
import { isValidArtifactDataUrl, type Evidence } from "../state/evidence";
import { escapeHtml } from "../util/html";
import { renderCardArt } from "./cardArt";

export interface CardFaceRecord {
  state: "undiscovered" | "drawn" | "lived";
  drawnAt?: string;
  livedAt?: string;
  evidence?: Evidence;
}

export interface CardFaceOptions {
  /** Gallery preview: header, name, type line, and atmosphere/flavor only — nothing below the flavor window. */
  preview?: boolean;
}

function rarityLabel(rarity: Card["rarity"]): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function renderArtifact(artifact: string | undefined): string {
  if (!artifact || !isValidArtifactDataUrl(artifact)) {
    return "";
  }

  return `<img class="lived-artifact" src="${escapeHtml(artifact)}" alt="Evidence artifact" loading="lazy">`;
}

function renderLivedRecord(card: Card, record: CardFaceRecord | undefined): string {
  if (record?.state !== "lived" || !record.evidence) return "";

  const date = record.evidence.date || record.livedAt || "";
  const artifact = renderArtifact(record.evidence.artifact);

  return `<section class="lived-record" aria-label="Lived record">
    <p class="lived-record__stamp"><span>Entered in the Archive</span><time>${escapeHtml(date)}</time></p>
    <p class="lived-record__note">${escapeHtml(record.evidence.note)}</p>
    ${card.number === 52 ? '<p class="lived-record__vow">I WANTED THIS.<br>THAT WAS ENOUGH.</p>' : ""}
    ${artifact}
  </section>`;
}

/**
 * Render the face-down back of a card. Reveals nothing but the collector
 * number and territory — undiscovered invitations stay concealed everywhere,
 * including deep links to the detail page.
 */
export function renderCardBack(card: Card): string {
  const territoryName = card.territory.charAt(0).toUpperCase() + card.territory.slice(1);
  const symbol = territories.find((territory) => territory.territory === card.territory)?.symbol;
  const collectorNumber = String(card.number).padStart(2, "0");

  return `<article class="deck-card-back deck-card-back--${card.territory}" data-card-id="${escapeHtml(card.id)}" data-state="undiscovered" aria-label="${territoryName} ${collectorNumber} of 52, undiscovered card">
    <span class="deck-card-back__territory">${territoryName}</span>
    <span class="deck-card-back__sigil" aria-hidden="true">${symbol}</span>
    <span class="deck-card-back__number">${collectorNumber}<span aria-hidden="true">/52</span></span>
    <span class="deck-card-back__state">Undiscovered</span>
  </article>`;
}

/** Render one complete card face. All authored card text is escaped before entering HTML. */
export function renderCardFace(card: Card, record?: CardFaceRecord, options?: CardFaceOptions): string {
  const territoryMeta = territories.find((territory) => territory.territory === card.territory);
  if (!territoryMeta) throw new Error(`Missing territory metadata for ${card.territory}.`);

  const territoryName = card.territory.charAt(0).toUpperCase() + card.territory.slice(1);
  const symbol = territoryMeta.symbol;
  const isWild = card.territory === "wild";
  const quest = card.quest.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  const proof = card.proof.split("\n").map(escapeHtml).join("<br>");
  const ability = card.ability
    ? `<aside class="card-ability"><h3>Special Stretch <span>✦</span></h3><p><strong>${escapeHtml(card.ability.name)}</strong> — ${escapeHtml(card.ability.text)}</p></aside>`
    : "";
  const ariaLabel = `${territoryName} card ${String(card.number).padStart(2, "0")} of 52, ${rarityLabel(card.rarity)}: ${card.name}`;
  const wildClass = isWild ? ` card-face--${card.rarity}` : "";
  // Preview faces stop at the flavor window; the full anatomy lives on the detail page.
  const details = options?.preview
    ? ""
    : `<section class="card-section card-section--quest"><h3>Quest</h3><ol>${quest}</ol></section>
      <section class="card-section card-section--proof"><h3>Proof of Life</h3><p>${proof}</p></section>
      ${ability}
      ${renderLivedRecord(card, record)}`;

  return `<article class="card-face card-face--${card.territory}${wildClass}${options?.preview ? " card-face--preview" : ""}" aria-label="${escapeHtml(ariaLabel)}" data-card-id="${escapeHtml(card.id)}">
    <header class="card-face__header">
      <div class="card-face__collector"><span class="card-face__territory">${territoryName}</span><span aria-hidden="true">${String(card.number).padStart(2, "0")}/52</span></div>
      <span class="rarity rarity--${card.rarity}" aria-label="${rarityLabel(card.rarity)} rarity" title="${rarityLabel(card.rarity)}"><span class="rarity__gem" aria-hidden="true">◆</span><span class="rarity__name">${rarityLabel(card.rarity)}</span></span>
      <span class="card-face__sigil" aria-hidden="true">${symbol}</span>
    </header>
    <div class="card-face__body">
      <h2 class="card-face__name">${escapeHtml(card.name)}</h2>
      <p class="card-face__type">${escapeHtml(card.typeLine)}</p>
      ${renderCardArt(card)}
      ${details}
    </div>
  </article>`;
}
