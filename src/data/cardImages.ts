/**
 * cardImages.ts — the lazy, base64-PNG art registry.
 *
 * WHY this exists: SPEC §3.1 says art is delivered as base64 PNG and scored
 * lazily, never eagerly. Each generated artifact is a separate JSON module, so
 * `import.meta.glob` lets the browser fetch (and parse) one card's bytes only
 * when that card is flipped or scrolled into view. The loader is built around an
 * injected module map so its contract can be tested with fakes instead of a
 * browser or the filesystem.
 */

export type CardImageLoader = (cardId: string) => Promise<string | undefined>;

export interface CardImageSource {
  load(cardId: string): Promise<string | undefined>;
}

type ImageModule = () => Promise<unknown>;
type ImageModuleMap = Record<string, ImageModule>;

const PNG_DATA_URL_PREFIX = "data:image/png;base64,";

function isPngDataUrl(value: unknown): value is string {
  return typeof value === "string"
    && value.startsWith(PNG_DATA_URL_PREFIX)
    && value.length > PNG_DATA_URL_PREFIX.length;
}

/** Read the `dataUrl` out of a generated artifact module. Anything else is absent, never fatal. */
export function createCardImageLoader(modules: ImageModuleMap): CardImageSource {
  return {
    async load(cardId: string): Promise<string | undefined> {
      const loadModule = modules[`./generated/card-images/${cardId}.json`];
      if (!loadModule) return undefined;
      try {
        const loaded = (await loadModule()) as { default?: { dataUrl?: unknown } } | undefined;
        const dataUrl = loaded?.default?.dataUrl;
        return isPngDataUrl(dataUrl) ? dataUrl : undefined;
      } catch {
        // A corrupt or missing artifact must degrade to the atmosphere fallback,
        // never break the card face.
        return undefined;
      }
    },
  };
}

const generatedModules = import.meta.glob("./generated/card-images/*.json") as ImageModuleMap;
const generatedSource = createCardImageLoader(generatedModules);

let activeSource: CardImageSource = generatedSource;

/** Swap the art source (tests inject a fake; the app uses the generated registry). */
export function setCardImageSource(source: CardImageSource): void {
  activeSource = source;
}

export function resetCardImageSource(): void {
  activeSource = generatedSource;
}

export function loadCardImage(cardId: string): Promise<string | undefined> {
  return activeSource.load(cardId);
}
