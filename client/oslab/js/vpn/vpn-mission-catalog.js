(function createVpnMissionCatalog(global) {
  "use strict";

  const icon = (name) => `assets/learning/icons/${name}.svg`;
  const hint = (title, intro, steps, check) => ({ title, intro, steps, check });
  global.OSLab = global.OSLab || {};
  global.OSLab.vpnMissionCatalog = [
    {
      id: "vpn-netflix", order: 1, title: "A série desaparecida", category: "Catálogo internacional", difficulty: "Fácil", icon: icon("globe_search"),
      description: "Encontre Supernatural na Netflix simulada e descubra por que o catálogo muda conforme a região detectada.",
      goal: "Fazer a Netflix identificar a conexão nos Estados Unidos e exibir Supernatural após uma atualização.",
      objectives: [
        { id: "netflix-br", label: "Abrir a Netflix, escolher um perfil e procurar Supernatural no Brasil" },
        { id: "vpn-us", label: "Alterar a localização aparente da conexão" },
        { id: "netflix-refresh", label: "Atualizar a Netflix e encontrar Supernatural" },
      ],
      hints: [
        hint("Observe a região", "O catálogo pode variar conforme a localização detectada pelo serviço.", ["Na Netflix, confira a região mostrada perto da busca.", "Pesquise Supernatural e observe a mensagem de indisponibilidade."], "A primeira tentativa deve registrar Brasil como região detectada."),
        hint("Pense no endereço público", "Sites normalmente estimam a região pelo endereço IP público aparente.", ["Abra Meu IP em outra aba mentalmente: qual país o site enxergaria?", "Procure no sistema uma ferramenta capaz de alterar esse IP aparente."], "Depois da mudança, a página antiga ainda precisa ser atualizada."),
        hint("Teste outra localização", "Use o aplicativo VPN para experimentar uma saída pelos Estados Unidos.", ["Abra VPN e selecione Estados Unidos.", "Aguarde o status Protegido.", "Volte à Netflix, clique em Atualizar e pesquise Supernatural novamente."], "A série deve aparecer com a região Estados Unidos."),
      ],
      success: "O serviço passou a enxergar o endereço IP do servidor VPN; seu computador não foi fisicamente para outro país.",
    },
    {
      id: "vpn-company", order: 2, title: "Acesso à rede da empresa", category: "Trabalho remoto", difficulty: "Médio", icon: icon("building"),
      description: "Consulte o chamado #1542 no portal interno da Empresa OS a partir de casa.",
      goal: "Usar a VPN corporativa correta, atualizar o portal e abrir o chamado solicitado.",
      objectives: [
        { id: "portal-denied", label: "Abrir portal.empresa.local e observar o bloqueio" },
        { id: "company-vpn", label: "Entrar na rede corporativa Empresa OS" },
        { id: "ticket-1542", label: "Atualizar o portal e abrir o chamado #1542" },
      ],
      hints: [
        hint("Internet pública ou rede interna?", "O aviso 403 informa qual origem de rede o portal aceita.", ["Leia a origem atual na tela de bloqueio.", "Uma localização comercial em outro país continua sendo Internet pública."], "O portal procura uma rede corporativa específica."),
        hint("VPNs têm finalidades diferentes", "Uma VPN comercial e uma VPN de acesso remoto corporativa não entregam o mesmo acesso.", ["Abra o aplicativo VPN.", "Compare Localizações disponíveis com VPNs corporativas."], "Procure a rede mencionada no nome do portal."),
        hint("Entre na Empresa OS", "Conecte-se à VPN corporativa Empresa OS — Matriz Maceió.", ["No aplicativo VPN, abra VPNs corporativas.", "Conecte Empresa OS — Matriz Maceió.", "Atualize portal.empresa.local e abra Chamados → #1542."], "O chamado deve aparecer como Em atendimento."),
      ],
      success: "A VPN de acesso remoto colocou a conexão na rede corporativa autorizada da Empresa OS.",
    },
    {
      id: "vpn-my-ip", order: 3, title: "Onde estou na Internet?", category: "IP público", difficulty: "Fácil", icon: icon("globe_error"),
      description: "Faça o site Meu IP identificar sua conexão como originada da Alemanha.",
      goal: "Alterar o IP público aparente e consolidar o que realmente mudou para o site.",
      objectives: [
        { id: "ip-br", label: "Consultar o IP aparente no Brasil" },
        { id: "ip-de", label: "Atualizar Meu IP com a região Alemanha" },
        { id: "ip-quiz", label: "Responder as duas perguntas de consolidação" },
      ],
      hints: [
        hint("Compare antes e depois", "Comece registrando o país e o IP que Meu IP mostra agora.", ["Acesse meuip.com.", "Observe país, endereço e tipo de conexão."], "Você precisará comparar esses dados depois."),
        hint("Altere a saída", "A missão pede que o site detecte Alemanha, não que o computador mude fisicamente.", ["Use a lista de localizações do aplicativo VPN.", "Depois da conexão, volte à página antiga."], "Lembre-se de atualizar a página para uma nova consulta."),
        hint("Conecte Alemanha", "Selecione Alemanha no aplicativo VPN e atualize meuip.com.", ["Aguarde Protegido — Alemanha.", "Clique em Atualizar no navegador.", "Responda Não e O endereço IP público aparente."], "As duas respostas corretas concluem a atividade."),
      ],
      success: "O site mudou a localização estimada porque passou a receber outro endereço IP público aparente.",
    },
    {
      id: "vpn-airport", order: 4, title: "Conexão no aeroporto", category: "Wi-Fi público", difficulty: "Médio", icon: icon("wifi_1"),
      description: "Use o portal da empresa com segurança enquanto está conectado a uma rede pública do aeroporto.",
      goal: "Entrar no Wi-Fi aberto, reconhecer o aviso e usar o túnel corporativo até a Empresa OS.",
      objectives: [
        { id: "airport-wifi", label: "Conectar-se a Aeroporto_Free_WiFi" },
        { id: "airport-denied", label: "Confirmar que o portal continua bloqueado sem a VPN correta" },
        { id: "airport-portal", label: "Usar a VPN Empresa OS e atualizar o portal" },
      ],
      hints: [
        hint("Identifique a rede disponível", "Redes sem cadeado exigem atenção extra, mesmo quando os sites modernos usam HTTPS.", ["Abra Configurações → Rede e Internet.", "Procure a rede do aeroporto e observe que ela é aberta."], "A notificação deve alertar que a rede é pública."),
        hint("Proteja o caminho até a empresa", "O portal interno exige mais do que simplesmente estar conectado ao Wi-Fi.", ["Tente abrir portal.empresa.local.", "Pense em qual conexão cria acesso até a rede da empresa."], "Uma VPN comercial comum não libera o portal."),
        hint("Use o túnel corporativo", "Conecte Aeroporto_Free_WiFi e depois a VPN Empresa OS.", ["Em Rede e Internet, conecte Aeroporto_Free_WiFi.", "No VPN, conecte Empresa OS — Matriz Maceió.", "Atualize portal.empresa.local."], "A VPN cria um túnel protegido até o servidor; HTTPS continua importante."),
      ],
      success: "Em uma rede não confiável, a VPN criou um túnel protegido até a empresa. HTTPS continua sendo importante.",
    },
    {
      id: "vpn-bank", order: 5, title: "Localização suspeita", category: "Análise de risco", difficulty: "Médio", icon: icon("lock_closed"),
      description: "Acesse o Banco OS depois que uma localização estrangeira causar um bloqueio preventivo.",
      goal: "Reconhecer quando a VPN atrapalha e voltar a uma localização habitual.",
      objectives: [
        { id: "bank-jp", label: "Conectar ao Japão e observar o bloqueio do Banco OS" },
        { id: "bank-home", label: "Voltar à localização habitual" },
        { id: "bank-access", label: "Atualizar o banco e obter acesso autorizado" },
      ],
      hints: [
        hint("Leia o motivo do bloqueio", "O Banco OS mostra qual sinal de risco foi detectado.", ["Acesse bancoos.com com a VPN Japão ativa.", "Observe a localização detectada na mensagem."], "O bloqueio não indica falha de senha."),
        hint("Nem toda VPN ajuda", "Serviços podem usar localização/IP como parte da análise de risco.", ["Pense na localização habitual desta conta fictícia.", "Você pode trocar de servidor ou encerrar a VPN."], "O banco precisa voltar a detectar Brasil."),
        hint("Retorne ao Brasil", "Desconecte a VPN ou conecte ao servidor Brasil.", ["Abra VPN e escolha Desconectar ou Brasil.", "Volte ao Banco OS.", "Clique em Atualizar."], "A tela deve mostrar Acesso autorizado — Brasil."),
      ],
      success: "Uma VPN estrangeira pode acionar verificações adicionais quando um serviço usa IP e localização na análise de risco.",
    },
    {
      id: "vpn-speed", order: 6, title: "Escolha o melhor servidor", category: "Latência", difficulty: "Médio", icon: icon("top_speed"),
      description: "Prepare uma videoconferência mantendo a VPN ligada e escolhendo a menor latência.",
      goal: "Testar servidores e entrar no OS Meet com ping abaixo de 60 ms.",
      objectives: [
        { id: "speed-high", label: "Medir uma conexão VPN com latência alta" },
        { id: "speed-low", label: "Encontrar um servidor VPN abaixo de 60 ms" },
        { id: "meet-green", label: "Entrar no OS Meet com conexão excelente" },
      ],
      hints: [
        hint("Meça antes de escolher", "A qualidade da chamada depende da latência observada, não apenas do nome do país.", ["Acesse speedtest.os.", "Execute o teste em mais de um servidor."], "Compare o valor Ping entre as tentativas."),
        hint("Caminhos maiores podem pesar", "Servidores mais distantes normalmente podem aumentar a latência, embora a rota também influencie.", ["Mantenha a VPN ligada.", "Procure uma opção com menor ping para esta simulação."], "A meta é ficar abaixo de 60 ms."),
        hint("Teste o servidor Brasil", "A simulação oferece menor latência pela saída VPN do Brasil.", ["Conecte a VPN Brasil.", "Atualize speedtest.os e execute o teste.", "Abra o OS Meet e entre na chamada."], "O indicador deve ficar verde e mostrar Conexão excelente."),
      ],
      success: "Servidores VPN mais distantes normalmente podem aumentar a latência porque os dados percorrem outro caminho; a distância não é o único fator.",
    },
    {
      id: "vpn-school", order: 7, title: "Área restrita da escola", category: "IP autorizado", difficulty: "Avançado", icon: icon("shield_checkmark"),
      description: "Acesse o Laboratório 02 no painel administrativo usando um endereço autorizado.",
      goal: "Diferenciar uma VPN qualquer de uma conexão cujo IP está na allowlist do servidor.",
      objectives: [
        { id: "school-denied", label: "Observar o 403 sem um IP autorizado" },
        { id: "school-vpn", label: "Usar a VPN Administração da Escola" },
        { id: "school-lab", label: "Atualizar e abrir Laboratórios → Laboratório 02" },
      ],
      hints: [
        hint("Qual IP o servidor aceita?", "O erro mostra o IP atual e informa que existe uma lista de autorização.", ["Acesse admin.escola.local.", "Leia o IP recusado e procure o critério de acesso."], "Uma VPN comercial continua usando um IP fora da lista."),
        hint("Procure uma conexão dedicada", "O servidor precisa reconhecer exatamente o endereço autorizado da administração.", ["Abra a seção VPNs corporativas.", "Compare Empresa OS e Administração da Escola."], "A conexão correta anuncia o IP 203.0.113.50."),
        hint("Use a VPN da escola", "Conecte Administração da Escola e atualize o painel.", ["No aplicativo VPN, conecte Administração da Escola.", "Atualize admin.escola.local.", "Abra Laboratórios e depois Laboratório 02."], "O acesso ocorre porque o IP está na allowlist, não apenas porque há uma VPN."),
      ],
      success: "O servidor liberou o acesso porque a conexão usou um IP presente na allowlist de endereços autorizados.",
    },
  ];
})(window);
