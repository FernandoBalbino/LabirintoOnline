(function createWindowsSettingsIcons(global) {
  "use strict";
  // Original glyphs from win11React settingsData.json, commit afb02e7.
  const glyphs = {
    "Tela": "\ue7f8", "Som": "\ue767", "Notificações": "\uea8f", "Foco": "\ue708",
    "Energia": "\ued03", "Armazenamento": "\ueda2", "Compartilhamento por proximidade": "\ue72d",
    "Multitarefas": "\ue7c4", "Ativação": "\ue930", "Solução de Problemas": "\ue90f", "Avançado": "\ueda3",
    "Tela de fundo": "\ue91b", "Cores": "\ue790", "Temas": "\ue771", "Tela de bloqueio": "\uee3f",
    "Entrada de texto": "\ue765", "Iniciar": "\uecfd", "Barra de Tarefas": "\ue328", "Fontes": "\ue8d2", "Uso do dispositivo": "\uec76",
    "Suas informações": "\ue779", "Opções de entrada": "\ue8d7", "Outros usuários": "\ue716",
    "Dispositivos": "\ue772", "Bluetooth": "\ue702", "Impressoras e scanners": "\ue749", "Seu Telefone": "\ue8ea",
    "Câmeras": "\ue722", "Mouse": "\ue962", "Touchpad": "\uefa5", "Caneta e Windows Ink": "\uedc6", "Reprodução Automática": "\uec57", "USB": "\ue88e",
    "Wi-Fi": "\ue701", "VPN": "\ue705", "Hotspot móvel": "\ue704", "Modo avião": "\ue709", "Proxy": "\ue968",
    "Aplicativos instalados": "\uf2c7", "Aplicativos padrão": "\ue42a", "Mapas offline": "\ue826", "Aplicativos para sites": "\uf6ab", "Reprodução de vídeo": "\ue116", "Inicialização": "\ue7b5",
    "Data e hora": "\uec92", "Idioma e região": "\uf2b7", "Digitação": "\ue765", "Fala": "\uefa9",
  };
  function markup(name, fallback) {
    const glyph = glyphs[name];
    return glyph ? `<i class="settings-symbol" aria-hidden="true">${glyph}</i>` : `<img src="${global.OSLab.ui.escapeHtml(fallback)}" alt="" />`;
  }
  global.OSLab.windowsIcons = { markup, glyphs: Object.freeze(glyphs) };
})(window);
