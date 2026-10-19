(() => {
  "use strict";

  const STORAGE_KEY = "tahtisaari.state.v1";
  const TOTAL_FINDS = 5;
  const MOODS = {
    tyyni: {
      name: "Tyyni", title: "TYVEN", weather: "Tyyni yö", accent: "#9de1d0",
      skyTop: "#142b36", skyBottom: "#557b78", sea: "#142e36", seaLight: "#4b8580",
      island: "#302f39", islandLight: "#596c62", land: "#6d957b", landDark: "#355848",
      foliage: "#aecb96", star: "#e1f3d9", moon: "#f2e5b8", haze: "rgba(110, 193, 165, .14)"
    },
    utelias: {
      name: "Utelias", title: "UTELIAAN", weather: "Aamunkoiton henkäys", accent: "#f5bc91",
      skyTop: "#302945", skyBottom: "#a86f77", sea: "#392e43", seaLight: "#bd8b83",
      island: "#4a3440", islandLight: "#8c5b63", land: "#c48a72", landDark: "#764957",
      foliage: "#e5b984", star: "#fff0cf", moon: "#ffdea6", haze: "rgba(255, 190, 143, .15)"
    },
    kipina: {
      name: "Kipinä", title: "KIPINÖIVÄN", weather: "Kultainen hämärä", accent: "#f2c681",
      skyTop: "#33273a", skyBottom: "#b05f5b", sea: "#302b3b", seaLight: "#bd7762",
      island: "#45313b", islandLight: "#81534c", land: "#ce9563", landDark: "#76453f",
      foliage: "#e1b477", star: "#ffe8ba", moon: "#ffe0a0", haze: "rgba(255, 174, 111, .16)"
    },
    usva: {
      name: "Usva", title: "USVAISEN", weather: "Sumun takaa", accent: "#c7d8ad",
      skyTop: "#1f303c", skyBottom: "#81928b", sea: "#243840", seaLight: "#829d91",
      island: "#354046", islandLight: "#64746c", land: "#8ca18b", landDark: "#4b665d",
      foliage: "#c5d0a7", star: "#ecf1d9", moon: "#e6e2c2", haze: "rgba(193, 220, 197, .15)"
    }
  };

  const ISLAND_NAMES = [
    "Kuun viimeinen ranta", "Tuulen pieni puutarha", "Sammaleen maailmanlaita",
    "Aamun hidas saari", "Hiljaisten aaltojen koti", "Kaukaisen valon satama",
    "Pienen sateen niemeke", "Keskiyön yrttimaa", "Sateenkaaren takapiha",
    "Valon reunalla", "Näkymättömän kartan saari", "Hohteen lepokallio",
    "Kimaltelevan veden takana", "Tähtien välinen piha", "Päivän ensimmäinen polku",
    "Yöperhosten niitty", "Kelluvan sumun koti", "Meren hiljainen tasku"
  ];

  const DISCOVERIES = [
    { id: "sammalviesti", symbol: "❋", title: "Sammaleen viesti", text: "Kiven alla kasvaa sammalta, joka muistaa jokaisen saarella kulkeneen askeleen. Tämä on sen ensimmäinen kevät.", prompt: "Millaisen pienen asian haluaisit itse muistaa?" },
    { id: "merilasi", symbol: "◇", title: "Merenlasin ikkuna", text: "Aalto on hionut lasista sileän. Kun katsot sen läpi, meri näyttää hetken melkein taivaalta.", prompt: "Mikä sai sinut viimeksi pysähtymään katsomaan?" },
    { id: "pilvenpesä", symbol: "☁", title: "Pilven pesä", text: "Pieni pilvi on tehnyt pesän korkeimman kuusen oksalle. Aamulla se lähtee taas vaeltamaan.", prompt: "Minne pilvi mahtaisi seuraavaksi kulkea?" },
    { id: "kulkukivi", symbol: "⬡", title: "Kulkukivi", text: "Kiven kylkeen on piirretty reitti, joka ei vie minnekään tiettyyn. Se tekee siitä juuri oikean reitin.", prompt: "Mikä olisi mukava suunta ilman päämäärää?" },
    { id: "kuutamolampi", symbol: "◌", title: "Kuutamolampi", text: "Lammen pinnalla kelluu kaksi kuuta. Toinen niistä on varmasti jonkun unohtama peili.", prompt: "Mitä haluaisit nähdä tänään vähän eri valossa?" },
    { id: "pohjatuuli", symbol: "〰", title: "Pohjatuulen sävel", text: "Tuuli soittaa rantakaisloja kuin pientä orkesteria, jonka yleisönä ovat vain yökulkijat.", prompt: "Mikä ääni kuuluu sinun omaan iltaasi?" },
    { id: "kuoriposti", symbol: "✉", title: "Kuoren sisällä", text: "Auki napsahtaneen simpukan sisällä lepää tyhjä postikortti. Takana lukee vain: tänne pääsee takaisin.", prompt: "Kenelle haluaisit lähettää postikortin saarelta?" },
    { id: "lyhty", symbol: "✧", title: "Lyhdyn siemen", text: "Hiekkaan on pudonnut siemen, joka säteilee himmeästi. Jos sen istuttaa, ehkä koko ranta saa oman tähtitaivaan.", prompt: "Mitä pientä hyvää voisi kasvaa tästä hetkestä?" },
    { id: "majakka", symbol: "✹", title: "Majakan salaisuus", text: "Kallion takana oli koko ajan pieni majakka. Viisi löytöäsi sytytti sen ikkunat yksi kerrallaan. Nyt sen lämmin valo näyttää tien kotiin.", prompt: "Vie mukanasi yksi asia, joka tuntui hyvältä." }
  ];

  const DISCOVERY_BY_ID = Object.fromEntries(DISCOVERIES.map((item) => [item.id, item]));
  const REGULAR_IDS = DISCOVERIES.slice(0, -1).map((item) => item.id);
  const SECRET_ID = "majakka";
  const moodButtons = Array.from(document.querySelectorAll("[data-mood]"));
  const exploreButton = document.querySelector("[data-explore]");
  const newIslandButton = document.querySelector("[data-new-island]");
  const canvas = document.querySelector("[data-canvas]");
  const journalDialog = document.querySelector("[data-journal-dialog]");
  const journalList = document.querySelector("[data-journal-list]");
  const journalEmpty = document.querySelector("[data-journal-empty]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function hashSeed(value) {
    const source = String(value);
    let hash = 2166136261;
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function makeRandom(seed) {
    let value = hashSeed(seed) || 1;
    return function random() {
      value += 0x6d2b79f5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeSeed() {
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        const values = new Uint32Array(2);
        window.crypto.getRandomValues(values);
        return values[0].toString(36) + values[1].toString(36);
      }
    } catch (error) {
      // File URLs and privacy settings can disable the secure random source.
    }
    return Math.floor(Math.random() * 0xffffffff).toString(36) + Date.now().toString(36);
  }

  function shuffle(items, random) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const other = Math.floor(random() * (i + 1));
      const saved = result[i];
      result[i] = result[other];
      result[other] = saved;
    }
    return result;
  }

  function createIsland(moodId) {
    const seed = makeSeed();
    const random = makeRandom(seed);
    const order = shuffle(REGULAR_IDS, random).slice(0, 4);
    order.push(SECRET_ID);
    return {
      id: Date.now().toString(36) + "-" + seed,
      seed: seed,
      name: ISLAND_NAMES[Math.floor(random() * ISLAND_NAMES.length)],
      moodId: MOODS[moodId] ? moodId : "tyyni",
      order: order,
      step: 0
    };
  }

  function createInitialState() {
    return {
      version: 1,
      current: createIsland("tyyni"),
      worldCount: 1,
      journal: []
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || saved.version !== 1 || !saved.current) return createInitialState();
      const moodId = MOODS[saved.current.moodId] ? saved.current.moodId : "tyyni";
      const orderIsValid = Array.isArray(saved.current.order) && saved.current.order.length === TOTAL_FINDS && saved.current.order.every((id) => Boolean(DISCOVERY_BY_ID[id]));
      return {
        version: 1,
        current: {
          id: typeof saved.current.id === "string" ? saved.current.id : makeSeed(),
          seed: typeof saved.current.seed === "string" ? saved.current.seed : makeSeed(),
          name: typeof saved.current.name === "string" ? saved.current.name : "Tähtien välinen piha",
          moodId: moodId,
          order: orderIsValid ? saved.current.order : createIsland(moodId).order,
          step: Math.max(0, Math.min(TOTAL_FINDS, Number(saved.current.step) || 0))
        },
        worldCount: Math.max(1, Number(saved.worldCount) || 1),
        journal: Array.isArray(saved.journal) ? saved.journal.filter((entry) => entry && DISCOVERY_BY_ID[entry.discoveryId] && typeof entry.title === "string").slice(0, 300) : []
      };
    } catch (error) {
      return createInitialState();
    }
  }

  const state = loadState();
  let saveFailed = false;

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      saveFailed = false;
    } catch (error) {
      if (!saveFailed) announce("Tallennus ei ole käytettävissä tässä selaimessa. Retki jatkuu, kunnes suljet sivun.");
      saveFailed = true;
    }
  }

  function announce(message) {
    const region = document.querySelector("[data-announcement]");
    if (!region) return;
    region.textContent = "";
    window.setTimeout(() => { region.textContent = message; }, 20);
  }

  function formatIslandNumber(number) {
    return String(number).padStart(2, "0");
  }

  function updateMoodAccent() {
    const mood = MOODS[state.current.moodId] || MOODS.tyyni;
    document.documentElement.style.setProperty("--accent", mood.accent);
  }

  function renderDiscoveryCard(item, step) {
    const card = document.querySelector("[data-discovery-card]");
    card.classList.toggle("is-secret", item.id === SECRET_ID);
    document.querySelector("[data-discovery-symbol]").textContent = item.symbol;
    document.querySelector("[data-discovery-eyebrow]").textContent = item.id === SECRET_ID ? "SALAINEN VIIDES LÖYTÖ" : "LÖYTÖ " + String(step).padStart(2, "0") + " / 05";
    document.querySelector("[data-discovery-title]").textContent = item.title;
    document.querySelector("[data-discovery-text]").textContent = item.text + " " + item.prompt;
  }

  function render() {
    const world = state.current;
    const mood = MOODS[world.moodId] || MOODS.tyyni;
    const found = Math.min(TOTAL_FINDS, world.step);
    updateMoodAccent();

    moodButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.mood === world.moodId));
    });

    document.querySelector("[data-world-count]").textContent = "Saari " + formatIslandNumber(state.worldCount);
    document.querySelector("[data-world-index]").textContent = "SAARI " + formatIslandNumber(state.worldCount);
    document.querySelector("[data-mood-label]").textContent = mood.title;
    document.querySelector("[data-world-name]").textContent = world.name;
    document.querySelector("[data-weather]").textContent = mood.weather;
    document.querySelector("[data-progress-label]").textContent = found + " / " + TOTAL_FINDS;
    document.querySelector("[data-progress]").setAttribute("aria-valuenow", String(found));
    document.querySelector("[data-progress-fill]").style.width = ((found / TOTAL_FINDS) * 100) + "%";
    document.querySelector("[data-world-rule]").style.width = (31 + found * 10) + "px";
    document.querySelector("[data-journal-count]").textContent = String(state.journal.length);

    for (let index = 0; index < TOTAL_FINDS; index += 1) {
      const dot = document.querySelector('[data-progress-dot="' + index + '"]');
      dot.classList.toggle("is-found", index < found);
    }

    if (found === 0) {
      renderDiscoveryCard({ id: "start", symbol: "✦", title: "Saari odottaa.", text: "Viisi pientä löytöä on jo matkalla sinua kohti." }, 0);
      document.querySelector("[data-discovery-eyebrow]").textContent = "ENSIMMÄINEN ASKEL";
    } else {
      const previousId = world.order[found - 1];
      renderDiscoveryCard(DISCOVERY_BY_ID[previousId], found);
    }

    exploreButton.disabled = found >= TOTAL_FINDS;
    exploreButton.querySelector(".primary-button__text").textContent = found >= TOTAL_FINDS ? "Kaikki ihmeet löytyivät" : found === 0 ? "Astu saarelle" : "Etsi seuraava ihme";
    renderJournal();
    requestSceneRender();
  }

  function selectMood(moodId) {
    if (!MOODS[moodId] || state.current.moodId === moodId) return;
    state.current.moodId = moodId;
    saveState();
    render();
    announce("Tunnelma vaihtui: " + MOODS[moodId].name + ".");
  }

  function discoverNext() {
    const world = state.current;
    if (world.step >= TOTAL_FINDS) return;
    const item = DISCOVERY_BY_ID[world.order[world.step]];
    if (!item) return;

    world.step += 1;
    const entry = {
      id: world.id + "-" + world.step,
      islandName: world.name,
      islandNumber: state.worldCount,
      mood: MOODS[world.moodId].name,
      discoveryId: item.id,
      title: item.title,
      text: item.text,
      prompt: item.prompt,
      symbol: item.symbol,
      secret: item.id === SECRET_ID,
      foundAt: new Date().toISOString()
    };
    state.journal.unshift(entry);
    state.journal = state.journal.slice(0, 300);
    saveState();
    render();
    announce(item.title + ". " + item.text);
  }

  function makeNewIsland() {
    state.current = createIsland(state.current.moodId);
    state.worldCount += 1;
    saveState();
    render();
    announce("Uusi saari ilmestyi: " + state.current.name + ".");
  }

  function appendText(parent, tagName, className, value) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = value;
    parent.appendChild(element);
    return element;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fi-FI", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function renderJournal() {
    if (!journalList) return;
    journalList.replaceChildren();
    const empty = state.journal.length === 0;
    journalEmpty.hidden = !empty;
    document.querySelector("[data-journal-summary]").textContent = state.journal.length + (state.journal.length === 1 ? " löytö tallessa" : " löytöä tallessa");
    document.querySelector("[data-export]").disabled = empty;

    state.journal.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "journal-entry" + (entry.secret ? " journal-entry--secret" : "");
      const symbol = appendText(item, "span", "journal-entry__symbol", entry.symbol || "✧");
      symbol.setAttribute("aria-hidden", "true");
      const copy = document.createElement("div");
      appendText(copy, "h3", "", entry.title);
      appendText(copy, "p", "", entry.text + " " + entry.prompt);
      item.appendChild(copy);
      const meta = document.createElement("div");
      meta.className = "journal-entry__meta";
      appendText(meta, "span", "", entry.islandName || "Tähtisaari");
      appendText(meta, "strong", "", entry.secret ? "SALAINEN LÖYTÖ" : "SAARI " + formatIslandNumber(entry.islandNumber || 1));
      appendText(meta, "span", "", formatDate(entry.foundAt));
      item.appendChild(meta);
      journalList.appendChild(item);
    });
  }

  function openJournal() {
    renderJournal();
    if (typeof journalDialog.showModal === "function") journalDialog.showModal();
    else journalDialog.setAttribute("open", "");
  }

  function closeJournal() {
    if (typeof journalDialog.close === "function") journalDialog.close();
    else journalDialog.removeAttribute("open");
  }

  function exportJournal() {
    if (state.journal.length === 0) return;
    const data = {
      title: "Tähtisaaren kenttäkirja",
      exportedAt: new Date().toISOString(),
      currentIsland: state.current.name,
      discoveries: state.journal
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tahtisaari-kenttakirja.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("Kenttäkirjasta ladattiin JSON-kopio.");
  }

  moodButtons.forEach((button) => button.addEventListener("click", () => selectMood(button.dataset.mood)));
  exploreButton.addEventListener("click", discoverNext);
  newIslandButton.addEventListener("click", makeNewIsland);
  document.querySelector("[data-open-journal]").addEventListener("click", openJournal);
  document.querySelector("[data-close-journal]").addEventListener("click", closeJournal);
  document.querySelector("[data-export]").addEventListener("click", exportJournal);
  journalDialog.addEventListener("click", (event) => {
    if (event.target === journalDialog) closeJournal();
  });

  const context = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let sceneCache = null;
  let animationFrame = 0;

  function createSceneCache() {
    const random = makeRandom(state.current.seed);
    const stars = [];
    const trees = [];
    const bubbles = [];
    for (let i = 0; i < 84; i += 1) {
      stars.push({ x: random(), y: random() * 0.58, size: 0.35 + random() * 1.1, phase: random() * Math.PI * 2, alpha: 0.25 + random() * 0.55 });
    }
    for (let i = 0; i < 37; i += 1) {
      trees.push({ x: (random() * 1.62) - 0.81, y: (random() * 0.3) - 0.19, size: 0.52 + random() * 0.82, tone: random() });
    }
    for (let i = 0; i < 23; i += 1) {
      bubbles.push({ x: random(), y: 0.56 + random() * 0.4, length: 5 + random() * 22, phase: random() * Math.PI * 2 });
    }
    const shorePoints = [];
    for (let i = 0; i <= 100; i += 1) {
      const angle = (Math.PI * 2 * i) / 100;
      const roughness = 0.93 + random() * 0.1 + Math.sin(angle * 5 + 0.8) * 0.025 + Math.sin(angle * 9) * 0.015;
      shorePoints.push({ angle: angle, roughness: roughness });
    }
    sceneCache = { seed: state.current.seed, stars: stars, trees: trees, bubbles: bubbles, shorePoints: shorePoints };
  }

  function paintPath(ctx, points, cx, cy, rx, ry) {
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = cx + Math.cos(point.angle) * rx * point.roughness;
      const y = cy + Math.sin(point.angle) * ry * point.roughness;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }

  function drawTriangle(ctx, x, y, width, height, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.lineTo(x - width / 2, y);
    ctx.lineTo(x + width / 2, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawTree(ctx, x, y, size, tone, palette, scale) {
    const height = size * scale * 28;
    ctx.lineCap = "round";
    ctx.strokeStyle = palette.landDark;
    ctx.lineWidth = Math.max(1, size * scale * 1.35);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - height * 0.68);
    ctx.stroke();
    const colors = tone > 0.67 ? [palette.foliage, palette.land, palette.landDark] : [palette.land, palette.landDark, palette.foliage];
    drawTriangle(ctx, x, y - height * 0.44, height * 0.72, height * 0.64, colors[1]);
    drawTriangle(ctx, x, y - height * 0.63, height * 0.57, height * 0.57, colors[0]);
    drawTriangle(ctx, x, y - height * 0.82, height * 0.39, height * 0.48, colors[2]);
    ctx.globalAlpha = 1;
  }

  function drawCloud(ctx, x, y, scale, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(216, 230, 213, .18)";
    ctx.beginPath();
    ctx.ellipse(x, y, 23 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 12 * scale, y - 1 * scale, 11 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 9 * scale, y - 2 * scale, 14 * scale, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLighthouse(ctx, x, y, scale, palette, time) {
    const flicker = 0.83 + (Math.sin(time / 650) + 1) * 0.07;
    ctx.save();
    ctx.shadowColor = palette.moon;
    ctx.shadowBlur = 19 * scale;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = palette.moon;
    ctx.beginPath();
    ctx.moveTo(x, y - 10 * scale);
    ctx.lineTo(x + 95 * scale, y - 34 * scale);
    ctx.lineTo(x + 95 * scale, y - 15 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e7d3a8";
    ctx.fillRect(x - 4 * scale, y - 18 * scale, 9 * scale, 19 * scale);
    ctx.fillStyle = palette.moon;
    ctx.fillRect(x - 5 * scale, y - 20 * scale, 11 * scale, 4 * scale);
    ctx.fillRect(x - 3 * scale, y - 24 * scale, 7 * scale, 4 * scale);
    ctx.fillStyle = palette.landDark;
    ctx.fillRect(x - 8 * scale, y, 17 * scale, 3 * scale);
    ctx.restore();
  }

  function drawScene(time) {
    if (!context || !canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    if (!sceneCache || sceneCache.seed !== state.current.seed) createSceneCache();

    const palette = MOODS[state.current.moodId] || MOODS.tyyni;
    const progress = Math.min(TOTAL_FINDS, state.current.step);
    const scale = Math.min(width / 780, height / 570, 1.35);
    const ctx = context;
    ctx.clearRect(0, 0, width, height);

    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.74);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(0.65, palette.skyBottom);
    sky.addColorStop(1, palette.sea);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * 0.64, height * 0.35, 4, width * 0.64, height * 0.35, width * 0.65);
    glow.addColorStop(0, palette.haze);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    sceneCache.stars.forEach((star, index) => {
      const alpha = star.alpha * (0.76 + 0.24 * Math.sin(time / 1000 + star.phase));
      ctx.globalAlpha = reducedMotion.matches ? star.alpha : alpha;
      ctx.fillStyle = palette.star;
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.size * scale, 0, Math.PI * 2);
      ctx.fill();
      if (index % 17 === 0) {
        ctx.globalAlpha *= 0.65;
        ctx.fillRect(star.x * width - 4 * scale, star.y * height, 8 * scale, 0.55 * scale);
        ctx.fillRect(star.x * width, star.y * height - 4 * scale, 0.55 * scale, 8 * scale);
      }
    });
    ctx.globalAlpha = 1;

    const moonX = width * 0.72;
    const moonY = height * 0.22;
    const moonRadius = Math.max(15, Math.min(width, height) * 0.035);
    const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.6, moonX, moonY, moonRadius * 4.2);
    moonGlow.addColorStop(0, "rgba(247, 225, 178, .22)");
    moonGlow.addColorStop(1, "rgba(247, 225, 178, 0)");
    ctx.fillStyle = moonGlow;
    ctx.fillRect(moonX - moonRadius * 4.2, moonY - moonRadius * 4.2, moonRadius * 8.4, moonRadius * 8.4);
    ctx.fillStyle = palette.moon;
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const horizon = height * 0.61;
    ctx.fillStyle = palette.sea;
    ctx.fillRect(0, horizon, width, height - horizon);
    ctx.fillStyle = palette.island;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(width * 0.78, horizon + height * 0.025, width * 0.17, height * 0.035, 0, 0, Math.PI * 2);
    ctx.ellipse(width * 0.21, horizon + height * 0.038, width * 0.13, height * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = palette.seaLight;
    for (let index = 0; index < 19; index += 1) {
      const y = horizon + 13 * scale + index * (height - horizon) / 20;
      const shift = reducedMotion.matches ? 0 : Math.sin(time / 1700 + index * 0.8) * 7 * scale;
      const start = width * (0.05 + (index % 3) * 0.05) + shift;
      const lineWidth = width * (0.1 + (index % 5) * 0.035);
      ctx.globalAlpha = 0.11 + (index % 4) * 0.025;
      ctx.lineWidth = Math.max(0.5, (index % 3 === 0 ? 1 : 0.55) * scale);
      ctx.beginPath();
      ctx.moveTo(start, y);
      ctx.quadraticCurveTo(start + lineWidth * 0.48, y - 2 * scale, start + lineWidth, y + 0.4 * scale);
      ctx.stroke();
    }

    sceneCache.bubbles.forEach((bubble) => {
      const drift = reducedMotion.matches ? 0 : Math.sin(time / 2100 + bubble.phase) * 5 * scale;
      const x = bubble.x * width;
      const y = bubble.y * height + drift;
      ctx.globalAlpha = 0.11;
      ctx.lineWidth = 0.65 * scale;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + bubble.length * scale, y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    const cx = width * 0.52;
    const rx = Math.min(width * 0.4, height * 0.55);
    const ry = Math.min(height * 0.165, width * 0.145);
    const cy = height * 0.735;
    ctx.save();
    ctx.shadowColor = "rgba(3, 11, 14, .48)";
    ctx.shadowBlur = 30 * scale;
    ctx.shadowOffsetY = 15 * scale;
    paintPath(ctx, sceneCache.shorePoints, cx, cy, rx, ry);
    const islandGradient = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
    islandGradient.addColorStop(0, palette.islandLight);
    islandGradient.addColorStop(0.44, palette.island);
    islandGradient.addColorStop(1, "#18252b");
    ctx.fillStyle = islandGradient;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.2, rx * 0.91, ry * 0.57, 0, 0, Math.PI * 2);
    const topGradient = ctx.createLinearGradient(cx, cy - ry * 0.8, cx, cy + ry * 0.3);
    topGradient.addColorStop(0, palette.land);
    topGradient.addColorStop(1, palette.landDark);
    ctx.fillStyle = topGradient;
    ctx.fill();
    ctx.globalAlpha = 0.36;
    ctx.strokeStyle = palette.foliage;
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.22, rx * 0.72, ry * 0.41, -0.02, Math.PI * 1.04, Math.PI * 1.94);
    ctx.stroke();
    ctx.restore();

    sceneCache.trees.forEach((tree) => {
      const x = cx + tree.x * rx;
      const normalized = Math.min(0.98, Math.abs(tree.x));
      const surface = cy - ry * 0.2 - Math.sqrt(1 - normalized * normalized) * ry * 0.42;
      const y = surface + tree.y * ry;
      if (y > cy + ry * 0.21 || y < cy - ry * 0.78) return;
      drawTree(ctx, x, y, tree.size, tree.tone, palette, scale);
    });

    const pathPoints = [];
    for (let index = 0; index < TOTAL_FINDS; index += 1) {
      const x = cx + (index - 2) * rx * 0.28;
      const normalized = Math.min(0.9, Math.abs((index - 2) * 0.28));
      const y = cy - ry * 0.2 - Math.sqrt(1 - normalized * normalized) * ry * 0.33 + (index % 2 === 0 ? 1 : -1) * ry * 0.035;
      pathPoints.push({ x: x, y: y });
    }
    ctx.save();
    ctx.setLineDash([2.5 * scale, 5 * scale]);
    ctx.lineWidth = 1.15 * scale;
    ctx.strokeStyle = "rgba(245, 236, 192, .46)";
    ctx.beginPath();
    pathPoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.restore();

    pathPoints.forEach((point, index) => {
      const discovered = index < progress;
      const isNext = index === progress && progress < TOTAL_FINDS;
      const radius = (discovered ? 3.5 : isNext ? 3 : 1.7) * scale;
      if (isNext && !reducedMotion.matches) {
        const pulse = 8 + (Math.sin(time / 380) + 1) * 3;
        ctx.strokeStyle = palette.moon;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, pulse * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = discovered || isNext ? palette.moon : "rgba(222, 231, 205, .55)";
      ctx.shadowColor = discovered || isNext ? palette.moon : "transparent";
      ctx.shadowBlur = discovered || isNext ? 10 * scale : 0;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    const flowerCount = Math.min(20, 5 + progress * 3);
    for (let index = 0; index < flowerCount; index += 1) {
      const random = makeRandom(state.current.seed + "-flower-" + index);
      const x = cx + (random() * 1.5 - 0.75) * rx;
      const normalized = Math.min(0.92, Math.abs((x - cx) / rx));
      const y = cy - ry * 0.2 - Math.sqrt(1 - normalized * normalized) * ry * 0.42 + random() * ry * 0.14;
      ctx.fillStyle = index % 3 === 0 ? palette.moon : palette.foliage;
      ctx.globalAlpha = 0.63;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (progress >= TOTAL_FINDS) {
      drawLighthouse(ctx, cx + rx * 0.43, cy - ry * 0.46, scale * 0.9, palette, time);
    } else {
      const glowX = cx + rx * 0.43;
      const glowY = cy - ry * 0.43;
      ctx.fillStyle = palette.moon;
      ctx.globalAlpha = 0.66;
      ctx.beginPath();
      ctx.arc(glowX, glowY, 2 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const cloudX = width * (0.23 + ((time / 150000) % 0.52));
    drawCloud(ctx, cloudX, height * 0.33, scale * 1.2, 0.5);
    drawCloud(ctx, width * 0.28 - (reducedMotion.matches ? 0 : (time / 300000) % 30), height * 0.43, scale * 0.8, 0.32);
  }

  function requestSceneRender() {
    if (!context) return;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    if (reducedMotion.matches) {
      drawScene(0);
      animationFrame = 0;
    } else {
      animationFrame = window.requestAnimationFrame(animate);
    }
  }

  function animate(time) {
    drawScene(time);
    animationFrame = window.requestAnimationFrame(animate);
  }

  function resizeCanvas() {
    if (!canvas || !context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    requestSceneRender();
  }

  if (canvas && context) {
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(resizeCanvas);
      observer.observe(canvas);
    } else {
      window.addEventListener("resize", resizeCanvas);
    }
    if (typeof reducedMotion.addEventListener === "function") reducedMotion.addEventListener("change", requestSceneRender);
    else if (typeof reducedMotion.addListener === "function") reducedMotion.addListener(requestSceneRender);
  }

  render();
  resizeCanvas();
})();
