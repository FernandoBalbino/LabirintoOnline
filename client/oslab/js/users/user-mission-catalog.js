(function createUserMissionCatalog(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const icon = "assets/users-permissions/trail-icon.png";
  OSLab.userMissionCatalog = [
    {
      id: "users-1", order: 1, title: "Uma conta para cada pessoa", category: "Contas locais", difficulty: "Iniciante", icon,
      description: "Crie uma conta local sem usar e-mail ou serviços externos.",
      goal: "Adicionar um usuário padrão pelo fluxo completo de Contas do Windows 11.",
      instruction: "Abra Configurações → Contas → Outros usuários, escolha Adicionar conta e siga as opções para criar uma conta local com nome e senha fictícia.",
      objectives: [{ id: "opened-accounts", label: "Abrir Outros usuários" }, { id: "created", label: "Criar uma conta local" }, { id: "standard", label: "Confirmar o tipo Usuário padrão" }],
      hints: ["Comece pelo aplicativo Configurações.", "Em Contas, abra Outros usuários.", "Use Adicionar conta e escolha a opção sem conta Microsoft."],
      success: "A nova pessoa agora possui uma conta própria neste computador simulado.", tool: "settings",
    },
    {
      id: "users-2", order: 2, title: "Seu espaço, do seu jeito", category: "Perfis", difficulty: "Iniciante", icon,
      description: "Entre na nova conta e personalize o perfil sem alterar o espaço de outro usuário.",
      goal: "Comprovar que identidade, papel de parede e atalhos pertencem ao perfil conectado.",
      instruction: "Saia da sessão, entre com a conta criada, altere o nome exibido e escolha outro papel de parede em Personalização.",
      objectives: [{ id: "signed-in", label: "Entrar com a nova conta" }, { id: "profile", label: "Personalizar o nome do perfil" }, { id: "wallpaper", label: "Trocar o papel de parede" }],
      hints: ["Use o perfil no menu Iniciar para sair.", "Selecione a nova conta na tela de entrada.", "Abra Configurações → Personalização para mudar o fundo."],
      success: "O perfil manteve sua própria identidade e aparência.", tool: "settings",
    },
    {
      id: "users-3", order: 3, title: "Arquivos pessoais são privados", category: "Privacidade", difficulty: "Intermediário", icon,
      description: "Observe a separação entre as pastas pessoais de usuários diferentes.",
      goal: "Criar um documento no perfil atual e experimentar o bloqueio ao abrir a pasta privada de outra pessoa.",
      instruction: "Crie um arquivo em Documentos. Depois abra Este Computador → Usuários e tente acessar a pasta pessoal de outro usuário.",
      objectives: [{ id: "private-file", label: "Criar um arquivo pessoal" }, { id: "other-home", label: "Localizar outro perfil em C:\\Users" }, { id: "denied", label: "Receber o bloqueio de acesso coerente" }],
      hints: ["Use Novo dentro da pasta Documentos.", "As casas de usuários aparecem em Este Computador.", "Tente abrir o perfil que não está conectado."],
      success: "Você comprovou que cada perfil mantém arquivos privados separados.", tool: "explorer",
    },
    {
      id: "users-4", order: 4, title: "Para mim ou para todos?", category: "Aplicativos", difficulty: "Intermediário", icon,
      description: "Compare programas instalados somente no perfil com programas disponíveis no computador inteiro.",
      goal: "Instalar um aplicativo no perfil padrão e outro para todos os usuários.",
      instruction: "No laboratório de instalação, conclua uma instalação para o usuário atual. Depois escolha instalar para todos e autorize a elevação administrativa.",
      objectives: [{ id: "user-install", label: "Instalar somente para este usuário" }, { id: "all-install", label: "Instalar para todos os usuários" }, { id: "app-data", label: "Salvar uma preferência individual no aplicativo" }],
      hints: ["Contas padrão podem instalar no próprio perfil.", "A opção para todos altera o computador e pede autorização.", "Abra o aplicativo compartilhado e salve uma preferência."],
      success: "Você diferenciou disponibilidade do programa e dados individuais de uso.", tool: "google",
    },
    {
      id: "users-5", order: 5, title: "Quando o Windows pede permissão", category: "Administração", difficulty: "Intermediário", icon,
      description: "Use a elevação de privilégios sem transformar toda a sessão em administradora.",
      goal: "Cancelar uma solicitação UAC, tentar novamente e autorizar apenas a ação necessária.",
      instruction: "Em Outros usuários, tente alterar um tipo de conta. Cancele a primeira solicitação e repita informando as credenciais fictícias de um administrador.",
      objectives: [{ id: "uac-denied", label: "Cancelar uma solicitação de elevação" }, { id: "uac-granted", label: "Autorizar uma única ação" }, { id: "role-changed", label: "Alterar o tipo de uma conta" }],
      hints: ["A ação fica em Contas → Outros usuários.", "Usuários padrão precisam escolher um administrador.", "A autorização vale somente para a alteração pendente."],
      success: "A operação foi elevada de forma pontual e a conta continuou protegida.", tool: "settings",
    },
    {
      id: "users-6", order: 6, title: "Compartilhar com controle", category: "Permissões", difficulty: "Avançado", icon,
      description: "Use a pasta Pública e compare permissão de leitura com permissão de modificação.",
      goal: "Criar um documento público e mudar a permissão para que outros usuários possam modificá-lo.",
      instruction: "No Explorador, abra Pública, crie um documento e use Propriedades → Segurança para alternar entre Leitura e Modificação.",
      objectives: [{ id: "public-file", label: "Criar um documento na pasta Pública" }, { id: "read", label: "Aplicar permissão de leitura" }, { id: "modify", label: "Aplicar permissão de modificação" }],
      hints: ["A pasta Pública aparece na barra lateral.", "Selecione o arquivo e abra Propriedades.", "Na aba Segurança, altere o acesso de Todos."],
      success: "O documento foi compartilhado com permissões explícitas e compreensíveis.", tool: "explorer",
    },
    {
      id: "users-7", order: 7, title: "Prepare o laboratório da escola", category: "Desafio final", difficulty: "Avançado", icon,
      description: "Monte uma configuração realista para um computador usado por alunos e suporte técnico.",
      goal: "Deixar um administrador de suporte, dois alunos padrão, um aplicativo compartilhado, perfis personalizados e material público modificável.",
      instruction: "Organize o computador livremente. A verificação automática observará contas, papéis, aplicativos, personalização, arquivos privados e a pasta Pública.",
      objectives: [{ id: "accounts-ready", label: "Ter um administrador e dois usuários padrão" }, { id: "profiles-ready", label: "Manter arquivos e personalização separados" }, { id: "lab-ready", label: "Disponibilizar aplicativo e documento compartilhados" }],
      hints: ["Confira os tipos em Outros usuários.", "Entre em mais de um perfil para conferir a separação.", "Use instalação para todos e a pasta Pública com Modificação."],
      success: "O laboratório escolar está configurado com separação, compartilhamento e privilégios adequados.", tool: "settings",
    },
  ];
  const guides = [
    [
      ["opened-accounts", "Abra Configurações → Contas → Outros usuários."],
      ["created", "Clique em Adicionar conta → Não tenho as informações de entrada desta pessoa → Adicionar um usuário sem uma conta Microsoft."],
      ["created", "Informe um nome fictício e uma senha de pelo menos quatro caracteres. Confirme a senha e clique em Avançar. Guarde esses dados para a próxima missão."],
      ["standard", "Confira na lista que a conta criada aparece como Usuário padrão."],
    ],
    [
      ["signed-in", "Abra Iniciar, clique no perfil e escolha Sair. Na tela de entrada, selecione a conta criada na missão 1 e digite a senha dela."],
      ["profile", "Abra Configurações → Contas → Suas informações. Altere o Nome exibido e clique em Salvar."],
      ["wallpaper", "Abra Personalização → Tela de fundo e escolha uma imagem diferente. Essa aparência pertence apenas ao perfil conectado."],
    ],
    [
      ["private-file", "No Explorador de Arquivos, abra Documentos. Clique em Documento para criar um arquivo de texto e confirme o nome com Enter."],
      ["other-home", "Abra Este Computador. Na seção Usuários, localize a pasta de outra pessoa."],
      ["denied", "Clique no perfil de outra pessoa e observe Acesso negado. Seu documento permanece no seu próprio perfil."],
    ],
    [
      ["user-install", "No Google, pesquise AppJavaFX e abra o site OSLAB Software. Baixe AppJavaFX-Setup.exe, aguarde e abra o arquivo em Downloads."],
      ["user-install", "Avance no instalador, selecione Somente para mim e conclua a instalação."],
      ["all-install", "Volte ao Google, pesquise pacote Office e abra o site Office Estudos. Clique em Baixar pacote e abra OfficeSetup.exe em Downloads. No instalador, selecione Para todos os usuários e autorize com as credenciais fictícias de um administrador."],
      ["app-data", "Abra Word pelo menu Iniciar, escreva uma preferência ou um texto e clique em Salvar. Esse dado é individual, mesmo com o aplicativo compartilhado."],
    ],
    [
      ["uac-denied", "Continue conectado como Usuário padrão. Em Contas → Outros usuários, crie uma segunda conta local, se necessário."],
      ["uac-denied", "Expanda essa outra conta, selecione Administrador em Tipo de conta e clique em Alterar tipo de conta. Na solicitação UAC, clique em Não."],
      ["uac-granted", "Repita a alteração da mesma conta. Selecione o administrador Aluno, informe a senha fictícia dele e clique em Sim."],
      ["role-changed", "Confira que a outra conta mudou para Administrador. Seu próprio perfil deve continuar como Usuário padrão."],
    ],
    [
      ["public-file", "No Explorador de Arquivos, abra Pública e clique em Documento para criar um arquivo de texto. Confirme o nome com Enter."],
      ["read", "Selecione esse documento e clique em Propriedades. Em Segurança, escolha Leitura e clique em Aplicar."],
      ["modify", "Abra novamente Propriedades do mesmo documento. Escolha Modificação e clique em Aplicar."],
    ],
    [
      ["accounts-ready", "Em Contas → Outros usuários, mantenha um administrador e dois alunos como Usuário padrão. Se precisar, crie uma terceira conta ou ajuste o tipo da conta usada na missão 5."],
      ["profiles-ready", "Entre nos dois perfis de alunos, escolha papéis de parede diferentes e crie um documento pessoal em Documentos de cada um."],
      ["lab-ready", "Confira que o pacote Office está disponível para todos os usuários e que existe um documento na pasta Pública com permissão Modificação."],
    ],
  ];
  const missionIcons = ["people", "person", "lock_closed", "apps", "shield_checkmark", "folder_arrow_right", "building"];
  OSLab.userMissionCatalog.forEach((mission, index) => {
    mission.steps = guides[index].map(([objectiveId, text]) => ({ objectiveId, text }));
    mission.icon = `assets/learning/icons/${missionIcons[index]}.svg`;
    mission.instruction = guides[index].map(([, text]) => text).join(" ");
  });
})(window);
