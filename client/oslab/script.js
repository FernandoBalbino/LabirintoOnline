(function () {
  "use strict";

  const runtimeErrors = [];
  window.__oslabRuntimeErrors = runtimeErrors;
  window.addEventListener("error", (event) => runtimeErrors.push(event.message || "Erro de execução"));
  window.addEventListener("unhandledrejection", (event) => runtimeErrors.push(String(event.reason || "Promessa rejeitada")));

  const STORAGE_KEY = "oslab-state-v1";
  const LEGACY_WALLPAPER_STORAGE_KEY = "oslab-wallpaper";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const loginScreen = $("#login-screen");
  const desktop = $("#desktop");
  const loginForm = $("#login-form");
  const passwordInput = $("#password");
  const loginMessage = $("#login-message");
  const passwordRow = $(".password-row");
  const fullscreenLoginButton = $("#fullscreen-login-button");
  const loginUserList = $("#login-user-list");
  const loginUserName = $("#login-user-name");
  const loginAvatar = $("#login-avatar");

  const windowLayer = $("#window-layer");
  const windowTemplate = $("#window-template");
  const desktopIcons = $("#desktop-icons");
  const windows = new Map();
  let zCounter = 30;

  const startMenu = $("#start-menu");
  const searchPanel = $("#search-panel");
  const quickPanel = $("#quick-panel");
  const calendarPanel = $("#calendar-panel");
  const powerMenu = $("#power-menu");
  const profileMenu = $("#profile-menu");
  const startProfileButton = $("#start-profile-button");
  const contextMenu = $("#context-menu");
  const itemContextMenu = $("#item-context-menu");
  const taskbarContextMenu = $("#taskbar-context-menu");
  const startButton = $("#start-button");
  const searchButton = $("#search-button");
  const quickSettingsButton = $("#quick-settings-button");
  const clockButton = $("#clock-button");
  const taskbar = $(".taskbar");
  let contextItemId = null;
  let fileClipboard = null;
  let missionsResumed = false;
  let persistenceSuspended = false;

  const appDefinitions = OSLab.apps.definitions;

  // small = ícone da barra lateral; big = ícone da pasta (ambos extraídos do Windows 11)
  const folders = [
    { id: "root-desktop", name: "Área de Trabalho", small: "desktop", big: "desktop-folder", icon: "assets/icons/win11/desktop-folder-48.png" },
    { id: "root-documents", name: "Documentos", small: "documents", big: "documents-folder", icon: "assets/icons/win11/documents-folder-48.png" },
    { id: "root-downloads", name: "Downloads", small: "downloads", big: "downloads", icon: "assets/icons/win11/downloads-48.png" },
    { id: "root-pictures", name: "Imagens", small: "pictures", big: "pictures-folder", icon: "assets/icons/win11/pictures-folder-48.png" },
    { id: "root-public", name: "Pública", small: "folder", big: "users-folder", icon: "assets/icons/win11/users-folder-48.png" },
  ];

  const wallpapers = [
    { id: "1", name: "Windows 11 colorido", src: "bg1.jpg" },
    { id: "2", name: "Windows 11 azul", src: "bg2.jpg" },
    { id: "3", name: "Windows 11 claro", src: "bg3.jpg" },
    { id: "4", name: "Abstrato laranja", src: "bg4.jpg" },
    { id: "5", name: "Grupo musical", src: "bg5.jpg" },
    { id: "6", name: "Futebol", src: "bg6.jpg" },
    { id: "7", name: "Futebol americano", src: "bg7.jpg" },
  ];

  const defaultTaskProcesses = [
    { id: "taskmgr", pid: 7420, name: "Gerenciador de Tarefas", icon: "assets/icons/taskmanager.png", cpu: 0.3, memory: 58.4, disk: 0, network: 0 },
    { id: "explorer", pid: 3184, name: "Windows Explorer", icon: "assets/icons/explorer.png", cpu: 0.1, memory: 92.7, disk: 0.1, network: 0 },
    { id: "antimalware", pid: 1268, name: "Antimalware Service Executable", icon: "assets/icons/taskmanager/services.png", cpu: 0.2, memory: 78.2, disk: 0, network: 0 },
    { id: "dwm", pid: 1540, name: "Gerenciador de Janelas da Área de Trabalho", icon: "assets/icons/taskmanager/details.png", cpu: 0.1, memory: 44.8, disk: 0, network: 0 },
    { id: "search", pid: 4916, name: "Pesquisa", icon: "assets/icons/search.png", cpu: 0, memory: 36.1, disk: 0, network: 0 },
    { id: "secure", pid: 136, name: "Secure System", icon: "assets/icons/taskmanager/details.png", cpu: 0, memory: 24.6, disk: 0, network: 0 },
    { id: "start", pid: 5208, name: "Iniciar", icon: "assets/icons/start.png", cpu: 0, memory: 18.9, disk: 0, network: 0 },
    { id: "sihost", pid: 2440, name: "Host de Experiência do Windows", icon: "assets/icons/taskmanager/details.png", cpu: 0, memory: 17.3, disk: 0, network: 0 },
    { id: "wmi", pid: 2788, name: "WMI Provider Host", icon: "assets/icons/taskmanager/services.png", cpu: 0.1, memory: 15.8, disk: 0, network: 0 },
    { id: "services", pid: 896, name: "Host de Serviço: Sistema Local", icon: "assets/icons/taskmanager/services.png", cpu: 0, memory: 13.4, disk: 0, network: 0 },
  ];

  let taskProcesses = defaultTaskProcesses.map((process) => ({ ...process }));

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[character]);
  }

  const settingsSections = [
    { id: "home", name: "Início", icon: "assets/icons/ui/home.png" },
    {
      id: "system",
      name: "Sistema",
      icon: "assets/settings/System.webp",
      description: "Tela, som, notificações e energia",
      items: ["Tela", "Som", "Energia e bateria"],
    },
    {
      id: "bluetooth",
      name: "Bluetooth e dispositivos",
      icon: "assets/settings/Bluetooth-devices.webp",
      description: "Dispositivos, impressoras e mouse",
      items: ["Dispositivos", "Impressoras e scanners", "Mouse"],
    },
    {
      id: "network",
      name: "Rede e Internet",
      icon: "assets/settings/Network-internet.webp",
      description: "Wi-Fi, Ethernet e uso de dados",
      items: ["Wi-Fi", "Ethernet", "Configurações avançadas de rede"],
    },
    {
      id: "personalization",
      name: "Personalização",
      icon: "assets/settings/Personalisation.webp",
      description: "Plano de fundo, cores e temas",
    },
    {
      id: "apps",
      name: "Aplicativos",
      icon: "assets/settings/Apps.webp",
      description: "Aplicativos instalados e padrão",
      items: ["Aplicativos instalados", "Aplicativos padrão", "Inicialização"],
    },
    {
      id: "accounts",
      name: "Contas",
      icon: "assets/settings/Accounts.webp",
      description: "Conta local e opções de entrada",
      items: ["Suas informações", "Opções de entrada", "Outros usuários"],
    },
    {
      id: "time",
      name: "Hora e idioma",
      icon: "assets/settings/Time-language.webp",
      description: "Data, hora, idioma e região",
      items: ["Data e hora", "Idioma e região", "Digitação"],
    },
    {
      id: "gaming",
      name: "Jogos",
      icon: "assets/settings/Gaming.webp",
      description: "Modo de Jogo e capturas",
      items: ["Modo de Jogo", "Capturas", "Barra de Jogos"],
    },
    {
      id: "accessibility",
      name: "Acessibilidade",
      icon: "assets/settings/Accessibility.webp",
      description: "Visão, audição e interação",
      items: ["Visão", "Audição", "Interação"],
    },
    {
      id: "privacy",
      name: "Privacidade e segurança",
      icon: "assets/settings/Privacy-security.webp",
      description: "Segurança e permissões",
      items: ["Segurança do Windows", "Permissões do aplicativo", "Localização"],
    },
    {
      id: "update",
      name: "Windows Update",
      icon: "assets/settings/Windows-Update.webp",
      description: "Atualizações e histórico",
      items: ["Verificar atualizações", "Histórico de atualização", "Opções avançadas"],
    },
  ];

  const defaultState = {
    version: 3,
    theme: "light",
    wallpaperId: "1",
    desktopFolders: [],
    desktopFiles: [],
    recycleBin: [],
    quickSettings: {
      wifi: true,
      connectedSsid: "REDE_OSLAB",
      bluetooth: false,
      airplane: false,
      hotspot: false,
      "battery-saver": false,
      "night-light": false,
    },
    brightness: 86,
    volume: 100,
    muted: false,
    lastSettingsPage: "home",
    desktopView: "medium",
    desktopSort: "manual",
    lastRename: null,
  };

  function loadState() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") || {};
      const legacyWallpaper = window.localStorage.getItem(LEGACY_WALLPAPER_STORAGE_KEY);
      const wallpaperId = wallpapers.some((item) => item.id === parsed.wallpaperId)
        ? parsed.wallpaperId
        : wallpapers.some((item) => item.id === legacyWallpaper)
          ? legacyWallpaper
          : defaultState.wallpaperId;
      const desktopFolders = Array.isArray(parsed.desktopFolders)
        ? parsed.desktopFolders
            .filter((folder) => folder && typeof folder.id === "string" && typeof folder.name === "string")
            .map((folder) => ({
              id: folder.id,
              name: folder.name.slice(0, 64) || "Nova pasta",
              createdAt: Number(folder.createdAt) || Date.now(),
              kind: "folder",
            }))
        : [];
      const desktopFiles = Array.isArray(parsed.desktopFiles)
        ? parsed.desktopFiles
            .filter((file) => file && typeof file.id === "string" && typeof file.name === "string")
            .map((file) => ({
              id: file.id,
              name: file.name.slice(0, 64) || "Novo Documento de Texto.txt",
              createdAt: Number(file.createdAt) || Date.now(),
              kind: "file",
              content: typeof file.content === "string" ? file.content.slice(0, 20000) : "",
            }))
        : [];
      const recycleBin = Array.isArray(parsed.recycleBin)
        ? parsed.recycleBin
            .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
            .map((item) => ({
              id: item.id,
              name: item.name.slice(0, 64),
              kind: item.kind === "file" ? "file" : "folder",
              content: typeof item.content === "string" ? item.content.slice(0, 20000) : "",
              createdAt: Number(item.createdAt) || Date.now(),
              deletedAt: Number(item.deletedAt) || Date.now(),
              originalLocation: "Área de Trabalho",
            }))
        : [];

      return {
        ...defaultState,
        ...parsed,
        version: 3,
        theme: parsed.theme === "dark" ? "dark" : "light",
        wallpaperId,
        desktopFolders,
        desktopFiles,
        recycleBin,
        quickSettings: { ...defaultState.quickSettings, ...(parsed.quickSettings || {}) },
      };
    } catch (_error) {
      return {
        ...defaultState,
        quickSettings: { ...defaultState.quickSettings },
        desktopFolders: [],
        desktopFiles: [],
        recycleBin: [],
      };
    }
  }

  const state = loadState();

  // modo do Windows escolhido pelo aluno (claro ou escuro): vale para barra, Iniciar, janelas e menus juntos
  function applyAppearance() {
    const theme = state.theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.shellTone = theme;
    delete state.quickSettings.theme;
  }
  function setSystemTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    state.themeChosen = true;
    applyAppearance();
    saveState();
    document.querySelector(".os-theme-backdrop")?.remove();
    windows.forEach((record) => { if (record.appId === "settings") renderSettings(record, record.settingsView); });
    OSLab.taskManagerApp?.renderAll?.();
    OSLab.events.emit("theme:changed", { theme: state.theme }, "settings");
  }
  /** miniaturas do modo claro e escuro com o papel de parede atual (como em Personalização › Cores) */
  function themeCardsMarkup() {
    const wallpaper = (wallpapers.find((item) => item.id === currentWallpaperId) || wallpapers[0]).src;
    const card = (theme, label) => `<button type="button" class="os-theme-card${state.themeChosen && state.theme === theme ? " is-on" : ""}" data-system-theme="${theme}" aria-pressed="${state.themeChosen && state.theme === theme}"><span class="os-mini" data-mini="${theme}" style="background-image:url('${wallpaper}')" aria-hidden="true"><span class="os-mini-window"><i></i><b></b><b></b><b></b></span><span class="os-mini-start"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="os-mini-bar"><i></i><i></i><i></i><i></i></span></span><strong>${label}</strong></button>`;
    return `<div class="os-theme-options">${card("light", "Claro")}${card("dark", "Escuro")}</div>`;
  }
  function showThemeChooser() {
    if (document.querySelector(".os-theme-backdrop")) return;
    const dialog = document.createElement("div");
    dialog.className = "os-theme-backdrop";
    dialog.innerHTML = `<section class="os-theme" role="dialog" aria-modal="true" aria-labelledby="os-theme-title"><img src="assets/icons/start.png" alt="" /><h2 id="os-theme-title">Escolha o seu modo</h2><p>Deixe o Windows claro ou escuro. Você pode mudar depois em Configurações › Personalização › Cores.</p>${themeCardsMarkup()}</section>`;
    document.body.appendChild(dialog);
  }
  document.addEventListener("click", (event) => {
    const theme = event.target.closest("[data-system-theme]")?.dataset.systemTheme;
    if (theme) setSystemTheme(theme);
  });

  function saveState() {
    if (persistenceSuspended) return;
    OSLab.users?.captureSystemState?.(state, OSLab.users.getCurrent()?.id || OSLab.users.getSelected()?.id, true);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.localStorage.removeItem(LEGACY_WALLPAPER_STORAGE_KEY);
    } catch (_error) {
      // O simulador continua funcionando mesmo quando o armazenamento está indisponível.
    }
  }

  OSLab.fileSystem.bind(state, saveState);
  OSLab.users.bindSystemState(state, () => {
    OSLab.fileSystem.bind(state, saveState);
    applyAppearance();
    currentWallpaperId = state.wallpaperId || "1";
    applyWallpaper(currentWallpaperId, false);
    fileClipboard = null;
    renderDesktopFolders();
    renderInstalledStartApps();
    updateIdentityUI();
  });
  OSLab.network.bind(state.quickSettings, saveState);

  let currentWallpaperId = state.wallpaperId;

  function applyWallpaper(id, persist = true) {
    const wallpaper = wallpapers.find((item) => item.id === id) || wallpapers[0];
    currentWallpaperId = wallpaper.id;
    document.documentElement.style.setProperty("--wallpaper-image", `url("${wallpaper.src}")`);

    if (persist) {
      state.wallpaperId = wallpaper.id;
      saveState();
      OSLab.events.emit("wallpaper:changed", { wallpaperId: wallpaper.id, src: wallpaper.src }, "settings");
    }

    $$("[data-wallpaper]").forEach((button) => {
      const selected = button.dataset.wallpaper === wallpaper.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    $$("[data-current-wallpaper]").forEach((image) => {
      image.src = wallpaper.src;
      image.alt = wallpaper.name;
    });

    $$("[data-wallpaper-name]").forEach((label) => {
      label.textContent = wallpaper.name;
    });
  }

  function desktopItemById(itemId) {
    return OSLab.fileSystem.get(itemId);
  }

  function sortedDesktopFolders() {
    const result = OSLab.fileSystem.list(OSLab.fileSystem.roots.desktop);
    if (state.desktopSort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (state.desktopSort === "date") result.sort((a, b) => b.createdAt - a.createdAt);
    return result;
  }

  function renderDesktopFolders() {
    $$("[data-desktop-item], [data-desktop-folder], [data-installed-desktop]", desktopIcons).forEach((element) => element.remove());
    desktopIcons.classList.remove("view-large", "view-medium", "view-small");
    desktopIcons.classList.add(`view-${state.desktopView}`);

    (OSLab.software?.getInstalledPrograms?.() || []).filter((program) => program.desktopShortcut).forEach((program) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "desktop-shortcut installed-program-shortcut";
      button.dataset.installedDesktop = program.id;
      button.dataset.app = program.id;
      button.innerHTML = `<img src="${escapeHtml(program.icon)}" alt="" /><span>${escapeHtml(program.name)}</span>`;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        $$(".desktop-shortcut").forEach((item) => item.classList.remove("is-selected"));
        button.classList.add("is-selected");
        if (event.detail <= 1) openApp(program.id);
      });
      desktopIcons.appendChild(button);
    });

    sortedDesktopFolders().forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "desktop-shortcut desktop-item-shortcut";
      button.dataset.desktopItem = item.id;
      button.dataset.itemKind = item.kind;
      if (item.kind === "folder") button.dataset.desktopFolder = item.id;
      button.setAttribute("aria-label", `Abrir ${item.kind === "folder" ? "pasta" : "arquivo"} ${item.name}`);

      const image = document.createElement("img");
      image.src = OSLab.icons.file(item);
      OSLab.icons.fallbackImage(image, item.kind === "folder" ? "folder" : "file");
      image.alt = "";
      const label = document.createElement("span");
      label.textContent = item.name;
      button.append(image, label);
      desktopIcons.appendChild(button);
    });
  }

  function renderInstalledStartApps() {
    const container = $("#start-apps");
    if (!container) return;
    $$(".installed-start-app", container).forEach((element) => element.remove());
    (OSLab.software?.getInstalledPrograms?.() || []).filter((program) => program.startMenuShortcut).forEach((program) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "installed-start-app";
      button.dataset.app = program.id;
      button.innerHTML = `<img src="${escapeHtml(program.icon)}" alt="" /><span>${escapeHtml(program.name)}</span>`;
      button.addEventListener("click", () => openApp(program.id));
      container.appendChild(button);
    });
    // apps baixados na Microsoft Store aparecem no Iniciar (os que já têm atalho fixo não repetem)
    (OSLab.store?.installedApps?.() || []).filter((app) => !$(`#start-apps [data-app="${app.id}"]:not(.installed-start-app)`)).forEach((app) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "installed-start-app";
      button.dataset.app = app.id;
      button.innerHTML = `<img src="${escapeHtml(app.icon)}" alt="" /><span>${escapeHtml(app.name)}</span>`;
      button.addEventListener("click", () => { OSLab.events.emit("start:app-opened", { appId: app.id }, "startMenu"); openApp(app.id); });
      container.appendChild(button);
    });
    const query = $("#start-search-input")?.value.trim().toLocaleLowerCase("pt-BR") || "";
    $$("#start-apps [data-app]").forEach((button) => button.classList.toggle("is-hidden", !button.textContent.trim().toLocaleLowerCase("pt-BR").includes(query)));
  }

  function uniqueItemName(baseName, extension = "") {
    return OSLab.fileSystem.uniqueName(OSLab.fileSystem.roots.desktop, `${baseName}${extension}`);
  }

  function beginItemRename(itemId) {
    const item = desktopItemById(itemId);
    const shortcut = $(`[data-desktop-item="${itemId}"]`, desktopIcons);
    if (!item || !shortcut) return;
    const label = $("span", shortcut);
    const input = document.createElement("input");
    input.className = "desktop-folder-name";
    input.value = item.name;
    input.setAttribute("aria-label", `Nome do ${item.kind === "folder" ? "pasta" : "arquivo"}`);
    label.replaceWith(input);
    shortcut.classList.add("is-renaming");
    input.focus();
    input.select();

    let committed = false;
    const finish = (save) => {
      if (committed) return;
      committed = true;
      if (save) {
        const nextName = input.value.trim().slice(0, 64);
        if (nextName && nextName !== item.name) {
          state.lastRename = { itemId: item.id, previousName: item.name };
          OSLab.fileSystem.rename(item.id, nextName);
        }
        saveState();
      }
      renderDesktopFolders();
    };
    input.addEventListener("blur", () => finish(true));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") finish(true);
      if (event.key === "Escape") finish(false);
    });
  }

  function beginFolderRename(folderId) {
    beginItemRename(folderId);
  }

  function createDesktopFolder() {
    const folder = OSLab.fileSystem.create({ parentId: OSLab.fileSystem.roots.desktop, kind: "folder", name: uniqueItemName("Nova pasta") });
    renderDesktopFolders();
    window.setTimeout(() => beginItemRename(folder.id), 40);
  }

  function createDesktopTextFile() {
    const file = OSLab.fileSystem.create({ parentId: OSLab.fileSystem.roots.desktop, kind: "file", name: uniqueItemName("Novo Documento de Texto", ".txt"), mime: "text/plain", content: "" });
    renderDesktopFolders();
    window.setTimeout(() => beginItemRename(file.id), 40);
  }

  function openDesktopItem(itemId) {
    const item = desktopItemById(itemId);
    if (!item) return null;
    const record = openApp("explorer");
    if (item.kind === "folder") renderFolder(record, item.id);
    else renderTextFile(record, item.id);
    return record;
  }

  function moveDesktopItemToRecycle(itemId) {
    const item = desktopItemById(itemId);
    if (!item) return;
    OSLab.fileSystem.delete(itemId);
    renderDesktopFolders();
    const recycleRecord = windows.get("recycle");
    if (recycleRecord) renderApp(recycleRecord);
  }

  function restoreRecycleItem(itemId) {
    const item = OSLab.fileSystem.restore(itemId);
    if (!item) return;
    renderDesktopFolders();
  }

  function permanentlyDeleteRecycleItem(itemId) {
    OSLab.fileSystem.permanentlyDelete(itemId);
  }

  async function requestFullscreen() {
    if (window.OSLAB_EMBED) return false;
    if (document.fullscreenElement) return true;
    const target = document.documentElement;
    if (!target.requestFullscreen) return false;

    try {
      await target.requestFullscreen({ navigationUI: "hide" });
      return true;
    } catch (_error) {
      try {
        await target.requestFullscreen();
        return true;
      } catch (_fallbackError) {
        return false;
      }
    }
  }

  function updateFullscreenButton() {
    const label = $("span", fullscreenLoginButton);
    label.textContent = document.fullscreenElement ? "Tela cheia ativada" : "Abrir em tela cheia";
  }

  fullscreenLoginButton.addEventListener("click", () => {
    void requestFullscreen().then(updateFullscreenButton);
  });

  document.addEventListener("fullscreenchange", updateFullscreenButton);

  function showDesktop() {
    loginScreen.classList.add("is-hidden");
    desktop.classList.remove("is-hidden");
    document.title = "OSLab — Área de Trabalho";
    updateIdentityUI();
    applyWallpaper(state.wallpaperId || "1", false);
    renderDesktopFolders();
    renderInstalledStartApps();
    updateClock();
    launchStartupApps();
    if (!state.themeChosen) window.setTimeout(showThemeChooser, 600);
    if (!missionsResumed) {
      missionsResumed = true;
      OSLab.missions.resumeAfterBoot();
      const requestedApp = new URLSearchParams(window.location.search).get("app");
      if (requestedApp && appDefinitions[requestedApp]) openApp(requestedApp);
    }
  }

  function renderLoginUsers() {
    const selected = OSLab.users.getSelected();
    loginUserName.textContent = selected.displayName;
    loginAvatar.src = selected.avatar;
    loginAvatar.alt = `Perfil de ${selected.displayName}`;
    loginUserList.innerHTML = OSLab.users.list().map((account) => `<button type="button" class="${account.id === selected.id ? "is-selected" : ""}" data-login-user="${escapeHtml(account.id)}"><img src="${escapeHtml(account.avatar)}" alt="" /><span><strong>${escapeHtml(account.displayName)}</strong><small>${account.role === "administrator" ? "Administrador" : "Usuário padrão"}</small></span></button>`).join("");
  }

  function updateIdentityUI() {
    const current = OSLab.users.getCurrent() || OSLab.users.getSelected();
    $("#start-profile-name").textContent = current.displayName;
    $("#start-profile-avatar").src = current.avatar;
    profileMenu.innerHTML = `<button type="button" data-profile-action="lock"><img src="${escapeHtml(current.avatar)}" alt="" /><span><strong>${escapeHtml(current.displayName)}</strong><small>Bloquear sessão</small></span></button><i></i>${OSLab.users.list().filter((account) => account.id !== current.id).map((account) => `<button type="button" data-profile-user="${escapeHtml(account.id)}"><img src="${escapeHtml(account.avatar)}" alt="" /><span>Trocar para ${escapeHtml(account.displayName)}</span></button>`).join("")}<button type="button" data-profile-action="signout"><img src="assets/icons/ui/power.png" alt="" /><span>Sair</span></button>`;
    $$(".settings-profile").forEach((profile) => { const image = $("img", profile); const name = $("strong", profile); const subtitle = $("small", profile); if (image) image.src = current.avatar; if (name) name.textContent = current.displayName; if (subtitle) subtitle.textContent = current.role === "administrator" ? "Administrador · Conta local" : "Usuário padrão · Conta local"; });
  }

  function resetLogin() {
    loginForm.reset();
    passwordInput.disabled = false;
    passwordRow.classList.remove("is-hidden");
    fullscreenLoginButton.classList.remove("is-hidden");
    loginMessage.classList.remove("is-hidden", "is-error");
    loginMessage.textContent = "Digite sua senha para entrar.";
    renderLoginUsers();
  }

  function lockSession() {
    closeFlyouts();
    desktop.classList.add("is-hidden");
    const current = OSLab.users.getCurrent();
    if (current) OSLab.users.selectUser(current.id);
    OSLab.users.lock();
    resetLogin();
    loginScreen.classList.remove("is-hidden");
    document.title = "Entrar — OSLab";
    window.setTimeout(() => passwordInput.focus(), 80);
    OSLab.events.emit("computer:locked", {}, "session");
  }

  // ---------- energia: telas do Windows 11 (fundo preto, pontinhos girando) ----------
  const BOOT_KEY = "oslab.boot.v1";
  function powerScreen(markup) {
    let screen = $("#power-screen");
    if (!screen) { screen = document.createElement("div"); screen.id = "power-screen"; screen.className = "power-screen"; screen.setAttribute("role", "status"); document.body.appendChild(screen); }
    screen.innerHTML = markup;
    screen.classList.remove("is-hidden");
    return screen;
  }
  const spinner = '<div class="win-spinner" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>';
  /** Reiniciar e Desligar recarregam a página: a trilha ativa fica salva e continua depois de entrar de novo */
  function powerOff(kind) {
    closeFlyouts();
    saveState();
    OSLab.events.emit(kind === "restart" ? "power:restart" : "power:shutdown", {}, "powerMenu");
    desktop.classList.add("is-hidden");
    powerScreen(`${spinner}<p>${kind === "restart" ? "Reiniciando" : "Desligando"}</p>`);
    window.setTimeout(() => {
      if (kind === "restart") { sessionStorage.setItem(BOOT_KEY, JSON.stringify({ reason: "restart" })); window.location.reload(); return; }
      const screen = powerScreen('<button type="button" class="power-on" data-power-on aria-label="Ligar o computador"><i class="tm-ic" style="-webkit-mask-image:url(assets/icons/taskmanager/fluent/power.svg);mask-image:url(assets/icons/taskmanager/fluent/power.svg)"></i></button><small>Computador desligado. Clique no botão para ligar.</small>');
      screen.classList.add("is-off");
      screen.querySelector("[data-power-on]").addEventListener("click", () => { sessionStorage.setItem(BOOT_KEY, JSON.stringify({ reason: "shutdown" })); window.location.reload(); }, { once: true });
    }, 2600);
  }
  function sleepComputer() {
    closeFlyouts();
    OSLab.events.emit("power:sleep", {}, "powerMenu");
    const screen = powerScreen("<small>Suspenso. Clique ou aperte uma tecla para acordar.</small>");
    screen.classList.add("is-off", "is-sleep");
    const wake = () => { screen.classList.add("is-hidden"); screen.classList.remove("is-off", "is-sleep"); document.removeEventListener("keydown", wake); lockSession(); };
    window.setTimeout(() => { screen.addEventListener("click", wake, { once: true }); document.addEventListener("keydown", wake, { once: true }); }, 400);
  }
  /** tela de inicialização em todo acesso: logotipo do Windows e os pontinhos. Enquanto isso o OSLab baixa os arquivos
   *  e procura a versão mais nova; só libera o login quando estiver atualizado (ou sem internet). */
  let bootInfo = null;
  function bootScreen() {
    try { bootInfo = JSON.parse(sessionStorage.getItem(BOOT_KEY) || "null"); } catch (_) { bootInfo = null; }
    sessionStorage.removeItem(BOOT_KEY);
    const seconds = OSLab.processManager.estimateBootTime();
    if (bootInfo) bootInfo.seconds = seconds;
    const screen = powerScreen(`<img class="boot-logo" src="logow11.png" alt="Windows" />${spinner}<p class="boot-status" data-boot-status aria-live="polite"></p>`);
    screen.classList.add("is-boot");
    loginScreen.classList.add("is-booting");
    const status = screen.querySelector("[data-boot-status]");
    let shown = 0; // a porcentagem só sobe (mensagens podem chegar fora de ordem)
    const percent = (done, total) => (shown = Math.max(shown, total ? Math.min(100, Math.round(done / total * 100)) : 0));
    const progress = ({ phase, done = 0, total = 0 }) => {
      if (phase === "update") { screen.classList.add("is-updating"); status.innerHTML = `Trabalhando nas atualizações<br>${percent(done, total)}% concluído<br>Não desligue o computador.`; }
      else status.textContent = `Preparando o OSLab ${percent(done, total)}%`;
    };
    const minimum = new Promise((resolve) => window.setTimeout(resolve, bootInfo ? Math.min(6500, 1400 + seconds * 90) : 2400));
    const check = new Promise((resolve) => document.addEventListener("DOMContentLoaded", () => Promise.resolve(window.OSLabPWA?.check?.(progress) || { status: "unsupported" }).then(resolve, () => resolve({ status: "failed" })), { once: true }));
    const limit = new Promise((resolve) => window.setTimeout(() => resolve({ status: "slow" }), 45000));
    Promise.all([minimum, Promise.race([check, limit])]).then(([, result]) => {
      if (result?.status === "updating") { status.textContent = "Reiniciando"; window.setTimeout(() => window.location.reload(), 8000); return; }
      screen.classList.add("is-hidden");
      screen.classList.remove("is-boot", "is-updating");
      loginScreen.classList.remove("is-booting");
      passwordInput.focus();
    });
  }
  /** programas de inicialização abrem ao entrar na conta (não ao desbloquear) */
  let sessionStarted = false;
  function launchStartupApps() {
    if (sessionStarted) return;
    sessionStarted = true;
    const enabled = OSLab.processManager.getStartupApps().filter((app) => app.enabled && !app.protected);
    window.setTimeout(() => {
      enabled.forEach((app) => {
        if (app.launch && appDefinitions[app.launch]) openApp(app.launch, { fromStartup: true });
        else OSLab.processManager.createProcess({ appId: `startup-${app.id}`, name: app.name, exe: `${app.id}.exe`, icon: app.icon, kind: "background", cpu: 0.4, memory: 64 + app.seconds * 9, publisher: app.publisher });
      });
      OSLab.events.emit("system:booted", { reason: bootInfo?.reason || "reload", startupApps: enabled.map((app) => app.id), seconds: OSLab.processManager.estimateBootTime(), restarted: Boolean(bootInfo) }, "session");
      bootInfo = null;
    }, 1200);
  }

  function signOutSession(nextUserId = null) {
    closeFlyouts();
    Array.from(windows.values()).forEach((record) => closeWindow(record, { force: true, sessionSwitch: true }));
    fileClipboard = null;
    sessionStarted = false;
    OSLab.events.emit("session:signed-out", {}, "session");
    OSLab.users.signOut();
    if (nextUserId) OSLab.users.selectUser(nextUserId);
    desktop.classList.add("is-hidden");
    resetLogin();
    loginScreen.classList.remove("is-hidden");
    document.title = "Entrar — OSLab";
    window.setTimeout(() => passwordInput.focus(), 80);
  }

  loginUserList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-login-user]");
    if (!button) return;
    OSLab.users.selectUser(button.dataset.loginUser);
    resetLogin();
    passwordInput.focus();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const result = await OSLab.users.authenticate(OSLab.users.getSelected().id, passwordInput.value);
    if (!result.ok) {
      loginMessage.textContent = "Senha incorreta. Tente novamente.";
      loginMessage.classList.add("is-error");
      passwordInput.select();
      return;
    }

    void requestFullscreen();
    showDesktop();
  });

  // ================= Explorador de Arquivos no padrão do Windows 11 =================
  // Ícones extraídos do Windows 11 (imageres.dll, shell32.dll e explorer.exe); comandos com Fluent UI System Icons.
  const W11 = "assets/icons/win11/";
  const HAS_256 = new Set(["folder", "desktop-folder", "documents-folder", "downloads", "pictures-folder", "music-folder", "videos-folder", "recycle-empty", "recycle-full", "this-pc", "drive-c", "zip", "text", "file", "image-file", "users-folder", "file-explorer"]);
  const winIcon = (name, size = 48) => `${W11}${name}-${size === 256 && !HAS_256.has(name) ? 48 : size}.png`;
  // ícone de arquivo em tamanho grande: troca -48 por -256 quando o Windows tem a versão grande
  const sizedIcon = (src, size) => { const name = String(src).startsWith(W11) && String(src).match(/win11\/(.+)-48\.png$/)?.[1]; return name ? winIcon(name, size) : src; };
  const fxIc = (name) => `<i class="fx-ic" style="-webkit-mask-image:url(assets/icons/taskmanager/fluent/${name}.svg);mask-image:url(assets/icons/taskmanager/fluent/${name}.svg)" aria-hidden="true"></i>`;
  const EXPLORER_APPS = new Set(["explorer", "computer", "recycle"]);
  const isExplorerApp = (record) => EXPLORER_APPS.has(record?.appId);
  const recycleIcon = (size) => winIcon(OSLab.fileSystem.recycleItems().length ? "recycle-full" : "recycle-empty", size);
  const fxDate = (time) => time ? new Date(time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }).replace(",", "") : "";
  function fileIcon(item, size = 48) {
    if (item?.kind === "folder") { const root = folders.find((entry) => entry.id === item.id); return winIcon(root?.big || "folder", size); }
    return sizedIcon(OSLab.icons.file(item), size);
  }
  function fileType(item) {
    if (item.kind === "folder") return "Pasta de arquivos";
    const ext = String(item.name).split(".").pop().toLocaleLowerCase("pt-BR");
    return ({ txt: "Documento de Texto", png: "Arquivo PNG", jpg: "Arquivo JPG", jpeg: "Arquivo JPG", webp: "Arquivo WEBP", zip: "Pasta compactada", pdf: "Documento PDF", docx: "Documento do Word", xlsx: "Planilha do Excel", pptx: "Apresentação", exe: "Aplicativo" })[ext] || (ext && ext !== item.name.toLocaleLowerCase("pt-BR") ? `Arquivo ${ext.toUpperCase()}` : "Arquivo");
  }

  // histórico de navegação (Voltar/Avançar) por janela
  function fxTrack(record, key) {
    if (record.fxCurrent === key) return;
    if (!record.fxNavigating && record.fxCurrent) { (record.fxBack ||= []).push(record.fxCurrent); record.fxFwd = []; }
    record.fxCurrent = key;
  }
  function fxGo(record, key, keepMenu = false) {
    if (!keepMenu) record.fxMenu = null;
    if (key === "home") renderExplorerHome(record);
    else if (key === "computer") renderComputer(record);
    else if (key === "recycle") renderRecycleBin(record);
    else if (key === "gallery") { (record.fxView ||= {})[OSLab.fileSystem.roots.pictures] ||= "large"; renderFolder(record, OSLab.fileSystem.roots.pictures); }
    else if (key.startsWith("folder:")) renderFolder(record, key.slice(7));
    else if (key.startsWith("file:")) renderTextFile(record, key.slice(5));
  }
  function fxStep(record, direction) {
    const from = direction === "back" ? record.fxBack : record.fxFwd, to = direction === "back" ? (record.fxFwd ||= []) : (record.fxBack ||= []);
    if (!from?.length) return;
    to.push(record.fxCurrent);
    record.fxNavigating = true; record.fxCurrent = null;
    try { fxGo(record, from.pop()); } finally { record.fxNavigating = false; }
  }

  function explorerTab(record, title, icon) {
    record.element.classList.add("fx-window");
    record.toolbar.classList.add("is-hidden");
    let strip = record.titlebar.querySelector(".fx-tabs");
    if (!strip) {
      strip = document.createElement("div");
      strip.className = "fx-tabs";
      record.titlebar.insertBefore(strip, record.titlebar.querySelector(".window-controls"));
      strip.addEventListener("click", (event) => {
        if (event.target.closest("[data-fx-tabclose]")) { event.stopPropagation(); closeWindow(record); }
        if (event.target.closest("[data-fx-newtab]")) { event.stopPropagation(); fxGo(record, "home"); }
      });
    }
    strip.innerHTML = `<div class="fx-tab is-active"><img src="${icon}" alt="" /><span>${escapeHtml(title)}</span><button type="button" data-fx-tabclose aria-label="Fechar guia">${fxIc("fx-dismiss")}</button></div><button type="button" class="fx-newtab" data-fx-newtab aria-label="Nova guia">+</button>`;
    record.title.textContent = title;
    record.address.textContent = title;
  }

  function sidebarMarkup(active) {
    const item = (key, label, icon, attrs, pin = false) => `<button type="button" class="${active === key ? "is-active" : ""}" ${attrs}><img src="${icon}" alt="" /><span>${label}</span>${pin ? fxIc("fx-pin") : ""}</button>`;
    return `<aside class="fx-side" aria-label="Navegação do Explorador">
      ${item("home", "Início", winIcon("home", 16), 'data-explorer-view="home"')}
      ${item("gallery", "Galeria", winIcon("gallery", 16), 'data-fx-go="gallery"')}
      <hr />
      ${folders.map((folder) => item(folder.id, folder.name, winIcon(folder.small, 16), `data-folder="${folder.id}"`, true)).join("")}
      ${item("recycle", "Lixeira", recycleIcon(16), 'data-explorer-view="recycle"', true)}
      <hr />
      <button type="button" class="fx-tree ${active === "computer" ? "is-active" : ""}" data-explorer-view="computer">${fxIc("chevron-down")}<img src="${winIcon("this-pc", 16)}" alt="" /><span>Este Computador</span></button>
      <button type="button" class="fx-tree is-child" data-explorer-view="computer">${fxIc("chevron-right")}<img src="${winIcon("drive-c", 16)}" alt="" /><span>Disco Local (C:)</span></button>
    </aside>`;
  }

  function commandButton(icon, label, attrs, enabled = true) {
    return `<button type="button" class="fx-icbtn" ${attrs} aria-label="${label}" title="${label}" ${enabled ? "" : "disabled"}>${fxIc(icon)}</button>`;
  }
  function dropdown(record, key, icon, label, enabled = true) {
    return `<button type="button" class="fx-ddbtn${record.fxMenu === key ? " is-open" : ""}" data-fx-menu="${key}" ${enabled ? "" : "disabled"}>${fxIc(icon)}<span>${label}</span>${fxIc("chevron-down")}</button>`;
  }
  function fxMenu(record) {
    if (!record.fxMenu) return "";
    const view = record.fxView?.[record.currentFolderId] || defaultView(record.currentFolderId);
    const sort = record.fxSort || { key: "name", dir: "asc" };
    const check = (on) => on ? fxIc("fx-checkmark") : "<b></b>";
    const menus = {
      new: `<button type="button" data-file-action="new-folder"><img src="${winIcon("folder", 16)}" alt="" />Pasta</button><button type="button" data-file-action="new-text"><img src="${winIcon("text", 16)}" alt="" />Documento de Texto</button>`,
      sort: `${[["name", "Nome"], ["date", "Data de modificação"], ["type", "Tipo"], ["size", "Tamanho"]].map(([key, text]) => `<button type="button" data-fx-sort="${key}">${check(sort.key === key)}${text}</button>`).join("")}<i></i><button type="button" data-fx-dir="asc">${check(sort.dir === "asc")}Crescente</button><button type="button" data-fx-dir="desc">${check(sort.dir === "desc")}Decrescente</button>`,
      view: [["large", "Ícones grandes", "fx-grid"], ["medium", "Ícones médios", "fx-apps_list"], ["list", "Lista", "fx-list"], ["details", "Detalhes", "fx-text_bullet_list_square"]].map(([key, text, icon]) => `<button type="button" data-fx-view="${key}">${check(view === key)}${fxIc(icon)}${text}</button>`).join(""),
      more: `<button type="button" data-file-action="properties" ${record.explorerSelection ? "" : "disabled"}>${fxIc("settings")}Propriedades</button><button type="button" data-fx="details">${fxIc("fx-panel_right")}Painel de detalhes</button>`,
    };
    return `<div class="fx-menu is-${record.fxMenu}" role="menu">${menus[record.fxMenu] || ""}</div>`;
  }
  function defaultView(folderId) { return [OSLab.fileSystem.roots.desktop, OSLab.fileSystem.roots.pictures].includes(folderId) ? "large" : "details"; }

  function detailsPane(record) {
    const item = OSLab.fileSystem.get(record.explorerSelection);
    if (!item) return `<aside class="fx-details" data-fx-details><p>Selecione um item para ver os detalhes.</p></aside>`;
    return `<aside class="fx-details" data-fx-details><img src="${fileIcon(item, 256)}" alt="" /><strong>${escapeHtml(item.name)}</strong><small>${fileType(item)}</small><dl><dt>Tamanho</dt><dd>${OSLab.systemTools.formatBytes(OSLab.fileSystem.bytesForItem(item.id))}</dd><dt>Local</dt><dd>${escapeHtml(OSLab.fileSystem.pathLabel(item.parentId))}</dd><dt>Data de modificação</dt><dd>${fxDate(item.updatedAt || item.createdAt)}</dd></dl></aside>`;
  }
  function updateFxSelection(record) {
    const count = $$("[data-file-item].is-selected", record.content).length;
    const status = $("[data-fx-selected]", record.content);
    if (status) status.textContent = count ? `${count} item selecionado` : "";
    const pane = $("[data-fx-details]", record.content);
    if (pane) pane.outerHTML = detailsPane(record);
  }

  function explorerFrame(record, o) {
    explorerTab(record, o.title, o.icon);
    const view = o.view || "details";
    return `<section class="fx" data-fx-key="${escapeHtml(record.fxCurrent || "")}">
      <div class="fx-nav">
        <button type="button" data-fx="back" aria-label="Voltar" ${record.fxBack?.length ? "" : "disabled"}>${fxIc("fx-arrow_left")}</button>
        <button type="button" data-fx="forward" aria-label="Avançar" ${record.fxFwd?.length ? "" : "disabled"}>${fxIc("fx-arrow_right")}</button>
        <button type="button" data-fx="up" aria-label="Acima" ${o.up ? "" : "disabled"}>${fxIc("fx-arrow_up")}</button>
        <button type="button" data-fx="refresh" aria-label="Atualizar">${fxIc("restart")}</button>
        <nav class="fx-address" aria-label="Endereço"><img src="${o.crumbIcon || o.icon}" alt="" />${o.crumbs.map(([label, key]) => `${fxIc("chevron-right")}<button type="button" data-fx-go="${escapeHtml(key)}">${escapeHtml(label)}</button>`).join("")}</nav>
        <label class="fx-search"><input type="search" ${o.searchable ? "data-explorer-search" : "data-fx-search"} placeholder="Pesquisar em ${escapeHtml(o.title)}" aria-label="Pesquisar em ${escapeHtml(o.title)}" />${fxIc("search")}</label>
      </div>
      <div class="fx-cmd">${o.commands}<span class="fx-fill"></span><button type="button" class="fx-ddbtn${record.fxDetails ? " is-open" : ""}" data-fx="details">${fxIc("fx-panel_right")}<span>Detalhes</span></button>${fxMenu(record)}</div>
      <div class="fx-body${record.fxDetails ? " has-details" : ""}">${sidebarMarkup(o.active)}<main class="fx-main">${o.body}</main>${record.fxDetails ? detailsPane(record) : ""}</div>
      <footer class="fx-status"><span>${o.count} ${o.count === 1 ? "item" : "itens"}</span><span data-fx-selected></span><span class="fx-fill"></span>${o.views ? `<button type="button" class="${view === "details" ? "is-on" : ""}" data-fx-view="details" aria-label="Detalhes">${fxIc("fx-text_bullet_list_square")}</button><button type="button" class="${view === "large" ? "is-on" : ""}" data-fx-view="large" aria-label="Ícones grandes">${fxIc("fx-grid")}</button>` : ""}</footer>
    </section>`;
  }
  const lockedCommands = (record) => `${dropdown(record, "new", "fx-add_circle", "Novo", false)}<i class="fx-sep"></i>${["fx-cut", "fx-copy", "fx-clipboard_paste", "fx-rename", "fx-share", "fx-delete"].map((icon) => commandButton(icon, "", "", false)).join("")}<i class="fx-sep"></i>${dropdown(record, "sort", "fx-arrow_sort", "Classificar", false)}${dropdown(record, "view", "fx-apps_list", "Visualizar", false)}<i class="fx-sep"></i>${commandButton("more", "Ver mais", 'data-fx-menu="more"')}`;

  function renderComputer(record) {
    fxTrack(record, "computer");
    const disk = OSLab.systemState.getStorage();
    const diskPercent = Math.round(disk.usedBytes / disk.totalBytes * 100);
    const currentUser = OSLab.users.getCurrent() || OSLab.users.getSelected();
    record.previousExplorerView = "computer";
    record.currentFolderId = null;
    const homes = OSLab.users.list();
    record.content.innerHTML = explorerFrame(record, {
      title: "Este Computador", icon: winIcon("this-pc", 16), crumbs: [["Este Computador", "computer"]], active: "computer", count: 1 + homes.length, commands: lockedCommands(record),
      body: `<section class="fx-section"><h3>${fxIc("chevron-down")}Dispositivos e unidades</h3><div class="fx-drives"><button type="button" class="fx-drive" data-folder="${OSLab.fileSystem.roots.desktop}"><img src="${winIcon("drive-c", 48)}" alt="" /><span><strong>Disco Local (C:)</strong><span class="fx-bar${diskPercent >= 90 ? " is-full" : ""}" aria-label="${diskPercent}% do disco utilizado"><i style="width:${diskPercent}%"></i></span><small>${OSLab.systemTools.formatBytes(disk.freeBytes)} livres de ${OSLab.systemTools.formatBytes(disk.totalBytes)}</small></span></button></div></section>
        <section class="fx-section"><h3>${fxIc("chevron-down")}Usuários (C:\\Usuários)</h3><div class="fx-drives">${homes.map((account) => `<button type="button" class="fx-drive" data-user-home="${escapeHtml(account.id)}"><img src="${winIcon("users-folder", 48)}" alt="" /><span><strong>${escapeHtml(account.username)}</strong><small>${account.id === currentUser.id ? "Seu perfil" : "Pasta pessoal protegida"}</small></span></button>`).join("")}</div></section>`,
    });
  }

  function recentFiles() {
    return OSLab.fileSystem.search("", null).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)).slice(0, 20);
  }
  function renderExplorerHome(record) {
    fxTrack(record, "home");
    record.previousExplorerView = "home";
    record.currentFolderId = null;
    const recent = recentFiles();
    record.content.innerHTML = explorerFrame(record, {
      title: "Início", icon: winIcon("home", 16), crumbs: [["Início", "home"]], active: "home", count: folders.length + recent.length, commands: lockedCommands(record),
      body: `<section class="fx-section"><h3>${fxIc("chevron-down")}Acesso rápido</h3><div class="fx-quick">${folders.map((folder) => `<button type="button" class="fx-qtile" data-folder="${folder.id}"><img src="${winIcon(folder.big, 48)}" alt="" /><span><strong>${folder.name}</strong><small>Este Computador</small></span>${fxIc("fx-pin")}</button>`).join("")}</div></section>
        <section class="fx-section"><h3>${fxIc("chevron-down")}Recentes</h3><div class="fx-recent" role="list">${recent.map((item) => `<button type="button" class="fx-row is-recent ${record.explorerSelection === item.id ? "is-selected" : ""}" data-file-item="${item.id}" role="listitem"><span class="fx-name"><img src="${fileIcon(item, 48)}" alt="" /><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(OSLab.fileSystem.pathLabel(item.parentId))}</small></span></span><span>${fxDate(item.updatedAt || item.createdAt)}</span></button>`).join("") || '<p class="fx-empty">Os arquivos que você abrir ou criar aparecem aqui.</p>'}</div></section>`,
    });
  }

  function itemsMarkup(record, items, view) {
    if (!items.length) return `<div class="fx-list-empty"><p class="fx-empty">Esta pasta está vazia.</p></div>`;
    const sort = record.fxSort || { key: "name", dir: "asc" };
    const head = (key, text) => `<button type="button" data-fx-sort="${key}">${text}${sort.key === key ? fxIc(sort.dir === "asc" ? "chevron-up" : "chevron-down") : ""}</button>`;
    if (view === "details") return `<div class="fx-table"><div class="fx-thead">${head("name", "Nome")}${head("date", "Data de modificação")}${head("type", "Tipo")}${head("size", "Tamanho")}</div><div class="fx-rows" role="list">${items.map((item) => `<button type="button" class="fx-row ${record.explorerSelection === item.id ? "is-selected" : ""}" data-file-item="${item.id}" role="listitem"><span class="fx-name"><img src="${fileIcon(item, 48)}" alt="" /><strong>${escapeHtml(item.name)}</strong></span><span>${fxDate(item.updatedAt || item.createdAt)}</span><span>${fileType(item)}</span><span class="fx-size">${item.kind === "folder" ? "" : OSLab.systemTools.formatBytes(OSLab.fileSystem.bytesForItem(item.id))}</span></button>`).join("")}</div></div>`;
    return `<div class="fx-grid is-${view}" role="list">${items.map((item) => `<button type="button" class="fx-tile ${record.explorerSelection === item.id ? "is-selected" : ""}" data-file-item="${item.id}" role="listitem" title="${escapeHtml(item.name)}"><img src="${fileIcon(item, view === "list" ? 48 : 256)}" alt="" /><strong>${escapeHtml(item.name)}</strong></button>`).join("")}</div>`;
  }
  function sortItems(record, items) {
    const sort = record.fxSort || { key: "name", dir: "asc" };
    const value = (item) => sort.key === "date" ? item.updatedAt || item.createdAt || 0 : sort.key === "size" ? OSLab.fileSystem.bytesForItem(item.id) : sort.key === "type" ? fileType(item) : item.name;
    return items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      const av = value(a), bv = value(b), result = typeof av === "string" ? av.localeCompare(bv, "pt-BR") : av - bv;
      return sort.dir === "asc" ? result : -result;
    });
  }

  function renderFolder(record, folderId) {
    const folder = folders.find((entry) => entry.id === folderId) || OSLab.fileSystem.get(folderId);
    if (!folder) return;
    fxTrack(record, `folder:${folderId}`);
    record.currentFolderId = folderId;
    record.explorerSelection = OSLab.fileSystem.get(record.explorerSelection)?.parentId === folderId ? record.explorerSelection : null;
    record.explorerQuery = "";
    record.previousExplorerView = folderId;
    const items = sortItems(record, OSLab.fileSystem.list(folderId));
    const view = record.fxView?.[folderId] || defaultView(folderId);
    const chain = []; let cursor = OSLab.fileSystem.get(folderId) || folder;
    while (cursor) { chain.unshift(cursor); cursor = cursor.parentId ? OSLab.fileSystem.get(cursor.parentId) : null; }
    const root = folders.find((entry) => entry.id === chain[0]?.id);
    const name = folder.name;
    const sel = Boolean(record.explorerSelection);
    record.content.innerHTML = explorerFrame(record, {
      title: name, icon: winIcon(root?.small || "folder", 16), crumbs: chain.map((entry) => [entry.name, `folder:${entry.id}`]), active: root?.id || folderId, up: true, searchable: true, count: items.length, view, views: true,
      commands: `<div class="fx-dd">${dropdown(record, "new", "fx-add_circle", "Novo")}</div><i class="fx-sep"></i>${commandButton("fx-cut", "Recortar", 'data-file-action="cut"', sel)}${commandButton("fx-copy", "Copiar", 'data-file-action="copy"', sel)}${commandButton("fx-clipboard_paste", "Colar", 'data-file-action="paste"', Boolean(fileClipboard))}${commandButton("fx-rename", "Renomear", 'data-file-action="rename"', sel)}${commandButton("fx-share", "Compartilhar", 'data-fx="share" data-file-action="properties"', sel)}${commandButton("fx-delete", "Excluir", 'data-file-action="delete"', sel)}<i class="fx-sep"></i>${dropdown(record, "sort", "fx-arrow_sort", "Classificar")}${dropdown(record, "view", "fx-apps_list", "Visualizar")}<i class="fx-sep"></i>${commandButton("more", "Ver mais", 'data-fx-menu="more"')}`,
      body: `<section class="fx-files" data-current-folder="${folderId}">${itemsMarkup(record, items, view)}</section>`,
    });
  }

  function beginExplorerRename(record, itemId) {
    const row = $(`[data-file-item="${itemId}"]`, record.content);
    const item = OSLab.fileSystem.get(itemId);
    const label = row?.querySelector("strong");
    if (!row || !item || !label) return;
    const input = document.createElement("input");
    input.className = "file-rename-input";
    input.value = item.name;
    input.setAttribute("aria-label", "Novo nome");
    label.replaceWith(input);
    input.focus(); input.select();
    let finished = false;
    const finish = (save) => {
      if (finished) return; finished = true;
      if (save && input.value.trim()) OSLab.fileSystem.rename(item.id, input.value.trim());
      renderFolder(record, item.parentId);
    };
    input.addEventListener("blur", () => finish(true));
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") finish(true); if (event.key === "Escape") finish(false); });
  }

  function renderExplorerSearch(record, query) {
    const holder = $(".fx-files", record.content);
    if (!holder) return;
    const results = OSLab.fileSystem.search(query, record.currentFolderId);
    holder.innerHTML = query.trim() ? `<div class="fx-table"><div class="fx-thead"><span>Nome</span><span>Data de modificação</span><span>Tipo</span><span>Local</span></div><div class="fx-rows" role="list">${results.map((item) => `<button type="button" class="fx-row is-search-result" data-file-item="${item.id}" role="listitem"><span class="fx-name"><img src="${fileIcon(item, 48)}" alt="" /><strong>${escapeHtml(item.name)}</strong></span><span>${fxDate(item.updatedAt || item.createdAt)}</span><span>${fileType(item)}</span><span>${escapeHtml(OSLab.fileSystem.pathLabel(item.parentId))}</span></button>`).join("") || `<p class="fx-empty">Nenhum item corresponde à sua pesquisa.</p>`}</div></div>` : itemsMarkup(record, sortItems(record, OSLab.fileSystem.list(record.currentFolderId)), record.fxView?.[record.currentFolderId] || defaultView(record.currentFolderId));
    OSLab.events.emit("file:searched", { query, parentFolderId: record.currentFolderId, resultIds: results.map((item) => item.id) }, "explorer");
  }

  function renderTextFile(record, fileId) {
    const file = OSLab.fileSystem.get(fileId);
    if (!file) return;
    fxTrack(record, `file:${file.id}`);
    record.fileViewId = file.id;
    record.previousExplorerView = file.parentId;
    const editable = file.mime === "text/plain" || file.name.toLocaleLowerCase("pt-BR").endsWith(".txt");
    const canModifyFile = OSLab.fileSystem.canModify(file);
    const parent = OSLab.fileSystem.get(file.parentId);
    record.content.innerHTML = explorerFrame(record, {
      title: file.name, icon: fileIcon(file, 16), crumbs: [[parent?.name || "Pasta", `folder:${file.parentId}`], [file.name, `file:${file.id}`]], active: file.parentId, up: true, count: 1, commands: lockedCommands(record),
      body: editable ? `<section class="text-file-view"><header><img src="assets/icons/notepad.png" alt="" /><strong>${escapeHtml(file.name)}</strong><span>${canModifyFile ? "Salvo automaticamente" : "Somente leitura"}</span></header><textarea data-text-file="${file.id}" aria-label="Conteúdo de ${escapeHtml(file.name)}" placeholder="Comece a digitar..." ${canModifyFile ? "" : "readonly"}>${escapeHtml(file.content || "")}</textarea></section>`
        : `<section class="generic-file-view"><img src="${fileIcon(file, 256)}" alt="" /><h2>${escapeHtml(file.name)}</h2><p>${fileType(file)}</p><span>Visualização educacional do OSLab</span></section>`,
    });
  }

  function renderRecycleBin(record) {
    fxTrack(record, "recycle");
    record.previousExplorerView = "recycle";
    record.currentFolderId = null;
    const recycleItems = OSLab.fileSystem.recycleItems();
    const selectedId = record.recycleSelection && recycleItems.some((item) => item.id === record.recycleSelection) ? record.recycleSelection : null;
    record.recycleSelection = selectedId;
    const rows = recycleItems.map((item) => `<button type="button" class="fx-row ${selectedId === item.id ? "is-selected" : ""}" data-recycle-item="${item.id}"><span class="fx-name"><img src="${fileIcon(item, 48)}" alt="" /><strong>${escapeHtml(item.name)}</strong></span><span>${escapeHtml(OSLab.fileSystem.pathLabel(item.originalParentId))}</span><span>${fxDate(item.trashedAt)}</span><span class="fx-size">${OSLab.systemTools.formatBytes(OSLab.fileSystem.bytesForItem(item.id))}</span></button>`).join("");
    const button = (action, icon, text, enabled) => `<button type="button" class="fx-ddbtn" data-recycle-action="${action}" ${enabled ? "" : "disabled"}>${icon}<span>${text}</span></button>`;
    record.content.innerHTML = explorerFrame(record, {
      title: "Lixeira", icon: recycleIcon(16), crumbs: [["Lixeira", "recycle"]], active: "recycle", count: recycleItems.length,
      commands: `${button("empty", `<img src="${winIcon("recycle-empty", 16)}" alt="" />`, "Esvaziar Lixeira", recycleItems.length > 0)}${button("restore-all", fxIc("fx-arrow_undo"), "Restaurar todos os itens", recycleItems.length > 0)}${button("restore", fxIc("fx-arrow_undo"), "Restaurar os itens selecionados", Boolean(selectedId))}<i class="fx-sep"></i>${commandButton("fx-delete", "Excluir permanentemente", 'data-recycle-action="delete"', Boolean(selectedId))}`,
      body: recycleItems.length ? `<div class="fx-table" role="table" aria-label="Itens da Lixeira"><div class="fx-thead" role="row"><span>Nome</span><span>Local original</span><span>Data da exclusão</span><span>Tamanho</span></div><div class="fx-rows">${rows}</div></div>` : `<div class="fx-empty-state"><img src="${winIcon("recycle-empty", 256)}" alt="" /><p>A Lixeira está vazia.</p></div>`,
    });
  }

  /** cliques da moldura do Explorador: navegação, menus, modos de exibição e painel de detalhes */
  function handleExplorerChrome(record, event) {
    const t = event.target;
    const nav = t.closest("[data-fx]")?.dataset.fx;
    const go = t.closest("[data-fx-go]")?.dataset.fxGo;
    const menu = t.closest("[data-fx-menu]")?.dataset.fxMenu;
    const view = t.closest("[data-fx-view]")?.dataset.fxView;
    const sort = t.closest("[data-fx-sort]")?.dataset.fxSort;
    const dir = t.closest("[data-fx-dir]")?.dataset.fxDir;
    const insideMenu = t.closest(".fx-menu");
    if (menu) { record.fxMenu = record.fxMenu === menu ? null : menu; renderApp(record); return true; }
    if (nav === "back" || nav === "forward") { fxStep(record, nav); return true; }
    if (nav === "up") {
      const current = record.fxCurrent || "";
      const id = current.startsWith("folder:") ? current.slice(7) : current.startsWith("file:") ? OSLab.fileSystem.get(current.slice(5))?.parentId : null;
      const parent = id && OSLab.fileSystem.get(id)?.parentId;
      fxGo(record, current.startsWith("file:") ? `folder:${id}` : parent ? `folder:${parent}` : "computer");
      return true;
    }
    if (nav === "refresh") { record.fxMenu = null; record.fxNavigating = true; try { fxGo(record, record.fxCurrent || "home"); } finally { record.fxNavigating = false; } return true; }
    if (nav === "details") { record.fxDetails = !record.fxDetails; record.fxMenu = null; renderApp(record); return true; }
    if (nav === "share") return false;
    if (go) { fxGo(record, go); return true; }
    if (view && record.currentFolderId) { (record.fxView ||= {})[record.currentFolderId] = view; record.fxMenu = null; renderFolder(record, record.currentFolderId); return true; }
    if (sort || dir) { record.fxSort = { key: sort || record.fxSort?.key || "name", dir: dir || (sort && record.fxSort?.key === sort && record.fxSort?.dir === "asc" ? "desc" : sort ? "asc" : record.fxSort?.dir || "asc") }; record.fxMenu = null; renderFolder(record, record.currentFolderId); return true; }
    if (record.fxMenu && !insideMenu) { record.fxMenu = null; $(".fx-menu", record.content)?.remove(); $$(".fx-ddbtn.is-open", record.content).forEach((b) => b.classList.remove("is-open")); }
    if (record.fxMenu && insideMenu && t.closest("[data-file-action]")) record.fxMenu = null;
    return false;
  }
  function renderExplorerApp(record) {
    if (record.fxCurrent) { record.fxNavigating = true; try { fxGo(record, record.fxCurrent, true); } finally { record.fxNavigating = false; } return; }
    if (record.appId === "computer") renderComputer(record);
    else if (record.appId === "recycle") renderRecycleBin(record);
    else renderExplorerHome(record);
  }

  function renderTaskManager(record, query = record.taskQuery || "") {
    record.taskQuery = query;
    record.address.textContent = "Processos";
    const titleSearchInput = $("input", record.settingsSearch);
    if (titleSearchInput && titleSearchInput.value !== query) titleSearchInput.value = query;
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const visibleProcesses = taskProcesses.filter((process) =>
      process.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery) || String(process.pid).includes(normalizedQuery),
    );
    if (!visibleProcesses.some((process) => process.id === record.selectedProcessId)) record.selectedProcessId = null;

    const navItems = [
      ["processes", "Processos", "assets/icons/taskmanager/details.png"],
      ["performance", "Desempenho", "assets/icons/taskmanager/performance.png"],
      ["history", "Histórico de aplicativos", "assets/icons/taskmanager/history.png"],
      ["startup", "Aplicativos de inicialização", "assets/icons/taskmanager/startup.png"],
      ["users", "Usuários", "assets/icons/taskmanager/users.png"],
      ["details", "Detalhes", "assets/icons/taskmanager/details.png"],
      ["services", "Serviços", "assets/icons/taskmanager/services.png"],
    ];
    const processRows = visibleProcesses
      .map((process) => `
        <button type="button" class="task-process-row ${record.selectedProcessId === process.id ? "is-selected" : ""}" data-process-id="${process.id}">
          <span class="task-process-name"><img src="${process.icon}" alt="" /><strong>${process.name}</strong></span>
          <span class="task-process-status"></span>
          <span class="task-use">${process.cpu.toLocaleString("pt-BR", { minimumFractionDigits: process.cpu ? 1 : 0 })}%</span>
          <span class="task-use">${process.memory.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} MB</span>
          <span class="task-use">${process.disk ? process.disk.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) : "0"} MB/s</span>
          <span class="task-use">${process.network} Mbps</span>
        </button>`)
      .join("");

    record.content.innerHTML = `
      <section class="taskmanager-page">
        <aside class="taskmanager-sidebar" aria-label="Navegação do Gerenciador de Tarefas">
          <div class="taskmanager-hamburger"><img src="assets/icons/taskmanager/more.png" alt="" /></div>
          <nav>${navItems.map(([id, label, icon]) => `
            <button type="button" class="${id === "processes" ? "is-active" : ""}" data-task-nav="${id}">
              <img src="${icon}" alt="" /><span>${label}</span>
            </button>`).join("")}</nav>
          <button type="button" class="taskmanager-settings" data-task-nav="settings">
            <img src="assets/icons/taskmanager/settings.png" alt="" /><span>Configurações</span>
          </button>
        </aside>
        <div class="taskmanager-workspace">
          <div class="taskmanager-commandbar">
            <h2>Processos</h2>
            <div>
              <button type="button" data-task-action="run"><img src="assets/icons/taskmanager/run.png" alt="" /><span>Executar nova tarefa</span></button>
              <button type="button" data-task-action="end" ${record.selectedProcessId ? "" : "disabled"}><img src="assets/icons/context/delete.png" alt="" /><span>Finalizar tarefa</span></button>
              <button type="button" disabled><img src="assets/icons/taskmanager/performance.png" alt="" /><span>Modo de eficiência</span></button>
              <button type="button" aria-label="Mais opções"><img src="assets/icons/taskmanager/more.png" alt="" /></button>
            </div>
          </div>
          <div class="task-process-table" role="table" aria-label="Processos em execução">
            <div class="task-process-head" role="row">
              <span>Nome</span><span>Status</span><span><strong>2%</strong>CPU</span><span><strong>18%</strong>Memória</span><span><strong>0%</strong>Disco</span><span><strong>0%</strong>Rede</span>
            </div>
            <div class="task-process-rows">
              ${processRows}
              <p class="task-no-results ${visibleProcesses.length ? "is-hidden" : ""}">Nenhum processo encontrado.</p>
            </div>
          </div>
        </div>
      </section>`;
  }

  function renderGoogle(record) {
    if (OSLab.browserApp) { OSLab.browserApp.render(record); return; }
    record.address.textContent = "https://www.google.com.br";
    record.content.innerHTML = `
      <section class="google-page">
        <img class="google-logo" src="assets/icons/google.png" alt="Google" />
        <h2 class="google-wordmark">Google</h2>
        <form class="google-search-form" data-google-form>
          <img src="assets/icons/search.png" alt="" />
          <input name="q" type="search" aria-label="Pesquisar no Google" placeholder="Pesquise no Google" autocomplete="off" />
          <button type="submit">Pesquisar</button>
        </form>
        <p class="google-hint">A pesquisa usa a rede virtual do OSLab e funciona sem internet real.</p>
      </section>`;
  }

  function renderTerminal(record) {
    if (OSLab.terminalApp) { OSLab.terminalApp.render(record); return; }
    const username = OSLab.users.getCurrent()?.username || "Aluno";
    record.address.textContent = "Terminal";
    record.content.innerHTML = `
      <section class="terminal-page" aria-label="Terminal do OSLab">
        <p>Microsoft Windows [versão 11.0.26100.4652]</p>
        <p>(c) OSLab. Todos os direitos reservados.</p>
        <p class="terminal-prompt">C:\\Users\\${escapeHtml(username)}&gt;<span aria-hidden="true"></span></p>
      </section>`;
  }

  function renderTextEditor(record) {
    const title = record.options?.title || "Editor de Texto";
    record.title.textContent = record.frozen ? `${title} (Não respondendo)` : title;
    record.element.classList.toggle("is-not-responding", Boolean(record.frozen));
    record.address.textContent = record.frozen ? "Não respondendo" : "Documento sem título";
    record.content.innerHTML = `<section class="editor-app ${record.frozen ? "is-frozen" : ""}">
      <header><button type="button" ${record.frozen ? "disabled" : ""}>Arquivo</button><button type="button" ${record.frozen ? "disabled" : ""}>Editar</button><span>${record.frozen ? "O aplicativo não está respondendo" : "Salvo localmente no simulador"}</span></header>
      <textarea ${record.frozen ? "disabled" : ""} aria-label="Editor de texto" placeholder="Digite seu texto aqui...">${escapeHtml(record.options?.text || (record.frozen ? "O Editor de Texto parou de responder. Use o Gerenciador de Tarefas para encerrar este processo." : ""))}</textarea>
    </section>`;
  }

  function settingsNavMarkup(active) {
    return settingsSections
      .map(
        (section) => `
          <button
            type="button"
            class="settings-nav-item ${active === section.id ? "is-active" : ""}"
            data-settings-page="${section.id}"
            data-settings-label="${section.name.toLocaleLowerCase("pt-BR")}"
          >
            <img src="${section.icon}" alt="" />
            <span>${section.name}</span>
          </button>`,
      )
      .join("");
  }

  function wallpaperOptionsMarkup(compact = false) {
    return wallpapers
      .map(
        (wallpaper) => `
          <button
            type="button"
            class="wallpaper-option ${compact ? "is-compact" : ""} ${wallpaper.id === currentWallpaperId ? "is-selected" : ""}"
            data-wallpaper="${wallpaper.id}"
            aria-label="Usar o fundo ${wallpaper.name}"
            aria-pressed="${wallpaper.id === currentWallpaperId}"
          >
            <img src="${wallpaper.src}" alt="${wallpaper.name}" />
          </button>`,
      )
      .join("");
  }

  function settingsShellMarkup(active, mainContent) {
    const current = OSLab.users.getCurrent() || OSLab.users.getSelected();
    return `
      <div class="settings-shell">
        <aside class="settings-sidebar" aria-label="Categorias das Configurações">
          <div class="settings-profile">
            <img src="${escapeHtml(current.avatar)}" alt="Perfil de ${escapeHtml(current.displayName)}" />
            <span><strong>${escapeHtml(current.displayName)}</strong><small>${current.role === "administrator" ? "Administrador" : "Usuário padrão"} · Conta local</small></span>
          </div>
          <label class="settings-sidebar-search"><img src="assets/icons/search.png" alt="" /><input type="search" data-settings-search placeholder="Localizar uma configuração" aria-label="Pesquisar categorias de configurações" /></label>
          <nav class="settings-nav">${settingsNavMarkup(active)}</nav>
        </aside>
        <main class="settings-main">${mainContent}</main>
      </div>`;
  }

  function settingsHomeMarkup() {
    const network = OSLab.network.getSnapshot();
    return `
      <header class="settings-page-heading">
        <h1>Início</h1>
      </header>
      <section class="settings-overview" aria-label="Resumo do dispositivo">
        <div class="settings-device-summary">
          <img data-current-wallpaper src="${wallpapers.find((item) => item.id === currentWallpaperId).src}" alt="Plano de fundo atual" />
          <span><strong>OSLAB-ALUNO</strong><small>Computador virtual</small><button type="button">Renomear</button></span>
        </div>
        <div class="settings-status-summary">
          <img src="assets/settings/Network-internet.webp" alt="" />
          <span><strong>${network.connectionType === "ethernet" ? "Ethernet" : network.connectedSsid || "Wi-Fi"}</strong><small>${network.internetAvailable ? "Conectado, seguro" : "Sem conexão"}</small></span>
        </div>
        <div class="settings-status-summary">
          <img src="assets/settings/Windows-Update.webp" alt="" />
          <span><strong>Windows Update</strong><small>Está tudo atualizado</small></span>
        </div>
      </section>
      <section class="settings-home-grid">
        <article class="settings-card recommended-card">
          <header>
            <h2>Configurações recomendadas</h2>
            <p>Configurações recentes e comumente usadas</p>
          </header>
          <button type="button" class="settings-row" data-settings-page="system">
            <img src="assets/settings/System.webp" alt="" />
            <span>Tela</span>
            <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
          </button>
          <button type="button" class="settings-row" data-settings-page="network">
            <img src="assets/settings/Network-internet.webp" alt="" />
            <span>Wi-Fi</span><small>${state.quickSettings.wifi ? "Ativado" : "Desativado"}</small>
            <span class="settings-switch ${state.quickSettings.wifi ? "is-active" : ""}" aria-hidden="true"></span>
            <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
          </button>
          <button type="button" class="settings-row" data-settings-page="time">
            <img src="assets/settings/Time-language.webp" alt="" />
            <span>Data e hora</span>
            <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
          </button>
        </article>
        <article class="settings-card personalize-card">
          <header>
            <img src="assets/settings/Personalisation.webp" alt="" />
            <div><h2>Personalizar seu dispositivo</h2><p>Escolha um dos fundos disponíveis no OSLab</p></div>
          </header>
          <div class="wallpaper-grid is-home">${wallpaperOptionsMarkup(true)}</div>
          <button type="button" class="settings-row personalize-more" data-settings-page="personalization">
            <img src="assets/settings/Personalisation.webp" alt="" />
            <span>Plano de fundo, cores e temas</span>
            <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
          </button>
        </article>
      </section>`;
  }

  function settingsRowsMarkup(rows) {
    return rows
      .map(
        (row) => `
          <button
            type="button"
            class="settings-row detailed-settings-row"
            ${row.page ? `data-settings-page="${row.page}"` : ""}
            ${row.toggle ? `data-state-toggle="${row.toggle}"` : ""}
          >
            ${OSLab.windowsIcons.markup(row.name, row.icon)}
            <span><strong>${row.name}</strong><small>${row.description}</small></span>
            ${row.action ? `<em>${row.action}</em>` : ""}
            ${row.toggle ? `<small class="settings-toggle-label">${state.quickSettings[row.toggle] ? "Ativado" : "Desativado"}</small><span class="settings-switch ${state.quickSettings[row.toggle] ? "is-active" : ""}" aria-hidden="true"></span>` : ""}
            <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
          </button>`,
      )
      .join("");
  }

  function settingsSystemMarkup() {
    const rows = [
      { name: "Tela", description: "Monitores, brilho, luz noturna, perfil de exibição", icon: "assets/icons/context/display.png" },
      { name: "Som", description: "Níveis de volume, saída, entrada, dispositivos de som", icon: "assets/icons/settings-rows/sound.png", page: "sound" },
      { name: "Notificações", description: "Alertas de aplicativos e do sistema, não incomodar", icon: "assets/settings/Windows-Update.webp" },
      { name: "Foco", description: "Reduza as distrações", icon: "assets/icons/settings-rows/focus.png" },
      { name: "Energia", description: "Tela e suspensão, modo de energia, economia de energia", icon: "assets/icons/ui/power.png" },
      { name: "Armazenamento", description: "Espaço de armazenamento, unidades, regras de configuração", icon: "assets/icons/settings-rows/storage.png", page: "storage" },
      { name: "Compartilhamento por proximidade", description: "Capacidade de descoberta, local de arquivos recebidos", icon: "assets/icons/settings-rows/nearshare.png" },
      { name: "Multitarefas", description: "Ajustar janelas, áreas de trabalho, mudança de tarefas", icon: "assets/icons/settings-rows/multitasking.png" },
      { name: "Avançado", description: "Desempenho, otimização e recursos de desenvolvedor", icon: "assets/icons/settings.png" },
      { name: "Ativação", description: "Estado de ativação, assinaturas, chave do produto", icon: "assets/icons/settings-rows/vpn.png" },
      { name: "Solução de Problemas", description: "Soluções de problemas recomendadas, preferências, histórico", icon: "assets/icons/settings-rows/troubleshoot.png" },
    ];
    const current = wallpapers.find((item) => item.id === currentWallpaperId) || wallpapers[0];
    return `
      <header class="settings-page-heading"><h1>Sistema</h1></header>
      <section class="settings-category-hero system-hero">
        <div class="settings-device-summary">
          <img data-current-wallpaper src="${current.src}" alt="Plano de fundo atual" />
          <span><strong>OSLAB-ALUNO</strong><small>Computador virtual</small><button type="button">Renomear</button></span>
        </div>
        <div class="settings-status-summary update-summary">
          <img src="assets/settings/Windows-Update.webp" alt="" />
          <span><strong>Windows Update</strong><small>Está tudo atualizado</small></span>
        </div>
      </section>
      <article class="settings-card detailed-settings-card">${settingsRowsMarkup(rows)}</article>`;
  }

  function settingsBluetoothMarkup() {
    const rows = [
      { name: "Dispositivos", description: "Mouse, teclado, caneta, áudio, telas e encaixes, outros dispositivos", icon: "assets/icons/settings-rows/devices.png", action: "Adicionar dispositivo" },
      { name: "Impressoras e scanners", description: "Preferências", icon: "assets/icons/explorer.png" },
      { name: "Dispositivos móveis", description: "Acesse instantaneamente seus dispositivos móveis por meio do computador", icon: "assets/icons/settings-rows/mobile.png" },
      { name: "Câmeras", description: "Câmeras conectadas, configurações de imagem padrão", icon: "assets/icons/settings-rows/camera.png" },
      { name: "Mouse", description: "Botões, velocidade do ponteiro do mouse, rolagem", icon: "assets/icons/settings-rows/devices.png" },
      { name: "Teclado", description: "Repetição de caracteres, teclas de atalho", icon: "assets/icons/settings-rows/keyboard.png" },
      { name: "Caneta e Windows Ink", description: "Destro ou canhoto, botão de atalho da caneta, manuscrito", icon: "assets/icons/context/rename.png" },
      { name: "Reprodução Automática", description: "Padrões para unidades de disco removíveis e cartões de memória", icon: "assets/icons/settings-rows/video.png" },
      { name: "USB", description: "Notificações, economia de bateria USB", icon: "assets/icons/settings-rows/usb.png" },
    ];
    return `<header class="settings-page-heading"><h1>Bluetooth e dispositivos</h1></header><article class="settings-card detailed-settings-card">${settingsRowsMarkup(rows)}</article>`;
  }

  function settingsNetworkMarkup() {
    return OSLab.systemTools.networkMarkup();
  }

  function settingsPersonalizationOverviewMarkup() {
    const rows = [
      { name: "Tela de fundo", description: "Imagem de tela de fundo, cor, apresentação de slides", icon: "assets/icons/settings-rows/personalize.png", page: "background" },
      { name: "Cores", description: "Cor de destaque, efeitos de transparência, tema de cor", icon: "assets/icons/settings-rows/colors.png", page: "colors" },
      { name: "Temas", description: "Instalar, criar, gerenciar", icon: "assets/icons/settings-rows/themes.png" },
      { name: "Iluminação Dinâmica", description: "Dispositivos conectados, efeitos, configurações do aplicativo", icon: "assets/icons/ui/brightness.png" },
      { name: "Tela de bloqueio", description: "Imagens da tela de bloqueio, aplicativos, animações", icon: "assets/icons/settings-rows/lock.png" },
      { name: "Entrada de texto", description: "Teclado virtual, digitação por voz, emojis e muito mais, IME", icon: "assets/icons/settings-rows/keyboard.png" },
      { name: "Iniciar", description: "Itens e aplicativos recentes, pastas", icon: "assets/icons/start.png" },
      { name: "Barra de Tarefas", description: "Comportamentos da barra de tarefas, itens fixados do sistema", icon: "assets/icons/settings-rows/multitasking.png" },
      { name: "Fontes", description: "Instalar, gerenciar", icon: "assets/icons/notepad.png" },
      { name: "Uso do dispositivo", description: "Personalize sugestões com base em como você usa o computador", icon: "assets/icons/settings.png" },
    ];
    const current = wallpapers.find((item) => item.id === currentWallpaperId) || wallpapers[0];
    return `
      <header class="settings-page-heading"><h1>Personalização</h1></header>
      <section class="personalization-hero">
        <div class="personalization-preview"><img data-current-wallpaper src="${current.src}" alt="${current.name}" /><span></span></div>
        <div class="personalization-themes"><strong>Selecionar um plano de fundo</strong><div class="wallpaper-grid is-overview">${wallpaperOptionsMarkup(true)}</div></div>
      </section>
      <article class="settings-card os-theme-settings"><h2>Escolha o seu modo</h2>${themeCardsMarkup()}</article>
      <article class="settings-card detailed-settings-card">${settingsRowsMarkup(rows)}</article>`;
  }

  function settingsAppsMarkup() {
    const rows = [
      { name: "Aplicativos instalados", description: "Desinstalar e gerenciar aplicativos no computador", icon: "assets/settings/Apps.webp", page: "installed-apps" },
      { name: "Configurações avançadas dos aplicativos", description: "Escolha onde obter aplicativos, arquivar aplicativos, desinstalar atualizações", icon: "assets/icons/settings.png" },
      { name: "Aplicativos padrão", description: "Padrões para tipos de arquivos e de links, outros padrões", icon: "assets/icons/chrome.png" },
      { name: "Ações", description: "O Windows pode recomendar ações desses aplicativos.", icon: "assets/icons/context/new.png" },
      { name: "Mapas offline", description: "Downloads, local de armazenamento, atualizações de mapa", icon: "assets/icons/settings-rows/maps.png" },
      { name: "Aplicativos para sites", description: "Sites que podem ser abertos em um aplicativo, em vez de um navegador", icon: "assets/icons/context/link.png" },
      { name: "Reprodução de vídeo", description: "Ajustes de vídeo, streaming HDR, opções de bateria", icon: "assets/icons/settings-rows/video.png" },
      { name: "Inicialização", description: "Aplicativos iniciados automaticamente quando você entra", icon: "assets/icons/ui/power.png" },
      { name: "Continuar", description: "Continuar o trabalho nos diferentes dispositivos", icon: "assets/icons/settings-rows/devices.png" },
    ];
    return `<header class="settings-page-heading"><h1>Aplicativos</h1></header><article class="settings-card detailed-settings-card">${settingsRowsMarkup(rows)}</article>`;
  }

  function settingsTimeMarkup() {
    const rows = [
      { name: "Data e hora", description: "Fusos horários, configurações automáticas do relógio, exibição do calendário", icon: "assets/icons/settings-rows/calendar.png" },
      { name: "Idioma e região", description: "Idioma de exibição do Windows, idiomas preferenciais, formatos regionais", icon: "assets/icons/settings-rows/location.png" },
      { name: "Digitação", description: "Teclado virtual, sugestões de texto, preferências", icon: "assets/icons/settings-rows/keyboard.png" },
      { name: "Fala", description: "Idioma de fala, configuração do microfone de reconhecimento de fala, vozes", icon: "assets/icons/settings-rows/voice.png" },
    ];
    return `
      <header class="settings-page-heading"><h1>Hora e idioma</h1></header>
      <section class="settings-time-hero">
        <div class="settings-live-time"><strong data-settings-time>--:--</strong><small data-settings-date></small></div>
        <div class="time-stat"><img src="assets/icons/settings-rows/calendar.png" alt="" /><span><strong>Fuso horário</strong><small>(UTC-03:00) Fortaleza</small></span></div>
        <div class="time-stat"><img src="assets/icons/settings-rows/location.png" alt="" /><span><strong>Região</strong><small>Brasil</small></span></div>
      </section>
      <article class="settings-card detailed-settings-card">${settingsRowsMarkup(rows)}</article>`;
  }

  function settingsBackgroundMarkup() {
    const current = wallpapers.find((item) => item.id === currentWallpaperId) || wallpapers[0];
    return `
      <header class="settings-page-heading with-back">
        <button type="button" data-settings-back="personalization" aria-label="Voltar para Personalização">
          <img src="assets/icons/ui/left.png" alt="" />
        </button>
        <div><small>Personalização</small><h1>Plano de fundo</h1></div>
      </header>
      <article class="settings-card wallpaper-settings-card">
        <div class="wallpaper-preview">
          <img data-current-wallpaper src="${current.src}" alt="${current.name}" />
        </div>
        <div class="wallpaper-current-copy">
          <img src="assets/settings/Personalisation.webp" alt="" />
          <span><strong>Personalize seu plano de fundo</strong><small data-wallpaper-name>${current.name}</small></span>
        </div>
        <div class="wallpaper-picker-heading">
          <span><strong>Escolha uma imagem</strong><small>A alteração é aplicada imediatamente e fica salva neste navegador.</small></span>
        </div>
        <div class="wallpaper-grid is-settings">${wallpaperOptionsMarkup()}</div>
        <label class="settings-select-row">
          <span><strong>Escolher um ajuste</strong><small>Defina como a imagem preenche a área de trabalho.</small></span>
          <select aria-label="Ajuste da imagem">
            <option>Preencher</option>
            <option>Ajustar</option>
            <option>Estender</option>
            <option>Centralizar</option>
          </select>
        </label>
      </article>`;
  }

  function settingsAccountsMarkup(record, pageId) {
    const current = OSLab.users.getCurrent() || OSLab.users.getSelected();
    if (pageId === "accounts") {
      return `<header class="settings-page-heading"><h1>Contas</h1></header>
        <section class="accounts-hero"><img src="${escapeHtml(current.avatar)}" alt="" /><div><h2>${escapeHtml(current.displayName)}</h2><p>${escapeHtml(current.username)} · ${current.role === "administrator" ? "Administrador" : "Usuário padrão"} · Conta local</p></div></section>
        <article class="settings-card detailed-settings-card">
          <button type="button" class="settings-row detailed-settings-row" data-account-action="edit-profile">${OSLab.windowsIcons.markup("Suas informações")}<span><strong>Suas informações</strong><small>Nome exibido e imagem do perfil</small></span><img class="settings-chevron" src="assets/icons/ui/right.png" alt="" /></button>
          <button type="button" class="settings-row detailed-settings-row" data-settings-toggle>${OSLab.windowsIcons.markup("Opções de entrada")}<span><strong>Opções de entrada</strong><small>Senha local simulada e bloqueio de sessão</small></span><img class="settings-chevron" src="assets/icons/ui/right.png" alt="" /></button>
          <button type="button" class="settings-row detailed-settings-row" data-account-action="other-users">${OSLab.windowsIcons.markup("Outros usuários")}<span><strong>Outros usuários</strong><small>Adicione contas e altere tipos de conta</small></span><img class="settings-chevron" src="assets/icons/ui/right.png" alt="" /></button>
        </article>
        ${record.editingProfile ? `<form class="add-user-panel" data-profile-form><h2>Suas informações</h2><p>Personalize o nome mostrado neste perfil.</p><label>Nome exibido<input name="displayName" maxlength="48" value="${escapeHtml(current.displayName)}" required /></label><p class="account-error" data-account-error></p><footer><button class="win-button" type="button" data-account-action="cancel-profile">Cancelar</button><button class="win-button is-primary" type="submit">Salvar</button></footer></form>` : ""}`;
    }
    const others = OSLab.users.list().filter((account) => account.id !== current.id);
    const flow = Number(record.addUserStep) || 0;
    const addPanel = !flow ? "" : flow === 1 ? `<section class="add-user-panel"><h2>Como esta pessoa entrará?</h2><p>Este laboratório funciona sem internet e não solicita uma conta real.</p><footer><button class="win-button" type="button" data-account-action="cancel-add">Cancelar</button><button class="win-button is-primary" type="button" data-account-action="no-signin">Não tenho as informações de entrada desta pessoa</button></footer></section>` : flow === 2 ? `<section class="add-user-panel"><h2>Criar conta</h2><p>Escolha uma conta local fictícia para praticar neste dispositivo.</p><footer><button class="win-button" type="button" data-account-action="cancel-add">Cancelar</button><button class="win-button is-primary" type="button" data-account-action="local-account">Adicionar um usuário sem uma conta Microsoft</button></footer></section>` : `<form class="add-user-panel" data-local-account-form><h2>Criar um usuário para este computador</h2><p>Use apenas dados fictícios. A senha nunca sai deste navegador.</p><label>Nome de usuário<input name="displayName" maxlength="48" required autocomplete="off" /></label><label>Senha simulada<input name="password" type="password" minlength="4" required autocomplete="new-password" /></label><label>Confirmar senha<input name="confirmPassword" type="password" minlength="4" required autocomplete="new-password" /></label><p class="account-error" data-account-error role="status"></p><footer><button class="win-button" type="button" data-account-action="cancel-add">Cancelar</button><button class="win-button is-primary" type="submit">Avançar</button></footer></form>`;
    return `<header class="settings-page-heading with-back"><button type="button" data-settings-back="accounts" aria-label="Voltar para Contas"><img src="assets/icons/ui/left.png" alt="" /></button><div><small>Contas</small><h1>Outros usuários</h1><p>Permita que outras pessoas usem este computador com arquivos e configurações próprios.</p></div></header>
      <article class="settings-card generic-settings-card"><div class="settings-row generic-settings-row"><img src="assets/settings/Accounts.webp" alt="" /><span><strong>Adicionar outro usuário</strong><small>Crie uma conta local fictícia neste computador</small></span><button class="win-button" type="button" data-account-action="add">Adicionar conta</button></div></article>
      ${addPanel}
      <section class="accounts-list" aria-label="Contas neste computador">${others.map((account) => `<article class="account-card"><button type="button" data-account-expand="${escapeHtml(account.id)}" aria-expanded="${record.expandedAccountId === account.id}"><img src="${escapeHtml(account.avatar)}" alt="" /><span><strong>${escapeHtml(account.displayName)}</strong><small>${account.role === "administrator" ? "Administrador" : "Usuário padrão"} · Conta local</small></span><img class="settings-chevron" src="assets/icons/ui/right.png" alt="" /></button>${record.expandedAccountId === account.id ? `<div class="account-card-actions"><label>Tipo de conta <select data-account-role="${escapeHtml(account.id)}"><option value="standard" ${account.role === "standard" ? "selected" : ""}>Usuário padrão</option><option value="administrator" ${account.role === "administrator" ? "selected" : ""}>Administrador</option></select></label><button class="win-button" type="button" data-account-change="${escapeHtml(account.id)}">Alterar tipo de conta</button></div>` : ""}</article>`).join("") || `<article class="settings-card"><div class="settings-row"><span><strong>Nenhum outro usuário</strong><small>Adicione uma conta local para começar.</small></span></div></article>`}</section>`;
  }

  function settingsGenericMarkup(section) {
    return `
      <header class="settings-page-heading with-back">
        <button type="button" data-settings-back="home" aria-label="Voltar para Início">
          <img src="assets/icons/ui/left.png" alt="" />
        </button>
        <div><h1>${section.name}</h1><p>${section.description}</p></div>
      </header>
      <article class="settings-card generic-settings-card">
        ${(section.items || [])
          .map(
            (item, index) => `
              <button type="button" class="settings-row generic-settings-row" data-settings-toggle>
                <img src="${section.icon}" alt="" />
                <span><strong>${item}</strong><small>${index === 0 ? "Configuração principal" : "Opções do dispositivo"}</small></span>
                ${index === 0 ? '<span class="settings-switch" aria-hidden="true"></span>' : ""}
                <img class="settings-chevron" src="assets/icons/ui/right.png" alt="" />
              </button>`,
          )
          .join("")}
      </article>`;
  }

  function renderSettings(record, pageId = record.settingsView || state.lastSettingsPage || "home") {
    const isNetworkPage = ["network", "wifi", "wifi-known", "wifi-properties"].includes(pageId);
    record.element.classList.toggle("is-network-page", isNetworkPage);
    if (isNetworkPage && OSLab.wifiUI) {
      record.settingsView = pageId;
      record.address.textContent = "Rede e Internet";
      state.lastSettingsPage = pageId; saveState();
      record.content.innerHTML = settingsShellMarkup("network", pageId === "network" ? OSLab.wifiUI.networkMarkup() : OSLab.wifiUI.settingsMarkup(pageId, record));
      OSLab.wifiUI.wireSettings(record, () => renderSettings(record, record.settingsView));
      const page = pageId === "wifi-properties" ? "properties" : pageId === "wifi-known" ? "known" : pageId;
      OSLab.events.emit("wifi:page-opened", { page, ssid: record.wifiSsid || OSLab.network.getSnapshot().connectedSsid }, "settings");
      return;
    }
    if (OSLab.audioUI?.isPage(pageId)) {
      record.settingsView = pageId;
      record.address.textContent = "Som";
      state.lastSettingsPage = pageId; saveState();
      record.content.innerHTML = settingsShellMarkup("system", OSLab.audioUI.settingsMarkup(pageId));
      OSLab.audioUI.wireSettings(record, () => renderSettings(record, record.settingsView));
      return;
    }
    const isBackground = pageId === "background";
    const isColors = pageId === "colors";
    const isStorage = pageId === "storage";
    const isOtherUsers = pageId === "other-users";
    const isInstalledApps = pageId === "installed-apps";
    const section = isBackground || isColors
      ? settingsSections.find((item) => item.id === "personalization")
      : isStorage ? settingsSections.find((item) => item.id === "system")
      : isOtherUsers ? settingsSections.find((item) => item.id === "accounts")
      : isInstalledApps ? settingsSections.find((item) => item.id === "apps")
      : pageId === "network-advanced" ? settingsSections.find((item) => item.id === "network")
      : settingsSections.find((item) => item.id === pageId) || settingsSections[0];
    record.settingsView = isBackground ? "background" : isColors ? "colors" : isStorage ? "storage" : isOtherUsers ? "other-users" : section.id;
    if (pageId === "network-advanced" || isInstalledApps) record.settingsView = pageId;
    record.address.textContent = isBackground ? "Plano de fundo" : isStorage ? "Armazenamento" : isOtherUsers ? "Outros usuários" : section.name;
    state.lastSettingsPage = record.settingsView;
    saveState();

    let mainContent = settingsHomeMarkup();
    if (isColors) mainContent = `<header class="settings-page-heading with-back"><button type="button" data-settings-back="personalization" aria-label="Voltar para Personalização"><img src="assets/icons/ui/left.png" alt="" /></button><div><small>Personalização</small><h1>Cores</h1></div></header><article class="settings-card"><h2>Escolha o seu modo</h2><p>Altere as cores que aparecem no Windows e nos aplicativos.</p>${themeCardsMarkup()}</article><article class="settings-card"><h2>Cor de destaque</h2><p>Azul do Windows</p><span class="settings-accent-preview" aria-label="Azul do Windows"></span></article>`;
    else if (isBackground) mainContent = settingsBackgroundMarkup();
    else if (isStorage) mainContent = OSLab.systemTools.storageMarkup();
    else if (isInstalledApps) { mainContent = OSLab.storeApp.installedAppsMarkup(); OSLab.events.emit("settings:installed-apps-opened", {}, "settings"); }
    else if (section.id === "system") mainContent = settingsSystemMarkup();
    else if (section.id === "bluetooth") mainContent = settingsBluetoothMarkup();
    else if (section.id === "network") mainContent = settingsNetworkMarkup();
    else if (section.id === "personalization") mainContent = settingsPersonalizationOverviewMarkup();
    else if (section.id === "apps") mainContent = settingsAppsMarkup();
    else if (section.id === "accounts") mainContent = settingsAccountsMarkup(record, isOtherUsers ? "other-users" : "accounts");
    else if (section.id === "time") mainContent = settingsTimeMarkup();
    else if (section.id !== "home") mainContent = settingsGenericMarkup(section);

    record.content.innerHTML = settingsShellMarkup(section.id, mainContent);
    OSLab.systemTools.wire(record, () => renderSettings(record, record.settingsView));
    applyWallpaper(currentWallpaperId, false);
    updateClock();
  }

  function renderApp(record) {
    if (isExplorerApp(record)) renderExplorerApp(record);
    if (["google", "edge", "firefox", "brave", "opera"].includes(record.appId)) renderGoogle(record);
    if (record.appId === "settings") renderSettings(record);
    if (record.appId === "terminal") renderTerminal(record);
    if (record.appId === "taskmanager") OSLab.taskManagerApp ? OSLab.taskManagerApp.render(record) : renderTaskManager(record);
    if (record.appId === "missions") OSLab.missionsApp.render(record);
    if (record.appId === "exercises") OSLab.exercisesApp.render(record);
    if (record.appId === "vpn") OSLab.vpnApp.render(record);
    if (record.appId === "vpnlab") OSLab.vpnLabApp.render(record);
    if (record.appId === "installlab") OSLab.installLabApp.render(record);
    if (record.appId === "digitallife") OSLab.digitalLifeApp.render(record);
    if (record.appId === "userspermissions") OSLab.usersPermissionsApp.render(record);
    if (record.appId === "wifilab") OSLab.wifiLabApp.render(record);
    if (OSLab.driversApps?.ids.has(record.appId)) OSLab.driversApps.render(record);
    if (OSLab.audioApps?.ids.has(record.appId)) OSLab.audioApps.render(record);
    if (OSLab.taskLabApps?.ids.has(record.appId)) OSLab.taskLabApps.render(record);
    if (OSLab.storeApps?.ids.has(record.appId)) OSLab.storeApps.render(record);
    if (record.appId === "storelab") OSLab.storeTrailApp.render(record);
    if (record.appId === "browsertrail") OSLab.browserTrailsApp.renderTrail(record);
    if (record.appId === "browsermuseum") OSLab.browserTrailsApp.renderMuseum(record);
    if (record.appId === "whatsapp") OSLab.zapApp.render(record);
    if (OSLab.softwareApps?.appIds?.has(record.appId)) OSLab.softwareApps.render(record);
    if (record.appId === "texteditor") renderTextEditor(record);
  }

  function focusWindow(record) {
    if (!record || !record.element.isConnected) return;
    const wasMinimized = record.element.classList.contains("is-minimized");
    record.element.classList.remove("is-minimized");
    constrainBrowserWindow(record);
    window.requestAnimationFrame(() => constrainBrowserWindow(record));
    zCounter += 1;
    record.element.style.zIndex = String(zCounter);
    windows.forEach((item) => item.element.classList.toggle("is-focused", item === record));
    updateTaskbarState();
    document.dispatchEvent(new CustomEvent("oslab:window-focused", { detail: { windowId: record.windowId, appId: record.appId } }));
    if (wasMinimized) OSLab.events.emit("window:restored", { windowId: record.windowId, appId: record.appId }, "windowManager");
  }

  function positionWindow(record) {
    if (window.innerWidth <= 800) return;
    const index = Math.max(0, windows.size - 1);
    const windowWidth = Math.min(860, window.innerWidth * 0.72);
    const windowHeight = Math.min(580, window.innerHeight * 0.76);
    const left = Math.min(150 + index * 42, window.innerWidth - windowWidth - 28);
    const top = Math.min(38 + index * 34, window.innerHeight - windowHeight - 68);
    record.element.style.left = `${Math.max(18, left)}px`;
    record.element.style.top = `${Math.max(16, top)}px`;
  }

  function constrainBrowserWindow(record) {
    if (!record || !["google", "edge", "firefox", "brave", "opera"].includes(record.appId) || record.element.classList.contains("is-maximized")) return;
    const rect = record.element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const maxLeft = Math.max(0, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(0, window.innerHeight - rect.height - 56);
    record.element.style.left = `${Math.max(0, Math.min(rect.left, maxLeft))}px`;
    record.element.style.top = `${Math.max(0, Math.min(rect.top, maxTop))}px`;
  }

  window.addEventListener("resize", () => windows.forEach(constrainBrowserWindow));

  function createWindow(appId, options = {}) {
    const definition = appDefinitions[appId];
    if (!definition) return null;

    const element = windowTemplate.content.firstElementChild.cloneNode(true);
    const titleId = `window-title-${appId}`;
    const title = $("[data-window-role='title']", element);
    const record = {
      appId,
      windowId: appId,
      options,
      definition,
      element,
      title,
      titlebar: $("[data-window-role='titlebar']", element),
      toolbar: $("[data-window-role='toolbar']", element),
      address: $("[data-window-role='address']", element),
      content: $("[data-window-role='content']", element),
      resizeHandle: $("[data-window-role='resize']", element),
      maximizeIcon: $("[data-window-role='maximize-icon']", element),
      settingsSearch: $("[data-window-role='settings-search']", element),
      settingsView: appId === "settings" ? (options.settingsView || state.lastSettingsPage) : "home",
      previousExplorerView: appId === "computer" ? "computer" : appId === "recycle" ? "recycle" : "home",
    };

    element.id = `oslab-window-${appId}`;
    element.dataset.app = appId;
    element.setAttribute("aria-labelledby", titleId);
    title.id = titleId;
    title.textContent = definition.title;
    $("[data-window-role='icon']", element).src = definition.icon;
    record.address.textContent = definition.address;
    record.toolbar.classList.toggle("browser-toolbar", ["google", "edge", "firefox", "brave", "opera"].includes(appId));
    element.classList.toggle("settings-window", appId === "settings");
    record.toolbar.classList.toggle("is-hidden", ["settings", "taskmanager", "missions", "exercises", "vpn", "vpnlab", "installlab", "browsertrail", "digitallife", "userspermissions", "wifilab", "driverslab", "printer", "devicemanager", "sysinfo", "driverinstaller", "audiolab", "aulaonline", "audioinstaller", "tasklab", "discord", "msstore", "storelab", "chatgpt", "spotify", "netflix", "ibispaint", "calculator", "todo", "clock", "stickynotes", "browsermuseum", "controlpanel", "installer", "appjavafx", "word", "excel", "slides", "texteditor", "whatsapp"].includes(appId));
    record.settingsSearch.classList.toggle("is-hidden", appId !== "settings" && appId !== "taskmanager");
    element.classList.toggle("taskmanager-window", appId === "taskmanager");
    element.classList.toggle("missions-window", appId === "missions");
    element.classList.toggle("exercises-window", appId === "exercises");
    element.classList.toggle("vpn-window", appId === "vpn");
    element.classList.toggle("vpn-lab-window", appId === "vpnlab");
    element.classList.toggle("install-lab-window", appId === "installlab");
    element.classList.toggle("browser-trail-window", appId === "browsertrail" || appId === "digitallife");
    element.classList.toggle("userspermissions-window", appId === "userspermissions");
    element.classList.toggle("wifilab-window", appId === "wifilab");
    element.classList.toggle("drivers-window", Boolean(OSLab.driversApps?.ids.has(appId) || OSLab.audioApps?.ids.has(appId)));
    element.classList.toggle("driverslab-window", appId === "driverslab" || appId === "audiolab" || appId === "tasklab" || appId === "storelab");
    element.classList.toggle("discord-window", appId === "discord");
    element.classList.toggle("store-app-window", Boolean(OSLab.storeApps?.ids.has(appId)) && appId !== "msstore");
    element.classList.toggle("store-app-" + appId, Boolean(OSLab.storeApps?.ids.has(appId)));
    element.classList.toggle("browser-museum-window", appId === "browsermuseum");
    element.classList.toggle("zap-window", appId === "whatsapp");
    element.classList.toggle("software-window", OSLab.softwareApps?.appIds?.has(appId));
    element.classList.toggle("texteditor-window", appId === "texteditor");
    if (appId === "taskmanager") {
      const taskSearchInput = $("input", record.settingsSearch);
      taskSearchInput.placeholder = "Digite um nome, editor ou PID para pesquisar";
      taskSearchInput.setAttribute("aria-label", "Pesquisar processos");
    }

    windows.set(appId, record);
    windowLayer.appendChild(element);
    element.addEventListener("animationend", function onWindowAnimationEnd(event) {
      if (event.target !== element) return;
      element.removeEventListener("animationend", onWindowAnimationEnd);
      constrainBrowserWindow(record);
    });
    positionWindow(record);
    wireWindow(record);
    renderApp(record);
    if (["settings", "taskmanager", "missions", "exercises", "vpnlab", "installlab", "browsertrail", "digitallife", "userspermissions", "wifilab", "driverslab", "audiolab", "tasklab", "storelab", "msstore", "browsermuseum", "whatsapp"].includes(appId)) {
      element.classList.add("is-maximized");
      record.maximizeIcon.src = "assets/icons/ui/restore.png";
      record.maximizeIcon.closest("button").setAttribute("aria-label", "Restaurar");
    }
    focusWindow(record);
    const process = OSLab.processManager.ensureAppProcess({
      appId,
      windowId: record.windowId,
      name: definition.title,
      icon: definition.icon,
      status: "Em execução",
      cpu: appId === "taskmanager" ? 0.3 : 0.1,
      memory: ["google", "edge", "firefox", "brave", "opera"].includes(appId) ? 64.2 : ["missions", "exercises", "vpnlab", "installlab", "browsertrail", "digitallife", "userspermissions", "wifilab", "driverslab", "audiolab", "browsermuseum"].includes(appId) ? 42.6 : ["word", "excel", "slides"].includes(appId) ? 78.4 : appId === "vpn" ? 34.8 : appId === "texteditor" ? 42 : 28.4,
      missionId: options.missionId || null,
      efficient: appId === "google",
    });
    record.pid = process.pid;
    OSLab.events.emit("app:opened", { appId, windowId: record.windowId, pid: process.pid }, "windowManager");
    if (options.frozen) window.setTimeout(() => freezeWindow(record), 1000);
    return record;
  }

  function openApp(appId, options = {}) {
    const requestedDefinition = appDefinitions[appId];
    if (requestedDefinition?.installedOnly && !OSLab.software?.isInstalled?.(appId) && !OSLab.store?.isInstalled?.(appId)) {
      OSLab.ui.notify("Programa não instalado", `${requestedDefinition.title} precisa ser instalado antes de ser aberto.`, "warning");
      OSLab.events.emit("app:launch-blocked", { appId, reason: "not-installed" }, "windowManager");
      return null;
    }
    const existing = windows.get(appId);
    if (existing) {
      focusWindow(existing);
      closeFlyouts();
      return existing;
    }

    const launch = OSLab.systemState.isAppLaunchAllowed(appId);
    if (!launch.ok) {
      OSLab.ui.notify("Memória insuficiente", `Libere memória antes de abrir este aplicativo. Disponível: ${Math.round(launch.freeMb)} MB.`, "warning", 6000);
      OSLab.events.emit("app:launch-blocked", { appId, reason: launch.reason, freeMb: launch.freeMb, requiredMb: launch.requiredMb }, "windowManager");
      return null;
    }

    const record = createWindow(appId, options);
    closeFlyouts();
    return record;
  }

  /** "(Não respondendo)": título, janela esbranquiçada e status no Gerenciador, como no Windows */
  function freezeWindow(record) {
    if (!record?.element.isConnected || record.frozen) return;
    record.frozen = true;
    record.element.classList.add("is-not-responding");
    OSLab.processManager.updateProcess(record.pid, { status: "Não respondendo", cpu: 0, fixed: true });
    if (record.appId === "texteditor") renderTextEditor(record);
    else record.title.textContent = `${record.definition.title} (Não respondendo)`;
    OSLab.events.emit("window:frozen", { windowId: record.windowId, appId: record.appId, pid: record.pid }, "windowManager");
  }

  function closeWindow(record, options = {}) {
    if (!record) return;
    // hangOnClose: o programa trava justamente quando o aluno tenta fechar pelo X
    if (record.options?.hangOnClose && !record.frozen && !options.force) freezeWindow(record);
    if (record.frozen && !options.force) {
      OSLab.ui.notify(`${record.options?.title || record.definition.title} não está respondendo`, "O X não funciona com o programa travado.", "warning", 5000);
      OSLab.events.emit("window:close-blocked", { windowId: record.windowId, appId: record.appId }, "windowManager");
      return;
    }
    record.element.remove();
    windows.delete(record.appId);
    if (!options.fromProcessManager) OSLab.processManager.endByWindow(record.windowId, { reason: options.sessionSwitch ? "session-switch" : options.force ? "force-close" : "window-closed" });
    if (!options.sessionSwitch) OSLab.events.emit("app:closed", { appId: record.appId, windowId: record.windowId, force: Boolean(options.force) }, "windowManager");
    const remaining = Array.from(windows.values()).filter((item) => !item.element.classList.contains("is-minimized"));
    const next = remaining.sort((a, b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0];
    if (next) focusWindow(next);
    else updateTaskbarState();
  }

  function minimizeWindow(record) {
    record.element.classList.add("is-minimized");
    record.element.classList.remove("is-focused");
    const remaining = Array.from(windows.values()).filter((item) => !item.element.classList.contains("is-minimized"));
    const next = remaining.sort((a, b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0];
    if (next) focusWindow(next);
    else updateTaskbarState();
    OSLab.events.emit("window:minimized", { windowId: record.windowId, appId: record.appId }, "windowManager");
  }

  function toggleMaximize(record) {
    const maximized = record.element.classList.toggle("is-maximized");
    record.maximizeIcon.src = maximized ? "assets/icons/ui/restore.png" : "assets/icons/ui/maximize.png";
    record.maximizeIcon.closest("button").setAttribute("aria-label", maximized ? "Restaurar" : "Maximizar");
    focusWindow(record);
    OSLab.events.emit(maximized ? "window:maximized" : "window:restored", { windowId: record.windowId, appId: record.appId }, "windowManager");
  }

  function setVolume(value, muted = state.muted, emit = true) {
    state.volume = Math.max(0, Math.min(100, Number(value) || 0));
    state.muted = Boolean(muted);
    saveState();
    const slider = $("#volume-slider");
    if (slider) slider.value = String(state.volume);
    const audioIcon = $("#taskbar-audio-icon");
    if (audioIcon) {
      audioIcon.src = "assets/icons/ui/audio.png";
      audioIcon.style.opacity = state.muted || state.volume === 0 ? "0.45" : "1";
      audioIcon.alt = state.muted ? "Som mudo" : `Volume ${state.volume}%`;
    }
    if (emit) OSLab.events.emit("volume:changed", { volume: state.volume, muted: state.muted }, "quickSettings");
  }

  OSLab.windowManager = {
    open: openApp,
    minimize(windowId) { const record = windows.get(windowId); if (record) minimizeWindow(record); },
    restore(windowId) { const record = windows.get(windowId); if (record) focusWindow(record); },
    maximize(windowId) { const record = windows.get(windowId); if (record && !record.element.classList.contains("is-maximized")) toggleMaximize(record); },
    close(windowId) { const record = windows.get(windowId); if (record) closeWindow(record); },
    forceCloseById(windowId, options = {}) { const record = windows.get(windowId); if (record) closeWindow(record, { ...options, force: true }); },
    isOpen(windowId) { return windows.has(windowId); },
    getWindows() { return Array.from(windows.values()); },
  };

  OSLab.shell = {
    openApp,
    closeApp(appId) { const record = windows.get(appId); if (record) closeWindow(record, { force: true }); },
    openFolder(folderId) { const record = openApp("explorer"); renderFolder(record, folderId); return record; },
    openRecycleBin() { const record = openApp("recycle"); renderRecycleBin(record); return record; },
    openSettings(page = "home") { const record = openApp("settings"); renderSettings(record, page); return record; },
    openWifiProperties(ssid) { const record = openApp("settings"); record.wifiSsid = ssid; renderSettings(record, "wifi-properties"); return record; },
    openQuickSettings(view = "main") { closeFlyouts(quickPanel); quickPanel.classList.remove("is-hidden"); quickSettingsButton.setAttribute("aria-expanded", "true"); OSLab.events.emit("wifi:quick-opened", {}, "quickSettings"); OSLab.wifiUI.show(view); },
    openTextEditor(options = {}) {
      const existing = windows.get("texteditor");
      if (existing && existing.options?.missionId !== options.missionId) closeWindow(existing, { force: true });
      const record = openApp("texteditor", options);
      record.options = { ...record.options, ...options };
      return { ...record, windowId: record.windowId, pid: record.pid };
    },
    closeMissionWindows(missionId) { Array.from(windows.values()).filter((record) => record.options?.missionId === missionId).forEach((record) => closeWindow(record, { force: true })); },
    isWindowOpen(windowId) { return windows.has(windowId); },
    refreshDesktop() { renderDesktopFolders(); const explorer = windows.get("explorer"); if (explorer?.currentFolderId) renderFolder(explorer, explorer.currentFolderId); },
    refreshPrograms() {
      renderDesktopFolders();
      renderInstalledStartApps();
      const controlPanel = windows.get("controlpanel");
      if (controlPanel) OSLab.softwareApps?.render?.(controlPanel);
    },
    setWallpaper(id, emit = true) { applyWallpaper(id, emit); if (!emit) { state.wallpaperId = id; saveState(); } },
    getWallpaper() { return currentWallpaperId; },
    setVolume,
    getAudioState() { return { volume: state.volume, muted: Boolean(state.muted) }; },
    tryDiagnosticDownload(sizeBytes, exerciseId = null) {
      const required = Math.max(0, Number(sizeBytes) || 0);
      if (OSLab.systemState.getStorage().freeBytes < required) {
        OSLab.ui.notify("Armazenamento insuficiente", "O download ainda não cabe no disco. Itens na Lixeira continuam ocupando espaço.", "warning");
        OSLab.events.emit("download:failed", { requiredBytes: required, freeBytes: OSLab.systemState.getStorage().freeBytes }, "browser");
        return false;
      }
      const file = OSLab.fileSystem.create({ parentId: OSLab.fileSystem.roots.downloads, kind: "file", name: "suporte-offline.zip", sizeBytes: required, createdByExercise: Boolean(exerciseId), exerciseId });
      OSLab.events.emit("download:completed", { fileId: file.id, sizeBytes: required }, "browser");
      OSLab.ui.notify("Download concluído", "suporte-offline.zip foi salvo em Downloads.", "success");
      this.refreshDesktop(); return true;
    },
    simulateRestart() {
      const seconds = OSLab.processManager.estimateBootTime();
      OSLab.systemState.configure({ lastBootSeconds: seconds });
      OSLab.events.emit("system:restarted", { bootSeconds: seconds }, "powerMenu");
      OSLab.ui.notify("Reinicialização simulada", `O computador iniciou em ${seconds} segundos.`, seconds <= 18 ? "success" : "warning");
      return seconds;
    },
    snapshotSystem() {
      return {
        wallpaperId: currentWallpaperId, volume: state.volume, muted: Boolean(state.muted), lastSettingsPage: state.lastSettingsPage,
        openWindows: Array.from(windows.values()).map((record) => ({
          appId: record.appId, options: { ...(record.options || {}) }, settingsView: record.settingsView,
          browserHost: record.browserHost || null, browserResult: record.browserResult || null,
          terminalLines: record.terminalLines ? JSON.parse(JSON.stringify(record.terminalLines)) : null,
          taskNav: record.taskNav || null, currentFolderId: record.currentFolderId || null,
        })),
      };
    },
    restoreSystemSnapshot(input) {
      if (!input) return;
      const windowSnapshots = input.openWindows || (input.openApps || []).map((appId) => ({ appId }));
      const openApps = new Set(windowSnapshots.map((entry) => entry.appId));
      Array.from(windows.values()).filter((record) => !openApps.has(record.appId)).forEach((record) => closeWindow(record, { force: true }));
      windowSnapshots.forEach((entry) => {
        if (!appDefinitions[entry.appId]) return;
        const record = windows.get(entry.appId) || openApp(entry.appId, entry.options || {});
        if (!record) return;
        record.options = { ...(entry.options || {}) };
        if (entry.settingsView) record.settingsView = entry.settingsView;
        if (entry.browserHost) { record.browserHost = entry.browserHost; record.browserResult = entry.browserResult; }
        if (entry.terminalLines) record.terminalLines = JSON.parse(JSON.stringify(entry.terminalLines));
        if (entry.taskNav) record.taskNav = entry.taskNav;
        if (entry.currentFolderId && entry.appId === "explorer") renderFolder(record, entry.currentFolderId); else renderApp(record);
      });
      applyWallpaper(input.wallpaperId || "1", false); setVolume(input.volume, input.muted, false); state.lastSettingsPage = input.lastSettingsPage || "home";
    },
    setPersistenceSuspended(value) { persistenceSuspended = Boolean(value); },
    isPersistenceSuspended() { return persistenceSuspended; },
    persist: saveState,
    notify(title, message, kind = "info") { return OSLab.ui.notify(title, message, kind); },
    closeFlyouts,
    getRunnableApps() { return Object.entries(appDefinitions).filter(([id]) => !["computer", "recycle", "texteditor"].includes(id)).map(([id, app]) => ({ id, title: app.title, icon: app.icon })); },
  };

  OSLab.systemState.bindShell({
    snapshot: () => OSLab.shell.snapshotSystem(),
    restore: (input) => OSLab.shell.restoreSystemSnapshot(input),
    setPersistenceSuspended: (value) => OSLab.shell.setPersistenceSuspended(value),
    persist: saveState,
  });

  function wireWindow(record) {
    const { element, titlebar, content, toolbar, resizeHandle } = record;
    let dragState = null;
    let resizeState = null;

    element.addEventListener("pointerdown", () => focusWindow(record));

    $(".window-controls", element).addEventListener("click", (event) => {
      const action = event.target.closest("[data-window-action]")?.dataset.windowAction;
      if (action === "minimize") minimizeWindow(record);
      if (action === "maximize") toggleMaximize(record);
      if (action === "close") closeWindow(record);
    });

    titlebar.addEventListener("dblclick", (event) => {
      if (!event.target.closest(".window-controls")) toggleMaximize(record);
    });

    toolbar.addEventListener("click", (event) => {
      const action = event.target.closest("[data-toolbar-action]")?.dataset.toolbarAction;
      if (!action) return;

      if (action === "back" && record.appId !== "google") {
        if (record.currentFolderId) {
          const current = OSLab.fileSystem.get(record.currentFolderId);
          const parentId = current?.parentId;
          if (parentId) renderFolder(record, parentId);
          else renderExplorerHome(record);
        }
        else if (record.previousExplorerView === "computer") renderComputer(record);
        else if (record.previousExplorerView === "recycle") renderRecycleBin(record);
        else renderExplorerHome(record);
      }

      if (action === "refresh") renderApp(record);
    });

    content.addEventListener("click", async (event) => {
      if (isExplorerApp(record) && handleExplorerChrome(record, event)) return;
      const settingsPage = event.target.closest("[data-settings-page]");
      const settingsBack = event.target.closest("[data-settings-back]");
      const wallpaperButton = event.target.closest("[data-wallpaper]");
      const settingsToggle = event.target.closest("[data-settings-toggle]");
      const stateToggle = event.target.closest("[data-state-toggle]");
      const folderButton = event.target.closest("[data-folder]");
      const explorerView = event.target.closest("[data-explorer-view]");
      const recycleItem = event.target.closest("[data-recycle-item]");
      const recycleAction = event.target.closest("[data-recycle-action]")?.dataset.recycleAction;
      const processRow = event.target.closest("[data-process-id]");
      const taskAction = event.target.closest("[data-task-action]")?.dataset.taskAction;
      const fileItem = event.target.closest("[data-file-item]");
      const fileAction = event.target.closest("[data-file-action]")?.dataset.fileAction;
      const userHome = event.target.closest("[data-user-home]")?.dataset.userHome;
      const accountAction = event.target.closest("[data-account-action]")?.dataset.accountAction;
      const accountExpand = event.target.closest("[data-account-expand]")?.dataset.accountExpand;
      const accountChange = event.target.closest("[data-account-change]")?.dataset.accountChange;

      if (settingsPage && record.appId === "settings") renderSettings(record, settingsPage.dataset.settingsPage);
      if (settingsBack && record.appId === "settings") renderSettings(record, settingsBack.dataset.settingsBack);
      if (wallpaperButton && record.appId === "settings") applyWallpaper(wallpaperButton.dataset.wallpaper);
      if (settingsToggle && record.appId === "settings") {
        const toggle = $(".settings-switch", settingsToggle);
        if (toggle) toggle.classList.toggle("is-active");
      }
      if (record.appId === "settings" && accountAction) {
        if (accountAction === "other-users") { record.addUserStep = 0; renderSettings(record, "other-users"); OSLab.events.emit("settings:other-users-opened", {}, "settings"); }
        if (accountAction === "add") { record.addUserStep = 1; renderSettings(record, "other-users"); }
        if (accountAction === "no-signin") { record.addUserStep = 2; renderSettings(record, "other-users"); }
        if (accountAction === "local-account") { record.addUserStep = 3; renderSettings(record, "other-users"); window.setTimeout(() => $("[name='displayName']", record.content)?.focus(), 30); }
        if (accountAction === "cancel-add") { record.addUserStep = 0; renderSettings(record, "other-users"); }
        if (accountAction === "edit-profile") { record.editingProfile = true; renderSettings(record, "accounts"); }
        if (accountAction === "cancel-profile") { record.editingProfile = false; renderSettings(record, "accounts"); }
      }
      if (record.appId === "settings" && accountExpand) { record.expandedAccountId = record.expandedAccountId === accountExpand ? null : accountExpand; renderSettings(record, "other-users"); }
      if (record.appId === "settings" && accountChange) {
        const select = $(`[data-account-role="${CSS.escape(accountChange)}"]`, record.content);
        const target = OSLab.users.list().find((account) => account.id === accountChange);
        if (select && target && select.value !== target.role) {
          const elevation = await OSLab.ui.elevate({ action: "change-account-type", targetUserId: accountChange, actionLabel: `Alterar ${target.displayName} para ${select.value === "administrator" ? "Administrador" : "Usuário padrão"}` });
          if (elevation.ok) {
            const changed = OSLab.users.setRole(accountChange, select.value, { authorizationId: elevation.token });
            if (!changed.ok) OSLab.ui.notify("Não foi possível alterar", changed.reason === "last-admin" ? "O computador precisa manter pelo menos um administrador." : "A conta não está disponível.", "warning");
            renderSettings(record, "other-users");
          }
        }
      }
      if (stateToggle && record.appId === "settings") {
        const key = stateToggle.dataset.stateToggle;
        if (key === "wifi") OSLab.network.setWifi(!OSLab.network.getSnapshot().wifiEnabled);
        else if (key === "airplane") OSLab.network.setAirplaneMode(!OSLab.network.getSnapshot().airplaneMode);
      else { state.quickSettings[key] = !state.quickSettings[key]; saveState(); }
        renderSettings(record, record.settingsView);
        syncQuickSettings();
      }
      if (folderButton) renderFolder(record, folderButton.dataset.folder);
      if (explorerView?.dataset.explorerView === "home") renderExplorerHome(record);
      if (explorerView?.dataset.explorerView === "computer") renderComputer(record);
      if (explorerView?.dataset.explorerView === "recycle") renderRecycleBin(record);
      if (userHome && isExplorerApp(record)) {
        const target = OSLab.users.list().find((account) => account.id === userHome);
        const current = OSLab.users.getCurrent();
        OSLab.events.emit("file:other-home-opened", { targetUserId: userHome, actorUserId: current?.id || null }, "explorer");
        if (target && current?.id === target.id) renderFolder(record, OSLab.fileSystem.roots.documents);
        else if (target) { OSLab.events.emit("file:access-denied", { targetUserId: userHome, path: `C:\\Users\\${target.username}`, operation: "open" }, "explorer"); OSLab.ui.notify("Acesso negado", `A pasta pessoal de ${target.displayName} pertence a outro usuário.`, "warning", 5600); }
      }
      if (recycleItem) {
        record.recycleSelection = recycleItem.dataset.recycleItem;
        renderRecycleBin(record);
      }
      if (recycleAction === "restore" && record.recycleSelection) {
        restoreRecycleItem(record.recycleSelection);
        record.recycleSelection = null;
        renderRecycleBin(record);
      }
      if (recycleAction === "delete" && record.recycleSelection) {
        permanentlyDeleteRecycleItem(record.recycleSelection);
        record.recycleSelection = null;
        renderRecycleBin(record);
      }
      if (recycleAction === "restore-all") {
        OSLab.fileSystem.recycleItems().forEach((item) => restoreRecycleItem(item.id));
        record.recycleSelection = null;
        renderRecycleBin(record);
      }
      if (recycleAction === "empty") {
        if (await OSLab.ui.confirm({ title: "Esvaziar a Lixeira?", message: "Os itens serão apagados permanentemente.", confirmLabel: "Esvaziar" })) {
          OSLab.fileSystem.emptyRecycleBin(); record.recycleSelection = null; renderRecycleBin(record);
        }
      }
      if (fileItem && isExplorerApp(record)) {
        record.explorerSelection = fileItem.dataset.fileItem;
        $$('[data-file-item]', record.content).forEach((row) => row.classList.toggle("is-selected", row === fileItem));
        $$('[data-file-action="cut"], [data-file-action="copy"], [data-file-action="rename"], [data-file-action="delete"], [data-file-action="properties"]', record.content).forEach((button) => { button.disabled = false; });
        const selectedFile = OSLab.fileSystem.get(record.explorerSelection);
        OSLab.events.emit("file:selected", { fileId: selectedFile?.id, name: selectedFile?.name, parentFolderId: selectedFile?.parentId }, "explorer");
        updateFxSelection(record);
      }
      if (fileAction && isExplorerApp(record)) {
        const selectedFile = OSLab.fileSystem.get(record.explorerSelection);
        if (fileAction === "new-folder") {
          const folder = OSLab.fileSystem.create({ parentId: record.currentFolderId, kind: "folder", name: "Nova pasta" });
          record.explorerSelection = folder.id; renderFolder(record, record.currentFolderId); window.setTimeout(() => beginExplorerRename(record, folder.id), 30);
        }
        if (fileAction === "new-text") {
          const file = OSLab.fileSystem.create({ parentId: record.currentFolderId, kind: "file", name: "Novo Documento de Texto.txt", mime: "text/plain", content: "" });
          if (file) { record.explorerSelection = file.id; renderFolder(record, record.currentFolderId); window.setTimeout(() => beginExplorerRename(record, file.id), 30); }
        }
        if ((fileAction === "cut" || fileAction === "copy") && selectedFile) { fileClipboard = { itemId: selectedFile.id, mode: fileAction }; renderFolder(record, record.currentFolderId); OSLab.ui.notify(fileAction === "cut" ? "Item recortado" : "Item copiado", selectedFile.name, "info"); }
        if (fileAction === "paste" && fileClipboard) {
          if (fileClipboard.mode === "cut") OSLab.fileSystem.move(fileClipboard.itemId, record.currentFolderId); else OSLab.fileSystem.copy(fileClipboard.itemId, record.currentFolderId);
          if (fileClipboard.mode === "cut") fileClipboard = null; renderFolder(record, record.currentFolderId); renderDesktopFolders();
        }
        if (fileAction === "rename" && selectedFile) beginExplorerRename(record, selectedFile.id);
        if (fileAction === "delete" && selectedFile) { OSLab.fileSystem.delete(selectedFile.id); record.explorerSelection = null; renderFolder(record, record.currentFolderId); renderDesktopFolders(); }
        if (fileAction === "properties" && selectedFile) {
          if (!OSLab.fileSystem.isPublicItem(selectedFile)) OSLab.ui.notify("Pasta pessoal protegida", "Somente o usuário deste perfil pode acessar este item.", "info");
          else {
            const permission = await OSLab.ui.choosePermission(selectedFile);
            if (permission) { const result = OSLab.fileSystem.setPermission(selectedFile.id, permission); if (!result.ok) OSLab.ui.notify("Permissão não alterada", "Somente o proprietário ou um administrador pode alterar a segurança deste item.", "warning"); renderFolder(record, record.currentFolderId); }
          }
        }
      }
      if (processRow && record.appId === "taskmanager" && !OSLab.taskManagerApp) {
        record.selectedProcessId = processRow.dataset.processId;
        renderTaskManager(record);
      }
      if (taskAction === "end" && record.appId === "taskmanager" && record.selectedProcessId && !OSLab.taskManagerApp) {
        taskProcesses = taskProcesses.filter((process) => process.id !== record.selectedProcessId);
        record.selectedProcessId = null;
        renderTaskManager(record);
      }
      if (taskAction === "run" && record.appId === "taskmanager" && !OSLab.taskManagerApp) {
        record.selectedProcessId = null;
        renderTaskManager(record);
        $("input", record.settingsSearch)?.focus();
      }
    });

    content.addEventListener("change", (event) => {
    });
    content.addEventListener("input", (event) => {
      if (event.target.matches("[data-settings-search]")) {
        const query = event.target.value.toLocaleLowerCase("pt-BR");
        $$("[data-settings-label]", content).forEach(item => item.classList.toggle("is-hidden", !item.dataset.settingsLabel.includes(query)));
      }
      const textFile = event.target.closest("[data-text-file]");
      if (textFile) {
        const file = OSLab.fileSystem.get(textFile.dataset.textFile);
        if (file) {
          file.content = textFile.value;
          saveState();
        }
      }

      const taskSearch = event.target.closest("[data-task-search]");
      if (taskSearch && record.appId === "taskmanager") {
        record.taskQuery = taskSearch.value;
        const query = taskSearch.value.trim().toLocaleLowerCase("pt-BR");
        let visibleCount = 0;
        $$("[data-process-id]", record.content).forEach((row) => {
          const process = taskProcesses.find((item) => item.id === row.dataset.processId);
          const matches = process && (process.name.toLocaleLowerCase("pt-BR").includes(query) || String(process.pid).includes(query));
          row.classList.toggle("is-hidden", !matches);
          if (matches) visibleCount += 1;
        });
        $(".task-no-results", record.content)?.classList.toggle("is-hidden", visibleCount > 0);
      }

      const explorerSearch = event.target.closest("[data-explorer-search]");
      if (explorerSearch && isExplorerApp(record)) {
        record.explorerQuery = explorerSearch.value;
        renderExplorerSearch(record, explorerSearch.value);
      }
    });

    content.addEventListener("dblclick", (event) => {
      const row = event.target.closest("[data-file-item]");
      if (!row || !isExplorerApp(record)) return;
      const selected = OSLab.fileSystem.get(row.dataset.fileItem);
      if (selected?.kind === "folder") renderFolder(record, selected.id);
      else if (selected) renderTextFile(record, selected.id);
    });

    if (record.appId === "settings") {
      const searchInput = $("input", record.settingsSearch);
      searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
        $$("[data-settings-label]", record.content).forEach((button) => {
          button.classList.toggle("is-hidden", Boolean(query) && !button.dataset.settingsLabel.includes(query));
        });
      });
      searchInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
        if (query.includes("wi-fi") || query.includes("wifi")) { renderSettings(record, query.includes("conhecid") ? "wifi-known" : "wifi"); return; }
        const match = settingsSections.find((section) => section.name.toLocaleLowerCase("pt-BR").includes(query));
        if (match) {
          renderSettings(record, match.id);
          searchInput.select();
        }
      });
    }

    if (record.appId === "taskmanager") {
      const searchInput = $("input", record.settingsSearch);
      searchInput.addEventListener("input", () => {
        if (OSLab.taskManagerApp) OSLab.taskManagerApp.setQuery(record, searchInput.value);
        else record.taskQuery = searchInput.value;
      });
    }

    content.addEventListener("submit", async (event) => {
      const localAccountForm = event.target.closest("[data-local-account-form]");
      if (localAccountForm) {
        event.preventDefault();
        const data = new FormData(localAccountForm);
        const displayName = String(data.get("displayName") || "").trim();
        const password = String(data.get("password") || "");
        const confirmation = String(data.get("confirmPassword") || "");
        const error = $("[data-account-error]", localAccountForm);
        if (password !== confirmation) { error.textContent = "As senhas simuladas não coincidem."; return; }
        const elevation = await OSLab.ui.elevate({ action: "create-local-account", actionLabel: `Criar a conta local ${displayName || "sem nome"}` });
        if (!elevation.ok) return;
        const result = await OSLab.users.createAccount({ displayName, password, role: "standard" });
        if (!result.ok) {
          const messages = { "name-required": "Informe um nome para a conta.", "weak-password": "Use pelo menos quatro caracteres.", duplicate: "Já existe uma conta com esse nome." };
          error.textContent = messages[result.reason] || "Não foi possível criar a conta.";
          OSLab.events.emit("account:create-rejected", { reason: result.reason }, "settings");
          return;
        }
        record.addUserStep = 0;
        record.expandedAccountId = result.account.id;
        renderSettings(record, "other-users");
        OSLab.ui.notify("Conta criada", `${result.account.displayName} pode entrar neste computador.`, "success");
        return;
      }
      const profileForm = event.target.closest("[data-profile-form]");
      if (profileForm) {
        event.preventDefault();
        const displayName = String(new FormData(profileForm).get("displayName") || "").trim();
        if (!displayName) { $("[data-account-error]", profileForm).textContent = "Informe um nome exibido."; return; }
        OSLab.users.updateProfile({ displayName });
        record.editingProfile = false;
        updateIdentityUI();
        renderSettings(record, "accounts");
        return;
      }
      const form = event.target.closest("[data-google-form]");
      if (!form) return;
      event.preventDefault();
      const query = new FormData(form).get("q")?.toString().trim();
      if (!query) {
        $("[name='q']", form).focus();
        return;
      }
      if (OSLab.browserApp) OSLab.browserApp.navigate(record, query);
      else OSLab.ui.notify("Navegador local", "A pesquisa simulada está disponível apenas dentro do OSLab.", "info");
    });

    titlebar.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest(".window-controls, button") || element.classList.contains("is-maximized")) return;
      const rect = element.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      titlebar.setPointerCapture(event.pointerId);
    });

    titlebar.addEventListener("pointermove", (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const layerRect = windowLayer.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const left = Math.min(Math.max(0, event.clientX - layerRect.left - dragState.offsetX), Math.max(0, layerRect.width - 140));
      const top = Math.min(Math.max(0, event.clientY - layerRect.top - dragState.offsetY), Math.max(0, layerRect.height - 40));
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
    });

    const stopDragging = (event) => {
      if (dragState?.pointerId === event.pointerId) dragState = null;
    };

    titlebar.addEventListener("pointerup", stopDragging);
    titlebar.addEventListener("pointercancel", stopDragging);

    resizeHandle.addEventListener("pointerdown", (event) => {
      if (element.classList.contains("is-maximized")) return;
      const rect = element.getBoundingClientRect();
      resizeState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: rect.width,
        height: rect.height,
      };
      resizeHandle.setPointerCapture(event.pointerId);
      event.stopPropagation();
    });

    resizeHandle.addEventListener("pointermove", (event) => {
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;
      const layerRect = windowLayer.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const minWidth = window.innerWidth <= 800 ? 320 : 540;
      const minHeight = window.innerWidth <= 800 ? 280 : 360;
      const width = Math.min(Math.max(minWidth, resizeState.width + event.clientX - resizeState.startX), layerRect.width - rect.left);
      const height = Math.min(Math.max(minHeight, resizeState.height + event.clientY - resizeState.startY), layerRect.height - rect.top);
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
    });

    const stopResizing = (event) => {
      if (resizeState?.pointerId === event.pointerId) resizeState = null;
    };

    resizeHandle.addEventListener("pointerup", stopResizing);
    resizeHandle.addEventListener("pointercancel", stopResizing);
  }

  function taskGroup(taskId) {
    return Array.from(windows.values()).filter((record) => record.definition.task === taskId);
  }

  function updateTaskbarState() {
    const runtimeContainer = $("#runtime-taskbar-apps");
    if (runtimeContainer) {
      const represented = new Set($$(".task-app:not(.taskbar-dynamic-app)", taskbar).map((button) => button.dataset.app));
      const runtimeApps = [...new Set(Array.from(windows.values()).map((record) => record.definition.task).filter((task) => !represented.has(task)))];
      runtimeContainer.innerHTML = runtimeApps.map((taskId) => {
        const record = Array.from(windows.values()).find((entry) => entry.definition.task === taskId);
        return `<button class="taskbar-button task-app taskbar-dynamic-app" type="button" data-app="${taskId}" aria-label="${escapeHtml(record.definition.title)}"><img src="${record.definition.icon}" alt="" /></button>`;
      }).join("");
      $$(".taskbar-dynamic-app", runtimeContainer).forEach((button) => button.addEventListener("click", () => activateTaskGroup(button.dataset.app, Array.from(windows.values()).find((entry) => entry.definition.task === button.dataset.app)?.appId)));
    }
    $$(".task-app").forEach((button) => {
      const group = taskGroup(button.dataset.app);
      const active = group.some(
        (record) => record.element.classList.contains("is-focused") && !record.element.classList.contains("is-minimized"),
      );
      button.classList.toggle("is-open", group.length > 0);
      button.classList.toggle("is-active", active);
      button.dataset.windowCount = String(group.length);
    });
  }

  function activateTaskGroup(taskId, fallbackAppId) {
    const group = taskGroup(taskId).sort((a, b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex));
    if (!group.length) {
      openApp(fallbackAppId);
      return;
    }

    const visible = group.filter((record) => !record.element.classList.contains("is-minimized"));
    const focusedIndex = visible.findIndex((record) => record.element.classList.contains("is-focused"));

    if (visible.length === 1 && focusedIndex === 0) {
      minimizeWindow(visible[0]);
      return;
    }

    if (visible.length > 1 && focusedIndex >= 0) {
      focusWindow(visible[(focusedIndex + 1) % visible.length]);
      return;
    }

    focusWindow(visible[0] || group[0]);
  }

  function closeFlyouts(except = null) {
    [startMenu, searchPanel, quickPanel, calendarPanel, powerMenu, profileMenu, contextMenu, itemContextMenu, taskbarContextMenu].forEach((panel) => {
      if (panel !== except) panel.classList.add("is-hidden");
    });
    startButton.setAttribute("aria-expanded", String(!startMenu.classList.contains("is-hidden")));
    searchButton.setAttribute("aria-expanded", String(!searchPanel.classList.contains("is-hidden")));
    quickSettingsButton.setAttribute("aria-expanded", String(!quickPanel.classList.contains("is-hidden")));
    clockButton.setAttribute("aria-expanded", String(!calendarPanel.classList.contains("is-hidden")));
    startProfileButton.setAttribute("aria-expanded", String(!profileMenu.classList.contains("is-hidden")));
  }

  function toggleFlyout(panel, trigger) {
    const willOpen = panel.classList.contains("is-hidden");
    closeFlyouts(panel);
    panel.classList.toggle("is-hidden", !willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  }

  startButton.addEventListener("click", (event) => {
    event.stopPropagation();
    // Windows Explorer com defeito (missão do Gerenciador): o botão Iniciar não responde até reiniciar o Explorer
    if (document.documentElement.classList.contains("is-start-glitch")) { OSLab.events.emit("start:glitch-click", {}, "startMenu"); return; }
    const wasHidden = startMenu.classList.contains("is-hidden");
    toggleFlyout(startMenu, startButton);
    if (wasHidden && !startMenu.classList.contains("is-hidden")) OSLab.events.emit("start:opened", {}, "startMenu");
  });

  searchButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFlyout(searchPanel, searchButton);
    if (!searchPanel.classList.contains("is-hidden")) window.setTimeout(() => $("#global-search-input").focus(), 50);
  });

  quickSettingsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFlyout(quickPanel, quickSettingsButton);
    if (!quickPanel.classList.contains("is-hidden")) { OSLab.wifiUI.show("main"); OSLab.events.emit("wifi:quick-opened", {}, "quickSettings"); }
  });

  clockButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFlyout(calendarPanel, clockButton);
  });

  $("#power-button").addEventListener("click", (event) => {
    event.stopPropagation();
    powerMenu.classList.toggle("is-hidden");
  });

  startProfileButton.addEventListener("click", (event) => {
    event.stopPropagation();
    updateIdentityUI();
    const anchor = startProfileButton.getBoundingClientRect();
    toggleFlyout(profileMenu, startProfileButton);
    startMenu.classList.remove("is-hidden");
    startButton.setAttribute("aria-expanded", "true");
    profileMenu.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - 258))}px`;
    profileMenu.style.bottom = `${Math.max(8, window.innerHeight - anchor.top + 8)}px`;
    profileMenu.style.maxHeight = `${Math.max(80, anchor.top - 16)}px`;
  });

  profileMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const action = event.target.closest("[data-profile-action]")?.dataset.profileAction;
    const nextUserId = event.target.closest("[data-profile-user]")?.dataset.profileUser;
    if (action === "lock") lockSession();
    if (action === "signout") signOutSession();
    if (nextUserId) signOutSession(nextUserId);
  });

  powerMenu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-power-action]")?.dataset.powerAction;
    if (action) closeFlyouts();
    if (action === "restart") {
      if (OSLab.exercises.getSession()?.id === "slow-startup") OSLab.exercises.runTest();
      else powerOff("restart");
    }
    if (action === "shutdown") powerOff("shutdown");
    if (action === "sleep") sleepComputer();
    if (action === "lock") lockSession();
    if (action === "signout") signOutSession();
  });

  $("#show-desktop-button").addEventListener("click", () => {
    windows.forEach((record) => {
      record.element.classList.add("is-minimized");
      record.element.classList.remove("is-focused");
    });
    closeFlyouts();
    updateTaskbarState();
  });

  $$(".task-app").forEach((button) => {
    button.addEventListener("click", () => activateTaskGroup(button.dataset.app, button.dataset.app));
  });

  $$("[data-app]").forEach((element) => {
    if (element.classList.contains("desktop-shortcut") || element.classList.contains("task-app")) return;
    element.addEventListener("click", () => openApp(element.dataset.app));
  });

  $$(".desktop-shortcut").forEach((shortcut) => {
    shortcut.addEventListener("click", (event) => {
      event.stopPropagation();
      $$(".desktop-shortcut").forEach((item) => item.classList.remove("is-selected"));
      shortcut.classList.add("is-selected");
      if (event.detail <= 1) openApp(shortcut.dataset.app);
    });
  });

  desktopIcons.addEventListener("click", (event) => {
    const shortcut = event.target.closest("[data-desktop-item]");
    if (!shortcut || event.target.closest("input")) return;
    event.stopPropagation();
    $$(".desktop-shortcut").forEach((item) => item.classList.remove("is-selected"));
    shortcut.classList.add("is-selected");
  });

  desktopIcons.addEventListener("dblclick", (event) => {
    const shortcut = event.target.closest("[data-desktop-item]");
    if (!shortcut || event.target.closest("input")) return;
    openDesktopItem(shortcut.dataset.desktopItem);
  });

  desktopIcons.addEventListener("keydown", (event) => {
    const shortcut = event.target.closest("[data-desktop-item]");
    if (!shortcut || event.target.closest("input")) return;
    if (event.key === "Enter") openDesktopItem(shortcut.dataset.desktopItem);
    if (event.key === "F2") beginItemRename(shortcut.dataset.desktopItem);
  });

  desktopIcons.addEventListener("contextmenu", (event) => {
    const shortcut = event.target.closest("[data-desktop-item]");
    if (!shortcut || event.target.closest("input")) return;
    event.preventDefault();
    event.stopPropagation();
    contextItemId = shortcut.dataset.desktopItem;
    const item = desktopItemById(contextItemId);
    if (!item) return;
    $$(".desktop-shortcut").forEach((entry) => entry.classList.remove("is-selected"));
    shortcut.classList.add("is-selected");
    $("[data-item-menu-icon]", itemContextMenu).src = OSLab.icons.file(item);
    closeFlyouts(itemContextMenu);
    const maxX = window.innerWidth - 326;
    const maxY = window.innerHeight - 468;
    itemContextMenu.style.left = `${Math.max(8, Math.min(event.clientX, maxX))}px`;
    itemContextMenu.style.top = `${Math.max(8, Math.min(event.clientY, maxY))}px`;
    itemContextMenu.classList.remove("is-hidden");
  });

  itemContextMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const action = event.target.closest("[data-item-action]")?.dataset.itemAction;
    const item = desktopItemById(contextItemId);
    if (!action || !item) return;
    if (action === "open") openDesktopItem(item.id);
    if (action === "cut" || action === "copy") {
      fileClipboard = { itemId: item.id, mode: action };
      OSLab.ui.notify(action === "cut" ? "Item recortado" : "Item copiado", item.name, "info");
    }
    if (action === "rename") window.setTimeout(() => beginItemRename(item.id), 20);
    if (action === "delete") moveDesktopItemToRecycle(item.id);
    if (action === "terminal") openApp("terminal");
    if (action === "properties") OSLab.ui.notify("Propriedades", "Este item pertence à pasta pessoal do usuário conectado.", "info");
    if (action === "copy-path" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(`C:\\Users\\${OSLab.users.getCurrent()?.username || "Aluno"}\\Desktop\\${item.name}`).catch(() => {});
    }
    itemContextMenu.classList.add("is-hidden");
  });

  $("#desktop-icons").addEventListener("click", (event) => event.stopPropagation());

  $("#global-search-input").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLocaleLowerCase("pt-BR");
    const matches = OSLab.apps.list()
      .filter((item) => item.id !== "installer" && (!item.installedOnly || OSLab.software?.isInstalled?.(item.id) || OSLab.store?.isInstalled?.(item.id)))
      .map((item) => ({ id: item.id, name: item.title, icon: item.icon }))
      .filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(query));

    $("#search-results").innerHTML = `
      <p>${query ? "Melhor correspondência" : "Principais aplicativos"}</p>
      ${matches
        .map(
          (item) => `
            <button type="button" data-app="${item.id}">
              <img src="${item.icon}" alt="" />
              <span><strong>${item.name}</strong><small>Aplicativo</small></span>
            </button>`,
        )
        .join("") || "<p>Nenhum resultado encontrado.</p>"}`;
  });

  $("#search-results").addEventListener("click", (event) => {
    const appButton = event.target.closest("[data-app]");
    if (appButton) openApp(appButton.dataset.app);
  });

  $("#start-search-input").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLocaleLowerCase("pt-BR");
    $$("#start-apps [data-app]").forEach((button) => {
      button.classList.toggle("is-hidden", !button.textContent.trim().toLocaleLowerCase("pt-BR").includes(query));
    });
  });

  $("#all-apps-button").addEventListener("click", () => $("#start-search-input").focus());

  function syncQuickSettings() {
    const network = OSLab.network.getSnapshot();
    state.quickSettings.wifi = network.wifiEnabled;
    state.quickSettings.airplane = network.airplaneMode;
    state.quickSettings.connectedSsid = network.connectedSsid;
    $$("[data-quick-action]").forEach((button) => {
      button.classList.toggle("is-active", Boolean(state.quickSettings[button.dataset.quickAction]));
    });
    $("#brightness-slider").value = String(state.brightness);
    $("#volume-slider").value = String(state.volume);
    $("#volume-slider").style.setProperty("--range-value", state.volume + "%");
    setVolume(state.volume, state.muted, false);
    const trayNetworkIcon = $("#quick-settings-button img");
    if (trayNetworkIcon) {
      trayNetworkIcon.src = network.airplaneMode ? "assets/icons/ui/airplane.png" : "assets/icons/ui/wifi.png";
      trayNetworkIcon.style.opacity = network.adapterConnected ? "1" : ".48";
    }
  }

  $$("[data-quick-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.quickAction;
      if (key === "wifi") OSLab.network.setWifi(!OSLab.network.getSnapshot().wifiEnabled);
      else if (key === "airplane") OSLab.network.setAirplaneMode(!OSLab.network.getSnapshot().airplaneMode);
      else { state.quickSettings[key] = !state.quickSettings[key]; saveState(); }
      syncQuickSettings();
      const settingsRecord = windows.get("settings");
      if (settingsRecord && ["home", "network"].includes(settingsRecord.settingsView)) {
        renderSettings(settingsRecord, settingsRecord.settingsView);
      }
    });
  });

  OSLab.network.subscribe(() => {
    syncQuickSettings();
    OSLab.wifiUI.render();
    const settingsRecord = windows.get("settings");
    if (settingsRecord && ["home", "network", "wifi", "wifi-known", "wifi-properties", "network-advanced"].includes(settingsRecord.settingsView)) renderSettings(settingsRecord, settingsRecord.settingsView);
  });

  $("#brightness-slider").addEventListener("input", (event) => {
    state.brightness = Number(event.target.value);
    saveState();
  });

  $("#volume-slider").addEventListener("input", (event) => {
    setVolume(Number(event.target.value), false);
  });

  $("#volume-slider").previousElementSibling?.addEventListener("click", () => setVolume(state.volume, !state.muted));

  desktop.addEventListener("contextmenu", (event) => {
    // composedPath guarda o caminho do clique: se a janela redesenhou o alvo (Gerenciador), ele já saiu do DOM e closest() não acharia a janela
    if (event.composedPath().some((node) => node.classList?.contains("app-window") || node.classList?.contains("taskbar"))) return;
    event.preventDefault();
    closeFlyouts(contextMenu);
    const maxX = window.innerWidth - 246;
    const maxY = window.innerHeight - 392;
    contextMenu.style.left = `${Math.max(8, Math.min(event.clientX, maxX))}px`;
    contextMenu.style.top = `${Math.max(8, Math.min(event.clientY, maxY))}px`;
    contextMenu.classList.toggle("open-left", event.clientX > window.innerWidth - 520);
    contextMenu.classList.remove("is-hidden");
  });

  contextMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const action = event.target.closest("[data-context-action]")?.dataset.contextAction;
    if (!action) return;
    if (action === "refresh") {
      $("#desktop-icons").animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
    }
    if (action.startsWith("view-")) {
      state.desktopView = action.replace("view-", "");
      saveState();
      renderDesktopFolders();
    }
    if (action.startsWith("sort-")) {
      state.desktopSort = action.replace("sort-", "");
      saveState();
      renderDesktopFolders();
    }
    if (action === "new-folder") createDesktopFolder();
    if (action === "new-text") createDesktopTextFile();
    if (action === "undo-rename" && state.lastRename) {
      const item = desktopItemById(state.lastRename.itemId);
      if (item) OSLab.fileSystem.rename(item.id, state.lastRename.previousName);
      state.lastRename = null;
      renderDesktopFolders();
    }
    if (action === "display") {
      const record = openApp("settings");
      renderSettings(record, "system");
    }
    if (action === "personalize") {
      const record = openApp("settings");
      renderSettings(record, "personalization");
    }
    if (action === "terminal") openApp("terminal");
    contextMenu.classList.add("is-hidden");
  });

  // como no Windows 11: espaço vazio = Gerenciador de Tarefas; em cima de um ícone = lista de atalhos do aplicativo
  taskbar.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeFlyouts(taskbarContextMenu);
    const appButton = event.target.closest(".taskbar-button, .system-tray, .task-clock, .vpn-indicator");
    const appId = appButton?.classList.contains("task-app") ? appButton.dataset.app : null;
    const app = appId ? appDefinitions[appId] || appDefinitions[taskGroup(appId)[0]?.appId] : null;
    taskbarContextMenu.dataset.jump = appId || "";
    taskbarContextMenu.innerHTML = app
      ? `<button type="button" role="menuitem" data-taskbar-action="open-app"><img src="${escapeHtml(app.icon)}" alt="" /><span>${escapeHtml(app.title)}</span></button>${taskGroup(appId).length ? '<button type="button" role="menuitem" data-taskbar-action="close-app"><img src="assets/icons/ui/close.png" alt="" /><span>Fechar janela</span></button>' : ""}`
      : '<button type="button" role="menuitem" data-taskbar-action="task-manager"><img src="assets/icons/taskmanager.png" alt="" /><span>Gerenciador de Tarefas</span></button><button type="button" role="menuitem" data-taskbar-action="taskbar-settings"><img src="assets/icons/settings.png" alt="" /><span>Configurações da barra de tarefas</span></button>';
    OSLab.events.emit("taskbar:context-menu", { empty: !appButton, appId }, "taskbar");
    const maxX = window.innerWidth - 286;
    taskbarContextMenu.style.left = `${Math.max(8, Math.min(event.clientX, maxX))}px`;
    taskbarContextMenu.style.bottom = `${window.innerHeight - event.clientY + 8}px`;
    taskbarContextMenu.classList.remove("is-hidden");
  });

  taskbarContextMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const action = event.target.closest("[data-taskbar-action]")?.dataset.taskbarAction;
    const jumpApp = taskbarContextMenu.dataset.jump;
    if (action === "task-manager") { OSLab.events.emit("taskbar:task-manager", {}, "taskbar"); openApp("taskmanager"); }
    if (action === "open-app" && jumpApp) activateTaskGroup(jumpApp, jumpApp);
    if (action === "close-app" && jumpApp) taskGroup(jumpApp).forEach((record) => closeWindow(record));
    if (action === "taskbar-settings") {
      const record = openApp("settings");
      renderSettings(record, "personalization");
    }
    taskbarContextMenu.classList.add("is-hidden");
  });

  desktop.addEventListener("click", (event) => {
    if (!event.target.closest(".flyout") && !event.target.closest(".taskbar")) closeFlyouts();
    if (!event.target.closest(".desktop-shortcut")) {
      $$(".desktop-shortcut").forEach((item) => item.classList.remove("is-selected"));
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeFlyouts();
    if (event.key === "Meta" && !desktop.classList.contains("is-hidden")) {
      event.preventDefault();
      toggleFlyout(startMenu, startButton);
    }
  });

  function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const date = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const fullDate = now.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    $("#taskbar-time").textContent = time;
    $("#taskbar-date").textContent = date;
    $("#calendar-time").textContent = time;
    $("#calendar-date").textContent = fullDate;
    $$("[data-settings-time]").forEach((element) => {
      element.textContent = time;
    });
    $$("[data-settings-date]").forEach((element) => {
      element.textContent = fullDate;
    });
  }

  ["file:created", "file:deleted", "recycle:restored", "recycle:deleted", "recycle:emptied"].forEach((type) => OSLab.events.subscribe(type, () => {
    const computer = windows.get("computer"); if (computer) renderApp(computer);
    $$('[data-app="recycle"] img').forEach((image) => { image.src = recycleIcon(48); });
    const settings = windows.get("settings"); if (settings?.settingsView === "storage") renderSettings(settings, "storage");
  }));

  document.title = "Entrar — OSLab";
  OSLab.apps.synchronizeStaticEntries(document);
  renderLoginUsers();
  updateIdentityUI();
  applyWallpaper(currentWallpaperId, false);
  renderDesktopFolders();
  renderInstalledStartApps();
  OSLab.software?.subscribe?.(() => {
    renderDesktopFolders();
    renderInstalledStartApps();
  });
  // rede de segurança: sem Gerenciador aberto não há como trazer o Explorer de volta (Ctrl+Shift+Esc é do navegador)
  OSLab.events.subscribe("app:closed", ({ detail }) => {
    if (detail?.appId !== "taskmanager" || OSLab.processManager.isExplorerRunning()) return;
    window.setTimeout(() => { if (OSLab.processManager.startExplorer("safety").ok) OSLab.ui.notify("Windows Explorer reiniciado", "A barra de tarefas voltou. Para trazê-la de volta sozinho, use Executar nova tarefa › explorer.exe.", "info", 6000); }, 1500);
  });
  applyAppearance();
  window.OSLabBootAt = Date.now();
  // Labirinto da Informática: no modo embutido o OSLab entra direto na Área de Trabalho.
  if (window.OSLAB_EMBED) {
    OSLab.embed = {
      shell: OSLab.shell,
      ready: (async () => {
        const account = OSLab.users.getSelected();
        const result = await OSLab.users.authenticate(account.id, "alunos2026");
        if (!result.ok) throw new Error("login do Aluno falhou");
        state.themeChosen = true;
        showDesktop();
        return true;
      })(),
      setTheme: setSystemTheme,
      getTheme: () => state.theme,
    };
  } else bootScreen();
  OSLab.wifiLab.initialize();
  saveState();
  updateClock();
  window.setInterval(updateClock, 1000);
  window.setTimeout(() => passwordInput.focus(), 80);
})();
