(function defineInstallMissionCatalog(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const icon = (name) => `assets/learning/icons/${name}.svg`;
  const hint = (title, intro, steps, check, visualTarget = null, visualLabel = null) => ({ title, intro, steps, check, visualTarget, visualLabel });

  const catalog = [
    {
      id: "install-browser", order: 1, title: "Conhecendo o navegador", category: "Navegador", difficulty: "Fácil", icon: icon("globe_search"),
      description: "Abra o navegador do OSLAB pelo Menu Iniciar ou pela Área de Trabalho.", goal: "Reconhecer o navegador como ponto de partida para localizar programas.", instruction: "Abra o aplicativo Google do OSLAB.",
      objectives: [{ id: "browser-opened", label: "Abrir o navegador do OSLAB" }],
      hint: hint("Onde fica o navegador?", "Procure um atalho conhecido antes de explorar outras áreas.", ["Abra o Menu Iniciar ou observe os ícones da Área de Trabalho.", "Localize o ícone colorido com o nome Google.", "Clique no atalho para abrir o aplicativo."], "A janela deve mostrar uma barra de endereço e a página inicial de pesquisa.", "browser-shortcut", "Atalho do Google"),
      success: "Você abriu o navegador simulado e identificou os controles principais.",
    },
    {
      id: "install-search-appjavafx", order: 2, title: "Pesquisando um programa", category: "Pesquisa", difficulty: "Fácil", icon: icon("globe_search"),
      description: "Use a página inicial para pesquisar AppJavaFX.", goal: "Praticar uma pesquisa objetiva por nome de programa.", instruction: "Digite AppJavaFX na barra de pesquisa e pressione Enter.",
      objectives: [{ id: "search-appjavafx", label: "Pesquisar por AppJavaFX" }],
      hint: hint("Use o campo central", "A pesquisa acontece dentro da página clara, não em um site externo.", ["Clique na grande barra de pesquisa no centro da página.", "Digite AppJavaFX.", "Pressione Enter ou clique em Pesquisar."], "Os resultados devem mencionar AppJavaFX para Windows.", "search-box", "Barra de pesquisa"),
      success: "Você realizou uma pesquisa simulada e recebeu resultados locais coerentes.",
    },
    {
      id: "install-open-site", order: 3, title: "Escolhendo o site", category: "Pesquisa", difficulty: "Fácil", icon: icon("globe_search"),
      description: "Analise os resultados e abra o primeiro site do AppJavaFX.", goal: "Distinguir um resultado relevante pelo título, endereço e descrição.", instruction: "Abra o primeiro resultado da pesquisa.",
      objectives: [{ id: "site-appjavafx", label: "Abrir o site oficial fictício do AppJavaFX" }],
      hint: hint("Observe o primeiro resultado", "Compare o nome procurado com o título exibido.", ["Leia o endereço e o título do primeiro item.", "Confirme que ele menciona AppJavaFX e Windows.", "Clique no título azul desse resultado."], "A página aberta deve ter o cabeçalho AppJavaFX.", "first-result", "Primeiro resultado"),
      success: "Você escolheu o resultado correspondente ao programa pesquisado.",
    },
    {
      id: "install-find-download", order: 4, title: "Encontrando o download", category: "Download", difficulty: "Fácil", icon: icon("arrow_right"),
      description: "Explore a página do AppJavaFX e encontre a área de download.", goal: "Localizar uma ação de download dentro de um site realista.", instruction: "Inicie o download de AppJavaFX-Setup.exe.",
      objectives: [{ id: "download-started", label: "Iniciar o download do AppJavaFX" }],
      hint: hint("Explore a página", "O botão principal está na seção de download da página.", ["Use o menu Download no cabeçalho ou role a página.", "Procure a seção Baixe para Windows.", "Clique em Baixar AppJavaFX."], "A área de downloads do navegador deve aparecer com o arquivo .exe.", "download-button", "Botão Baixar AppJavaFX"),
      success: "Você encontrou o download sem sair do ambiente simulado.",
    },
    {
      id: "install-wait-download", order: 5, title: "Acompanhando o download", category: "Download", difficulty: "Fácil", icon: icon("timer"),
      description: "Acompanhe os 60 segundos de progresso até o arquivo ficar pronto.", goal: "Reconhecer o estado de um download e aguardar sua conclusão.", instruction: "Espere AppJavaFX-Setup.exe chegar a 100%.",
      objectives: [{ id: "download-completed", label: "Aguardar a conclusão do download de 60 segundos" }],
      hint: hint("Observe o progresso", "O navegador mantém uma área própria para os arquivos baixados.", ["Abra o painel pelo botão Downloads na barra superior.", "Observe a porcentagem e os megabytes transferidos.", "Aguarde até aparecer Download concluído."], "O arquivo ficará clicável somente quando atingir 100%.", "downloads-panel", "Área de downloads"),
      success: "Você acompanhou o download completo sem baixar um arquivo real.",
    },
    {
      id: "install-run-installer", order: 6, title: "Executando o instalador", category: "Instalação", difficulty: "Fácil", icon: icon("play"),
      description: "Abra o arquivo AppJavaFX-Setup.exe concluído.", goal: "Iniciar um assistente tradicional a partir da área de downloads.", instruction: "Clique no arquivo baixado para abrir o instalador.",
      objectives: [{ id: "installer-opened", label: "Abrir AppJavaFX-Setup.exe" }],
      hint: hint("O arquivo já está pronto", "Downloads concluídos podem ser abertos pelo próprio navegador.", ["Abra o painel Downloads.", "Localize AppJavaFX-Setup.exe com o status concluído.", "Clique no nome ou no botão Abrir arquivo."], "Uma nova janela de assistente deve aparecer.", "download-file", "Arquivo concluído"),
      success: "Você executou um instalador inteiramente simulado.",
    },
    {
      id: "install-appjavafx", order: 7, title: "Instalando o programa", category: "Instalação", difficulty: "Média", icon: icon("window_wrench"),
      description: "Conclua o assistente e crie um atalho na Área de Trabalho.", goal: "Entender as etapas, opções e confirmação de uma instalação .exe.", instruction: "Avance, marque Criar atalho na Área de Trabalho, instale e conclua.",
      objectives: [{ id: "shortcut-selected", label: "Marcar a criação do atalho" }, { id: "app-installed", label: "Concluir a instalação do AppJavaFX" }],
      hint: hint("Revise as opções adicionais", "A escolha do atalho muda de verdade a Área de Trabalho simulada.", ["Avance até Opções adicionais.", "Marque Criar atalho na Área de Trabalho.", "Continue até Instalar e aguarde a barra terminar.", "Clique em Concluir."], "AppJavaFX deve aparecer no Menu Iniciar e também na Área de Trabalho.", "desktop-checkbox", "Caixa Criar atalho"),
      success: "Você instalou o AppJavaFX e decidiu onde seu atalho seria criado.",
    },
    {
      id: "install-open-app", order: 8, title: "Abrindo o aplicativo", category: "Aplicativos", difficulty: "Fácil", icon: icon("apps"),
      description: "Abra o AppJavaFX instalado pela Área de Trabalho ou pelo Menu Iniciar.", goal: "Confirmar que a instalação tornou o programa disponível no sistema.", instruction: "Abra o AppJavaFX por um dos atalhos criados.",
      objectives: [{ id: "app-opened", label: "Abrir a janela do AppJavaFX" }],
      hint: hint("Use um dos atalhos", "O programa está disponível em mais de um lugar.", ["Procure AppJavaFX na Área de Trabalho.", "Se preferir, abra o Menu Iniciar e localize o aplicativo.", "Abra o programa e espere sua janela aparecer."], "A janela deve mostrar o painel inicial do AppJavaFX.", "app-shortcut", "Atalho do AppJavaFX"),
      success: "Você confirmou que o programa instalado pode ser executado.",
    },
    {
      id: "install-find-office", order: 9, title: "Encontrando o Pacote Office", category: "Pesquisa", difficulty: "Média", icon: icon("globe_search"),
      description: "Volte ao navegador, pesquise pacote office e abra o primeiro resultado.", goal: "Repetir com autonomia o caminho entre pesquisa e site de um programa.", instruction: "Pesquise pacote office e entre no primeiro site exibido.",
      objectives: [{ id: "search-office", label: "Pesquisar pacote office" }, { id: "site-office", label: "Abrir o site do pacote" }],
      hint: hint("Repita o percurso", "Use a página inicial ou a barra de endereço para uma nova pesquisa.", ["Abra o Google do OSLAB.", "Pesquise pacote office.", "No resultado, confira os aplicativos Word, Excel e Apresentações.", "Abra o primeiro resultado."], "O site deve exibir os três aplicativos do pacote.", "search-office", "Pesquisa pacote office"),
      success: "Você encontrou o pacote de produtividade pela pesquisa simulada.",
    },
    {
      id: "install-office", order: 10, title: "Instalando o Pacote Office", category: "Instalação", difficulty: "Desafio", icon: icon("window_wrench"),
      description: "Baixe OfficeSetup.exe, abra o instalador e instale os três aplicativos.", goal: "Completar um fluxo de instalação em pacote.", instruction: "Baixe, aguarde 60 segundos, execute e instale Word, Excel e Apresentações Slides.",
      objectives: [{ id: "office-download", label: "Iniciar OfficeSetup.exe" }, { id: "office-completed", label: "Aguardar o download" }, { id: "office-installer", label: "Abrir o instalador" }, { id: "office-installed", label: "Instalar os três aplicativos" }],
      hint: hint("Instale o pacote completo", "O mesmo assistente mostra quais componentes serão adicionados.", ["Na seção de download do site, clique em Baixar pacote.", "Aguarde OfficeSetup.exe chegar a 100%.", "Abra o arquivo no painel Downloads.", "Avance pelo assistente e clique em Instalar."], "O Menu Iniciar deve ganhar Word, Excel e Apresentações Slides.", "office-download", "Botão Baixar pacote"),
      success: "Você instalou três aplicativos com um único instalador.",
    },
    {
      id: "install-test-office", order: 11, title: "Testando os aplicativos", category: "Aplicativos", difficulty: "Média", icon: icon("apps"),
      description: "Abra Word, Excel e Apresentações Slides pelo menos uma vez.", goal: "Verificar visualmente que todos os componentes do pacote funcionam.", instruction: "Abra os três programas instalados; a ordem é livre.",
      objectives: [{ id: "word-opened", label: "Abrir Word" }, { id: "excel-opened", label: "Abrir Excel" }, { id: "slides-opened", label: "Abrir Apresentações Slides" }],
      hint: hint("Confira os três aplicativos", "Cada programa tem uma interface visual diferente.", ["Abra o Menu Iniciar.", "Localize Word, Excel e Apresentações Slides.", "Abra cada um pelo menos uma vez.", "Você pode fechar uma janela antes de abrir a próxima."], "Os três itens da missão ficarão marcados somente após suas janelas abrirem.", "office-shortcuts", "Aplicativos no Menu Iniciar"),
      success: "Você verificou as interfaces de documentos, planilhas e apresentações.",
    },
    {
      id: "install-uninstall", order: 12, title: "Desinstalando um programa", category: "Painel de Controle", difficulty: "Desafio", icon: icon("dismiss_circle"),
      description: "Use Programas e Recursos para remover completamente o AppJavaFX.", goal: "Desinstalar um programa e conferir a remoção de seus atalhos.", instruction: "Abra Painel de Controle → Programas → Desinstalar um programa, selecione AppJavaFX e confirme.",
      objectives: [{ id: "control-panel", label: "Abrir Programas e Recursos" }, { id: "selected", label: "Selecionar AppJavaFX" }, { id: "uninstalled", label: "Desinstalar e remover todos os atalhos" }],
      hint: hint("Use o Painel de Controle clássico", "A remoção fica na categoria Programas.", ["Abra o Painel de Controle pelo Menu Iniciar ou Área de Trabalho.", "Clique em Programas e depois em Desinstalar um programa.", "Selecione AppJavaFX na tabela.", "Clique em Desinstalar e confirme."], "AppJavaFX deve desaparecer da lista, do Menu Iniciar e da Área de Trabalho.", "uninstall-button", "Botão Desinstalar"),
      success: "Trilha concluída! Você aprendeu a pesquisar, baixar, instalar, executar e desinstalar programas no Windows.",
    },
  ];

  OSLab.installMissionCatalog = Object.freeze(catalog.map((mission) => Object.freeze({ ...mission })));
})(window);
