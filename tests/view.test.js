import test from "node:test";
import assert from "node:assert/strict";
import { SCREEN_DEFS } from "../src/data.js";
import { renderApp } from "../src/view.js";
import { createGame } from "../src/world.js";

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
