# ART-DIRECTION.md — the watercolor canon

**The imagery standard for every card.** This file is the source of truth for how card
art is imagined, generated, colored, and delivered. It is consumed by
`src/data/cardArt.ts` (prompt + palette), `scripts/generate-card-art.ts` (generation),
and the card face (caption over image). `SPEC.md` wins any tie.

## 1. What we are making

One illustration per card: a **4:3 landscape watercolor** of the scene in the card's
authored `Art direction`, painted through the card's **flavor** and **intention**,
starring a single recurring heroine. The image must feel like a page torn from the same
traveler's sketchbook in every card — same woman, same wardrobe, same hand.

The heroine **inhabits** the scene; she never performs the quest. As with the authored
art direction (SPEC §3), we show the world the adventure happens _inside_, not a tick-box
of its completion.

## 2. The figure — the Wayfarer (figure bible, frozen)

Every prompt carries this paragraph verbatim so the character survives scene to scene:

> **The Wayfarer** — a feminine adventurer archetype, late thirties to mid-fourties,
> warm medium-light skin, shoulder-length wavy auburn hair
> loosely tied back with a few escaped strands, soft jaw, calm and observant expression.
> She is shown in three-quarter view or from behind and never stares into the camera.
> Her constant signature wardrobe: a loose **mustard-ochre wool field coat** worn open
> over rolled sleeves, a **faded crimson scarf**, dark charcoal canvas trousers, scuffed
> brown leather boots, and a **weathered leather satchel with a brass buckle**. A
> wide-brim felt hat is optional. She is the same woman in every card — same face, same
> build, same satchel — only her posture, distance, and the light around her change.

**Consistency levers** (in priority order):

1. The figure paragraph above is prepended to every prompt, unchanged.
2. The ochre coat + faded crimson scarf are the **palette anchors**: they appear in
   every card, tinted by the territory light but never recolored or restyled.
3. The same generation model, style block, aspect ratio, and (where supported) a fixed
   seed per territory.
4. Reject any generation that changes her apparent age, hair color, skin tone, build,
   or the coat/scarf/satchel. Regenerate rather than "fixing in words."

## 3. Territory palettes (tonal range)

Every illustration is painted **within one territory's tonal range**, derived from the
CSS tokens in `DESIGN.md` §1. The Wayfarer's anchors (ochre, faded crimson) stay in every
palette; the territory light washes over them.

| Territory  | Anchor (token) | Primary wash          | Secondary / accent         | Shadow                    | Highlight                 | Light / energy          |
| ---------- | -------------- | --------------------- | -------------------------- | ------------------------- | ------------------------- | ----------------------- |
| Pleasure   | `#c81e4f`      | crimson, rose         | amber candlelight, blush   | deep maroon `#4a0f24`     | warm ivory `#ffe3d0`      | low, warm, intimate     |
| Curiosity  | `#1e4fc8`      | cobalt, cyan          | midnight indigo, slate     | near-black blue `#101b3f` | lamplight `#f0c874`       | cool, clear, electric   |
| Beauty     | `#c9a227`      | gold, honey           | rose-gold, warm ivory      | umber `#4a3616`           | pale parchment `#f6ecd6`  | golden hour, generous   |
| Connection | `#1e8a5a`      | emerald, moss         | teal, warm pine            | deep pine `#123a2c`       | soft cream `#f2ead6`      | grounded, enveloping    |
| Wonder     | `#7a3fc9`      | violet, indigo        | lavender, twilight magenta | deep aubergine `#2a1d3f`  | silver-blue `#dbe3ff`     | vast, luminous, hushed  |
| Wild       | prismatic      | all anchors refracted | iridescent spectral        | near-black `#0b0b10`      | white-hot speck `#ffffff` | legendary / mythic foil |

Rules:

- **70 / 20 / 10** by area: roughly 70% territory wash, 20% secondary, 10% highlight/shadow.
- Highlights stay **soft and bloomed**, never white-clipped; shadows stay **colored and
  transparent**, never flat black (except the Wild/mythic ground).
- Gold and violet are the two most abused territories — keep them **desaturated toward
  their shadow** so the card stays legible and calm, matching the app's WCAG pairing.
- The figure is never the brightest object; the scene's light source is.

## 4. Technique and composition

- **Technique**: an unmistakably loose, hand-painted watercolor painting — airy wet-on-
  wet washes, diluted pigment pooling and bleeding into cold-press paper, soft granulation,
  pale underpainting showing through, irregular blooms and water edges, and broad brush
  marks that merge into one another. Let contours dissolve; leave some edges unfinished
  and some forms suggested rather than described. The scene should feel atmospheric,
  fragile, and made by a human hand, with the pigment and paper doing as much storytelling
  as the objects. Use at most a faint graphite underdrawing; no ink contouring, no hard
  outlines, no cell shading, no polished digital illustration, and no glossy rendering.
- **Aspect**: 4:3 landscape, generous negative space. The Wayfarer is mid-ground,
  small-to-medium (~1/5 to 1/3 of frame height), never dominating.
- **Frame**: no text, lettering, captions, borders, frames, signatures, watermarks, or
  logos. The app draws the caption; the painting carries none.
- **Motion**: allow one quiet impossible detail from the art direction (a floating book,
  slow-falling crumbs) — the "almost magical realism" of the deck.
- **Never**: photorealistic, 3D/CGI, anime, graphic-novel or comic-book rendering,
  crisp digital painting, cel shading, hard contour lines, vector flatness, posterized
  color blocks, neon oversaturation, a crowd of extra characters, direct eye contact,
  or the heroine completing the quest literally.

## 5. Prompt recipe (deterministic)

`src/data/cardArt.ts` composes the prompt from the card, in this fixed order:

1. **Style block** — technique sentence above.
2. **Recurring heroine** — the figure bible (§2), verbatim.
3. **Territory** — name, energy, and the palette (§3).
4. **Scene** — the card's frozen `art` string, verbatim.
5. **Mood and intention** — the card's frozen `flavor`, verbatim.
6. **Aspect** — `4:3 landscape`.
7. **Avoid** — the negative list in §4.

The recipe is pure and deterministic: same card in, same prompt out. The generator adds
the provider's model/size/seed parameters; those never change the authored prompt text.

## 6. Generation standard

- **Format**: PNG, base64 data URL (`data:image/png;base64,...`). No JPEG.
- **Dimensions**: stored output is always **800×600 (4:3)**. The default provider is
  OpenRouter's Image API (`POST https://openrouter.ai/api/v1/images`) with
  `inclusionai/ming-image-0.1-design`; it returns a **1024×1024 square** and ignores
  `aspect_ratio`. The generator therefore center-crops to 4:3 and resizes to 800×600
  before storage. Keep the heroine and key scene details within the central crop-safe
  4:3 area. The metadata records pixel dimensions read from the normalized PNG header,
  never a claim.
- **Optimization**: `sharp` re-encodes the normalized image as a high-compression
  palette PNG. Output size varies with scene detail; target ≤512 KiB per PNG so every
  lazy image chunk stays practical. Visually inspect every approved image after
  crop/quantization.
- **Regeneration of existing art**: `npm run art:optimize` reprocesses generated JSON
  artifacts locally without making a paid API call; `-- --card=<id>` limits it to one.
- **Output**: one JSON artifact per card at
  `src/data/generated/card-images/<card-id>.json`:
  `{ dataUrl, alt, prompt, model, size, generatedAt }`.
- **Command**: `npm run art:prompts` (dry run — writes prompts, needs no key),
  `npm run art:test` (one-card smoke test), and `npm run art:generate` (one or all
  cards; default OpenRouter model). `-- --card=<id>` selects one card. The API key
  is read from the environment, repo `.env`, or the local opencode OpenRouter auth
  store; it is never printed. `npm run art:loop` runs `ralph-art.sh`, which invokes
  Ralph with `PROMPT-ART.md`, OpenRouter, and one card per iteration. Set
  `IMAGE_PROVIDER=openai` only to use the OpenAI-compatible endpoint.
- **Determinism**: prompts are stable; images are re-rollable until they pass
  §2–§4. Commit approved images so the deployed build carries them.

## 7. Delivery contract (how art reaches the card)

- The card face renders a `<figure class="card-art">` with a **caption**, a **dark mask**,
  and an image element that starts **without `src`** and with `loading="lazy"`.
- On reveal (the daily flip) or when scrolled into view, the loader reads the card's
  base64 PNG from the lazily imported registry and assigns `src`; the territory
  atmosphere pattern underneath is the graceful fallback until then and if art is absent.
- The **flavor text is the caption** pinned to the image's foot, sitting over a
  translucent **black gradient mask** between the text and the painting, so it stays
  readable on any watercolor.
- Art is decorative-but-authored: the image exposes its description via `alt` only once
  loaded; the caption is the accessible text. Reduced-motion disables the fade-in.
