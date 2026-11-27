(function createBrowserState(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  let nextId = 1;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const label = (url) => ({ gmail: "Gmail", outlook: "Outlook", yahoo: "Yahoo Mail", netflix: "Netflix", spotify: "Spotify", discord: "Discord", youtube: "YouTube", drive: "Google Drive" })[String(url).match(/^([a-z]+)\.oslab\.local(?:\/|$)/)?.[1]] || ({ "newtab": "Nova guia", "google.com": "Google", "www.google.com": "Google", "wikipedia.org": "Wikipédia", "youtube.com": "YouTube", "hardware.oslab.local": "Hardware — Guia Básico", "componentes.oslab.local": "Componentes internos", "falha.oslab.local": "Página de estudo" })[url] || (url.startsWith("search:") ? `${decodeURIComponent(url.slice(7))} - Pesquisa Google` : url);
  function tab(url = "google.com") {
    return { id: `tab-${nextId++}`, title: label(url), url, page: url, history: [url], historyIndex: 0 };
  }
  function create(home = "google.com") {
    const first = tab(home);
    return { currentUrl: home, history: [{ url: home, title: label(home), at: Date.now() }], historyIndex: 0, tabs: [first], activeTab: first.id, closedTabs: [], favorites: [], searchQuery: "", historyOpen: false };
  }
  function active(state) { return state.tabs.find((item) => item.id === state.activeTab) || null; }
  function sync(state) {
    const item = active(state);
    state.currentUrl = item?.url || "google.com";
    state.historyIndex = item?.historyIndex ?? 0;
    state.searchQuery = item?.url.startsWith("search:") ? decodeURIComponent(item.url.slice(7)) : "";
  }
  function visit(state, url) { state.history.unshift({ url, title: label(url), at: Date.now() }); }
  function navigate(state, url, options = {}) {
    const item = active(state);
    if (!item || !url) return false;
    if (options.push === false && item.url === url) { sync(state); return false; }
    if (options.push !== false) {
      if (item.url === url) return false;
      item.history = item.history.slice(0, item.historyIndex + 1);
      item.history.push(url);
      item.historyIndex++;
      visit(state, url);
    }
    item.url = url; item.page = url; item.title = label(url); sync(state); return true;
  }
  function back(state) { const item = active(state); if (!item || item.historyIndex <= 0) return false; item.historyIndex--; return navigate(state, item.history[item.historyIndex], { push: false }); }
  function forward(state) { const item = active(state); if (!item || item.historyIndex >= item.history.length - 1) return false; item.historyIndex++; return navigate(state, item.history[item.historyIndex], { push: false }); }
  function open(state, url = "google.com") { const item = tab(url); state.tabs.push(item); state.activeTab = item.id; sync(state); visit(state, url); return item; }
  function activate(state, id) { if (state.activeTab === id || !state.tabs.some((item) => item.id === id)) return false; state.activeTab = id; sync(state); return true; }
  function close(state, id = state.activeTab) {
    const index = state.tabs.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const [item] = state.tabs.splice(index, 1);
    state.closedTabs.unshift({ tab: copy(item), index });
    if (!state.tabs.length) state.tabs.push(tab());
    if (state.activeTab === id) state.activeTab = state.tabs[Math.min(index, state.tabs.length - 1)].id;
    sync(state); return item;
  }
  function restore(state) {
    const entry = state.closedTabs.shift();
    if (!entry) return null;
    state.tabs.splice(Math.min(entry.index, state.tabs.length), 0, entry.tab);
    state.activeTab = entry.tab.id; sync(state); return entry.tab;
  }
  function favorite(state, name) {
    const url = state.currentUrl;
    if (state.favorites.some((item) => item.url === url)) return false;
    state.favorites.push({ url, title: name || label(url), folder: "Barra de favoritos" }); return true;
  }
  function openHistory(state) { if (state.historyOpen) return false; state.historyOpen = true; return true; }
  function hydrate(saved) {
    if (!saved?.tabs?.length || !saved.tabs.every(t => typeof t.url === "string" && Array.isArray(t.history))) return null;
    const state = copy(saved);
    [...state.tabs, ...(state.closedTabs || []).map(e => e.tab)].forEach(t => t.title = label(t.url));
    nextId = Math.max(nextId, ...[...state.tabs, ...(state.closedTabs || []).map(e => e.tab)].map(t => Number(t.id.replace("tab-", "")) + 1));
    sync(state); return state;
  }
  OSLab.browserState = { hydrate, create, active, navigate, back, forward, open, activate, close, restore, favorite, openHistory, label, snapshot: copy };
})(window);
