(function createZapSites(global) {
  "use strict";

  // Sites usados pelos amigos do WhatsApp: Netflix (contas da Carol e do Seu Antônio), Facebook do Júnior
  // e a busca de imagens do Google (capivaras da Bia). Tudo local; nenhuma senha sai do OSLab.
  const O = global.OSLab = global.OSLab || {};
  const safe = (value) => O.ui.escapeHtml(value);
  const norm = (value) => String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const Z = () => O.zap;
  const go = (record, url) => O.browserApp.navigate(record, url);
  const redraw = (record) => O.browserApp.render(record);
  const route = (record) => {
    const url = String(record.browserState?.currentUrl || "");
    const slash = url.indexOf("/");
    return slash >= 0 ? url.slice(slash) : "/";
  };
  const field = (form, name) => String(new FormData(form).get(name) || "").trim();
  const strong = (value) => value.length >= 8 && /[a-z]/i.test(value) && /\d/.test(value);

  // ---------- Google Imagens ----------
  const IMAGES = [
    ["capivara-1.webp", "Capivara descansando na grama", "natureza.oslab.local"],
    ["capivara-2.webp", "Capivara: o maior roedor do mundo", "biologia.oslab.local"],
    ["capivara-3.webp", "Filhote de capivara", "fotosdobrasil.oslab.local"],
    ["capivara-4.webp", "Capivara nadando no lago", "pantanal.oslab.local"],
    ["capivara-5.webp", "Capivara no zoológico", "zoo.oslab.local"],
    ["capivara-6.webp", "Capivara ao pôr do sol", "wikifauna.oslab.local"],
  ];
  let imagePick = null;
  function searchResults(query) {
    if (!norm(query).includes("capivara")) return null;
    const chosen = IMAGES[imagePick];
    return `<section class="google-results-page zgi"><header><button type="button" class="google-mini-logo" data-browser-go="google.com" aria-label="Voltar ao Google">Google</button><form class="google-results-search" data-google-search><input name="query" value="${safe(query)}" aria-label="Pesquisar" /><button type="submit"><img src="assets/icons/search.png" alt="Pesquisar" /></button></form></header>
      <nav><span>Todas</span><strong>Imagens</strong><span>Vídeos</span><span>Notícias</span><span>Shopping</span></nav>
      <div class="zgi-body"><div class="zgi-grid">${IMAGES.map(([file, title, site], index) => `<button type="button" class="zgi-card${index === imagePick ? " is-on" : ""}" data-zimg="${index}"><img src="assets/whatsapp/media/${file}" alt="${safe(title)}" loading="lazy" /><small>${safe(site)}</small><span>${safe(title)}</span></button>`).join("")}</div>
      ${chosen ? `<aside class="zgi-panel"><header><small>${safe(chosen[2])}</small><button type="button" aria-label="Fechar" data-zimg-close>×</button></header><img src="assets/whatsapp/media/${chosen[0]}" alt="${safe(chosen[1])}" /><strong>${safe(chosen[1])}</strong><p>As imagens podem ter direitos autorais. Em trabalhos escolares, cite a fonte: <b>${safe(chosen[2])}</b></p><div><button type="button" class="zgi-save" data-zimg-save="${imagePick}">⬇ Salvar imagem</button><button type="button" data-zimg-close>Fechar</button></div></aside>` : ""}</div></section>`;
  }
  function saveImage(index) {
    const [file, title] = IMAGES[index];
    const item = O.fileSystem.create({ parentId: O.fileSystem.roots.downloads, name: file, kind: "file", mime: "image/webp", content: `assets/whatsapp/media/${file}`, sizeBytes: 58_000 + index * 3100, sourceId: "zap-image", missionId: "zap" });
    O.ui.notify("Download concluído", `${item.name} foi salvo em Downloads.`, "success", 4200);
    O.events.emit("zap:image-saved", { fileId: item.id, title }, "zapSites");
  }

  // ---------- Netflix (contas dos amigos) ----------
  const NETFLIX_COLORS = ["#e50914", "#2f80ed", "#f2c94c", "#27ae60", "#9b51e0"];
  function nfAccount() { const nf = Z().site("netflix"); return nf.session ? nf.accounts[nf.session] : null; }
  function nfProfileTile(name, index, manage) {
    const hacker = name.includes("HACKER");
    return `<button type="button" class="znf-profile" data-znf-profile="${index}"><span style="--c:${hacker ? "#3b0a0a" : NETFLIX_COLORS[index % NETFLIX_COLORS.length]}">${hacker ? "😈" : "☺"}${manage ? "<i>✎</i>" : ""}</span><strong>${safe(name)}</strong></button>`;
  }
  function netflix(record) {
    const nf = Z().site("netflix");
    const account = nfAccount();
    const path = route(record);
    const bar = `<header class="znf-top"><span class="znf-logo">NETFLIX</span>${account ? `<nav><button type="button" data-browser-go="netflix.com/perfis">Perfis</button><button type="button" data-browser-go="netflix.com/conta">Conta</button><button type="button" data-znf-logout>Sair</button></nav>` : ""}</header>`;
    if (!account) {
      return `<section class="znf znf-login">${bar}<form class="znf-card" data-znf-login><h1>Entrar</h1>${record.znfError ? `<p class="znf-error">${safe(record.znfError)}</p>` : ""}<input name="email" type="email" placeholder="E-mail ou número de celular" autocomplete="off" aria-label="E-mail" /><input name="password" type="password" placeholder="Senha" autocomplete="off" aria-label="Senha" /><button type="submit">Entrar</button><small>Netflix simulada pelo OSLab · use os dados que seu amigo mandou no WhatsApp</small></form></section>`;
    }
    if (path.startsWith("/conta")) {
      const editing = path === "/conta/senha";
      return `<section class="znf znf-account">${bar}<main><h1>Conta</h1>${record.znfNotice ? `<p class="znf-notice">${safe(record.znfNotice)}</p>` : ""}
        <article><h2>Detalhes da assinatura</h2><p><strong>Plano Padrão</strong><br /><small>Próximo pagamento: 10 de dezembro</small></p></article>
        <article><h2>Segurança</h2><dl><dt>E-mail</dt><dd>${safe(nf.session)}</dd><dt>Senha</dt><dd>••••••••</dd></dl>
        ${editing ? `<form class="znf-form" data-znf-password>${record.znfError ? `<p class="znf-error">${safe(record.znfError)}</p>` : ""}<label>Senha atual<input name="current" type="password" autocomplete="off" /></label><label>Nova senha (8 a 60 caracteres)<input name="next" type="password" autocomplete="off" /></label><label>Confirmar nova senha<input name="confirm" type="password" autocomplete="off" /></label><div><button type="submit" class="is-primary">Salvar</button><button type="button" data-browser-go="netflix.com/conta">Cancelar</button></div></form>` : `<button type="button" class="znf-row" data-browser-go="netflix.com/conta/senha">Alterar senha <span>›</span></button>`}
        <button type="button" class="znf-row" data-znf-signout>Sair de todos os aparelhos <span>${account.devicesOut ? "✓ feito" : "›"}</span></button></article></main></section>`;
    }
    const manage = path === "/perfis/gerenciar";
    const form = record.znfEdit;
    return `<section class="znf znf-profiles">${bar}<main><h1>${manage ? "Gerenciar perfis" : "Quem está assistindo?"}</h1>${record.znfNotice ? `<p class="znf-notice">${safe(record.znfNotice)}</p>` : ""}
      <div class="znf-grid">${account.profiles.map((name, index) => nfProfileTile(name, index, manage)).join("")}${manage && account.profiles.length < 5 ? '<button type="button" class="znf-profile is-add" data-znf-add><span>+</span><strong>Adicionar perfil</strong></button>' : ""}</div>
      ${manage && form ? `<form class="znf-edit" data-znf-save>${record.znfError ? `<p class="znf-error">${safe(record.znfError)}</p>` : ""}<label>${form.index === null ? "Nome do novo perfil" : "Nome do perfil"}<input name="name" value="${safe(form.index === null ? "" : account.profiles[form.index])}" maxlength="30" autocomplete="off" /></label><div><button type="submit" class="is-primary">Salvar</button>${form.index ? '<button type="button" data-znf-delete>Excluir perfil</button>' : ""}<button type="button" data-znf-cancel>Cancelar</button></div></form>` : ""}
      <button type="button" class="znf-manage" data-browser-go="${manage ? "netflix.com/perfis" : "netflix.com/perfis/gerenciar"}">${manage ? "Concluído" : "Gerenciar perfis"}</button></main></section>`;
  }

  // ---------- Facebook do Júnior ----------
  function facebook(record) {
    const fb = Z().site("facebook");
    const path = route(record);
    if (!fb.session) {
      return `<section class="zfb zfb-login"><div class="zfb-hero"><span class="zfb-word">facebook</span><p>Conecte-se com seus amigos e com a sua família.</p><small>Site simulado pelo OSLab</small></div><form class="zfb-card" data-zfb-login>${record.zfbError ? `<p class="zfb-error">${safe(record.zfbError)}</p>` : ""}<input name="email" type="email" placeholder="Email ou telefone" autocomplete="off" aria-label="Email" /><input name="password" type="password" placeholder="Senha" autocomplete="off" aria-label="Senha" /><button type="submit">Entrar</button><a>Esqueceu a senha?</a><hr /><span class="zfb-new">Criar nova conta</span></form></section>`;
    }
    const top = `<header class="zfb-top"><button type="button" class="zfb-f" data-browser-go="facebook.com" aria-label="Página inicial">f</button><span class="zfb-search">🔍 Pesquisar no Facebook</span><nav><button type="button" data-browser-go="facebook.com/configuracoes">⚙️ Configurações</button><button type="button" data-zfb-logout>Sair</button><img src="assets/whatsapp/people/junior.webp" alt="Júnior Silva" /></nav></header>`;
    if (path.startsWith("/configuracoes")) {
      return `<section class="zfb zfb-settings">${top}<div class="zfb-settings-body"><aside><h2>Configurações</h2><button type="button" class="is-on">🔒 Segurança e login</button><button type="button">👤 Informações pessoais</button><button type="button">🔔 Notificações</button></aside><main><h1>Segurança e login</h1>${record.zfbNotice ? `<p class="zfb-notice">${safe(record.zfbNotice)}</p>` : ""}
        <article><h2>Login</h2><div class="zfb-row"><span><strong>Alterar senha</strong><small>${fb.passwordChanged ? "Senha alterada agora" : "Use uma senha forte que você não use em outro lugar"}</small></span>${record.zfbForm === "password" ? "" : '<button type="button" data-zfb-open="password">Editar</button>'}</div>
        ${record.zfbForm === "password" ? `<form class="zfb-form" data-zfb-password>${record.zfbError ? `<p class="zfb-error">${safe(record.zfbError)}</p>` : ""}<label>Atual<input name="current" type="password" autocomplete="off" /></label><label>Nova (8+ caracteres, letras e números)<input name="next" type="password" autocomplete="off" /></label><label>Digite a nova senha novamente<input name="confirm" type="password" autocomplete="off" /></label><div><button type="submit" class="is-primary">Salvar alterações</button><button type="button" data-zfb-open="">Cancelar</button></div></form>` : ""}</article>
        <article><h2>Autenticação de dois fatores</h2><div class="zfb-row"><span><strong>Usar autenticação de dois fatores</strong><small>${fb.twoFactor ? "✅ Ativada · um código chega no celular a cada novo login" : "Desativada · peça um código além da senha ao entrar"}</small></span>${fb.twoFactor || fb.pendingCode ? "" : '<button type="button" data-zfb-2fa>Ativar</button>'}</div>
        ${fb.pendingCode && !fb.twoFactor ? `<form class="zfb-form" data-zfb-code>${record.zfbError ? `<p class="zfb-error">${safe(record.zfbError)}</p>` : ""}<p>Enviamos um código por SMS para o celular do Júnior (11) 9••••-6612.</p><label>Código de 6 dígitos<input name="code" inputmode="numeric" maxlength="7" autocomplete="off" /></label><div><button type="submit" class="is-primary">Confirmar</button></div></form>` : ""}</article></main></div></section>`;
    }
    const spam = fb.spamDeleted ? "" : `<article class="zfb-post is-spam"><header><img src="assets/whatsapp/people/junior.webp" alt="" /><span><strong>Júnior Silva</strong><small>12 min · 🌎</small></span><button type="button" aria-label="Opções da publicação" data-zfb-menu>•••</button></header>${record.zfbMenu ? '<div class="zfb-menu"><button type="button" data-zfb-delete>🗑️ Excluir publicação</button><button type="button" data-zfb-menu>Cancelar</button></div>' : ""}<p>🔥🔥 ÓCULOS DE SOL ORIGINAIS POR APENAS R$ 49,90!!! 🔥🔥 Últimas unidades, corre: <a>oculos-promo-oficial.shop</a> 😎😎</p><div class="zfb-ad">😎 MEGA PROMOÇÃO · 90% OFF</div><footer>👍 3 · 💬 Tia Rose: comprei 2!</footer></article>`;
    return `<section class="zfb zfb-feed">${top}<div class="zfb-feed-body"><aside><button type="button"><img src="assets/whatsapp/people/junior.webp" alt="" />Júnior Silva</button><button type="button">👥 Amigos</button><button type="button">🕘 Lembranças</button><button type="button">🔖 Salvos</button></aside><main>
      ${fb.twoFactor && fb.passwordChanged ? "" : '<p class="zfb-alert">⚠️ Detectamos atividade incomum na sua conta. <button type="button" data-browser-go="facebook.com/configuracoes">Revisar segurança</button></p>'}
      ${record.zfbNotice ? `<p class="zfb-notice">${safe(record.zfbNotice)}</p>` : ""}
      <div class="zfb-composer"><img src="assets/whatsapp/people/junior.webp" alt="" /><span>No que você está pensando, Júnior?</span></div>
      ${spam}
      <article class="zfb-post"><header><img src="assets/whatsapp/people/bia.webp" alt="" /><span><strong>Bia Martins</strong><small>1 h · 👥</small></span></header><p>Trabalho de Biologia pronto! 🦫📚</p><img class="zfb-photo" src="assets/whatsapp/media/capivara-2.webp" alt="Capivara" /><footer>❤️ 18 · 💬 4 comentários</footer></article>
      <article class="zfb-post"><header><img src="assets/whatsapp/people/davi.webp" alt="" /><span><strong>Davi Rocha</strong><small>3 h · 🌎</small></span></header><p>Alguém pra jogar hoje à noite? 🎮</p><footer>👍 7 · 💬 2 comentários</footer></article>
    </main></div></section>`;
  }

  // ---------- Integração com o navegador ----------
  function isHost(host) {
    if (!Z()?.isStarted?.()) return false;
    return host === "facebook.com" || (host === "netflix.com" && Z().netflixWanted());
  }
  function render(record) { return record.browserHost === "facebook.com" ? facebook(record) : netflix(record); }
  function clearMessages(record) { record.znfError = record.znfNotice = record.zfbError = record.zfbNotice = null; }

  function click(record, event) {
    const image = event.target.closest("[data-zimg]")?.dataset.zimg;
    if (image !== undefined) { imagePick = Number(image); redraw(record); return true; }
    if (event.target.closest("[data-zimg-close]")) { imagePick = null; redraw(record); return true; }
    const save = event.target.closest("[data-zimg-save]")?.dataset.zimgSave;
    if (save !== undefined) { saveImage(Number(save)); return true; }
    if (!isHost(record.browserHost)) return false;

    // Netflix
    const nf = Z().site("netflix");
    if (event.target.closest("[data-znf-logout]")) { nf.session = null; clearMessages(record); Z().touchSite("netflix", "logout"); go(record, "netflix.com/login"); return true; }
    const profile = event.target.closest("[data-znf-profile]")?.dataset.znfProfile;
    if (profile !== undefined) {
      clearMessages(record);
      if (route(record) === "/perfis/gerenciar") { record.znfEdit = { index: Number(profile) }; redraw(record); }
      else { record.znfNotice = `Olá, ${nfAccount().profiles[Number(profile)]}! (o catálogo de filmes não faz parte desta atividade)`; redraw(record); }
      return true;
    }
    if (event.target.closest("[data-znf-add]")) { clearMessages(record); record.znfEdit = { index: null }; redraw(record); return true; }
    if (event.target.closest("[data-znf-cancel]")) { record.znfEdit = null; clearMessages(record); redraw(record); return true; }
    if (event.target.closest("[data-znf-delete]")) {
      const account = nfAccount();
      const removed = account.profiles.splice(record.znfEdit.index, 1)[0];
      record.znfEdit = null; clearMessages(record); record.znfNotice = `Perfil “${removed}” excluído.`;
      Z().touchSite("netflix", "profile-deleted", { owner: account.owner }); redraw(record); return true;
    }
    if (event.target.closest("[data-znf-signout]")) {
      const account = nfAccount();
      account.devicesOut = true;
      clearMessages(record); record.znfNotice = "Pronto! Todos os aparelhos conectados a esta conta foram desconectados.";
      Z().touchSite("netflix", "signout-all", { owner: account.owner }); redraw(record); return true;
    }

    // Facebook
    const fb = Z().site("facebook");
    if (event.target.closest("[data-zfb-logout]")) { fb.session = null; clearMessages(record); Z().touchSite("facebook", "logout"); go(record, "facebook.com"); return true; }
    if (event.target.closest("[data-zfb-menu]")) { record.zfbMenu = !record.zfbMenu; redraw(record); return true; }
    if (event.target.closest("[data-zfb-delete]")) { fb.spamDeleted = true; record.zfbMenu = false; clearMessages(record); record.zfbNotice = "Publicação excluída."; Z().touchSite("facebook", "post-deleted"); redraw(record); return true; }
    const open = event.target.closest("[data-zfb-open]");
    if (open) { record.zfbForm = open.dataset.zfbOpen || null; clearMessages(record); redraw(record); return true; }
    if (event.target.closest("[data-zfb-2fa]")) {
      fb.pendingCode = String(284913 + Math.floor(Math.random() * 600000)).slice(0, 6);
      clearMessages(record);
      O.ui.notify("Mensagens · celular do Júnior", `Facebook: ${fb.pendingCode.slice(0, 3)} ${fb.pendingCode.slice(3)} é seu código de confirmação.`, "info", 15000);
      Z().touchSite("facebook", "2fa-code"); redraw(record); return true;
    }
    return false;
  }

  function submit(record, event) {
    const form = event.target.closest("[data-znf-login], [data-znf-password], [data-znf-save], [data-zfb-login], [data-zfb-password], [data-zfb-code]");
    if (!form || !isHost(record.browserHost)) return false;
    event.preventDefault();
    clearMessages(record);
    const nf = Z().site("netflix");
    const fb = Z().site("facebook");
    if (form.matches("[data-znf-login]")) {
      const email = field(form, "email").toLowerCase();
      const account = nf.accounts[email];
      if (!account) record.znfError = "Não encontramos uma conta com esse e-mail. Confira o que seu amigo mandou.";
      else if (account.password !== field(form, "password")) record.znfError = "Senha incorreta. Tente novamente.";
      else { nf.session = email; record.znfEdit = null; Z().touchSite("netflix", "login", { owner: account.owner }); go(record, "netflix.com/perfis"); return true; }
    }
    if (form.matches("[data-znf-password]")) {
      const account = nfAccount(), next = field(form, "next");
      if (field(form, "current") !== account.password) record.znfError = "A senha atual está incorreta.";
      else if (next.length < 8 || next.length > 60) record.znfError = "A nova senha precisa ter de 8 a 60 caracteres.";
      else if (next !== field(form, "confirm")) record.znfError = "As senhas novas não são iguais.";
      else if (next === account.password) record.znfError = "Escolha uma senha diferente da atual.";
      else { account.password = next; record.znfNotice = "Senha alterada com sucesso."; Z().touchSite("netflix", "password", { owner: account.owner }); go(record, "netflix.com/conta"); record.znfNotice = "Senha alterada com sucesso."; redraw(record); return true; }
    }
    if (form.matches("[data-znf-save]")) {
      const account = nfAccount(), name = field(form, "name");
      const index = record.znfEdit?.index ?? null;
      if (!name) record.znfError = "Digite um nome para o perfil.";
      else if (account.profiles.some((item, position) => position !== index && norm(item) === norm(name))) record.znfError = "Já existe um perfil com esse nome.";
      else {
        if (index === null) account.profiles.push(name); else account.profiles[index] = name;
        record.znfEdit = null; record.znfNotice = `Perfil “${name}” salvo.`;
        Z().touchSite("netflix", "profile-saved", { owner: account.owner, name });
      }
    }
    if (form.matches("[data-zfb-login]")) {
      if (field(form, "email").toLowerCase() !== fb.email) record.zfbError = "O email que você inseriu não está conectado a uma conta.";
      else if (field(form, "password") !== fb.password) record.zfbError = "A senha inserida está incorreta.";
      else { fb.session = fb.email; Z().touchSite("facebook", "login"); go(record, "facebook.com"); return true; }
    }
    if (form.matches("[data-zfb-password]")) {
      const next = field(form, "next");
      if (field(form, "current") !== fb.password) record.zfbError = "A senha atual está incorreta.";
      else if (!strong(next)) record.zfbError = "Use pelo menos 8 caracteres, com letras e números.";
      else if (next !== field(form, "confirm")) record.zfbError = "As senhas não coincidem.";
      else if (norm(next) === "junior123") record.zfbError = "Escolha uma senha diferente da antiga.";
      else { fb.password = next; fb.passwordChanged = true; record.zfbForm = null; record.zfbNotice = "Senha alterada. Outras sessões foram desconectadas."; Z().touchSite("facebook", "password"); }
    }
    if (form.matches("[data-zfb-code]")) {
      if (field(form, "code").replace(/\D/g, "") !== fb.pendingCode) record.zfbError = "Código incorreto. Confira a mensagem que chegou no celular.";
      else { fb.twoFactor = true; fb.pendingCode = null; record.zfbNotice = "Autenticação de dois fatores ativada ✅"; Z().touchSite("facebook", "2fa-on"); }
    }
    redraw(record);
    return true;
  }

  O.zapSites = { isHost, render, click, submit, change: () => false, searchResults, recordSearch: () => {}, IMAGES };
})(window);
