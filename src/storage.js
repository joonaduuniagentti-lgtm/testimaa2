import { EVENTS, FACTIONS, SCREEN_DEFS, TECHS } from "./data.js";

export const SAVE_KEY = "kantama.save.v1";
const RESOURCE_KEYS = ["credits", "alloys", "food", "fuel", "influence", "science"];

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function validateSave(game) {
  if (!isObject(game) || game.schemaVersion !== 1) return { ok: false, reason: "Tallennusversion tunniste puuttuu." };
  if (typeof game.seed !== "string" || game.seed.length < 1 || game.seed.length > 128) return { ok: false, reason: "Galaksin siementunniste on virheellinen." };
  if (!Array.isArray(game.systems) || game.systems.length !== 42) return { ok: false, reason: "Tallennuksessa ei ole oikeaa galaksia." };
  if (!Array.isArray(game.factions) || game.factions.length !== FACTIONS.length) return { ok: false, reason: "Valtioiden tiedot ovat puutteelliset." };
  if (!isObject(game.player) || !isObject(game.player.resources) || !isObject(game.player.net)) return { ok: false, reason: "Valtion resurssitiedot puuttuvat." };
  if (!Array.isArray(game.player.fleets) || !Array.isArray(game.player.technologies) || !Array.isArray(game.player.treaties) || !Array.isArray(game.player.relics)) return { ok: false, reason: "Valtion laivasto tai kehitystiedot ovat puutteelliset." };
  if (!isObject(game.player.relations) || !isObject(game.player.researchProgressById)) return { ok: false, reason: "Valtion suhteet tai tutkimushistoria puuttuu." };
  if (!Array.isArray(game.log) || game.log.length > 100 || !Array.isArray(game.history) || game.history.length < 1 || game.history.length > 120) return { ok: false, reason: "Pelitapahtumien historia on virheellinen." };
  if (!isObject(game.ui) || !SCREEN_DEFS.some((screen) => screen.id === game.ui.screen)) return { ok: false, reason: "Käyttöliittymän tila on virheellinen." };
  if (!Number.isInteger(game.turn) || game.turn < 0 || !Number.isInteger(game.year) || game.year < 2000 || !Number.isInteger(game.month) || game.month < 1 || game.month > 12) {
    return { ok: false, reason: "Pelin päivämäärä on virheellinen." };
  }
  if (!Number.isInteger(game.rngState) || game.rngState < 1 || game.rngState > 0xffffffff || !Number.isInteger(game.nextEventTurn) || game.nextEventTurn <= game.turn) {
    return { ok: false, reason: "Simulaation satunnaistila tai tapahtuma-ajastus on virheellinen." };
  }
  if (typeof game.gameOver !== "boolean" || typeof game.paused !== "boolean") return { ok: false, reason: "Pelin tila on virheellinen." };
  if (RESOURCE_KEYS.some((key) => !validNumber(game.player.resources[key], 0, 99999) || !Number.isFinite(game.player.net[key]))) {
    return { ok: false, reason: "Yksi tai useampi resurssiarvo on virheellinen." };
  }

  const factionIds = new Set(game.factions.map((faction) => faction?.id));
  const expectedFactionIds = new Set(FACTIONS.map((faction) => faction.id));
  if (factionIds.size !== FACTIONS.length || [...factionIds].some((id) => !expectedFactionIds.has(id))) return { ok: false, reason: "Valtioiden tunnisteet eivät täsmää peliversioon." };

  const systemIds = new Set();
  for (const system of game.systems) {
    if (!isObject(system) || typeof system.id !== "string" || typeof system.name !== "string" || typeof system.planetName !== "string" || !Array.isArray(system.neighbors)) {
      return { ok: false, reason: "Galaksin järjestelmätiedot ovat virheelliset." };
    }
    if (systemIds.has(system.id)) return { ok: false, reason: "Galaksissa on päällekkäisiä järjestelmätunnisteita." };
    if (!validNumber(system.x, 0, 1100) || !validNumber(system.y, 0, 760) || !validNumber(system.habitability, 0, 1) || !validNumber(system.mineral, 0, 1) || !validNumber(system.richness, 0, 1)) {
      return { ok: false, reason: "Järjestelmän ominaisarvot ovat virheelliset." };
    }
    if (![null, "player", ...factionIds].includes(system.owner) || typeof system.discovered !== "boolean" || typeof system.colony !== "boolean") return { ok: false, reason: "Järjestelmän omistajuus tai kartoitustila on virheellinen." };
    systemIds.add(system.id);
  }
  for (const system of game.systems) {
    if (system.neighbors.length === 0 || new Set(system.neighbors).size !== system.neighbors.length) return { ok: false, reason: "Tähtiväylät ovat puutteelliset tai kahdentuneet." };
    for (const neighborId of system.neighbors) {
      const neighbor = game.systems.find((candidate) => candidate.id === neighborId);
      if (!neighbor || neighborId === system.id || !neighbor.neighbors.includes(system.id)) return { ok: false, reason: "Tähtiväylien verkko ei ole eheä." };
    }
    if (system.colony && (!system.owner || !validNumber(system.population, 0, 22) || !validNumber(system.stability, 0, 100))) return { ok: false, reason: "Siirtokunnan väestö- tai vakausarvo on virheellinen." };
  }
  if (!systemIds.has(game.ui.selectedSystemId)) return { ok: false, reason: "Käyttöliittymän valitsemaa järjestelmää ei ole olemassa." };

  const techIds = new Set(TECHS.map((tech) => tech.id));
  if (new Set(game.player.technologies).size !== game.player.technologies.length || game.player.technologies.some((id) => !techIds.has(id))) return { ok: false, reason: "Tutkittujen teknologioiden tunnisteet ovat virheelliset." };
  if (game.player.researchId !== null && !techIds.has(game.player.researchId)) return { ok: false, reason: "Aktiivisen tutkimuksen tunnistetta ei löydy." };
  if (!validNumber(game.player.researchProgress, 0) || !validNumber(game.player.globalStability, 0, 100) || !Number.isInteger(game.player.colonyShips) || game.player.colonyShips < 0) return { ok: false, reason: "Valtion tutkimus-, vakaus- tai asutusalusarvo on virheellinen." };
  for (const [id, amount] of Object.entries(game.player.researchProgressById)) {
    const tech = TECHS.find((candidate) => candidate.id === id);
    if (!tech || !validNumber(amount, 0, tech.cost)) return { ok: false, reason: "Tallennettu tutkimusedistyminen on virheellinen." };
  }
  for (const faction of game.factions) {
    if (!validNumber(game.player.relations[faction.id], -100, 100)) return { ok: false, reason: "Diplomaattinen suhdeluku on virheellinen." };
  }

  const fleetIds = new Set();
  for (const fleet of game.player.fleets) {
    if (!isObject(fleet) || typeof fleet.id !== "string" || fleetIds.has(fleet.id) || !systemIds.has(fleet.systemId) || !Array.isArray(fleet.path) || fleet.path.some((id) => !systemIds.has(id))) {
      return { ok: false, reason: "Laivastotiedot tai reitti ovat virheelliset." };
    }
    if (!["survey", "defense"].includes(fleet.role) || !Number.isInteger(fleet.ships) || fleet.ships < 1 || !Number.isFinite(fleet.strength) || fleet.strength < 0) return { ok: false, reason: "Laivaston kokoonpano on virheellinen." };
    let routeOrigin = fleet.systemId;
    for (const stepId of fleet.path) {
      const origin = game.systems.find((system) => system.id === routeOrigin);
      if (!origin.neighbors.includes(stepId)) return { ok: false, reason: "Laivaston reitti ei seuraa tähtiväyliä." };
      routeOrigin = stepId;
    }
    if (fleet.path.length && fleet.destination !== routeOrigin) return { ok: false, reason: "Laivaston määränpää ei vastaa sen reittiä." };
    fleetIds.add(fleet.id);
  }

  const treatyFactions = new Set();
  for (const treaty of game.player.treaties) {
    if (!isObject(treaty) || !factionIds.has(treaty.factionId) || treatyFactions.has(treaty.factionId) || !["trade", "research"].includes(treaty.type) || !Number.isInteger(treaty.remaining) || treaty.remaining < 1) {
      return { ok: false, reason: "Diplomaattinen sopimus on virheellinen." };
    }
    treatyFactions.add(treaty.factionId);
  }
  if (game.event !== null && (!isObject(game.event) || !EVENTS.some((event) => event.id === game.event.id))) return { ok: false, reason: "Tapahtuman tila on virheellinen." };
  if (!isObject(game.factionWorlds) || [...factionIds].some((id) => !Array.isArray(game.factionWorlds[id]) || new Set(game.factionWorlds[id]).size !== game.factionWorlds[id].length || game.factionWorlds[id].some((systemId) => !systemIds.has(systemId) || game.systems.find((system) => system.id === systemId).owner !== id))) return { ok: false, reason: "Valtioiden tähtialueet ovat virheelliset." };
  return { ok: true, reason: "" };
}

export function loadGame(storage) {
  try {
    const activeStorage = storage ?? globalThis.localStorage;
    if (!activeStorage) return null;
    const text = activeStorage.getItem(SAVE_KEY);
    if (!text) return null;
    const game = JSON.parse(text);
    return validateSave(game).ok ? game : null;
  } catch (error) {
    return null;
  }
}

export function saveGame(game, storage) {
  try {
    const activeStorage = storage ?? globalThis.localStorage;
    if (!activeStorage) return { ok: false, reason: "Tämä selain ei tarjoa paikallistallennusta." };
    const validation = validateSave(game);
    if (!validation.ok) return validation;
    activeStorage.setItem(SAVE_KEY, JSON.stringify(game));
    return { ok: true, reason: "" };
  } catch (error) {
    return { ok: false, reason: "Tallennusta ei voitu kirjoittaa selaimen muistiin." };
  }
}

export function exportSave(game) {
  return JSON.stringify({
    format: "KANTAMA_SAVE",
    exportedAt: new Date().toISOString(),
    game
  }, null, 2);
}

export function parseSave(text) {
  if (typeof text !== "string" || text.length < 2 || text.length > 2_500_000) return { ok: false, reason: "Tallennustiedosto on tyhjä tai liian suuri." };
  try {
    const payload = JSON.parse(text);
    const game = payload && payload.format === "KANTAMA_SAVE" ? payload.game : payload;
    const validation = validateSave(game);
    if (!validation.ok) return validation;
    return { ok: true, game, reason: "" };
  } catch (error) {
    return { ok: false, reason: "Tiedosto ei sisällä kelvollista JSON-tallennusta." };
  }
}
