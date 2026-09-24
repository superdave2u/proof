import { territories, type Card, type Territory } from "./cards";

/**
 * cardArt.ts — the imagery canon as data.
 *
 * WHY this exists: SPEC §3.1 requires every card to resolve a deterministic art
 * prompt from its frozen flavor and art-direction strings, its territory, and a
 * single fixed heroine, so 52 cards painted by a model still read as one deck.
 * The figure bible and territory palettes live in specs/art/ART-DIRECTION.md;
 * this module is their executable form. It is pure (no IO, no randomness) so the
 * prompt for any card is reproducible and testable.
 */

export interface ArtPalette {
  /** Territory CSS token the tonal range is derived from. */
  anchor: string;
  primary: string;
  secondary: string;
  shadow: string;
  highlight: string;
  /** How the territory light behaves. */
  light: string;
  /** One compact phrase injected into the generation prompt. */
  description: string;
}

export const FIGURE_BIBLE =
  "The Wayfarer — a feminine adventurer archetype, late twenties to mid-thirties, " +
  "warm medium-light skin lightly freckled by weather, shoulder-length wavy auburn hair " +
  "loosely tied back with a few escaped strands, soft jaw, calm and observant expression. " +
  "She is shown in three-quarter view or from behind and never stares into the camera. " +
  "Her constant signature wardrobe: a loose mustard-ochre wool field coat worn open over " +
  "rolled sleeves, a faded crimson scarf, dark charcoal canvas trousers, scuffed brown " +
  "leather boots, and a weathered leather satchel with a brass buckle. A wide-brim felt " +
  "hat is optional. She is the same woman in every card — same face, same build, same " +
  "satchel — only her posture, distance, and the light around her change.";

export const ART_STYLE =
  "An unmistakably loose, hand-painted watercolor painting, atmospheric and fragile, " +
  "with airy wet-on-wet washes, diluted pigment pooling and bleeding into cold-press " +
  "paper, soft granulation, pale underpainting showing through, irregular water blooms, " +
  "and broad brush marks merging into one another. Let contours dissolve; leave some " +
  "edges unfinished and forms suggested rather than crisply described. Let pigment and " +
  "paper carry the storytelling. At most a faint graphite underdrawing; no ink contouring, " +
  "no hard outlines, no cell shading, no polished digital illustration, no glossy rendering.";

export const ART_NEGATIVE_PROMPT =
  "photorealistic, 3D render, CGI, anime, graphic novel, comic book, crisp digital painting, " +
  "cel shading, hard contour lines, heavy ink outlines, vector flatness, posterized color " +
  "blocks, neon oversaturation, text, lettering, captions, watermarks, logos, signatures, " +
  "borders, frames, collage, a crowd of extra characters, direct eye contact with the camera, " +
  "the heroine completing the quest literally";

export const ART_ASPECT = "4:3 landscape";

export const ART_PALETTES: Record<Territory, ArtPalette> = {
  pleasure: {
    anchor: "#c81e4f",
    primary: "crimson and rose",
    secondary: "amber candlelight and blush",
    shadow: "deep transparent maroon (#4a0f24)",
    highlight: "warm ivory (#ffe3d0)",
    light: "low, warm, and intimate",
    description:
      "crimson and rose washes with amber candlelight, blush highlights, and deep translucent maroon shadows; the light is low, warm, and intimate",
  },
  curiosity: {
    anchor: "#1e4fc8",
    primary: "cobalt and cyan",
    secondary: "midnight indigo and slate",
    shadow: "near-black blue (#101b3f)",
    highlight: "lamplight gold (#f0c874)",
    light: "cool, clear, and electric",
    description:
      "cobalt and cyan washes with midnight indigo and slate, lamplight-gold accents, and near-black blue shadows; the light is cool, clear, and electric",
  },
  beauty: {
    anchor: "#c9a227",
    primary: "gold and honey",
    secondary: "rose-gold and warm ivory",
    shadow: "umber (#4a3616)",
    highlight: "pale parchment (#f6ecd6)",
    light: "golden hour, generous",
    description:
      "gold and honey washes with rose-gold and warm ivory, pale parchment highlights, and umber shadows; the light is golden hour and generous",
  },
  connection: {
    anchor: "#1e8a5a",
    primary: "emerald and moss",
    secondary: "teal and warm pine",
    shadow: "deep pine (#123a2c)",
    highlight: "soft cream (#f2ead6)",
    light: "grounded and enveloping",
    description:
      "emerald and moss washes with teal and warm pine, soft cream highlights, and deep pine shadows; the light is grounded and enveloping",
  },
  wonder: {
    anchor: "#7a3fc9",
    primary: "violet and indigo",
    secondary: "lavender and twilight magenta",
    shadow: "deep aubergine (#2a1d3f)",
    highlight: "silver-blue (#dbe3ff)",
    light: "vast, luminous, hushed",
    description:
      "violet and indigo washes with lavender and twilight magenta, silver-blue highlights, and deep aubergine shadows; the light is vast, luminous, and hushed",
  },
  wild: {
    anchor: "#b8a4ee",
    primary: "prismatic, all territory hues refracted",
    secondary: "iridescent spectral shifts",
    shadow: "near-black (#0b0b10)",
    highlight: "white-hot speck (#ffffff)",
    light: "legendary or mythic foil",
    description:
      "a prismatic range refracting every territory hue, iridescent spectral shifts, a near-black ground, and a white-hot highlight; the treatment is legendary or mythic foil",
  },
};

function territoryEnergy(territory: Territory): string {
  return territories.find((meta) => meta.territory === territory)?.energy ?? "Prismatic";
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Compose the deterministic generation prompt for one card (ART-DIRECTION.md §5).
 * Order is fixed: style, heroine, territory, scene, mood, aspect, avoid. The
 * frozen scene and flavor strings are included verbatim and never rewritten.
 */
export function buildCardArtPrompt(card: Card): string {
  const palette = ART_PALETTES[card.territory];
  return [
    ART_STYLE,
    `Recurring heroine: ${FIGURE_BIBLE}`,
    `Territory: ${titleCase(card.territory)} — ${territoryEnergy(card.territory)}. Palette: ${palette.description}.`,
    `Scene: ${card.art}`,
    `Mood and intention (from the card's flavor): ${card.flavor}`,
    `Aspect: ${ART_ASPECT}.`,
    `Avoid: ${ART_NEGATIVE_PROMPT}.`,
  ].join(" ");
}

/** The description an image exposes to assistive tech once loaded. */
export function cardArtAlt(card: Card): string {
  return `Watercolor illustration for ${card.name}: ${card.art}`;
}
