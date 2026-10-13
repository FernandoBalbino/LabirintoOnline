// Interface original; validação exclusivamente no servidor.

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[character]);

const renderImage = (item) => `<img src="${escapeHtml(item.icon)}" alt="" draggable="false">`;

export class ChallengeManager {
  constructor({ onCorrect, onWrong, onRestart, playSound, submitResponse }) {
    this.root = null;
    this.challenge = null;
    this.assignments = {};
    this.selectedItem = null;
    this.selectedResponse = null;
    this.feedback = null;
    this.resolved = false;
    this.simState = {};
    this.draggedItem = null;
    this.submitResponse = submitResponse;
    this.pending = false;
    this.onCorrect = onCorrect;
    this.onWrong = onWrong;
    this.onRestart = onRestart;
    this.playSound = playSound;
    this.handleClick = this.handleClick.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
  }

  mount(root) {
    this.root = root;
    root.addEventListener("click", this.handleClick);
    root.addEventListener("dblclick", this.handleDoubleClick);
    root.addEventListener("contextmenu", this.handleContextMenu);
    root.addEventListener("keydown", this.handleKeyDown);
    root.addEventListener("submit", this.handleSubmit);
    root.addEventListener("dragstart", this.handleDragStart);
    root.addEventListener("dragover", this.handleDragOver);
    root.addEventListener("drop", this.handleDrop);
  }

  show(challenge) {
    this.challenge = challenge;
    this.assignments = {};
    this.selectedItem = null;
    this.selectedResponse = null;
    this.feedback = null;
    this.resolved = false;
    this.simState = {};
    this.render(true);
  }

  hide() {
    this.challenge = null;
    this.resolved = false;
    if (this.root) this.root.innerHTML = "";
  }

  isSortTemplate() {
    return ["file-single", "file-multi", "hardware-software", "peripheral-sort"].includes(this.challenge?.template);
  }

  render(focusHeading = false) {
    if (!this.root || !this.challenge) return;
    if (this.resolved && this.feedback?.type === "success") {
      this.root.innerHTML = `
        <section class="maze-challenge-card is-resolved" role="dialog" aria-modal="true" aria-labelledby="maze-success-title">
          <div class="maze-challenge-success" role="status" aria-live="assertive" tabindex="-1">
            <span class="maze-success-check" aria-hidden="true">✓</span>
            <strong id="maze-success-title">CORRETO!</strong>
            <p>${escapeHtml(this.feedback.message)}</p>
          </div>
        </section>
      `;
      requestAnimationFrame(() => this.root?.querySelector(".maze-challenge-success")?.focus());
      return;
    }
    const challenge = this.challenge;
    const content = this.renderContent(challenge);
    const needsSubmit = !["windows-sim", "support-sim"].includes(challenge.template);
    const canSubmit = this.canSubmit();
    this.root.innerHTML = `
      <section class="maze-challenge-card" role="dialog" aria-modal="true" aria-labelledby="maze-challenge-title" aria-describedby="maze-challenge-instruction">
        <header class="maze-challenge-heading">
          <span class="maze-challenge-kicker">${escapeHtml(challenge.theme)}</span>
          <h2 id="maze-challenge-title" tabindex="-1">DESAFIO DE INFORMÁTICA</h2>
          <p>Resolva para continuar explorando.</p>
        </header>
        <div class="maze-task-strip"><span aria-hidden="true">⌁</span><strong id="maze-challenge-instruction">${escapeHtml(challenge.instruction)}</strong></div>
        <div class="maze-challenge-workspace">${content}</div>
        <footer class="maze-challenge-footer">
          <div class="maze-challenge-feedback ${this.feedback?.type ? `is-${this.feedback.type}` : ""}" aria-live="assertive">
            ${this.feedback ? `<strong>${escapeHtml(this.feedback.title)}</strong><span>${escapeHtml(this.feedback.message)}</span>` : `<strong>Dica</strong><span>${this.helpText()}</span>`}
          </div>
          <div class="maze-challenge-actions">
            <small>Precisa de ajuda? O professor pode liberar 30 segundos no painel.</small>
            ${needsSubmit ? `<button type="button" class="maze-action-button" data-challenge-action="submit" ${canSubmit ? "" : "disabled"}>VERIFICAR</button>` : ""}
          </div>
        </footer>
      </section>
    `;
    this.root.querySelectorAll("img").forEach((image) => { image.draggable = false; });
    if (focusHeading) requestAnimationFrame(() => this.root?.querySelector("#maze-challenge-title")?.focus());
  }

  helpText() {
    if (this.isSortTemplate()) return "Arraste ou clique em um item e depois no destino.";
    if (this.challenge.template === "rename-file") return "Use o botão direito ou “Mais ações” para encontrar Renomear.";
    if (this.challenge.template === "windows-sim") return "Interaja com a área de trabalho como faria no computador.";
    if (this.challenge.template === "support-sim") return "Clique nos controles da simulação para investigar o problema.";
    return "Selecione uma opção e confirme sua resposta.";
  }

  renderContent(challenge) {
    if (this.isSortTemplate()) return this.renderSorter(challenge);
    if (challenge.template === "hardware") return this.renderHardware(challenge);
    if (["software-scenario", "peripheral-select"].includes(challenge.template)) return this.renderChoice(challenge);
    if (challenge.template === "windows-sim") return this.renderWindows(challenge);
    if (challenge.template === "rename-file") return this.renderRename(challenge);
    if (challenge.template === "support-sim") return this.renderSupport(challenge);
    return "";
  }

  renderSorter(challenge) {
    const { items, targets } = challenge.payload;
    const selectedLabel = items.find((item) => item.id === this.selectedItem)?.label;
    return `
      <div class="maze-sorter ${items.length > 4 ? "is-dense" : ""}">
        <section class="maze-item-tray" aria-label="Itens para organizar">
          <h3>${selectedLabel ? `Selecionado: ${escapeHtml(selectedLabel)}` : "Itens"}</h3>
          <div class="maze-item-grid">
            ${items.filter((item) => !this.assignments[item.id]).map((item) => this.renderDraggableItem(item)).join("") || "<p class=\"maze-empty-tray\">Todos os itens foram colocados.</p>"}
          </div>
        </section>
        <div class="maze-target-grid ${targets.length === 2 ? "has-two" : ""}">
          ${targets.map((target) => `
            <button type="button" class="maze-sort-target ${this.selectedItem ? "is-ready" : ""}" data-target-id="${target.id}" aria-label="${escapeHtml(target.label)}. Clique para colocar o item selecionado.">
              ${target.icon ? `<img class="maze-target-icon" src="${escapeHtml(target.icon)}" alt="">` : ""}
              <strong>${escapeHtml(target.label)}</strong>
              <span class="maze-target-items">
                ${items.filter((item) => this.assignments[item.id] === target.id).map((item) => this.renderDraggableItem(item, true)).join("") || "<small>Solte aqui</small>"}
              </span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  renderDraggableItem(item, placed = false) {
    return `
      <span class="maze-draggable-item ${this.selectedItem === item.id ? "is-selected" : ""} ${placed ? "is-placed" : ""}" role="button" tabindex="0" draggable="true" data-item-id="${item.id}" aria-pressed="${this.selectedItem === item.id}">
        ${renderImage(item)}<b>${escapeHtml(item.label)}</b>
      </span>
    `;
  }

  renderHardware(challenge) {
    const dropMode = challenge.payload.mode === "drop";
    return `
      <div class="maze-hardware-bench">
        <div class="maze-parts-grid">
          ${challenge.payload.options.map((item) => `
            <button type="button" class="maze-choice-card ${this.selectedResponse === item.id ? "is-selected" : ""}" data-response="${item.id}" draggable="${dropMode}">
              ${renderImage(item)}<strong>${escapeHtml(item.label)}</strong>
            </button>
          `).join("")}
        </div>
        ${dropMode ? `
          <button type="button" class="maze-computer-target ${this.selectedResponse ? "is-ready" : ""}" data-hardware-target="true">
            <span class="maze-computer-case" aria-hidden="true"><i></i><i></i><i></i></span>
            <strong>${escapeHtml(challenge.payload.targetLabel)}</strong>
            <small>${this.selectedResponse ? "Componente pronto para instalar" : "Arraste ou selecione uma peça"}</small>
          </button>
        ` : ""}
      </div>
    `;
  }

  renderChoice(challenge) {
    return `
      <div class="maze-choice-grid">
        ${challenge.payload.options.map((item) => `
          <button type="button" class="maze-choice-card ${this.selectedResponse === item.id ? "is-selected" : ""}" data-response="${item.id}" aria-pressed="${this.selectedResponse === item.id}">
            ${renderImage(item)}<strong>${escapeHtml(item.label)}</strong>
          </button>
        `).join("")}
      </div>
    `;
  }

  renderWindows(challenge) {
    const task = ({folder:"open-documents",window:"close-window",trash:"trash-file"})[challenge.payload.desktop];
    if (task === "open-documents") {
      return `
        <div class="maze-windows-desktop" data-windows-scene="folders">
          <button type="button" class="maze-desktop-icon ${this.simState.selected === "documents" ? "is-selected" : ""}" data-sim-double="open-documents" data-sim-select="documents"><span>📁</span><b>Documentos</b><small>Clique duas vezes</small></button>
          <button type="button" class="maze-desktop-icon ${this.simState.selected === "images" ? "is-selected" : ""}" data-sim-double="open-images" data-sim-select="images"><span>🖼️</span><b>Imagens</b></button>
          ${this.renderTaskbar()}
        </div>
      `;
    }
    if (["close-window", "minimize-window"].includes(task)) {
      return `
        <div class="maze-windows-desktop">
          <section class="maze-sim-window">
            <header><span>Documentos</span><div><button type="button" data-sim-action="minimize-window" aria-label="Minimizar">—</button><button type="button" data-sim-action="maximize-window" aria-label="Maximizar">□</button><button type="button" data-sim-action="close-window" aria-label="Fechar">×</button></div></header>
            <div><span>📄</span><p>trabalho.pdf</p></div>
          </section>
          ${this.renderTaskbar()}
        </div>
      `;
    }
    return `
      <div class="maze-windows-desktop" data-windows-scene="trash">
        <button type="button" class="maze-desktop-icon ${this.simState.selected === "work-file" ? "is-selected" : ""}" data-trash-item="true" data-sim-select="work-file" draggable="true"><span>📄</span><b>trabalho.pdf</b></button>
        <button type="button" class="maze-desktop-icon maze-trash-icon" data-trash-target="true"><span>🗑️</span><b>Lixeira</b><small>${this.simState.selected ? "Clique para mover" : ""}</small></button>
        ${this.renderTaskbar()}
      </div>
    `;
  }

  renderTaskbar() {
    return `<div class="maze-taskbar"><button type="button" data-sim-action="open-start" aria-label="Abrir menu Iniciar">⊞</button><button type="button" data-sim-action="open-explorer" aria-label="Abrir Explorador de Arquivos">📁</button><span></span><small>10:35</small></div>`;
  }

  renderRename(challenge) {
    return `
      <div class="maze-windows-desktop maze-rename-scene">
        <button type="button" class="maze-desktop-icon is-selected" data-rename-file="true"><span>📄</span><b>${escapeHtml(challenge.payload.from)}</b></button>
        <button type="button" class="maze-more-actions" data-challenge-action="open-context">⋯ Mais ações</button>
        ${this.simState.contextOpen ? `<div class="maze-context-menu" role="menu"><button type="button" role="menuitem" disabled>Abrir</button><button type="button" role="menuitem" data-challenge-action="rename">Renomear</button><button type="button" role="menuitem" disabled>Propriedades</button></div>` : ""}
        ${this.simState.renaming ? `<form class="maze-rename-form" data-rename-form><label for="maze-rename-input">Novo nome do arquivo</label><input id="maze-rename-input" name="filename" value="${escapeHtml(this.simState.value || "")}" autocomplete="off" spellcheck="false"><button class="maze-action-button" type="submit">CONFIRMAR NOME</button></form>` : ""}
        ${this.renderTaskbar()}
      </div>
    `;
  }

  renderSupport(challenge) {
    const scene = challenge.payload.scene;
    if (scene === "sound") {
      return `
        <div class="maze-support-scene maze-sound-scene">
          <div class="maze-support-monitor"><span>Área de Trabalho</span></div>
          <div class="maze-support-taskbar"><button type="button" data-sim-action="open-volume" aria-label="Abrir volume">${this.simState.volumeOpen ? "🔇" : "🔊"}</button></div>
          ${this.simState.volumeOpen ? `<div class="maze-volume-panel"><strong>Volume</strong><input type="range" value="45" aria-label="Volume"><button type="button" data-sim-action="unmute">🔇 Som silenciado — clique para ativar</button></div>` : ""}
        </div>
      `;
    }
    if (scene === "program") {
      return `
        <div class="maze-support-scene"><section class="maze-frozen-window"><header>Editor de texto <span>Não está respondendo</span></header><div class="maze-frozen-lines"><i></i><i></i><i></i></div><footer><button type="button" data-sim-action="wait-program">Aguardar</button><button type="button" data-sim-action="close-program">Fechar o programa</button></footer></section></div>
      `;
    }
    if (scene === "mouse") {
      return `
        <div class="maze-support-scene maze-cable-scene"><div class="maze-device-tower">COMPUTADOR<div><span>USB</span><span>HDMI</span><span>ÁUDIO</span></div></div><div class="maze-support-options"><button type="button" data-sim-action="connect-mouse">🖱️ Conectar o cabo USB do mouse</button><button type="button" data-sim-action="connect-hdmi">🔌 Conectar o cabo HDMI</button><button type="button" data-sim-action="restart-router">↻ Reiniciar equipamento</button></div></div>
      `;
    }
    if (scene === "monitor") {
      return `
        <div class="maze-support-scene maze-monitor-scene"><div class="maze-dark-monitor"><span>Sem imagem</span><button type="button" data-sim-action="power-monitor" aria-label="Ligar monitor">⏻</button></div><div class="maze-support-options"><button type="button" data-sim-action="power-monitor">Verificar botão de energia</button><button type="button" data-sim-action="change-wallpaper">Trocar papel de parede</button><button type="button" data-sim-action="open-browser">Abrir navegador</button></div></div>
      `;
    }
    return `
      <div class="maze-support-scene maze-printer-scene"><div class="maze-printer-visual"><span>IMPRESSORA</span><strong>SEM PAPEL</strong><i></i></div><div class="maze-support-options"><button type="button" data-sim-action="check-paper">📄 Verificar e colocar papel</button><button type="button" data-sim-action="change-wallpaper">🖼️ Trocar papel de parede</button><button type="button" data-sim-action="open-browser">🌐 Abrir navegador</button></div></div>
    `;
  }

  canSubmit() {
    if (!this.challenge) return false;
    if (this.isSortTemplate()) return Object.keys(this.assignments).length === this.challenge.payload.items.length;
    if (this.challenge.template === "hardware" && this.challenge.payload.mode === "drop") return Boolean(this.simState.installed);
    if (this.challenge.template === "rename-file") return false;
    return Boolean(this.selectedResponse);
  }

  handleClick(event) {
    if (this.resolved) return;
    const item = event.target.closest("[data-item-id]");
    const target = event.target.closest("[data-target-id]");
    if (target && this.isSortTemplate() && this.selectedItem) {
      this.placeItem(this.selectedItem, target.dataset.targetId);
      return;
    }
    if (item && this.isSortTemplate()) {
      this.selectSortItem(item.dataset.itemId);
      return;
    }
    if (target && this.isSortTemplate()) {
      this.placeItem(this.selectedItem, target.dataset.targetId);
      return;
    }
    const response = event.target.closest("[data-response]");
    if (response) {
      this.selectedResponse = response.dataset.response;
      this.feedback = null;
      this.render();
      return;
    }
    if (event.target.closest("[data-hardware-target]")) {
      if (this.selectedResponse) {
        this.simState.installed = true;
        this.render();
      }
      return;
    }
    const selectable = event.target.closest("[data-sim-select]");
    if (selectable) {
      const doubleAction = selectable.dataset.simDouble;
      const now = Date.now();
      if (doubleAction && this.simState.selected === selectable.dataset.simSelect && now - (this.simState.selectedAt || 0) < 700) {
        this.submit(doubleAction);
        return;
      }
      this.simState.selected = selectable.dataset.simSelect;
      this.simState.selectedAt = now;
      this.render();
      return;
    }
    if (event.target.closest("[data-trash-target]")) {
      if (this.simState.selected === "work-file") this.submit("trash-file");
      else this.showLocalFeedback("error", "Selecione o arquivo", "Clique primeiro em trabalho.pdf e depois na Lixeira.");
      return;
    }
    const simAction = event.target.closest("[data-sim-action]")?.dataset.simAction;
    if (simAction) {
      this.handleSimAction(simAction);
      return;
    }
    const action = event.target.closest("[data-challenge-action]")?.dataset.challengeAction;
    if (action === "restart-flow") {
      this.simState.restartConfirm = true;
      this.feedback = null;
      this.render();
      requestAnimationFrame(() => this.root.querySelector("#maze-restart-password")?.focus());
      return;
    }
    if (action === "cancel-restart") {
      this.simState.restartConfirm = false;
      this.render();
      return;
    }
    if (action === "submit") this.submitCurrent();
    if (action === "open-context") {
      this.simState.contextOpen = true;
      this.render();
    }
    if (action === "rename") {
      this.simState.contextOpen = false;
      this.simState.renaming = true;
      this.simState.value = this.challenge.payload.from;
      this.render();
      requestAnimationFrame(() => {
        const input = this.root.querySelector("#maze-rename-input");
        input?.focus();
        input?.select();
      });
    }
    const form = event.target.closest("[data-rename-form]");
    if (form && event.target.closest("button[type='submit']")) {
      event.preventDefault();
      this.submit(form.elements.filename.value);
    }
  }

  handleDoubleClick(event) {
    if (this.resolved) return;
    const action = event.target.closest("[data-sim-double]")?.dataset.simDouble;
    if (action) this.submit(action);
  }

  handleContextMenu(event) {
    if (this.resolved) return;
    if (!event.target.closest("[data-rename-file]")) return;
    event.preventDefault();
    this.simState.contextOpen = true;
    this.render();
  }

  handleKeyDown(event) {
    if (this.resolved) return;
    const item = event.target.closest("[data-item-id]");
    if (item && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      this.selectSortItem(item.dataset.itemId);
      return;
    }
    const doubleAction = event.target.closest("[data-sim-double]")?.dataset.simDouble;
    if (doubleAction && event.key === "Enter") {
      event.preventDefault();
      this.submit(doubleAction);
    }
    if (event.key === "Escape" && this.simState.contextOpen) {
      this.simState.contextOpen = false;
      this.render();
    }
  }

  handleSubmit(event) {
    if (this.resolved) {
      event.preventDefault();
      return;
    }
    const restartForm = event.target.closest("[data-restart-form]");
    if (restartForm) {
      event.preventDefault();
      const accepted = this.onRestart?.(restartForm.elements.password.value);
      if (!accepted) {
        this.feedback = { type: "error", title: "SENHA INCORRETA", message: "O desafio continua aberto." };
        this.render();
        requestAnimationFrame(() => this.root.querySelector("#maze-restart-password")?.focus());
      }
      return;
    }
    const form = event.target.closest("[data-rename-form]");
    if (!form) return;
    event.preventDefault();
    this.submit(form.elements.filename.value);
  }

  handleDragStart(event) {
    if (this.resolved) {
      event.preventDefault();
      return;
    }
    const sortItem = event.target.closest("[data-item-id]");
    const response = event.target.closest("[data-response]");
    const trashItem = event.target.closest("[data-trash-item]");
    const source = sortItem?.dataset.itemId || response?.dataset.response || (trashItem ? "work-file" : null);
    if (!source) return;
    this.draggedItem = source;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", source);
  }

  handleDragOver(event) {
    if (this.resolved) return;
    if (event.target.closest("[data-target-id], [data-hardware-target], [data-trash-target]")) event.preventDefault();
  }

  handleDrop(event) {
    if (this.resolved) return;
    const id = event.dataTransfer.getData("text/plain") || this.draggedItem;
    const target = event.target.closest("[data-target-id]");
    if (target && this.isSortTemplate()) {
      event.preventDefault();
      this.placeItem(id, target.dataset.targetId);
      return;
    }
    if (event.target.closest("[data-hardware-target]") && id) {
      event.preventDefault();
      this.selectedResponse = id;
      this.simState.installed = true;
      this.render();
      return;
    }
    if (event.target.closest("[data-trash-target]") && id === "work-file") {
      event.preventDefault();
      this.submit("trash-file");
    }
  }

  selectSortItem(itemId) {
    this.selectedItem = this.selectedItem === itemId ? null : itemId;
    if (this.selectedItem) delete this.assignments[itemId];
    this.feedback = null;
    this.render();
  }

  placeItem(itemId, targetId) {
    if (!itemId) {
      this.showLocalFeedback("error", "Escolha um item primeiro", "Clique em um item e depois no destino.");
      return;
    }
    this.assignments[itemId] = targetId;
    this.selectedItem = null;
    this.feedback = null;
    this.render();
  }

  handleSimAction(action) {
    if (action === "open-volume") {
      this.simState.volumeOpen = true;
      this.render();
      return;
    }
    this.submit(action);
  }

  submitCurrent() {
    if (this.isSortTemplate()) this.submit({ ...this.assignments });
    else if (this.challenge.template === "hardware" && this.challenge.payload.mode === "drop") this.submit(this.selectedResponse);
    else this.submit(this.selectedResponse);
  }

  async submit(response) {
    if (this.resolved || this.pending || !this.challenge) return;
    this.pending = true;
    const current = this.challenge;
    try {
      const result = await this.submitResponse(current, response);
      if (this.challenge !== current) return;
      if (result.correct) {
        this.resolved = true;
        this.playSound?.('correct');
        this.onCorrect?.(current);
        this.feedback = { type:'success', title:'CORRETO!', message:result.message };
      } else {
        this.playSound?.('wrong');
        this.onWrong?.(current);
        this.feedback = { type:'error', title:'AINDA NÃO!', message:result.message };
        if(this.isSortTemplate()) this.assignments = result.accepted || {};
        else { this.selectedResponse=null; this.simState={}; }
      }
    } catch(error) {
      if(this.challenge !== current) return;
      this.feedback={type:'error',title:'AGUARDE',message:error.message};
    } finally { this.pending=false; if(this.challenge === current) this.render(); }
  }

  showLocalFeedback(type, title, message) {
    this.feedback = { type, title, message };
    this.render();
  }
}
