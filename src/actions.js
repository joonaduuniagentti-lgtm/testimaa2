import { BUILDINGS, EVENTS, FACTIONS, POLICIES, TECHS } from "./data.js";
import { getSystem, ownedSystems } from "./world.js";

export function hasTech(game, techId) {
  return game.player.technologies.includes(techId);
}

export function fleetTravelMonths(game, fleet) {
  if (!fleet?.path?.length) return 0;
  const stride = fleet.role === "survey" && hasTech(game, "survey-lattices") ? 2 : 1;
  return Math.ceil(fleet.path.length / stride);
}

export function expeditionCost(game, routeLength) {
  const discount = hasTech(game, "folded-space") ? 1 : 0;
  return {
    fuel: Math.max(2, routeLength * (2 - discount)),
    credits: 4 + routeLength * 2
  };
}

export function colonizationCost(game) {
  const discount = hasTech(game, "colony-charters") ? 10 : 0;
  return {
    credits: Math.max(25, 48 - discount - game.player.colonizationBonus * 4),
    alloys: Math.max(24, 38 - discount),
    fuel: 8
  };
}

export function buildingUpgrade(game, system, buildingId) {
  const building = BUILDINGS.find((item) => item.id === buildingId);
  if (!building || !system) return null;
  const level = Number(system.buildings?.[buildingId]) || 0;
  const multiplier = 1 + level * 0.7;
  const cost = Object.fromEntries(Object.entries(building.cost).map(([key, amount]) => [key, Math.ceil(amount * multiplier)]));
  const outputMultiplier = buildingId === "foundry" && hasTech(game, "orbital-foundries") ? 1.35 : 1;
  const output = Object.fromEntries(Object.entries(building.output).map(([key, amount]) => [key, amount * outputMultiplier]));
  // Closed ecologies add a colony-wide bonus when the first farm appears;
  // subsequent farm levels only add their own base output.
  if (buildingId === "farm" && level === 0 && hasTech(game, "closed-ecologies")) output.food += 3;
  return { level, cost, output, populationGrowth: buildingId === "habitat" ? 0.16 : 0 };
}

export function defenseFleetCost(game) {
  return { credits: 54, alloys: Math.max(18, 36 - (hasTech(game, "modular-hulls") ? 6 : 0)) };
}

export function colonyShipCost(game) {
  return hasTech(game, "modular-hulls") ? { credits: 42, alloys: 24 } : { credits: 52, alloys: 32 };
}

export function researchStatus(game, tech) {
  if (hasTech(game, tech.id)) return "researched";
  if (tech.prereq.every((id) => hasTech(game, id))) return "available";
  return "locked";
}

export function shortestRoute(game, startId, targetId) {
  if (startId === targetId) return [];
  const queue = [startId];
  const previous = new Map([[startId, null]]);
  while (queue.length) {
    const currentId = queue.shift();
    const current = getSystem(game, currentId);
    if (!current) continue;
    for (const neighborId of current.neighbors) {
      if (previous.has(neighborId)) continue;
      const neighbor = getSystem(game, neighborId);
      if (!neighbor || (!neighbor.discovered && neighborId !== targetId)) continue;
      previous.set(neighborId, currentId);
      if (neighborId === targetId) {
        const route = [targetId];
        let cursor = currentId;
        while (cursor !== startId && cursor !== null) {
          route.push(cursor);
          cursor = previous.get(cursor);
        }
        route.push(startId);
        route.reverse();
        return route.slice(1);
      }
      queue.push(neighborId);
    }
  }
  return null;
}

export function canAffordResources(game, cost) {
  return Object.entries(cost).every(([key, amount]) => game.player.resources[key] >= amount);
}

function spend(game, cost) {
  Object.entries(cost).forEach(([key, amount]) => {
    game.player.resources[key] = Math.max(0, game.player.resources[key] - amount);
  });
}

function addLog(game, type, title, text) {
  game.log.unshift({ turn: game.turn, year: game.year, month: game.month, type, title, text });
  game.log = game.log.slice(0, 100);
}

function fail(message) {
  return { ok: false, message };
}

function succeed(message) {
  return { ok: true, message };
}

export function beginExpedition(game, systemId) {
  const system = getSystem(game, systemId);
  if (!system) return fail("Järjestelmää ei löydy kartalta.");
  if (system.discovered) return fail("Tämä järjestelmä on jo kartoitettu.");
  const fleet = game.player.fleets.find((candidate) => candidate.role === "survey" && candidate.path.length === 0);
  if (!fleet) return fail("Kaikki retkikunnat ovat jo matkalla.");
  const route = shortestRoute(game, fleet.systemId, systemId);
  if (!route || route.length === 0) return fail("Kohteeseen ei löydy tunnettua väylää.");
  const cost = expeditionCost(game, route.length);
  if (!canAffordResources(game, cost)) return fail("Retkikunta tarvitsee lisää polttoainetta tai krediittejä.");

  spend(game, cost);
  fleet.path = route.slice();
  fleet.destination = systemId;
  fleet.status = "matkalla";
  const eta = fleetTravelMonths(game, fleet);
  addLog(game, "expedition", "Retkikunta lähti", "Pohjantähti suuntaa tuntemattomaan järjestelmään. Arvioitu matka: " + eta + " kk.");
  return succeed("Pohjantähti lähti tutkimusretkelle. Arvioitu saapuminen " + eta + " kk kuluttua.");
}

export function colonizeSystem(game, systemId) {
  const system = getSystem(game, systemId);
  if (!system) return fail("Järjestelmää ei löydy kartalta.");
  if (!system.discovered) return fail("Järjestelmä pitää kartoittaa ennen asutusta.");
  if (system.owner) return fail("Järjestelmällä on jo omistaja.");
  const habitabilityBonus = hasTech(game, "biosphere-worlds") ? 0.16 : 0;
  if (system.habitability + habitabilityBonus < 0.4) return fail("Maailma ei vielä kestä pysyvää asutusta.");
  if (game.player.colonyShips <= 0) return fail("Uusia siirtokuntalaivoja ei ole jäljellä.");
  const cost = colonizationCost(game);
  if (!canAffordResources(game, cost)) return fail("Siirtokunnan perustaminen vaatii lisää krediittejä, seoksia tai polttoainetta.");

  spend(game, cost);
  game.player.colonyShips -= 1;
  system.owner = "player";
  system.colony = true;
  system.population = 1.1;
  system.stability = 68;
  system.buildings = { farm: 1 };
  system.discovered = true;
  game.player.colonizationBonus = Math.max(0, game.player.colonizationBonus - 1);
  addLog(game, "colony", "Uusi siirtokunta: " + system.name, "Ensimmäinen asutusalus on laskeutunut planeetalle " + system.planetName + ".");
  return succeed(system.name + " liittyi tähtirintamaamme.");
}

export function buildBuilding(game, systemId, buildingId) {
  const system = getSystem(game, systemId);
  const building = BUILDINGS.find((item) => item.id === buildingId);
  if (!system || !building) return fail("Rakennusohjetta ei löydy.");
  if (system.owner !== "player" || !system.colony) return fail("Rakentamiseen tarvitaan oma siirtokunta.");
  const upgrade = buildingUpgrade(game, system, buildingId);
  const level = upgrade.level;
  if (level >= building.maxLevel) return fail("Rakennus on jo enimmäistasollaan.");
  if (!canAffordResources(game, upgrade.cost)) return fail("Rakentamiseen tarvitaan lisää resursseja.");

  spend(game, upgrade.cost);
  system.buildings[buildingId] = level + 1;
  addLog(game, "construction", building.name + " rakennettu", system.name + " saavutti tason " + (level + 1) + ".");
  return succeed(building.name + " valmistui kohteessa " + system.name + ".");
}

export function startResearch(game, techId) {
  const tech = TECHS.find((item) => item.id === techId);
  if (!tech) return fail("Tutkimushanketta ei löydy.");
  const status = researchStatus(game, tech);
  if (status === "researched") return fail("Teknologia on jo käytössä.");
  if (status === "locked") return fail("Tutki ensin vaaditut teknologiat.");
  if (game.player.researchId === techId) return fail("Tämä tutkimus on jo käynnissä.");
  if (game.player.researchId) game.player.researchProgressById[game.player.researchId] = game.player.researchProgress;
  game.player.researchId = techId;
  game.player.researchProgress = Number(game.player.researchProgressById[techId]) || 0;
  addLog(game, "research", "Tutkimus alkaa: " + tech.name, tech.summary);
  return succeed("Tutkimusasema aloitti hankkeen " + tech.name + ".");
}

export function setPolicy(game, policyId) {
  const policy = POLICIES.find((item) => item.id === policyId);
  if (!policy) return fail("Hallintomallia ei löydy.");
  if (game.player.policy === policyId) return fail("Tämä linja on jo käytössä.");
  game.player.policy = policyId;
  addLog(game, "policy", "Hallintolinja vaihtui", "Uusi painotus: " + policy.name + ".");
  return succeed("Hallintolinja on nyt " + policy.name + ".");
}

export function sendEnvoy(game, factionId) {
  const faction = game.factions.find((item) => item.id === factionId);
  if (!faction) return fail("Valtiota ei löydy.");
  if (game.player.resources.influence < 7) return fail("Lähetystö tarvitsee vähintään 7 vaikutusvaltaa.");
  game.player.resources.influence -= 7;
  const bonus = hasTech(game, "mutual-aid") ? 20 : 14;
  game.player.relations[factionId] = Math.min(100, game.player.relations[factionId] + bonus);
  addLog(game, "diplomacy", "Lähetystö saapui: " + faction.short, "Valtiot aloittivat keskustelun uudelleen.");
  return succeed("Lähettiläs lähti tapaamaan valtiota " + faction.name + ".");
}

export function proposeTreaty(game, factionId, type) {
  const faction = game.factions.find((item) => item.id === factionId);
  if (!faction || !["trade", "research"].includes(type)) return fail("Sopimustyyppiä ei tunneta.");
  if (game.player.treaties.some((treaty) => treaty.factionId === factionId)) return fail("Valtioiden välillä on jo aktiivinen sopimus.");
  const relation = game.player.relations[factionId];
  const threshold = Math.max(18, (type === "research" ? 38 : 28) - (hasTech(game, "commonwealth") ? 10 : 0));
  if (relation < threshold) return fail("Sopimus vaatii paremmat välit. Lähetä ensin lähettiläs.");
  const cost = type === "trade" ? { credits: 18, influence: 10 } : { credits: 12, influence: 16 };
  if (!canAffordResources(game, cost)) return fail("Valtion kassassa ei ole sopimukseen vaadittavaa summaa.");
  spend(game, cost);
  const duration = (type === "trade" ? 18 : 24) + (hasTech(game, "interstellar-law") ? 2 : 0);
  game.player.treaties.push({ factionId, type, remaining: duration });
  game.player.relations[factionId] = Math.min(100, relation + 8);
  addLog(game, "treaty", type === "trade" ? "Kauppasopimus" : "Tutkimusliitto", "Sopimus solmittiin valtion " + faction.name + " kanssa " + duration + " kuukaudeksi.");
  return succeed(type === "trade" ? "Kauppareitti avattiin." : "Tutkimusliitto allekirjoitettiin.");
}

export function buildFleet(game, systemId) {
  const system = getSystem(game, systemId);
  if (!system || system.owner !== "player" || !system.colony) return fail("Laivue tarvitsee oman siirtokunnan telakan.");
  const cost = defenseFleetCost(game);
  if (!canAffordResources(game, cost)) return fail("Laivueen rakentaminen vaatii lisää krediittejä ja seoksia.");
  spend(game, cost);
  const number = game.player.fleets.filter((fleet) => fleet.role === "defense").length + 1;
  game.player.fleets.push({
    id: "fleet-guard-" + String(game.turn) + "-" + String(number),
    name: "Vartio " + String(number).padStart(2, "0"),
    role: "defense", ships: 2, systemId, path: [], destination: null, status: "valmistui", strength: 10
  });
  addLog(game, "fleet", "Uusi laivue valmistui", "Vartio " + String(number).padStart(2, "0") + " liittyi järjestelmän " + system.name + " puolustukseen.");
  return succeed("Uusi laivue on valmis.");
}

export function buildColonyShip(game, systemId) {
  const system = getSystem(game, systemId);
  if (!system || system.owner !== "player" || !system.colony) return fail("Asutusalus tarvitsee oman siirtokunnan telakan.");
  const cost = colonyShipCost(game);
  if (!canAffordResources(game, cost)) return fail("Asutusalus vaatii lisää krediittejä ja seoksia.");
  spend(game, cost);
  game.player.colonyShips += 1;
  addLog(game, "fleet", "Asutusalus valmistui", "Uusi asutusalus odottaa järjestelmässä " + system.name + ".");
  return succeed("Asutusalus on valmis. Seuraava siirtokunta voi lähteä.");
}

export function moveFleet(game, fleetId, targetSystemId) {
  const fleet = game.player.fleets.find((item) => item.id === fleetId);
  const target = getSystem(game, targetSystemId);
  if (!fleet || !target || !target.discovered) return fail("Laivue tai tunnettu kohde puuttuu.");
  if (fleet.path.length) return fail("Laivue on jo matkalla.");
  const route = shortestRoute(game, fleet.systemId, targetSystemId);
  if (!route || route.length === 0) return fail("Laivue on jo kohteessa tai reittiä ei löydy.");
  const cost = { fuel: Math.max(1, route.length * 2) };
  if (!canAffordResources(game, cost)) return fail("Laivue tarvitsee lisää polttoainetta.");
  spend(game, cost);
  fleet.path = route;
  fleet.destination = targetSystemId;
  fleet.status = "siirtymässä";
  addLog(game, "fleet", fleet.name + " lähti", "Laivue suuntaa järjestelmään " + target.name + ".");
  return succeed(fleet.name + " lähti liikkeelle.");
}

export function eventChoiceAvailable(game, choice) {
  return Object.entries(choice.effects.resources || {}).every(([key, amount]) => amount >= 0 || game.player.resources[key] >= Math.abs(amount));
}

export function hasAvailableEventChoice(game, event) {
  return Boolean(event?.choices?.some((choice) => eventChoiceAvailable(game, choice)));
}

export const EMERGENCY_EVENT_CHOICE_ID = "emergency-resolution";

export function resolveEvent(game, choiceId) {
  if (!game.event) return fail("Ei ratkaistavaa tapahtumaa.");
  const event = EVENTS.find((item) => item.id === game.event.id);
  if (!event) return fail("Tapahtumaa ei löydy.");
  if (choiceId === EMERGENCY_EVENT_CHOICE_ID) {
    if (hasAvailableEventChoice(game, event)) return fail("Kriisipäätös on käytettävissä vasta, kun tavalliset ratkaisut eivät ole mahdollisia.");
    game.player.globalStability = Math.max(0, game.player.globalStability - 5);
    ownedSystems(game).forEach((system) => {
      system.stability = Math.max(0, system.stability - 4);
    });
    game.event = null;
    addLog(game, "event", event.title, "Neuvosto lykkäsi ratkaisua resurssipulan vuoksi. Yhteiskunnallinen vakaus heikkeni.");
    return succeed("Kriisipäätös kirjattiin. Tapahtuma ei enää estä seuraavaa vuoroa.");
  }
  const choice = event && event.choices.find((item) => item.id === choiceId);
  if (!event || !choice) return fail("Tapahtumavalintaa ei löydy.");
  if (!eventChoiceAvailable(game, choice)) return fail("Valinnassa vaadittavaa resurssia ei ole riittävästi.");

  const effects = choice.effects;
  Object.entries(effects.resources || {}).forEach(([key, amount]) => {
    game.player.resources[key] = Math.max(0, game.player.resources[key] + amount);
  });
  if (effects.stability) {
    game.player.globalStability = Math.max(0, Math.min(100, game.player.globalStability + effects.stability));
    ownedSystems(game).forEach((system) => {
      system.stability = Math.max(0, Math.min(100, system.stability + effects.stability));
    });
  }
  if (effects.relations) {
    Object.keys(game.player.relations).forEach((factionId) => {
      game.player.relations[factionId] = Math.max(-100, Math.min(100, game.player.relations[factionId] + effects.relations));
    });
  }
  if (effects.colonization) game.player.colonyShips += effects.colonization;
  game.event = null;
  addLog(game, "event", event.title, "Neuvosto valitsi: " + choice.title + ". " + choice.detail + ".");
  return succeed("Valinta rekisteröitiin: " + choice.title + ".");
}

export function treatyFor(game, factionId) {
  return game.player.treaties.find((treaty) => treaty.factionId === factionId) || null;
}

export function buildingFor(buildingId) {
  return BUILDINGS.find((building) => building.id === buildingId) || null;
}

export function factionDefinition(factionId) {
  return FACTIONS.find((faction) => faction.id === factionId) || null;
}
