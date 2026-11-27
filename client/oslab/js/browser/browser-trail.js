(function createBrowserTrail(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const KEY = "oslab.browser.trail.progress.v1";
  const icon = "assets/learning/icons/globe_search.svg";
  const step = (label, type, action, fields = {}) => ({ id: `${action}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, label, type, action, fields });
  const catalog = [
    { title: "Abrindo o navegador", instruction: "Abra o navegador para começar.", success: "Ótimo! Este programa é um navegador de internet. Navegadores acessam sites e serviços da internet.", steps: [step("Abrir o Google Chrome", "app:opened", null, { appId: "google" })] },
    { title: "Conhecendo a interface", instruction: "Explore um elemento de cada vez: barra de endereço, menu e nova aba.", success: "Você encontrou os controles principais do navegador.", steps: [step("Clicar na barra de endereço", "browser:action", "focus-address"), step("Abrir o menu do navegador", "browser:action", "menu"), step("Abrir uma nova aba", "browser:action", "new-tab")] },
    { title: "Barra de endereço", instruction: "Clique na barra de endereço do navegador, acima da página.", success: "Correto! Digite endereços como youtube.com nessa barra.", steps: [step("Identificar a barra de endereço", "browser:action", "focus-address")] },
    { title: "Barra de pesquisa", instruction: "Clique na caixa de pesquisa da página do Google.", success: "Correto! A caixa da página pesquisa assuntos. A barra de endereço também pode pesquisar.", steps: [step("Identificar a pesquisa da página", "browser:action", "focus-search")] },
    { title: "Acessando um site", instruction: "Digite wikipedia.org na barra de endereço e pressione Enter.", success: "Quando sabemos um endereço, podemos digitá-lo diretamente na barra.", steps: [step("Abrir wikipedia.org", "browser:action", "navigate", { value: "wikipedia.org", source: "address" })] },
    { title: "Pesquisando informações", instruction: "Volte ao Google e pesquise peças de um computador na caixa da página.", success: "Uma pesquisa usa palavras; uma URL leva diretamente a um site.", steps: [step("Abrir Google", "browser:action", "navigate", { value: "google.com" }), step("Pesquisar peças de um computador", "browser:action", "search", { query: "peças de um computador", source: "page" })] },
    { title: "Voltar e avançar", instruction: "Volte para os resultados e avance novamente para a página de conteúdo.", success: "Voltar retorna à página anterior; Avançar recupera a página seguinte.", steps: [step("Usar Voltar", "browser:action", "back"), step("Usar Avançar", "browser:action", "forward")] },
    { title: "Atualizar página", instruction: "Esta página falhou. Use Atualizar para carregá-la de novo.", success: "Atualizar solicita um novo carregamento da página.", steps: [step("Atualizar a página", "browser:action", "refresh", { value: "falha.oslab.local" })] },
    { title: "Trabalhando com abas", instruction: "Abra uma aba para YouTube, outra para Wikipédia, volte ao Google e feche YouTube.", success: "Abas mantêm vários sites na mesma janela.", steps: [step("Abrir nova aba", "browser:action", "new-tab"), step("Acessar youtube.com", "browser:action", "navigate", { value: "youtube.com" }), step("Abrir outra aba", "browser:action", "new-tab"), step("Acessar wikipedia.org", "browser:action", "navigate", { value: "wikipedia.org" }), step("Voltar à aba do Google", "browser:action", "switch-tab", { url: "google.com" }), step("Fechar a aba do YouTube", "browser:action", "close-tab", { closedUrl: "youtube.com" })] },
    { title: "Recuperando uma aba fechada", instruction: "Feche a aba desta página e recupere-a com Ctrl+Shift+T. Se o navegador do seu computador reservar o atalho, use Histórico → Abas fechadas recentemente.", success: "Ctrl+Shift+T recupera a última aba fechada.", steps: [step("Fechar a aba atual", "browser:action", "close-tab", { closedUrl: "componentes.oslab.local" }), step("Restaurar a aba", "browser:action", "restore-tab", { restoredUrl: "componentes.oslab.local" })] },
    { title: "Favoritos", instruction: "Na página Hardware — Guia Básico, clique na estrela e confirme o favorito.", success: "Favoritos guardam páginas para acessá-las novamente.", steps: [step("Salvar Hardware nos favoritos", "browser:action", "favorite-added", { value: "hardware.oslab.local" })] },
    { title: "Histórico", instruction: "Abra o histórico pelo menu ou Ctrl+H e encontre a Wikipédia.", success: "O histórico ajuda a encontrar páginas visitadas anteriormente.", steps: [step("Abrir o histórico", "browser:action", "history-open"), step("Reabrir Wikipédia pelo histórico", "browser:action", "history-select", { value: "wikipedia.org" })] },
    { title: "Desafio final — Navegador", instruction: "Agora faça tudo sozinho. Siga os objetivos em ordem.", success: "Parabéns! Você concluiu a trilha Navegadores e Internet.", steps: [
      step("Abra o navegador", "app:opened", null, { appId: "google" }),
      step("Acesse google.com", "browser:action", "navigate", { value: "google.com", source: "address" }),
      step("Pesquise hardware de computador", "browser:action", "search", { query: "hardware de computador" }),
      step("Abra o primeiro resultado", "browser:action", "first-result", { value: "hardware.oslab.local" }),
      step("Abra Componentes internos em uma nova aba", "browser:action", "open-tab", { value: "componentes.oslab.local" }),
      step("Adicione Componentes internos aos favoritos", "browser:action", "favorite-added", { value: "componentes.oslab.local" }),
      step("Volte para a primeira aba", "browser:action", "switch-tab", { url: "hardware.oslab.local" }),
      step("Abra uma nova aba", "browser:action", "new-tab"),
      step("Acesse wikipedia.org", "browser:action", "navigate", { value: "wikipedia.org" }),
      step("Feche a aba da Wikipédia", "browser:action", "close-tab", { closedUrl: "wikipedia.org" }),
      step("Recupere a aba fechada", "browser:action", "restore-tab", { restoredUrl: "wikipedia.org" }),
      step("Abra o histórico", "browser:action", "history-open"),
      step("Encontre Componentes internos no histórico", "browser:action", "history-select", { value: "componentes.oslab.local" }),
    ] },
  ].map((entry, index) => ({ ...entry, id: `browser-${index + 1}`, order: index + 1, icon, category: index === 12 ? "Desafio" : "Navegadores", difficulty: index === 12 ? "Final" : "Iniciante", description: entry.instruction, goal: entry.instruction, objectives: entry.steps.map(({ id, label }) => ({ id, label })) }));
  const listeners = new Set();
  const defaults = () => ({ version: 1, completed: {}, active: null, lastUpdatedAt: null });
  function load() { try { const item = JSON.parse(global.localStorage.getItem(KEY) || "null"); return item?.version === 1 ? { ...defaults(), ...item, completed: item.completed || {} } : defaults(); } catch (_) { return defaults(); } }
  let progress = load();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function persist(reason) { progress.lastUpdatedAt = new Date().toISOString(); try { global.localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_) {} listeners.forEach((listener) => listener(clone(progress), reason)); OSLab.events.emit("browser-trail:updated", { reason, progress: clone(progress) }, "browserTrail"); OSLab.assistantRobot?.render?.(); }
  function status(mission) { if (progress.active?.id === mission.id) return progress.active.phase === "completed" ? "completed" : "active"; if (progress.completed[mission.id]) return "completed"; return catalog.some((item) => item.order < mission.order && !progress.completed[item.id]) ? "locked" : "available"; }
  function getMissions() { return catalog.map((item) => ({ ...item, status: status(item) })); }
  function matches(stepItem, event) { const detail = event.detail || {}; return stepItem.type === event.type && (stepItem.action == null || detail.action === stepItem.action) && Object.entries(stepItem.fields).every(([key, value]) => detail[key] === value); }
  function evaluate(event) {
    const active = progress.active;
    if (!active || active.phase === "completed") return;
    const mission = catalog.find((item) => item.id === active.id);
    const current = mission.steps[active.index];
    if (!current || !matches(current, event)) {
      if (mission.order === 3 && event.detail?.action === "focus-search") OSLab.ui?.notify?.("Essa é a pesquisa da página", "Procure a barra de endereço acima da página.", "info");
      if (mission.order === 4 && event.detail?.action === "focus-address") OSLab.ui?.notify?.("Essa é a barra de endereço", "Procure a caixa de pesquisa no centro da página.", "info");
      return;
    }
    active.checklist[current.id] = true; active.index++;
    if (active.index >= mission.steps.length) { active.phase = "completed"; progress.completed[mission.id] = { completedAt: new Date().toISOString(), explanation: mission.success }; persist("completed"); OSLab.ui?.notify?.(mission.order === 13 ? "Trilha concluída!" : `Missão ${mission.order} concluída`, mission.success, "success", 6000); }
    else persist("advanced");
  }
  function start(id) {
    const mission = catalog.find((item) => item.id === id);
    if (!mission || status(mission) === "locked") return { ok: false };
    OSLab.activityCoordinator?.claim?.("browser-trail");
    progress.active = { id, index: 0, phase: "active", checklist: Object.fromEntries(mission.steps.map((item) => [item.id, false])) };
    persist("started");
    if ([1, 13].includes(mission.order)) OSLab.shell?.closeApp?.("google");
    else OSLab.browserApp?.prepareMission?.(mission.order);
    return { ok: true };
  }
  function finish(action = "return") {
    if (!progress.active) return { ok: false };
    const mission = catalog.find((item) => item.id === progress.active.id);
    if (action === "next" && progress.active.phase !== "completed") return { ok: false };
    progress.active = null; OSLab.activityCoordinator?.release?.("browser-trail"); persist("finished");
    if (action === "repeat") return start(mission.id);
    if (action === "next" && catalog[mission.order]) return start(catalog[mission.order].id);
    OSLab.shell?.openApp?.("browsertrail"); return { ok: true };
  }
  function stop(options = {}) { if (!progress.active) return { ok: false }; progress.active = null; OSLab.activityCoordinator?.release?.("browser-trail"); persist("exited"); if (!options.silent) OSLab.shell?.openApp?.("browsertrail"); return { ok: true }; }
  function resetAll() { if (progress.active) OSLab.activityCoordinator?.release?.("browser-trail"); progress = defaults(); try { global.localStorage.removeItem(KEY); } catch (_) {} persist("reset"); }
  OSLab.events.subscribe("oslab:event", evaluate);
  OSLab.browserTrail = { catalog, start, finish, exit: stop, resetAll, getMissions, getProgress: () => clone(progress), subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
  OSLab.activityCoordinator?.register?.("browser-trail", { isActive: () => Boolean(progress.active), stop });
})(window);
