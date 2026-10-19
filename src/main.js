import { advanceMonths, advanceMonth } from "./simulation.js";
import {
  beginExpedition, buildBuilding, buildColonyShip, buildFleet, colonizeSystem,
  moveFleet, proposeTreaty, resolveEvent, sendEnvoy, setPolicy, startResearch
} from "./actions.js";
import { createGame, getSystem } from "./world.js";
import { loadGame, parseSave, saveGame, exportSave } from "./storage.js";
import { mountGalaxyMap } from "./galaxy-map.js";
import { renderApp } from "./view.js";

const app = document.querySelector("#app");
let game = loadGame() || createGame();
let toastTimer;
saveGame(game);

function persist() {
  const result = saveGame(game);
  if (!result.ok) game.ui.toast = result.reason;
}

function render() {
  app.innerHTML = renderApp(game);
  app.querySelectorAll("[data-map-root]").forEach((root) => {
    mountGalaxyMap(root, game, (systemId, viaKeyboard) => {
      game.ui.selectedSystemId = systemId;
      render();
      if (viaKeyboard) {
        const panel = app.querySelector(".selected-system-panel");
        const action = panel?.querySelector('[data-action]:not([disabled])');
        (action || panel?.querySelector("h2"))?.focus();
      }
    });
  });
}

function notify(message) {
  game.ui.toast = message;
  persist();
  render();
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    game.ui.toast = "";
    render();
  }, 3200);
}

function resultToast(result) {
  notify(result.message);
}

function createFreshGame() {
  const confirmed = window.confirm("Aloitetaanko uusi galaksi? Nykyinen automaattitallennus korvataan.");
  if (!confirmed) return;
  const entered = window.prompt("Anna galaksin siemen. Jätä tyhjäksi satunnaista galaksia varten.", "");
  if (entered === null) return;
  const seed = entered.trim() || "KANTAMA-" + new Date().toISOString().replace(/[-:.TZ]/g, "");
  game = createGame(seed);
  persist();
  render();
  notify("Uusi galaksi luotiin siemenellä " + seed + ".");
}

function downloadSave() {
  const data = exportSave(game);
  const blob = new Blob([data], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kantama-" + game.seed.toLowerCase().replace(/[^a-z0-9-]+/g, "-") + ".json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  notify("Tallennus vietiin JSON-tiedostoon.");
}

async function importSave(input) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    const parsed = parseSave(await file.text());
    if (!parsed.ok) {
      notify("Tallennuksen tuonti epäonnistui: " + parsed.reason);
      return;
    }
    if (!window.confirm("Tuodaanko tallennus? Tämä korvaa nykyisen galaksin tässä selaimessa.")) return;
    game = parsed.game;
    game.ui.toast = "";
    persist();
    render();
    notify("Tallennus ladattiin. Galaksi jatkuu kuukaudesta " + game.turn + ".");
  } catch (error) {
    notify("Tallennustiedostoa ei voitu lukea.");
  }
}

function runAction(button) {
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === "advance") {
    const results = advanceMonths(game, Number(button.dataset.count) || 1);
    persist();
    render();
    if (!results.length && game.event) return;
    if (!results.length && game.gameOver) return notify("Voitto on jo saavutettu. Kronikka tallentaa lopputuloksen.");
    if (!results.length) return notify("Vuoroa ei voitu siirtää.");
    return notify("Aika eteni " + results.length + " kuukauden" + (results.length === 1 ? "" : " verran") + ".");
  }
  if (action === "expedition") return resultToast(beginExpedition(game, id));
  if (action === "colonize") return resultToast(colonizeSystem(game, id));
  if (action === "build") return resultToast(buildBuilding(game, id, button.dataset.building));
  if (action === "build-fleet") return resultToast(buildFleet(game, id));
  if (action === "build-ship") return resultToast(buildColonyShip(game, id));
  if (action === "research") return resultToast(startResearch(game, id));
  if (action === "policy") return resultToast(setPolicy(game, id));
  if (action === "envoy") return resultToast(sendEnvoy(game, id));
  if (action === "treaty") return resultToast(proposeTreaty(game, id, button.dataset.treaty));
  if (action === "event-choice") return resultToast(resolveEvent(game, id));
  if (action === "move-fleet") {
    const target = app.querySelector('[data-field="fleet-target"][data-fleet="' + CSS.escape(id) + '"]')?.value;
    if (!target) return notify("Valitse ensin laivueen määränpää.");
    return resultToast(moveFleet(game, id, target));
  }
  if (action === "build-new-fleet" || action === "build-new-ship") {
    const yard = app.querySelector('[data-field="shipyard"]')?.value;
    if (!yard) return notify("Valitse ensin telakkamaailma.");
    return resultToast(action === "build-new-fleet" ? buildFleet(game, yard) : buildColonyShip(game, yard));
  }
  if (action === "export") return downloadSave();
  if (action === "save") {
    const result = saveGame(game);
    return notify(result.ok ? "Galaksi tallennettiin tähän selaimeen." : result.reason);
  }
  if (action === "new-game") return createFreshGame();
  if (action === "dismiss-victory") {
    game.ui.dismissedVictory = true;
    game.ui.screen = "chronicle";
    persist();
    return render();
  }
}

app.addEventListener("click", (event) => {
  const screenControl = event.target.closest("[data-screen]");
  if (screenControl) {
    event.preventDefault();
    game.ui.screen = screenControl.dataset.screen;
    if (screenControl.dataset.selectSystem) game.ui.selectedSystemId = screenControl.dataset.selectSystem;
    persist();
    render();
    return;
  }
  const selectControl = event.target.closest("[data-select-system]");
  if (selectControl) {
    if (selectControl.dataset.screen) game.ui.screen = selectControl.dataset.screen;
    game.ui.selectedSystemId = selectControl.dataset.selectSystem;
    persist();
    render();
    return;
  }
  const button = event.target.closest("[data-action]");
  if (button && !button.disabled) runAction(button);
});

app.addEventListener("change", (event) => {
  const input = event.target.closest('[data-field="import-save"]');
  if (input) importSave(input);
});

render();
