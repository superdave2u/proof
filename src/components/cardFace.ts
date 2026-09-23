import { territories, type Card } from "../data/cards";
import { isValidArtifactDataUrl, type Evidence } from "../state/evidence";

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

/** Render a complete, self-contained card face. All authored card text is escaped before entering HTML. */
export function renderCardFace(card: Card, record?: CardFaceRecord, options?: CardFaceOptions): string {
  const territoryMeta = territories.find((territory) => territory.territory === card.territory);
  if (!territoryMeta) throw new Error(`Missing territory metadata for ${card.territory}.`);

  const territoryName = card.territory.charAt(0).toUpperCase() + card.territory.slice(1);
  const symbol = territoryMeta.symbol;
  const isWild = card.territory === "wild";
  const quest = card.quest.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  const proof = card.proof.split("\n").map(escapeHtml).join("<br>");
  const ability = card.ability
    ? `<aside class="card-ability"><h3>Special Ability <span>✦</span></h3><p><strong>${escapeHtml(card.ability.name)}</strong> — ${escapeHtml(card.ability.text)}</p></aside>`
    : "";
  const ariaLabel = `${territoryName} card ${String(card.number).padStart(2, "0")} of 52, ${rarityLabel(card.rarity)}: ${card.name}`;
  const wildClass = isWild ? ` card-face--${card.rarity}` : "";
  // Preview faces stop at the flavor window; the full anatomy lives on the detail page.
  const details = options?.preview
    ? ""
    : `<section class="card-section card-section--quest"><h3>Quest</h3><ol>${quest}</ol></section>
      <section class="card-section card-section--proof"><h3>Proof of Life</h3><p>${proof}</p></section>
      ${ability}
      <p class="card-face__reward"><span>Reward</span> ${escapeHtml(card.reward)}</p>
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
      <figure class="card-atmosphere card-atmosphere--${card.territory}">
        <span class="card-atmosphere__sigil" aria-hidden="true">${symbol}</span>
        <blockquote class="card-atmosphere__flavor">“${escapeHtml(card.flavor)}”</blockquote>
      </figure>
      ${details}
    </div>
  </article>`;
}
