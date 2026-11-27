(function createTerminalApp(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const records = new Set();
  function safe(value) { return OSLab.ui.escapeHtml(value); }
  function run(command) {
    const clean = String(command || "").trim();
    const lower = clean.toLocaleLowerCase("pt-BR");
    if (!clean) return "";
    if (lower === "ipconfig") return OSLab.network.ipconfig(false);
    if (lower === "ipconfig /all") return OSLab.network.ipconfig(true);
    if (lower === "help" || lower === "ajuda") return "Comandos disponíveis: ipconfig, ipconfig /all, ping <destino>, nslookup <nome>, cls";
    if (lower === "cls" || lower === "clear") return { clear: true };
    if (lower.startsWith("ping ")) return OSLab.network.ping(clean.slice(5).trim()).output;
    if (lower.startsWith("nslookup ")) return OSLab.network.nslookup(clean.slice(9).trim()).output;
    return `'${clean}' não é reconhecido como um comando interno do OSLab. Digite help para ver os comandos.`;
  }
  function render(record) {
    const username = OSLab.users?.getCurrent?.()?.username || "Aluno";
    records.add(record); record.terminalLines ||= [];
    record.address.textContent = "Terminal";
    record.content.innerHTML = `<section class="terminal-page terminal-interactive" aria-label="Terminal do OSLab"><div class="terminal-output" role="log" aria-live="polite"><p>Microsoft Windows [versão 11.0.26100.4652]</p><p>(c) OSLab. Todos os direitos reservados.</p>${record.terminalLines.map((line) => `<div><strong>C:\\Users\\${safe(username)}&gt;${safe(line.command)}</strong>${line.output ? `<pre>${safe(line.output)}</pre>` : ""}</div>`).join("")}</div><form class="terminal-command-form" data-terminal-form><label><span>C:\\Users\\${safe(username)}&gt;</span><input name="command" autocomplete="off" spellcheck="false" aria-label="Comando" autofocus /></label></form></section>`;
    const output = record.content.querySelector(".terminal-output"); if (output) output.scrollTop = output.scrollHeight;
    record.content.querySelector("input")?.focus();
    if (!record.terminalWired) {
      record.terminalWired = true;
      record.content.addEventListener("submit", (event) => {
        const form = event.target.closest("[data-terminal-form]"); if (!form) return;
        event.preventDefault(); const command = new FormData(form).get("command")?.toString() || ""; const result = run(command);
        if (result?.clear) record.terminalLines = []; else if (command.trim()) record.terminalLines.push({ command, output: result });
        render(record);
      });
    }
  }
  OSLab.terminalApp = { render, run };
})(window);
