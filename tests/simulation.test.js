import test from "node:test";
import assert from "node:assert/strict";
import { BUILDINGS, EVENTS, TECHS } from "../src/data.js";
import { beginExpedition, buildBuilding, eventChoiceAvailable, resolveEvent, shortestRoute, startResearch } from "../src/actions.js";
import { advanceMonth, evaluateVictory } from "../src/simulation.js";
import { createGame, generateGalaxy, getSystem, ownedSystems } from "../src/world.js";
import { exportSave, parseSave, saveGame, loadGame, validateSave } from "../src/storage.js";

function resolvePendingEvent(game) {
  if (!game.event) return;
  const event = EVENTS.find((item) => item.id === game.event.id);
  const choice = event.choices.find((item) => eventChoiceAvailable(game, item));
  assert.ok(choice, "at least one event choice should be affordable");
  assert.equal(resolveEvent(game, choice.id).ok, true);
}

function tick(game, count) {
  for (let i = 0; i < count; i += 1) {
    const result = advanceMonth(game);
    if (!result.advanced) break;
    resolvePendingEvent(game);
    if (game.gameOver) break;
  }
}

function connectedCount(systems, startId) {
  const seen = new Set([startId]);
  const queue = [startId];
  while (queue.length) {
    const currentId = queue.shift();
    const current = systems.find((system) => system.id === currentId);
    for (const id of current.neighbors) {
      if (!seen.has(id)) { seen.add(id); queue.push(id); }
    }
  }
  return seen.size;
}

test("same seed creates a unique, connected 42-system galaxy", () => {
  const first = generateGalaxy("test-seed-42");
  const second = generateGalaxy("test-seed-42");
  assert.deepEqual(first, second);
  assert.equal(first.systems.length, 42);
  assert.equal(new Set(first.systems.map((system) => system.id)).size, 42);
  assert.equal(new Set(first.systems.map((system) => system.name)).size, 42);
  assert.equal(connectedCount(first.systems, "sys-01"), 42);
  assert.ok(first.systems.every((system) => system.neighbors.length > 0));
  assert.equal(first.systems.filter((system) => system.owner === "player").length, 1);
  assert.equal(Object.keys(first.factionWorlds).length, 4);
  for (const [factionId, systemIds] of Object.entries(first.factionWorlds)) {
    assert.ok(systemIds.every((id) => first.systems.find((system) => system.id === id)?.owner === factionId));
  }
  for (let index = 0; index < 16; index += 1) {
    const galaxy = generateGalaxy("seed-sweep-" + index);
    const ownership = galaxy.systems.filter((system) => system.owner && system.owner !== "player");
    assert.equal(ownership.length, new Set(ownership.map((system) => system.id)).size);
    assert.ok(ownership.every((system) => galaxy.factionWorlds[system.owner].includes(system.id)));
  }
});

test("routes only cross discovered systems before the undiscovered destination", () => {
  const game = createGame("route-test");
  const target = game.systems.find((system) => !system.discovered);
  assert.ok(target);
  const route = shortestRoute(game, "sys-01", target.id);
  assert.ok(route?.length);
  assert.equal(route.at(-1), target.id);
  assert.ok(route.slice(0, -1).every((id) => getSystem(game, id).discovered));
  assert.equal(beginExpedition(game, target.id).ok, true);
  const scout = game.player.fleets.find((fleet) => fleet.role === "survey");
  assert.equal(scout.destination, target.id);
  assert.equal(scout.path.at(-1), target.id);
});

test("a rejected construction leaves the state untouched", () => {
  const game = createGame("cost-test");
  const before = structuredClone(game);
  game.player.resources.credits = 0;
  game.player.resources.alloys = 0;
  const expected = structuredClone(game);
  const home = ownedSystems(game)[0];
  const lab = BUILDINGS.find((building) => building.id === "lab");
  const result = buildBuilding(game, home.id, lab.id);
  assert.equal(result.ok, false);
  assert.deepEqual(game, expected);
  assert.notDeepEqual(game, before);
});

test("research advances month by month and unlocks its prerequisite chain", () => {
  const game = createGame("research-test");
  assert.equal(startResearch(game, "survey-lattices").ok, true);
  tick(game, 15);
  assert.ok(game.player.technologies.includes("survey-lattices"));
  assert.equal(game.player.researchId, null);
  const next = TECHS.find((tech) => tech.id === "adaptive-maps");
  assert.equal(startResearch(game, next.id).ok, true);
  assert.equal(game.player.researchProgressById["survey-lattices"], TECHS.find((tech) => tech.id === "survey-lattices").cost);
  assert.equal(game.player.researchProgress, 0);
});

test("survey lattices let a research fleet cross two known route steps per month", () => {
  const game = createGame("survey-lattice-test");
  const target = game.systems.find((system) => !system.discovered);
  assert.equal(beginExpedition(game, target.id).ok, true);
  const scout = game.player.fleets.find((fleet) => fleet.role === "survey");
  const before = scout.path.length;
  game.player.technologies.push("survey-lattices");
  advanceMonth(game);
  assert.equal(scout.path.length, Math.max(0, before - 2));
});

test("survey fleet follows its route, discovers the destination, and history is deterministic", () => {
  const a = createGame("journey-2248");
  const b = createGame("journey-2248");
  const destination = a.systems.find((system) => !system.discovered);
  assert.equal(beginExpedition(a, destination.id).ok, true);
  assert.equal(beginExpedition(b, destination.id).ok, true);
  tick(a, 10);
  tick(b, 10);
  assert.equal(getSystem(a, destination.id).discovered, true);
  assert.deepEqual(a.history, b.history);
  assert.deepEqual(a.player.resources, b.player.resources);
  assert.deepEqual(a.factions.map((faction) => faction.power), b.factions.map((faction) => faction.power));
});

test("the first twelve months produce a deterministic history", () => {
  const run = () => {
    const game = createGame("twelve-month-acceptance");
    tick(game, 12);
    return game;
  };
  const first = run();
  const second = run();

  assert.equal(first.turn, 12);
  assert.equal(first.history.length, 13);
  assert.deepEqual(first.history, second.history);
  assert.deepEqual(first.log, second.log);
  assert.deepEqual(first.player.resources, second.player.resources);
  assert.deepEqual(first.factions, second.factions);
});

test("the rare signal resolves once and becomes a permanent relic", () => {
  const game = createGame("surprise-test");
  const relicSite = game.systems.find((system) => system.anomaly === "Kantaman muistijälki");
  assert.ok(relicSite && !relicSite.discovered);
  const scout = game.player.fleets.find((fleet) => fleet.role === "survey");
  const route = shortestRoute(game, scout.systemId, relicSite.id);
  assert.ok(route?.length);
  assert.equal(beginExpedition(game, relicSite.id).ok, true);
  tick(game, route.length + 1);
  assert.equal(relicSite.discovered, true);
  assert.deepEqual(game.player.relics, ["kantama-echo"]);
  assert.ok(game.log.some((entry) => entry.title === "Harvinainen löytö: Kantaman muistijälki"));
});

test("save export, import, and browser storage round-trip the complete state", () => {
  const game = createGame("archive-test");
  tick(game, 4);
  const exported = exportSave(game);
  const imported = parseSave(exported);
  assert.equal(imported.ok, true);
  assert.deepEqual(imported.game, game);
  assert.equal(validateSave(imported.game).ok, true);
  assert.equal(parseSave("{broken").ok, false);
  const memory = new Map();
  const storage = { setItem(key, value) { memory.set(key, value); }, getItem(key) { return memory.get(key) ?? null; } };
  assert.equal(saveGame(game, storage).ok, true);
  assert.deepEqual(loadGame(storage), game);
  const corrupted = structuredClone(game);
  corrupted.player.resources.credits = -1;
  assert.equal(validateSave(corrupted).ok, false);
  const brokenRoute = structuredClone(game);
  brokenRoute.systems[0].neighbors.pop();
  assert.equal(validateSave(brokenRoute).ok, false);
});

test("each victory route is derived from actual state", () => {
  const knowledge = createGame("victory-knowledge");
  knowledge.player.technologies = TECHS.slice(0, 8).map((tech) => tech.id);
  assert.equal(evaluateVictory(knowledge).id, "knowledge");

  const accord = createGame("victory-accord");
  accord.player.treaties = accord.factions.slice(0, 3).map((faction) => ({ factionId: faction.id, type: "trade", remaining: 10 }));
  assert.equal(evaluateVictory(accord).id, "accord");

  const frontier = createGame("victory-frontier");
  for (const system of frontier.systems.filter((item) => !item.owner).slice(0, 7)) {
    system.owner = "player";
    system.colony = true;
    system.population = 1;
  }
  assert.equal(ownedSystems(frontier).length, 8);
  assert.equal(evaluateVictory(frontier).id, "frontier");
});
