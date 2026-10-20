import test from "node:test";
import assert from "node:assert/strict";
import { SCREEN_DEFS } from "../src/data.js";
import { beginExpedition, shortestRoute } from "../src/actions.js";
import { mountGalaxyMap, renderMapNode } from "../src/galaxy-map.js";
import { renderApp } from "../src/view.js";
import { createGame, getSystem } from "../src/world.js";

function mapRootMock() {
  const listeners = new Map();
  const attributes = {};
  const content = { setAttribute(name, value) { attributes[name] = value; } };
  const svg = {
    addEventListener(name, listener) { listeners.set(name, listener); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1100, height: 760 }; },
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
  assert.match(html, /ka\. [^<]*\/40 · luottamus 0\/6 kk/);

  const ready = createGame("diplomacy-progress-preview-test");
  ready.ui.screen = "diplomacy";
  ready.player.treaties = ready.factions.slice(0, 3).map((faction, index) => ({ factionId: faction.id, type: index === 0 ? "research" : "trade", remaining: 6 }));
  Object.keys(ready.player.relations).forEach((id) => { ready.player.relations[id] = 50; });
  ready.player.accordProgress = 3;
  assert.match(renderApp(ready), /luottamus 3\/6 kk/);
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
