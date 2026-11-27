(function createAppRegistry(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const definitions = {
    computer: { title: "Computador", icon: "assets/icons/win11/this-pc-48.png", address: "Este Computador", task: "explorer", pinned: true },
    explorer: { title: "Explorador de Arquivos", shortTitle: "Explorador", icon: "assets/icons/win11/file-explorer-48.png", address: "Início", task: "explorer", pinned: true },
    recycle: { title: "Lixeira", icon: "assets/icons/win11/recycle-empty-48.png", address: "Lixeira", task: "explorer", pinned: true },
    google: { title: "Google Chrome", icon: "assets/browser/chrome.svg", address: "https://www.google.com.br", task: "google", pinned: true },
    edge: { title: "Microsoft Edge", icon: "assets/browser/edge.png", address: "Nova aba", task: "edge" },
    firefox: { title: "Mozilla Firefox", icon: "assets/browser/firefox.png", address: "Nova aba", task: "firefox" },
    brave: { title: "Brave", icon: "assets/browser/brave-icon.png", address: "Nova aba", task: "brave" },
    opera: { title: "Opera", icon: "assets/browser/opera.png", address: "Nova aba", task: "opera" },
    settings: { title: "Configurações", icon: "assets/icons/settings.png", address: "Configurações", task: "settings", pinned: true },
    terminal: { title: "Terminal", icon: "assets/icons/terminal.png", address: "Terminal", task: "terminal" },
    taskmanager: { title: "Gerenciador de Tarefas", icon: "assets/icons/win11/task-manager-48.png", address: "Processos", task: "taskmanager" },
    missions: { title: "Missões", icon: "assets/icons/trails/missions.svg", address: "Trilha de Missões", task: "missions", pinned: true },
    exercises: { title: "Exercícios", icon: "assets/icons/trails/exercises.svg", address: "Trilha de Exercícios", task: "exercises", pinned: true },
    vpn: { title: "VPN", icon: "assets/icons/trails/vpn.svg", address: "VPN do OSLab", task: "vpn", pinned: true },
    vpnlab: { title: "Laboratório VPN", icon: "assets/icons/trails/vpnlab.svg", address: "Trilha de VPN", task: "vpnlab", pinned: true },
    installlab: { title: "Instalação de Programas", shortTitle: "Instalação", icon: "assets/programs/install-lab.svg", address: "Instalação e Desinstalação", task: "installlab", pinned: true },
    digitallife: { title: "Minha Primeira Vida Digital", shortTitle: "Vida Digital", icon: "assets/digital/trail-icon.png", address: "Minha Primeira Vida Digital", task: "digitallife", pinned: true },
    userspermissions: { title: "Gerenciamento de Usuários e Permissões", shortTitle: "Usuários e Permissões", icon: "assets/users-permissions/trail-icon.png", address: "Gerenciamento de Usuários e Permissões", task: "userspermissions", pinned: true },
    wifilab: { title: "Diagnóstico de Wi-Fi", icon: "assets/wifi/trail-icon.png", address: "Diagnóstico de Wi-Fi", task: "wifilab", pinned: true },
    driverslab: { title: "Drivers: Impressora", shortTitle: "Drivers", icon: "assets/drivers/trail-icon.svg", address: "Drivers", task: "driverslab", pinned: true },
    printer: { title: "Impressora", icon: "assets/drivers/printer-icon.png", address: "Impressora", task: "printer" },
    devicemanager: { title: "Gerenciador de Dispositivos", shortTitle: "Dispositivos", icon: "assets/drivers/devmgr/root-32.png", address: "Gerenciador de Dispositivos", task: "devicemanager" },
    sysinfo: { title: "Informações do Sistema", shortTitle: "Sobre o PC", icon: "assets/drivers/system-info.svg", address: "Informações do Sistema", task: "sysinfo" },
    driverinstaller: { title: "Instalação do driver Printix", shortTitle: "Driver Printix", icon: "assets/drivers/driver-file.svg", address: "Instalação do driver Printix", task: "driverinstaller" },
    audiolab: { title: "Som: sem áudio na aula", shortTitle: "Som", icon: "assets/audio/trail-icon.svg", address: "Som", task: "audiolab", pinned: true },
    aulaonline: { title: "Aula On-line", icon: "assets/audio/aula-icon.svg", address: "Aula On-line", task: "aulaonline" },
    audioinstaller: { title: "Instalação do driver de áudio", shortTitle: "Driver de áudio", icon: "assets/drivers/driver-file.svg", address: "Instalação do driver de áudio", task: "audioinstaller" },
    tasklab: { title: "Trilha: Gerenciador de Tarefas", shortTitle: "Trilha do Gerenciador", icon: "assets/taskmgr/trail-icon.svg", address: "Gerenciador de Tarefas", task: "tasklab", pinned: true },
    discord: { title: "Discord", icon: "assets/store/discord-icon.webp", address: "Discord", task: "discord", installedOnly: true },
    msstore: { title: "Microsoft Store", icon: "assets/icons/win11/store-48.png", address: "Microsoft Store", task: "msstore", pinned: true },
    storelab: { title: "Trilha: Microsoft Store", shortTitle: "Trilha da Loja", icon: "assets/store/trail-icon.svg", address: "Microsoft Store", task: "storelab", pinned: true },
    chatgpt: { title: "ChatGPT", icon: "assets/store/chatgpt-icon.webp", address: "ChatGPT", task: "chatgpt", installedOnly: true },
    spotify: { title: "Spotify", icon: "assets/store/spotify-icon.webp", address: "Spotify", task: "spotify", installedOnly: true },
    netflix: { title: "Netflix", icon: "assets/store/netflix-icon.webp", address: "Netflix", task: "netflix", installedOnly: true },
    ibispaint: { title: "ibis Paint X", icon: "assets/store/ibispaint-icon.webp", address: "ibis Paint X", task: "ibispaint", installedOnly: true },
    calculator: { title: "Calculadora", icon: "assets/store/calculator-icon.webp", address: "Calculadora", task: "calculator", installedOnly: true },
    todo: { title: "Microsoft To Do", icon: "assets/store/todo-icon.webp", address: "Microsoft To Do", task: "todo", installedOnly: true },
    clock: { title: "Relógio", icon: "assets/store/clock-icon.webp", address: "Relógio", task: "clock", installedOnly: true },
    stickynotes: { title: "Notas Autoadesivas", icon: "assets/store/stickynotes-icon.webp", address: "Notas Autoadesivas", task: "stickynotes", installedOnly: true },
    browsertrail: { title: "Navegadores e Internet", icon: "assets/icons/trails/browsertrail.svg", address: "Navegadores e Internet", task: "browsertrail", pinned: true },
    browsermuseum: { title: "Conhecendo os Navegadores", shortTitle: "Navegadores", icon: "assets/icons/trails/browsermuseum.svg", address: "Conhecendo os Navegadores", task: "browsermuseum", pinned: true },
    whatsapp: { title: "WhatsApp", icon: "assets/icons/trails/whatsapp.svg", address: "WhatsApp", task: "whatsapp", pinned: true },
    controlpanel: { title: "Painel de Controle", icon: "assets/programs/control-panel.png", address: "Painel de Controle", task: "controlpanel", pinned: true },
    installer: { title: "Instalador", icon: "assets/programs/installer.svg", address: "Assistente de Instalação", task: "installer" },
    appjavafx: { title: "AppJavaFX", icon: "assets/programs/appjavafx.svg", address: "AppJavaFX", task: "appjavafx", installedOnly: true },
    word: { title: "Word", icon: "assets/programs/word.svg", address: "Documento1 — Word", task: "word", installedOnly: true },
    excel: { title: "Excel", icon: "assets/programs/excel.svg", address: "Pasta1 — Excel", task: "excel", installedOnly: true },
    slides: { title: "Apresentações Slides", shortTitle: "Apresentações", icon: "assets/programs/slides.svg", address: "Apresentação1", task: "slides", installedOnly: true },
    texteditor: { title: "Editor de Texto", icon: "assets/icons/notepad.png", address: "Documento sem título", task: "texteditor" },
  };

  function get(id) { return definitions[id] ? { id, ...definitions[id] } : null; }
  function list() { return Object.entries(definitions).map(([id, definition]) => ({ id, ...definition })); }
  function register(id, definition) {
    if (!id || !definition?.title) throw new Error("Aplicativo inválido");
    definitions[id] = { ...definitions[id], ...definition };
    OSLab.events.emit("app:registered", { appId: id, app: get(id) }, "appRegistry");
    return get(id);
  }

  function synchronizeStaticEntries(scope = document) {
    scope.querySelectorAll("[data-app]").forEach((entry) => {
      const app = definitions[entry.dataset.app];
      if (!app) return;
      const image = entry.querySelector("img");
      if (image) {
        image.src = app.icon;
        OSLab.icons.fallbackImage(image, "app");
      }
    });
  }

  OSLab.apps = { definitions, get, list, register, synchronizeStaticEntries };
})(window);
