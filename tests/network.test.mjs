import test from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../server/index.mjs";
import { TestClient } from "./helpers.mjs";

test("sala completa: entrar, iniciar, andar e ver o colega", async () => {
  const instance = await startServer({ port: 0, quiet: true, serveFiles: false });
  const url = `ws://127.0.0.1:${instance.port}/ws`;
  const teacher = new TestClient(url);
  const ana = new TestClient(url);
  const bia = new TestClient(url);
  try {
    await Promise.all([teacher.open(), ana.open(), bia.open()]);
    const created = await teacher.request("create", { name: "Teste", config: { teamCount: 2 } });
    assert.equal(created.code.length, 5);
    await ana.request("join", { code: created.code, name: "Ana" });
    await bia.request("join", { code: created.code, name: "Bia" });
    await assert.rejects(bia.request("start"), /professor/);
    await teacher.request("start");
    await ana.waitFor((m) => m.t === "map");
    const me = await ana.waitFor((m) => m.t === "me" && m.state === "EXPLORING" && m.x > 0);
    await bia.waitFor((m) => m.t === "map");
    // Ana anda: Bia (se estiver perto) ou o professor (minimapa) recebem a nova posição.
    const room = instance.rooms.get(created.code);
    const anaPlayer = [...room.players.values()].find((p) => p.name === "Ana");
    const biaPlayer = [...room.players.values()].find((p) => p.name === "Bia");
    // Coloca as duas lado a lado para testar a área de interesse.
    biaPlayer.x = anaPlayer.x; biaPlayer.y = anaPlayer.y;
    room.markAnchor(biaPlayer);
    await new Promise((resolve) => setTimeout(resolve, 120));
    ana.state.me.tv = anaPlayer.tv;
    const free = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([ix, iy]) => {
      const test = { x: anaPlayer.x, y: anaPlayer.y, dir: "down" };
      return room.grid && (Math.abs(ix) + Math.abs(iy)) && advanceProbe(room, test, ix, iy);
    });
    assert.ok(free, "há uma direção livre");
    ana.move(anaPlayer.x, anaPlayer.y, free[0], free[1]);
    const anchor = await bia.waitFor((m) => Array.isArray(m) && m[0] === 1 && m.includes(anaPlayer.id) && m[m.indexOf(anaPlayer.id) + 3] === free[0] && m[m.indexOf(anaPlayer.id) + 4] === free[1]);
    assert.ok(anchor);
    assert.equal(me.challenge, null);
    const map = await teacher.waitFor((m) => Array.isArray(m) && m[0] === 3);
    assert.ok(map.length >= 2 + 4 * 2);
  } finally {
    teacher.close(); ana.close(); bia.close();
    await instance.close();
  }
});

import { advance } from "../shared/physics.mjs";
function advanceProbe(room, body, ix, iy) {
  return advance(room.grid, body, ix, iy, 148, 0.2);
}
