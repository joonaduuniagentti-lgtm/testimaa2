const WIDTH = 1100;
const HEIGHT = 760;

function esc(value) {
  return String(value).replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
}

function factionColor(game, owner) {
  if (owner === "player") return "#e6c57c";
  return game.factions.find((faction) => faction.id === owner)?.color || "#789099";
}

function systemRadius(system, selected) {
  if (selected) return 9;
  if (system.colony) return system.owner === "player" ? 7 : 6;
  return system.discovered ? 4.4 : 2.1;
}

export function mountGalaxyMap(root, game, onSelect) {
  const systems = game.systems;
  const selectedId = game.ui.selectedSystemId;
  const view = { x: 0, y: 0, width: WIDTH, height: HEIGHT };
  let drag = null;
  const knownIds = new Set(systems.filter((system) => system.discovered).map((system) => system.id));
  const edgeSet = new Set();
  systems.forEach((system) => system.neighbors.forEach((neighbor) => {
    if (knownIds.has(system.id) && knownIds.has(neighbor)) edgeSet.add([system.id, neighbor].sort().join("|"));
  }));
  const lines = Array.from(edgeSet).map((key) => {
    const [leftId, rightId] = key.split("|");
    const left = systems.find((system) => system.id === leftId);
    const right = systems.find((system) => system.id === rightId);
    return `<line x1="${left.x}" y1="${left.y}" x2="${right.x}" y2="${right.y}" class="map-route ${left.owner === "player" && right.owner === "player" ? "route-owned" : ""}"/>`;
  }).join("");
  const nodes = systems.map((system) => {
    const selected = system.id === selectedId;
    const color = factionColor(game, system.owner);
    const radius = systemRadius(system, selected);
    const label = system.discovered ? `<text x="${system.x + 12}" y="${system.y + 4}" class="map-label ${selected ? "is-selected" : ""}">${esc(system.name)}</text>` : "";
    const ring = system.colony ? `<circle cx="${system.x}" cy="${system.y}" r="${radius + 4}" class="colony-ring" stroke="${color}"/>` : "";
    const halo = selected ? `<circle cx="${system.x}" cy="${system.y}" r="18" class="map-halo"/>` : "";
    return `<g class="map-node ${system.discovered ? "is-known" : "is-hidden"} ${selected ? "is-selected" : ""}" data-system="${system.id}" tabindex="${system.discovered ? "0" : "-1"}" role="button" aria-label="${esc(system.discovered ? system.name : "Tuntematon järjestelmä")}">${halo}${ring}<circle cx="${system.x}" cy="${system.y}" r="${radius}" fill="${system.discovered ? color : "#68808a"}" class="map-star"/>${label}</g>`;
  }).join("");
  root.innerHTML = `<svg class="galaxy-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="group" aria-label="Tähtikartta. Zoomaa vierittämällä ja siirrä vetämällä."><defs><radialGradient id="mapGlow"><stop offset="0" stop-color="#1c4750" stop-opacity=".55"/><stop offset="1" stop-color="#081518" stop-opacity="0"/></radialGradient><pattern id="mapGrid" width="88" height="88" patternUnits="userSpaceOnUse"><path d="M 88 0 L 0 0 0 88" fill="none" stroke="#8bb4b1" stroke-opacity=".055" stroke-width="1"/><circle cx="1" cy="1" r="1" fill="#b5d9ce" fill-opacity=".12"/></pattern></defs><rect width="${WIDTH}" height="${HEIGHT}" fill="#091619"/><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#mapGlow)"/><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#mapGrid)"/><g class="map-stars-bg">${Array.from({ length: 60 }, (_, index) => `<circle cx="${(index * 131 + 39) % WIDTH}" cy="${(index * 79 + 21) % HEIGHT}" r="${index % 9 === 0 ? 1.6 : 0.8}" fill="#d6e4d8" opacity="${index % 3 === 0 ? ".34" : ".16"}"/>`).join("")}</g><g class="map-content">${lines}${nodes}</g></svg>`;
  const svg = root.querySelector("svg");
  const content = root.querySelector(".map-content");
  const applyView = () => content.setAttribute("transform", `translate(${-view.x * WIDTH / view.width} ${-view.y * HEIGHT / view.height}) scale(${WIDTH / view.width} ${HEIGHT / view.height})`);
  const getPoint = (event) => {
    const rect = svg.getBoundingClientRect();
    return { x: view.x + ((event.clientX - rect.left) / rect.width) * view.width, y: view.y + ((event.clientY - rect.top) / rect.height) * view.height };
  };
  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const point = getPoint(event);
    const factor = event.deltaY < 0 ? 0.84 : 1.19;
    const width = Math.min(WIDTH, Math.max(340, view.width * factor));
    const height = width * HEIGHT / WIDTH;
    const scale = width / view.width;
    view.x = Math.max(0, Math.min(WIDTH - width, point.x - (point.x - view.x) * scale));
    view.y = Math.max(0, Math.min(HEIGHT - height, point.y - (point.y - view.y) * scale));
    view.width = width;
    view.height = height;
    applyView();
  }, { passive: false });
  svg.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".map-node")) return;
    drag = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const rect = svg.getBoundingClientRect();
    view.x = Math.max(0, Math.min(WIDTH - view.width, drag.viewX - (event.clientX - drag.x) / rect.width * view.width));
    view.y = Math.max(0, Math.min(HEIGHT - view.height, drag.viewY - (event.clientY - drag.y) / rect.height * view.height));
    applyView();
  });
  svg.addEventListener("pointerup", () => { drag = null; });
  svg.addEventListener("pointercancel", () => { drag = null; });
  root.querySelectorAll(".map-node").forEach((node) => {
    node.addEventListener("click", () => onSelect(node.dataset.system));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(node.dataset.system); }
    });
  });
}
