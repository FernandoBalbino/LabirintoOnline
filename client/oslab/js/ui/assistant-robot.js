(function createLearningAssistant(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  let root = null;
  let collapsed = false;
  let previousKind = null;
  let previousDigitalMission = null;
  let previousUsersMission = null;
  let previousWifiMission = null;
  let previousDriversMission = null;
  let previousAudioMission = null;
  let previousTaskMission = null;
  let previousStoreMission = null;

  function safe(value) { return OSLab.ui.escapeHtml(value); }
  function icon(name) { return OSLab.learningPath.icon(name); }
  function mascot(state) { return `assets/learning/mascot/oslab-mascot-${state}.png`; }
  function ensure() {
    if (root) return root;
    root = document.createElement("aside");
    root.className = "learning-assistant is-hidden";
    root.setAttribute("aria-live", "polite");
    root.addEventListener("click", handleClick);
    root.addEventListener("submit", event => {
      if (event.target.matches("[data-audio-record-form]")) { event.preventDefault(); OSLab.audioLab.verifyRecord(Object.fromEntries(new FormData(event.target))); return; }
      if (event.target.matches("[data-task-record-form]")) { event.preventDefault(); OSLab.taskLab.verifyRecord(Object.fromEntries(new FormData(event.target))); return; }
      if (event.target.matches("[data-store-record-form]")) { event.preventDefault(); OSLab.storeLab.verifyRecord(Object.fromEntries(new FormData(event.target))); return; }
      if (event.target.matches("[data-drivers-record-form]")) { event.preventDefault(); OSLab.driversLab.verifyRecord(Object.fromEntries(new FormData(event.target))); return; }
      if (!event.target.matches("[data-wifi-record-form]")) return;
      event.preventDefault();
      const data = new FormData(event.target);
      OSLab.wifiLab.verifyProperties(data.get("band"), data.get("security"));
    });
    document.querySelector("#desktop")?.appendChild(root);
    return root;
  }
  function place() {
    const focusedLayout = root.classList.contains("is-users-permissions") || root.classList.contains("is-wifi-lab") || root.classList.contains("is-drivers-lab") || root.classList.contains("is-audio-lab") || root.classList.contains("is-task-lab") || root.classList.contains("is-store-lab") ? null : document.querySelector(".missions-window.is-focused .learning-layout, .exercises-window.is-focused .learning-layout, .vpn-lab-window.is-focused .learning-layout, .install-lab-window.is-focused .learning-layout, .browser-trail-window.is-focused .learning-layout");
    const host = focusedLayout || document.querySelector("#desktop");
    if (host && root.parentElement !== host) host.appendChild(root);
    root.classList.toggle("is-docked", Boolean(focusedLayout));
  }
  function hintMarkup(hint, label) {
    return hint ? OSLab.learningPath.renderHint(hint, label) : "";
  }
  function objectiveMarkup(mission, active) {
    return `<ul class="assistant-checklist">${mission.objectives.map((objective) => `<li class="${active.checklist[objective.id] ? "is-done" : ""}"><img src="${icon(active.checklist[objective.id] ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`).join("")}</ul>`;
  }
  function exercisePhaseLabel(phase) {
    return ({ preparing: "Preparando ambiente", investigating: "Investigando", partial: "Continue investigando", "awaiting-test": "Pronto para testar", testing: "Testando correção", completed: "Exercício concluído" })[phase] || "Atividade em andamento";
  }
  function renderMission(progress) {
    const active = progress.active;
    const mission = OSLab.missionCatalog.find((entry) => entry.id === active.id);
    const hint = OSLab.missions.getHint();
    const nextObjective = mission.objectives.find((objective) => !active.checklist[objective.id]);
    return {
      kind: "mission",
      mascot: hint ? "help" : "neutral",
      eyebrow: "Missão ativa",
      title: mission.title,
      message: nextObjective ? `Próximo objetivo: ${nextObjective.label}` : "Objetivos concluídos. Aguarde a confirmação da missão.",
      body: `${objectiveMarkup(mission, active)}${hintMarkup(hint, "Dica da missão")}`,
      actions: `<button type="button" data-assistant-action="mission-hint"><img src="${icon("lightbulb")}" alt="" />${hint ? "Reabrir dica" : "Dica"}</button><button type="button" data-assistant-action="mission-open"><img src="${icon("target_arrow")}" alt="" />Abrir trilha</button><button type="button" data-assistant-action="mission-restart"><img src="${icon("arrow_reset")}" alt="" />Reiniciar</button><button type="button" data-assistant-action="mission-exit"><img src="${icon("dismiss")}" alt="" />Sair</button>`,
    };
  }
  function renderExercise(session) {
    const exercise = OSLab.exerciseCatalog.find((entry) => entry.id === session.id);
    const hint = OSLab.exercises.getHint();
    const completed = session.phase === "completed";
    return {
      kind: "exercise",
      mascot: completed ? "celebrate" : hint ? "help" : "neutral",
      eyebrow: exercisePhaseLabel(session.phase),
      title: exercise.title,
      message: session.speech,
      body: `${hint && !completed ? hintMarkup(hint, "Dica passo a passo") : ""}${completed ? `<div class="assistant-result"><span><strong>Causa</strong>${safe(session.result.cause)}</span><span><strong>Ferramenta</strong>${safe(session.result.tool)}</span><span><strong>Dica</strong>${session.result.hintUsed ? "Utilizada" : "Não utilizada"}</span></div>` : ""}`,
      actions: completed
        ? `<button type="button" data-assistant-action="exercise-return"><img src="${icon("arrow_left")}" alt="" />Voltar</button><button type="button" data-assistant-action="exercise-repeat"><img src="${icon("arrow_reset")}" alt="" />Refazer</button><button class="is-primary" type="button" data-assistant-action="exercise-next"><img src="${icon("arrow_right")}" alt="" />Próximo</button>`
        : `<button type="button" data-assistant-action="exercise-hint"><img src="${icon("lightbulb")}" alt="" />${hint ? "Reabrir dica" : "Dica"}</button><button type="button" data-assistant-action="exercise-repeat-speech"><img src="${icon("more_horizontal")}" alt="" />Repetir fala</button><button class="is-primary" type="button" data-assistant-action="exercise-test"><img src="${icon("play")}" alt="" />Testar</button><button type="button" data-assistant-action="exercise-restart"><img src="${icon("arrow_reset")}" alt="" />Reiniciar</button><button type="button" data-assistant-action="exercise-exit"><img src="${icon("dismiss")}" alt="" />Sair</button>`,
    };
  }
  function renderVpnLab(progress) {
    const active = progress.active;
    const mission = OSLab.vpnMissionCatalog.find((entry) => entry.id === active.id);
    const hint = OSLab.vpnLab.getHint();
    const completed = active.phase === "completed";
    const hasNext = mission.order < OSLab.vpnMissionCatalog.length;
    const nextObjective = mission.objectives.find((objective) => !active.checklist?.[objective.id]);
    const checklist = `<ul class="assistant-checklist">${mission.objectives.map((objective) => `<li class="${active.checklist?.[objective.id] ? "is-done" : ""}"><img src="${icon(active.checklist?.[objective.id] ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`).join("")}</ul>`;
    return {
      kind: "vpn-lab",
      mascot: completed ? "celebrate" : hint ? "help" : "neutral",
      eyebrow: completed ? "Missão VPN concluída" : "Laboratório VPN",
      title: mission.title,
      message: completed ? mission.success : nextObjective ? `Próximo objetivo: ${nextObjective.label}` : "Observe o resultado no sistema e atualize a página quando necessário.",
      body: `${completed ? `<div class="assistant-result"><span><strong>Conceito</strong>${safe(mission.success)}</span></div>` : checklist}${hint && !completed ? hintMarkup(hint, `Dica ${active.hintsUsed} de ${mission.hints.length}`) : ""}`,
      actions: completed
        ? `<button type="button" data-assistant-action="vpn-lab-return"><img src="${icon("arrow_left")}" alt="" />Voltar</button><button type="button" data-assistant-action="vpn-lab-repeat"><img src="${icon("arrow_reset")}" alt="" />Refazer</button><button class="is-primary" type="button" data-assistant-action="vpn-lab-next"><img src="${icon(hasNext ? "arrow_right" : "target_arrow")}" alt="" />${hasNext ? "Próxima" : "Ver trilha"}</button>`
        : `<button type="button" data-assistant-action="vpn-lab-hint"><img src="${icon("lightbulb")}" alt="" />${active.hintsUsed >= mission.hints.length ? `Rever dica ${mission.hints.length}/${mission.hints.length}` : active.hintsUsed ? `Próxima dica ${active.hintsUsed + 1}/${mission.hints.length}` : "Dica 1/3"}</button><button type="button" data-assistant-action="vpn-lab-browser"><img src="${icon("globe_search")}" alt="" />Navegador</button><button type="button" data-assistant-action="vpn-lab-vpn"><img src="${icon("shield_checkmark")}" alt="" />VPN</button><button type="button" data-assistant-action="vpn-lab-open"><img src="${icon("target_arrow")}" alt="" />Trilha</button><button type="button" data-assistant-action="vpn-lab-exit"><img src="${icon("dismiss")}" alt="" />Sair</button>`,
    };
  }
  function renderInstallLab(progress) {
    const active = progress.active;
    const mission = OSLab.installMissionCatalog.find((entry) => entry.id === active.id);
    const hint = OSLab.installLab.getHint();
    const completed = active.phase === "completed";
    const hasNext = mission.order < OSLab.installMissionCatalog.length;
    const nextObjective = mission.objectives.find((objective) => !active.checklist?.[objective.id]);
    const checklist = `<ul class="assistant-checklist">${mission.objectives.map((objective) => `<li class="${active.checklist?.[objective.id] ? "is-done" : ""}"><img src="${icon(active.checklist?.[objective.id] ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`).join("")}</ul>`;
    return {
      kind: "install-lab",
      mascot: completed ? "celebrate" : hint ? "help" : "neutral",
      eyebrow: completed ? "Missão concluída" : "Instalação de Programas",
      title: mission.title,
      message: completed ? mission.success : nextObjective ? `Próximo objetivo: ${nextObjective.label}` : mission.instruction,
      body: `${completed ? `<div class="assistant-result"><span><strong>Aprendizado</strong>${safe(mission.success)}</span></div>` : checklist}${hint && !completed ? hintMarkup(hint, "Dica da missão") : ""}`,
      actions: completed
        ? `<button type="button" data-assistant-action="install-lab-return"><img src="${icon("arrow_left")}" alt="" />Voltar</button><button type="button" data-assistant-action="install-lab-repeat"><img src="${icon("arrow_reset")}" alt="" />Refazer</button><button class="is-primary" type="button" data-assistant-action="install-lab-next"><img src="${icon(hasNext ? "arrow_right" : "target_arrow")}" alt="" />${hasNext ? "Próxima" : "Ver trilha"}</button>`
        : `<button type="button" data-assistant-action="install-lab-hint"><img src="${icon("lightbulb")}" alt="" />${hint ? "Reabrir dica" : "Dica"}</button><button type="button" data-assistant-action="install-lab-tool"><img src="${icon(mission.order === 12 ? "apps" : "globe_search")}" alt="" />${mission.order === 12 ? "Painel de Controle" : "Navegador"}</button><button type="button" data-assistant-action="install-lab-open"><img src="${icon("target_arrow")}" alt="" />Trilha</button><button type="button" data-assistant-action="install-lab-exit"><img src="${icon("dismiss")}" alt="" />Sair</button>`,
    };
  }
  function renderUsersPermissions(progress) {
    const active = progress.active;
    const mission = OSLab.userMissionCatalog.find((entry) => entry.id === active.id);
    if (!mission || active.suspended) return null;
    const completed = active.phase === "completed";
    const hasNext = mission.order < OSLab.userMissionCatalog.length;
    const nextObjective = mission.objectives.find((objective) => !active.checklist?.[objective.id]);
    const hint = active.lastHint || null;
    return {
      kind: "users-permissions",
      mascot: completed ? "celebrate" : hint ? "help" : "neutral",
      eyebrow: completed ? "Missão concluída" : `Usuários e Permissões · Missão ${mission.order}`,
      title: mission.title,
      message: completed ? "Atividade concluída." : mission.goal,
      body: completed
        ? `<div class="assistant-result"><span><strong>Aprendizado</strong>${safe(mission.success)}</span></div>`
        : `${nextObjective ? `<p class="users-assistant-next"><strong>Etapa atual:</strong> ${safe(nextObjective.label)}</p>` : ""}${OSLab.learningPath.renderSteps(mission, active)}${hintMarkup(hint, "Dica adicional")}`,
      actions: completed
        ? `<button type="button" data-assistant-action="users-open"><img src="${icon("arrow_left")}" alt="" />Ver trilha</button><button type="button" data-assistant-action="users-repeat"><img src="${icon("arrow_reset")}" alt="" />Refazer</button><button class="is-primary" type="button" data-assistant-action="users-next"><img src="${icon(hasNext ? "arrow_right" : "target_arrow")}" alt="" />${hasNext ? "Próxima missão" : "Ver conclusão"}</button>`
        : `<button type="button" data-assistant-action="users-tool"><img src="${icon(mission.tool === "settings" ? "settings" : mission.tool === "explorer" ? "folder_search" : "globe_search")}" alt="" />Abrir ferramenta</button><button type="button" data-assistant-action="users-open"><img src="${icon("target_arrow")}" alt="" />Trilha</button><button type="button" data-assistant-action="users-pause"><img src="${icon("pause")}" alt="" />Pausar</button><button type="button" data-assistant-action="users-hint"><img src="${icon("lightbulb")}" alt="" />${active.hintsUsed ? "Próxima dica" : "Dica adicional"}</button>`,
    };
  }
  function renderBrowserTrail(progress) {
    const active = progress.active;
    const mission = OSLab.browserTrail.catalog.find((item) => item.id === active.id);
    if (!mission) return null;
    const completed = active.phase === "completed";
    const next = mission.objectives.find((item) => !active.checklist[item.id]);
    return {
      kind: "browser-trail", mascot: completed ? "celebrate" : "neutral",
      eyebrow: completed ? "Missão concluída" : "Navegadores e Internet",
      title: mission.title,
      message: completed ? mission.success : mission.order === 13 ? "Agora faça tudo sozinho. Siga os objetivos em ordem." : mission.order === 6 && active.index === 0 ? "Clique em Abrir Google abaixo para voltar à página de pesquisa." : next ? next.label : mission.instruction,
      body: `${mission.order === 10 && !completed ? "<p>Use Ctrl+Shift+T. Se o navegador do computador reservar o atalho, use Histórico → Abas fechadas recentemente.</p>" : ""}<ul class="assistant-checklist">${mission.objectives.map((item) => `<li class="${active.checklist[item.id] ? "is-done" : ""}"><img src="${icon(active.checklist[item.id] ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(item.label)}</span></li>`).join("")}</ul>`,
      actions: completed ? `<button type="button" data-assistant-action="browser-trail-return">Voltar</button><button type="button" data-assistant-action="browser-trail-repeat">Refazer</button><button class="is-primary" type="button" data-assistant-action="browser-trail-next">${mission.order === 13 ? "Ver trilha" : "Próxima"}</button>` : `<button type="button" data-assistant-action="browser-trail-browser">${mission.order === 6 ? "Abrir Google" : "Navegador"}</button><button type="button" data-assistant-action="browser-trail-open">Trilha</button><button type="button" data-assistant-action="browser-trail-exit">Sair</button>`,
    };
  }
  function render() {
    ensure();
    const missionProgress = OSLab.missions?.getProgress?.();
    const exerciseSession = OSLab.exercises?.getSession?.();
    const vpnLabProgress = OSLab.vpnLab?.getProgress?.();
    const installLabProgress = OSLab.installLab?.getProgress?.();
    const browserTrailProgress = OSLab.browserTrail?.getProgress?.();
    const usersProgress = OSLab.userMissions?.getProgress?.();
    const view = OSLab.wifiLabApp?.assistantView() || OSLab.driversLabApp?.assistantView() || OSLab.audioLabApp?.assistantView() || OSLab.taskLabApp?.assistantView() || OSLab.storeTrailApp?.assistantView() || OSLab.digitalLifeApp?.assistantView() || (usersProgress?.active && !usersProgress.active.suspended ? renderUsersPermissions(usersProgress) : browserTrailProgress?.active ? renderBrowserTrail(browserTrailProgress) : installLabProgress?.active ? renderInstallLab(installLabProgress) : vpnLabProgress?.active ? renderVpnLab(vpnLabProgress) : exerciseSession ? renderExercise(exerciseSession) : missionProgress?.active ? renderMission(missionProgress) : null);
    if (view?.kind === "browser-trail" && (document.querySelector(".browser-museum-window.is-focused:not(.is-minimized)") || OSLab.browserMuseum?.getSelected?.())) {
      document.body.classList.remove("has-learning-assistant");
      root.className = "learning-assistant is-hidden";
      root.innerHTML = "";
      place();
      return;
    }
    const digitalMission = view?.kind === "digital-life" ? OSLab.digitalLifeTrail.getProgress().active?.id : null;
    if (digitalMission && (previousKind !== "digital-life" || digitalMission !== previousDigitalMission)) collapsed = true;
    const usersMission = view?.kind === "users-permissions" ? usersProgress.active?.id : null;
    if (usersMission && (previousKind !== "users-permissions" || usersMission !== previousUsersMission)) collapsed = false;
    previousDigitalMission = digitalMission;
    previousUsersMission = usersMission;
    const wifiMission = view?.kind === "wifi-lab" ? OSLab.wifiLab.getProgress().active?.id : null;
    if (wifiMission && wifiMission !== previousWifiMission) collapsed = false;
    previousWifiMission = wifiMission;
    const driversMission = view?.kind === "drivers-lab" ? OSLab.driversLab.getProgress().active?.id : null;
    if (driversMission && driversMission !== previousDriversMission) collapsed = false;
    previousDriversMission = driversMission;
    const audioMission = view?.kind === "audio-lab" ? OSLab.audioLab.getProgress().active?.id : null;
    if (audioMission && audioMission !== previousAudioMission) collapsed = false;
    previousAudioMission = audioMission;
    const taskMission = view?.kind === "task-lab" ? OSLab.taskLab.getProgress().active?.id : null;
    if (taskMission && taskMission !== previousTaskMission) collapsed = false;
    previousTaskMission = taskMission;
    const storeMission = view?.kind === "store-lab" ? OSLab.storeLab.getProgress().active?.id : null;
    if (storeMission && storeMission !== previousStoreMission) collapsed = false;
    previousStoreMission = storeMission;
    previousKind = view?.kind || null;
    document.body.classList.toggle("has-learning-assistant", Boolean(view));
    if (!view) { root.className = "learning-assistant is-hidden"; root.innerHTML = ""; place(); return; }
    // o robô se redesenha quando o foco muda de janela: guarda o que o aluno já escolheu nos formulários da mesma missão
    const kept = root.dataset.formFor === view.title ? [...root.querySelectorAll("form select, form input:not([type=submit])")].filter((el) => el.name && el.value).map((el) => [el.name, el.value]) : [];
    root.dataset.formFor = view.title;
    root.className = `learning-assistant is-${view.kind} ${collapsed ? "is-collapsed" : ""}`;
    root.innerHTML = `<div class="assistant-shell"><header><img class="assistant-mascot" src="${mascot(view.mascot)}" alt="Mascote assistente do OSLab" /><span><small>${safe(view.eyebrow)}</small><strong>${safe(view.title)}</strong></span><button type="button" data-assistant-action="toggle" aria-expanded="${!collapsed}" aria-label="${collapsed ? "Expandir assistente" : "Recolher assistente"}"><img src="${icon("panel_right")}" alt="" /></button></header><div class="assistant-body"><p>${safe(view.message)}</p>${view.body}<footer>${view.actions}</footer></div></div>`;
    kept.forEach(([name, value]) => { const el = root.querySelector(`form [name="${name}"]`); if (el && !el.value) el.value = value; });
    place();
  }

  async function handleClick(event) {
    const wifiAnswer = event.target.closest("[data-wifi-answer]");
    if (wifiAnswer) { OSLab.wifiLab.answer(Number(wifiAnswer.dataset.wifiAnswer)); return; }
    const driversAnswer = event.target.closest("[data-drivers-answer]");
    if (driversAnswer) { OSLab.driversLab.answer(Number(driversAnswer.dataset.driversAnswer)); return; }
    const storeAnswer = event.target.closest("[data-store-answer]");
    if (storeAnswer) { OSLab.storeLab.answer(Number(storeAnswer.dataset.storeAnswer)); return; }
    const taskAnswer = event.target.closest("[data-task-answer]");
    if (taskAnswer) { OSLab.taskLab.answer(Number(taskAnswer.dataset.taskAnswer)); return; }
    const audioAnswer = event.target.closest("[data-audio-answer]");
    if (audioAnswer) { OSLab.audioLab.answer(Number(audioAnswer.dataset.audioAnswer)); return; }
    const action = event.target.closest("[data-assistant-action]")?.dataset.assistantAction;
    if (!action) return;
    if (action === "wifi-open") OSLab.shell.openApp("wifilab");
    if (action === "wifi-tool") { event.stopPropagation(); OSLab.wifiLabApp.openTool(); }
    if (action === "wifi-hint") OSLab.wifiLab.useHint();
    if (action === "wifi-restart") OSLab.wifiLab.restart();
    if (action === "wifi-repeat") OSLab.wifiLab.finish("repeat");
    if (action === "wifi-next") OSLab.wifiLab.finish("next");
    if (action === "wifi-pause") { OSLab.wifiLab.stop(); OSLab.shell.openApp("wifilab"); }
    if (action === "drivers-open") OSLab.shell.openApp("driverslab");
    if (action === "drivers-tool") { event.stopPropagation(); OSLab.driversLabApp.openTool(); }
    if (action === "drivers-hint") OSLab.driversLab.useHint();
    if (action === "drivers-restart") OSLab.driversLab.restart();
    if (action === "drivers-repeat") OSLab.driversLab.finish("repeat");
    if (action === "drivers-next") OSLab.driversLab.finish("next");
    if (action === "drivers-pause") { OSLab.driversLab.stop(); OSLab.shell.openApp("driverslab"); }
    if (action === "audio-open") OSLab.shell.openApp("audiolab");
    if (action === "audio-tool") { event.stopPropagation(); OSLab.audioLabApp.openTool(); }
    if (action === "audio-hint") OSLab.audioLab.useHint();
    if (action === "audio-restart") OSLab.audioLab.restart();
    if (action === "audio-repeat") OSLab.audioLab.finish("repeat");
    if (action === "audio-next") OSLab.audioLab.finish("next");
    if (action === "audio-pause") { OSLab.audioLab.stop(); OSLab.shell.openApp("audiolab"); }
    if (action.startsWith("store-")) { await OSLab.storeTrailApp.action(action, event); return; }
    if (action === "task-open") OSLab.shell.openApp("tasklab");
    if (action === "task-tool") { event.stopPropagation(); OSLab.taskLabApp.openTool(); }
    if (action === "task-hint") OSLab.taskLab.useHint();
    if (action === "task-restart" && await OSLab.ui.confirm({ title: "Reiniciar a missão?", message: "Tudo volta ao começo desta missão: os passos são zerados e o problema é preparado de novo. Use quando algo deu errado e você não consegue continuar.", confirmLabel: "Reiniciar missão" })) OSLab.taskLab.restart();
    if (action === "task-repeat") OSLab.taskLab.finish("repeat");
    if (action === "task-next") OSLab.taskLab.finish("next");
    if (action === "task-pause") { OSLab.taskLab.stop(); OSLab.shell.openApp("tasklab"); }
    if (action === "digital-hint") OSLab.digitalLifeTrail.hint();
    if (action === "digital-browser") OSLab.shell.openApp("google");
    if (action === "digital-open") OSLab.shell.openApp("digitallife");
    if (action === "digital-next") OSLab.digitalLifeTrail.next();
    if (action === "digital-pause") OSLab.digitalLifeTrail.stop();
    if (action === "toggle") { collapsed = !collapsed; render(); return; }
    if (action === "mission-hint") { OSLab.missions.useHint(); collapsed = false; render(); }
    if (action === "mission-open") OSLab.shell.openApp("missions");
    if (action === "mission-restart" && await OSLab.ui.confirm({ title: "Reiniciar missão?", message: "O cenário será preparado novamente.", confirmLabel: "Reiniciar" })) OSLab.missions.restart();
    if (action === "mission-exit" && await OSLab.ui.confirm({ title: "Sair da missão?", message: "Os itens temporários da missão serão removidos.", confirmLabel: "Sair" })) OSLab.missions.abandon();
    if (action === "exercise-hint") { OSLab.exercises.useHint(); collapsed = false; render(); }
    if (action === "exercise-repeat-speech") { const speech = OSLab.exercises.repeatSpeech(); if (speech) OSLab.ui.notify("Assistente OSLab", speech, "info", 5200); }
    if (action === "exercise-test") OSLab.exercises.runTest();
    if (action === "exercise-restart" && await OSLab.ui.confirm({ title: "Reiniciar exercício?", message: "O ambiente será restaurado e preparado novamente.", confirmLabel: "Reiniciar" })) OSLab.exercises.restart();
    if (action === "exercise-exit" && await OSLab.ui.confirm({ title: "Sair do exercício?", message: "O sistema voltará ao estado anterior.", confirmLabel: "Sair" })) OSLab.exercises.exit();
    if (action === "exercise-return") OSLab.exercises.finish("return");
    if (action === "exercise-repeat") OSLab.exercises.finish("repeat");
    if (action === "exercise-next") OSLab.exercises.finish("next");
    if (action === "vpn-lab-hint") { OSLab.vpnLab.useHint(); collapsed = false; render(); }
    if (action === "vpn-lab-browser") OSLab.shell.openApp("google");
    if (action === "vpn-lab-vpn") OSLab.shell.openApp("vpn");
    if (action === "vpn-lab-open") OSLab.shell.openApp("vpnlab");
    if (action === "vpn-lab-exit" && await OSLab.ui.confirm({ title: "Sair da missão VPN?", message: "A conexão VPN atual será mantida, mas esta tentativa será encerrada.", confirmLabel: "Sair" })) OSLab.vpnLab.exit();
    if (action === "vpn-lab-return") OSLab.vpnLab.finish("return");
    if (action === "vpn-lab-repeat") OSLab.vpnLab.finish("repeat");
    if (action === "vpn-lab-next") OSLab.vpnLab.finish("next");
    if (action === "install-lab-hint") { OSLab.installLab.useHint(); collapsed = false; render(); }
    if (action === "install-lab-tool") { const mission = OSLab.installMissionCatalog.find((entry) => entry.id === OSLab.installLab.getProgress().active?.id); OSLab.shell.openApp(mission?.order === 12 ? "controlpanel" : "google"); }
    if (action === "install-lab-open") OSLab.shell.openApp("installlab");
    if (action === "install-lab-exit" && await OSLab.ui.confirm({ title: "Sair da missão?", message: "O estado dos downloads e programas será mantido, mas esta tentativa será encerrada.", confirmLabel: "Sair" })) OSLab.installLab.exit();
    if (action === "install-lab-return") OSLab.installLab.finish("return");
    if (action === "install-lab-repeat") OSLab.installLab.finish("repeat");
    if (action === "install-lab-next") OSLab.installLab.finish("next");
    if (action === "users-hint") { OSLab.userMissions.useHint(); collapsed = false; render(); }
    if (action === "users-tool") {
      const mission = OSLab.userMissionCatalog.find((entry) => entry.id === OSLab.userMissions.getProgress().active?.id);
      if (mission?.tool) OSLab.shell.openApp(mission.tool, mission.tool === "settings" ? { settingsView: "accounts" } : {});
    }
    if (action === "users-open") OSLab.shell.openApp("userspermissions");
    if (action === "users-pause") { OSLab.userMissions.stop(); OSLab.shell.openApp("userspermissions"); }
    if (action === "users-repeat") OSLab.userMissions.finish("repeat");
    if (action === "users-next") OSLab.userMissions.finish("next");
    if (action === "browser-trail-browser") { const record = OSLab.shell.openApp("google"); if (record && OSLab.browserTrail?.getProgress?.().active?.id === "browser-6") OSLab.browserApp.openGoogle(record); }
    if (action === "browser-trail-open") OSLab.shell.openApp("browsertrail");
    if (action === "browser-trail-exit" && await OSLab.ui.confirm({ title: "Sair da missão?", message: "Esta tentativa será encerrada.", confirmLabel: "Sair" })) OSLab.browserTrail.exit();
    if (action === "browser-trail-return") OSLab.browserTrail.finish("return");
    if (action === "browser-trail-repeat") OSLab.browserTrail.finish("repeat");
    if (action === "browser-trail-next") OSLab.browserTrail.finish("next");
  }

  document.addEventListener("DOMContentLoaded", render);
  document.addEventListener("oslab:window-focused", () => window.requestAnimationFrame(render));
  OSLab.missions?.subscribe?.(render);
  OSLab.exercises?.subscribe?.(render);
  OSLab.vpnLab?.subscribe?.(render);
  OSLab.installLab?.subscribe?.(render);
  OSLab.browserTrail?.subscribe?.(render);
  OSLab.userMissions?.subscribe?.(render);
  OSLab.wifiLab?.subscribe?.(render);
  ["app:opened", "app:closed", "window:minimized", "window:maximized", "window:restored"].forEach((type) => OSLab.events?.subscribe?.(type, () => window.requestAnimationFrame(render)));
  OSLab.assistantRobot = { render, expand() { collapsed = false; render(); }, collapse() { collapsed = true; render(); } };
})(window);
