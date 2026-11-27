(function createZapApp(global) {
  "use strict";

  // Interface do WhatsApp (trilha Segurança Digital), no layout do WhatsApp Desktop para Windows.
  const O = global.OSLab;
  const Z = () => O.zap;
  const GUIDE = "oslab";
  const safe = (value) => O.ui.escapeHtml(value);
  const records = new Set();
  const reduceMotion = () => global.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let selected = null;
  const GROUP = "grupo";
  const G = () => O.zapGroup;
  const GROUP_AVATAR = "assets/whatsapp/people/turma.svg";
  const SENDER_COLORS = ["#e542a3", "#1f7aec", "#c88a00", "#02a698", "#ff6b2b", "#a35ef2", "#2c9be5", "#d1477a"];
  let filter = "all";
  let typingOut = false;

  // Ícones de traço no estilo Lucide (licença ISC), redesenhados para 24×24.
  const ICON = {
    chats: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    status: '<path d="M10.1 2.18a9.93 9.93 0 0 1 3.8 0M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7M21.82 10.1a9.93 9.93 0 0 1 0 3.8M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69M13.9 21.82a9.94 9.94 0 0 1-3.8 0M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7M2.18 13.9a9.93 9.93 0 0 1 0-3.8M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69"/><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>',
    channels: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    communities: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    compose: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.4 2.6a2.12 2.12 0 1 1 3 3L12 15l-4 1 1-4Z"/>',
    more: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    video: '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    lock: '<rect width="16" height="10" x="4" y="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
    doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h6M16 13H8M16 17H8M10 9H8"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checks: '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
    hangup: '<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7a2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91"/><path d="M22 2 2 22"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    chatsq: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 8h8M8 12h5"/>',
    newchat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v6M9 10h6"/>',
    clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    sticker: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4M9 13h.01M15 13h.01M9.5 16.5s1 1 2.5 1 2.5-1 2.5-1"/>',
    images: '<path d="M18 22H4a2 2 0 0 1-2-2V6"/><path d="m22 13-1.3-1.3a2.41 2.41 0 0 0-3.4 0L11 18"/><circle cx="12" cy="8" r="2"/><rect width="16" height="16" x="6" y="2" rx="2"/>',
    userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-9 5.7a2 2 0 0 1-2 0L2 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    pinned: '<path d="M12 17v5M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76zM8 2h8"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  };
  const ART = '<svg viewBox="0 0 120 82" aria-hidden="true"><rect x="20" y="4" width="80" height="54" rx="5" fill="#e7e1d6"/><rect x="25" y="9" width="70" height="44" rx="2" fill="#fbf8f3"/><rect x="31" y="15" width="24" height="32" rx="3" fill="#25d366"/><path d="M36 23h14M36 29h14M36 35h9" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M76 16l12 5v8c0 8-5 13-12 16-7-3-12-8-12-16v-8z" fill="#fff" stroke="#1daa61" stroke-width="2.4"/><path d="M71 30l4 4 7-8" fill="none" stroke="#1daa61" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 60h108l-8 8H14z" fill="#d6cfc2"/><rect x="50" y="60" width="20" height="3" rx="1.5" fill="#bfb6a6"/></svg>';
  const svg = (name, cls = "") => `<svg class="zap-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
  const time = (ts) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // ---------- Dados derivados ----------
  function person(id) { return Z().contact(id); }
  function displayName(id) { const p = person(id); return p.unknown && !/^\+/.test(p.name) ? p.phone : p.name; }
  function chats() {
    const state = Z().get();
    return Object.values(state.chats).sort((a, b) => (a.id === GUIDE ? -1 : b.id === GUIDE ? 1 : b.lastAt - a.lastAt));
  }
  function preview(chat) {
    if (chat.typing) return `<em class="zap-typing-text">${chat.typing === "audio" ? "gravando áudio…" : "digitando…"}</em>`;
    const last = [...chat.messages].reverse().find((m) => m.from !== "system") || chat.messages[chat.messages.length - 1];
    if (!last) return "";
    const mine = last.from === "me" ? `${svg(last.status === "read" ? "checks" : "check", last.status === "read" ? "is-read" : "")}` : "";
    const label = {
      text: last.text, image: `📷 ${last.caption || "Foto"}`, audio: `🎤 Mensagem de voz (${last.dur})`, file: `📄 ${last.name}`, link: last.url,
      pix: `💸 PIX de ${last.amount}`, location: "📍 Localização em tempo real", deleted: "🚫 Esta mensagem foi apagada", sticker: `${last.emoji} Figurinha`,
      lesson: `${last.tone === "bad" ? "⚠️" : last.tone === "info" ? "💡" : "✅"} ${last.title}`, report: "🏆 Relatório final da trilha", system: last.text, call: `📞 ${last.text}`,
    }[last.t] || "";
    return `${mine}<span>${safe(label)}</span>`;
  }

  // ---------- Esqueleto ----------
  function shell(record) {
    const me = O.users?.getCurrent?.() || O.users?.getSelected?.();
    record.content.innerHTML = `<section class="zap" data-zap-root data-theme="${Z().theme() || "dark"}">
      <nav class="zap-rail" aria-label="Navegação do WhatsApp">
        <button type="button" class="zap-iconbtn is-active" title="Conversas" aria-label="Conversas" data-zap-tab="chats">${svg("chatsq")}<b class="zap-rail-badge" data-zap-total hidden></b></button>
        <button type="button" class="zap-iconbtn" title="Ligações" aria-label="Ligações" data-zap-soon>${svg("phone")}</button>
        <button type="button" class="zap-iconbtn zap-rail-dot" title="Status" aria-label="Status" data-zap-soon>${svg("status")}</button>
        <button type="button" class="zap-iconbtn" title="Comunidades" aria-label="Comunidades" data-zap-soon>${svg("communities")}</button>
        <i class="zap-rail-line"></i>
        <button type="button" class="zap-iconbtn" title="Canais" aria-label="Canais" data-zap-soon>${svg("channels")}</button>
        <span class="zap-rail-space"></span>
        <button type="button" class="zap-iconbtn" title="Mídia, links e docs" aria-label="Mídia, links e docs" data-zap-soon>${svg("images")}</button>
        <button type="button" class="zap-iconbtn" title="Configurações" aria-label="Configurações" data-zap-tab="settings">${svg("gear")}</button>
        <img class="zap-rail-me" src="${safe(me?.avatar || "assets/icons/avatar.webp")}" alt="Seu perfil" />
      </nav>
      <aside class="zap-list">
        <header class="zap-list-head"><h1>WhatsApp</h1><div><button type="button" class="zap-iconbtn" title="Mais opções" aria-label="Mais opções" data-zap-menu>${svg("more")}</button><button type="button" class="zap-new" title="Nova conversa" aria-label="Nova conversa" data-zap-soon>${svg("newchat")}</button></div></header>
        <label class="zap-search">${svg("search")}<input type="search" placeholder="Pesquisar ou começar uma nova conversa" aria-label="Pesquisar conversas" data-zap-search /></label>
        <div class="zap-chips" role="tablist" data-zap-chips></div>
        <div class="zap-trail" data-zap-trail></div>
        <ul class="zap-chats" data-zap-chats aria-label="Lista de conversas"></ul>
        <div class="zap-panel" data-zap-panel hidden></div>
      </aside>
      <main class="zap-conv" data-zap-conv></main>
      <div class="zap-layer" data-zap-layer></div>
    </section>`;
    record.zapRoot = record.content.querySelector("[data-zap-root]");
    record.zapShown = { chatId: null, count: 0 };
    wire(record);
  }

  function renderTrail(record) {
    const s = Z().summary();
    const next = Z().nextReleaseIn();
    record.zapRoot.querySelector("[data-zap-trail]").innerHTML = `<span class="zap-trail-icon">${svg("shield")}</span><div><strong>Trilha Segurança Digital · ${s.done} de ${s.total}</strong><small>✅ ${s.helped} ajudas · 🛡️ ${s.avoided} golpes evitados${s.fell ? ` · ⚠️ caiu em ${s.fell}` : ""}</small><i style="--p:${(s.done / s.total) * 100}%"></i></div>${next !== null && s.released < s.total ? `<em title="Próxima mensagem chega em">${Math.ceil(next / 1000)}s</em>` : ""}`;
    const total = chats().reduce((sum, chat) => sum + chat.unread, 0) + G().get().unread;
    const badge = record.zapRoot.querySelector("[data-zap-total]");
    badge.textContent = total ? String(total) : "";
    badge.hidden = !total;
  }

  function renderList(record) {
    const term = (record.zapRoot.querySelector("[data-zap-search]")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const list = chats().filter((chat) => {
      const p = person(chat.id);
      if (term && !`${p.name} ${p.phone}`.toLocaleLowerCase("pt-BR").includes(term)) return false;
      if (filter === "unread") return chat.unread > 0;
      if (filter === "done") return chat.status === "done";
      if (filter === "unknown") return Boolean(p.unknown);
      return true;
    });
    const all = chats();
    const unread = all.filter((chat) => chat.unread).length;
    const unknown = all.filter((chat) => person(chat.id).unknown).length;
    const done = all.filter((chat) => chat.status === "done" && chat.id !== GUIDE).length;
    const chips = [["all", "Tudo", 0], ["unread", "Não lidas", unread], ["unknown", "Desconhecidos", unknown], ["done", "Concluídas", done]]
      .map(([key, label, count]) => `<button type="button" class="${filter === key ? "is-on" : ""}" data-zap-filter="${key}">${label}${count ? ` <small>${count}</small>` : ""}</button>`).join("") + `<button type="button" class="is-plus" aria-label="Nova lista" data-zap-soon>${svg("plus")}</button>`;
    const chipBox = record.zapRoot.querySelector("[data-zap-chips]");
    if (record.zapChipsHtml !== chips) { chipBox.innerHTML = chips; record.zapChipsHtml = chips; }
    const rows = list.map((chat) => {
      const p = person(chat.id);
      const last = chat.messages[chat.messages.length - 1];
      return `<li><button type="button" class="zap-row${chat.id === selected ? " is-selected" : ""}${chat.unread ? " is-unread" : ""}" data-zap-chat="${safe(chat.id)}">
        <img src="${safe(p.avatar)}" alt="" loading="lazy" />
        <span class="zap-row-main"><span class="zap-row-top"><strong>${safe(displayName(chat.id))}</strong>${p.unknown && displayName(chat.id) !== p.name ? `<small class="zap-push">~${safe(p.name)}</small>` : ""}<time>${last ? time(last.at) : ""}</time></span>
        <span class="zap-row-bottom"><span class="zap-row-preview">${preview(chat)}</span>${chat.id === GUIDE ? `<em class="zap-pin" title="Fixada">${svg("pinned")}</em>` : ""}${chat.status === "done" && chat.id !== GUIDE ? `<em class="zap-done is-${safe(chat.outcome)}" title="Conversa concluída">${chat.outcome === "bad" ? "!" : "✓"}</em>` : ""}${chat.unread ? `<b class="zap-unread">${chat.unread}</b>` : ""}</span></span>
      </button></li>`;
    });
    const group = groupRow(term);
    if (group) rows.splice(rows.length && list[0].id === GUIDE ? 1 : 0, 0, group);
    const html = rows.length ? rows.join("") : `<li class="zap-empty-list">${term ? "Nenhuma conversa encontrada." : "Nenhuma conversa aqui ainda."}</li>`;
    // Redesenhar a lista no meio de um clique faria o clique se perder: só troca quando mudou.
    const box = record.zapRoot.querySelector("[data-zap-chats]");
    if (record.zapListHtml !== html) { box.innerHTML = html; record.zapListHtml = html; }
  }

  function groupPreview(g) {
    if (g.status === "connecting") return "conectando ao grupo da turma…";
    if (g.status !== "online") return "sem conexão · o grupo precisa de internet";
    const last = g.messages[g.messages.length - 1];
    if (!last) return `${g.members.length} online · diga oi para a turma 👋`;
    return `${last.from?.id === G().clientId ? "Você" : String(last.from?.name || "").split(" ")[0]}: ${last.text}`;
  }
  function groupRow(term) {
    if (!Z().profile()) return "";
    const g = G().get();
    if (term && !G().NAME.toLocaleLowerCase("pt-BR").includes(term)) return "";
    if (filter === "unread" && !g.unread) return "";
    if (filter === "done" || filter === "unknown") return "";
    const last = g.messages[g.messages.length - 1];
    return `<li><button type="button" class="zap-row${selected === GROUP ? " is-selected" : ""}${g.unread ? " is-unread" : ""}" data-zap-chat="${GROUP}">
        <img src="${GROUP_AVATAR}" alt="" />
        <span class="zap-row-main"><span class="zap-row-top"><strong>${safe(G().NAME)}</strong><time>${last ? time(last.at) : ""}</time></span>
        <span class="zap-row-bottom"><span class="zap-row-preview"><span>${safe(groupPreview(g))}</span></span><em class="zap-live is-${g.status}" title="Grupo em tempo real"></em>${g.unread ? `<b class="zap-unread">${g.unread}</b>` : ""}</span></span>
      </button></li>`;
  }

  // ---------- Grupo da turma (tempo real) ----------
  const senderColor = (id) => SENDER_COLORS[Array.from(String(id)).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7) % SENDER_COLORS.length];
  function groupStatus(g) {
    if (g.status === "connecting") return "conectando ao grupo…";
    if (g.status !== "online") return "sem conexão · o grupo precisa de internet (a trilha continua normal)";
    const others = g.members.filter((member) => member.id !== G().clientId).map((member) => String(member.name).split(" ")[0]);
    if (!others.length) return "só você por enquanto · chame a turma 👋";
    return `${others.slice(0, 6).join(", ")}${others.length > 6 ? ` e mais ${others.length - 6}` : ""} e você`;
  }
  function groupMessageHtml(m, previous) {
    const mine = m.from?.id === G().clientId;
    const first = !previous || previous.from?.id !== m.from?.id;
    const sender = !mine && first ? `<span class="zap-sender" style="color:${senderColor(m.from?.id)}">${safe(m.from?.name)}<small>${safe(m.from?.phone)}</small></span>` : "";
    return `<div class="zap-msg ${mine ? "is-out" : "is-in"}${first ? " is-first" : ""}"><div class="zap-bubble zap-t-text">${sender}<p>${safe(m.text)}</p><span class="zap-meta"><time>${time(m.at)}</time>${mine ? svg("checks", "zap-tick") : ""}</span></div></div>`;
  }
  function renderGroupConv(record) {
    const conv = record.zapRoot.querySelector("[data-zap-conv]");
    record.zapRoot.classList.add("has-chat");
    conv.innerHTML = `<header class="zap-conv-head">
        <button type="button" class="zap-back zap-iconbtn" aria-label="Voltar para a lista" data-zap-back>${svg("back")}</button>
        <img src="${GROUP_AVATAR}" alt="" />
        <div class="zap-conv-title"><strong>${safe(G().NAME)}</strong><small data-zap-group-status></small></div>
        <div class="zap-conv-actions"><button type="button" class="zap-iconbtn" aria-label="Chamada de vídeo" data-zap-soon>${svg("video")}</button><button type="button" class="zap-iconbtn" aria-label="Chamada de voz" data-zap-soon>${svg("phone")}</button><button type="button" class="zap-iconbtn" aria-label="Pesquisar na conversa" data-zap-soon>${svg("search")}</button></div>
      </header>
      <div class="zap-messages" data-zap-scroll>
        <div class="zap-day"><span>HOJE</span></div>
        <div class="zap-system is-lock"><span>${svg("lock")} Grupo em tempo real da turma. As mensagens ficam só enquanto o servidor estiver ligado.</span></div>
        <div class="zap-msg is-in is-first"><div class="zap-bubble"><span class="zap-sender" style="color:#1daa61">OSLab Dicas 🤖</span><p>Bem-vindos ao grupo da turma! 👋 Aqui vocês podem se ajudar nas missões do WhatsApp. Regras: respeito sempre, nada de ofensas e nada de dados pessoais (endereço, senha, documentos). Bons estudos! 🛡️</p><span class="zap-meta"><time>${time(Z().get().startedAt || Date.now())}</time></span></div></div>
        <div data-zap-group-feed></div>
      </div>
      <div class="zap-emoji-row" data-zap-emojis hidden>${["👋", "😂", "👍", "❤️", "🙏", "😮", "🔥", "✅"].map((emoji) => `<button type="button" data-zap-emoji="${emoji}">${emoji}</button>`).join("")}</div>
      <footer class="zap-composer"><form class="zap-composer-pill" data-zap-group-form><button type="button" class="zap-iconbtn" aria-label="Emojis" data-zap-emoji-toggle>${svg("sticker")}</button><input class="zap-group-input" name="text" maxlength="500" autocomplete="off" aria-label="Mensagem para o grupo" /><button type="submit" class="zap-iconbtn" aria-label="Enviar">${svg("send")}</button></form></footer>`;
    record.zapShown = { chatId: GROUP, count: 0 };
    record.zapGroupCount = 0;
    appendGroup(record, false);
  }
  function appendGroup(record, animate = true) {
    if (selected !== GROUP) return;
    const feed = record.zapRoot.querySelector("[data-zap-group-feed]");
    if (!feed) return;
    const g = G().get();
    if (record.zapGroupCount > g.messages.length) { feed.innerHTML = ""; record.zapGroupCount = 0; }
    const fresh = g.messages.slice(record.zapGroupCount);
    if (fresh.length) {
      feed.insertAdjacentHTML("beforeend", fresh.map((m, index) => groupMessageHtml(m, g.messages[record.zapGroupCount + index - 1])).join(""));
      if (animate && !reduceMotion()) feed.querySelectorAll(".zap-msg:not(.is-seen)").forEach((node) => node.classList.add("is-new"));
      feed.querySelectorAll(".zap-msg").forEach((node) => node.classList.add("is-seen"));
      record.zapGroupCount = g.messages.length;
      scrollDown(record);
    }
    record.zapRoot.querySelector("[data-zap-group-status]").textContent = groupStatus(g);
    const input = record.zapRoot.querySelector(".zap-group-input");
    input.disabled = g.status !== "online";
    input.placeholder = g.status === "online" ? "Digite uma mensagem" : g.status === "connecting" ? "Conectando ao grupo…" : "Sem conexão com o grupo…";
  }

  // ---------- Conversa ----------
  function bubbleContent(m) {
    if (m.t === "image") return `<button type="button" class="zap-photo" data-zap-photo="${safe(m.src)}"><img src="${safe(m.src)}" alt="${safe(m.caption || "Foto")}" loading="lazy" /></button>${m.caption ? `<p>${safe(m.caption)}</p>` : ""}`;
    if (m.t === "audio") return `<div class="zap-voice" data-zap-voice><button type="button" aria-label="Ouvir mensagem de voz" data-zap-play>${svg("play")}</button><span class="zap-wave"><i></i></span><small>${safe(m.dur)}</small></div><p class="zap-transcript" hidden>📝 ${safe(m.transcript)}</p>`;
    if (m.t === "file") return `<div class="zap-file">${fileIcon(m.name, m.mime)}<span><strong>${safe(m.name)}</strong><small>${safe((m.name.split(".").pop() || "").toUpperCase())} · ${safe(m.size)}</small></span></div>`;
    if (m.t === "link") return `<button type="button" class="zap-link" data-zap-link="${safe(m.url)}" data-zap-open="${safe(m.open)}"><span class="zap-link-card"><strong>${safe(m.title)}</strong><small>${safe(m.domain)}</small></span><span class="zap-link-url">${safe(m.url)}</span></button>`;
    if (m.t === "pix") return `<div class="zap-pix"><span>💸</span><div><small>PIX enviado</small><strong>${safe(m.amount)}</strong><small>para ${safe(m.to)}</small></div></div>`;
    if (m.t === "location") return `<div class="zap-map" aria-label="Mapa da localização"><span class="zap-map-pin">${svg("pin")}</span></div><p><strong>📍 Localização em tempo real</strong><br /><small>Compartilhando por 8 horas</small></p>`;
    if (m.t === "deleted") return `<p class="zap-deleted">${svg("ban")} Esta mensagem foi apagada</p>`;
    if (m.t === "sticker") return `<span class="zap-sticker">${safe(m.emoji)}</span>`;
    if (m.t === "lesson") return `<div class="zap-lesson is-${safe(m.tone)}"><small>Conversa com ${safe(m.contactName)}</small><strong>${safe(m.title)}</strong><p>${safe(m.text)}</p>${m.tips?.length ? `<ul>${m.tips.map((tip) => `<li>${safe(tip)}</li>`).join("")}</ul>` : ""}</div>`;
    if (m.t === "report") {
      const medal = m.fell === 0 && m.helped === m.learnTotal ? "🥇 Guardião Digital" : m.fell <= 2 ? "🥈 Muito atento(a)" : "🥉 Em treinamento";
      return `<div class="zap-report"><strong>🏆 Trilha Segurança Digital concluída!</strong><p>Você respondeu as ${m.total} conversas.</p><ul><li>✅ ${m.helped} de ${m.learnTotal} pessoas ajudadas no computador</li><li>🛡️ ${m.avoided} golpes e situações estranhas resolvidos com segurança</li><li>⚠️ ${m.fell} vezes em que você caiu</li></ul><b>${medal}</b><p>Releia as dicas acima e mostre seu resultado para o professor 👏</p></div>`;
    }
    return `<p>${safe(m.text)}</p>`;
  }
  function fileIcon(name, mime) {
    const ext = String(name).split(".").pop().toLowerCase();
    if (ext === "docx") return '<img src="assets/programs/word.svg" alt="" />';
    if (ext === "xlsx") return '<img src="assets/programs/excel.svg" alt="" />';
    if (/^image\//.test(mime || "")) return `<span class="zap-file-ico is-image">${svg("doc")}</span>`;
    return `<span class="zap-file-ico${ext === "pdf" ? " is-pdf" : ""}">${svg("doc")}</span>`;
  }
  function messageHtml(m, previous) {
    if (m.from === "system") return `<div class="zap-system${m.t === "call" ? " is-call" : ""}"><span>${m.t === "call" ? "📞 " : ""}${safe(m.text)}</span></div>`;
    const side = m.from === "me" ? "is-out" : "is-in";
    const first = !previous || previous.from !== m.from ? " is-first" : "";
    const bare = m.t === "sticker" ? " is-bare" : "";
    const ticks = m.from === "me" ? svg(m.status === "read" ? "checks" : "check", `zap-tick${m.status === "read" ? " is-read" : ""}`) : "";
    return `<div class="zap-msg ${side}${first}${bare}" data-msg="${m.id}"><div class="zap-bubble zap-t-${safe(m.t)}">${bubbleContent(m)}<span class="zap-meta"><time>${time(m.at)}</time>${ticks}</span></div></div>`;
  }
  function headStatus(chat) {
    if (chat.id === GUIDE) return "robô do OSLab · dicas da trilha";
    if (chat.blocked) return "bloqueado";
    if (chat.typing) return `<em>${chat.typing === "audio" ? "gravando áudio…" : "digitando…"}</em>`;
    if (chat.status === "done") return `visto por último hoje às ${time(chat.lastAt)}`;
    return "online";
  }
  function renderConv(record) {
    if (selected === GROUP && Z().profile()) { renderGroupConv(record); return; }
    const conv = record.zapRoot.querySelector("[data-zap-conv]");
    const chat = selected ? Z().chat(selected) : null;
    record.zapRoot.classList.toggle("has-chat", Boolean(chat));
    if (!chat) {
      conv.innerHTML = `<div class="zap-welcome"><div class="zap-welcome-card">${ART}<h2>Segurança Digital no WhatsApp</h2><p>Uma pessoa nova manda mensagem a cada minuto. Ajude quem precisa no computador e cuidado com os golpes.</p><button type="button" data-zap-goto="${GUIDE}">Abrir OSLab Dicas</button></div>
        <div class="zap-welcome-actions">${[["doc", "Enviar documento"], ["userplus", "Adicionar contato"], ["mail", "Convidar amigos"], ["video", "Nova ligação"]].map(([icon, label]) => `<button type="button" data-zap-soon><span>${svg(icon)}</span>${label}</button>`).join("")}</div></div>`;
      record.zapShown = { chatId: null, count: 0 };
      return;
    }
    const p = person(chat.id);
    conv.innerHTML = `<header class="zap-conv-head">
        <button type="button" class="zap-back zap-iconbtn" aria-label="Voltar para a lista" data-zap-back>${svg("back")}</button>
        <img src="${safe(p.avatar)}" alt="" />
        <div class="zap-conv-title"><strong>${safe(displayName(chat.id))}</strong><small data-zap-status>${headStatus(chat)}</small></div>
        <div class="zap-conv-actions"><button type="button" class="zap-iconbtn" aria-label="Chamada de vídeo" data-zap-soon>${svg("video")}</button><button type="button" class="zap-iconbtn" aria-label="Chamada de voz" data-zap-soon>${svg("phone")}</button><button type="button" class="zap-iconbtn" aria-label="Pesquisar na conversa" data-zap-soon>${svg("search")}</button><button type="button" class="zap-iconbtn" aria-label="Mais opções" data-zap-soon>${svg("more")}</button></div>
      </header>
      <div class="zap-messages" data-zap-scroll>
        <div class="zap-day"><span>HOJE</span></div>
        <div class="zap-system is-lock"><span>${svg("lock")} Conversa simulada pelo OSLab. Nenhuma mensagem é enviada para fora deste computador.</span></div>
        ${p.unknown ? `<div class="zap-unknown">${svg("alert")}<span><strong>Este número não está nos seus contatos</strong><small>${safe(p.phone)} · ~${safe(p.name)}</small></span></div>` : ""}
        <div data-zap-feed></div>
        <div class="zap-msg is-in is-first zap-typing" data-zap-typing hidden><div class="zap-bubble"><span class="zap-dots"><i></i><i></i><i></i></span></div></div>
      </div>
      <div class="zap-replies" data-zap-replies></div>
      <footer class="zap-composer" data-zap-composer></footer>`;
    record.zapShown = { chatId: chat.id, count: 0 };
    record.zapTrayHtml = record.zapComposerHtml = null;
    appendMessages(record, false);
    renderReplies(record);
  }
  function appendMessages(record, animate = true) {
    const chat = Z().chat(selected);
    const feed = record.zapRoot.querySelector("[data-zap-feed]");
    if (!chat || !feed) return;
    const fresh = chat.messages.slice(record.zapShown.count);
    if (fresh.length) {
      const html = fresh.map((m, index) => {
        const position = record.zapShown.count + index;
        const line = record.zapUnreadAt === position ? `<div class="zap-unread-line"><span>${record.zapUnreadCount === 1 ? "1 mensagem não lida" : `${record.zapUnreadCount} mensagens não lidas`}</span></div>` : "";
        return line + messageHtml(m, chat.messages[position - 1]);
      }).join("");
      feed.insertAdjacentHTML("beforeend", html);
      if (animate && !reduceMotion()) feed.querySelectorAll(".zap-msg:not(.is-seen), .zap-system:not(.is-seen)").forEach((node) => node.classList.add("is-new"));
      feed.querySelectorAll(".zap-msg, .zap-system").forEach((node) => node.classList.add("is-seen"));
      record.zapShown.count = chat.messages.length;
    }
    // Atualiza os vistos (✓✓ azul) já renderizados.
    chat.messages.filter((m) => m.from === "me" && m.status === "read").forEach((m) => feed.querySelector(`[data-msg="${m.id}"] .zap-tick`)?.classList.add("is-read"));
    const typing = record.zapRoot.querySelector("[data-zap-typing]");
    typing.hidden = !chat.typing;
    record.zapRoot.querySelector("[data-zap-status]").innerHTML = headStatus(chat);
    scrollDown(record);
  }
  function scrollDown(record) {
    const scroller = record.zapRoot.querySelector("[data-zap-scroll]");
    if (scroller) global.requestAnimationFrame(() => { scroller.scrollTop = scroller.scrollHeight; });
  }
  function renderReplies(record) {
    const chat = Z().chat(selected);
    const tray = record.zapRoot.querySelector("[data-zap-replies]");
    const composer = record.zapRoot.querySelector("[data-zap-composer]");
    if (!chat || !tray) return;
    const input = `<div class="zap-composer-pill"><button type="button" class="zap-iconbtn" aria-label="Anexar" data-zap-nudge>${svg("clip")}</button><button type="button" class="zap-iconbtn" aria-label="Figurinhas e emojis" data-zap-nudge>${svg("sticker")}</button><div class="zap-input" data-zap-input><span>Digite uma mensagem</span></div><button type="button" class="zap-iconbtn zap-mic" aria-label="Mensagem de voz" data-zap-nudge>${svg("mic")}</button></div>`;
    let trayHtml = "";
    let composerHtml = input;
    if (chat.id === GUIDE) composerHtml = `<p class="zap-readonly">${svg("lock")} Só o robô do OSLab envia mensagens nesta conversa.</p>`;
    else if (chat.blocked) { trayHtml = chat.status === "done" ? doneTag(chat) : ""; composerHtml = `<p class="zap-readonly">${svg("ban")} Você bloqueou este contato.</p>`; }
    else if (chat.status === "done") trayHtml = doneTag(chat);
    else if (!chat.view || chat.queue.length || typingOut) trayHtml = (chat.typing || chat.queue.length) && !typingOut ? `<p class="zap-wait">${safe(person(chat.id).name.split(" ")[0])} está respondendo…</p>` : "";
    else trayHtml = `<p class="zap-replies-label">Escolha sua resposta</p>${chat.view.labels.map((label, index) => `<button type="button" class="zap-reply" data-zap-reply="${index}" style="--i:${index}">${safe(label)}</button>`).join("")}`;
    // Só redesenha o que mudou: preserva a animação das respostas e o texto sendo digitado.
    if (record.zapTrayHtml !== trayHtml) { tray.innerHTML = trayHtml; record.zapTrayHtml = trayHtml; }
    if (record.zapComposerHtml !== composerHtml || !composer.firstChild) { composer.innerHTML = composerHtml; record.zapComposerHtml = composerHtml; }
  }
  function doneTag(chat) {
    return `<p class="zap-finished is-${safe(chat.outcome)}">${chat.outcome === "bad" ? "⚠️ Conversa encerrada · veja a dica no OSLab Dicas" : chat.outcome === "neutral" ? "Conversa encerrada" : "✓ Conversa concluída · veja a dica no OSLab Dicas"}</p>`;
  }

  // ---------- Escolhas com animação de digitação ----------
  async function typeInto(record, text) {
    const input = record.zapRoot.querySelector("[data-zap-input]");
    if (!input) return;
    input.classList.add("is-typing");
    const mic = record.zapRoot.querySelector(".zap-mic");
    if (mic) mic.innerHTML = svg("send");
    if (reduceMotion()) { input.textContent = text; await wait(250); return; }
    const chars = Array.from(text);
    const step = Math.max(12, Math.min(34, 900 / chars.length));
    for (let index = 1; index <= chars.length; index += 1) {
      input.textContent = chars.slice(0, index).join("");
      await wait(step);
    }
    await wait(220);
  }
  const wait = (ms) => new Promise((resolve) => global.setTimeout(resolve, ms));
  async function pick(record, index) {
    const chat = Z().chat(selected);
    if (!chat?.view || typingOut) return;
    const id = chat.id;
    const label = chat.view.labels[index];
    const textual = !/^[📎🚫💸📞🔗🚩📍💳🌻🌽]/u.test(label);
    typingOut = true;
    renderReplies(record);
    if (textual) await typeInto(record, label);
    typingOut = false;
    record.zapComposerHtml = null;
    const result = Z().choose(id, index);
    if (result.attach) openPicker(record, id, index);
    renderAll();
  }

  // ---------- Seletor de arquivos (janela Abrir do Windows) ----------
  function openPicker(record, chatId, index) {
    const roots = O.fileSystem.roots;
    record.zapPicker = { chatId, index, folder: roots.documents, chosen: null, query: "" };
    renderPicker(record);
  }
  function renderPicker(record) {
    const pk = record.zapPicker;
    const layer = record.zapRoot.querySelector("[data-zap-layer]");
    if (!pk) { layer.innerHTML = ""; return; }
    const roots = O.fileSystem.roots;
    const places = [["desktop", "Área de Trabalho", "assets/icons/win/desktop.png"], ["documents", "Documentos", "assets/icons/win/documents.png"], ["downloads", "Downloads", "assets/icons/win/downloads.png"], ["pictures", "Imagens", "assets/icons/win/pictures.png"]];
    const items = pk.query ? O.fileSystem.search(pk.query) : O.fileSystem.list(pk.folder).slice().sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, "pt-BR") : a.kind === "folder" ? -1 : 1));
    const chosen = pk.chosen ? O.fileSystem.get(pk.chosen) : null;
    const rows = items.map((item) => `<button type="button" class="zap-pick-row${item.id === pk.chosen ? " is-on" : ""}" data-pick="${safe(item.id)}" data-kind="${item.kind}">${item.kind === "folder" ? '<img src="assets/icons/win/folder.png" alt="" />' : /^image\//.test(item.mime || "") && /^assets\//.test(item.content || "") ? `<img class="is-thumb" src="${safe(item.content)}" alt="" />` : fileIcon(item.name, item.mime)}<span>${safe(item.name)}</span><small>${pk.query ? safe(O.fileSystem.pathLabel(item.parentId)) : item.kind === "folder" ? "Pasta de arquivos" : safe(O.systemTools.formatBytes(O.fileSystem.bytesForItem(item.id)))}</small></button>`).join("");
    layer.innerHTML = `<div class="zap-modal-backdrop"><section class="zap-picker" role="dialog" aria-modal="true" aria-label="Abrir arquivo">
      <header><strong>Abrir</strong><button type="button" aria-label="Fechar" data-pick-close>${svg("close")}</button></header>
      <div class="zap-picker-bar"><button type="button" aria-label="Pasta acima" data-pick-up ${pk.query || Object.values(roots).includes(pk.folder) ? "disabled" : ""}>${svg("back")}</button><span class="zap-picker-path">${svg("folder")} ${safe(pk.query ? `Resultados da pesquisa por “${pk.query}”` : O.fileSystem.pathLabel(pk.folder))}</span><label>${svg("search")}<input type="search" placeholder="Pesquisar" value="${safe(pk.query)}" data-pick-search aria-label="Pesquisar arquivos" /></label></div>
      <div class="zap-picker-body"><nav>${places.map(([key, label, icon]) => `<button type="button" class="${!pk.query && pk.folder === roots[key] ? "is-on" : ""}" data-pick-root="${key}"><img src="${icon}" alt="" />${label}</button>`).join("")}</nav>
      <div class="zap-picker-list">${rows || `<p class="zap-picker-empty">${pk.query ? "Nenhum arquivo encontrado." : "Esta pasta está vazia."}</p>`}</div></div>
      <footer><span>Nome do arquivo:</span><output>${safe(chosen?.name || "")}</output><button type="button" class="is-primary" data-pick-open ${chosen ? "" : "disabled"}>Abrir</button><button type="button" data-pick-close>Cancelar</button></footer>
    </section></div>`;
  }
  function pickerClick(record, event) {
    const pk = record.zapPicker;
    if (!pk) return false;
    if (event.target.closest("[data-pick-close]")) { record.zapPicker = null; renderPicker(record); return true; }
    const root = event.target.closest("[data-pick-root]")?.dataset.pickRoot;
    if (root) { pk.folder = O.fileSystem.roots[root]; pk.query = ""; pk.chosen = null; renderPicker(record); return true; }
    if (event.target.closest("[data-pick-up]")) { const folder = O.fileSystem.get(pk.folder); if (folder) { pk.folder = folder.parentId; pk.chosen = null; renderPicker(record); } return true; }
    const row = event.target.closest("[data-pick]");
    if (row) {
      if (row.dataset.kind === "folder") { pk.folder = row.dataset.pick; pk.query = ""; pk.chosen = null; }
      else if (pk.chosen === row.dataset.pick && Date.now() - (pk.clickedAt || 0) < 500) return submitPick(record);
      else pk.chosen = row.dataset.pick;
      pk.clickedAt = Date.now();
      renderPicker(record);
      return true;
    }
    if (event.target.closest("[data-pick-open]")) return submitPick(record);
    return Boolean(event.target.closest(".zap-picker"));
  }
  function submitPick(record) {
    const pk = record.zapPicker;
    if (!pk?.chosen) return true;
    record.zapPicker = null;
    renderPicker(record);
    Z().attach(pk.chatId, pk.index, pk.chosen);
    renderAll();
    return true;
  }

  // ---------- Efeitos: ligação, conta roubada, link falso, foto ----------
  function overlay(record, html, ms) {
    const layer = record.zapRoot.querySelector("[data-zap-layer]");
    layer.innerHTML = html;
    if (ms) global.setTimeout(() => { if (layer.firstElementChild?.dataset.zapTimed) layer.innerHTML = ""; }, ms);
  }
  function showEffect(record, chatId, effects) {
    if (effects.includes("call")) {
      overlay(record, `<div class="zap-call" data-zap-timed="1"><img src="assets/whatsapp/people/mae.webp" alt="" /><strong>Mãe ❤️</strong><small>número antigo · (11) 9 8455-1020</small><p class="zap-call-state">Chamando…</p><div class="zap-call-wave"><i></i><i></i><i></i></div><button type="button" aria-label="Encerrar">${svg("hangup")}</button></div>`, 3400);
      global.setTimeout(() => { const state = record.zapRoot.querySelector(".zap-call-state"); if (state) state.textContent = "00:07 · Mãe atendeu"; }, 1500);
    }
    if (effects.includes("hijack")) {
      overlay(record, `<div class="zap-hijack" data-zap-timed="1"><span>${svg("alert")}</span><h2>Sua conta foi desconectada</h2><p>Seu número de telefone foi registrado em outro celular.</p><small>Simulação do OSLab: foi isso que o golpista fez com o código que você enviou.</small></div>`, 5200);
    }
    if (effects.includes("phish")) showPhish(record, "www.magaz1ne-premios.xyz/resgate");
  }
  function showPhish(record, url) {
    overlay(record, `<div class="zap-modal-backdrop"><section class="zap-phish" role="dialog" aria-modal="true" aria-label="Página aberta pelo link">
      <header><span class="zap-phish-url">${svg("alert")} ${safe(url)}</span><button type="button" aria-label="Fechar" data-zap-close>${svg("close")}</button></header>
      <div class="zap-phish-page"><h2>🎁 PARABÉNS! Resgate seu iPhone 16 Pro</h2><p>Falta só o frete: <strong>R$ 19,90</strong></p><div class="zap-phish-form"><span>Nome completo</span><span>CPF</span><span>Número do cartão</span><span>Código de segurança (CVV)</span></div><p class="zap-phish-timer">⏰ Oferta expira em 04:59</p></div>
      <footer><strong>⚠️ Esta página é falsa (simulação do OSLab)</strong><ul><li>O endereço <b>magaz1ne-premios.xyz</b> troca a letra “a” pelo número “1” para imitar uma loja.</li><li>Você nem participou de sorteio nenhum.</li><li>Prêmio de verdade não cobra frete pedindo dados do cartão.</li></ul><button type="button" class="is-primary" data-zap-close>Fechar a página</button></footer>
    </section></div>`);
  }
  function showPhoto(record, src) {
    overlay(record, `<div class="zap-modal-backdrop zap-lightbox" data-zap-close><img src="${safe(src)}" alt="Foto ampliada" /><button type="button" aria-label="Fechar" data-zap-close>${svg("close")}</button></div>`);
  }
  function playVoice(button) {
    const voice = button.closest("[data-zap-voice]");
    if (!voice || voice.classList.contains("is-playing")) return;
    voice.classList.add("is-playing");
    global.setTimeout(() => { voice.classList.remove("is-playing"); voice.classList.add("is-played"); const transcript = voice.parentElement.querySelector(".zap-transcript"); if (transcript) transcript.hidden = false; }, reduceMotion() ? 50 : 2600);
  }

  // ---------- Eventos ----------
  function select(record, id) {
    if (selected === id && record.zapShown?.chatId === id) return;
    const chat = Z().chat(id);
    record.zapUnreadCount = chat?.unread || 0;
    record.zapUnreadAt = null;
    for (let index = (chat?.messages.length || 0) - 1, left = record.zapUnreadCount; index >= 0 && left > 0; index -= 1) {
      if (chat.messages[index].from === "them" && --left === 0) record.zapUnreadAt = index;
    }
    selected = id;
    Z().setFocus(id === GROUP ? null : id);
    G().setFocus(id === GROUP);
    renderList(record);
    renderConv(record);
  }
  function wire(record) {
    const root = record.zapRoot;
    // Abre a conversa já no apertar do botão: se a lista mudar antes de soltar, a escolha não se perde.
    root.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const row = event.target.closest(".zap-row[data-zap-chat]");
      if (row) select(record, row.dataset.zapChat);
    });
    root.addEventListener("click", (event) => {
      if (pickerClick(record, event)) return;
      const theme = event.target.closest("[data-zap-theme]")?.dataset.zapTheme;
      if (theme) { chooseTheme(record, theme); return; }
      if (root.querySelector(".zap-theme")) return;
      const action = event.target.closest("[data-zap-action]")?.dataset.zapAction;
      if (action) { root.querySelector("[data-zap-layer]").innerHTML = ""; if (action === "theme") showTheme(record); if (action === "reset") void resetTrail(); return; }
      const tab = event.target.closest("[data-zap-tab]")?.dataset.zapTab;
      if (tab) { record.zapPanel = tab === "settings" && record.zapPanel !== "settings" ? "settings" : null; renderPanel(record); return; }
      const panelGo = event.target.closest("[data-zap-panel-go]");
      if (panelGo) { record.zapPanel = panelGo.dataset.zapPanelGo || null; renderPanel(record); return; }
      if (event.target.closest("[data-zap-twostep-off]")) { Z().setSetting("twoStep", false); renderPanel(record); return; }
      if (event.target.closest("[data-zap-emoji-toggle]")) { const row = root.querySelector("[data-zap-emojis]"); row.hidden = !row.hidden; return; }
      const emoji = event.target.closest("[data-zap-emoji]")?.dataset.zapEmoji;
      if (emoji) { const input = root.querySelector(".zap-group-input"); if (input && !input.disabled) { input.value += emoji; input.focus(); } return; }
      const goto = event.target.closest("[data-zap-goto]")?.dataset.zapGoto;
      if (goto) { select(record, goto); return; }
      if (root.querySelector(".zap-menu") && !event.target.closest(".zap-menu, [data-zap-menu]")) root.querySelector("[data-zap-layer]").innerHTML = "";
      if (event.target.closest("[data-zap-close]") && (event.target.closest("[data-zap-close]") === event.target || event.target.closest("button[data-zap-close]"))) { root.querySelector("[data-zap-layer]").innerHTML = ""; return; }
      const chatId = event.target.closest("[data-zap-chat]")?.dataset.zapChat;
      if (chatId) { select(record, chatId); return; }
      const reply = event.target.closest("[data-zap-reply]");
      if (reply) { void pick(record, Number(reply.dataset.zapReply)); return; }
      const chip = event.target.closest("[data-zap-filter]")?.dataset.zapFilter;
      if (chip) { filter = chip; renderList(record); return; }
      if (event.target.closest("[data-zap-back]")) { selected = null; Z().setFocus(null); G().setFocus(false); renderList(record); renderConv(record); return; }
      const photo = event.target.closest("[data-zap-photo]")?.dataset.zapPhoto;
      if (photo) { showPhoto(record, photo); return; }
      const play = event.target.closest("[data-zap-play]");
      if (play) { playVoice(play); return; }
      const link = event.target.closest("[data-zap-link]");
      if (link) {
        if (link.dataset.zapOpen === "browser") { const browser = O.shell.openApp("google"); if (browser) O.browserApp.navigate(browser, link.dataset.zapLink); }
        else showPhish(record, link.dataset.zapLink);
        return;
      }
      if (event.target.closest("[data-zap-nudge], [data-zap-input]")) {
        const tray = root.querySelector("[data-zap-replies]");
        tray?.classList.remove("is-nudged");
        void tray?.offsetWidth;
        tray?.classList.add("is-nudged");
        return;
      }
      if (event.target.closest("[data-zap-menu]")) {
        if (root.querySelector(".zap-menu")) { root.querySelector("[data-zap-layer]").innerHTML = ""; return; }
        overlay(record, `<div class="zap-menu" role="menu"><button type="button" role="menuitem" data-zap-action="theme">${svg(Z().theme() === "dark" ? "sun" : "moon")}Mudar o tema</button><button type="button" role="menuitem" data-zap-action="reset">${svg("reset")}Reiniciar a trilha</button></div>`);
        return;
      }
      if (event.target.closest("[data-zap-soon]")) O.ui.notify("WhatsApp", "Nesta trilha, use a aba Conversas 💬", "info", 2600);
    });
    root.addEventListener("submit", (event) => {
      const form = event.target;
      if (form.matches("[data-zap-onboard]")) { event.preventDefault(); finishWelcome(record, form); }
      if (form.matches("[data-zap-group-form]")) {
        event.preventDefault();
        const input = form.querySelector("input");
        if (G().send(input.value)) input.value = "";
        root.querySelector("[data-zap-emojis]")?.setAttribute("hidden", "");
        input.focus();
      }
      if (form.matches("[data-zap-pin]")) {
        event.preventDefault();
        const data = new FormData(form);
        const error = form.querySelector("[data-zap-pin-error]");
        const pin = String(data.get("pin") || "");
        if (!/^\d{6}$/.test(pin)) { error.textContent = "O PIN precisa ter 6 números."; error.hidden = false; return; }
        if (pin !== String(data.get("confirm") || "")) { error.textContent = "Os PINs não são iguais. Digite de novo."; error.hidden = false; return; }
        Z().setSetting("twoStep", true);
        renderPanel(record);
      }
    });
    root.addEventListener("change", (event) => {
      const setting = event.target.closest("[data-zap-setting]");
      if (setting) { Z().setSetting(setting.dataset.zapSetting, setting.value); renderPanel(record); }
    });
    root.addEventListener("input", (event) => {
      if (event.target.matches("[data-zap-search]")) renderList(record);
      if (event.target.matches("[data-pick-search]")) {
        record.zapPicker.query = event.target.value.trim();
        record.zapPicker.chosen = null;
        renderPicker(record);
        const input = root.querySelector("[data-pick-search]");
        input?.focus();
        input?.setSelectionRange(input.value.length, input.value.length);
      }
    });
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.querySelector("[data-zap-layer]").innerHTML && !root.querySelector(".zap-theme[data-required]")) { record.zapPicker = null; root.querySelector("[data-zap-layer]").innerHTML = ""; }
    });
  }
  const PRIVACY = [["all", "Todos"], ["contacts", "Meus contatos"], ["nobody", "Ninguém"]];
  function letter(name) { return `<span class="zap-letter">${safe(String(name || "?").trim().charAt(0).toUpperCase())}</span>`; }
  function renderPanel(record) {
    const panel = record.zapRoot.querySelector("[data-zap-panel]");
    const view = record.zapPanel;
    record.zapRoot.querySelectorAll("[data-zap-tab]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.zapTab === (view ? "settings" : "chats")));
    panel.hidden = !view;
    if (!view) { panel.innerHTML = ""; return; }
    const profile = Z().profile() || { name: "", phone: Z().phone() };
    const set = Z().settings();
    const back = (to, title) => `<header class="zap-panel-head"><button type="button" class="zap-iconbtn" aria-label="Voltar" data-zap-panel-go="${to}">${svg("back")}</button><h1>${title}</h1></header>`;
    if (view === "settings") {
      panel.innerHTML = `<header class="zap-panel-head"><h1>Configurações</h1></header>
        <div class="zap-panel-profile">${letter(profile.name)}<span><strong>${safe(profile.name)}</strong><small>${safe(profile.phone)} · Maceió (AL)</small></span></div>
        <button type="button" class="zap-panel-row" data-zap-panel-go="account">${svg("lock")}<span><strong>Conta</strong><small>Confirmação em duas etapas ${set.twoStep ? "· ativada ✅" : "· desativada"}</small></span></button>
        <button type="button" class="zap-panel-row" data-zap-panel-go="privacy">${svg("shield")}<span><strong>Privacidade</strong><small>Visto por último, foto do perfil</small></span></button>
        <button type="button" class="zap-panel-row" data-zap-action="theme">${svg(Z().theme() === "dark" ? "moon" : "sun")}<span><strong>Tema</strong><small>${Z().theme() === "dark" ? "Escuro" : "Claro"}</small></span></button>
        <button type="button" class="zap-panel-row is-danger" data-zap-action="reset">${svg("reset")}<span><strong>Reiniciar a trilha</strong><small>Para o próximo aluno usar este computador</small></span></button>`;
    } else if (view === "account") {
      panel.innerHTML = `${back("settings", "Conta")}<section class="zap-panel-section"><h2>Confirmação em duas etapas</h2><p>Crie um PIN de 6 números. Ele será pedido sempre que alguém tentar registrar o seu número em outro celular.</p>
        ${set.twoStep ? `<p class="zap-panel-ok">${svg("check")} Ativada</p><button type="button" class="zap-panel-btn" data-zap-twostep-off>Desativar</button>` : `<form class="zap-panel-form" data-zap-pin><label>Crie um PIN<input name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" /></label><label>Confirme o PIN<input name="confirm" type="password" inputmode="numeric" maxlength="6" autocomplete="off" /></label><p class="zap-panel-error" data-zap-pin-error hidden></p><button type="submit" class="zap-panel-btn is-primary">Ativar</button></form>`}</section>`;
    } else if (view === "privacy") {
      const group = (key, title, help) => `<fieldset class="zap-panel-section"><legend>${title}</legend><p>${help}</p>${PRIVACY.map(([value, label]) => `<label class="zap-radio"><input type="radio" name="${key}" value="${value}" data-zap-setting="${key}" ${set[key] === value ? "checked" : ""} />${label}</label>`).join("")}</fieldset>`;
      panel.innerHTML = `${back("settings", "Privacidade")}${group("lastSeen", "Visto por último e online", "Quem pode ver quando você esteve no WhatsApp pela última vez.")}${group("photo", "Foto do perfil", "Quem pode ver a sua foto.")}<p class="zap-panel-note">${svg("lock")} Mensagens com desconhecidos ficam mais seguras quando eles não veem sua foto nem quando você está online.</p>`;
    }
  }

  // ---------- Boas-vindas: nome, número de Maceió e tema ----------
  function showWelcome(record) {
    const phone = Z().phone();
    const me = O.users?.getCurrent?.();
    const suggestion = me && me.displayName !== "Aluno" ? me.displayName : "";
    const theme = Z().theme() || "dark";
    overlay(record, `<div class="zap-modal-backdrop"><form class="zap-theme zap-onboard" data-zap-onboard data-required role="dialog" aria-modal="true" aria-labelledby="zap-onboard-title">
      <img src="assets/icons/trails/whatsapp.svg" alt="" />
      <h2 id="zap-onboard-title">Bem-vindo(a) ao WhatsApp</h2>
      <p>Seu número: <b>${safe(phone)}</b> · Maceió (AL)</p>
      <label class="zap-onboard-name"><span>Como você quer aparecer para a turma?</span><input name="name" maxlength="30" autocomplete="off" placeholder="Seu nome" value="${safe(suggestion)}" /></label>
      <p class="zap-onboard-label">Escolha o tema</p>
      <div class="zap-theme-options">
        <label class="zap-theme-card"><input type="radio" name="theme" value="light" ${theme === "light" ? "checked" : ""} />${mini("light")}<strong>${svg("sun")}Claro</strong></label>
        <label class="zap-theme-card"><input type="radio" name="theme" value="dark" ${theme === "dark" ? "checked" : ""} />${mini("dark")}<strong>${svg("moon")}Escuro</strong></label>
      </div>
      <p class="zap-panel-error" data-zap-onboard-error hidden></p>
      <button type="submit" class="zap-start">Começar</button>
    </form></div>`);
    global.setTimeout(() => record.zapRoot.querySelector('[data-zap-onboard] input[name="name"]')?.focus(), 60);
  }
  function finishWelcome(record, form) {
    const data = new FormData(form);
    if (!Z().setProfile(data.get("name"))) {
      const error = form.querySelector("[data-zap-onboard-error]");
      error.textContent = "Digite seu nome (pelo menos 2 letras).";
      error.hidden = false;
      return;
    }
    Z().setTheme(data.get("theme") || "dark");
    records.forEach((item) => item.zapRoot?.setAttribute("data-theme", Z().theme()));
    record.zapRoot.querySelector("[data-zap-layer]").innerHTML = "";
    if (Z().start()) selected = GUIDE;
    if (!selected) selected = GUIDE;
    Z().setFocus(selected);
    G().connect(Z().profile());
    renderAll();
  }

  function mini(theme) {
    return `<span class="zap-mini" data-mini="${theme}" aria-hidden="true"><span class="zap-mini-rail"><i></i><i></i><i></i></span><span class="zap-mini-list"><b></b><span></span><span></span><span></span><span></span></span><span class="zap-mini-chat"><i></i><i class="is-out"></i><i></i><i class="is-out"></i><em></em></span></span>`;
  }
  function showTheme(record) {
    const current = Z().theme();
    overlay(record, `<div class="zap-modal-backdrop"><section class="zap-theme" role="dialog" aria-modal="true" aria-labelledby="zap-theme-title" ${current ? "" : "data-required"}>
      <img src="assets/icons/trails/whatsapp.svg" alt="" />
      <h2 id="zap-theme-title">${current ? "Tema do WhatsApp" : "Bem-vindo(a) ao WhatsApp"}</h2>
      <p>${current ? "Escolha a aparência do aplicativo." : "Antes de começar, escolha o tema. Dá para trocar depois em Configurações ⚙️."}</p>
      <div class="zap-theme-options">
        <button type="button" class="zap-theme-card${current === "light" ? " is-on" : ""}" data-zap-theme="light">${mini("light")}<strong>${svg("sun")}Claro</strong></button>
        <button type="button" class="zap-theme-card${current === "dark" ? " is-on" : ""}" data-zap-theme="dark">${mini("dark")}<strong>${svg("moon")}Escuro</strong></button>
      </div>
    </section></div>`);
    record.zapRoot.querySelector(".zap-theme-card")?.focus();
  }
  function chooseTheme(record, theme) {
    Z().setTheme(theme);
    records.forEach((item) => item.zapRoot?.setAttribute("data-theme", Z().theme()));
    record.zapRoot.querySelector("[data-zap-layer]").innerHTML = "";
    if (Z().start()) selected = GUIDE;
    if (!selected) selected = GUIDE;
    Z().setFocus(selected);
    renderAll();
  }
  async function resetTrail() {
    const ok = await O.ui.confirm({ title: "Reiniciar a trilha Segurança Digital?", message: "Todas as conversas do WhatsApp, as contas de Netflix e Facebook dos amigos e os arquivos criados pela trilha serão apagados. As outras trilhas continuam como estão.", confirmLabel: "Reiniciar trilha" });
    if (!ok) return;
    selected = null;
    G().stop();
    Z().reset();
    records.forEach((record) => { if (record.element?.isConnected) { record.zapListHtml = null; record.zapPanel = null; renderPanel(record); renderConv(record); showWelcome(record); } });
    renderAll();
  }

  // ---------- Notificações do Windows ----------
  let toastRoot = null;
  function toast(title, text, avatar, chatId) {
    if (!toastRoot) {
      toastRoot = document.createElement("div");
      toastRoot.className = "zap-toasts";
      toastRoot.setAttribute("aria-live", "polite");
      document.body.appendChild(toastRoot);
    }
    // Como no Windows: mensagens seguidas da mesma pessoa atualizam a mesma notificação.
    let card = [...toastRoot.children].find((node) => node.dataset.chat === chatId);
    if (!card) {
      card = document.createElement("button");
      card.type = "button";
      card.className = "zap-toast";
      card.dataset.chat = chatId;
      card.addEventListener("click", () => { card.remove(); const record = O.shell.openApp("whatsapp"); if (record && chatId) select(record, chatId); });
    }
    card.innerHTML = `<header><img src="assets/icons/trails/whatsapp.svg" alt="" /><span>WhatsApp</span><small>agora</small></header><div><img src="${safe(avatar)}" alt="" /><span><strong>${safe(title)}</strong><small>${safe(text)}</small></span></div>`;
    card.classList.remove("is-leaving");
    toastRoot.prepend(card);
    while (toastRoot.children.length > 3) toastRoot.lastElementChild.remove();
    global.clearTimeout(Number(card.dataset.timer));
    card.dataset.timer = String(global.setTimeout(() => { card.classList.add("is-leaving"); global.setTimeout(() => card.remove(), 220); }, 5200));
    chime();
  }
  let audioContext = null;
  let lastChime = 0;
  function chime() {
    if (O.audio?.get?.()?.audible === false || Date.now() - lastChime < 2500) return;
    lastChime = Date.now();
    try {
      audioContext = audioContext || new (global.AudioContext || global.webkitAudioContext)();
      const now = audioContext.currentTime;
      [880, 1320].forEach((frequency, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = "sine";
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.05, now + index * 0.11 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.11 + 0.18);
        osc.connect(gain).connect(audioContext.destination);
        osc.start(now + index * 0.11);
        osc.stop(now + index * 0.11 + 0.2);
      });
    } catch (_) { /* som indisponível */ }
  }
  function visibleRecord() {
    return [...records].find((record) => record.element?.isConnected && !record.element.classList.contains("is-minimized"));
  }
  function messageText(m) {
    return { text: m.text, image: "📷 Foto", audio: "🎤 Mensagem de voz", file: `📄 ${m.name}`, link: m.url, pix: `💸 PIX ${m.amount}`, location: "📍 Localização", deleted: "🚫 Mensagem apagada", sticker: m.emoji, lesson: m.title, report: "🏆 Trilha concluída!" }[m.t] || "";
  }
  function updateBadges() {
    const total = Z().isStarted() ? chats().reduce((sum, chat) => sum + chat.unread, 0) + G().get().unread : 0;
    document.querySelectorAll('.desktop-shortcut[data-app="whatsapp"], .taskbar [data-app="whatsapp"]').forEach((node) => {
      if (total) node.dataset.zapBadge = total > 9 ? "9+" : String(total);
      else delete node.dataset.zapBadge;
    });
  }

  function renderAll() {
    records.forEach((record) => {
      if (!record.element?.isConnected) { records.delete(record); return; }
      renderTrail(record);
      renderList(record);
      if (record.zapShown.chatId !== selected) renderConv(record);
      else { appendMessages(record); renderReplies(record); }
    });
    updateBadges();
  }

  function render(record) {
    records.add(record);
    record.address.textContent = "WhatsApp";
    if (!record.zapRoot || !record.zapRoot.isConnected) shell(record);
    record.zapListHtml = record.zapChipsHtml = null;
    const ready = Boolean(Z().profile() && Z().theme());
    if (ready) {
      if (Z().start()) selected = GUIDE;
      if (!selected) selected = GUIDE;
      Z().setFocus(selected === GROUP ? null : selected);
      G().setFocus(selected === GROUP);
      // O grupo só fica conectado enquanto o WhatsApp está aberto: poupa o servidor.
      G().connect(Z().profile());
    }
    renderTrail(record);
    renderList(record);
    renderConv(record);
    renderPanel(record);
    if (!ready) showWelcome(record);
    updateBadges();
  }

  Z().subscribe((type, detail) => {
    if (type === "message" && detail.message.from === "them") {
      const record = visibleRecord();
      const looking = record && selected === detail.chatId && record.element.classList.contains("is-focused");
      if (!looking) {
        const p = person(detail.chatId);
        toast(displayName(detail.chatId), messageText(detail.message), p.avatar, detail.chatId);
      }
    }
    if (type === "sms") {
      O.ui.notify("Mensagens · celular", detail.text, "info", 9000);
    }
    if (type === "effect") {
      const record = visibleRecord();
      if (record && selected === detail.chatId) showEffect(record, detail.chatId, detail.effects);
    }
    if (type === "reset") { selected = null; }
    renderAll();
  });
  // Contador da próxima mensagem e selo de não lidas.
  global.setInterval(() => { if (Z().isStarted()) records.forEach((record) => { if (record.element?.isConnected) renderTrail(record); }); }, 1000);
  O.events?.subscribe?.("window:minimized", (event) => { if (event.detail?.appId === "whatsapp") { Z().setFocus(null); G().setFocus(false); } });
  document.addEventListener("oslab:window-focused", (event) => {
    if (event.detail?.appId === "whatsapp" && Z().profile()) { Z().setFocus(selected === GROUP ? null : selected); G().setFocus(selected === GROUP); }
    updateBadges();
  });
  O.events?.subscribe?.("app:closed", (event) => { if (event.detail?.appId === "whatsapp") { Z().setFocus(null); G().setFocus(false); G().stop(); } });
  G().subscribe((type, detail) => {
    if (type === "message" && !detail.mine) {
      const record = visibleRecord();
      const looking = record && selected === GROUP && record.element.classList.contains("is-focused");
      if (!looking) toast(G().NAME, `${String(detail.message.from?.name || "").split(" ")[0]}: ${detail.message.text}`, GROUP_AVATAR, GROUP);
    }
    if (type === "slow") O.ui.notify("Grupo da turma", "Calma! Espere um pouquinho antes de mandar outra mensagem.", "info", 3000);
    records.forEach((record) => {
      if (!record.element?.isConnected) return;
      if (type === "history") { record.zapGroupCount = 0; record.zapRoot.querySelector("[data-zap-group-feed]")?.replaceChildren(); }
      renderTrail(record);
      renderList(record);
      appendGroup(record);
    });
    updateBadges();
  });
  document.addEventListener("DOMContentLoaded", updateBadges);

  O.zapApp = { render, select: (id) => { selected = id; renderAll(); } };
})(window);
