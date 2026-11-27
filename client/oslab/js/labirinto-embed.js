// Labirinto da Informática — modo embutido do OSLab.
// Carregado antes de todos os outros scripts. Com ?embed=labirinto:
// - o armazenamento fica só na memória (cada desafio começa limpo e o OSLab do aluno não é alterado);
// - o OSLab entra direto na Área de Trabalho (ver script.js) e não baixa o cache offline.
(function prepareLabirintoEmbed() {
  "use strict";
  const params = new URLSearchParams(location.search);
  const embed = params.get("embed") === "labirinto";
  window.OSLAB_EMBED = embed;
  if (!embed) return;
  document.documentElement.classList.add("oslab-embed");

  function memoryStorage(seed) {
    const map = new Map(Object.entries(seed || {}));
    return {
      getItem: (key) => (map.has(String(key)) ? map.get(String(key)) : null),
      setItem: (key, value) => { map.set(String(key), String(value)); },
      removeItem: (key) => { map.delete(String(key)); },
      clear: () => map.clear(),
      key: (index) => [...map.keys()][index] ?? null,
      get length() { return map.size; },
    };
  }
  const seed = { "oslab-state-v1": JSON.stringify({ themeChosen: true, theme: "light", wallpaperId: "2", volume: 60, muted: false }) };
  try {
    Object.defineProperty(window, "localStorage", { value: memoryStorage(seed), configurable: true });
    Object.defineProperty(window, "sessionStorage", { value: memoryStorage(), configurable: true });
  } catch (error) {
    console.warn("OSLab embutido sem armazenamento isolado", error);
  }
})();
