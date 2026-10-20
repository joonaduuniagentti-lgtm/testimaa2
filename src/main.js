import { advanceMonths, advanceMonth } from "./simulation.js";
import {
  beginExpedition, buildBuilding, buildColonyShip, buildFleet, colonizeSystem,
  moveFleet, proposeTreaty, resolveEvent, sendEnvoy, setPolicy, startResearch
} from "./actions.js";
import { createGame, getSystem, isValidSeed } from "./world.js";
import { loadGame, parseSave, saveGame, exportSave, readStoredSaveText, preserveRecoverySave, readRecoverySave } from "./storage.js";
import { mountGalaxyMap } from "./galaxy-map.js";
import { renderApp } from "./view.js";

const app = document.querySelector("#app");
let storage = null;
try { storage = globalThis.localStorage; } catch (error) { /* The status panel will report unavailable storage. */ }
const storedSave = readStoredSaveText(storage);
const loadedGame = loadGame(storage);
const corruptSaveText = storedSave.ok && storedSave.text !== null && !loadedGame ? storedSave.text : null;
const recoveryWrite = corruptSaveText !== null ? preserveRecoverySave(corruptSaveText, storage) : null;
let recoveryText = corruptSaveText ?? readRecoverySave(storage);
let recoveryExported = false;
let game = loadedGame || createGame();
let toastTimer;
let persistenceState = {
  status: "unknown",
  savedTurn: loadedGame ? loadedGame.turn : null,
  message: "",
  recoveryAvailable: recoveryText !== null
};

function persist() {
  if (corruptSaveText !== null && !recoveryWrite?.ok && !recoveryExported) {
    persistenceState = {
      ...persistenceState,
      status: "error",
      message: "Virheellistä aiempaa tallennusta ei ole vielä saatu palautuskopioon. Vie palautuskopio ennen tallennuksen jatkamista."
    };
    return { ok: false, reason: persistenceState.message };
  }
  const result = saveGame(game, storage);
  if (result.ok) {
    persistenceState = { status: "saved", savedTurn: game.turn, message: "", recoveryAvailable: recoveryText !== null };
  } else {
    persistenceState = { ...persistenceState, status: "error", message: result.reason };
  }
  if (!result.ok) game.ui.toast = result.reason;
  return result;
}

if (corruptSaveText !== null && recoveryWrite?.ok) {
  persistenceState.recoveryAvailable = true;
  persistenceState = { ...persistenceState, status: "unknown" };
}
if (corruptSaveText !== null && !recoveryWrite?.ok) {
  persistenceState.status = "error";
  persistenceState.message = recoveryWrite?.reason || "Virheellinen tallennus löytyi, mutta sen palautuskopiota ei voitu vahvistaa.";
  game.ui.toast = "Vanha tallennus on virheellinen. Vie palautuskopio kronikasta ennen kuin jatkat pelaamista.";
} else {
  persist();
  if (corruptSaveText !== null) game.ui.toast = "Vanha tallennus oli virheellinen. Se säilytettiin palautuskopiona; voit viedä kopion kronikasta.";
}

const transientSelections = new Map();
let focusDescriptor = null;

function controlKey(element) {
  return [element.dataset.field || "", element.dataset.fleet || "", element.dataset.action || "", element.dataset.id || ""].join("|");
}

function captureControls() {
  app.querySelectorAll("select[data-field]").forEach((select) => {
    transientSelections.set(controlKey(select), select.value);
  });
  const active = document.activeElement;
  if (active && app.contains(active) && [...active.attributes].some((attribute) => attribute.name.startsWith("data-"))) {
    focusDescriptor = [...active.attributes]
      .filter((attribute) => attribute.name.startsWith("data-"))
      .map((attribute) => [attribute.name, attribute.value]);
  } else {
    focusDescriptor = null;
  }
}

function render() {
  captureControls();
  app.innerHTML = renderApp(game, persistenceState);
  app.querySelectorAll("select[data-field]").forEach((select) => {
    const savedValue = transientSelections.get(controlKey(select));
    if (savedValue !== undefined && [...select.options].some((option) => option.value === savedValue)) select.value = savedValue;
  });
  if (focusDescriptor) {
    const match = [...app.querySelectorAll("*")].find((element) => focusDescriptor.every(([name, value]) => element.getAttribute(name) === value));
    if (match && !match.disabled) match.focus({ preventScroll: true });
  }
  app.querySelectorAll("[data-map-root]").forEach((root) => {
    mountGalaxyMap(root, game, (systemId, viaKeyboard) => {
      game.ui.selectedSystemId = systemId;
      persist();
      render();
      if (viaKeyboard) {
        const panel = app.querySelector(".selected-system-panel");
        const action = panel?.querySelector('[data-action]:not([disabled])');
        (action || panel?.querySelector("h2"))?.focus();
      }
    }, persist);
  });
}

function notify(message) {
  game.ui.toast = message;
  persist();
  render();
  scheduleToastDismissal();
}

function scheduleToastDismissal() {
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    game.ui.toast = "";
    app.querySelector(".toast-message")?.remove();
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
  if (!isValidSeed(seed)) return notify("Siemen saa sisältää enintään 128 merkkiä. Nykyinen galaksi säilyi.");
  try {
    game = createGame(seed);
  } catch (error) {
    return notify("Galaksia ei voitu luoda. Tarkista siemenen pituus.");
  }
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

function downloadRecoverySave() {
  const data = recoveryText ?? readRecoverySave(storage);
  if (data === null) return notify("Palautuskopiota ei löytynyt selaimen muistista.");
  const blob = new Blob([data], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kantama-palautuskopio.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  recoveryExported = true;
  persistenceState.recoveryAvailable = true;
  notify("Aiempi tallennus vietiin palautuskopioksi.");
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
  if (action === "export-recovery") return downloadRecoverySave();
  if (action === "save") {
    const result = persist();
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
if (game.ui.toast) scheduleToastDismissal();

