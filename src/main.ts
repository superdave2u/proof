import { describeApp } from "./app";
import { DECK } from "./data/cards";
import { renderCardFace } from "./components/cardFace";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  const featuredCard = DECK[0];
  if (!featuredCard) throw new Error("The Proof of Life deck must contain its featured card.");

  app.innerHTML = `<main class="app-shell">
    <header class="app-intro">
      <p class="app-intro__eyebrow">A collectible adventure game</p>
      <h1>Proof of Life</h1>
      <p class="app-intro__copy">${describeApp()}. A pristine deck holds the life you could live; each card is an invitation to bring back evidence of the life that happened.</p>
    </header>
    <section class="featured-card" aria-label="Featured adventure">${renderCardFace(featuredCard)}</section>
  </main>`;
}
