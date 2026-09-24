import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCardArtPrompt } from "../src/data/cardArt";
import { DECK } from "../src/data/cards";
import { normalizeCardPng, pngDimensions } from "./cardImageOutput";
import { readOpenRouterApiKey } from "./openrouterAuth";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const OUT_FILE = join(ROOT, "specs", "art", "taste-test.htm");

/**
 * Three least expensive image-output models on OpenRouter (pricing.image_output,
 * USD), as returned by GET /api/v1/models. Their per-generation cost is captured
 * from each response's `usage`; a 52-card projection multiplies that figure.
 */
const MODELS = [
  { id: "openai/gpt-5-image-mini", label: "OpenAI: GPT-5 Image Mini" },
  { id: "google/gemini-3.1-flash-lite-image", label: "Google: Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)" },
  { id: "google/gemini-2.5-flash-image", label: "Google: Nano Banana (Gemini 2.5 Flash Image)" },
];

const CARD = DECK.find((card) => card.id === "pleasure-01")!;

interface Generated {
  modelId: string;
  label: string;
  dataUrl: string;
  size: string;
  bytes: number;
  costUsd?: number;
  costBasis: string;
  error?: string;
}

function apiKey(): string | undefined {
  const dataHome = process.env.XDG_DATA_HOME ?? join(process.env.HOME ?? "", ".local", "share");
  try {
    return readOpenRouterApiKey(readFileSync(join(dataHome, "opencode", "auth.json"), "utf8"));
  } catch {
    return undefined;
  }
}

function usd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(2)}`;
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

async function generate(
  key: string,
  model: { id: string; label: string },
  prompt: string,
): Promise<Generated> {
  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: model.id, prompt, n: 1, output_format: "png" }),
  });
  const rawText = await response.text();
  if (!response.ok) {
    return { modelId: model.id, label: model.label, dataUrl: "", size: "", bytes: 0, costBasis: "", error: `HTTP ${response.status}: ${rawText.slice(0, 300)}` };
  }

  const payload = JSON.parse(rawText) as {
    data?: Array<{ b64_json?: string }>;
    usage?: { cost?: number };
  };
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) {
    return { modelId: model.id, label: model.label, dataUrl: "", size: "", bytes: 0, costBasis: "", error: "response carried no b64_json image" };
  }

  const normalized = await normalizeCardPng(Buffer.from(b64, "base64"));
  const cost = typeof payload.usage?.cost === "number" ? payload.usage.cost : undefined;
  return {
    modelId: model.id,
    label: model.label,
    dataUrl: `data:image/png;base64,${Buffer.from(normalized).toString("base64")}`,
    size: pngDimensions(normalized) ?? "unknown",
    bytes: normalized.length,
    ...(cost !== undefined ? { costUsd: cost } : {}),
    costBasis: cost !== undefined ? "reported by API" : "unavailable",
  };
}

function renderPanel(result: Generated): string {
  if (result.error) {
    return `<article class="panel panel--error">
      <h2>${result.label}</h2>
      <p class="model">${result.modelId}</p>
      <p class="fail">Generation failed: ${result.error}</p>
    </article>`;
  }
  const per = result.costUsd;
  const per52 = per !== undefined ? per * 52 : undefined;
  return `<article class="panel">
    <img src="${result.dataUrl}" alt="${result.label} interpretation of ${CARD.name}">
    <h2>${result.label}</h2>
    <p class="model">${result.modelId}</p>
    <dl>
      <div><dt>Cost / image</dt><dd>${per !== undefined ? usd(per) : "n/a"}</dd></div>
      <div><dt>Cost / 52 cards</dt><dd>${per52 !== undefined ? usd(per52) : "n/a"}</dd></div>
      <div><dt>Output</dt><dd>${result.size} · ${Math.round(result.bytes / 1024)} KiB</dd></div>
      <div><dt>Source</dt><dd>${result.costBasis}</dd></div>
    </dl>
  </article>`;
}

function renderTable(results: Generated[]): string {
  const rows = results.map((result) => {
    const per = result.costUsd;
    const per52 = per !== undefined ? per * 52 : undefined;
    return `<tr>
      <td>${result.label}<br><code>${result.modelId}</code></td>
      <td>${result.error ? "—" : per !== undefined ? usd(per) : "n/a"}</td>
      <td>${result.error ? "—" : per52 !== undefined ? usd(per52) : "n/a"}</td>
      <td>${result.error ? result.error : `${result.size} · ${Math.round(result.bytes / 1024)} KiB`}</td>
    </tr>`;
  }).join("");
  return `<table>
    <thead><tr><th>Model</th><th>Cost / image</th><th>Cost / 52 cards</th><th>Output</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

async function main(): Promise<void> {
  const key = process.env.OPENROUTER_API_KEY ?? process.env.IMAGE_API_KEY ?? apiKey();
  if (!key) throw new Error("No OpenRouter API key found in the environment or the local opencode auth store.");

  const prompt = buildCardArtPrompt(CARD);
  console.log(`[taste-test] card=${CARD.id} prompt=${prompt.length} chars models=${MODELS.length}`);

  const results: Generated[] = [];
  for (const model of MODELS) {
    console.log(`[taste-test] generating ${model.id} ...`);
    try {
      const result = await generate(key, model, prompt);
      results.push(result);
      if (result.error) console.log(`[taste-test]   failed: ${result.error}`);
      else console.log(`[taste-test]   ok ${result.size} ${Math.round(result.bytes / 1024)} KiB cost=${result.costUsd ?? "n/a"}`);
    } catch (error) {
      results.push({ modelId: model.id, label: model.label, dataUrl: "", size: "", bytes: 0, costBasis: "", error: error instanceof Error ? error.message : String(error) });
      console.log(`[taste-test]   threw: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proof — Image model taste test</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 2rem; background: #14131a; color: #ece6dc; font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; }
  h1 { margin: 0 0 .25rem; font-size: 1.6rem; }
  .lede { margin: 0 0 1.5rem; color: #b9b0a2; max-width: 60ch; }
  .lede code { color: #e4c987; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
  .panel { padding: 1rem; border: 1px solid #3a3742; border-radius: 14px; background: #1c1b23; }
  .panel img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; display: block; }
  .panel h2 { margin: .75rem 0 .15rem; font-size: 1rem; }
  .panel .model { margin: 0 0 .75rem; color: #8f8a98; font-family: ui-monospace, monospace; font-size: .8rem; }
  .panel dl { margin: 0; display: grid; gap: .35rem; }
  .panel dl div { display: flex; justify-content: space-between; gap: 1rem; border-top: 1px solid #2c2a33; padding-top: .35rem; }
  .panel dt { color: #b9b0a2; }
  .panel dd { margin: 0; font-variant-numeric: tabular-nums; color: #e4c987; }
  .panel--error { border-color: #6b2b3b; }
  .fail { color: #ff9db0; }
  .prompt { margin: 0 0 1.5rem; border: 1px solid #3a3742; border-radius: 12px; background: #1c1b23; overflow: hidden; }
  .prompt summary { cursor: pointer; padding: .7rem 1rem; color: #b9b0a2; font-size: .85rem; text-transform: uppercase; letter-spacing: .08em; }
  .prompt pre { margin: 0; padding: 1rem; border-top: 1px solid #2c2a33; color: #d8d2c8; white-space: pre-wrap; word-break: break-word; font: .8rem/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
  table { width: 100%; border-collapse: collapse; margin-top: .5rem; }
  th, td { text-align: left; padding: .6rem .75rem; border-bottom: 1px solid #2c2a33; vertical-align: top; }
  th { color: #b9b0a2; font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; }
  td code { color: #8f8a98; font-size: .78rem; }
</style>
</head>
<body>
  <h1>Image model taste test</h1>
  <p class="lede">Same card and prompt for all three — <code>${CARD.number.toString().padStart(2, "0")}/52 ${CARD.name}</code>, rendered by the three least expensive image-output models on OpenRouter. Cost is per the API's reported <code>usage.cost</code>; the 52-card column multiplies that single sample. Generated ${new Date().toISOString()}.</p>
  <details class="prompt" open>
    <summary>Generation prompt (identical for all three models)</summary>
    <pre>${escapeHtml(prompt)}</pre>
  </details>
  <div class="grid">${results.map(renderPanel).join("\n")}</div>
  ${renderTable(results)}
</body>
</html>
`;

  writeFileSync(OUT_FILE, html, "utf8");
  console.log(`[taste-test] wrote ${OUT_FILE}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
