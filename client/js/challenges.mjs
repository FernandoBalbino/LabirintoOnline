// Janela de desafios. A correção acontece no servidor; aqui só montamos a interação.
// Modelos: choice, sort, order, slots (placa-mãe) e oslab (Windows real do OSLab dentro de um iframe).
import { OslabFrame } from "./oslab-frame.mjs";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const img = (item, cls = "") => item.icon ? `<img class="${cls}" src="${esc(item.icon)}" alt="" draggable="false">` : "";

// Posições (em %) dos encaixes desenhados na placa-mãe.
const SLOT_LAYOUT = {
  socket: { label: "Soquete da CPU", detail: "onde vai o processador (e o cooler por cima)", x: 30, y: 14, w: 24, h: 26 },
  dimm: { label: "Slots de memória (DIMM)", detail: "pentes de memória RAM", x: 62, y: 8, w: 12, h: 44 },
  m2: { label: "Conector M.2", detail: "SSD em formato de pente", x: 24, y: 50, w: 34, h: 9 },
  pcie: { label: "Slot PCI Express x16", detail: "placa de vídeo", x: 12, y: 66, w: 58, h: 11 },
  power: { label: "Conector ATX 24 pinos", detail: "cabo da fonte de energia", x: 80, y: 18, w: 11, h: 36 },
};

export class ChallengeManager {
  constructor({ host, submit, skip, sound, serverNow }) {
    this.host = host;
    this.submitRemote = submit;
    this.skipRemote = skip;
    this.sound = sound;
    this.serverNow = serverNow;
    this.challenge = null;
    this.oslab = null;
    host.addEventListener("click", (event) => this.onClick(event));
    host.addEventListener("pointerdown", (event) => this.onPointerDown(event));
  }

  show(challenge, me) {
    this.close();
    this.challenge = challenge;
    this.me = me;
    this.openedAt = this.serverNow();
    this.state = { assignments: {}, selected: null, order: challenge.template === "order" ? challenge.payload.items.map((i) => i.id) : [], answer: null, gate: false, done: false, progress: [] };
    this.feedback = null;
    this.pending = false;
    this.resolved = false;
    this.showHint = false;
    this.render(true);
    this.sound?.("challenge");
  }

  update(me) {
    this.me = me;
    if (!this.challenge || !this.host.isConnected) return;
    const clock = this.host.querySelector("[data-protection]");
    if (clock) clock.textContent = this.protectionText();
    const skip = this.host.querySelector("[data-skip]");
    if (skip) {
      const wait = Math.max(0, Math.ceil((this.openedAt + 15_000 - this.serverNow()) / 1000));
      skip.disabled = wait > 0 || this.pending || this.resolved;
      skip.textContent = wait > 0 ? `Trocar desafio (${wait}s)` : "Trocar desafio (conta como erro)";
    }
  }

  protectionText() {
    if (!this.me) return "";
    if (this.me.questionExpired) return "Proteção encerrada: os vírus podem pegar você!";
    const seconds = Math.max(0, Math.ceil((this.me.questionUntil - this.serverNow()) / 1000));
    return `Protegido dos vírus por ${seconds}s`;
  }

  close() {
    this.oslab?.destroy();
    this.oslab = null;
    this.challenge = null;
    this.host.innerHTML = "";
  }

  // ---------------- renderização ----------------
  render(focus = false) {
    const c = this.challenge;
    if (!c) return;
    if (this.resolved) {
      this.host.innerHTML = `<section class="ch-card ch-success" role="dialog" aria-modal="true" aria-labelledby="ch-ok"><div class="ch-success-box" tabindex="-1"><span aria-hidden="true">✓</span><strong id="ch-ok">CORRETO!</strong><p>${esc(this.feedback?.message)}</p></div></section>`;
      requestAnimationFrame(() => this.host.querySelector(".ch-success-box")?.focus());
      return;
    }
    if (c.template === "oslab") { this.renderOslab(focus); return; }
    const body = { choice: () => this.renderChoice(), sort: () => this.renderSort(), order: () => this.renderOrder(), slots: () => this.renderSlots() }[c.template]?.() || "";
    this.host.innerHTML = `
      <section class="ch-card" role="dialog" aria-modal="true" aria-labelledby="ch-title" aria-describedby="ch-instruction">
        <header class="ch-head">
          <div><span class="ch-kicker">${esc(c.theme)}</span><h2 id="ch-title" tabindex="-1">Desafio de informática</h2></div>
          <span class="ch-protection" data-protection>${esc(this.protectionText())}</span>
        </header>
        <p class="ch-instruction" id="ch-instruction">${esc(c.instruction)}</p>
        <div class="ch-body ch-${c.template}">${body}</div>
        <footer class="ch-foot">
          <div class="ch-feedback ${this.feedback ? `is-${this.feedback.type}` : ""}" role="status" aria-live="assertive">${this.feedback ? `<strong>${esc(this.feedback.title)}</strong> ${esc(this.feedback.message)}` : esc(this.helpText())}</div>
          <div class="ch-actions">
            <button type="button" class="ch-skip" data-skip disabled>Trocar desafio (15s)</button>
            <button type="button" class="ch-submit" data-submit ${this.canSubmit() && !this.pending ? "" : "disabled"}>${this.pending ? "VERIFICANDO…" : "VERIFICAR"}</button>
          </div>
        </footer>
      </section>`;
    this.update(this.me);
    if (focus) requestAnimationFrame(() => this.host.querySelector("#ch-title")?.focus());
  }

  helpText() {
    const t = this.challenge.template;
    if (t === "sort") return "Arraste cada item para o lugar certo (ou clique no item e depois no destino).";
    if (t === "slots") return "Arraste cada peça até o encaixe certo da placa-mãe (ou clique na peça e depois no encaixe).";
    if (t === "order") return "Use as setas para colocar os itens na ordem certa.";
    return "Escolha uma opção e clique em VERIFICAR.";
  }

  renderChoice() {
    const { options } = this.challenge.payload;
    const visual = options.some((o) => o.icon);
    return `<div class="ch-options ${visual ? "is-visual" : "is-text"}" role="radiogroup">${options.map((o) => `
      <button type="button" role="radio" aria-checked="${this.state.answer === o.id}" class="ch-option ${this.state.answer === o.id ? "is-selected" : ""}" data-answer="${esc(o.id)}">
        ${img(o)}<span>${esc(o.label)}</span>
      </button>`).join("")}</div>`;
  }

  renderSort() {
    const { items, targets } = this.challenge.payload;
    const a = this.state.assignments;
    const loose = items.filter((i) => !a[i.id]);
    const chip = (i) => `<button type="button" class="ch-chip ${this.state.selected === i.id ? "is-selected" : ""}" data-item="${esc(i.id)}" data-drag="item">${img(i)}<span>${esc(i.label)}</span></button>`;
    return `
      <div class="ch-tray" aria-label="Itens">${loose.map(chip).join("") || '<p class="ch-empty">Tudo no lugar! Clique em VERIFICAR.</p>'}</div>
      <div class="ch-bins" style="--bins:${targets.length}">${targets.map((t) => `
        <div class="ch-bin" data-target="${esc(t.id)}" role="button" tabindex="0" aria-label="Colocar em ${esc(t.label)}">
          <header>${t.icon ? img(t) : ""}<strong>${esc(t.label)}</strong>${t.hint ? `<small>${esc(t.hint)}</small>` : ""}</header>
          <div class="ch-bin-items">${items.filter((i) => a[i.id] === t.id).map(chip).join("")}</div>
        </div>`).join("")}</div>`;
  }

  renderOrder() {
    const byId = new Map(this.challenge.payload.items.map((i) => [i.id, i]));
    const list = this.state.order;
    return `<ol class="ch-order">${list.map((id, index) => `
      <li><b>${index + 1}</b><span>${esc(byId.get(id).label)}</span>
        <button type="button" data-move="${index}:-1" aria-label="Subir" ${index === 0 ? "disabled" : ""}>▲</button>
        <button type="button" data-move="${index}:1" aria-label="Descer" ${index === list.length - 1 ? "disabled" : ""}>▼</button>
      </li>`).join("")}</ol>`;
  }

  renderSlots() {
    const { parts, slots } = this.challenge.payload;
    const a = this.state.assignments;
    const used = new Set(Object.values(a));
    const partChip = (p) => `<button type="button" class="ch-chip ${this.state.selected === p.id ? "is-selected" : ""}" data-item="${esc(p.id)}" data-drag="item">${img(p)}<span>${esc(p.label)}</span></button>`;
    const byId = new Map(parts.map((p) => [p.id, p]));
    return `
      <div class="ch-tray is-parts">${parts.filter((p) => !used.has(p.id)).map(partChip).join("") || '<p class="ch-empty">Todas as peças encaixadas! Clique em VERIFICAR.</p>'}</div>
      <div class="ch-board" aria-label="Placa-mãe">
        ${boardSvg()}
        ${Object.entries(SLOT_LAYOUT).map(([id, s]) => {
          const active = slots.includes(id);
          const part = byId.get(a[id]);
          return `<div class="ch-slot ${active ? "is-active" : "is-idle"} ${part ? "is-filled" : ""}" ${active ? `data-target="${id}" role="button" tabindex="0"` : 'aria-hidden="true"'} style="left:${s.x}%;top:${s.y}%;width:${s.w}%;height:${s.h}%">
            ${part ? `<button type="button" class="ch-slot-part" data-item="${esc(part.id)}" data-drag="item">${img(part)}<span>${esc(part.label)}</span></button>` : `<span class="ch-slot-label"><strong>${esc(s.label)}</strong>${active ? `<small>${esc(s.detail)}</small>` : ""}</span>`}
          </div>`;
        }).join("")}
      </div>`;
  }

  renderOslab(focus) {
    const c = this.challenge;
    const p = c.payload;
    if (!this.host.querySelector(".ch-oslab")) {
      this.host.innerHTML = `
        <section class="ch-card ch-oslab" role="dialog" aria-modal="true" aria-labelledby="ch-title">
          <aside class="ch-oslab-side">
            <span class="ch-kicker">${esc(c.theme)} • Windows do OSLab</span>
            <h2 id="ch-title" tabindex="-1">${esc(c.instruction)}</h2>
            <div class="ch-oslab-status" data-status role="status" aria-live="polite">Abrindo o Windows…</div>
            <div data-question></div>
            <button type="button" class="ch-hint-toggle" data-hint aria-expanded="false">💡 Ver dica passo a passo</button>
            <ol class="ch-steps" data-steps hidden>${p.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
            <div class="ch-feedback" data-feedback role="status" aria-live="assertive"></div>
            <footer>
              <span class="ch-protection" data-protection></span>
              <div class="ch-actions">
                <button type="button" class="ch-skip" data-skip disabled>Trocar desafio (15s)</button>
                <button type="button" class="ch-reset" data-reset>Recomeçar tarefa</button>
              </div>
            </footer>
          </aside>
          <div class="ch-oslab-screen" data-screen><div class="ch-oslab-loading"><i></i><span>Ligando o computador…</span></div></div>
        </section>`;
      this.oslab = new OslabFrame(this.host.querySelector("[data-screen]"), {
        task: p.task,
        onStatus: (status) => this.onOslabStatus(status),
        onError: (message) => this.setOslabStatus(message, "warn"),
      });
      this.oslab.load();
      if (focus) requestAnimationFrame(() => this.host.querySelector("#ch-title")?.focus());
    }
    this.renderOslabQuestion();
    const feedback = this.host.querySelector("[data-feedback]");
    feedback.className = `ch-feedback ${this.feedback ? `is-${this.feedback.type}` : ""}`;
    feedback.innerHTML = this.feedback ? `<strong>${esc(this.feedback.title)}</strong> ${esc(this.feedback.message)}` : "";
    this.update(this.me);
  }

  renderOslabQuestion() {
    const p = this.challenge.payload;
    const box = this.host.querySelector("[data-question]");
    if (!box) return;
    if (!p.question) { box.innerHTML = ""; return; }
    const open = this.state.gate;
    box.innerHTML = `<div class="ch-oslab-question ${open ? "is-open" : ""}">
      <strong>${esc(p.question)}</strong>
      ${open ? "" : `<small>${p.gate === "ipconfig" ? "Responda depois de rodar o ipconfig no Terminal." : "Responda depois de abrir o Gerenciador de Tarefas."}</small>`}
      <div class="ch-options is-text">${p.options.map((o) => `<button type="button" class="ch-option ${this.state.answer === o.id ? "is-selected" : ""}" data-answer="${esc(o.id)}" ${open ? "" : "disabled"}>${esc(o.label)}</button>`).join("")}</div>
      <button type="button" class="ch-submit" data-submit ${open && this.state.answer && !this.pending ? "" : "disabled"}>${this.pending ? "VERIFICANDO…" : "RESPONDER"}</button>
    </div>`;
  }

  setOslabStatus(text, kind = "") {
    const status = this.host.querySelector("[data-status]");
    if (status) { status.textContent = text; status.dataset.kind = kind; }
  }

  onOslabStatus(status) {
    if (!this.challenge || this.challenge.template !== "oslab" || this.resolved) return;
    const p = this.challenge.payload;
    if (status.ready && !status.done) this.setOslabStatus(p.question ? (status.gate ? "Encontrou? Agora responda ao lado." : "Use o Windows ao lado para descobrir.") : "Faça a tarefa no Windows ao lado. A verificação é automática.", "");
    if (p.question && status.gate !== this.state.gate) { this.state.gate = status.gate; this.renderOslabQuestion(); }
    if (!p.question && status.done && !this.state.done && !this.pending) {
      this.state.done = true;
      this.setOslabStatus("Tarefa concluída! Verificando…", "ok");
      setTimeout(() => this.submit({ done: true }), 500);
    }
  }

  canSubmit() {
    const c = this.challenge;
    if (!c) return false;
    if (c.template === "choice") return Boolean(this.state.answer);
    if (c.template === "sort") return c.payload.items.every((i) => this.state.assignments[i.id]);
    if (c.template === "slots") return c.payload.slots.every((s) => this.state.assignments[s]);
    if (c.template === "order") return true;
    return false;
  }

  response() {
    const c = this.challenge;
    if (c.template === "choice") return this.state.answer;
    if (c.template === "sort") return { ...this.state.assignments };
    if (c.template === "slots") return Object.fromEntries(c.payload.slots.map((s) => [s, this.state.assignments[s]]));
    if (c.template === "order") return [...this.state.order];
    return null;
  }

  async submit(response) {
    if (this.pending || this.resolved || !this.challenge) return;
    const serial = this.challenge.serial;
    this.pending = true;
    this.render();
    try {
      const result = await this.submitRemote(serial, response);
      if (!this.challenge || this.challenge.serial !== serial) return;
      this.pending = false;
      if (result.correct) {
        this.resolved = true;
        this.feedback = { type: "success", title: "Correto!", message: result.message };
        this.sound?.("correct");
        this.oslab?.destroy();
        this.oslab = null;
      } else {
        this.feedback = { type: "error", title: "Ainda não.", message: result.message };
        this.sound?.("wrong");
        if (this.challenge.template === "sort" || this.challenge.template === "slots") this.state.assignments = { ...(result.accepted || {}) };
        if (this.challenge.template === "oslab") { this.state.done = false; this.state.answer = null; }
        this.host.querySelector(".ch-card")?.classList.add("is-shake");
      }
    } catch (error) {
      this.pending = false;
      if (this.challenge?.template === "oslab") this.state.done = false;
      this.feedback = { type: "error", title: "Não foi possível verificar.", message: error.message };
    }
    this.render();
  }

  // ---------------- interação ----------------
  assign(itemId, targetId) {
    const c = this.challenge;
    if (c.template === "sort") {
      if (targetId) this.state.assignments[itemId] = targetId; else delete this.state.assignments[itemId];
    } else if (c.template === "slots") {
      for (const [slot, part] of Object.entries(this.state.assignments)) if (part === itemId) delete this.state.assignments[slot];
      if (targetId) this.state.assignments[targetId] = itemId;
    }
    this.state.selected = null;
    this.feedback = null;
    this.render();
  }

  onClick(event) {
    if (!this.challenge || this.resolved) return;
    if (this.dragMoved) { this.dragMoved = false; return; }
    const target = event.target;
    const answer = target.closest("[data-answer]");
    if (answer && !answer.disabled) {
      this.state.answer = answer.dataset.answer;
      this.feedback = null;
      if (this.challenge.template === "oslab") this.renderOslab(); else this.render();
      return;
    }
    if (target.closest("[data-submit]")) {
      if (this.challenge.template === "oslab") this.submit({ answer: this.state.answer });
      else if (this.canSubmit()) this.submit(this.response());
      return;
    }
    if (target.closest("[data-skip]")) { this.skip(); return; }
    if (target.closest("[data-reset]")) { this.state.done = false; this.feedback = null; this.oslab?.reload(); this.setOslabStatus("Recomeçando a tarefa…"); return; }
    const hint = target.closest("[data-hint]");
    if (hint) {
      const steps = this.host.querySelector("[data-steps]");
      steps.hidden = !steps.hidden;
      hint.setAttribute("aria-expanded", String(!steps.hidden));
      hint.textContent = steps.hidden ? "💡 Ver dica passo a passo" : "Esconder dica";
      return;
    }
    const move = target.closest("[data-move]");
    if (move) {
      const [index, delta] = move.dataset.move.split(":").map(Number);
      const list = this.state.order;
      [list[index], list[index + delta]] = [list[index + delta], list[index]];
      this.feedback = null;
      this.render();
      return;
    }
    const item = target.closest("[data-item]");
    if (item) {
      const id = item.dataset.item;
      const placed = this.challenge.template === "sort" ? this.state.assignments[id] : Object.values(this.state.assignments).includes(id);
      if (placed && this.state.selected !== id) { this.assign(id, null); return; }
      this.state.selected = this.state.selected === id ? null : id;
      this.render();
      return;
    }
    const bin = target.closest("[data-target]");
    if (bin && this.state.selected) this.assign(this.state.selected, bin.dataset.target);
  }

  onPointerDown(event) {
    const source = event.target.closest("[data-drag='item']");
    if (!source || !this.challenge || this.resolved || event.button > 0) return;
    const id = source.dataset.item;
    const startX = event.clientX;
    const startY = event.clientY;
    let ghost = null;
    this.dragMoved = false;
    const move = (e) => {
      if (!ghost && Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return;
      if (!ghost) {
        ghost = source.cloneNode(true);
        ghost.classList.add("ch-ghost");
        document.body.appendChild(ghost);
        this.dragMoved = true;
      }
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
      this.host.querySelectorAll("[data-target]").forEach((t) => t.classList.toggle("is-over", t.contains(document.elementFromPoint(e.clientX, e.clientY))));
    };
    const up = (e) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (!ghost) return;
      ghost.remove();
      const drop = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-target]");
      if (drop && this.host.contains(drop)) this.assign(id, drop.dataset.target);
      else this.render();
      setTimeout(() => { this.dragMoved = false; }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  async skip() {
    if (!this.challenge || this.pending) return;
    this.pending = true;
    try { await this.skipRemote(this.challenge.serial); }
    catch (error) { this.pending = false; this.feedback = { type: "error", title: "Não foi possível trocar.", message: error.message }; this.render(); }
  }
}

function boardSvg() {
  return `<svg class="ch-board-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <rect x="1" y="1" width="98" height="98" rx="3" fill="#0f5132" stroke="#0a3a24" stroke-width="1.2"/>
    <g stroke="#1f7a4c" stroke-width=".35" fill="none" opacity=".9">
      <path d="M4 10h20v12h6M4 30h18v20h6M56 6v8M60 60h20v30M8 82h30v10M74 60v-6h12M42 44h18"/><path d="M8 58h4v20M90 60v30H64"/>
    </g>
    <rect x="3" y="4" width="16" height="22" rx="1" fill="#6b7785" opacity=".8"/>
    <g fill="#c9a227" opacity=".85"><circle cx="9" cy="92" r="2.2"/><circle cx="16" cy="92" r="2.2"/><circle cx="23" cy="92" r="2.2"/></g>
    <rect x="76" y="64" width="18" height="14" rx="1.5" fill="#22313f"/><text x="85" y="72.5" font-size="3.2" text-anchor="middle" fill="#9fb3c8" font-family="sans-serif">Chipset</text>
    <rect x="40" y="82" width="22" height="10" rx="1" fill="#1b2633"/><text x="51" y="88.4" font-size="3" text-anchor="middle" fill="#9fb3c8" font-family="sans-serif">BIOS / UEFI</text>
  </svg>`;
}
