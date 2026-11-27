// Teste de carga: professor + N robôs numa sala, mede CPU do servidor, banda e correções.
// Uso: LAB_DEBUG=1 node server/index.mjs   (em outro terminal)
//      node scripts/load.mjs --bots 23 --seconds 120 [--http http://localhost:3000]
import WebSocket from "ws";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, list) => (value.startsWith("--") ? [...pairs, [value.slice(2), list[index + 1]]] : pairs), []));
const http = args.http || "http://localhost:3000";
const bots = Number(args.bots || 23);
const seconds = Number(args.seconds || 120);
const health = async () => (await fetch(`${http}/health`)).json();

const origin = args.origin || "http://localhost:3000";
const teacher = new WebSocket(`${http.replace(/^http/, "ws")}/ws`, { headers: { origin } });
let rid = 0;
const pending = new Map();
let teacherBytes = 0;
teacher.on("message", (raw) => { teacherBytes += raw.length; const m = JSON.parse(raw.toString()); if (m.t === "ack") { pending.get(m.rid)?.(m); pending.delete(m.rid); } });
const request = (t, payload = {}) => new Promise((ok, fail) => { const id = ++rid; pending.set(id, (m) => (m.ok ? ok(m) : fail(new Error(m.error)))); teacher.send(JSON.stringify({ t, rid: id, ...payload })); });
await new Promise((resolve) => teacher.on("open", resolve));
const { code } = await request("create", { name: "Carga", config: { teamCount: 4, maxPlayers: 24 } });
console.log(`sala ${code}, entrando ${bots} robôs…`);
const child = spawn(process.execPath, [fileURLToPath(new URL("./bots.mjs", import.meta.url)), "--url", `${http.replace(/^http/, "ws")}/ws`, "--code", code, "--bots", String(bots), "--seconds", String(seconds + 5), "--origin", origin], { stdio: "inherit" });
await new Promise((resolve) => setTimeout(resolve, 2500));
await request("start");
const before = await health();
const started = Date.now();
await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
const after = await health();
const wall = (Date.now() - started) / 1000;
const cpu = after.cpuSeconds - before.cpuSeconds;
const kb = after.traffic.kb - before.traffic.kb;
console.log("\n===== resultado =====");
console.log(`alunos: ${after.players} • duração ${wall.toFixed(0)} s`);
console.log(`CPU do servidor: ${(cpu / wall * 100).toFixed(2)}% de um núcleo (JavaScript ${((after.cpuUserSeconds - before.cpuUserSeconds) / wall * 100).toFixed(2)}%; plano grátis do Render: 10%)`);
console.log(`enviado pelo servidor: ${(kb / wall).toFixed(1)} KB/s → ${(kb / wall * 3600 / 1024).toFixed(0)} MB por hora de aula`);
console.log(`movimentos recebidos: ${after.traffic.moves - before.traffic.moves} • correções por validação: ${after.traffic.corrections - before.traffic.corrections}`);
console.log(`memória: ${after.memoryMb} MB • professor recebeu ${(teacherBytes / 1024).toFixed(0)} KB`);
teacher.close();
child.kill();
process.exit(0);
