(function defineExerciseCatalog(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const GB = 1024 ** 3;
  const MB = 1024 ** 2;
  const exerciseTag = (id) => `exercise:${id}`;
  const exerciseFile = (id, input) => OSLab.fileSystem.create({ ...input, createdByExercise: true, exerciseId: id });
  const tutorialHint = (title, intro, steps, check) => Object.freeze({
    title,
    intro,
    steps: Object.freeze(steps),
    check,
  });

  const catalog = [
    {
      id: "storage-full", order: 1, title: "Armazenamento cheio", category: "Sistema", difficulty: "Fácil",
      description: "Um download importante não inicia porque o computador informa que não há espaço disponível.",
      goal: "Descobrir o que ocupa o disco e liberar espaço suficiente.",
      initialSpeech: "Estou tentando baixar um arquivo, mas o computador diz que não há espaço suficiente. Será que existe alguma coisa ocupando muito armazenamento?",
      hint: tutorialHint(
        "Como liberar espaço para o download",
        "Vamos primeiro localizar os arquivos grandes e depois removê-los de verdade do disco.",
        [
          "Abra o menu Iniciar e clique em Configurações.",
          "Na coluna esquerda, abra Sistema. Depois clique na opção Armazenamento.",
          "Em Uso por local, abra Documentos e entre na pasta Projetos arquivados. Observe a coluna Tamanho e escolha pelo menos dois dos arquivos grandes, como os arquivos .mp4, .iso ou .zip.",
          "Selecione um arquivo e clique em Excluir na barra do Explorador. Repita com outro arquivo grande. Neste momento eles apenas foram para a Lixeira e ainda ocupam espaço.",
          "Abra a Lixeira pelo atalho da Área de Trabalho e clique em Esvaziar Lixeira para liberar o espaço definitivamente.",
        ],
        "Quando terminar, volte ao robô e clique em Testar novamente. O download precisa de 2 GB livres.",
      ),
      success: "Agora o download terminou! Você encontrou o que estava ocupando o armazenamento e liberou espaço suficiente.",
      cause: "Arquivos grandes e itens mantidos na Lixeira deixaram menos espaço livre que o download precisava.", tool: "Configurações de Armazenamento, Explorador e Lixeira",
      setup(ctx) {
        const folder = exerciseFile(ctx.id, { parentId: OSLab.fileSystem.roots.documents, kind: "folder", name: "Projetos arquivados" });
        [
          ["captura-aula-01.mp4", 1.55 * GB], ["material-antigo.iso", 1.4 * GB], ["backup-fotos.zip", 1.2 * GB],
          ["leia-me.txt", 18 * 1024], ["cronograma.pdf", 620 * 1024],
        ].forEach(([name, sizeBytes]) => exerciseFile(ctx.id, { parentId: folder.id, kind: "file", name, sizeBytes }));
        const total = 237 * GB;
        const reserved = Math.max(0, total - OSLab.fileSystem.usedBytes() - 420 * MB);
        OSLab.systemState.configure({ storageTotalBytes: total, systemReservedBytes: reserved, requiredDownloadBytes: 2 * GB });
        ctx.shell.refreshDesktop();
        ctx.shell.notify("Armazenamento insuficiente", "Não foi possível concluir o download de suporte-offline.zip.", "warning");
        return { folderId: folder.id, requiredBytes: 2 * GB };
      },
      isReady(ctx) { return OSLab.systemState.getStorage().freeBytes >= ctx.scenario.requiredBytes; },
      test(ctx) { return ctx.shell.tryDiagnosticDownload(ctx.scenario.requiredBytes, ctx.id); },
    },
    {
      id: "frozen-program", order: 2, title: "Programa travado", category: "Sistema", difficulty: "Fácil",
      description: "Um aplicativo congelou, exibe 'Não respondendo' e não fecha normalmente.",
      goal: "Identificar e encerrar somente o processo travado.",
      initialSpeech: "O Editor de Texto congelou e o botão fechar não funciona. Preciso recuperar o computador sem encerrar processos importantes.",
      hint: tutorialHint(
        "Como encerrar somente o programa travado",
        "Use o Gerenciador de Tarefas para fechar o processo que está marcado como não respondendo.",
        [
          "Clique com o botão direito em uma área vazia da barra de tarefas, na parte inferior da tela, e escolha Gerenciador de Tarefas.",
          "Na seção Processos, procure Editor de Texto. Confirme que o status dele é Não respondendo.",
          "Clique uma vez na linha Editor de Texto para selecioná-la. Não selecione processos do sistema.",
          "Na barra superior do Gerenciador de Tarefas, clique em Finalizar tarefa. A janela travada deve desaparecer.",
        ],
        "Volte ao robô e clique em Testar novamente para confirmar que o processo e a janela foram encerrados.",
      ),
      success: "O programa finalmente fechou. Você identificou o processo travado e encerrou a tarefa correta.",
      cause: "O processo do Editor de Texto parou de responder.", tool: "Gerenciador de Tarefas",
      setup(ctx) { const record = ctx.shell.openTextEditor({ missionId: exerciseTag(ctx.id), title: "Editor de Texto", frozen: true }); return { pid: record.pid, windowId: record.windowId }; },
      isReady(ctx) { return !OSLab.processManager.getProcessByPid(ctx.scenario.pid); },
      test(ctx) { return !OSLab.processManager.getProcessByPid(ctx.scenario.pid) && !ctx.shell.isWindowOpen(ctx.scenario.windowId); },
    },
    {
      id: "high-cpu", order: 3, title: "Computador muito lento", category: "Sistema", difficulty: "Média",
      description: "Janelas e aplicativos estão demorando porque algum processo usa quase toda a CPU.",
      goal: "Localizar o maior consumo de CPU e encerrar o processo responsável.",
      initialSpeech: "Tudo ficou muito lento de repente. Parece que algum programa está usando recursos demais.",
      hint: tutorialHint(
        "Como encontrar o processo que deixa o computador lento",
        "O culpado aparece no Gerenciador de Tarefas com um uso de CPU muito maior que os demais.",
        [
          "Abra o Gerenciador de Tarefas pelo ícone na barra de tarefas ou clicando com o botão direito na barra e escolhendo Gerenciador de Tarefas.",
          "Na seção Processos, clique no título da coluna CPU para ordenar do maior consumo para o menor.",
          "Procure o Sincronizador de Mídia, que está usando aproximadamente 96% da CPU, e clique na linha para selecioná-lo.",
          "Clique em Finalizar tarefa na barra superior. Não encerre processos essenciais que apresentam consumo normal.",
        ],
        "Quando o computador responder normalmente, volte ao robô e clique em Testar novamente.",
      ),
      success: "O computador voltou ao normal. O processo que estava consumindo quase toda a CPU foi encerrado.",
      cause: "O Sincronizador de Mídia ficou preso usando 96% da CPU.", tool: "Gerenciador de Tarefas",
      setup(ctx) {
        const process = OSLab.processManager.createProcess({ appId: "media-sync", name: "Sincronizador de Mídia", icon: "assets/icons/settings-rows/video.png", cpu: 96, memory: 186, missionId: exerciseTag(ctx.id) });
        OSLab.systemState.configure({ slowMode: true }); return { pid: process.pid };
      },
      isReady(ctx) { return !OSLab.processManager.getProcessByPid(ctx.scenario.pid); },
      test(ctx) { const ok = !OSLab.processManager.getProcessByPid(ctx.scenario.pid) && OSLab.systemState.getPerformance().cpuPercent < 30; if (ok) OSLab.systemState.configure({ slowMode: false }); return ok; },
    },
    {
      id: "low-memory", order: 4, title: "Memória RAM insuficiente", category: "Sistema", difficulty: "Média",
      description: "Vários aplicativos estão abertos e o navegador não consegue iniciar por falta de memória.",
      goal: "Liberar RAM sem finalizar processos essenciais e abrir o navegador.",
      initialSpeech: "Preciso abrir o navegador, mas aparece uma mensagem de memória insuficiente. Alguns programas podem estar consumindo RAM demais.",
      hint: tutorialHint(
        "Como liberar memória RAM com segurança",
        "Feche um aplicativo auxiliar que está consumindo muita memória, sem tocar nos processos protegidos do sistema.",
        [
          "Abra o Gerenciador de Tarefas pelo ícone na barra de tarefas ou pelo menu exibido ao clicar com o botão direito na barra.",
          "Na seção Processos, clique no título da coluna Memória para colocar os maiores consumos no topo.",
          "Localize Editor de Vídeo, Biblioteca de Fotos ou Sincronizador de Backup. Cada um usa cerca de 1.120 MB; selecione um deles.",
          "Clique em Finalizar tarefa. Se ainda aparecer pouca memória, encerre mais um desses três aplicativos auxiliares, nunca um processo essencial.",
        ],
        "Clique em Testar novamente. O robô tentará abrir o Google quando houver pelo menos 650 MB de memória livre.",
      ),
      success: "O aplicativo abriu corretamente. Você liberou memória fechando os programas que estavam consumindo recursos.",
      cause: "Três aplicativos auxiliares consumiam quase toda a RAM disponível.", tool: "Gerenciador de Tarefas",
      setup(ctx) {
        ctx.shell.closeApp("google");
        const pids = ["Editor de Vídeo", "Biblioteca de Fotos", "Sincronizador de Backup"].map((name, index) => OSLab.processManager.createProcess({ appId: `memory-hog-${index}`, name, icon: "assets/settings/Apps.webp", cpu: 1 + index, memory: 1120, missionId: exerciseTag(ctx.id) }).pid);
        OSLab.systemState.configure({ blockedAppId: "google", requiredAppMemoryMb: 650 });
        ctx.shell.notify("Memória insuficiente", "O Google não pode ser iniciado enquanto houver pouca memória disponível.", "warning");
        return { pids, targetApp: "google" };
      },
      isReady() { return OSLab.systemState.getPerformance().memoryFreeMb >= 650; },
      test(ctx) { const record = ctx.shell.openApp(ctx.scenario.targetApp, { missionId: exerciseTag(ctx.id) }); return Boolean(record && ctx.shell.isWindowOpen(ctx.scenario.targetApp)); },
    },
    {
      id: "slow-startup", order: 5, title: "Inicialização lenta", category: "Sistema", difficulty: "Média",
      description: "O computador demora muito para iniciar por causa de vários aplicativos automáticos.",
      goal: "Reduzir o impacto da inicialização mantendo o serviço essencial ativo.",
      initialSpeech: "Toda vez que ligo o computador preciso esperar muito. Muitos programas parecem iniciar junto com o Windows.",
      hint: tutorialHint(
        "Como reduzir o tempo de inicialização",
        "Desative aplicativos não essenciais de alto impacto e preserve a Segurança do Windows.",
        [
          "No Gerenciador de Tarefas que foi aberto pelo exercício, clique em Aplicativos de inicialização na coluna esquerda.",
          "Observe as colunas Status e Impacto na inicialização. Comece pelos aplicativos habilitados com impacto Alto.",
          "Selecione um aplicativo não essencial, como Sincronizador em Nuvem, Inicializador de Jogos ou Aplicativo de Reuniões, e clique em Desabilitar.",
          "Repita até o tempo estimado mostrado no topo ficar em 18 segundos ou menos.",
          "Mantenha Segurança do Windows habilitada: ela está marcada como Essencial e não deve ser desativada.",
        ],
        "Depois volte ao robô e clique em Testar novamente para simular a reinicialização e medir o novo tempo.",
      ),
      success: "O computador iniciou muito mais rápido. Você reduziu a quantidade de programas executados automaticamente.",
      cause: "Aplicativos de alto impacto estavam configurados para iniciar automaticamente.", tool: "Aplicativos de inicialização do Gerenciador de Tarefas",
      setup(ctx) {
        OSLab.processManager.getStartupApps().forEach((app) => { if (!app.protected) OSLab.processManager.setStartupEnabled(app.id, true); });
        const before = OSLab.processManager.estimateBootTime(); OSLab.systemState.configure({ lastBootSeconds: before });
        ctx.shell.openApp("taskmanager"); return { before, targetSeconds: 18 };
      },
      isReady(ctx) { const apps = OSLab.processManager.getStartupApps(); return apps.find((app) => app.id === "windows-security")?.enabled && OSLab.processManager.estimateBootTime() <= ctx.scenario.targetSeconds; },
      test(ctx) { const seconds = ctx.shell.simulateRestart(); return seconds < ctx.scenario.before && seconds <= ctx.scenario.targetSeconds; },
    },
    {
      id: "wifi-disabled", order: 6, title: "Wi-Fi desativado", category: "Rede", difficulty: "Fácil",
      description: "Nenhuma rede sem fio aparece e as páginas não carregam.",
      goal: "Ativar o adaptador, escolher uma rede e restabelecer o acesso.",
      initialSpeech: "Nenhuma rede aparece e o navegador diz que estou desconectado. O adaptador sem fio pode estar desligado.",
      hint: tutorialHint(
        "Como reativar e conectar o Wi-Fi",
        "O adaptador sem fio está desligado; primeiro ative-o e depois escolha a rede correta.",
        [
          "Abra o menu Iniciar, clique em Configurações e escolha Rede e Internet na coluna esquerda.",
          "No painel superior, clique no bloco Wi-Fi. O texto deve mudar de Desativado para Ativado.",
          "Na lista Redes disponíveis, clique em REDE_OSLAB. A linha deve passar a mostrar Conectada.",
          "Confira no resumo da página se o estado mudou para Conectado à internet e Online.",
        ],
        "Volte ao robô e clique em Testar novamente; ele abrirá uma página para confirmar a conexão.",
      ),
      success: "A internet voltou! O adaptador Wi-Fi estava desativado e agora a conexão foi restabelecida.",
      cause: "O adaptador Wi-Fi estava desligado.", tool: "Configurações de Rede e Internet",
      setup() { OSLab.network.restoreSnapshot({ ...OSLab.network.defaults, wifiEnabled: false, connectedSsid: null, airplaneMode: false, connectionType: "wifi" }); return {}; },
      isReady() { const net = OSLab.network.getSnapshot(); return net.wifiEnabled && net.connectedSsid === "REDE_OSLAB" && net.internetAvailable; },
      test() { return OSLab.network.browse("google.com").ok; },
    },
    {
      id: "airplane-mode", order: 7, title: "Modo avião ativado", category: "Rede", difficulty: "Fácil",
      description: "Todas as conexões sem fio desapareceram e o ícone de avião está ativo.",
      goal: "Desativar o modo avião e reconectar o Wi-Fi.",
      initialSpeech: "O computador perdeu as conexões sem fio de uma vez. Vi um ícone diferente perto do relógio.",
      hint: tutorialHint(
        "Como sair do modo avião",
        "Use as Configurações rápidas próximas ao relógio para religar as conexões sem fio.",
        [
          "Clique no conjunto de ícones de rede, volume e bateria no canto inferior direito da barra de tarefas.",
          "No painel Configurações rápidas, clique em Modo avião para desativá-lo. O bloco não deve continuar destacado.",
          "Clique em Wi-Fi para ativá-lo. Se a conexão não voltar automaticamente, abra Configurações > Rede e Internet.",
          "Em Redes disponíveis, clique em REDE_OSLAB e confirme que ela aparece como Conectada.",
        ],
        "Quando o ícone de avião desaparecer e a rede estiver conectada, clique em Testar novamente.",
      ),
      success: "O modo avião estava bloqueando as conexões. Agora o computador está conectado novamente.",
      cause: "O modo avião desligou o adaptador Wi-Fi.", tool: "Configurações rápidas",
      setup() { OSLab.network.restoreSnapshot({ ...OSLab.network.defaults, airplaneMode: true, wifiEnabled: false, connectedSsid: null, connectionType: "wifi" }); return {}; },
      isReady() { const net = OSLab.network.getSnapshot(); return !net.airplaneMode && net.wifiEnabled && Boolean(net.connectedSsid) && net.internetAvailable; },
      test() { return OSLab.network.browse("google.com").ok; },
    },
    {
      id: "ethernet-cable", order: 8, title: "Cabo de rede desconectado", category: "Rede", difficulty: "Fácil",
      description: "A conexão Ethernet informa que o cabo está desconectado.",
      goal: "Reconectar o cabo virtual e receber as configurações da rede.",
      initialSpeech: "Este computador usa cabo, mas a rede mostra 'Cabo desconectado'. Você pode verificar a ligação?",
      hint: tutorialHint(
        "Como reconectar o cabo Ethernet virtual",
        "Abra o painel de rede e conecte o cabo que aparece fora da porta.",
        [
          "Abra o menu Iniciar, clique em Configurações e escolha Rede e Internet na coluna esquerda.",
          "No topo da página, confirme que o bloco Ethernet está selecionado e mostra Cabo desconectado.",
          "Na seção Cabo Ethernet, observe o desenho do cabo fora da porta e clique em Conectar cabo.",
          "Espere o resumo da página mudar para Ethernet, Conectado à internet e Online.",
        ],
        "Volte ao robô e clique em Testar novamente para verificar o acesso à rede.",
      ),
      success: "O cabo foi conectado e o computador recebeu as configurações da rede.",
      cause: "O cabo Ethernet virtual estava fora da porta.", tool: "Painel Ethernet",
      setup() { OSLab.network.restoreSnapshot({ ...OSLab.network.defaults, connectionType: "ethernet", ethernetCableConnected: false, connectedSsid: null }); return {}; },
      isReady() { const net = OSLab.network.getSnapshot(); return net.connectionType === "ethernet" && net.ethernetCableConnected && net.internetAvailable; },
      test() { return OSLab.network.browse("google.com").ok; },
    },
    {
      id: "wrong-ip", order: 9, title: "Configuração IP incorreta", category: "Rede", difficulty: "Média",
      description: "O computador parece conectado, mas não consegue comunicar-se com o roteador.",
      goal: "Colocar o computador na mesma rede do gateway usando DHCP ou configuração manual.",
      initialSpeech: "A conexão está ativa, mas não consigo alcançar o roteador. Talvez alguma configuração do endereço esteja diferente.",
      hint: tutorialHint(
        "Como corrigir o endereço IP",
        "O computador recebeu 192.168.2.100, mas o roteador está em 192.168.1.1. Use o DHCP para colocá-los na mesma rede.",
        [
          "Abra Configurações pelo menu Iniciar e entre em Rede e Internet.",
          "Role até Atribuição de IP. Ela está como Manual e mostra um IP iniciado por 192.168.2, diferente do gateway 192.168.1.1.",
          "Clique em Ativar DHCP. O simulador preencherá automaticamente IP, máscara e gateway válidos.",
          "Confira se a atribuição passou a Automática (DHCP) e se o IP agora começa por 192.168.1.",
        ],
        "Clique em Testar novamente. O robô enviará um ping ao gateway 192.168.1.1 para confirmar a correção.",
      ),
      success: "O computador agora está na mesma rede do roteador e conseguiu se comunicar com ele.",
      cause: "O endereço 192.168.2.100 estava em outra sub-rede em relação ao gateway 192.168.1.1.", tool: "Propriedades IP e comando ping",
      setup() { OSLab.network.restoreSnapshot({ ...OSLab.network.defaults, dhcpEnabled: false, ip: "192.168.2.100", mask: "255.255.255.0", gateway: "192.168.1.1" }); return {}; },
      isReady() { const net = OSLab.network.getSnapshot(); return net.localNetworkAvailable; },
      test() { return OSLab.network.ping("192.168.1.1").ok; },
    },
    {
      id: "dns-failure", order: 10, title: "Problema de DNS", category: "Rede", difficulty: "Difícil",
      description: "Endereços numéricos respondem, mas sites não abrem quando o nome é digitado.",
      goal: "Identificar a falha de resolução de nomes e configurar um DNS válido.",
      initialSpeech: "Consigo acessar endereços numéricos, mas nenhum site abre pelo nome. A conexão parece existir.",
      hint: tutorialHint(
        "Como diagnosticar e corrigir o DNS",
        "A internet por endereço numérico funciona, mas o servidor DNS inválido não consegue traduzir nomes como google.com.",
        [
          "Abra o menu Iniciar, pesquise Terminal e abra o aplicativo.",
          "Digite ping 8.8.8.8 e pressione Enter. A resposta confirma que a conexão por número funciona.",
          "Digite ping google.com ou nslookup google.com e pressione Enter. A falha ao localizar o nome indica um problema de DNS.",
          "Abra Configurações > Rede e Internet e role até Atribuição de DNS.",
          "Clique em Usar automático. O servidor inválido será substituído por uma configuração válida do simulador.",
        ],
        "Volte ao robô e clique em Testar novamente; ele verificará o acesso por IP, por nome e pelo navegador.",
      ),
      success: "O computador voltou a localizar os sites pelos nomes. O problema estava na configuração de resolução de endereços.",
      cause: "O servidor DNS configurado era inválido, embora a internet por IP continuasse funcionando.", tool: "Terminal, propriedades DNS e navegador",
      setup() { OSLab.network.restoreSnapshot({ ...OSLab.network.defaults, dnsAutomatic: false, dns: "203.0.113.99" }); return {}; },
      isReady() { const net = OSLab.network.getSnapshot(); return net.internetByIpAvailable && net.dnsResolutionAvailable; },
      test() { return OSLab.network.ping("8.8.8.8").ok && OSLab.network.ping("google.com").ok && OSLab.network.browse("google.com").ok; },
    },
  ];

  const presentation = {
    "storage-full": "assets/learning/icons/hard_drive.svg",
    "frozen-program": "assets/learning/icons/dismiss_circle.svg",
    "high-cpu": "assets/learning/icons/top_speed.svg",
    "low-memory": "assets/learning/icons/data_histogram.svg",
    "slow-startup": "assets/learning/icons/timer.svg",
    "wifi-disabled": "assets/learning/icons/wifi_1.svg",
    "airplane-mode": "assets/learning/icons/airplane.svg",
    "ethernet-cable": "assets/learning/icons/plug_connected.svg",
    "wrong-ip": "assets/learning/icons/globe_error.svg",
    "dns-failure": "assets/learning/icons/globe_search.svg",
  };

  catalog.forEach((exercise) => { exercise.icon = presentation[exercise.id]; Object.freeze(exercise); });
  OSLab.exerciseCatalog = Object.freeze(catalog);
})(window);
