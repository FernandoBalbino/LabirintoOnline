(function createTaskManagerTrail(global) {
  "use strict";

  // Trilha "Gerenciador de Tarefas": 12 missões práticas, conferidas pelos eventos reais do OSLab.
  const O = global.OSLab, listeners = new Set();
  const KEY = "oslab.taskmgr.missions.v1";
  const TAG = "taskmgr-lab";
  const PID = 7340, DECOY = 7430;
  const icon = (name) => `assets/learning/icons/${name}.svg`;
  const q = (text, options, correct, explanations) => ({ text, options, correct, explanations });
  const FIVE = ["google", "explorer", "settings", "terminal"];
  const HIGH = ["discord", "spotify", "cloud-sync", "game-launcher", "meeting-app"];

  // [título, descrição, objetivo, ícone, exemplo, passos [id, texto], pergunta]
  const rows = [
    ["Abra o Gerenciador de Tarefas", "No OSLab, que roda no navegador do Chromebook, o jeito que sempre funciona é pela barra de tarefas, a faixa lá embaixo da tela.", "Clique com o botão direito em um espaço vazio da barra de tarefas e escolha Gerenciador de Tarefas.", "apps",
      "No Chromebook, o botão direito é tocar no touchpad com DOIS dedos ao mesmo tempo (ou segurar Alt e clicar). Clique num espaço vazio, sem ícone em cima.",
      [["menu", "Clique com o botão direito em um espaço VAZIO da barra de tarefas."], ["open", "No menu que abriu, clique em Gerenciador de Tarefas."]],
      q("No Windows de verdade, qual atalho abre o Gerenciador de Tarefas direto?", ["Ctrl + Shift + Esc", "Ctrl + C", "Alt + F4"], 0, ["Correto! Ctrl + Shift + Esc abre o Gerenciador direto. No OSLab esse atalho abre o gerenciador do próprio Chrome, por isso aqui usamos a barra de tarefas.", "Ctrl + C copia. Ele não abre nada.", "Alt + F4 fecha a janela da frente e, se o programa travou, nem isso funciona."])],
    ["Aplicativos ou segundo plano?", "A aba Processos separa o que está rodando em três grupos. Saber ler esses grupos é o primeiro passo de qualquer diagnóstico.", "Abra o Google Chrome e o Explorador de Arquivos, ache os dois no Gerenciador e registre o grupo de cada processo.", "list_bar",
      "Aplicativos = programas com janela aberta. Processos em segundo plano = programas sem janela (antivírus, atualizadores). Processos do Windows = partes do próprio sistema.",
      [["apps", "Abra o Google Chrome e o Explorador de Arquivos pela barra de tarefas."], ["tm", "Abra o Gerenciador de Tarefas e encontre os dois em Aplicativos."], ["recorded", "No robô, escolha o grupo de cada processo e clique em Conferir."]],
      q("O Antimalware Service Executable fica em segundo plano porque…", ["É o antivírus do Windows trabalhando sem janela.", "É um vírus escondido.", "É um jogo minimizado."], 0, ["Correto! Ele é o Microsoft Defender protegendo o computador o tempo todo, sem precisar de janela.", "Ele faz parte do Windows. Não finalize nem apague.", "Programa minimizado continua em Aplicativos, porque tem janela."])],
    ["Travou! O X não fecha", "Cinco programas estão abertos e você precisa liberar o computador. Um deles vai travar bem na hora de fechar.", "Tente fechar o Editor de Texto pelo X. Quando ele travar, finalize os 5 programas pelo Gerenciador.", "dismiss_circle",
      "Programa travado mostra (Não respondendo) no título, fica esbranquiçado e o X não funciona. No Gerenciador, a coluna Status mostra Não respondendo.",
      [["x", "Clique no X do Editor de Texto, no canto de cima da janela."], ["tm", "Travou! Abra o Gerenciador: botão direito em um espaço vazio da barra de tarefas."], ["hung", "Selecione o Editor de Texto (Não respondendo) e clique em Finalizar tarefa."], ["all", "Finalize também Google Chrome, Explorador de Arquivos, Configurações e Terminal."]],
      q("Quando um programa trava, o certo é…", ["Finalizar só ele no Gerenciador de Tarefas.", "Desligar o computador no botão.", "Esperar o computador desligar sozinho."], 0, ["Correto! Você fecha só o programa travado e o resto continua funcionando.", "Desligar no botão fecha tudo sem salvar e pode estragar arquivos.", "O computador não desliga sozinho por causa de um programa travado."])],
    ["Procure pelo PID", `O técnico ligou: "Finaliza para mim o Assistente de Atualização com PID ${PID}". Tem dois processos com o mesmo nome: só o número (PID) diferencia.`, `Pesquise o PID ${PID}, confira na página Detalhes e finalize o processo certo.`, "folder_search",
      "A caixa de pesquisa no topo aceita nome, editor ou PID. Em Detalhes, a coluna PID mostra o número de cada processo.",
      [["search", `Abra o Gerenciador e digite ${PID} na caixa de pesquisa lá em cima.`], ["details", "Abra a página Detalhes no menu da esquerda e confira a coluna PID."], ["end", `Selecione o processo com PID ${PID} e clique em Finalizar tarefa.`]],
      q("Para que serve o PID?", ["É o número que identifica cada processo em execução.", "É a senha do administrador.", "É a porcentagem de CPU."], 0, ["Correto! Dois processos podem ter o mesmo nome, mas nunca o mesmo PID.", "Senha não aparece no Gerenciador.", "A CPU tem coluna própria."])],
    ["O menu Iniciar não abre", "Clicar no botão Iniciar não faz nada. Quem desenha a barra de tarefas, o menu Iniciar e as pastas é o Windows Explorer.", "Reinicie o Windows Explorer pelo Gerenciador e teste o menu Iniciar de novo.", "arrow_reset",
      "Selecione Windows Explorer (em Processos do Windows): o botão Finalizar tarefa vira Reiniciar tarefa. A barra some por um instante e volta.",
      [["start-fail", "Clique no botão Iniciar e veja que nada acontece."], ["restart", "No Gerenciador, selecione Windows Explorer e clique em Reiniciar tarefa."], ["start-ok", "Clique no Iniciar de novo: agora o menu abre."]],
      q("Reiniciar o Windows Explorer serve para…", ["Recarregar a barra de tarefas, o menu Iniciar e as pastas sem reiniciar o PC.", "Apagar os arquivos da Área de Trabalho.", "Atualizar o Windows."], 0, ["Correto! É um conserto rápido quando a barra ou o Iniciar travam.", "Os arquivos continuam todos lá.", "Atualização é no Windows Update."])],
    ["Computador lento: CPU em 100%", "Tudo está lento. Algum programa está usando quase todo o processador (a CPU).", "Veja a CPU em Desempenho, ordene os Processos pela CPU, finalize o culpado e confira a CPU cair.", "top_speed",
      "Clique no título da coluna CPU para colocar quem usa mais em cima. Não finalize processos do Windows.",
      [["perf", "No Gerenciador, abra Desempenho e veja a CPU perto de 100%."], ["sort", "Volte em Processos e clique no título da coluna CPU."], ["end", "Finalize o Conversor de Vídeo, que está usando quase toda a CPU."], ["check", "Abra Desempenho de novo e confira que a CPU caiu."]],
      q("CPU em 100% deixa o computador…", ["Lento, porque o processador não dá conta de tudo.", "Sem internet.", "Sem som."], 0, ["Correto! Com o processador ocupado, todo o resto espera na fila.", "Internet depende da rede, não da CPU.", "Som depende de driver e dispositivo."])],
    ["Memória cheia", "O Google Chrome não abre: Memória insuficiente. Um programa em segundo plano está ocupando quase toda a memória RAM.", "Ordene por Memória, finalize o programa que mais usa RAM (que não seja do Windows) e abra o Chrome.", "data_histogram",
      "A coluna Memória mostra quantos MB cada programa ocupa. 1 GB = 1024 MB. Este computador tem 4 GB no total.",
      [["blocked", "Tente abrir o Google Chrome e leia o aviso."], ["sort", "No Gerenciador, clique no título da coluna Memória."], ["end", "Finalize o Editor de Fotos Pro."], ["open", "Abra o Google Chrome de novo."]],
      q("A memória RAM guarda…", ["Os programas que estão abertos agora.", "Os arquivos para sempre, mesmo desligado.", "A senha do Wi-Fi."], 0, ["Correto! RAM é a mesa de trabalho: o que está aberto fica nela. Encheu, nada novo cabe.", "Guardar para sempre é papel do disco (SSD ou HD).", "A senha do Wi-Fi fica salva no sistema, não ocupa a RAM."])],
    ["Não feche: economize", "O Atualizador de Jogos está baixando uma atualização grande e deixando tudo pesado. Fechar cancelaria o download.", "Ative o Modo de eficiência no Atualizador de Jogos, sem finalizar.", "timer",
      "Modo de eficiência (a folhinha) dá prioridade baixa ao programa: ele continua funcionando, só que sem atrapalhar os outros.",
      [["find", "No Gerenciador, selecione o Atualizador de Jogos em Processos em segundo plano."], ["eff", "Clique em Modo de eficiência e confira a folhinha na coluna Status."]],
      q("Quando usar Modo de eficiência em vez de Finalizar tarefa?", ["Quando o programa precisa continuar rodando, mas está pesado.", "Quando o programa travou.", "Nunca."], 0, ["Correto! O download continua e o computador fica leve.", "Travado não melhora com eficiência: aí é Finalizar tarefa.", "Ele existe justamente para não precisar fechar tudo."])],
    ["Leia o Desempenho", "Um cliente quer saber qual processador e quanta memória o computador tem. Dá para ver tudo em Desempenho, sem abrir o gabinete.", "Abra Desempenho, veja CPU, Memória e Disco e registre no robô.", "hard_drive",
      "Em Desempenho, o nome do processador aparece no topo da CPU; o total de memória aparece no topo de Memória; Disco mostra se é SSD ou HD.",
      [["cpu", "Em Desempenho, clique em CPU e leia o nome do processador."], ["mem", "Clique em Memória e leia o total de GB."], ["recorded", "No robô, registre processador, memória e tipo de disco."]],
      q("Para que serve a página Desempenho?", ["Ver o uso de CPU, memória, disco e rede em tempo real.", "Instalar programas.", "Trocar o papel de parede."], 0, ["Correto! E ainda mostra as peças do computador.", "Instalar é pelo instalador do programa.", "Papel de parede é em Configurações › Personalização."])],
    ["Um programa abre sozinho", "Toda vez que o computador liga, o Discord abre sozinho e deixa tudo mais lento. Primeiro veja isso acontecer, depois resolva.", "Reinicie, veja o Discord abrir sozinho, desabilite-o em Aplicativos de inicialização e reinicie de novo para conferir.", "play",
      "Reiniciar: botão Iniciar › Energia (⏻) › Reiniciar. Programas Habilitados em Aplicativos de inicialização abrem junto com o Windows.",
      [["boot1", "Reinicie o computador: Iniciar › Energia › Reiniciar. Depois entre com a senha."], ["saw", "Veja: o Discord abriu sozinho, sem você clicar."], ["disable", "Abra o Gerenciador › Aplicativos de inicialização, selecione Discord e clique em Desabilitar."], ["boot2", "Reinicie de novo e confira: o Discord não abre mais."]],
      q("Desabilitar um programa na inicialização…", ["Só impede que ele abra sozinho; ele continua instalado.", "Desinstala o programa.", "Apaga a conta do Discord."], 0, ["Correto! Você ainda pode abrir o Discord quando quiser.", "Para desinstalar é em Configurações › Aplicativos.", "A conta fica na internet e não é afetada."])],
    ["Inicialização lenta", "O computador demora para ficar pronto: vários programas de impacto Alto iniciam junto. A Segurança do Windows precisa continuar ligada.", "Desabilite os programas de impacto Alto (menos a Segurança do Windows), reinicie e compare.", "timer",
      "A coluna Impacto na inicialização mostra Alto, Médio ou Baixo. Comece pelos de impacto Alto que você não precisa logo ao ligar.",
      [["page", "Abra o Gerenciador › Aplicativos de inicialização e leia a coluna Impacto."], ["disable", "Desabilite todos os de impacto Alto. Deixe a Segurança do Windows habilitada."], ["boot", "Reinicie e veja o computador ficar pronto bem mais rápido."]],
      q("Por que deixar a Segurança do Windows habilitada?", ["Porque ela protege o computador desde o momento em que ele liga.", "Porque ela deixa a internet mais rápida.", "Porque é um jogo."], 0, ["Correto! Antivírus que só liga depois deixa uma janela para ataques.", "Ela não acelera a internet.", "É a proteção do Windows."])],
    ["Desafio: o chamado da secretaria", "Chamado aberto pela secretaria: \"O computador trava, fica lento e um programa abre sozinho toda vez\". Resolva tudo sozinho, como um técnico.", "Finalize o programa travado e o que usa muita CPU, desabilite o Spotify na inicialização e reinicie para comprovar.", "trophy",
      "Use tudo da trilha: Status Não respondendo, coluna CPU, Aplicativos de inicialização e Reiniciar.",
      [["hung", "Finalize o programa que está Não respondendo."], ["cpu", "Finalize o processo que está usando quase toda a CPU."], ["startup", "Desabilite o Spotify em Aplicativos de inicialização."], ["boot", "Reinicie o computador e confira que ficou tudo normal."]],
      q("Qual é a ordem certa de um bom técnico?", ["Observar o sintoma, achar a causa no Gerenciador e corrigir só ela.", "Formatar o computador logo de cara.", "Finalizar todos os processos da lista."], 0, ["Correto! Diagnóstico primeiro, correção certeira depois.", "Formatar apaga tudo e quase nunca é necessário.", "Finalizar processos do Windows pode travar ou desligar o computador."])],
  ];

  const catalog = rows.map(([title, description, goal, ic, example, steps, quiz], i) => ({
    id: `taskmgr-${i + 1}`, order: i + 1, title, description, goal, icon: icon(ic), tool: i === 0 ? "taskbar" : "taskmanager", example,
    category: i < 2 ? "Abrir e entender" : i < 5 ? "Programas travados" : i < 9 ? "Computador lento" : "Inicialização", difficulty: i < 5 ? "Básico" : "Intermediário",
    steps: steps.map(([objectiveId, text]) => ({ objectiveId, text })), objectives: steps.map(([id, label]) => ({ id, label })),
    hints: [description, `Exemplo: ${example}`, steps.map(([, t]) => t).join(" ")], quiz, success: quiz.explanations[quiz.correct],
  }));
  const TOTAL = catalog.length;

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const blank = () => ({ version: 1, completed: {}, active: null, totalScore: 0 });
  function load() { try { const v = JSON.parse(global.localStorage.getItem(KEY)); return v?.version === 1 && v.completed ? { ...blank(), ...v } : blank(); } catch (_) { return blank(); } }
  let progress = load();
  if (progress.active && !catalog.some((m) => m.id === progress.active.id)) progress.active = null;
  function save() { try { global.localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_) { /* sem armazenamento */ } }
  function publish(reason) { save(); listeners.forEach((fn) => fn(clone(progress), reason)); O.assistantRobot?.render?.(); }
  const missionOf = (a = progress.active) => catalog.find((m) => m.id === a?.id);
  const PM = () => O.processManager;
  const open = (appId) => Boolean(O.shell?.isWindowOpen?.(appId));
  const root = () => global.document?.documentElement;

  function getMissions() {
    return catalog.map((m, i) => ({ ...m, status: progress.active?.id === m.id && progress.active.phase !== "completed" ? "active" : progress.completed[m.id] ? "completed" : !i || progress.completed[catalog[i - 1].id] ? "available" : "locked" }));
  }

  // ---------- cenários ----------
  function scenarioProcess(input) { return PM()?.createProcess?.({ kind: "background", fixed: true, missionId: TAG, ...input }); }
  function cleanup() {
    PM()?.resetMissionProcesses?.(TAG);
    O.shell?.closeMissionWindows?.(TAG);
    root()?.classList.remove("is-start-glitch");
    O.systemState?.configure?.({ blockedAppId: null, requiredAppMemoryMb: 0, slowMode: false });
  }
  function prepare(order) {
    cleanup();
    const S = O.shell;
    if (order === 1) S?.closeApp?.("taskmanager");
    if (order === 3) {
      S?.closeApp?.("taskmanager");
      FIVE.forEach((id) => S?.openApp?.(id, { missionId: TAG }));
      S?.openTextEditor?.({ missionId: TAG, hangOnClose: true, title: "Editor de Texto", text: "Trabalho de História — 2º ano\n\nA Revolução Industrial começou na Inglaterra, no século XVIII, quando as máquinas a vapor..." });
    }
    if (order === 4) [PID, DECOY].forEach((pid) => scenarioProcess({ pid, appId: `taskmgr-update-${pid}`, name: "Assistente de Atualização", exe: "UpdateAssistant.exe", icon: "assets/icons/settings-rows/nearshare.png", cpu: 0.4, memory: 38.5 }));
    if (order === 5) root()?.classList.add("is-start-glitch");
    if (order === 6) { scenarioProcess({ appId: "taskmgr-cpu", name: "Conversor de Vídeo", exe: "VideoConverter.exe", icon: "assets/icons/settings-rows/video.png", cpu: 94, memory: 212, disk: 3.1 }); O.systemState?.configure?.({ slowMode: true }); }
    if (order === 7) { S?.closeApp?.("google"); scenarioProcess({ appId: "taskmgr-mem", name: "Editor de Fotos Pro", exe: "PhotoEditorPro.exe", icon: "assets/icons/win/pictures.png", cpu: 1.2, memory: 2900 }); O.systemState?.configure?.({ blockedAppId: "google", requiredAppMemoryMb: 700 }); }
    if (order === 8) scenarioProcess({ appId: "taskmgr-eff", name: "Atualizador de Jogos", exe: "GameUpdater.exe", icon: "assets/settings/Gaming.webp", cpu: 38, memory: 164, disk: 4.2, network: 6.5 });
    if (order === 10) { S?.closeApp?.("discord"); O.store?.install?.("discord", { instant: true }); PM()?.setStartupEnabled?.("discord", true); }
    if (order === 11) [...HIGH, "media-helper"].forEach((id) => PM()?.setStartupEnabled?.(id, true));
    if (order === 12) {
      S?.openTextEditor?.({ missionId: TAG, frozen: true, title: "Notas da Secretaria" });
      scenarioProcess({ appId: "taskmgr-cpu2", name: "Atualizador Automático", exe: "AutoUpdater.exe", icon: "assets/icons/settings-rows/nearshare.png", cpu: 88, memory: 96 });
      PM()?.setStartupEnabled?.("spotify", true);
      O.systemState?.configure?.({ slowMode: true });
    }
  }
  /** cenários que somem ao reiniciar são montados de novo, com o motivo */
  function reprepare(order) {
    const a = progress.active;
    if (order === 12) {
      if (!a.checklist.hung) O.shell?.openTextEditor?.({ missionId: TAG, frozen: true, title: "Notas da Secretaria" });
      if (!a.checklist.cpu) scenarioProcess({ appId: "taskmgr-cpu2", name: "Atualizador Automático", exe: "AutoUpdater.exe", icon: "assets/icons/settings-rows/nearshare.png", cpu: 88, memory: 96 });
      if (!a.checklist.hung || !a.checklist.cpu) { O.systemState?.configure?.({ slowMode: true }); notice("Reiniciar fecha tudo e esconde o problema, mas o chamado pede para resolver pelo Gerenciador, sem perder o que está aberto. O problema voltou: use o Gerenciador antes de reiniciar."); }
      return;
    }
    prepare(order);
    a.checklist = {};
    notice("Você reiniciou no meio da missão. Reiniciar fecha tudo sem salvar e o problema volta depois. Preparei tudo de novo: resolva pelo Gerenciador de Tarefas.");
  }

  function start(id) {
    const mission = getMissions().find((m) => m.id === id);
    if (!mission || mission.status === "locked") return { ok: false, reason: "locked" };
    if (progress.active?.id === id && progress.active.phase !== "completed" && progress.active.suspended) { O.activityCoordinator?.claim?.("task-lab"); progress.active.suspended = false; }
    else {
      if (progress.active && !progress.active.suspended) stop();
      O.activityCoordinator?.claim?.("task-lab");
      progress.active = { id, phase: "practice", suspended: false, checklist: {}, closed: [], hintsUsed: 0, lastHint: null, feedback: null, notice: null, recordFeedback: null, startedAt: Date.now(), before: PM()?.estimateBootTime?.() || 0, after: null };
      prepare(mission.order);
      if (mission.order === 11) progress.active.before = PM()?.estimateBootTime?.() || 0;
      if (mission.order === 2 && open("google") && open("explorer")) mark("apps");
    }
    publish("started"); O.assistantRobot?.expand?.(); return { ok: true };
  }
  function stop() {
    const a = progress.active;
    if (!a || a.suspended) return;
    a.suspended = true; O.activityCoordinator?.release?.("task-lab"); publish("suspended");
  }
  function ready() {
    const a = progress.active, m = missionOf();
    return Boolean(a && m && m.objectives.every((o) => a.checklist[o.id]));
  }
  function evaluate() {
    const a = progress.active;
    if (!a || a.suspended || a.phase === "completed") return;
    const solved = ready();
    if (solved && a.phase !== "question") { a.phase = "question"; a.feedback = null; a.notice = null; O.assistantRobot?.expand?.(); }
    else if (!solved && a.phase === "question") a.phase = "practice";
    publish("objective");
  }
  function mark(id) { const a = progress.active; if (a && !a.checklist[id]) { a.checklist[id] = true; a.notice = null; } }
  function unmark(id) { const a = progress.active; if (a) delete a.checklist[id]; }
  function notice(text) { const a = progress.active; if (a) { a.notice = text; O.assistantRobot?.expand?.(); } }
  const highEnabled = () => (PM()?.getStartupApps?.() || []).filter((app) => HIGH.includes(app.id) && app.enabled);

  O.events.subscribe("oslab:event", ({ type, detail = {} }) => {
    const a = progress.active, order = missionOf()?.order;
    if (!a || a.suspended || a.phase === "completed") return;
    const c = a.checklist;
    // reinício: missões que dependem de processos voltam a ser preparadas; 10–12 são justamente sobre reiniciar
    if (type === "system:booted") {
      const apps = detail.startupApps || [];
      if (order === 10) {
        if (!c.boot1) { mark("boot1"); if (apps.includes("discord")) mark("saw"); else { PM()?.setStartupEnabled?.("discord", true); notice("O Discord não abriu porque estava desabilitado. Habilitei de novo: reinicie mais uma vez para ver ele abrindo sozinho."); unmark("boot1"); } }
        else if (c.saw && c.disable && !apps.includes("discord")) mark("boot2");
        else if (!c.disable) notice("O Discord abriu de novo porque continua Habilitado. Desabilite em Aplicativos de inicialização antes de reiniciar.");
      } else if (order === 11) {
        if (c.disable && !highEnabled().length) { a.after = detail.seconds; mark("boot"); }
        else notice("Ainda há programas de impacto Alto habilitados. Desabilite todos (menos a Segurança do Windows) e reinicie de novo.");
      } else if (order === 12) {
        if (c.hung && c.cpu && c.startup && !apps.includes("spotify")) mark("boot");
        else reprepare(12);
      } else if ([3, 4, 5, 6, 7, 8].includes(order)) reprepare(order);
      evaluate(); return;
    }
    if (["power:sleep", "session:signed-out"].includes(type) && [10, 11, 12].includes(order)) notice(type === "power:sleep" ? "Suspender só deixa o computador dormindo: os programas continuam abertos. Para a missão, use Iniciar › Energia › Reiniciar." : "Sair só troca de conta, não reinicia o Windows. Use Iniciar › Energia › Reiniciar.");

    if (order === 1) {
      if (type === "taskbar:context-menu") { if (detail.empty) mark("menu"); else notice("Esse é o menu do aplicativo, porque você clicou em cima de um ícone. Clique com o botão direito num espaço VAZIO da barra, longe dos ícones."); }
      if (type === "taskbar:task-manager" && c.menu) mark("open");
      if (type === "app:opened" && detail.appId === "taskmanager" && !c.open) notice("Abriu! Mas treine o caminho que funciona sempre: feche o Gerenciador e abra pelo botão direito na barra de tarefas.");
    }
    if (order === 2) {
      if (type === "app:opened" && open("google") && open("explorer")) { mark("apps"); if (open("taskmanager")) mark("tm"); }
      if ((type === "app:opened" && detail.appId === "taskmanager" || type === "taskmanager:nav" && detail.page === "processes") && c.apps) mark("tm");
    }
    if (order === 3) {
      if (type === "window:close-blocked" && detail.appId === "texteditor") { mark("x"); if (open("taskmanager")) mark("tm"); }
      if (type === "app:opened" && detail.appId === "taskmanager" && c.x) mark("tm");
      if (type === "process:ended" && detail.appId === "texteditor") { mark("x"); mark("tm"); mark("hung"); }
      if (type === "app:closed" && FIVE.includes(detail.appId) && !a.closed.includes(detail.appId)) a.closed.push(detail.appId);
      if (a.closed.length >= FIVE.length) mark("all");
    }
    if (order === 4) {
      // vale com os 3 primeiros dígitos (734 só bate com o PID certo; o falso é 7430)
      if (type === "taskmanager:search" && ((String(detail.query).trim().length >= 3 && String(PID).startsWith(String(detail.query).trim())) || String(detail.query).includes(String(PID)))) mark("search");
      if (type === "taskmanager:nav" && detail.page === "details") mark("details");
      if (type === "process:ended" && detail.pid === PID) { mark("search"); mark("details"); mark("end"); }
      if (type === "process:ended" && detail.pid === DECOY) {
        notice(`Esse era o PID ${DECOY}, não o ${PID}! Em suporte, finalizar o processo errado pode fechar o trabalho de alguém. Coloquei ele de volta: confira o número antes.`);
        scenarioProcess({ pid: DECOY, appId: `taskmgr-update-${DECOY}`, name: "Assistente de Atualização", exe: "UpdateAssistant.exe", icon: "assets/icons/settings-rows/nearshare.png", cpu: 0.4, memory: 38.5 });
      }
    }
    if (order === 5) {
      if (type === "start:glitch-click") mark("start-fail");
      if (type === "process:restarted" && detail.appId === "explorer-system" && detail.reason !== "safety") { mark("restart"); root()?.classList.remove("is-start-glitch"); }
      if (type === "explorer:stopped" && detail.reason !== "restart") notice("A barra de tarefas sumiu porque você finalizou o Windows Explorer. Traga de volta: Executar nova tarefa › digite explorer.exe › OK.");
      if (type === "start:opened" && c.restart) mark("start-ok");
    }
    if (order === 6) {
      if ((type === "taskmanager:nav" && detail.page === "performance" || type === "taskmanager:perf-view" && detail.view === "cpu")) { if (!c.end) mark("perf"); else mark("check"); }
      if (type === "taskmanager:sorted" && detail.key === "cpu") mark("sort");
      if (type === "process:ended" && detail.appId === "taskmgr-cpu") { mark("end"); O.systemState?.configure?.({ slowMode: false }); }
      if (type === "process:blocked" || type === "process:ended" && detail.process?.kind === "windows") notice("Esse é um processo do Windows. O culpado é o que está usando quase 100% de CPU: o Conversor de Vídeo.");
    }
    if (order === 7) {
      if (type === "app:launch-blocked" && detail.appId === "google") mark("blocked");
      if (type === "taskmanager:sorted" && detail.key === "memory") mark("sort");
      if (type === "process:ended" && detail.appId === "taskmgr-mem") mark("end");
      if (type === "app:opened" && detail.appId === "google" && c.end) { mark("blocked"); mark("open"); }
    }
    if (order === 8) {
      if (type === "process:selected" && detail.appId === "taskmgr-eff") mark("find");
      if (type === "process:efficiency" && detail.appId === "taskmgr-eff") { if (detail.efficient) { mark("find"); mark("eff"); } else unmark("eff"); }
      if (type === "process:ended" && detail.appId === "taskmgr-eff") {
        notice("Você finalizou o Atualizador e o download foi cancelado (ia começar tudo de novo). Coloquei ele de volta: dessa vez use Modo de eficiência.");
        scenarioProcess({ appId: "taskmgr-eff", name: "Atualizador de Jogos", exe: "GameUpdater.exe", icon: "assets/settings/Gaming.webp", cpu: 38, memory: 164, disk: 4.2, network: 6.5 });
        unmark("eff");
      }
    }
    if (order === 9) {
      if (type === "taskmanager:nav" && detail.page === "performance" || type === "taskmanager:perf-view" && detail.view === "cpu") mark("cpu");
      if (type === "taskmanager:perf-view" && detail.view === "memory") mark("mem");
    }
    if (order === 10 && type === "startup:changed" && detail.id === "discord") {
      if (!detail.enabled && !c.saw) { PM()?.setStartupEnabled?.("discord", true); notice("Calma! Primeiro reinicie para ver o problema acontecer: o Discord abrindo sozinho. Deixei ele habilitado de novo."); }
      else if (!detail.enabled) mark("disable");
      else { unmark("disable"); unmark("boot2"); }
    }
    if (order === 11) {
      if (type === "taskmanager:nav" && detail.page === "startup") mark("page");
      if (type === "startup:changed") {
        if (detail.id === "windows-security") notice("A Segurança do Windows precisa continuar habilitada.");
        if (!highEnabled().length) { mark("page"); mark("disable"); } else { unmark("disable"); unmark("boot"); }
      }
    }
    if (order === 12) {
      if (type === "process:ended" && detail.appId === "texteditor" && detail.status === "Não respondendo") mark("hung");
      if (type === "process:ended" && detail.appId === "taskmgr-cpu2") { mark("cpu"); O.systemState?.configure?.({ slowMode: false }); }
      if (type === "startup:changed" && detail.id === "spotify") { if (detail.enabled) { unmark("startup"); unmark("boot"); } else mark("startup"); }
      if (type === "process:blocked") notice("Esse é um processo protegido do Windows. Procure o que está Não respondendo e o que usa quase toda a CPU.");
    }
    if (/^(taskbar|app|window|process|taskmanager|start|explorer|startup|power|session):/.test(type)) evaluate();
  });

  /** formulários do robô: missão 2 (grupos) e 9 (peças do computador) */
  function verifyRecord(data) {
    const a = progress.active, m = missionOf();
    if (!a || a.suspended || a.phase !== "practice") return { ok: false };
    let ok = false;
    if (m.order === 2 && a.checklist.tm) ok = data.chrome === "Aplicativos" && data.antimalware === "Processos em segundo plano" && data.dwm === "Processos do Windows";
    if (m.order === 9 && a.checklist.cpu && a.checklist.mem) ok = data.cpu === "Intel(R) Celeron(R) N4500" && data.memory === "4,0 GB" && data.disk === "SSD";
    a.recordFeedback = { ok, text: ok ? "Correto! Você leu o Gerenciador como um técnico." : m.order === 2 ? (a.checklist.tm ? "Ainda não. Olhe em qual grupo cada nome aparece na aba Processos." : "Primeiro abra o Gerenciador e encontre os processos.") : (a.checklist.cpu && a.checklist.mem ? "Ainda não. Confira o topo de CPU, de Memória e de Disco 0 em Desempenho." : "Primeiro abra CPU e Memória em Desempenho.") };
    if (ok) mark("recorded");
    evaluate();
    return { ok };
  }
  function answer(index) {
    const a = progress.active, m = missionOf();
    if (!a || a.suspended || a.phase !== "question" || !ready() || !Number.isInteger(index) || index < 0 || index > 2) return { ok: false };
    const correct = index === m.quiz.correct;
    a.feedback = { index, correct, text: m.quiz.explanations[index] };
    if (correct) { a.phase = "completed"; progress.completed[a.id] = { score: 10, completedAt: Date.now() }; progress.totalScore = Object.keys(progress.completed).length * 10; cleanup(); }
    publish(correct ? "completed" : "answer-incorrect"); O.assistantRobot?.expand?.();
    return { ok: true, correct };
  }
  function finish(action = "return") {
    const a = progress.active, order = missionOf()?.order;
    if (!a || action === "next" && a.phase !== "completed") return { ok: false };
    const id = a.id; stop(); cleanup(); progress.active = null; publish("finished");
    if (action === "repeat") return start(id);
    if (action === "next" && order < TOTAL) return start(`taskmgr-${order + 1}`);
    O.shell?.openApp?.("tasklab"); return { ok: true };
  }
  function useHint() {
    const a = progress.active, m = missionOf();
    if (!a || a.suspended || a.phase !== "practice") return;
    a.hintsUsed = Math.min(3, a.hintsUsed + 1); a.lastHint = m.hints[a.hintsUsed - 1];
    publish("hint"); O.assistantRobot?.expand?.();
  }
  function reset() {
    stop(); cleanup(); progress = blank();
    (PM()?.getStartupApps?.() || []).forEach((app) => { if (!app.protected) PM().setStartupEnabled(app.id, false); });
    publish("reset");
  }
  O.activityCoordinator?.register?.("task-lab", { isActive: () => Boolean(progress.active && !progress.active.suspended), stop });

  O.taskMgrMissionCatalog = catalog;
  O.taskLab = { TOTAL, PID, DECOY, getMissions, getProgress: () => clone(progress), start, stop, finish, restart: () => finish("repeat"), answer, verifyRecord, useHint, reset, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
})(window);
