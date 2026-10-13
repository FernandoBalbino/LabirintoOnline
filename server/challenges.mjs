const itemAsset = (name) => `./assets/items/${name}`;
const fileAsset = (name) => `./assets/windows-file-organizer/icons/${name}`;

export const folderTargets = [
  { id: "documentos", label: "Documentos", icon: fileAsset("folder.svg") },
  { id: "imagens", label: "Imagens", icon: fileAsset("folder.svg") },
  { id: "videos", label: "Vídeos", icon: fileAsset("folder.svg") },
  { id: "musicas", label: "Músicas", icon: fileAsset("folder.svg") }
];

const fileItem = (id, label, icon) => ({ id, label, icon: fileAsset(icon) });
const option = (id, label, icon) => ({ id, label, icon: itemAsset(icon) });

const singleFileChallenges = [
  ["arquivo-curriculo", "curriculo.pdf", "pdf.svg", "documentos"],
  ["arquivo-trabalho", "trabalho.docx", "word.svg", "documentos"],
  ["arquivo-planilha", "planilha.xlsx", "excel.svg", "documentos"],
  ["arquivo-foto", "foto.jpg", "photo-jpg.svg", "imagens"],
  ["arquivo-ferias", "ferias.png", "photo-png.svg", "imagens"],
  ["arquivo-musica", "musica.mp3", "music.svg", "musicas"]
].map(([id, label, icon, solution]) => ({
  id,
  theme: "Arquivos e pastas",
  template: "file-single",
  instruction: "Organize o arquivo no local correto.",
  payload: { items: [fileItem(id, label, icon)], targets: folderTargets },
  solution: { [id]: solution }
}));

const multiFileChallenges = [
  {
    id: "arquivos-mistos-1",
    items: [
      fileItem("relatorio-pdf", "relatorio.pdf", "pdf.svg"),
      fileItem("passeio-jpg", "passeio.jpg", "photo-jpg.svg"),
      fileItem("podcast-mp3", "podcast.mp3", "music.svg"),
      fileItem("aula-mp4", "aula.mp4", "video.svg")
    ],
    solution: { "relatorio-pdf": "documentos", "passeio-jpg": "imagens", "podcast-mp3": "musicas", "aula-mp4": "videos" }
  },
  {
    id: "arquivos-mistos-2",
    items: [
      fileItem("atividade-docx", "atividade.docx", "word.svg"),
      fileItem("grafico-png", "grafico.png", "photo-png.svg"),
      fileItem("entrevista-mp3", "entrevista.mp3", "music.svg"),
      fileItem("experimento-mp4", "experimento.mp4", "video.svg"),
      fileItem("notas-xlsx", "notas.xlsx", "excel.svg")
    ],
    solution: { "atividade-docx": "documentos", "grafico-png": "imagens", "entrevista-mp3": "musicas", "experimento-mp4": "videos", "notas-xlsx": "documentos" }
  },
  {
    id: "arquivos-mistos-3",
    items: [
      fileItem("leitura-txt", "leitura.txt", "text.svg"),
      fileItem("cartaz-jpg", "cartaz.jpg", "photo-jpg.svg"),
      fileItem("ensaio-mp3", "ensaio.mp3", "music.svg"),
      fileItem("projeto-pdf", "projeto.pdf", "pdf.svg"),
      fileItem("teatro-mp4", "teatro.mp4", "video.svg"),
      fileItem("logo-png", "logo.png", "photo-png.svg")
    ],
    solution: { "leitura-txt": "documentos", "cartaz-jpg": "imagens", "ensaio-mp3": "musicas", "projeto-pdf": "documentos", "teatro-mp4": "videos", "logo-png": "imagens" }
  }
].map((challenge) => ({
  id: challenge.id,
  theme: "Arquivos e pastas",
  template: "file-multi",
  instruction: "Coloque todos os arquivos nas pastas apropriadas.",
  payload: { items: challenge.items, targets: folderTargets },
  solution: challenge.solution
}));

const hardwareOptions = [
  option("ssd", "SSD", "ssd.jpg"),
  option("ram", "Memória RAM", "memoria-ram.jpg"),
  option("processador", "Processador", "processador.jpg"),
  option("placa-mae", "Placa-mãe", "placa-mae.jpg"),
  option("teclado", "Teclado", "teclado.jpg")
];

const hardwareChallenges = [
  {
    id: "hardware-armazenamento",
    instruction: "Coloque no computador o componente responsável pelo armazenamento permanente.",
    payload: { mode: "drop", options: hardwareOptions.slice(0, 4), targetLabel: "Gabinete do computador" },
    solution: "ssd"
  },
  {
    id: "hardware-processamento",
    instruction: "Selecione o componente responsável pelo processamento das informações.",
    payload: { mode: "select", options: hardwareOptions },
    solution: "processador"
  },
  {
    id: "hardware-memoria",
    instruction: "Encontre a memória RAM.",
    payload: { mode: "select", options: hardwareOptions.slice(0, 4) },
    solution: "ram"
  },
  {
    id: "hardware-placa-mae",
    instruction: "Qual peça conecta os principais componentes do computador?",
    payload: { mode: "select", options: hardwareOptions.slice(0, 4) },
    solution: "placa-mae"
  }
].map((challenge) => ({ ...challenge, theme: "Hardware", template: "hardware" }));

const hardwareSoftwareSets = [
  ["hs-1", [
    option("teclado", "Teclado", "teclado.jpg"),
    option("windows", "Windows", "windows.svg"),
    option("mouse", "Mouse", "mouse.jpg"),
    option("chrome", "Google Chrome", "google-chrome.svg")
  ], { teclado: "hardware", windows: "software", mouse: "hardware", chrome: "software" }],
  ["hs-2", [
    option("monitor", "Monitor", "monitor.jpg"),
    option("writer", "Editor de texto", "libreoffice-writer.svg"),
    option("ssd", "SSD", "ssd.jpg"),
    option("gimp", "Editor de imagens", "gimp.svg")
  ], { monitor: "hardware", writer: "software", ssd: "hardware", gimp: "software" }],
  ["hs-3", [
    option("ram", "Memória RAM", "memoria-ram.jpg"),
    option("firefox", "Mozilla Firefox", "mozilla-firefox.svg"),
    option("webcam", "Webcam", "webcam.jpg"),
    option("vlc", "VLC", "vlc.svg")
  ], { ram: "hardware", firefox: "software", webcam: "hardware", vlc: "software" }],
  ["hs-4", [
    option("impressora", "Impressora", "impressora.jpg"),
    option("ubuntu", "Ubuntu", "ubuntu.svg"),
    option("processador", "Processador", "processador.jpg"),
    option("compactador", "7-Zip", "seven-zip.svg")
  ], { impressora: "hardware", ubuntu: "software", processador: "hardware", compactador: "software" }]
].map(([id, items, solution]) => ({
  id,
  theme: "Hardware e software",
  template: "hardware-software",
  instruction: "Separe cada item entre hardware e software.",
  payload: { items, targets: [{ id: "hardware", label: "Hardware" }, { id: "software", label: "Software" }] },
  solution
}));

const softwareChoices = [
  { id: "writer", label: "Editor de texto", icon: itemAsset("libreoffice-writer.svg") },
  { id: "browser", label: "Navegador", icon: itemAsset("google-chrome.svg") },
  { id: "slides", label: "Apresentações", icon: fileAsset("powerpoint.svg") },
  { id: "sheets", label: "Planilhas", icon: fileAsset("excel.svg") },
  { id: "paint", label: "Editor de imagens", icon: itemAsset("gimp.svg") }
];

const softwareChallenges = [
  ["software-texto", "Você precisa escrever um trabalho escolar. Qual programa deve abrir?", "writer"],
  ["software-internet", "Você precisa navegar na Internet. Qual programa deve abrir?", "browser"],
  ["software-apresentacao", "Você precisa criar uma apresentação para a turma. Qual programa deve abrir?", "slides"],
  ["software-planilha", "Você precisa montar uma tabela com cálculos. Qual programa deve abrir?", "sheets"]
].map(([id, instruction, solution]) => ({
  id,
  theme: "Software",
  template: "software-scenario",
  instruction,
  payload: { options: softwareChoices },
  solution
}));

const peripheralChallenges = [
  {
    id: "perifericos-classificar-1",
    instruction: "Classifique os periféricos como entrada, saída ou entrada e saída.",
    payload: {
      items: [
        option("teclado", "Teclado", "teclado.jpg"),
        option("monitor", "Monitor", "monitor.jpg"),
        option("headset", "Headset", "headset.jpg"),
        option("microfone", "Microfone", "microfone.jpg")
      ],
      targets: [{ id: "entrada", label: "Entrada" }, { id: "saida", label: "Saída" }, { id: "hibrido", label: "Entrada e saída" }]
    },
    solution: { teclado: "entrada", monitor: "saida", headset: "hibrido", microfone: "entrada" }
  },
  {
    id: "perifericos-classificar-2",
    instruction: "Coloque cada equipamento na categoria correta.",
    payload: {
      items: [
        option("mouse", "Mouse", "mouse.jpg"),
        option("impressora", "Impressora", "impressora.jpg"),
        option("touchscreen", "Tela sensível ao toque", "touchscreen.jpg"),
        option("caixa-som", "Caixa de som", "caixa-som.jpg")
      ],
      targets: [{ id: "entrada", label: "Entrada" }, { id: "saida", label: "Saída" }, { id: "hibrido", label: "Entrada e saída" }]
    },
    solution: { mouse: "entrada", impressora: "saida", touchscreen: "hibrido", "caixa-som": "saida" }
  },
  {
    id: "periferico-digitar",
    instruction: "Qual equipamento você utilizaria para digitar um texto?",
    payload: { options: [option("teclado", "Teclado", "teclado.jpg"), option("mouse", "Mouse", "mouse.jpg"), option("monitor", "Monitor", "monitor.jpg"), option("microfone", "Microfone", "microfone.jpg")] },
    solution: "teclado"
  },
  {
    id: "periferico-imprimir",
    instruction: "Qual equipamento coloca um trabalho no papel?",
    payload: { options: [option("webcam", "Webcam", "webcam.jpg"), option("impressora", "Impressora", "impressora.jpg"), option("scanner", "Scanner", "scanner.jpg"), option("monitor", "Monitor", "monitor.jpg")] },
    solution: "impressora"
  }
].map((challenge, index) => ({
  ...challenge,
  theme: "Periféricos",
  template: index < 2 ? "peripheral-sort" : "peripheral-select"
}));

const windowsChallenges = [
  ["windows-documentos", "Abra a pasta Documentos.", "open-documents", { desktop: "folder" }],
  ["windows-fechar", "Feche a janela aberta.", "close-window", { desktop: "window" }],
  ["windows-minimizar", "Minimize a janela aberta.", "minimize-window", { desktop: "window" }],
  ["windows-lixeira", "Mova trabalho.pdf para a Lixeira.", "trash-file", { desktop: "trash" }]
].map(([id, instruction, solution, payload]) => ({
  id,
  theme: "Windows",
  template: "windows-sim",
  instruction,
  payload,
  solution
}));

const renameChallenges = [
  ["renomear-atividade", "documento1.txt", "atividade.txt"],
  ["renomear-pesquisa", "novo arquivo.docx", "pesquisa.docx"]
].map(([id, from, to]) => ({
  id,
  theme: "Windows",
  template: "rename-file",
  instruction: `Renomeie este arquivo para ${to}.`,
  payload: { from, to },
  solution: to
}));

const supportChallenges = [
  ["suporte-som", "O computador está sem som. Verifique o volume e retire do silencioso.", "unmute", { scene: "sound" }],
  ["suporte-programa", "O programa travou e não responde. Escolha uma ação simples e segura.", "close-program", { scene: "program" }],
  ["suporte-mouse", "O mouse não está funcionando. Verifique a conexão correta.", "connect-mouse", { scene: "mouse" }],
  ["suporte-monitor", "O monitor está apagado. Verifique primeiro o botão de energia.", "power-monitor", { scene: "monitor" }],
  ["suporte-impressora", "A impressora parou e mostra que está sem papel. O que você deve verificar?", "check-paper", { scene: "printer" }]
].map(([id, instruction, solution, payload]) => ({
  id,
  theme: "Suporte técnico básico",
  template: "support-sim",
  instruction,
  payload,
  solution
}));

const basePowerIcon = (index) => ({ sheet: "base", index, columns: 5, rows: 4 });
const luckEventIcon = (index) => ({ sheet: "luck-event", index, columns: 5, rows: 2 });

export const mazePowers = [
  { id: "escudo", name: "Escudo digital", description: "Bloqueia a próxima captura do vírus.", icon: basePowerIcon(8) },
  { id: "turbo", name: "Botas turbo", description: "Você corre duas vezes mais rápido por 10 segundos.", icon: basePowerIcon(9) },
  { id: "antivirus", name: "Pulso antivírus", description: "Expulsa o vírus; ele reaparece longe depois.", icon: basePowerIcon(10) },
  { id: "vidente", name: "Olho vidente", description: "Mostra o caminho correto em verde por 5 segundos.", icon: basePowerIcon(11) },
  { id: "tempo", name: "Tempo extra", description: "Adiciona 15 segundos ao cronômetro.", icon: basePowerIcon(12) },
  { id: "congelar", name: "Congelamento", description: "Congela o vírus por 8 segundos.", icon: basePowerIcon(13) },
  { id: "teleporte", name: "Salto digital", description: "Teleporta você vários corredores na direção da saída.", icon: basePowerIcon(14) },
  { id: "invisibilidade", name: "Modo fantasma", description: "O vírus não consegue ver você por 8 segundos.", icon: basePowerIcon(15) },
  { id: "bussola", name: "Bússola do portal", description: "Aponta para a saída por 10 segundos.", icon: basePowerIcon(16) },
  { id: "lentidao", name: "Vírus lento", description: "Diminui a velocidade do vírus até o fim da partida.", icon: basePowerIcon(17) },
  { id: "dado-tempo", name: "Dado cronológico", description: "Sorteia um bônus de 10, 20 ou 30 segundos.", icon: luckEventIcon(0), lucky: true },
  { id: "salto-sorte", name: "Salto da sorte", description: "Avança de 12 a 30 corredores pelo caminho da saída.", icon: luckEventIcon(1), lucky: true },
  { id: "bau-duplicador", name: "Baú duplicador", description: "Espalha dois novos baús em locais seguros do labirinto.", icon: luckEventIcon(2), lucky: true },
  { id: "combo-surpresa", name: "Combo surpresa", description: "Ativa dois poderes favoráveis diferentes de uma só vez.", icon: luckEventIcon(3), lucky: true },
  { id: "trilha-premiada", name: "Trilha premiada", description: "Cria cinco bits; cada coleta acrescenta 2 segundos.", icon: luckEventIcon(4), lucky: true }
];

export const mazeEvents = [
  {
    id: "virus-multiplicado",
    name: "Multiplicação de vírus",
    description: "Três vírus extras entraram no labirinto por 15 segundos!",
    kind: "threat",
    duration: 15,
    icon: luckEventIcon(5)
  },
  {
    id: "chuva-meteoros",
    name: "Chuva de meteoros",
    description: "Saia das áreas marcadas: cada impacto tira 3 segundos.",
    kind: "threat",
    duration: 12,
    icon: luckEventIcon(6)
  },
  {
    id: "apagao-digital",
    name: "Apagão digital",
    description: "A luz do laboratório ficará reduzida por 12 segundos.",
    kind: "threat",
    duration: 12,
    icon: luckEventIcon(7)
  },
  {
    id: "chuva-baus",
    name: "Chuva de baús",
    description: "Dois novos baús apareceram em locais seguros.",
    kind: "help",
    duration: 2.5,
    icon: luckEventIcon(8)
  },
  {
    id: "onda-antivirus",
    name: "Onda antivírus",
    description: "Todos os vírus ficaram congelados por 10 segundos.",
    kind: "help",
    duration: 10,
    icon: luckEventIcon(9)
  }
];

export const mazeChallenges = [
  ...singleFileChallenges,
  ...multiFileChallenges,
  ...hardwareChallenges,
  ...hardwareSoftwareSets,
  ...softwareChallenges,
  ...peripheralChallenges,
  ...windowsChallenges,
  ...renameChallenges,
  ...supportChallenges
];

export const challengeTemplateCounts = mazeChallenges.reduce((counts, challenge) => ({
  ...counts,
  [challenge.template]: (counts[challenge.template] || 0) + 1
}), {});

export const challengeById = new Map(mazeChallenges.map((challenge) => [challenge.id, challenge]));
