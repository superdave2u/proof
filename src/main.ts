import { describeApp } from "./app";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `<h1>${describeApp()}</h1>`;
}