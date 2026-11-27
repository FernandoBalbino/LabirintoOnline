(function createStoreTrail(global) {
  "use strict";
  // Trilha "Microsoft Store": aprender a baixar aplicativos pela loja do Windows, com segurança.
  const O = global.OSLab, listeners = new Set();
  const KEY = "oslab.store.missions.v1";
  const icon = (name) => `assets/learning/icons/${name}.svg`;
  const q = (text, options, correct, explanations) => ({ text, options, correct, explanations });

  // [título, descrição, objetivo, ícone, exemplo, passos [id, texto], pergunta, app usado na missão]
  const rows = [
    ["Conheça a Microsoft Store", "A Microsoft Store é a loja oficial de aplicativos do Windows. Tudo o que está lá foi conferido pela Microsoft.", "Abra a Microsoft Store e visite as páginas Aplicativos e Jogos.", "apps",
      "A loja fica na barra de tarefas (sacola colorida) e no menu Iniciar. Na esquerda ficam Página Inicial, Aplicativos, Jogos, Downloads e Biblioteca.",
      [["open", "Abra a Microsoft Store pela barra de tarefas ou pelo menu Iniciar."], ["apps", "Clique em Aplicativos, na barra da esquerda."], ["games", "Clique em Jogos."]],
      q("Por que baixar aplicativos pela Microsoft Store?", ["Porque os aplicativos são conferidos e instalam e atualizam sozinhos.", "Porque todos os aplicativos são pagos.", "Porque a loja deixa o computador mais rápido."], 0, ["Correto! É a fonte oficial: sem sites falsos e sem instaladores com vírus escondido.", "A maioria é gratuita; a loja mostra o preço antes.", "A loja só instala; ela não deixa o computador mais rápido."])],
    ["Pesquise antes de baixar", "Antes de instalar, um bom técnico confere quem fez o aplicativo (o editor), o preço e a nota dos usuários.", "Pesquise ChatGPT, abra a página do aplicativo e registre editor, preço e nota.", "folder_search",
      "A caixa de pesquisa fica no topo da loja. Na página do aplicativo aparecem o editor (em azul), a nota com estrela e o botão com o preço ou Instalar.",
      [["search", "Na caixa do topo, pesquise ChatGPT e aperte Enter (basta começar: cha)."], ["page", "Clique no ChatGPT para abrir a página dele."], ["recorded", "No robô, registre editor, preço e nota e clique em Conferir."]],
      q("Para que serve conferir o editor de um aplicativo?", ["Para ter certeza de que é o aplicativo oficial e não uma cópia falsa.", "Para descobrir o tamanho da tela.", "Para trocar o idioma do Windows."], 0, ["Correto! O ChatGPT verdadeiro é da OpenAI. Um 'ChatGPT' de outro editor pode ser golpe.", "O tamanho da tela não depende do aplicativo.", "Idioma se troca em Configurações."])],
    ["Instalar e abrir", "Com o aplicativo certo encontrado, é hora de instalar. A loja baixa, instala e coloca o atalho no menu Iniciar.", "Instale o ChatGPT, abra pelo botão Abrir e faça uma pergunta.", "play",
      "Instalar → a loja mostra Baixando e a porcentagem → quando termina, o botão vira Abrir.",
      [["install", "Na página do ChatGPT, clique em Instalar e espere chegar a 100%."], ["open", "Clique em Abrir."], ["ask", "Faça uma pergunta ao ChatGPT, por exemplo: como baixar um aplicativo com segurança?"]],
      q("Depois de instalado, onde mais você encontra o aplicativo?", ["No menu Iniciar.", "Só dentro da loja, para sempre.", "Na Lixeira."], 0, ["Correto! Todo aplicativo instalado aparece no menu Iniciar.", "Você não precisa abrir a loja toda vez: use o Iniciar.", "A Lixeira guarda arquivos apagados, não aplicativos."]), "chatgpt"],
    ["Spotify: instale e entre", "Muitos aplicativos pedem uma conta. Depois de instalar, é preciso entrar com e-mail e senha.", "Instale o Spotify, entre com a conta que o robô mostra e toque uma música.", "speaker_2",
      "Digite o e-mail e a senha exatamente como estão no robô. Letras maiúsculas e minúsculas fazem diferença na senha.",
      [["search", "Na caixa do topo da loja, pesquise Spotify e aperte Enter (basta começar: spo)."], ["install", "Abra o Spotify e clique em Instalar."], ["login", "Abra o Spotify e entre com o e-mail e a senha do robô."], ["play", "Clique em uma música da playlist para tocar."]],
      q("O que fazer com a senha de uma conta?", ["Guardar só para mim e não contar para ninguém.", "Mandar no grupo da turma para não esquecer.", "Escrever na tela de bloqueio."], 0, ["Correto! Senha é pessoal. Quem sabe a senha entra na conta como se fosse você.", "Nunca compartilhe senha em grupos.", "Senha à vista deixa qualquer um entrar."]), "spotify"],
    ["Netflix: instale e assista", "O aplicativo da Netflix também pede login. Depois, cada pessoa escolhe o próprio perfil.", "Instale a Netflix, entre com a conta do robô, escolha o perfil Aluno e assista a um título.", "play",
      "Depois de entrar, a Netflix pergunta: Quem está assistindo? Escolha o seu perfil.",
      [["install", "Instale a Netflix pela Microsoft Store."], ["login", "Abra a Netflix e entre com o e-mail e a senha do robô."], ["profile", "Escolha o perfil Aluno."], ["play", "Clique em um título para assistir."]],
      q("Para que servem os perfis da Netflix?", ["Cada pessoa da casa tem a própria lista e as próprias recomendações.", "Para pagar mais barato.", "Para deixar o vídeo em 4K."], 0, ["Correto! O perfil separa o que cada um assiste, na mesma conta.", "O preço depende do plano, não do perfil.", "Qualidade depende do plano e da internet."]), "netflix"],
    ["Discord: converse com a turma", "O Discord é usado para conversar em grupos. Instale, entre na conta e mande uma mensagem educada no canal geral.", "Instale o Discord, entre com a conta do robô e envie uma mensagem em #geral.", "people",
      "No Discord, cada servidor tem canais com #. Escreva na caixa de baixo e aperte Enter para enviar.",
      [["install", "Instale o Discord pela Microsoft Store."], ["login", "Abra o Discord e entre com o e-mail e a senha do robô."], ["message", "Envie uma mensagem no canal #geral."]],
      q("O que é seguro compartilhar num grupo on-line?", ["Dúvidas e assuntos da aula, com respeito.", "Meu endereço e telefone.", "A senha do Wi-Fi da escola."], 0, ["Correto! Dados pessoais e senhas nunca vão para grupos.", "Endereço e telefone podem ser usados por golpistas.", "Senha do Wi-Fi é da escola; não se compartilha."]), "discord"],
    ["Dois navegadores", "Além do Chrome e do Edge, existem outros navegadores. Eles também se instalam pela loja.", "Instale o Brave e o Opera, abra um deles pelo menu Iniciar e faça uma pesquisa.", "globe_search",
      "Depois de instalar, não precisa da loja para abrir: clique em Iniciar e procure o nome do navegador.",
      [["brave", "Instale o Navegador Brave pela loja."], ["opera", "Instale o Opera Browser pela loja."], ["start", "Abra o Brave ou o Opera pelo menu Iniciar."], ["search", "Faça uma pesquisa no navegador que você abriu."]],
      q("Ter mais de um navegador instalado…", ["É normal; você escolhe qual usar.", "Quebra o Windows.", "Apaga os favoritos do Chrome."], 0, ["Correto! Cada navegador funciona separado.", "Vários navegadores convivem sem problema.", "Os favoritos de cada navegador ficam nele mesmo."]), "brave"],
    ["Desenhe no ibis Paint", "Aplicativos de criação também estão na loja. O ibis Paint é gratuito para desenhar.", "Instale o ibis Paint, faça um desenho e salve na pasta Imagens.", "paint_brush",
      "Escolha uma cor à esquerda, arraste o mouse (ou o dedo no touchpad) na tela branca e clique em Salvar em Imagens.",
      [["install", "Instale o ibis Paint pela Microsoft Store."], ["draw", "Abra o ibis Paint e faça um desenho."], ["save", "Clique em Salvar em Imagens."]],
      q("Onde o desenho foi salvo?", ["Na pasta Imagens do Explorador de Arquivos.", "Na Lixeira.", "Dentro da Microsoft Store."], 0, ["Correto! Abra o Explorador › Imagens para ver o arquivo .png.", "A Lixeira só guarda o que foi apagado.", "A loja não guarda seus arquivos."]), "ibispaint"],
    ["Procure por categoria", "Quando você não sabe o nome do aplicativo, procure pela categoria, como Produtividade.", "Abra a categoria Produtividade, instale o Microsoft To Do e organize suas tarefas.", "list_bar",
      "Em Aplicativos aparecem os botões de categoria. Produtividade reúne listas, documentos e organizadores.",
      [["category", "Em Aplicativos, clique na categoria Produtividade."], ["install", "Instale o Microsoft To Do."], ["tasks", "Abra o To Do e adicione duas tarefas."], ["done", "Marque uma tarefa como concluída."]],
      q("Categorias da loja ajudam a…", ["Encontrar aplicativos pelo tipo quando você não sabe o nome.", "Deixar os aplicativos gratuitos.", "Desinstalar aplicativos."], 0, ["Correto! É como as seções de uma loja de verdade.", "O preço não muda com a categoria.", "Desinstalar é em Configurações › Aplicativos."]), "todo"],
    ["Grátis, pago e idade", "Nem tudo é gratuito, e cada aplicativo ou jogo tem uma classificação indicativa (idade).", "Abra as páginas do Forza Horizon 5 e do Minecraft Launcher e registre o preço e a idade.", "shield_checkmark",
      "O botão mostra o preço (R$) quando é pago. A caixa com o número mostra a idade indicada.",
      [["forza", "Pesquise e abra a página do Forza Horizon 5."], ["minecraft", "Abra a página do Minecraft Launcher."], ["recorded", "No robô, registre o preço e a idade e clique em Conferir."]],
      q("O botão de um jogo mostra R$ 99,60. O que fazer?", ["Só comprar com a autorização de um responsável.", "Usar o cartão de alguém escondido.", "Clicar várias vezes para ganhar desconto."], 0, ["Correto! Compras pedem forma de pagamento e autorização.", "Usar cartão sem permissão é errado e pode ser crime.", "Clicar mais não dá desconto e pode comprar duas vezes."])],
    ["Biblioteca e atualizações", "Aplicativos recebem atualizações com correções e recursos novos. A loja mostra tudo na Biblioteca.", "Abra a Biblioteca, clique em Obter atualizações e abra um aplicativo atualizado.", "arrow_reset",
      "Downloads e Biblioteca ficam no canto inferior esquerdo da loja. O número mostra quantas atualizações existem.",
      [["library", "Clique em Biblioteca (embaixo, à esquerda)."], ["update", "Clique em Obter atualizações e espere terminar."], ["open", "Clique em Abrir em um dos aplicativos da lista."]],
      q("Por que manter os aplicativos atualizados?", ["Atualizações corrigem falhas de segurança e erros.", "Para gastar a internet.", "Para trocar o ícone do aplicativo."], 0, ["Correto! Aplicativo desatualizado pode ter brechas usadas por vírus.", "Atualizar usa internet, mas é importante.", "O motivo é segurança e correções."])],
    ["Desinstale o que não usa", "Aplicativos que você não usa ocupam espaço. Desinstalar é feito em Configurações, não na loja.", "Desinstale o Opera em Configurações › Aplicativos › Aplicativos instalados e confira no menu Iniciar.", "dismiss_circle",
      "Iniciar › Configurações › Aplicativos › Aplicativos instalados › Desinstalar (no Opera) › confirme.",
      [["settings", "Abra Configurações › Aplicativos › Aplicativos instalados."], ["uninstall", "Clique em Desinstalar no Opera Browser e confirme."], ["check", "Abra o menu Iniciar e veja que o Opera sumiu."]],
      q("Desinstalar um aplicativo…", ["Remove o programa e libera espaço; dá para instalar de novo pela loja.", "Apaga o Windows.", "Apaga seus arquivos da pasta Documentos."], 0, ["Correto! Se precisar de novo, é só instalar pela Microsoft Store.", "O Windows continua intacto.", "Seus documentos continuam lá."]), "opera"],
  ];
  const catalog = rows.map(([title, description, goal, ic, example, steps, quiz, app], i) => ({
    id: `store-${i + 1}`, order: i + 1, title, description, goal, icon: icon(ic), example, app,
    category: i < 3 ? "Conhecer a loja" : i < 6 ? "Apps com conta" : i < 9 ? "Mais aplicativos" : "Cuidados",
    difficulty: i < 6 ? "Básico" : "Intermediário",
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
  const ST = () => O.store;
  function getMissions() {
    return catalog.map((m, i) => ({ ...m, status: progress.active?.id === m.id && progress.active.phase !== "completed" ? "active" : progress.completed[m.id] ? "completed" : !i || progress.completed[catalog[i - 1].id] ? "available" : "locked" }));
  }

  /** "Reiniciar missão": devolve a loja e os aplicativos ao estado do começo da missão */
  function prepare(order) {
    const off = (...ids) => ids.forEach((id) => { ST()?.uninstall?.(id, { silent: true }); O.storeApps?.resetApp?.(id); O.shell?.closeApp?.(ST()?.get?.(id)?.app || id); });
    const on = (...ids) => ids.forEach((id) => ST()?.install?.(id, { instant: true }));
    if (order === 1) O.shell?.closeApp?.("msstore");
    if (order === 3) off("chatgpt");
    if (order === 4) off("spotify");
    if (order === 5) off("netflix");
    if (order === 6) off("discord");
    if (order === 7) off("brave", "opera");
    if (order === 8) off("ibispaint");
    if (order === 9) off("todo");
    if (order === 11) { on("chatgpt", "spotify", "calculator"); ST()?.markUpdates?.(["chatgpt", "spotify", "calculator"]); }
    if (order === 12) { on("opera"); O.shell?.closeApp?.("settings"); }
  }
  function start(id) {
    const mission = getMissions().find((m) => m.id === id);
    if (!mission || mission.status === "locked") return { ok: false, reason: "locked" };
    if (progress.active?.id === id && progress.active.phase !== "completed" && progress.active.suspended) { O.activityCoordinator?.claim?.("store-lab"); progress.active.suspended = false; }
    else {
      if (progress.active && !progress.active.suspended) stop();
      O.activityCoordinator?.claim?.("store-lab");
      progress.active = { id, phase: "practice", suspended: false, checklist: {}, hintsUsed: 0, lastHint: null, feedback: null, notice: null, recordFeedback: null, startedAt: Date.now() };
      prepare(mission.order);
    }
    publish("started"); O.assistantRobot?.expand?.(); return { ok: true };
  }
  function stop() { const a = progress.active; if (!a || a.suspended) return; a.suspended = true; O.activityCoordinator?.release?.("store-lab"); publish("suspended"); }
  const ready = () => { const a = progress.active, m = missionOf(); return Boolean(a && m && m.objectives.every((o) => a.checklist[o.id])); };
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
  const PASS = { spotify: "Musica2026", netflix: "Filmes2026", discord: "Conversa2026" };
  // pesquisa vale com as 3 primeiras letras do nome ("spo", "spotif"), sem acento, espaço ou maiúscula
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ\s]/g, "").toLowerCase();
  const typed = (query, name) => { const q = norm(query); return q.length >= 3 && norm(name).startsWith(q); };

  O.events.subscribe("oslab:event", ({ type, detail = {} }) => {
    const a = progress.active, m = missionOf(), order = m?.order;
    if (!a || a.suspended || a.phase === "completed") return;
    const c = a.checklist;
    if (type === "store:not-created") notice(`Esse aplicativo ainda não existe no OSLab. Nesta missão, procure ${m.app ? ST()?.get?.(m.app)?.title || m.app : "o aplicativo pedido"}.`);
    if (type === "storeapp:login" && !detail.ok && PASS[detail.app]) notice(`E-mail ou senha errados. Use aluno.oslab@gmail.com e a senha ${PASS[detail.app]} (com M, F ou C maiúsculo).`);
    if (type === "store:installed" && !detail.silent && m.app && detail.id !== m.app && order !== 7 && order !== 11) notice(`Você instalou outro aplicativo. Tudo bem, mas a missão pede: ${ST()?.get?.(m.app)?.title}.`);

    if (order === 1) {
      if (type === "app:opened" && detail.appId === "msstore") mark("open");
      if (type === "store:nav" && detail.page === "apps" && c.open) mark("apps");
      if (type === "store:nav" && detail.page === "games" && c.open) mark("games");
    }
    if (order === 2) {
      if (type === "store:search" && typed(detail.query, "ChatGPT")) mark("search");
      if (type === "store:product" && detail.id === "chatgpt") { mark("search"); mark("page"); }
    }
    const installed = (id) => type === "store:installed" && detail.id === id && !detail.silent;
    const opened = (id) => (type === "store:open-app" && detail.id === id) || (type === "app:opened" && detail.appId === id);
    if (order === 3) {
      if (installed("chatgpt")) mark("install");
      if (opened("chatgpt") && c.install) mark("open");
      if (type === "chatgpt:message") { if (c.open) mark("ask"); }
    }
    if ([4, 5, 6].includes(order)) {
      const app = m.app;
      if (order === 4 && ((type === "store:search" && typed(detail.query, "Spotify")) || (type === "store:product" && detail.id === app))) mark("search");
      if (installed(app)) { mark("search"); mark("install"); }
      if (type === "storeapp:login" && detail.app === app && detail.ok) { mark("search"); mark("install"); mark("login"); }
      if (order === 4 && type === "spotify:play" && c.login) mark("play");
      if (order === 5 && type === "netflix:profile" && c.login) mark("profile");
      if (order === 5 && type === "netflix:play" && c.profile) mark("play");
      if (order === 6 && type === "discord:message" && c.login && detail.channel === "geral") mark("message");
      if (order === 6 && type === "discord:message" && detail.channel !== "geral") notice("Mensagem enviada, mas a missão pede o canal #geral.");
    }
    if (order === 7) {
      if (installed("brave")) mark("brave");
      if (installed("opera")) mark("opera");
      if (type === "start:app-opened" && ["brave", "opera"].includes(detail.appId) && c.brave && c.opera) mark("start");
      if (type === "app:opened" && ["brave", "opera"].includes(detail.appId) && !(c.brave && c.opera)) notice("Primeiro instale os dois navegadores pela loja.");
      if (type === "browser:action" && detail.action === "search" && ["brave", "opera"].includes(detail.browserId) && c.start) mark("search");
    }
    if (order === 8) {
      if (installed("ibispaint")) mark("install");
      if (type === "ibis:draw" && c.install) mark("draw");
      if (type === "ibis:saved" && c.draw) mark("save");
    }
    if (order === 9) {
      if (type === "store:category" && detail.category === "Produtividade") mark("category");
      if (installed("todo")) mark("install");
      if (type === "todo:added" && c.install && detail.count >= 2) mark("tasks");
      if (type === "todo:done" && c.tasks) mark("done");
    }
    if (order === 10) {
      if (type === "store:product" && detail.id === "forza") mark("forza");
      if (type === "store:product" && detail.id === "minecraft") mark("minecraft");
    }
    if (order === 11) {
      if (type === "store:nav" && detail.page === "library") mark("library");
      if (type === "store:updates-done" && c.library) mark("update");
      if (type === "store:open-app" && c.update) mark("open");
    }
    if (order === 12) {
      if (type === "settings:installed-apps-opened") mark("settings");
      if (type === "store:uninstalled" && detail.id === "opera" && !detail.silent) { mark("settings"); mark("uninstall"); }
      if (type === "store:uninstalled" && detail.id !== "opera" && !detail.silent) notice("Você desinstalou outro aplicativo. Se precisar dele, instale de novo pela loja. A missão pede o Opera.");
      if (type === "start:opened" && c.uninstall) mark("check");
    }
    if (/^(app|store|storeapp|chatgpt|spotify|netflix|discord|ibis|todo|start|browser|settings):/.test(type)) evaluate();
  });

  function verifyRecord(data) {
    const a = progress.active, m = missionOf();
    if (!a || a.suspended || a.phase !== "practice") return { ok: false };
    let ok = false;
    if (m.order === 2 && a.checklist.page) ok = data.publisher === "OpenAI" && data.price === "Gratuito" && data.rating === "4,0";
    if (m.order === 10 && a.checklist.forza && a.checklist.minecraft) ok = data.forza === "R$ 99,60" && data.minecraft === "14 anos";
    a.recordFeedback = { ok, text: ok ? "Correto! Você conferiu a página como um técnico." : m.order === 2 ? (a.checklist.page ? "Ainda não. Olhe o nome em azul abaixo do título, a nota com estrela e o botão." : "Primeiro pesquise e abra a página do ChatGPT.") : (a.checklist.forza && a.checklist.minecraft ? "Ainda não. O preço está no botão e a idade na caixa com o número." : "Primeiro abra as páginas do Forza Horizon 5 e do Minecraft Launcher.") };
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
    if (action === "next" && order < TOTAL) return start(`store-${order + 1}`);
    O.shell?.openApp?.("storelab"); return { ok: true };
  }
  function useHint() {
    const a = progress.active, m = missionOf();
    if (!a || a.suspended || a.phase !== "practice") return;
    a.hintsUsed = Math.min(3, a.hintsUsed + 1); a.lastHint = m.hints[a.hintsUsed - 1];
    publish("hint"); O.assistantRobot?.expand?.();
  }
  function reset() { stop(); progress = blank(); publish("reset"); }
  O.activityCoordinator?.register?.("store-lab", { isActive: () => Boolean(progress.active && !progress.active.suspended), stop });

  O.storeMissionCatalog = catalog;
  O.storeLab = { TOTAL, getMissions, getProgress: () => clone(progress), start, stop, finish, restart: () => finish("repeat"), answer, verifyRecord, useHint, reset, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
})(window);
