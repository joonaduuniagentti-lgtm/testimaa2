import { FACTIONS, PLANET_TYPES, SYSTEM_FIRST_NAMES } from "./data.js";
import { hashSeed, makeRandom } from "./random.js";

const GALAXY_COLUMNS = 7;
const SYSTEM_COUNT = 42;

function distance(left, right) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function connectSystems(systems) {
  const links = systems.map(() => new Set());
  systems.forEach((system, index) => {
    const nearest = systems
      .map((candidate, candidateIndex) => ({ candidateIndex, range: distance(system, candidate) }))
      .filter((item) => item.candidateIndex !== index)
      .sort((left, right) => left.range - right.range)
      .slice(0, 3);
    nearest.forEach((item) => {
      links[index].add(item.candidateIndex);
      links[item.candidateIndex].add(index);
    });
    if (index > 0) {
      links[index].add(index - 1);
      links[index - 1].add(index);
    }
  });
  systems.forEach((system, index) => {
    system.neighbors = Array.from(links[index])
      .sort((left, right) => distance(system, systems[left]) - distance(system, systems[right]))
      .map((neighborIndex) => systems[neighborIndex].id);
  });
}

function buildSystem(index, random, usedNames) {
  const row = Math.floor(index / GALAXY_COLUMNS);
  const column = index % GALAXY_COLUMNS;
  const planet = PLANET_TYPES[Math.floor(random() * PLANET_TYPES.length)];
  const base = SYSTEM_FIRST_NAMES[index % SYSTEM_FIRST_NAMES.length];
  const name = usedNames.has(base) ? base + " " + String(index + 1).padStart(2, "0") : base;
  usedNames.add(name);
  return {
    id: "sys-" + String(index + 1).padStart(2, "0"),
    number: index + 1,
    name,
    x: 90 + column * 137 + (row % 2) * 24 + (random() - 0.5) * 31,
    y: 82 + row * 113 + (random() - 0.5) * 32,
    neighbors: [],
    owner: null,
    discovered: index === 0,
    colony: false,
    population: 0,
    stability: 0,
    habitability: Math.max(0.08, Math.min(0.99, planet.habitability + (random() - 0.5) * 0.18)),
    planetType: planet.id,
    planetName: name + (random() > 0.5 ? " Prime" : " II"),
    richness: 0.32 + random() * 0.68,
    mineral: 0.3 + random() * 0.7,
    anomaly: random() > 0.76 ? ["vanha majakka", "kaiku", "siemenpilvi", "tyhjä kehärata"][Math.floor(random() * 4)] : null,
    buildings: {},
    lastYield: {},
    claimable: true
  };
}

export function generateGalaxy(seed) {
  const random = makeRandom(seed);
  const usedNames = new Set();
  const systems = Array.from({ length: SYSTEM_COUNT }, (_, index) => buildSystem(index, random, usedNames));
  connectSystems(systems);

  const playerHome = systems[0];
  playerHome.name = "Maa";
  playerHome.planetName = "Tellus";
  playerHome.planetType = "garden";
  playerHome.habitability = 0.98;
  playerHome.owner = "player";
  playerHome.colony = true;
  playerHome.population = 7.2;
  playerHome.stability = 83;
  playerHome.buildings = { farm: 1, mine: 1, lab: 1, foundry: 1 };
  playerHome.discovered = true;

  const factionHomes = [6, 13, 24, 34];
  const reservedFactionHomes = new Set(factionHomes.map((index) => systems[index].id));
  const factionWorlds = {};
  FACTIONS.forEach((faction, factionIndex) => {
    const homeIndex = factionHomes[factionIndex];
    const home = systems[homeIndex];
    const closest = home.neighbors
      .map((id) => systems.find((system) => system.id === id))
      .filter((system) => system && system.owner === null && !reservedFactionHomes.has(system.id))
      .slice(0, 2);
    const members = [home, ...closest];
    members.forEach((system, memberIndex) => {
      system.owner = faction.id;
      system.colony = true;
      system.discovered = true;
      system.population = memberIndex === 0 ? 4.4 + random() * 1.6 : 1.2 + random() * 1.7;
      system.stability = 65 + random() * 24;
      system.buildings = memberIndex === 0 ? { farm: 1, lab: 1, tradeport: 1 } : { farm: 1, mine: 1 };
    });
    home.name = faction.short + " Prime";
    home.planetName = home.name;
    factionWorlds[faction.id] = members.map((system) => system.id);
  });

  playerHome.neighbors.forEach((id) => {
    const neighbor = systems.find((system) => system.id === id);
    if (neighbor) neighbor.discovered = true;
  });

  const hiddenMessage = systems
    .filter((system) => !system.owner && !system.discovered)
    .sort((left, right) => distance(playerHome, left) - distance(playerHome, right))[0];
  if (hiddenMessage) hiddenMessage.anomaly = "Kantaman muistijälki";
  return { systems, factionWorlds };
}

function initialHistory(game) {
  return {
    turn: 0, year: game.year, month: game.month,
    resources: { ...game.player.resources }, colonies: 1, technologies: 0,
    relations: Math.round(Object.values(game.player.relations).reduce((sum, value) => sum + value, 0) / FACTIONS.length)
  };
}

export function createGame(seed = "KANTAMA-01") {
  const world = generateGalaxy(seed);
  const relations = Object.fromEntries(FACTIONS.map((faction) => [faction.id, faction.baseRelation]));
  const game = {
    schemaVersion: 1, seed: String(seed), rngState: hashSeed(String(seed) + "-simulation") || 1,
    turn: 0, year: 2248, month: 1, paused: true, gameOver: false, victory: null, nextEventTurn: 3,
    systems: world.systems, factionWorlds: world.factionWorlds,
    factions: FACTIONS.map((faction) => ({
      ...faction,
      power: Math.round(42 + world.systems.filter((system) => system.owner === faction.id).length * 12),
      treasury: 90, mood: "watchful", treaties: [], lastMove: -1
    })),
    player: {
      id: "player", name: "Maanperillisten unioni",
      resources: { credits: 150, alloys: 95, food: 82, fuel: 48, influence: 34, science: 0 },
      net: { credits: 0, alloys: 0, food: 0, fuel: 0, influence: 0, science: 0 },
      technologies: [], researchId: null, researchProgress: 0, researchProgressById: {}, policy: "balanced",
      relations, treaties: [],
      fleets: [
        { id: "fleet-scout", name: "Pohjantähti", role: "survey", ships: 2, systemId: "sys-01", path: [], destination: null, status: "valmiina", strength: 8 },
        { id: "fleet-guard", name: "Siniura", role: "defense", ships: 3, systemId: "sys-01", path: [], destination: null, status: "vartiossa", strength: 15 }
      ],
      colonyShips: 2, globalStability: 76, colonizationBonus: 0, relics: []
    },
    event: null,
    log: [
      { turn: 0, year: 2248, month: 1, type: "welcome", title: "Kantama avautuu", text: "Tähtiväylät odottavat. Ensimmäinen siirtokunta on turvassa, ja Pohjantähti on valmis lähtemään." }
    ],
    history: [],
    ui: { screen: "command", selectedSystemId: "sys-01", selectedColonyId: "sys-01", toast: "", mapFilter: "all" }
  };
  game.history.push(initialHistory(game));
  return game;
}

export function getSystem(game, systemId) {
  return game.systems.find((system) => system.id === systemId) || null;
}

export function getFaction(game, factionId) {
  return game.factions.find((faction) => faction.id === factionId) || null;
}

export function ownedSystems(game, owner = "player") {
  return game.systems.filter((system) => system.owner === owner && system.colony);
}

export function systemDistance(game, leftId, rightId) {
  const left = getSystem(game, leftId);
  const right = getSystem(game, rightId);
  if (!left || !right) return Infinity;
  return distance(left, right);
}
