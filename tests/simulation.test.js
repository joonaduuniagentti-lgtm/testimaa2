import test from "node:test";
import assert from "node:assert/strict";
import { BUILDINGS, EVENTS, TECHS } from "../src/data.js";
import { beginExpedition, buildBuilding, envoyCost, eventChoiceAvailable, fleetTravelMonths, moveFleet, proposeTreaty, resolveEvent, sendEnvoy, shortestRoute, startResearch, treatyCost, EMERGENCY_EVENT_CHOICE_ID } from "../src/actions.js";
import { ACCORD_REQUIRED_MONTHS, advanceMonth, borderPressureReport, estimatedColonyIncome, evaluateVictory } from "../src/simulation.js";
import { createGame, generateGalaxy, getSystem, isValidSeed, ownedSystems } from "../src/world.js";
import { exportSave, parseSave, saveGame, loadGame, preserveRecoverySave, readRecoverySave, SAVE_KEY, validateSave } from "../src/storage.js";

function resolvePendingEvent(game) {
  if (!game.event) return;
  const event = EVENTS.find((item) => item.id === game.event.id);
  const choice = event.choices.find((item) => eventChoiceAvailable(game, item));
  assert.equal(resolveEvent(game, choice?.id || EMERGENCY_EVENT_CHOICE_ID).ok, true);
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

test("survey expedition estimates account for the two-step research speed", () => {
  const game = createGame("survey-lattice-eta-test");
  const scout = game.player.fleets.find((fleet) => fleet.role === "survey");
  const target = game.systems.filter((system) => !system.discovered)
    .map((system) => ({ system, route: shortestRoute(game, scout.systemId, system.id) }))
    .find(({ route }) => route?.length >= 3);
  assert.ok(target);

  game.player.technologies.push("survey-lattices");
  const result = beginExpedition(game, target.system.id);
  const eta = Math.ceil(target.route.length / 2);
  assert.equal(result.ok, true);
  assert.match(result.message, new RegExp(`Arvioitu saapuminen ${eta} kk`));
  assert.equal(fleetTravelMonths(game, scout), eta);
  assert.match(game.log[0].text, new RegExp(`Arvioitu matka: ${eta} kk`));
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

test("a food shortage at an empty storehouse lowers stability", () => {
  const game = createGame("empty-food-test");
  const home = ownedSystems(game)[0];
  game.player.resources.food = 0;
  home.population = 22;
  home.buildings.farm = 0;
  const colonyStability = home.stability;
  const nationalStability = game.player.globalStability;

  advanceMonth(game);

  assert.equal(game.player.resources.food, 0);
  assert.ok(home.stability < colonyStability);
  assert.ok(game.player.globalStability < nationalStability);
});

test("a food balance that reaches exactly zero is not a shortage", () => {
  const game = createGame("exact-food-balance-test");
  const home = ownedSystems(game)[0];
  home.population = 22;
  home.buildings.farm = 0;
  const foodNet = estimatedColonyIncome(game).food;
  assert.ok(foodNet < 0);
  game.player.resources.food = -foodNet;
  const colonyStability = home.stability;
  const nationalStability = game.player.globalStability;

  advanceMonth(game);

  assert.equal(game.player.resources.food, 0);
  assert.ok(home.stability > colonyStability);
  assert.ok(game.player.globalStability > nationalStability);
});

test("diplomatic actions charge their displayed influence and treaty prices", () => {
  const game = createGame("diplomacy-cost-test");
  assert.deepEqual(envoyCost(game), { influence: 10 });
  assert.deepEqual(treatyCost("trade"), { credits: 24, influence: 14 });
  assert.deepEqual(treatyCost("research"), { credits: 20, influence: 22 });
  assert.equal(treatyCost("unknown"), null);

  game.player.resources.influence = 9;
  const before = structuredClone(game.player.relations);
  assert.equal(sendEnvoy(game, "helion").ok, false);
  assert.deepEqual(game.player.relations, before);
  game.player.resources.influence = 10;
  assert.equal(sendEnvoy(game, "helion").ok, true);
  assert.equal(game.player.resources.influence, 0);

  game.player.resources.credits = 24;
  game.player.resources.influence = 14;
  game.player.relations.nacre = 30;
  assert.equal(proposeTreaty(game, "nacre", "trade").ok, true);
  assert.equal(game.player.resources.credits, 0);
  assert.equal(game.player.resources.influence, 0);
});

test("an unaffordable event can be closed with a costly crisis decision", () => {
  const game = createGame("event-deadlock-test");
  game.event = { id: "quiet-strike", turn: game.turn };
  game.player.resources.credits = 10;
  const home = ownedSystems(game)[0];
  const before = home.stability;

  assert.equal(EVENTS.find((event) => event.id === game.event.id).choices.some((choice) => eventChoiceAvailable(game, choice)), false);
  assert.equal(advanceMonth(game).reason, "pending-event");
  const result = resolveEvent(game, EMERGENCY_EVENT_CHOICE_ID);

  assert.equal(result.ok, true);
  assert.equal(game.event, null);
  assert.ok(home.stability < before);
  assert.equal(advanceMonth(game).advanced, true);
});

test("frontier defense fleets can repel Vesper pressure", () => {
  const makeFrontier = (strength) => {
    const game = createGame("border-pressure-test");
    const home = ownedSystems(game)[0];
    const neighbor = getSystem(game, home.neighbors[0]);
    const vesper = game.factions.find((faction) => faction.id === "vesper");
    if (neighbor.owner && neighbor.owner !== vesper.id) game.factionWorlds[neighbor.owner] = game.factionWorlds[neighbor.owner].filter((id) => id !== neighbor.id);
    neighbor.owner = vesper.id;
    neighbor.colony = true;
    neighbor.buildings = { farm: 1 };
    if (!game.factionWorlds[vesper.id].includes(neighbor.id)) game.factionWorlds[vesper.id].push(neighbor.id);
    game.player.relations.vesper = -40;
    game.player.fleets.find((fleet) => fleet.role === "defense").strength = strength;
    game.turn = 11;
    game.month = 12;
    game.nextEventTurn = 100;
    return game;
  };
  const defended = makeFrontier(100);
  const exposed = makeFrontier(0);
  const report = borderPressureReport(defended);
  assert.equal(report.active, true);
  assert.equal(report.monthsUntilCheck, 1);
  assert.equal(report.frontier[0].fleetStrength, 100);

  advanceMonth(defended);
  advanceMonth(exposed);

  assert.ok(defended.log.some((entry) => entry.title === "Rajapuolustus torjui painostuksen"));
  assert.ok(exposed.log.some((entry) => entry.title === "Rajalla tapahtui kahakka"));
  assert.ok(ownedSystems(exposed)[0].stability < ownedSystems(defended)[0].stability);
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

test("an adaptive map reveal does not consume the relic before a survey fleet visits it", () => {
  const game = createGame("relic-after-reveal");
  const relicSite = game.systems.find((system) => system.anomaly === "Kantaman muistijälki");
  const scout = game.player.fleets.find((fleet) => fleet.role === "survey");
  assert.ok(relicSite && scout);

  // Adaptive maps can reveal a nearby system ahead of the fleet's physical arrival.
  game.player.technologies.push("adaptive-maps");
  game.systems.forEach((system) => { system.discovered = true; });
  const route = shortestRoute(game, scout.systemId, relicSite.id);
  assert.ok(route?.length);
  assert.equal(moveFleet(game, scout.id, relicSite.id).ok, true);
  tick(game, route.length + 1);

  assert.deepEqual(game.player.relics, ["kantama-echo"]);
  assert.ok(game.log.some((entry) => entry.title === "Harvinainen löytö: Kantaman muistijälki"));
  assert.equal(validateSave(game).ok, true);
});

test("event and relic rewards clamp every resource at the stock limit", () => {
  const game = createGame("reward-stock-cap");
  game.event = { id: "drift-capsule", turn: game.turn };
  game.player.resources.science = 99_990;
  game.player.resources.influence = 99_999;
  assert.equal(resolveEvent(game, "decode").ok, true);
  assert.equal(game.player.resources.science, 99_999);
  assert.equal(game.player.resources.influence, 99_999);

  const relicGame = createGame("relic-stock-cap");
  const relicSite = relicGame.systems.find((system) => system.anomaly === "Kantaman muistijälki");
  const scout = relicGame.player.fleets.find((fleet) => fleet.role === "survey");
  relicGame.systems.forEach((system) => { system.discovered = true; });
  Object.keys(relicGame.player.resources).forEach((key) => { relicGame.player.resources[key] = 99_999; });
  const route = shortestRoute(relicGame, scout.systemId, relicSite.id);
  assert.equal(moveFleet(relicGame, scout.id, relicSite.id).ok, true);
  tick(relicGame, route.length + 1);
  assert.ok(Object.values(relicGame.player.resources).every((value) => value <= 99_999));
  assert.equal(validateSave(relicGame).ok, true);
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
  const missingBuildings = structuredClone(game);
  delete missingBuildings.systems[0].buildings;
  assert.equal(validateSave(missingBuildings).ok, false);
  const invalidBuildingLevel = structuredClone(game);
  invalidBuildingLevel.systems[0].buildings.farm = 999;
  assert.equal(validateSave(invalidBuildingLevel).ok, false);
  for (const field of ["history", "log"]) {
    const nullRecord = structuredClone(game);
    nullRecord[field][0] = null;
    assert.equal(validateSave(nullRecord).ok, false, `${field} null entry`);
    assert.equal(parseSave(exportSave(nullRecord)).ok, false, `${field} null entry import`);
  }
  const brokenSnapshot = structuredClone(game);
  brokenSnapshot.history[0].resources = null;
  assert.equal(validateSave(brokenSnapshot).ok, false);
  const brokenLogText = structuredClone(game);
  brokenLogText.log[0].text = null;
  assert.equal(validateSave(brokenLogText).ok, false);
  const brokenAccordProgress = structuredClone(game);
  brokenAccordProgress.player.accordProgress = ACCORD_REQUIRED_MONTHS + 1;
  assert.equal(validateSave(brokenAccordProgress).ok, false);
  const legacySave = structuredClone(game);
  delete legacySave.player.accordProgress;
  assert.equal(validateSave(legacySave).ok, true);

  const missingColonizationBonus = structuredClone(game);
  delete missingColonizationBonus.player.colonizationBonus;
  assert.equal(validateSave(missingColonizationBonus).ok, false);
  const overrunResearch = structuredClone(game);
  overrunResearch.player.researchId = "survey-lattices";
  overrunResearch.player.researchProgress = 999;
  assert.equal(validateSave(overrunResearch).ok, false);
  const completedButActiveResearch = structuredClone(game);
  completedButActiveResearch.player.researchId = "survey-lattices";
  completedButActiveResearch.player.researchProgress = TECHS.find((tech) => tech.id === "survey-lattices").cost;
  assert.equal(validateSave(completedButActiveResearch).ok, false);
  const inconsistentVictory = structuredClone(game);
  inconsistentVictory.gameOver = true;
  inconsistentVictory.victory = null;
  assert.equal(validateSave(inconsistentVictory).ok, false);
  const injectedFactionColor = structuredClone(game);
  injectedFactionColor.factions[0].color = '#ffffff" onload="alert(1)';
  assert.equal(validateSave(injectedFactionColor).ok, false);
  assert.equal(parseSave(exportSave(injectedFactionColor)).ok, false);
  const injectedSystemId = structuredClone(game);
  injectedSystemId.systems[0].id = 'sys-01" onmouseover="alert(1)';
  assert.equal(validateSave(injectedSystemId).ok, false);

  assert.equal(isValidSeed("s".repeat(128)), true);
  assert.equal(isValidSeed("s".repeat(129)), false);
  assert.throws(() => createGame("s".repeat(129)), /128 merkkiä/);

  const damagedRawSave = "{malformed saved game";
  memory.set(SAVE_KEY, damagedRawSave);
  assert.deepEqual(preserveRecoverySave(damagedRawSave, storage), { ok: true, reason: "" });
  assert.equal(readRecoverySave(storage), damagedRawSave);
  assert.equal(memory.get(SAVE_KEY), damagedRawSave, "the original bytes remain until a recovery copy exists");
  assert.deepEqual(preserveRecoverySave("", storage), { ok: true, reason: "" });
  assert.equal(readRecoverySave(storage), "");
});

test("each victory route is derived from actual state", () => {
  const knowledge = createGame("victory-knowledge");
  knowledge.player.technologies = TECHS.slice(0, 10).map((tech) => tech.id);
  assert.equal(evaluateVictory(knowledge).id, "knowledge");
  const earlyKnowledge = createGame("early-victory-knowledge");
  earlyKnowledge.player.technologies = TECHS.slice(0, 8).map((tech) => tech.id);
  assert.equal(evaluateVictory(earlyKnowledge), null);

  const accord = createGame("victory-accord");
  accord.player.treaties = accord.factions.slice(0, 3).map((faction, index) => ({ factionId: faction.id, type: index === 0 ? "research" : "trade", remaining: 10 }));
  Object.keys(accord.player.relations).forEach((id) => { accord.player.relations[id] = 40; });
  accord.player.accordProgress = ACCORD_REQUIRED_MONTHS;
  assert.equal(evaluateVictory(accord).id, "accord");
  const weakAccord = createGame("weak-victory-accord");
  weakAccord.player.treaties = accord.player.treaties;
  weakAccord.player.accordProgress = ACCORD_REQUIRED_MONTHS;
  weakAccord.player.relations.helion = 0;
  assert.equal(evaluateVictory(weakAccord), null);

  const growingAccord = createGame("sustained-victory-accord");
  growingAccord.player.treaties = growingAccord.factions.slice(0, 3).map((faction, index) => ({ factionId: faction.id, type: index === 0 ? "research" : "trade", remaining: ACCORD_REQUIRED_MONTHS + 1 }));
  Object.keys(growingAccord.player.relations).forEach((id) => { growingAccord.player.relations[id] = 50; });
  growingAccord.nextEventTurn = 100;
  tick(growingAccord, ACCORD_REQUIRED_MONTHS - 1);
  assert.equal(growingAccord.player.accordProgress, ACCORD_REQUIRED_MONTHS - 1);
  assert.equal(growingAccord.victory, null);
  tick(growingAccord, 1);
  assert.equal(growingAccord.player.accordProgress, ACCORD_REQUIRED_MONTHS);
  assert.equal(growingAccord.victory.id, "accord");
  assert.equal(ACCORD_REQUIRED_MONTHS, 12, "diplomacy must be maintained for a full year");

  const frontier = createGame("victory-frontier");
  for (const system of frontier.systems.filter((item) => !item.owner).slice(0, 7)) {
    system.owner = "player";
    system.colony = true;
    system.population = 1;
    system.stability = 80;
  }
  assert.equal(ownedSystems(frontier).length, 8);
  assert.equal(evaluateVictory(frontier).id, "frontier");
});

