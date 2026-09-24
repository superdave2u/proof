/**
 * generate-card-art.ts — offline card-art generation.
 *
 * WHY this exists: the app has no backend (SPEC §9), so card art is authored
 * offline and committed as base64 PNGs. This script composes the canonical prompt
 * per card (src/data/cardArt.ts), calls an image API, and writes one lazy-loadable
 * JSON artifact per card. Without a key it writes the prompts only, so the imagery
 * canon is reviewable without spending a generation.
 *
 *   npm run art:prompts                 # every prompt, no key needed
 *   npm run art:generate                # uses OpenRouter env/.env/opencode auth credentials
 *   npm run art:test                    # one card (pleasure-01) as a smoke test
 *   npm run art:generate -- --card=pleasure-01
 *   npm run art:optimize                # normalize previously generated JSON artifacts
 *
 * Default provider is OpenRouter's Image API (POST /api/v1/images) with
 * `google/gemini-3.1-flash-lite-image`. Set IMAGE_PROVIDER=openai to use the
 * OpenAI-compatible /images/generations endpoint instead.
 *
 * Env: IMAGE_PROVIDER, IMAGE_API_KEY | OPENROUTER_API_KEY | OPENAI_API_KEY,
 *      IMAGE_API_URL, IMAGE_MODEL, IMAGE_SIZE.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DECK } from "../src/data/cards";
import { readOpenRouterApiKey } from "./openrouterAuth";
import { buildCardArtPrompt, cardArtAlt } from "../src/data/cardArt";
import { normalizeCardPng, normalizeProviderImage, pngDimensions } from "./cardImageOutput";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const OUT_DIR = join(ROOT, "src", "data", "generated", "card-images");

/**
 * Load repo `.env` defaults the way ralph.sh does, without a dependency: real
 * environment variables always win, and a missing file is not an error.
 */
function loadDotEnv(): void {
  try {
    const text = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const name = match[1]!;
      if (process.env[name] !== undefined) continue;
      process.env[name] = match[2]!.replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env — rely on the ambient environment.
  }
}

type Provider = "openrouter" | "openai";

interface ProviderConfig {
  provider: Provider;
  apiUrl: string;
  model: string;
  apiKey: string | undefined;
}

interface GeneratedArtifact {
  dataUrl: string;
  alt: string;
  prompt: string;
  model: string;
  size: string;
  generatedAt: string;
}

interface ImageApiResponse {
  data?: Array<{ b64_json?: string; media_type?: string }>;
}

function argValue(flag: string): string | undefined {
  const prefix = `${flag}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function savedOpenRouterApiKey(): string | undefined {
  const dataHome = process.env.XDG_DATA_HOME ?? join(process.env.HOME ?? "", ".local", "share");
  try {
    return readOpenRouterApiKey(readFileSync(join(dataHome, "opencode", "auth.json"), "utf8"));
  } catch {
    return undefined;
  }
}

function resolveConfig(): ProviderConfig {
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
  const openRouterApiKey = process.env.IMAGE_API_KEY ?? process.env.OPENROUTER_API_KEY ?? savedOpenRouterApiKey();
  const requested = process.env.IMAGE_PROVIDER?.toLowerCase();
  const provider: Provider = requested === "openai" || requested === "openrouter"
    ? requested
    : hasOpenAiKey && !process.env.OPENROUTER_API_KEY
      ? "openai"
      : "openrouter";

  if (provider === "openai") {
    return {
      provider,
      apiUrl: process.env.IMAGE_API_URL ?? "https://api.openai.com/v1/images/generations",
      model: process.env.IMAGE_MODEL ?? "gpt-image-1",
      apiKey: process.env.IMAGE_API_KEY ?? process.env.OPENAI_API_KEY,
    };
  }
  return {
    provider,
    apiUrl: process.env.IMAGE_API_URL ?? "https://openrouter.ai/api/v1/images",
    model: process.env.IMAGE_MODEL ?? "google/gemini-3.1-flash-lite-image",
    apiKey: openRouterApiKey,
  };
}

function buildPayload(config: ProviderConfig, prompt: string): Record<string, unknown> {
  if (config.provider === "openai") {
    return {
      model: config.model,
      prompt,
      size: process.env.IMAGE_SIZE ?? "1536x1024",
      n: 1,
      response_format: "b64_json",
    };
  }
  // The output ratio is requested inside the prompt text itself; no provider
  // parameter is sent, because some image models reject or ignore it.
  return {
    model: config.model,
    prompt,
    n: 1,
    output_format: "png",
  };
}

async function requestImage(config: ProviderConfig, payload: Record<string, unknown>): Promise<ImageApiResponse> {
  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`image API ${response.status}: ${await response.text()}`);
  return (await response.json()) as ImageApiResponse;
}

async function optimizeExisting(cardId?: string): Promise<void> {
  const files = (await readdir(OUT_DIR)).filter((file) => file.endsWith(".json")
    && (!cardId || file === `${cardId}.json`));
  if (cardId && files.length === 0) throw new Error(`No generated artifact found for --card=${cardId}`);
  for (const file of files) {
    const path = join(OUT_DIR, file);
    const artifact = JSON.parse(await readFile(path, "utf8")) as GeneratedArtifact;
    const prefix = "data:image/png;base64,";
    if (!artifact.dataUrl.startsWith(prefix)) throw new Error(`${file}: expected a base64 PNG data URL`);
    const source = Buffer.from(artifact.dataUrl.slice(prefix.length), "base64");
    const normalized = await normalizeCardPng(source);
    artifact.dataUrl = `${prefix}${normalized.toString("base64")}`;
    artifact.size = pngDimensions(normalized) ?? "unknown";
    await writeFile(path, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    console.log(`[optimized] ${file} → ${artifact.size} (${Math.round(normalized.length / 1024)} KiB PNG)`);
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  const dryRun = process.argv.includes("--dry-run");
  const optimize = process.argv.includes("--optimize");
  const cardId = argValue("--card");
  if (optimize) {
    await optimizeExisting(cardId);
    return;
  }
  const config = resolveConfig();
  const cards = cardId ? DECK.filter((card) => card.id === cardId) : DECK;

  if (cards.length === 0) throw new Error(`No card matches --card=${cardId}`);

  await mkdir(OUT_DIR, { recursive: true });

  for (const card of cards) {
    const prompt = buildCardArtPrompt(card);
    if (dryRun || !config.apiKey) {
      await writeFile(join(OUT_DIR, `${card.id}.prompt.txt`), `${prompt}\n`, "utf8");
      console.log(`[prompt] ${card.id}`);
      continue;
    }

    const payload = buildPayload(config, prompt);
    const result = await requestImage(config, payload);
    const first = result.data?.[0];
    if (!first?.b64_json) throw new Error(`${card.id}: image API returned no b64_json payload`);

    const normalized = await normalizeProviderImage(
      { bytes: Buffer.from(first.b64_json, "base64"), media_type: first.media_type },
      card.id,
    );
    const artifact: GeneratedArtifact = {
      dataUrl: `data:image/png;base64,${normalized.toString("base64")}`,
      alt: cardArtAlt(card),
      prompt,
      model: config.model,
      size: pngDimensions(normalized) ?? "unknown",
      generatedAt: new Date().toISOString(),
    };
    await writeFile(join(OUT_DIR, `${card.id}.json`), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    console.log(`[image] ${card.id} (${config.provider}/${config.model})`);
  }

  if (!config.apiKey && !dryRun) {
    console.warn(
      `No API key set for ${config.provider} — wrote prompts only. Set ${
        config.provider === "openrouter" ? "OPENROUTER_API_KEY" : "OPENAI_API_KEY"
      } to generate PNGs.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
