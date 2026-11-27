// Banco de desafios. As soluções ficam somente no servidor.
// Modelos: sort (classificar), choice (escolher), order (ordenar), slots (montar na placa-mãe)
// e oslab (tarefa prática no Windows do OSLab, às vezes com uma pergunta no final).
const item = (file) => `./assets/items/${file}`;
const fileIcon = (file) => `./assets/windows-file-organizer/icons/${file}`;
const opt = (id, label, icon) => ({ id, label, icon });

const FOLDERS = [
  { id: "documentos", label: "Documentos", icon: fileIcon("folder.svg") },
  { id: "imagens", label: "Imagens", icon: fileIcon("folder.svg") },
  { id: "videos", label: "Vídeos", icon: fileIcon("folder.svg") },
  { id: "musicas", label: "Músicas", icon: fileIcon("folder.svg") },
];
const IO_TARGETS = [
  { id: "entrada", label: "Entrada", hint: "envia dados para o computador" },
  { id: "saida", label: "Saída", hint: "mostra ou entrega o resultado" },
  { id: "hibrido", label: "Entrada e saída", hint: "faz as duas coisas" },
];
const HW_SW_TARGETS = [
  { id: "hardware", label: "Hardware", hint: "parte física, dá para tocar" },
  { id: "software", label: "Software", hint: "programa, sistema ou aplicativo" },
];

const P = {
  ssd: opt("ssd", "SSD", item("ssd.jpg")),
  hd: opt("hd", "HD (disco rígido)", item("disco-rigido.jpg")),
  ram: opt("ram", "Memória RAM", item("memoria-ram.jpg")),
  cpu: opt("processador", "Processador", item("processador.jpg")),
  placaMae: opt("placa-mae", "Placa-mãe", item("placa-mae.jpg")),
  gpu: opt("placa-video", "Placa de vídeo", item("placa-video.jpg")),
  fonte: opt("fonte", "Fonte de alimentação", item("fonte-alimentacao.jpg")),
  cooler: opt("cooler", "Cooler", item("cooler.jpg")),
  teclado: opt("teclado", "Teclado", item("teclado.jpg")),
  mouse: opt("mouse", "Mouse", item("mouse.jpg")),
  monitor: opt("monitor", "Monitor", item("monitor.jpg")),
  headset: opt("headset", "Headset", item("headset.jpg")),
  microfone: opt("microfone", "Microfone", item("microfone.jpg")),
  impressora: opt("impressora", "Impressora", item("impressora.jpg")),
  scanner: opt("scanner", "Scanner", item("scanner.jpg")),
  webcam: opt("webcam", "Webcam", item("webcam.jpg")),
  caixaSom: opt("caixa-som", "Caixa de som", item("caixa-som.jpg")),
  touch: opt("touchscreen", "Tela sensível ao toque", item("touchscreen.jpg")),
  projetor: opt("projetor", "Projetor", item("projetor.jpg")),
  roteador: opt("roteador", "Roteador Wi-Fi", item("roteador.jpg")),
  modem: opt("modem", "Modem", item("modem.jpg")),
  pendrive: opt("pen-drive", "Pen drive", item("pen-drive.jpg")),
  hdExterno: opt("hd-externo", "HD externo", item("hd-externo.jpg")),
  biometria: opt("leitor-biometrico", "Leitor biométrico", item("leitor-biometrico.jpg")),
  barras: opt("leitor-codigo-barras", "Leitor de código de barras", item("leitor-codigo-barras.jpg")),
  impressora3d: opt("impressora-3d", "Impressora 3D", item("impressora-3d.jpg")),
  multifuncional: opt("multifuncional", "Multifuncional", item("multifuncional.jpg")),
  mesa: opt("mesa-digitalizadora", "Mesa digitalizadora", item("mesa-digitalizadora.jpg")),
  fone: opt("fone", "Fone de ouvido", item("fone-ouvido.jpg")),
  dvd: opt("gravador-dvd", "Gravador de DVD", item("gravador-dvd.jpg")),
  windows: opt("windows", "Windows", item("windows.svg")),
  chrome: opt("chrome", "Google Chrome", item("google-chrome.svg")),
  firefox: opt("firefox", "Mozilla Firefox", item("mozilla-firefox.svg")),
  writer: opt("writer", "Editor de texto", item("libreoffice-writer.svg")),
  gimp: opt("gimp", "Editor de imagens", item("gimp.svg")),
  vlc: opt("vlc", "VLC", item("vlc.svg")),
  ubuntu: opt("ubuntu", "Ubuntu", item("ubuntu.svg")),
  zip: opt("compactador", "7-Zip", item("seven-zip.svg")),
};

// ---------------- Clássicos preservados ----------------
const fileItem = (id, label, icon) => ({ id, label, icon: fileIcon(icon) });
const classic = [];
for (const [id, label, icon, folder] of [
  ["arquivo-curriculo", "curriculo.pdf", "pdf.svg", "documentos"],
  ["arquivo-trabalho", "trabalho.docx", "word.svg", "documentos"],
  ["arquivo-planilha", "planilha.xlsx", "excel.svg", "documentos"],
  ["arquivo-foto", "foto.jpg", "photo-jpg.svg", "imagens"],
  ["arquivo-ferias", "ferias.png", "photo-png.svg", "imagens"],
  ["arquivo-musica", "musica.mp3", "music.svg", "musicas"],
]) {
  classic.push({ id, theme: "Arquivos e pastas", template: "sort", instruction: `Em qual pasta o arquivo ${label} deve ficar?`, payload: { items: [fileItem(id, label, icon)], targets: FOLDERS }, solution: { [id]: folder } });
}
for (const [id, list] of [
  ["arquivos-mistos-1", [["relatorio-pdf", "relatorio.pdf", "pdf.svg", "documentos"], ["passeio-jpg", "passeio.jpg", "photo-jpg.svg", "imagens"], ["podcast-mp3", "podcast.mp3", "music.svg", "musicas"], ["aula-mp4", "aula.mp4", "video.svg", "videos"]]],
  ["arquivos-mistos-2", [["atividade-docx", "atividade.docx", "word.svg", "documentos"], ["grafico-png", "grafico.png", "photo-png.svg", "imagens"], ["entrevista-mp3", "entrevista.mp3", "music.svg", "musicas"], ["experimento-mp4", "experimento.mp4", "video.svg", "videos"], ["notas-xlsx", "notas.xlsx", "excel.svg", "documentos"]]],
  ["arquivos-mistos-3", [["leitura-txt", "leitura.txt", "text.svg", "documentos"], ["cartaz-jpg", "cartaz.jpg", "photo-jpg.svg", "imagens"], ["ensaio-mp3", "ensaio.mp3", "music.svg", "musicas"], ["projeto-pdf", "projeto.pdf", "pdf.svg", "documentos"], ["teatro-mp4", "teatro.mp4", "video.svg", "videos"], ["logo-png", "logo.png", "photo-png.svg", "imagens"]]],
]) {
  classic.push({ id, theme: "Arquivos e pastas", template: "sort", instruction: "Coloque todos os arquivos nas pastas apropriadas.", payload: { items: list.map(([fid, label, icon]) => fileItem(fid, label, icon)), targets: FOLDERS }, solution: Object.fromEntries(list.map(([fid, , , folder]) => [fid, folder])) });
}
for (const [id, items] of [
  ["hs-1", [[P.teclado, "hardware"], [P.windows, "software"], [P.mouse, "hardware"], [P.chrome, "software"]]],
  ["hs-2", [[P.monitor, "hardware"], [P.writer, "software"], [P.ssd, "hardware"], [P.gimp, "software"]]],
  ["hs-3", [[P.ram, "hardware"], [P.firefox, "software"], [P.webcam, "hardware"], [P.vlc, "software"]]],
  ["hs-4", [[P.impressora, "hardware"], [P.ubuntu, "software"], [P.cpu, "hardware"], [P.zip, "software"]]],
]) {
  classic.push({ id, theme: "Hardware e software", template: "sort", instruction: "Separe cada item entre hardware e software.", payload: { items: items.map(([o]) => o), targets: HW_SW_TARGETS }, solution: Object.fromEntries(items.map(([o, kind]) => [o.id, kind])) });
}
const SOFTWARE = [P.writer, opt("browser", "Navegador", item("google-chrome.svg")), opt("slides", "Apresentações", fileIcon("powerpoint.svg")), opt("sheets", "Planilhas", fileIcon("excel.svg")), opt("paint", "Editor de imagens", item("gimp.svg"))];
for (const [id, instruction, solution] of [
  ["software-texto", "Você precisa escrever um trabalho escolar. Qual programa deve abrir?", "writer"],
  ["software-internet", "Você precisa navegar na Internet. Qual programa deve abrir?", "browser"],
  ["software-apresentacao", "Você precisa criar uma apresentação para a turma. Qual programa deve abrir?", "slides"],
  ["software-planilha", "Você precisa montar uma tabela com cálculos. Qual programa deve abrir?", "sheets"],
  ["software-foto", "Você precisa recortar e clarear uma foto. Qual programa deve abrir?", "paint"],
]) classic.push({ id, theme: "Software", template: "choice", instruction, payload: { options: SOFTWARE }, solution });
for (const [id, items] of [
  ["perifericos-classificar-1", [[P.teclado, "entrada"], [P.monitor, "saida"], [P.headset, "hibrido"], [P.microfone, "entrada"]]],
  ["perifericos-classificar-2", [[P.mouse, "entrada"], [P.impressora, "saida"], [P.touch, "hibrido"], [P.caixaSom, "saida"]]],
]) classic.push({ id, theme: "Periféricos", template: "sort", instruction: "Coloque cada equipamento na categoria correta.", payload: { items: items.map(([o]) => o), targets: IO_TARGETS }, solution: Object.fromEntries(items.map(([o, kind]) => [o.id, kind])) });
classic.push(
  { id: "periferico-digitar", theme: "Periféricos", template: "choice", instruction: "Qual equipamento você utilizaria para digitar um texto?", payload: { options: [P.teclado, P.mouse, P.monitor, P.microfone] }, solution: "teclado" },
  { id: "periferico-imprimir", theme: "Periféricos", template: "choice", instruction: "Qual equipamento coloca um trabalho no papel?", payload: { options: [P.webcam, P.impressora, P.scanner, P.monitor] }, solution: "impressora" },
  { id: "hardware-armazenamento", theme: "Hardware", template: "choice", instruction: "Qual componente guarda os arquivos mesmo com o computador desligado?", payload: { options: [P.ssd, P.ram, P.cpu, P.placaMae] }, solution: "ssd" },
  { id: "hardware-processamento", theme: "Hardware", template: "choice", instruction: "Qual componente é responsável pelo processamento das informações?", payload: { options: [P.ssd, P.ram, P.cpu, P.placaMae, P.teclado] }, solution: "processador" },
  { id: "hardware-memoria", theme: "Hardware", template: "choice", instruction: "Encontre a memória RAM.", payload: { options: [P.ssd, P.ram, P.cpu, P.placaMae] }, solution: "ram" },
  { id: "hardware-placa-mae", theme: "Hardware", template: "choice", instruction: "Qual peça conecta os principais componentes do computador?", payload: { options: [P.ssd, P.ram, P.cpu, P.placaMae] }, solution: "placa-mae" },
);

// ---------------- Hardware novo ----------------
const text = (id, label) => ({ id, label });
const hardware = [
  { id: "hw-gpu", instruction: "Qual peça cuida das imagens dos jogos e dos vídeos (GPU)?", payload: { options: [P.gpu, P.cpu, P.ram, P.fonte] }, solution: "placa-video" },
  { id: "hw-fonte", instruction: "Qual peça transforma a energia da tomada para alimentar o computador?", payload: { options: [P.cooler, P.fonte, P.ssd, P.placaMae] }, solution: "fonte" },
  { id: "hw-cooler", instruction: "Qual peça resfria o processador para ele não esquentar demais?", payload: { options: [P.ram, P.cooler, P.gpu, P.hd] }, solution: "cooler" },
  { id: "hw-roteador", instruction: "Qual equipamento espalha o sinal de Wi-Fi para os aparelhos da casa?", payload: { options: [P.roteador, P.impressora, P.scanner, P.webcam] }, solution: "roteador" },
  { id: "hw-pendrive", instruction: "Qual armazenamento é pequeno, portátil e cabe no bolso?", payload: { options: [P.placaMae, P.pendrive, P.fonte, P.cooler] }, solution: "pen-drive" },
  { id: "hw-biometria", instruction: "Qual equipamento lê a sua digital para liberar o acesso?", payload: { options: [P.barras, P.biometria, P.mesa, P.webcam] }, solution: "leitor-biometrico" },
  { id: "hw-barras", instruction: "No caixa do mercado, qual equipamento lê o código dos produtos?", payload: { options: [P.barras, P.biometria, P.projetor, P.microfone] }, solution: "leitor-codigo-barras" },
  { id: "hw-3d", instruction: "Qual equipamento cria objetos de plástico, camada por camada?", payload: { options: [P.multifuncional, P.impressora3d, P.scanner, P.dvd] }, solution: "impressora-3d" },
  { id: "hw-projetor", instruction: "Qual equipamento mostra a aula bem grande na parede?", payload: { options: [P.monitor, P.projetor, P.webcam, P.caixaSom] }, solution: "projetor" },
  { id: "hw-mesa", instruction: "Qual equipamento é usado para desenhar no computador com uma caneta?", payload: { options: [P.mesa, P.teclado, P.touch, P.scanner] }, solution: "mesa-digitalizadora" },
  { id: "hw-hibrido", instruction: "Qual destes é um dispositivo HÍBRIDO (entrada e saída ao mesmo tempo)?", payload: { options: [P.multifuncional, P.mouse, P.caixaSom, P.projetor] }, solution: "multifuncional" },
  { id: "hw-ssd-rapido", instruction: "Qual armazenamento deixa o computador ligar e abrir programas mais rápido?", payload: { options: [P.ssd, P.hd, P.dvd, P.pendrive] }, solution: "ssd" },
  { id: "hw-unidade-maior", instruction: "Qual destas unidades representa a MAIOR quantidade de dados?", payload: { options: [text("kb", "KB (kilobyte)"), text("mb", "MB (megabyte)"), text("gb", "GB (gigabyte)"), text("tb", "TB (terabyte)")] }, solution: "tb" },
  { id: "hw-ram-desliga", instruction: "Quando o computador desliga, o que é apagado da memória RAM?", payload: { options: [text("abertos", "Os programas e dados que estavam abertos"), text("salvos", "Os arquivos salvos no SSD"), text("windows", "O Windows inteiro"), text("nada", "Nada, a RAM guarda tudo para sempre")] }, solution: "abertos" },
  { id: "suporte-monitor", instruction: "O computador está ligado, mas o monitor está apagado. O que verificar primeiro?", payload: { options: [text("energia", "O botão de energia e o cabo do monitor"), text("cpu", "Trocar o processador"), text("formatar", "Formatar o computador"), text("mouse", "Comprar um mouse novo")] }, solution: "energia" },
  { id: "suporte-mouse", instruction: "O mouse parou de funcionar. Qual é a primeira verificação?", payload: { options: [text("cabo", "Ver se o cabo USB ou o receptor sem fio está conectado"), text("ram", "Trocar a memória RAM"), text("monitor", "Desligar o monitor"), text("internet", "Reiniciar o roteador")] }, solution: "cabo" },
  { id: "suporte-impressora", instruction: "A impressora parou e mostra o aviso \"sem papel\". O que fazer?", payload: { options: [text("papel", "Colocar papel na bandeja"), text("tinta", "Trocar o monitor"), text("driver", "Desinstalar o Windows"), text("cabo", "Desligar o Wi-Fi")] }, solution: "papel" },
].map((challenge) => ({ ...challenge, theme: "Hardware", template: "choice" }));

hardware.push(
  { id: "hw-io-3", theme: "Hardware", template: "sort", instruction: "Classifique cada equipamento: entrada, saída ou os dois.", payload: { items: [P.scanner, P.projetor, P.multifuncional, P.webcam], targets: IO_TARGETS }, solution: { scanner: "entrada", projetor: "saida", multifuncional: "hibrido", webcam: "entrada" } },
  { id: "hw-io-4", theme: "Hardware", template: "sort", instruction: "Classifique cada equipamento: entrada, saída ou os dois.", payload: { items: [P.fone, P.mesa, P.touch, P.impressora3d], targets: IO_TARGETS }, solution: { fone: "saida", "mesa-digitalizadora": "entrada", touchscreen: "hibrido", "impressora-3d": "saida" } },
  { id: "hw-memoria-tipo", theme: "Hardware", template: "sort", instruction: "Separe: o que guarda arquivos para sempre e o que guarda só enquanto está ligado.", payload: { items: [P.ssd, P.ram, P.hdExterno, P.pendrive], targets: [{ id: "permanente", label: "Armazenamento permanente", hint: "não perde ao desligar" }, { id: "temporaria", label: "Memória temporária", hint: "apaga ao desligar" }] }, solution: { ssd: "permanente", ram: "temporaria", "hd-externo": "permanente", "pen-drive": "permanente" } },
  { id: "hw-dentro-fora", theme: "Hardware", template: "sort", instruction: "O que fica dentro do gabinete e o que é periférico externo?", payload: { items: [P.placaMae, P.mouse, P.ram, P.impressora], targets: [{ id: "interno", label: "Dentro do gabinete", hint: "componente interno" }, { id: "externo", label: "Periférico externo", hint: "conectado por fora" }] }, solution: { "placa-mae": "interno", mouse: "externo", ram: "interno", impressora: "externo" } },
  { id: "hw-ordem-unidades", theme: "Hardware", template: "order", instruction: "Coloque as unidades em ordem, da MENOR para a MAIOR.", payload: { items: [text("gb", "GB"), text("kb", "KB"), text("tb", "TB"), text("mb", "MB")] }, solution: ["kb", "mb", "gb", "tb"] },
  { id: "hw-ordem-ram", theme: "Hardware", template: "order", instruction: "Coloque em ordem os passos para instalar uma memória RAM com segurança.", payload: { items: [text("encaixar", "Encaixar o pente no slot até travar"), text("desligar", "Desligar e tirar o computador da tomada"), text("ligar", "Fechar o gabinete e ligar o computador"), text("abrir", "Abrir a tampa do gabinete")] }, solution: ["desligar", "abrir", "encaixar", "ligar"] },
  { id: "hw-ordem-liga", theme: "Hardware", template: "order", instruction: "O que acontece quando você aperta o botão de ligar? Coloque em ordem.", payload: { items: [text("windows", "O Windows carrega e mostra a tela de login"), text("energia", "A fonte manda energia para as peças"), text("bios", "A placa-mãe testa as peças (BIOS/UEFI)"), text("ssd", "O sistema é lido do SSD para a memória RAM")] }, solution: ["energia", "bios", "ssd", "windows"] },
  { id: "hw-montar-1", theme: "Montagem do PC", template: "slots", instruction: "Monte o computador: arraste cada peça para o encaixe certo da placa-mãe.", payload: { parts: [P.cpu, P.ram], slots: ["socket", "dimm"] }, solution: { socket: "processador", dimm: "ram" } },
  { id: "hw-montar-2", theme: "Montagem do PC", template: "slots", instruction: "Instale a placa de vídeo e o SSD M.2 nos encaixes corretos.", payload: { parts: [P.gpu, P.ssd], slots: ["pcie", "m2"] }, solution: { pcie: "placa-video", m2: "ssd" } },
  { id: "hw-montar-3", theme: "Montagem do PC", template: "slots", instruction: "Monte o PC completo: processador, memória, placa de vídeo e SSD.", payload: { parts: [P.ssd, P.gpu, P.ram, P.cpu], slots: ["socket", "dimm", "pcie", "m2"] }, solution: { socket: "processador", dimm: "ram", pcie: "placa-video", m2: "ssd" } },
  { id: "hw-montar-4", theme: "Montagem do PC", template: "slots", instruction: "O PC não liga e esquenta. Encaixe a fonte de energia e o cooler do processador.", payload: { parts: [P.cooler, P.fonte], slots: ["power", "socket"] }, solution: { power: "fonte", socket: "cooler" } },
);

// ---------------- Tarefas práticas no OSLab ----------------
// A verificação acontece dentro do OSLab (js/labirinto-bridge.js). Nas tarefas com pergunta,
// a resposta é conferida aqui no servidor.
const oslab = (id, theme, instruction, task, steps, extra = {}) => ({ id, theme, template: "oslab", instruction, payload: { task, steps, ...(extra.payload || {}) }, solution: extra.solution ?? { done: true } });
const RAM_OPTIONS = [text("2", "2 GB"), text("4", "4 GB"), text("8", "8 GB"), text("16", "16 GB")];
const oslabTasks = [
  oslab("os-pasta-documentos", "Windows na prática", "Crie uma pasta chamada Trabalhos dentro de Documentos.", "folder-documents", ["Abra o Explorador de Arquivos (pasta amarela na barra de tarefas).", "Entre em Documentos.", "Clique em Novo › Pasta.", "Digite Trabalhos e aperte Enter."]),
  oslab("os-pasta-area", "Windows na prática", "Crie uma pasta chamada Fotos da Turma na Área de Trabalho.", "folder-desktop", ["Clique com o botão direito num espaço vazio da Área de Trabalho.", "Escolha Novo › Pasta.", "Digite Fotos da Turma e aperte Enter."]),
  oslab("os-renomear", "Windows na prática", "Renomeie o arquivo documento1.txt da Área de Trabalho para atividade.txt.", "rename-desktop", ["Clique com o botão direito em documento1.txt.", "Escolha Renomear.", "Digite atividade.txt e aperte Enter."]),
  oslab("os-renomear-docs", "Windows na prática", "Em Documentos, renomeie novo arquivo.docx para pesquisa.docx.", "rename-documents", ["Abra o Explorador de Arquivos e entre em Documentos.", "Selecione novo arquivo.docx.", "Clique em Renomear na barra de comandos.", "Digite pesquisa.docx e aperte Enter."]),
  oslab("os-mover-imagem", "Windows na prática", "Mova foto-passeio.jpg da Área de Trabalho para a pasta Imagens.", "move-picture", ["Abra o Explorador e entre em Área de Trabalho.", "Selecione foto-passeio.jpg e clique em Recortar.", "Entre em Imagens.", "Clique em Colar."]),
  oslab("os-copiar-backup", "Windows na prática", "Faça uma cópia de trabalho-final.pdf dentro da pasta Backup (em Documentos), sem apagar o original.", "copy-backup", ["Abra Documentos no Explorador.", "Selecione trabalho-final.pdf e clique em Copiar.", "Entre na pasta Backup.", "Clique em Colar."]),
  oslab("os-lixeira-excluir", "Segurança digital", "Envie o arquivo suspeito jogo-gratis.exe da Área de Trabalho para a Lixeira.", "delete-file", ["Clique com o botão direito em jogo-gratis.exe.", "Escolha Excluir."]),
  oslab("os-lixeira-restaurar", "Windows na prática", "O arquivo redacao.docx foi apagado por engano. Restaure-o pela Lixeira.", "restore-file", ["Abra a Lixeira na Área de Trabalho.", "Selecione redacao.docx.", "Clique em Restaurar."]),
  oslab("os-lixeira-esvaziar", "Windows na prática", "O disco está cheio de lixo. Esvazie a Lixeira.", "empty-recycle", ["Abra a Lixeira.", "Clique em Esvaziar Lixeira e confirme."]),
  oslab("os-escrever", "Windows na prática", "Abra o arquivo lista.txt da Área de Trabalho e escreva a palavra teclado dentro dele.", "write-text", ["Dê dois cliques em lista.txt.", "Clique na área de texto.", "Digite teclado. O arquivo salva sozinho."]),
  oslab("os-papel-parede", "Personalização", "Troque o papel de parede para a imagem Futebol.", "wallpaper", ["Abra o menu Iniciar › Configurações.", "Entre em Personalização.", "Em Plano de fundo, clique na imagem Futebol."]),
  oslab("os-modo-escuro", "Personalização", "Ative o modo escuro do Windows.", "dark-mode", ["Abra Configurações › Personalização.", "Entre em Cores.", "Escolha o modo Escuro."]),
  oslab("os-volume", "Sistema", "O som está alto demais. Deixe o volume em 20% (entre 18% e 22%), sem mudo.", "volume-20", ["Clique nos ícones de rede/som no canto inferior direito.", "Arraste o controle de volume até perto de 20%."]),
  oslab("os-mudo", "Suporte técnico", "O computador está sem som: está no mudo. Tire do mudo.", "unmute", ["Clique nos ícones de rede/som no canto inferior direito.", "Clique no ícone do alto-falante para tirar do mudo.", "Se o volume estiver em 0, aumente um pouco."]),
  oslab("os-travado", "Suporte técnico", "O Editor de Texto travou (Não respondendo). Finalize-o pelo Gerenciador de Tarefas.", "end-frozen", ["Clique com o botão direito num espaço vazio da barra de tarefas.", "Escolha Gerenciador de Tarefas.", "Selecione Editor de Texto.", "Clique em Finalizar tarefa."]),
  oslab("os-wifi", "Redes", "O Wi-Fi está desligado e a internet parou. Ligue o Wi-Fi.", "wifi-on", ["Clique nos ícones de rede no canto inferior direito.", "Clique no botão Wi-Fi para ligar."]),
  oslab("os-aviao", "Redes", "O modo avião foi ativado sem querer. Desative o modo avião.", "airplane-off", ["Abra as Configurações rápidas (canto inferior direito).", "Clique em Modo avião para desligar."]),
  oslab("os-janela", "Windows na prática", "Minimize a janela do Explorador de Arquivos e depois restaure-a pela barra de tarefas.", "minimize-restore", ["Clique no traço (–) no canto superior direito da janela.", "Clique no ícone do Explorador na barra de tarefas para ela voltar."]),
  oslab("os-pesquisar", "Windows na prática", "Encontre o arquivo relatorio-final.pdf usando a pesquisa do Explorador e selecione-o.", "search-file", ["Abra o Explorador e entre em Documentos.", "Digite relatorio-final na caixa de pesquisa.", "Clique no resultado relatorio-final.pdf."]),
  oslab("os-ram", "Hardware no Windows", "Abra o Gerenciador de Tarefas › Desempenho › Memória e descubra quanta memória RAM este computador tem.", "taskmgr-ram", ["Botão direito na barra de tarefas › Gerenciador de Tarefas.", "Clique em Desempenho (gráfico na barra lateral).", "Clique em Memória e leia o total."], { payload: { question: "Quanta memória RAM o computador tem?", options: RAM_OPTIONS, gate: "taskmanager" }, solution: { answer: "4" } }),
  oslab("os-nucleos", "Hardware no Windows", "No Gerenciador de Tarefas › Desempenho › CPU, descubra quantos núcleos o processador tem.", "taskmgr-cores", ["Abra o Gerenciador de Tarefas.", "Entre em Desempenho › CPU.", "Procure Núcleos nos detalhes."], { payload: { question: "Quantos núcleos tem o processador?", options: [text("1", "1"), text("2", "2"), text("4", "4"), text("8", "8")], gate: "taskmanager" }, solution: { answer: "2" } }),
  oslab("os-processador", "Hardware no Windows", "Descubra pelo Gerenciador de Tarefas qual é o processador deste computador.", "taskmgr-cpu", ["Abra o Gerenciador de Tarefas.", "Entre em Desempenho › CPU.", "O nome aparece no alto, à direita."], { payload: { question: "Qual é o processador?", options: [text("celeron", "Intel Celeron N4500"), text("i9", "Intel Core i9"), text("ryzen", "AMD Ryzen 9"), text("m3", "Apple M3")], gate: "taskmanager" }, solution: { answer: "celeron" } }),
  oslab("os-disco", "Hardware no Windows", "No Gerenciador de Tarefas › Desempenho › Disco, descubra o tipo de armazenamento do computador.", "taskmgr-disk", ["Abra o Gerenciador de Tarefas.", "Entre em Desempenho › Disco 0.", "Procure o campo Tipo."], { payload: { question: "Qual é o tipo do disco?", options: [text("hd", "HD (disco rígido)"), text("ssd", "SSD (NVMe)"), text("pendrive", "Pen drive"), text("dvd", "DVD")], gate: "taskmanager" }, solution: { answer: "ssd" } }),
  oslab("os-ipconfig", "Redes", "Abra o Terminal, digite ipconfig e descubra o Endereço IPv4 do computador.", "terminal-ip", ["Abra o menu Iniciar e procure Terminal.", "Digite ipconfig e aperte Enter.", "Leia a linha Endereço IPv4."], { payload: { question: "Qual é o Endereço IPv4?", options: [text("a", "192.168.1.100"), text("b", "8.8.8.8"), text("c", "255.255.255.0"), text("d", "192.168.1.1")], gate: "ipconfig" }, solution: { answer: "a" } }),
];

export const CHALLENGES = [...classic, ...hardware, ...oslabTasks];
export const CHALLENGE_BY_ID = new Map(CHALLENGES.map((challenge) => [challenge.id, challenge]));
export const CLASSIC_IDS = CHALLENGES.filter((c) => c.template !== "oslab").map((c) => c.id);
export const ALL_IDS = CHALLENGES.map((c) => c.id);

export function publicChallenge(challenge, serial) {
  const { solution, ...visible } = challenge;
  return { ...visible, serial };
}

const sameMapping = (expected, actual) => {
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return false;
  const keys = Object.keys(expected);
  return keys.length === Object.keys(actual).length && keys.every((key) => actual[key] === expected[key]);
};

export function checkResponse(challenge, response) {
  if (!challenge) return false;
  switch (challenge.template) {
    case "choice": return typeof response === "string" && response === challenge.solution;
    case "sort":
    case "slots": return sameMapping(challenge.solution, response);
    case "order": return Array.isArray(response) && response.length === challenge.solution.length && response.every((id, index) => id === challenge.solution[index]);
    case "oslab":
      if (challenge.solution.answer !== undefined) return response?.answer === challenge.solution.answer;
      return response?.done === true;
    default: return false;
  }
}

// Itens aceitos de uma classificação parcial (para o aluno ver o que já acertou).
export function acceptedParts(challenge, response) {
  if (!["sort", "slots"].includes(challenge.template) || !response || typeof response !== "object") return undefined;
  return Object.fromEntries(Object.entries(response).filter(([key, value]) => challenge.solution[key] === value));
}
