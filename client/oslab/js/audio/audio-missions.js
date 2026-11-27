(function createAudioMissions(global) {
  "use strict";

  const O = global.OSLab, listeners = new Set();
  const KEY = "oslab.audio.missions.v1";
  const icon = (name) => (name.includes("/") ? name : `assets/learning/icons/${name}.svg`);
  const q = (text, options, correct, explanations) => ({ text, options, correct, explanations });
  const MIC = "assets/audio/icons/mic.svg", MUTE = "assets/audio/icons/speaker_mute.svg", TV = "assets/audio/icons/tv.svg";

  // [título, descrição, objetivo, ícone, ferramenta, exemplo, passos [id, texto], pergunta]
  const rows = [
    ["Cadê o som?", "A aula on-line começou, mas você não ouve a professora. Antes de mexer em qualquer coisa, observe os sinais.", "Teste o som na Aula On-line e leia a mensagem do ícone de som da barra de tarefas.", "speaker_2", "aulaonline",
      "Passando o mouse no ícone de som aparece: Nenhum dispositivo de saída de áudio está instalado.",
      [["open", "Abra o app Aula On-line na Área de Trabalho."], ["test", "Clique em Testar som e veja que nada sai."], ["tray", "Passe o mouse no ícone de som da barra de tarefas (perto do relógio) e leia a mensagem."]],
      q("O X vermelho no ícone de som quer dizer…", ["Que o Windows não encontrou nenhuma saída de som.", "Que o volume está no máximo.", "Que a internet caiu."], 0, ["Correto! Sem saída de som: pode faltar driver ou o dispositivo pode estar desabilitado. Agora é investigar.", "Volume alto não mostra X. O X avisa que não há onde tocar o som.", "O ícone de som não tem relação com a internet."])],
    ["O Gerenciador explica", "O Gerenciador de Dispositivos mostra o que o Windows reconhece. Veja como aparece um aparelho de som sem driver.", "Ache o dispositivo de áudio com triângulo amarelo e leia o status.", "list_bar", "devicemanager",
      "Sem driver, o chip de som aparece em Outros dispositivos como Dispositivo de Áudio de Alta Definição, com triângulo amarelo (Código 28).",
      [["devmgr", "Abra o Gerenciador de Dispositivos (Menu Iniciar)."], ["props", "Em Outros dispositivos, dê dois cliques no Dispositivo de Áudio de Alta Definição e leia o Status."]],
      q("O que significa o Código 28?", ["Que os drivers do dispositivo não estão instalados.", "Que o alto-falante está queimado.", "Que o som está no mudo."], 0, ["Correto! Código 28 = driver não instalado. O aparelho existe, mas o Windows não sabe usá-lo.", "O código não fala de defeito físico; ele fala do driver.", "Mudo é um ajuste de volume e não aparece no Gerenciador."])],
    ["Triângulo ou seta?", "Dois sinais parecidos e problemas diferentes. Hoje o computador tem um dispositivo com triângulo e outro com seta para baixo.", "Compare o áudio (triângulo) com a câmera (seta para baixo) e registre os códigos.", "folder_search", "devicemanager",
      "Triângulo amarelo = problema no driver (ex.: Código 28). Seta para baixo = dispositivo desabilitado (Código 22).",
      [["cam", "Abra Câmeras e dê dois cliques na Câmera HD Integrada (a da seta para baixo)."], ["aud", "Abra também as propriedades do Dispositivo de Áudio de Alta Definição (o do triângulo)."], ["recorded", "No robô, escolha o código de cada sinal e clique em Conferir."]],
      q("Um dispositivo com seta para baixo precisa de…", ["Um driver novo da internet.", "Ser habilitado de novo.", "Trocar a peça."], 1, ["Ele já tem driver; só foi desligado. Instalar driver não resolve.", "Correto! Seta para baixo = desabilitado (Código 22). Basta Habilitar dispositivo.", "A peça não tem defeito: alguém desabilitou no Windows."])],
    ["Qual é o meu notebook?", "O driver de áudio de um notebook vem do site da marca do notebook. Para isso você precisa do modelo exato.", "Descubra fabricante, modelo e tipo de sistema em Informações do Sistema e registre.", "hard_drive", "sysinfo",
      "Exemplo: Fabricante do sistema: Vertex · Modelo do sistema: Note 14 · Sistema operacional de 64 bits.",
      [["sysinfo", "Abra Informações do Sistema pelo Menu Iniciar."], ["recorded", "No robô, escolha fabricante, modelo e sistema e clique em Conferir."]],
      q("Por que buscar o driver de áudio no site da marca do notebook?", ["Porque o driver vem ajustado para aquele modelo.", "Porque é o único site com vídeos.", "Porque ele deixa o volume mais alto que o normal."], 0, ["Correto! A fabricante do notebook testa o driver com aquele hardware e aquelas caixas de som.", "O motivo é técnico: compatibilidade com o modelo.", "O volume depende do hardware; o driver certo só faz ele funcionar."])],
    ["Driver de áudio oficial", "Pesquise o driver, entre no site oficial e escolha o arquivo certo entre vários parecidos.", "Baixe o Driver de áudio do Vertex Note 14 para Windows 11 (64 bits).", "globe_search", "google",
      "Pesquisa boa: Vertex Note 14 driver de áudio. Cuidado com Note 14 Pro, Note 15, driver de vídeo, BIOS e aplicativo Console.",
      [["search", "No Google do OSLab, pesquise: Vertex Note 14 driver de áudio."], ["official", "Abra o resultado do site oficial: suporte.vertex.com.br."], ["os", "Abra o Vertex Note 14 (sem Pro) e escolha Windows 11 (64 bits)."], ["download", "Em Áudio, clique em Baixar no Driver de áudio Sonora High Definition."]],
      q("Qual destes arquivos resolve a falta de driver de som?", ["Sonora Audio Console (aplicativo).", "Driver de áudio Sonora High Definition (64 bits).", "Atualização de BIOS."], 1, ["O Console só ajusta efeitos e precisa do driver já instalado.", "Correto! É o driver do chip de som, para o modelo e o sistema certos.", "BIOS é o programa da placa-mãe e não instala driver de som."])],
    ["Instale, reinicie e teste", "Com o arquivo certo baixado, instale. Drivers de áudio pedem para reiniciar o computador para terminar.", "Instale o driver, reinicie quando pedir e teste o som na Aula On-line.", "window_wrench", "google",
      "Se você não reiniciar, o Gerenciador mostra: Este dispositivo não poderá funcionar até que você reinicie o computador (Código 14).",
      [["installer", "No painel de downloads do navegador, clique em Abrir arquivo no driver de áudio."], ["installed", "Siga o assistente até o fim da instalação."], ["restarted", "Clique em Reiniciar agora e espere o computador voltar."], ["test", "Na Aula On-line, clique em Testar som e confira que agora sai som."]],
      q("Por que o instalador pede para reiniciar?", ["Para o Windows carregar o driver novo do jeito certo.", "Para apagar os arquivos baixados.", "Para trocar a senha do computador."], 0, ["Correto! Alguns drivers só começam a funcionar depois de reiniciar (Código 14 até lá).", "Os arquivos continuam lá; reiniciar só carrega o driver.", "Reiniciar não mexe na senha."])],
    ["Código 22: habilite o som", "Alguém desabilitou o controlador de som no Gerenciador. O ícone mostra X vermelho de novo, mas o driver está instalado.", "Habilite o Sonora High Definition Audio e teste o som.", "plug_connected", "devicemanager",
      "Dispositivo desabilitado tem seta para baixo e o status: Este dispositivo está desabilitado (Código 22). Não precisa baixar nada.",
      [["devmgr", "Abra o Gerenciador de Dispositivos."], ["enable", "Em Controladores de som, vídeo e jogos, clique com o botão direito no Sonora High Definition Audio e escolha Habilitar dispositivo."], ["test", "Na Aula On-line, clique em Testar som."]],
      q("Se o dispositivo está desabilitado, reinstalar o driver…", ["Resolve sempre.", "Não é o caminho: basta habilitar.", "Estraga o alto-falante."], 1, ["O driver já estava certo. O problema era o dispositivo desligado.", "Correto! Técnico bom identifica a causa e faz a correção mais simples.", "Reinstalar não estraga nada, mas é trabalho à toa."])],
    ["Saída não permitida", "O Gerenciador mostra o controlador funcionando, mas a saída de som foi desativada nas Configurações de Som.", "Em Configurações › Som › Todos os dispositivos de som, permita os Alto-falantes e teste.", "settings", "settings:sound",
      "Nas Configurações, cada saída tem o botão Permitir ou Não permitir. Não permitido = o Windows não usa aquela saída.",
      [["devices", "Abra Configurações › Sistema › Som › Todos os dispositivos de som."], ["allow", "Abra os Alto-falantes e clique em Permitir."], ["test", "Na Aula On-line, clique em Testar som."]],
      q("Os Alto-falantes estavam Não permitidos. Isso é…", ["Falta de driver.", "Dispositivo desativado pelo Windows.", "Volume no mudo."], 1, ["O driver estava instalado; era a saída que estava desativada.", "Correto! É a mesma família do Código 22: desativado, não quebrado.", "Mudo mantém a saída ativa; aqui ela nem podia ser usada."])],
    ["Ninguém me ouve", "Agora a professora não ouve você. O problema é na entrada de som: o microfone.", "Teste o microfone, habilite-o e teste de novo.", MIC, "aulaonline",
      "Microfone desabilitado aparece em Entradas e saídas de áudio com seta para baixo, ou como Não permitido nas Configurações de Som.",
      [["mic-fail", "Na Aula On-line, clique em Testar microfone e veja que nada acontece."], ["mic-on", "Habilite o Microfone: no Gerenciador (Entradas e saídas de áudio) ou em Configurações › Som › Todos os dispositivos de som."], ["mic-ok", "Teste o microfone de novo e veja a barra de nível mexer."]],
      q("Microfone é um dispositivo de…", ["Saída de som.", "Entrada de som.", "Vídeo."], 1, ["Saída é o que toca o som: alto-falante e fone.", "Correto! Microfone capta o som: é entrada. Alto-falante toca: é saída.", "Câmera é vídeo; microfone é áudio de entrada."])],
    ["No mudo", "O som sumiu de novo, mas o ícone agora é diferente: não tem círculo vermelho.", "Leia o ícone, tire do mudo e teste o som.", MUTE, "aulaonline",
      "Mudo: alto-falante com um x simples e a mensagem Alto-falantes: mudo. Sem dispositivo: X dentro de um círculo vermelho.",
      [["tray", "Passe o mouse no ícone de som e leia: Alto-falantes … mudo."], ["unmute", "Abra as Configurações rápidas (ícone de som) e clique no alto-falante ao lado do volume para tirar do mudo."], ["test", "Na Aula On-line, clique em Testar som."]],
      q("Qual a diferença entre o mudo e o X vermelho?", ["Nenhuma.", "No mudo a saída existe e só está silenciada; no X vermelho não há saída.", "O mudo precisa de driver novo."], 1, ["Eles parecem iguais, mas a mensagem é diferente. Sempre leia a mensagem.", "Correto! Mudo se resolve no volume; X vermelho exige investigar driver ou dispositivo.", "Mudo não tem relação com driver."])],
    ["Mudo só no aplicativo", "O volume do Windows está bom e o teste do sistema funciona, mas a Aula On-line continua muda.", "Abra o Mixer de volume e tire a Aula On-line do mudo.", "apps", "settings:sound-mixer",
      "O Mixer de volume tem um volume para cada aplicativo. Um app pode estar no mudo sozinho.",
      [["mixer", "Abra Configurações › Sistema › Som › Mixer de volume."], ["app", "Em Aplicativos, clique no alto-falante da Aula On-line para tirar do mudo."], ["test", "Na Aula On-line, clique em Testar som."]],
      q("Para que serve o Mixer de volume?", ["Para ajustar o volume de cada aplicativo separadamente.", "Para instalar drivers de som.", "Para trocar o microfone."], 0, ["Correto! Assim dá para deixar a aula alta e as notificações baixinhas, por exemplo.", "O Mixer não instala nada; ele só ajusta volumes.", "Ele cuida da saída de cada app, não do microfone."])],
    ["Som na saída errada", "O notebook foi ligado na TV da sala (HDMI) e o som foi para lá. A TV está desligada.", "Teste, escolha os Alto-falantes como saída e teste de novo.", TV, "aulaonline",
      "Em Configurações › Som › Escolha onde reproduzir o som, aparecem Alto-falantes e TV da sala (HDMI). O som sai só na escolhida.",
      [["test-fail", "Na Aula On-line, clique em Testar som: o som vai para a TV da sala."], ["output", "Em Configurações › Sistema › Som, escolha Alto-falantes em Saída."], ["test", "Teste o som de novo na Aula On-line."]],
      q("O cabo HDMI levou o som para a TV. Como resolver sem tirar o cabo?", ["Instalando outro driver.", "Escolhendo a saída de som certa.", "Desabilitando o alto-falante."], 1, ["O driver está certo; só a saída escolhida estava errada.", "Correto! O Windows toca o som em uma saída por vez. Escolha a que você quer.", "Desabilitar o alto-falante deixaria você sem som."])],
  ];

  const catalog = rows.map(([title, description, goal, ic, tool, example, steps, quiz], i) => ({
    id: `audio-${i + 1}`, order: i + 1, title, description, goal, icon: icon(ic), tool, example,
    category: i < 3 ? "Sinais" : i < 6 ? "Driver faltando" : i < 9 ? "Desabilitado" : "Mudo e saída errada", difficulty: "Iniciante",
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

  function getMissions() {
    return catalog.map((m, i) => ({ ...m, status: progress.active?.id === m.id && progress.active.phase !== "completed" ? "active" : progress.completed[m.id] ? "completed" : !i || progress.completed[catalog[i - 1].id] ? "available" : "locked" }));
  }
  function prepare(order) {
    O.audio.prepare(order);
    O.drivers?.unplug?.(); // a impressora fica desligada para não confundir o Gerenciador
    ["devicemanager", "sysinfo", "audioinstaller"].forEach((id) => O.shell?.closeApp?.(id));
    const audioFile = (id) => id.startsWith("aud-") || id.startsWith("app-vn") || id.startsWith("vid-vn") || id.startsWith("bios-vn");
    if (order <= 5) O.software?.clearDownloads?.(audioFile);
    if (order === 6 && O.software?.getDownload?.(O.audio.CORRECT)?.status !== "completed") O.software?.completeDownload?.(O.audio.CORRECT);
  }
  function start(id) {
    const mission = getMissions().find((m) => m.id === id);
    if (!mission || mission.status === "locked") return { ok: false, reason: "locked" };
    if (progress.active?.id === id && progress.active.phase !== "completed" && progress.active.suspended) { O.activityCoordinator?.claim?.("audio-lab"); progress.active.suspended = false; }
    else {
      if (progress.active && !progress.active.suspended) stop();
      O.activityCoordinator?.claim?.("audio-lab");
      prepare(mission.order);
      progress.active = { id, phase: "practice", suspended: false, checklist: {}, hintsUsed: 0, lastHint: null, feedback: null, notice: null, recordFeedback: null, startedAt: Date.now() };
    }
    publish("started"); O.assistantRobot?.expand?.(); return { ok: true };
  }
  function stop() {
    const a = progress.active;
    if (!a || a.suspended) return;
    a.suspended = true; O.activityCoordinator?.release?.("audio-lab"); publish("suspended");
  }
  /** a prática só vale com o som (ou o microfone) funcionando de verdade */
  function ready() {
    const a = progress.active, m = missionOf(), s = O.audio.get();
    if (!a || !m || !m.objectives.every((o) => a.checklist[o.id])) return false;
    if (m.order === 9) return s.mic;
    if (m.order >= 6) return s.audible;
    return true;
  }
  function evaluate() {
    const a = progress.active;
    if (!a || a.suspended || a.phase === "completed") return;
    const solved = ready();
    if (solved && a.phase !== "question") { a.phase = "question"; a.feedback = null; O.assistantRobot?.expand?.(); }
    else if (!solved && a.phase === "question") a.phase = "practice";
    publish("objective");
  }
  function mark(id) { const a = progress.active; if (a && !a.checklist[id]) { a.checklist[id] = true; a.notice = null; } }
  function notice(text) { const a = progress.active; if (a) { a.notice = text; O.assistantRobot?.expand?.(); } }
  const WHY = { nodriver: "ainda falta o driver", restart: "o computador precisa reiniciar", disabled: "o controlador de som está desabilitado", "spk-disabled": "os Alto-falantes estão desativados", "wrong-output": "o som está indo para outra saída", muted: "o volume está no mudo", "app-muted": "o aplicativo está no mudo" };

  O.events.subscribe("oslab:event", ({ type, detail = {} }) => {
    const a = progress.active, order = missionOf()?.order;
    if (!a || a.suspended || a.phase === "completed") return;
    const C = O.audio.CORRECT;
    if (type === "audio:aula-opened" && order === 1) mark("open");
    if (type === "audio:test") {
      if (order === 1 && !detail.audible && a.checklist.open) mark("test");
      if (order === 12 && detail.reason === "wrong-output") mark("test-fail");
      if (order >= 6 && detail.audible && (order !== 12 || a.checklist.output)) mark("test");
      if (order >= 6 && !detail.audible && !(order === 12 && detail.reason === "wrong-output")) notice(`Ainda sem som: ${WHY[detail.reason] || "confira os passos"}.`);
    }
    if (type === "audio:tray-read") {
      if (order === 1 && detail.tray === "nodevice") mark("tray");
      if (order === 10 && detail.tray === "muted") mark("tray");
    }
    if (type === "drivers:devmgr-opened" && [2, 7].includes(order)) mark("devmgr");
    if (type === "devmgr:properties") {
      if (order === 2 && detail.id === "aud-unknown") mark("props");
      if (order === 3 && detail.id === "cam") mark("cam");
      if (order === 3 && detail.id === "aud-unknown") mark("aud");
    }
    if (type === "drivers:sysinfo-opened" && order === 4) mark("sysinfo");
    if (type === "audio:search" && order === 5) { if (detail.ok) mark("search"); else notice(`A pesquisa "${detail.term}" está incompleta. Use marca + modelo + driver de áudio: Vertex Note 14 driver de áudio.`); }
    if (type === "audio:result-opened" && order === 5) { if (detail.official) mark("official"); else notice(detail.chip ? "Esse é o site do fabricante do chip. Em notebook, prefira o site da marca do notebook: suporte.vertex.com.br." : "Esse não é o site da Vertex. Volte e confira o endereço: suporte.vertex.com.br."); }
    if (type === "audio:product-opened" && order === 5 && detail.product !== O.audio.MODEL) notice(`Esse é o ${O.audio.products[detail.product]?.name}. O notebook do laboratório é o Vertex Note 14, sem Pro.`);
    if (type === "audio:os-selected" && order === 5 && detail.product === O.audio.MODEL) { if (detail.os === "win64") mark("os"); else notice("Esse não é o sistema deste computador. Ele é Windows 11 de 64 bits."); }
    if (type === "install:download-started" && order === 5 && O.audio.files[detail.installerId]) {
      if (detail.installerId === C) mark("download");
      else notice(`Esse arquivo não serve: ${O.audio.PROBLEM_TEXT[O.audio.problem(detail.installerId)]?.[1] || "confira modelo e sistema."}`);
    }
    if (type === "audio:installer-opened" && order === 6) { if (detail.fileId === C) mark("installer"); else notice("Esse não é o driver de áudio do Note 14 para 64 bits. Abra o arquivo Vertex_Note14_Audio_Sonora…W11x64."); }
    if (type === "audio:installed" && order === 6 && a.checklist.installer) mark("installed");
    if (type === "audio:restarted" && order === 6 && a.checklist.installed) mark("restarted");
    if (type === "audio:device-enabled") {
      if (order === 7 && detail.device === "codec" && detail.enabled) mark("enable");
      if (order === 8 && detail.device === "spk" && detail.enabled) mark("allow");
      // quem achou e consertou antes de testar também diagnosticou: o passo do teste com falha conta junto
      if (order === 9 && detail.device === "mic" && detail.enabled) { mark("mic-fail"); mark("mic-on"); }
    }
    if (type === "audio:settings-opened") {
      if (order === 8 && detail.page === "sound-devices") mark("devices");
      if (order === 11 && detail.page === "sound-mixer") mark("mixer");
    }
    if (type === "audio:mic-test" && order === 9) { if (!detail.ok) mark("mic-fail"); else if (a.checklist["mic-on"]) mark("mic-ok"); }
    if (type === "volume:changed" && order === 10 && !detail.muted && detail.volume > 0) mark("unmute");
    if (type === "audio:app-mute" && order === 11 && !detail.muted && a.checklist.mixer) mark("app");
    if (type === "audio:output-selected" && order === 12 && detail.output === "speakers") { mark("test-fail"); mark("output"); }
    if (type.startsWith("audio:") || type.startsWith("devmgr:") || type.startsWith("drivers:") || type.startsWith("install:") || type === "volume:changed") evaluate();
  });

  /** formulários do robô: missão 3 (códigos) e 4 (fabricante, modelo, sistema) */
  function verifyRecord(data) {
    const a = progress.active, m = missionOf();
    if (!a || a.suspended || a.phase !== "practice") return { ok: false };
    let ok = false;
    if (m.order === 3 && a.checklist.cam && a.checklist.aud) ok = data.triangle === "28" && data.arrow === "22";
    if (m.order === 4 && a.checklist.sysinfo) ok = data.brand === "Vertex" && data.model === "Note 14" && data.system === "Windows 11 (64 bits)";
    a.recordFeedback = { ok, text: ok ? "Correto! Você leu os sinais como um técnico." : m.order === 3 ? "Ainda não. Abra as propriedades dos dois dispositivos e leia o código no Status." : "Ainda não. Confira Fabricante e Modelo do sistema em Informações do Sistema." };
    if (ok) mark("recorded");
    evaluate();
    return { ok };
  }
  function answer(index) {
    const a = progress.active, m = missionOf();
    if (!a || a.suspended || a.phase !== "question" || !ready() || !Number.isInteger(index) || index < 0 || index > 2) return { ok: false };
    const correct = index === m.quiz.correct;
    a.feedback = { index, correct, text: m.quiz.explanations[index] };
    if (correct) { a.phase = "completed"; progress.completed[a.id] = { score: 10, completedAt: Date.now() }; progress.totalScore = Object.keys(progress.completed).length * 10; }
    publish(correct ? "completed" : "answer-incorrect"); O.assistantRobot?.expand?.();
    return { ok: true, correct };
  }
  function finish(action = "return") {
    const a = progress.active, order = missionOf()?.order;
    if (!a || action === "next" && a.phase !== "completed") return { ok: false };
    const id = a.id; stop(); progress.active = null; publish("finished");
    if (action === "repeat") return start(id);
    if (action === "next" && order < TOTAL) return start(`audio-${order + 1}`);
    O.shell?.openApp?.("audiolab"); return { ok: true };
  }
  function useHint() {
    const a = progress.active, m = missionOf();
    if (!a || a.suspended || a.phase !== "practice") return;
    a.hintsUsed = Math.min(3, a.hintsUsed + 1); a.lastHint = m.hints[a.hintsUsed - 1];
    publish("hint"); O.assistantRobot?.expand?.();
  }
  function reset() { stop(); progress = blank(); O.audio.reset(); publish("reset"); }
  O.activityCoordinator?.register?.("audio-lab", { isActive: () => Boolean(progress.active && !progress.active.suspended), stop });

  O.audioMissionCatalog = catalog;
  O.audioLab = { TOTAL, getMissions, getProgress: () => clone(progress), start, stop, finish, restart: () => finish("repeat"), answer, verifyRecord, useHint, reset, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
})(window);
