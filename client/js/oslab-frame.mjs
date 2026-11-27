// Windows do OSLab dentro do desafio. O OSLab fica hospedado junto com o jogo (mesma origem),
// abre direto na Área de Trabalho (modo embutido, sem login, sem cache offline e sem mexer no
// OSLab que o aluno usa normalmente) e informa o andamento pela ponte js/labirinto-bridge.js.
const OSLAB_URL = "./oslab/index.html";
const BUILD = "2";

export class OslabFrame {
  constructor(container, { task, onStatus, onError }) {
    this.container = container;
    this.task = task;
    this.onStatus = onStatus;
    this.onError = onError;
    this.unsubscribe = null;
    this.timer = null;
  }

  load() {
    this.destroyFrame();
    const frame = document.createElement("iframe");
    frame.className = "ch-oslab-frame";
    frame.title = "Windows do OSLab";
    frame.src = `${OSLAB_URL}?embed=labirinto&v=${BUILD}`;
    frame.setAttribute("allow", "fullscreen 'none'");
    this.frame = frame;
    this.container.querySelector(".ch-oslab-loading")?.removeAttribute("hidden");
    this.container.appendChild(frame);
    const started = performance.now();
    frame.addEventListener("load", () => {
      const poll = () => {
        if (this.frame !== frame) return;
        const bridge = frame.contentWindow?.LabirintoBridge;
        if (bridge?.ready) {
          bridge.ready.then(() => {
            if (this.frame !== frame) return;
            bridge.start(this.task);
            this.unsubscribe = bridge.subscribe((status) => this.onStatus?.({ ...status, ready: true }));
            this.container.querySelector(".ch-oslab-loading")?.setAttribute("hidden", "");
            frame.classList.add("is-ready");
            frame.focus();
          }).catch((error) => this.onError?.(`O Windows não abriu: ${error.message}`));
          return;
        }
        if (performance.now() - started > 25_000) { this.onError?.("O Windows do OSLab demorou para abrir. Clique em Recomeçar tarefa."); return; }
        this.timer = setTimeout(poll, 120);
      };
      poll();
    });
  }

  reload() { this.load(); }

  destroyFrame() {
    clearTimeout(this.timer);
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.frame) { this.frame.src = "about:blank"; this.frame.remove(); }
    this.frame = null;
  }

  destroy() { this.destroyFrame(); }

  // Baixa os arquivos do OSLab em segundo plano para o primeiro desafio abrir rápido.
  static prefetch() {
    if (OslabFrame.prefetched) return;
    OslabFrame.prefetched = true;
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.src = `${OSLAB_URL}?embed=labirinto&warm=1&v=${BUILD}`;
    frame.addEventListener("load", () => setTimeout(() => { frame.src = "about:blank"; frame.remove(); }, 1500));
    document.body.appendChild(frame);
  }
}
