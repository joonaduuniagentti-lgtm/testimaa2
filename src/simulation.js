import { BUILDINGS, EVENTS, POLICIES, TECHS } from "./data.js";
import { applyResourceChanges } from "./economy.js";
import { randomFromState, randomInt } from "./random.js";
import { getSystem, ownedSystems } from "./world.js";

const RESOURCE_KEYS = ["credits", "alloys", "food", "fuel", "influence", "science"];
export const ACCORD_RELATION_TARGET = 40;
export const ACCORD_REQUIRED_MONTHS = 12;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pushLog(game, type, title, text) {
  game.log.unshift({ turn: game.turn, year: game.year, month: game.month, type, title, text });
  game.log = game.log.slice(0, 100);
}

function buildingOutput(game, buildingId, level) {
  const building = BUILDINGS.find((item) => item.id === buildingId);
  if (!building) return {};
  const multiplier = 1 + (game.player.technologies.includes("orbital-foundries") && buildingId === "foundry" ? 0.35 : 0);
  return Object.fromEntries(Object.entries(building.output).map(([key, value]) => [key, value * level * multiplier]));
}

function calculateNet(game) {
  const net = Object.fromEntries(RESOURCE_KEYS.map((key) => [key, 0]));
  const colonies = ownedSystems(game);
  for (const system of colonies) {
    const population = system.population || 0;
    const habitability = clamp(system.habitability + (game.player.technologies.includes("biosphere-worlds") ? 0.12 : 0), 0.1, 1);
    net.credits += 2 + population * 0.72 + system.stability / 100;
    net.food += habitability * 1.9 - population * 0.64;
    net.alloys += system.mineral * 1.25;
    net.fuel += system.richness * 0.42;
    net.influence += 0.45;
    net.science += 0.35;
    for (const [buildingId, level] of Object.entries(system.buildings)) {
      const output = buildingOutput(game, buildingId, Number(level) || 0);
      Object.entries(output).forEach(([key, amount]) => { net[key] += amount; });
    }
  }

  const policy = POLICIES.find((item) => item.id === game.player.policy) || POLICIES[1];
  net.credits += policy.credits;
  net.science += policy.science;
  const techEffects = game.player.technologies.map((id) => TECHS.find((tech) => tech.id === id)).filter(Boolean);
  techEffects.forEach((tech) => {
    const effect = tech.effect;
    if (["credits", "alloys", "food", "fuel", "influence", "science"].includes(effect.type)) net[effect.type] += effect.value;
    if (effect.type === "farm") net.food += effect.value * colonies.filter((system) => system.buildings.farm).length;
  });
  game.player.treaties.forEach((treaty) => {
    if (treaty.type === "trade") net.credits += 3;
    if (treaty.type === "research") net.science += 2;
  });
  return net;
}

function applyEconomy(game) {
  const requestedNet = calculateNet(game);
  const previousFood = game.player.resources.food;
  const net = applyResourceChanges(game.player.resources, requestedNet);

  const rawFoodBalance = previousFood + requestedNet.food;
  const shortage = rawFoodBalance < -1e-9;
  const policy = POLICIES.find((item) => item.id === game.player.policy) || POLICIES[1];
  ownedSystems(game).forEach((system) => {
    const habitat = system.buildings.habitat || 0;
    const foodFactor = shortage || previousFood === 0 ? 0.22 : 1;
    const growth = system.habitability * foodFactor * (system.stability / 100) * 0.038 * (1 + habitat * 0.16);
    system.population = clamp(system.population + growth, 0.2, 22);
    const technologyStability = game.player.technologies.includes("memory-gardens") ? 0.25 : 0;
    system.stability = clamp(system.stability + policy.stability * 0.42 + technologyStability - (shortage ? 2.2 : 0.05), 0, 100);
    system.lastYield = { ...net };
  });
  if (shortage) {
    game.player.globalStability = clamp(game.player.globalStability - 1.4, 0, 100);
  } else {
    const colonyAverage = ownedSystems(game).reduce((total, system) => total + system.stability, 0) / Math.max(1, ownedSystems(game).length);
    game.player.globalStability = clamp((game.player.globalStability * 0.88) + (colonyAverage * 0.12), 0, 100);
  }
  game.player.net = net;
}

function progressResearch(game) {
  const tech = TECHS.find((item) => item.id === game.player.researchId);
  if (!tech) return;
  const available = Math.min(game.player.resources.science, tech.cost - game.player.researchProgress);
  if (available <= 0) return;
  game.player.resources.science -= available;
  game.player.researchProgress += available;
  game.player.researchProgressById[tech.id] = game.player.researchProgress;
  if (game.player.researchProgress >= tech.cost) {
    game.player.technologies.push(tech.id);
    game.player.researchProgressById[tech.id] = tech.cost;
    game.player.researchId = null;
    game.player.researchProgress = 0;
    pushLog(game, "research", "Läpimurto: " + tech.name, tech.summary);
  }
}

function moveFleets(game) {
  game.player.fleets.forEach((fleet) => {
    if (!fleet.path.length) return;
    const stride = fleet.role === "survey" && game.player.technologies.includes("survey-lattices") ? 2 : 1;
    for (let step = 0; step < stride && fleet.path.length; step += 1) fleet.systemId = fleet.path.shift();
    const arrived = fleet.path.length === 0;
    if (!arrived) return;
    const system = getSystem(game, fleet.systemId);
    fleet.destination = null;
    fleet.status = fleet.role === "survey" ? "valmiina" : "vartiossa";
    if (fleet.role === "survey" && system) {
      const newlyDiscovered = !system.discovered;
      if (newlyDiscovered) {
        system.discovered = true;
        const extraRange = game.player.technologies.includes("adaptive-maps") ? 2 : 1;
        if (extraRange > 1) {
          system.neighbors.forEach((neighborId) => {
            const neighbor = getSystem(game, neighborId);
            if (neighbor) neighbor.discovered = true;
          });
        }
      }
      let title = newlyDiscovered ? "Uusi järjestelmä: " + system.name : fleet.name + " saapui";
      let detail = newlyDiscovered ? system.planetName + " kartoitettiin." : "Laivue asettui järjestelmään " + system.name + ".";
      if (system.anomaly === "Kantaman muistijälki" && !game.player.relics.includes("kantama-echo")) {
        game.player.relics.push("kantama-echo");
        applyResourceChanges(game.player.resources, { science: 36, credits: 24, influence: 8 });
        game.player.globalStability = clamp(game.player.globalStability + 4, 0, 100);
        title = "Harvinainen löytö: Kantaman muistijälki";
        detail = "Kapselin sisällä on käsin kaiverrettu viesti: “Kiitos toisesta mahdollisuudesta. Seuraava matka alkaa tästä.” Retkikunta tuo kotiin vierasta tiedettä, resursseja ja yhden uuden tarinan.";
      } else if (newlyDiscovered && system.anomaly) {
        applyResourceChanges(game.player.resources, { science: 5 });
        detail += " Retkikunta havaitsi lisäksi: " + system.anomaly + ".";
      }
      pushLog(game, newlyDiscovered || title.startsWith("Harvinainen löytö:") ? "discovery" : "fleet", title, detail);
    }
  });
}

function advanceTreaties(game) {
  const expired = [];
  game.player.treaties.forEach((treaty) => {
    treaty.remaining -= 1;
    if (treaty.remaining <= 0) expired.push(treaty.factionId);
  });
  game.player.treaties = game.player.treaties.filter((treaty) => treaty.remaining > 0);
  expired.forEach((factionId) => {
    const faction = game.factions.find((item) => item.id === factionId);
    if (faction) pushLog(game, "treaty", "Sopimus päättyi", faction.name + " kanssa tehty sopimus on umpeutunut.");
  });
  game.factions.forEach((faction) => {
    const relation = game.player.relations[faction.id] || 0;
    const treaty = game.player.treaties.find((item) => item.factionId === faction.id);
    if (treaty && game.turn % 3 === 0) game.player.relations[faction.id] = clamp(relation + 1, -100, 100);
    else if (faction.style === "military" && game.turn % 4 === 0) game.player.relations[faction.id] = clamp(relation - 1, -100, 100);
  });
}

function simulateFactionExpansion(game, faction) {
  const owned = game.systems.filter((system) => system.owner === faction.id);
  const possible = new Set();
  owned.forEach((system) => system.neighbors.forEach((id) => {
    const candidate = getSystem(game, id);
    if (candidate && !candidate.owner && candidate.habitability > 0.28) possible.add(id);
  }));
  if (!possible.size) return;
  const chance = faction.expansion * 0.25;
  if (randomFromState(game) > chance) return;
  const candidates = Array.from(possible).map((id) => getSystem(game, id));
  candidates.sort((left, right) => (right.habitability + right.richness * 0.2) - (left.habitability + left.richness * 0.2));
  const system = candidates[0];
  system.owner = faction.id;
  system.colony = true;
  system.population = 0.8 + randomFromState(game) * 0.7;
  system.stability = 66 + randomFromState(game) * 15;
  system.buildings = { farm: 1 };
  faction.power += 4;
  if (!game.factionWorlds[faction.id].includes(system.id)) game.factionWorlds[faction.id].push(system.id);
  if (game.turn % 12 === 0) pushLog(game, "faction", faction.short + " laajentui", "Uusi asutuskeskus syntyi järjestelmään " + system.name + ".");
}

function simulateFactions(game) {
  if (game.turn % 4 !== 0) return;
  game.factions.forEach((faction) => simulateFactionExpansion(game, faction));
}

function stationedDefense(game, systemId) {
  return game.player.fleets
    .filter((fleet) => fleet.role === "defense" && fleet.systemId === systemId && fleet.path.length === 0)
    .reduce((total, fleet) => total + fleet.strength, 0);
}

export function borderPressureReport(game) {
  const aggressor = game.factions.find((faction) => faction.style === "military");
  if (!aggressor) return null;
  const relation = game.player.relations[aggressor.id] ?? 0;
  const frontier = ownedSystems(game)
    .filter((system) => system.neighbors.some((neighborId) => getSystem(game, neighborId)?.owner === aggressor.id))
    .map((system) => ({
      id: system.id,
      name: system.name,
      number: system.number,
      stability: system.stability,
      fleetStrength: stationedDefense(game, system.id),
      defense: stationedDefense(game, system.id) + Math.floor(system.stability / 25)
    }))
    .sort((left, right) => left.defense - right.defense || left.stability - right.stability || left.number - right.number);
  const baseThreat = 8 + Math.floor(aggressor.power / 12);
  return {
    aggressorId: aggressor.id,
    aggressorName: aggressor.name,
    relation,
    active: relation < 25 && frontier.length > 0,
    monthsUntilCheck: 12 - (game.turn % 12),
    threatMin: baseThreat,
    threatMax: baseThreat + 3,
    frontier
  };
}

function simulateBorderPressure(game) {
  if (game.turn % 12 !== 0) return;
  const report = borderPressureReport(game);
  if (!report?.active) return;

  const aggressor = game.factions.find((faction) => faction.id === report.aggressorId);
  const target = getSystem(game, report.frontier[0].id);
  const threat = report.threatMin + randomInt(game, 0, 3);
  const defense = report.frontier[0].defense;
  if (defense >= threat) {
    target.stability = clamp(target.stability + 2, 0, 100);
    game.player.globalStability = clamp(game.player.globalStability + 1, 0, 100);
    game.player.relations[aggressor.id] = clamp(game.player.relations[aggressor.id] + 2, -100, 100);
    pushLog(game, "defense", "Rajapuolustus torjui painostuksen", target.name + " kesti " + aggressor.short + "-valtion rajakokeen. Puolustusvoima " + defense + " ylitti uhan " + threat + ".");
  } else {
    const stabilityLoss = Math.min(12, 4 + threat - defense);
    target.stability = clamp(target.stability - stabilityLoss, 0, 100);
    game.player.globalStability = clamp(game.player.globalStability - Math.ceil(stabilityLoss / 2), 0, 100);
    game.player.relations[aggressor.id] = clamp(game.player.relations[aggressor.id] - 2, -100, 100);
    pushLog(game, "defense", "Rajalla tapahtui kahakka", aggressor.short + " painosti järjestelmää " + target.name + ". Puolustusvoima " + defense + " jäi uhan " + threat + " alle; vakaus −" + stabilityLoss + ".");
  }
}

function snapshot(game) {
  return {
    turn: game.turn,
    year: game.year,
    month: game.month,
    resources: { ...game.player.resources },
    colonies: ownedSystems(game).length,
    technologies: game.player.technologies.length,
    relations: Math.round(Object.values(game.player.relations).reduce((sum, value) => sum + value, 0) / game.factions.length)
  };
}

export function evaluateVictory(game) {
  if (game.victory) return game.victory;
  const colonies = ownedSystems(game).length;
  const activeTreaties = game.player.treaties.filter((treaty) => treaty.remaining > 0).length;
  const averageRelation = Object.values(game.player.relations).reduce((sum, relation) => sum + relation, 0) / game.factions.length;
  const averageStability = colonies ? ownedSystems(game).reduce((sum, system) => sum + system.stability, 0) / colonies : 0;
  const researched = new Set(game.player.technologies);
  const advancedTechnologyCount = TECHS.filter((tech) => tech.tier >= 3 && researched.has(tech.id)).length;
  const treatyTypes = new Set(game.player.treaties.filter((treaty) => treaty.remaining > 0).map((treaty) => treaty.type));
  let victory = null;
  if (game.player.technologies.length >= 10 && advancedTechnologyCount >= 2) {
    victory = { id: "knowledge", title: "Tieteen kynnys ylitetty", detail: "Kymmenen teknologiaa ja kaksi edistynyttä läpimurtoa avasivat sivilisaatiolle uuden aikakauden." };
  } else if (activeTreaties >= 3 && treatyTypes.size >= 2 && averageRelation >= ACCORD_RELATION_TARGET && (game.player.accordProgress ?? 0) >= ACCORD_REQUIRED_MONTHS) {
    victory = { id: "accord", title: "Yhteinen tähtirintama", detail: "Kolme aktiivista sopimusta, molemmat yhteistyön muodot ja 12 kuukauden ajan ylläpidetty luottamus loivat pysyvän tähtiliiton." };
  } else if (colonies >= 8 && averageStability >= 70) {
    victory = { id: "frontier", title: "Kahdeksan kotia", detail: "Kahdeksan vakaata siirtokuntaa muodostivat uuden tähtirintaman." };
  }
  if (victory) {
    game.victory = { ...victory, turn: game.turn, year: game.year, month: game.month };
    game.gameOver = true;
    pushLog(game, "victory", victory.title, victory.detail);
  }
  return game.victory;
}

export function advanceMonth(game) {
  if (game.gameOver) return { advanced: false, reason: "game-over" };
  if (game.event) return { advanced: false, reason: "pending-event" };
  game.turn += 1;
  game.month += 1;
  if (game.month > 12) {
    game.month = 1;
    game.year += 1;
  }

  applyEconomy(game);
  progressResearch(game);
  moveFleets(game);
  advanceTreaties(game);
  simulateFactions(game);
  simulateBorderPressure(game);
  const activeTreaties = game.player.treaties.filter((treaty) => treaty.remaining > 0);
  const treatyTypes = new Set(activeTreaties.map((treaty) => treaty.type));
  const averageRelation = Object.values(game.player.relations).reduce((sum, relation) => sum + relation, 0) / game.factions.length;
  const allianceReady = activeTreaties.length >= 3 && treatyTypes.size >= 2 && averageRelation >= ACCORD_RELATION_TARGET;
  game.player.accordProgress = allianceReady ? Math.min(ACCORD_REQUIRED_MONTHS, (game.player.accordProgress ?? 0) + 1) : 0;
  game.history.push(snapshot(game));
  if (game.history.length > 120) game.history.shift();

  if (game.turn >= game.nextEventTurn) {
    const index = randomInt(game, 0, EVENTS.length - 1);
    game.event = { id: EVENTS[index].id, turn: game.turn };
    game.nextEventTurn = game.turn + randomInt(game, 3, 6);
  }
  evaluateVictory(game);
  return { advanced: true, event: game.event, victory: game.victory };
}

export function advanceMonths(game, count = 1) {
  const results = [];
  for (let index = 0; index < count; index += 1) {
    const result = advanceMonth(game);
    if (!result.advanced) break;
    results.push(result);
    if (game.event || game.gameOver) break;
  }
  return results;
}

export function estimatedColonyIncome(game) {
  return calculateNet(game);
}

export function timeLabel(game) {
  return game.year + "." + String(game.month).padStart(2, "0");
}

