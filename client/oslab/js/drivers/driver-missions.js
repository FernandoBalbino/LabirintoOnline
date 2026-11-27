(function createDriverMissions(global) {
  "use strict";

  const O = global.OSLab, listeners = new Set();
  const KEY = "oslab.drivers.missions.v1";
  const icon = (name) => `assets/learning/icons/${name}.svg`;
  const q = (text, options, correct, explanations) => ({ text, options, correct, explanations });

  // [título, descrição, objetivo, ícone, ferramenta, exemplo, passos [id, texto], pergunta]
  const rows = [
    ["Chegou uma impressora nova", "O laboratório ganhou uma impressora. Antes de qualquer coisa, descubra a marca e o modelo dela.", "Abra o app Impressora e leia a etiqueta do modelo.", "apps", "printer",
      "Na etiqueta você lê algo como: Printix · Modelo InkJet 2350. Marca é o fabricante; modelo é o nome exato do aparelho.",
      [["open", "Abra o app Impressora na Área de Trabalho."], ["label", "Clique em Ver etiqueta e leia a marca e o modelo."]],
      q("O que é um driver?", ["Um programa que ensina o sistema a se comunicar com um dispositivo.", "Uma peça de metal dentro da impressora.", "O cabo que liga a impressora na tomada."], 0, ["Correto! O driver é um programa tradutor: ele explica ao Windows como conversar com aquele aparelho.", "O driver não é uma peça física. Ele é um programa instalado no computador.", "O cabo leva os dados, mas sem o driver o Windows não sabe o que fazer com eles."])],
    ["Sem driver não funciona", "Teste a impressora antes de instalar nada e veja como o Windows enxerga um dispositivo sem driver.", "Tente imprimir e confira o dispositivo no Gerenciador de Dispositivos.", "dismiss_circle", "printer",
      "Um dispositivo sem driver aparece como Dispositivo desconhecido, com um triângulo amarelo, dentro de Outros dispositivos.",
      [["print-fail", "No app Impressora, clique em Imprimir página de teste e leia o erro."], ["devmgr", "Abra o Gerenciador de Dispositivos (botão no app Impressora ou pelo Menu Iniciar)."], ["unknown", "Em Outros dispositivos, clique no Dispositivo desconhecido (o do triângulo amarelo)."]],
      q("Por que o Gerenciador mostra Dispositivo desconhecido com um triângulo amarelo?", ["Porque a impressora está quebrada.", "Porque o Windows ainda não tem o driver desse dispositivo.", "Porque o cabo USB é longo demais."], 1, ["Ela pode estar perfeita. O aviso só diz que falta o programa certo.", "Correto! O Windows percebe que tem algo conectado, mas não sabe o que é sem o driver (código 28).", "O tamanho do cabo não muda o reconhecimento do dispositivo."])],
    ["Conheça o seu computador", "Driver é feito para um modelo de aparelho e para um sistema. Descubra qual é o sistema deste computador.", "Abra Informações do Sistema e registre marca, modelo e tipo de sistema.", "settings", "sysinfo",
      "Exemplo: Tipo de sistema: Sistema operacional de 64 bits, processador baseado em x64.",
      [["sysinfo", "Abra Informações do Sistema pelo Menu Iniciar ou pela pesquisa."], ["recorded", "No robô, escolha a marca, o modelo e o sistema e clique em Conferir."]],
      q("Por que anotar o modelo exato e se o Windows é de 64 bits?", ["Porque cada modelo e cada sistema têm um driver próprio.", "Porque o site obriga a fazer cadastro.", "Porque isso deixa a impressão colorida."], 0, ["Correto! Com marca, modelo e sistema em mãos, você encontra o arquivo certo logo na primeira vez.", "O motivo é técnico: o driver depende do modelo e do sistema.", "As cores dependem da impressora e da tinta, não dessa anotação."])],
    ["Pesquise do jeito certo", "Use o que você anotou para pesquisar o driver no navegador.", "Pesquise no Google a marca, o modelo e a palavra driver.", "globe_search", "google",
      "Pesquisa boa: Printix InkJet 2350 driver. Pesquisa ruim: impressora não funciona.",
      [["search", "No Google do OSLab, pesquise: Printix InkJet 2350 driver."]],
      q("Qual pesquisa encontra o driver mais rápido?", ["impressora não funciona", "Printix InkJet 2350 driver", "baixar programa grátis"], 1, ["Essa pesquisa é muito vaga: aparecem milhares de páginas sobre qualquer impressora.", "Correto! Marca + modelo + driver leva direto à página certa.", "Pesquisas assim costumam levar a sites cheios de anúncios e programas indesejados."])],
    ["Site oficial do fabricante", "Nos resultados há o site da fabricante e sites de downloads cheios de anúncios. Escolha com cuidado.", "Abra o resultado do site oficial da Printix.", "shield_checkmark", "google",
      "O endereço oficial tem o nome da marca: suporte.printix.com.br. Desconfie de sites como baixardriversgratis.net.",
      [["official", "Nos resultados, leia os endereços e abra suporte.printix.com.br."]],
      q("Por que baixar o driver do site oficial do fabricante?", ["Porque é o único site com cores bonitas.", "Porque o driver é verdadeiro, atualizado e sem programas escondidos.", "Porque baixa mais rápido em qualquer internet."], 1, ["A aparência não garante segurança. O que importa é quem publica o arquivo.", "Correto! Sites de terceiros podem trazer driver errado, desatualizado ou junto com programas indesejados.", "A velocidade depende da sua internet, não do site."])],
    ["Encontre o modelo exato", "O site tem vários modelos com nomes parecidos. Só um é o do laboratório.", "Pesquise o modelo no site e abra a página da InkJet 2350.", "folder_search", "google",
      "Cuidado: InkJet 2305, InkJet 2350 Pro e InkJet 2530 parecem a mesma coisa, mas são aparelhos diferentes.",
      [["site-search", "No site da Printix, digite InkJet 2350 na busca de produtos."], ["product", "Compare as fotos e os nomes e abra a InkJet 2350 (sem Pro)."]],
      q("InkJet 2350 e InkJet 2350 Pro usam o mesmo driver?", ["Sim, o nome é quase igual.", "Não: modelos diferentes podem ter peças e drivers diferentes.", "Só se a cor for igual."], 1, ["Um número ou uma palavra a mais já indica outro aparelho.", "Correto! A Pro também digitaliza, então tem outro driver. Por isso conferimos o modelo exato.", "A cor não define o driver; o modelo define."])],
    ["Escolha o sistema certo", "Na página do produto, os arquivos mudam conforme o sistema operacional.", "Selecione Windows 11 (64 bits) na página da InkJet 2350.", "window", "google",
      "Exemplo: se o computador é Windows 11 de 64 bits, escolha exatamente Windows 11 (64 bits).",
      [["os", "Na página da InkJet 2350, abra a caixa Sistema operacional e escolha Windows 11 (64 bits)."]],
      q("O que significa 64 bits no sistema?", ["A quantidade de impressoras que o computador aceita.", "O tipo de sistema; o driver precisa ter sido feito para ele.", "A velocidade da internet."], 1, ["Não tem relação com quantos aparelhos você liga.", "Correto! Um Windows de 64 bits precisa de drivers de 64 bits.", "Velocidade da internet é outra coisa."])],
    ["Baixe o driver correto", "A lista tem pacote completo, driver básico de 32 bits, firmware e versão para Mac. Escolha o arquivo certo.", "Baixe o Pacote completo de software e driver para Windows 11 (64 bits).", "arrow_right", "google",
      "O certo é o que bate com tudo que você anotou: InkJet 2350 + Windows de 64 bits + driver (não firmware).",
      [["download", "Clique em Baixar no Pacote completo de software e driver (64 bits)."], ["downloaded", "Acompanhe o download no botão de downloads do navegador até 100%."]],
      q("Qual a diferença entre driver e firmware?", ["Nenhuma, são a mesma coisa.", "O driver fica no computador; o firmware é o programa dentro da própria impressora.", "Firmware é um vírus."], 1, ["São coisas diferentes, e baixar o errado não resolve o problema.", "Correto! O driver é instalado no Windows; o firmware atualiza o aparelho por dentro.", "Firmware é um programa legítimo do fabricante, só que para o próprio aparelho."])],
    ["Instale o driver", "Com o arquivo certo baixado, é hora de instalar. Como manda o manual, o cabo USB foi desconectado: o instalador vai pedir para ligar na hora certa.", "Abra o instalador, siga as etapas e conecte o cabo quando for pedido.", "window_wrench", "google",
      "A maioria dos instaladores de impressora diz: só conecte o cabo USB quando o programa pedir.",
      [["installer", "No painel de downloads do navegador, clique em Abrir arquivo no driver baixado."], ["usb", "Avance o assistente e, quando pedir, clique em Conectar cabo USB."], ["installed", "Espere a instalação terminar e clique em Concluir."]],
      q("Por que o instalador pede para conectar o cabo só em certo momento?", ["Para preparar os arquivos do driver e então reconhecer a impressora.", "Para economizar energia elétrica.", "Porque o cabo esquenta."], 0, ["Correto! Primeiro o driver é copiado; depois o Windows reconhece a impressora e já usa o driver certo.", "Não tem relação com energia.", "O cabo não esquenta; a ordem serve para o reconhecimento dar certo."])],
    ["Confira no Gerenciador", "Todo técnico confere a instalação. Veja se o triângulo amarelo sumiu e qual versão foi instalada.", "Abra as propriedades da impressora no Gerenciador e registre a versão do driver.", "list_bar", "devicemanager",
      "Na guia Driver aparecem Fornecedor do Driver, Data do Driver e Versão do Driver, por exemplo: 3.1.0.",
      [["devmgr", "Abra o Gerenciador de Dispositivos."], ["properties", "Abra Impressoras (setinha ao lado do nome), dê dois cliques na Printix InkJet 2350 e clique na guia Driver."], ["recorded", "No robô, escolha a versão do driver e clique em Conferir."]],
      q("Onde conferir se o driver foi instalado e qual é a versão?", ["No Gerenciador de Dispositivos, nas propriedades do dispositivo.", "No papel de parede.", "Na Lixeira."], 0, ["Correto! Ali você vê o status do dispositivo e os dados do driver.", "O papel de parede não mostra informações de dispositivos.", "A Lixeira guarda arquivos apagados, não drivers."])],
    ["Página de teste", "Agora sim: confirme na prática que computador, driver e impressora estão conversando.", "Imprima uma página de teste no app Impressora.", "play", "printer",
      "Se a página sai com o texto certinho, o driver está funcionando.",
      [["print", "No app Impressora, clique em Imprimir página de teste e veja a folha sair."]],
      q("Para que serve a página de teste?", ["Para gastar tinta.", "Para confirmar que computador, driver e impressora estão se comunicando.", "Para limpar a impressora por dentro."], 1, ["A página de teste usa pouca tinta e tem um objetivo técnico.", "Correto! É a prova final de que a instalação funcionou.", "Limpeza de cabeça de impressão é outra função."])],
    ["Reverter um driver com problema", "Uma atualização automática instalou um driver beta e a impressão saiu com símbolos estranhos.", "Teste, reverta o driver no Gerenciador e teste de novo.", "arrow_counterclockwise", "printer",
      "Reverter Driver volta para a versão anterior, que funcionava. O botão fica na guia Driver das propriedades.",
      [["print-bad", "Imprima uma página de teste e veja o problema."], ["rollback", "No Gerenciador, dê dois cliques na impressora, abra a guia Driver e clique em Reverter Driver."], ["print-ok", "Imprima de novo e confira que voltou ao normal."]],
      q("Quando usar Reverter driver?", ["Quando uma atualização deixou o dispositivo com problema e você quer voltar à versão que funcionava.", "Sempre que ligar o computador.", "Para instalar um driver de outro modelo."], 0, ["Correto! É a forma rápida e segura de desfazer uma atualização ruim.", "Só é preciso quando uma atualização causa problema.", "Reverter volta à versão anterior do mesmo dispositivo, não troca de modelo."])],
  ];

  const catalog = rows.map(([title, description, goal, ic, tool, example, steps, quiz], i) => ({
    id: `driver-${i + 1}`, order: i + 1, title, description, goal, icon: icon(ic), tool, example,
    category: i < 3 ? "Identificar" : i < 8 ? "Encontrar" : "Instalar e testar", difficulty: "Iniciante",
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
    O.drivers.prepare(order);
    ["printer", "devicemanager", "sysinfo", "driverinstaller"].forEach((id) => O.shell?.closeApp?.(id));
    const driverFile = (id) => id.startsWith("drv-");
    if (order <= 8) O.software?.clearDownloads?.(driverFile);
    if (order === 9 && O.software?.getDownload?.(O.drivers.CORRECT)?.status !== "completed") O.software?.completeDownload?.(O.drivers.CORRECT);
  }
  function start(id) {
    const mission = getMissions().find((m) => m.id === id);
    if (!mission || mission.status === "locked") return { ok: false, reason: "locked" };
    if (progress.active?.id === id && progress.active.phase !== "completed" && progress.active.suspended) { O.activityCoordinator?.claim?.("drivers-lab"); progress.active.suspended = false; }
    else {
      if (progress.active && !progress.active.suspended) stop();
      O.activityCoordinator?.claim?.("drivers-lab");
      prepare(mission.order);
      progress.active = { id, phase: "practice", suspended: false, checklist: {}, hintsUsed: 0, lastHint: null, feedback: null, notice: null, recordFeedback: null, startedAt: Date.now() };
    }
    publish("started"); O.assistantRobot?.expand?.(); return { ok: true };
  }
  function stop() {
    const a = progress.active;
    if (!a || a.suspended) return;
    a.suspended = true; O.activityCoordinator?.release?.("drivers-lab"); publish("suspended");
  }
  function ready() {
    const a = progress.active, m = missionOf(), s = O.drivers.get();
    if (!a || !m || !m.objectives.every((o) => a.checklist[o.id])) return false;
    if (m.order === 9 || m.order === 11) return s.driver?.fileId === O.drivers.CORRECT && s.usb;
    if (m.order === 12) return s.driver?.fileId === O.drivers.CORRECT && !s.garbled;
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
  // avisos do robô quando o aluno escolhe algo errado (ele aprende com o erro e tenta de novo)
  function notice(text) { const a = progress.active; if (a) { a.notice = text; O.assistantRobot?.expand?.(); } }

  O.events.subscribe("oslab:event", ({ type, detail = {} }) => {
    const a = progress.active, order = missionOf()?.order;
    if (!a || a.suspended || a.phase === "completed") return;
    const C = O.drivers.CORRECT;
    if (type === "drivers:printer-opened" && order === 1) mark("open");
    if (type === "drivers:label-viewed" && order === 1 && a.checklist.open) mark("label");
    if (type === "drivers:test-print") {
      if (order === 2 && detail.result === "no-driver") mark("print-fail");
      if (order === 11 && detail.result === "ok") mark("print");
      if (order === 12 && detail.result === "garbled") mark("print-bad");
      if (order === 12 && detail.result === "ok" && a.checklist.rollback) mark("print-ok");
    }
    if (type === "drivers:devmgr-opened" && (order === 2 || order === 10)) mark("devmgr");
    if (type === "drivers:devmgr-unknown" && order === 2 && a.checklist.devmgr) mark("unknown");
    if (type === "drivers:devmgr-properties" && order === 10 && a.checklist.devmgr && detail.tab === "driver") mark("properties");
    if (type === "drivers:sysinfo-opened" && order === 3) mark("sysinfo");
    if (type === "drivers:search" && order === 4) { if (detail.ok) mark("search"); else notice(`Sua pesquisa "${detail.term}" ainda não tem tudo. Use marca + modelo + driver: Printix InkJet 2350 driver.`); }
    if (type === "drivers:result-opened" && order === 5) { if (detail.official) mark("official"); else notice("Esse não é o site da fabricante. Volte aos resultados e confira o endereço: suporte.printix.com.br."); }
    if (type === "drivers:site-search" && order === 6) mark("site-search");
    if (type === "drivers:product-opened" && order === 6) { if (detail.product === O.drivers.LAB) mark("product"); else notice(`Esse é o modelo ${O.drivers.printers[detail.product]?.model}. Compare com a etiqueta: InkJet 2350, sem Pro.`); }
    if (type === "drivers:os-selected" && order === 7 && detail.product === O.drivers.LAB) { if (detail.os === "win64") mark("os"); else notice("Esse não é o sistema deste computador. Ele é Windows 11 de 64 bits."); }
    if (type === "install:download-started" && order === 8 && String(detail.installerId).startsWith("drv-")) {
      if (detail.installerId === C) mark("download");
      else notice(`Esse arquivo não serve: ${O.drivers.PROBLEM_TEXT[O.drivers.problem(detail.installerId)]?.[1] || "confira modelo e sistema."}`);
    }
    if (type === "install:download-completed" && order === 8 && detail.installerId === C && a.checklist.download) mark("downloaded");
    if (type === "drivers:installer-opened" && order === 9) { if (detail.fileId === C) mark("installer"); else notice("Esse não é o driver da InkJet 2350 para 64 bits. Abra o arquivo Printix_InkJet2350_Completo_x64."); }
    if (type === "drivers:usb-connected" && order === 9 && a.checklist.installer) mark("usb");
    if (type === "drivers:installed" && order === 9 && detail.fileId === C && a.checklist.usb) mark("installed");
    if (type === "drivers:rollback" && order === 12 && a.checklist["print-bad"]) mark("rollback");
    if (type.startsWith("drivers:") || type.startsWith("install:")) evaluate();
  });

  /** formulários do robô: missão 3 (marca, modelo, sistema) e 10 (versão do driver) */
  function verifyRecord(data) {
    const a = progress.active, m = missionOf();
    if (!a || a.suspended || a.phase !== "practice") return { ok: false };
    let ok = false;
    if (m.order === 3 && a.checklist.sysinfo) ok = data.brand === "Printix" && data.model === "InkJet 2350" && data.system === "Windows 11 (64 bits)";
    if (m.order === 10 && a.checklist.properties) ok = data.version === "3.1.0";
    a.recordFeedback = { ok, text: ok ? "Correto! Os dados batem com o que está no computador." : m.order === 3 ? "Ainda não. Confira a etiqueta no app Impressora e o Tipo de sistema em Informações do Sistema." : "Ainda não. Veja a Versão na guia Driver das propriedades da impressora." };
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
    if (action === "next" && order < TOTAL) return start(`driver-${order + 1}`);
    O.shell?.openApp?.("driverslab"); return { ok: true };
  }
  function useHint() {
    const a = progress.active, m = missionOf();
    if (!a || a.suspended || a.phase !== "practice") return;
    a.hintsUsed = Math.min(3, a.hintsUsed + 1); a.lastHint = m.hints[a.hintsUsed - 1];
    publish("hint"); O.assistantRobot?.expand?.();
  }
  function reset() { stop(); progress = blank(); O.drivers.reset(); publish("reset"); }
  O.activityCoordinator?.register?.("drivers-lab", { isActive: () => Boolean(progress.active && !progress.active.suspended), stop });

  O.driverMissionCatalog = catalog;
  O.driversLab = { TOTAL, getMissions, getProgress: () => clone(progress), start, stop, finish, restart: () => finish("repeat"), answer, verifyRecord, useHint, reset, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
})(window);
