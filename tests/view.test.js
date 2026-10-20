import test from "node:test";
import assert from "node:assert/strict";
import { SCREEN_DEFS } from "../src/data.js";
import { beginExpedition, shortestRoute } from "../src/actions.js";
import { mountGalaxyMap, renderMapNode } from "../src/galaxy-map.js";
import { renderApp } from "../src/view.js";
import { createGame, getSystem } from "../src/world.js";

function mapRootMock(rect = { left: 0, top: 0, width: 1100, height: 760 }) {
  const listeners = new Map();
  const attributes = {};
  const content = { setAttribute(name, value) { attributes[name] = value; } };
  const scale = Math.min(rect.width / 1100, rect.height / 760);
  const offsetX = rect.left + (rect.width - 1100 * scale) / 2;
  const offsetY = rect.top + (rect.height - 760 * scale) / 2;
  const svg = {
    addEventListener(name, listener) { listeners.set(name, listener); },
    getBoundingClientRect() { return rect; },
    getScreenCTM() { return { inverse: () => ({ a: 1 / scale, d: 1 / scale, e: -offsetX / scale, f: -offsetY / scale }) }; },
    createSVGPoint() {
      return {
        x: 0, y: 0,
        matrixTransform(matrix) { return { x: this.x * matrix.a + matrix.e, y: this.y * matrix.d + matrix.f }; }
      };
    },
    setPointerCapture() {}
  };
  return {
    listeners,
    attributes,
    innerHTML: "",
    querySelector(selector) { return selector === "svg" ? svg : content; },
    querySelectorAll() { return []; }
  };
}
test("all seven command-center screens render their own navigation state", () => {
  const game = createGame("render-test");
  for (const screen of SCREEN_DEFS) {
    game.ui.screen = screen.id;
    const html = renderApp(game);
    assert.match(html, /class="app-shell"/);
    assert.match(html, new RegExp("data-screen=\"" + screen.id + "\"[^>]*aria-current=\"page\""));
    assert.doesNotMatch(html, /\$\{\{|¤\{/);
  }
});

test("event and victory overlays pause behind a clear decision state", () => {
  const game = createGame("overlay-test");
  game.event = { id: "drift-capsule", turn: 3 };
  assert.match(renderApp(game), /Aikakapseli hiljaisella radalla/);
  game.event = null;
  game.victory = { id: "knowledge", title: "Valmis", detail: "Valtion tarina.", turn: 12, year: 2249, month: 1 };
  assert.match(renderApp(game), /Valmis/);
  game.ui.dismissedVictory = true;
  assert.doesNotMatch(renderApp(game), /modal-scrim/);
});

test("save handling and system names are represented in the rendered controls", () => {
  const game = createGame("controls-test");
  game.ui.screen = "chronicle";
  const html = renderApp(game);
  assert.match(html, /data-action="export"/);
  assert.match(html, /data-field="import-save"/);
  game.ui.screen = "galaxy";
  const target = game.systems.find((system) => system.discovered && !system.owner && system.habitability >= .4);
  assert.ok(target);
  game.ui.selectedSystemId = target.id;
  assert.match(renderApp(game), /data-map-root/);
  assert.match(renderApp(game), /Perusta siirtokunta/);
});

test("unknown systems are keyboard selectable without revealing their names", () => {
  const game = createGame("keyboard-exploration-test");
  const target = game.systems.find((system) => !system.discovered);
  assert.ok(target);

  const node = renderMapNode(game, target);
  assert.match(node, /tabindex="0" role="button"/);
  assert.match(node, new RegExp(`aria-label="Tuntematon järjestelmä, kohde ${target.number}"`));
  assert.doesNotMatch(node, new RegExp(target.name));

  game.ui.screen = "galaxy";
  game.ui.selectedSystemId = target.id;
  const html = renderApp(game);
  assert.match(html, new RegExp(`Tuntematon järjestelmä · kohde ${target.number}`));
  assert.match(html, /data-action="expedition"/);
  assert.doesNotMatch(html, new RegExp(target.name));
});

test("fleet screens show remaining travel time after survey research", () => {
  const game = createGame("fleet-eta-view-test");
  const scout = game.player.fleets.find((fleet) => fleet.role === "survey");
  const target = game.systems.filter((system) => !system.discovered)
    .map((system) => ({ system, route: shortestRoute(game, scout.systemId, system.id) }))
    .find(({ route }) => route?.length >= 3);
  assert.ok(target);

  game.player.technologies.push("survey-lattices");
  assert.equal(beginExpedition(game, target.system.id).ok, true);
  game.ui.screen = "fleets";
  const eta = Math.ceil(target.route.length / 2);
  assert.match(renderApp(game), new RegExp(`<small>${eta} kk</small>`));
});

test("event overlay gives the player a resolution when every paid choice is unaffordable", () => {
  const game = createGame("event-fallback-view-test");
  game.event = { id: "quiet-strike", turn: game.turn };
  game.player.resources.credits = 10;
  const html = renderApp(game);
  assert.match(html, /data-id="emergency-resolution"/);
  assert.match(html, /Kriisipäätös: lykkää hanketta/);
  assert.match(html, /class="event-choices">[\s\S]*data-id="emergency-resolution"[\s\S]*<\/div><div class="event-footnote">/);
});

test("building and colonization previews show current prices and next-level output", () => {
  const game = createGame("economy-preview-test");
  game.player.technologies.push("orbital-foundries", "closed-ecologies", "colony-charters");
  game.ui.screen = "colonies";
  const colonies = renderApp(game);
  assert.match(colonies, /\+5,4 KRD\/kk/);
  assert.match(colonies, /Seuraava taso: \+7,0 RAV\/kk/);

  game.player.technologies.push("modular-hulls");
  const upgradedPrices = renderApp(game);
  assert.match(upgradedPrices, /54 KRD · 30 SEK/);
  assert.match(upgradedPrices, /42 KRD · 24 SEK/);

  const free = game.systems.find((system) => system.discovered && !system.owner && system.habitability >= .4);
  assert.ok(free);
  game.ui.screen = "galaxy";
  game.ui.selectedSystemId = free.id;
  assert.match(renderApp(game), /38 KRD · 28 SEK · 8 POL/);
});

test("diplomacy shows current costs and sustained alliance progress", () => {
  const game = createGame("diplomacy-preview-test");
  game.ui.screen = "diplomacy";
  game.player.accordProgress = 3;
  const html = renderApp(game);
  assert.match(html, /Lähetä lähetystö <span>10 VAI<\/span>/);
  assert.match(html, /Kauppasopimus <span>24 KRD · 14 VAI<\/span>/);
  assert.match(html, /Tutkimusliitto <span>20 KRD · 22 VAI<\/span>/);
  assert.match(html, /ka\. [^<]*\/40 · luottamus 0\/12 kk/);

  const ready = createGame("diplomacy-progress-preview-test");
  ready.ui.screen = "diplomacy";
  ready.player.treaties = ready.factions.slice(0, 3).map((faction, index) => ({ factionId: faction.id, type: index === 0 ? "research" : "trade", remaining: 6 }));
  Object.keys(ready.player.relations).forEach((id) => { ready.player.relations[id] = 50; });
  ready.player.accordProgress = 3;
  assert.match(renderApp(ready), /luottamus 3\/12 kk/);
});

test("fleet screen explains which frontier garrisons face pressure", () => {
  const game = createGame("frontier-forecast-view-test");
  const home = game.systems.find((system) => system.owner === "player");
  const neighbor = getSystem(game, home.neighbors[0]);
  const vesper = game.factions.find((faction) => faction.id === "vesper");
  if (neighbor.owner && neighbor.owner !== vesper.id) game.factionWorlds[neighbor.owner] = game.factionWorlds[neighbor.owner].filter((id) => id !== neighbor.id);
  neighbor.owner = vesper.id;
  neighbor.colony = true;
  neighbor.buildings = { farm: 1 };
  if (!game.factionWorlds[vesper.id].includes(neighbor.id)) game.factionWorlds[vesper.id].push(neighbor.id);
  game.player.relations.vesper = -40;
  game.ui.screen = "fleets";

  const html = renderApp(game);
  assert.match(html, /RAJATILANNE \/ VESPER/);
  assert.match(html, /Puolustusarvo = paikallaan olevien puolustuslaivueiden voima/);
  assert.match(html, /Rajamaailmoja/);
});

test("map zoom survives a view rerender", () => {
  const game = createGame("map-view-persistence-test");
  const first = mapRootMock();
  mountGalaxyMap(first, game, () => {});
  first.listeners.get("wheel")({ preventDefault() {}, deltaY: -40, clientX: 550, clientY: 380 });
  assert.ok(game.ui.mapView.width < 1100);
  const savedTransform = first.attributes.transform;

  const second = mapRootMock();
  mountGalaxyMap(second, game, () => {});
  assert.equal(second.attributes.transform, savedTransform);
});

test("map zoom keeps the cursor anchor in place with a letterboxed SVG", () => {
  const game = createGame("map-letterbox-anchor-test");
  const rect = { left: 20, top: 10, width: 1440, height: 500 };
  const root = mapRootMock(rect);
  const point = { x: 210, y: 300 };
  const scale = Math.min(rect.width / 1100, rect.height / 760);
  const offsetX = rect.left + (rect.width - 1100 * scale) / 2;
  const offsetY = rect.top + (rect.height - 760 * scale) / 2;
  mountGalaxyMap(root, game, () => {});
  root.listeners.get("wheel")({
    preventDefault() {}, deltaY: -40,
    clientX: offsetX + point.x * scale,
    clientY: offsetY + point.y * scale
  });

  const [, translateX, translateY, scaleX, scaleY] = root.attributes.transform.match(/translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+) ([-\d.]+)\)/);
  const viewX = -Number(translateX) / Number(scaleX);
  const viewY = -Number(translateY) / Number(scaleY);
  assert.ok(Math.abs(viewX - point.x * 0.16) < 1e-8);
  assert.ok(Math.abs(viewY - point.y * 0.16) < 1e-8);
});

test("fleet routes hide names until the destination is discovered", () => {
  const game = createGame("hidden-route-destination-test");
  const target = game.systems.find((system) => !system.discovered);
  const scout = game.player.fleets.find((fleet) => fleet.role === "survey");
  scout.path = [target.id];
  scout.destination = target.id;
  game.ui.screen = "fleets";
  const html = renderApp(game);
  assert.match(html, new RegExp(`Tuntematon kohde ${target.number}`));
  assert.doesNotMatch(html, new RegExp(target.name));
});

test("faction colors come from trusted game definitions, not imported save data", () => {
  const game = createGame("faction-color-render-test");
  game.factions[0].color = '#fff" onerror="alert(1)';
  game.ui.screen = "diplomacy";
  const html = renderApp(game);
  assert.doesNotMatch(html, /onerror=/);
  assert.match(html, /--faction:#f0b785/);
});

test("colony food warning uses the forecast, not the last clamped monthly delta", () => {
  const game = createGame("food-forecast-color-test");
  const home = game.systems.find((system) => system.owner === "player");
  home.population = 22;
  home.buildings.farm = 0;
  game.player.resources.food = 0;
  game.player.net.food = 0;
  game.ui.screen = "colonies";
  const html = renderApp(game);
  assert.match(html, /Ruokatasapaino<\/span><b class="text-danger">−/);
});

test("habitat preview reports the real relative growth increase at each level", () => {
  const game = createGame("habitat-relative-growth-test");
  const home = game.systems.find((system) => system.owner === "player");
  home.buildings.habitat = 1;
  game.ui.screen = "colonies";
  assert.match(renderApp(game), /väestönkasvu \+13,8%/);
});

test("save status and recovery options remain visible in the chronicle", () => {
  const game = createGame("storage-status-view-test");
  game.ui.screen = "chronicle";
  const html = renderApp(game, { status: "error", savedTurn: 7, message: "kvota täynnä", recoveryAvailable: true });
  assert.match(html, /TALLENNUS EI TOIMI/);
  assert.match(html, /Viimeisin onnistunut vuoro: 7/);
  assert.match(html, /data-action="export-recovery"/);
  assert.match(html, /Palautuskopio säilyttää aiemman tallennuksen/);
});

