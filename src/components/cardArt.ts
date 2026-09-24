import { territories, type Card } from "../data/cards";
import { cardArtAlt } from "../data/cardArt";
import { escapeHtml } from "../util/html";
import type { CardImageLoader } from "../data/cardImages";

/**
 * cardArt.ts — the 4:3 artwork panel.
 *
 * WHY this exists: SPEC §3.1 wants the flavor text to become a caption over a
 * lazily loaded base64-PNG watercolor, with a black mask between text and image,
 * while keeping the territory atmosphere as a graceful fallback. The art is not
 * part of the synchronous render: `renderCardArt` emits a src-less lazy image,
 * and `mountLazyCardArt` attaches the bytes only when a card is revealed or
 * scrolled into view. The loader is injected so the component stays decoupled
 * from the generated registry.
 */

function terrainSymbol(card: Card): string {
  return territories.find((meta) => meta.territory === card.territory)?.symbol ?? "";
}

/** Render the artwork figure for a card: lazy image, territory fallback, dark mask, flavor caption. */
export function renderCardArt(card: Card): string {
  const alt = escapeHtml(cardArtAlt(card));
  return `<figure class="card-art card-art--${card.territory}" data-card-art="${escapeHtml(card.id)}">
      <img class="card-art__image" data-art-image="${escapeHtml(card.id)}" data-art-alt="${alt}" alt="" loading="lazy" decoding="async">
      <span class="card-art__sigil" aria-hidden="true">${terrainSymbol(card)}</span>
      <span class="card-art__mask" aria-hidden="true"></span>
      <figcaption class="card-art__caption">“${escapeHtml(card.flavor)}”</figcaption>
    </figure>`;
}

/**
 * Attach generated art to every card face under `root`, now and as it appears.
 * An image loads when it intersects the viewport (or immediately where
 * IntersectionObserver is unavailable, e.g. very old browsers). A missing or
 * failed image is marked so the CSS keeps the atmosphere fallback.
 */
export function mountLazyCardArt(root: ParentNode, load: CardImageLoader): () => void {
  const pending = new Set<HTMLImageElement>();

  const observer = typeof IntersectionObserver === "undefined"
    ? undefined
    : new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) void reveal(entry.target as HTMLImageElement);
        }
      }, { rootMargin: "200px" });

  const reveal = async (image: HTMLImageElement): Promise<void> => {
    const cardId = image.dataset.artImage;
    if (!cardId) return;
    delete image.dataset.artImage;
    observer?.unobserve(image);
    const dataUrl = await load(cardId);
    // On failure the territory atmosphere underneath simply stays visible.
    if (!dataUrl) return;
    const alt = image.dataset.artAlt;
    if (alt) image.alt = alt;
    image.src = dataUrl;
    image.closest(".card-art")?.classList.add("card-art--loaded");
  };

  const register = (image: HTMLImageElement): void => {
    if (!image.dataset.artImage || pending.has(image)) return;
    pending.add(image);
    if (observer) observer.observe(image);
    else void reveal(image);
  };

  const scan = (): void => {
    root.querySelectorAll<HTMLImageElement>("img[data-art-image]").forEach(register);
  };

  const mutations = typeof MutationObserver === "undefined"
    ? undefined
    : new MutationObserver(scan);
  mutations?.observe(root as Node, { childList: true, subtree: true });
  scan();

  return () => {
    mutations?.disconnect();
    observer?.disconnect();
    pending.clear();
  };
}
