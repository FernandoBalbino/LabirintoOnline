(function createUserState(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const STORAGE_KEY = "oslab.users.state.v1";
  const listeners = new Set();
  const PROFILE_KEYS = ["theme", "themeChosen", "wallpaperId", "desktopFolders", "desktopFiles", "recycleBin", "fileSystem", "lastSettingsPage", "desktopView", "desktopSort", "lastRename"];
  let systemState = null;
  let stateApplied = () => {};
  let currentUserId = null;

  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function now() { return new Date().toISOString(); }
  function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`; }
  function normalizeName(value) { return String(value || "").trim().replace(/\s+/g, " ").slice(0, 48); }
  function usernameFor(value) {
    return normalizeName(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "usuario";
  }
  function blankProfile() {
    return {
      preferences: { theme: "light", wallpaperId: "1", desktopView: "medium", desktopSort: "manual", lastSettingsPage: "home" },
      privateFileSystem: { version: 2, items: [] }, shortcuts: [], perUserPrograms: {}, appData: {}, systemState: null,
    };
  }
  function defaults() {
    const id = "user-aluno";
    return {
      version: 1,
      accounts: [{ id, username: "aluno", displayName: "Aluno", role: "administrator", avatar: "assets/icons/avatar.webp", credential: { kind: "legacy-default" }, createdAt: now() }],
      profiles: { [id]: blankProfile() },
      device: { publicItems: [] },
      lastSelectedUserId: id,
      updatedAt: now(),
    };
  }
  function load() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || !Array.isArray(parsed.accounts) || !parsed.accounts.length) return defaults();
      const base = defaults();
      base.accounts = parsed.accounts.filter((account) => account?.id && account?.displayName).map((account) => ({
        id: String(account.id), username: usernameFor(account.username || account.displayName), displayName: normalizeName(account.displayName),
        role: account.role === "administrator" ? "administrator" : "standard", avatar: account.avatar || "assets/icons/avatar.webp",
        credential: account.credential && typeof account.credential === "object" ? account.credential : { kind: "locked" }, createdAt: account.createdAt || now(),
      }));
      base.profiles = {};
      base.accounts.forEach((account) => {
        const profile = base.profiles[account.id] = { ...blankProfile(), ...(parsed.profiles?.[account.id] || {}) };
        // cada usuário guarda o próprio modo (claro ou escuro)
        profile.preferences = { ...blankProfile().preferences, ...profile.preferences, theme: profile.preferences?.theme === "dark" ? "dark" : "light" };
        if (profile.systemState) profile.systemState.theme = profile.systemState.theme === "dark" ? "dark" : "light";
      });
      base.device = { publicItems: Array.isArray(parsed.device?.publicItems) ? parsed.device.publicItems : [] };
      base.lastSelectedUserId = base.accounts.some((account) => account.id === parsed.lastSelectedUserId) ? parsed.lastSelectedUserId : base.accounts[0].id;
      return base;
    } catch (_error) { return defaults(); }
  }

  let state = load();
  function save() {
    state.updatedAt = now();
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_error) { /* Continua somente em memória. */ }
    listeners.forEach((listener) => listener(snapshot()));
  }
  function snapshot() { return clone({ ...state, currentUserId }); }
  function accountById(id) { return state.accounts.find((account) => account.id === id) || null; }
  function getCurrent() { return accountById(currentUserId); }
  function getSelected() { return accountById(state.lastSelectedUserId) || state.accounts[0]; }
  function publicItemIds(items) {
    const ids = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      items.forEach((item) => {
        if (item.parentId === "root-public" || ids.has(item.parentId)) {
          if (!ids.has(item.id)) { ids.add(item.id); changed = true; }
        }
      });
    }
    return ids;
  }
  function captureSystemState(target = systemState, userId = currentUserId || state.lastSelectedUserId, persist = true) {
    if (!target || !accountById(userId)) return false;
    target.theme = target.theme === "dark" ? "dark" : "light";
    const profile = state.profiles[userId] = state.profiles[userId] || blankProfile();
    const items = Array.isArray(target.fileSystem?.items) ? clone(target.fileSystem.items) : [];
    const sharedIds = publicItemIds(items);
    state.device.publicItems = items.filter((item) => sharedIds.has(item.id));
    profile.privateFileSystem = { version: 2, items: items.filter((item) => !sharedIds.has(item.id)) };
    profile.systemState = {};
    PROFILE_KEYS.filter((key) => key !== "fileSystem").forEach((key) => { profile.systemState[key] = clone(target[key]); });
    profile.preferences = {
      theme: target.theme,
      wallpaperId: target.wallpaperId || "1", desktopView: target.desktopView || "medium", desktopSort: target.desktopSort || "manual", lastSettingsPage: target.lastSettingsPage || "home",
    };
    if (persist) save();
    return true;
  }
  function applyProfile(userId) {
    const profile = state.profiles[userId] || (state.profiles[userId] = blankProfile());
    if (!systemState) return;
    const saved = profile.systemState || {};
    systemState.themeChosen = false;
    PROFILE_KEYS.filter((key) => key !== "fileSystem").forEach((key) => {
      if (saved[key] !== undefined) systemState[key] = clone(saved[key]);
    });
    systemState.wallpaperId = profile.preferences?.wallpaperId || saved.wallpaperId || "1";
    systemState.desktopView = profile.preferences?.desktopView || saved.desktopView || "medium";
    systemState.desktopSort = profile.preferences?.desktopSort || saved.desktopSort || "manual";
    systemState.lastSettingsPage = profile.preferences?.lastSettingsPage || saved.lastSettingsPage || "home";
    systemState.theme = (profile.preferences?.theme || saved.theme) === "dark" ? "dark" : "light";
    systemState.fileSystem = { version: 2, items: [...clone(profile.privateFileSystem?.items || []), ...clone(state.device.publicItems || [])] };
    systemState.desktopFolders = [];
    systemState.desktopFiles = [];
    systemState.recycleBin = [];
    stateApplied(clone(systemState), accountById(userId));
  }
  function bindSystemState(sharedState, onApplied) {
    systemState = sharedState;
    stateApplied = typeof onApplied === "function" ? onApplied : stateApplied;
    const selectedId = getSelected().id;
    const profile = state.profiles[selectedId] = state.profiles[selectedId] || blankProfile();
    if (!profile.systemState) captureSystemState(sharedState, selectedId, true);
    return snapshot();
  }

  function randomSalt() {
    const bytes = new Uint8Array(16);
    if (global.crypto?.getRandomValues) global.crypto.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  async function derive(password, salt, iterations = 60000) {
    if (global.crypto?.subtle && global.TextEncoder) {
      const encoder = new TextEncoder();
      const key = await global.crypto.subtle.importKey("raw", encoder.encode(String(password)), "PBKDF2", false, ["deriveBits"]);
      const bits = await global.crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations, hash: "SHA-256" }, key, 256);
      return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    let hash = 2166136261;
    const input = `${salt}:${password}`;
    for (let round = 0; round < 4000; round += 1) for (let index = 0; index < input.length; index += 1) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619) >>> 0;
    return hash.toString(16).padStart(8, "0");
  }
  async function makeCredential(password) {
    const salt = randomSalt();
    const iterations = 60000;
    return { kind: "pbkdf2", salt, iterations, hash: await derive(password, salt, iterations) };
  }
  async function verify(account, password) {
    if (!account) return false;
    if (account.credential?.kind === "legacy-default") {
      if (String(password) !== "alunos2026") return false;
      account.credential = await makeCredential(password);
      save();
      return true;
    }
    if (account.credential?.kind !== "pbkdf2") return false;
    return (await derive(password, account.credential.salt, account.credential.iterations)) === account.credential.hash;
  }
  async function authenticate(userId, password) {
    const account = accountById(userId);
    if (!await verify(account, password)) {
      OSLab.events?.emit?.("session:sign-in-failed", { userId }, "users");
      return { ok: false, reason: "invalid-credentials" };
    }
    if (currentUserId) captureSystemState(systemState, currentUserId, false);
    const previousUserId = currentUserId;
    currentUserId = account.id;
    state.lastSelectedUserId = account.id;
    applyProfile(account.id);
    save();
    OSLab.events?.emit?.(previousUserId && previousUserId !== account.id ? "session:switched" : "session:signed-in", { userId: account.id, previousUserId }, "users");
    return { ok: true, account: clone(account) };
  }
  function selectUser(userId) {
    if (!accountById(userId)) return false;
    state.lastSelectedUserId = userId;
    save();
    OSLab.events?.emit?.("session:user-selected", { userId }, "users");
    return true;
  }
  function signOut() {
    const previousUserId = currentUserId;
    if (previousUserId) captureSystemState(systemState, previousUserId, false);
    currentUserId = null;
    save();
    OSLab.events?.emit?.("session:signed-out", { userId: previousUserId }, "users");
  }
  function lock() { OSLab.events?.emit?.("session:locked", { userId: currentUserId }, "users"); }
  async function createAccount(input = {}) {
    const displayName = normalizeName(input.displayName);
    const password = String(input.password || "");
    if (!displayName) return { ok: false, reason: "name-required" };
    if (password.length < 4) return { ok: false, reason: "weak-password" };
    let username = usernameFor(input.username || displayName);
    if (state.accounts.some((account) => account.username === username || account.displayName.toLocaleLowerCase("pt-BR") === displayName.toLocaleLowerCase("pt-BR"))) return { ok: false, reason: "duplicate" };
    let suffix = 2;
    const base = username;
    while (state.accounts.some((account) => account.username === username)) username = `${base}${suffix++}`;
    const account = { id: makeId("user"), username, displayName, role: input.role === "administrator" ? "administrator" : "standard", avatar: "assets/icons/avatar.webp", credential: await makeCredential(password), createdAt: now() };
    state.accounts.push(account);
    state.profiles[account.id] = blankProfile();
    save();
    OSLab.events?.emit?.("account:created", { userId: account.id, username, displayName, role: account.role }, "users");
    return { ok: true, account: clone(account) };
  }
  function setRole(userId, role, options = {}) {
    const account = accountById(userId);
    const nextRole = role === "administrator" ? "administrator" : "standard";
    if (!account) return { ok: false, reason: "missing" };
    if (account.role === "administrator" && nextRole === "standard" && state.accounts.filter((item) => item.role === "administrator").length === 1) return { ok: false, reason: "last-admin" };
    const previousRole = account.role;
    account.role = nextRole;
    save();
    OSLab.events?.emit?.("account:type-changed", { userId, previousRole, role: nextRole, actorUserId: currentUserId, authorizationId: options.authorizationId || null }, "users");
    return { ok: true, account: clone(account) };
  }
  function updateProfile(input = {}) {
    const account = getCurrent();
    if (!account) return false;
    if (input.displayName) account.displayName = normalizeName(input.displayName);
    if (input.avatar) account.avatar = String(input.avatar);
    save();
    OSLab.events?.emit?.("profile:updated", { userId: account.id, displayName: account.displayName, avatar: account.avatar }, "users");
    return true;
  }
  async function authorizeAdministrator(userId, password) {
    const account = accountById(userId);
    if (!account || account.role !== "administrator" || !await verify(account, password)) return { ok: false };
    return { ok: true, administratorId: account.id, token: makeId("elevation") };
  }
  function resetTrackData() {
    state.accounts = state.accounts.filter((account) => account.id === "user-aluno");
    state.profiles = { "user-aluno": state.profiles["user-aluno"] || blankProfile() };
    state.device.publicItems = [];
    state.lastSelectedUserId = "user-aluno";
    currentUserId = "user-aluno";
    applyProfile("user-aluno");
    save();
    OSLab.events?.emit?.("users:reset", {}, "users");
  }

  OSLab.users = {
    storageKey: STORAGE_KEY, bindSystemState, captureSystemState, applyProfile, authenticate, selectUser, signOut, lock,
    createAccount, setRole, updateProfile, authorizeAdministrator, resetTrackData,
    getCurrent: () => getCurrent() ? clone(getCurrent()) : null,
    getSelected: () => clone(getSelected()), list: () => state.accounts.map(clone),
    getProfile: (userId) => state.profiles[userId] ? clone(state.profiles[userId]) : null,
    isAdministrator: (userId = currentUserId) => accountById(userId)?.role === "administrator",
    getPublicItems: () => clone(state.device.publicItems), snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
})(window);
