(function createSystemUI(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  let toastRoot;
  let modalRoot;
  let uacRoot;

  function ensureRoots() {
    if (!toastRoot) {
      toastRoot = document.createElement("section");
      toastRoot.className = "oslab-toast-stack";
      toastRoot.setAttribute("aria-live", "polite");
      document.body.appendChild(toastRoot);
    }
    if (!modalRoot) {
      modalRoot = document.createElement("div");
      modalRoot.className = "oslab-modal-root is-hidden";
      document.body.appendChild(modalRoot);
    }
    if (!uacRoot) {
      uacRoot = document.createElement("div");
      uacRoot.className = "uac-root is-hidden";
      document.body.appendChild(uacRoot);
    }
  }

  function notify(title, message, kind = "info", timeout = 4200) {
    ensureRoots();
    const toast = document.createElement("article");
    toast.className = `oslab-toast is-${kind}`;
    toast.innerHTML = `<img src="${OSLab.icons.get(kind, "info")}" alt="" /><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(message)}</small></span><button type="button" aria-label="Fechar notificação"><img src="assets/icons/ui/close.png" alt="" /></button>`;
    toastRoot.appendChild(toast);
    toast.querySelector("button").addEventListener("click", () => toast.remove());
    window.setTimeout(() => { toast.classList.add("is-leaving"); window.setTimeout(() => toast.remove(), 180); }, timeout);
    return toast;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  }

  function closeModal(result = false) {
    const resolve = modalRoot?._resolve;
    if (modalRoot) { modalRoot.classList.add("is-hidden"); modalRoot.innerHTML = ""; modalRoot._resolve = null; }
    resolve?.(result);
  }

  function confirm(options = {}) {
    ensureRoots();
    if (modalRoot._resolve) closeModal(false);
    modalRoot.classList.remove("is-hidden");
    modalRoot.innerHTML = `<section class="oslab-dialog" role="dialog" aria-modal="true" aria-labelledby="oslab-dialog-title">
      <header><img src="${OSLab.icons.get(options.kind || "warning", "warning")}" alt="" /><div><h2 id="oslab-dialog-title">${escapeHtml(options.title || "Confirmar ação")}</h2><p>${escapeHtml(options.message || "Deseja continuar?")}</p></div></header>
      <footer><button type="button" data-modal-result="false">${escapeHtml(options.cancelLabel || "Cancelar")}</button><button class="is-primary" type="button" data-modal-result="true">${escapeHtml(options.confirmLabel || "Confirmar")}</button></footer>
    </section>`;
    const promise = new Promise((resolve) => { modalRoot._resolve = resolve; });
    modalRoot.querySelectorAll("[data-modal-result]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.modalResult === "true")));
    modalRoot.querySelector(".is-primary")?.focus();
    return promise;
  }

  function elevate(options = {}) {
    ensureRoots();
    const current = OSLab.users?.getCurrent?.();
    const administrators = OSLab.users?.list?.().filter((account) => account.role === "administrator") || [];
    const previousFocus = document.activeElement;
    OSLab.events.emit("elevation:requested", { action: options.action || "administrative-action", actorUserId: current?.id || null }, "uac");
    uacRoot.classList.remove("is-hidden");
    const credentialFields = current?.role === "administrator" ? "" : `<div class="uac-body"><label for="uac-admin">Conta de administrador</label><select id="uac-admin">${administrators.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.displayName)}</option>`).join("")}</select><label for="uac-password">Senha fictícia</label><input id="uac-password" type="password" autocomplete="off" placeholder="Senha" /><p class="account-error" data-uac-error role="status"></p></div>`;
    uacRoot.innerHTML = `<section class="uac-dialog" role="dialog" aria-modal="true" aria-labelledby="uac-title"><header><img src="assets/learning/icons/shield_checkmark.svg" alt="" /><h2 id="uac-title">Deseja permitir que este aplicativo faça alterações no seu dispositivo?</h2><p>${escapeHtml(options.message || options.actionLabel || "Ação administrativa do OSLab")}</p></header>${credentialFields}<footer><button class="win-button" type="button" data-uac="no">Não</button><button class="win-button is-primary" type="button" data-uac="yes">Sim</button></footer></section>`;
    return new Promise((resolve) => {
      const finish = (result, eventType) => {
        uacRoot.classList.add("is-hidden"); uacRoot.innerHTML = "";
        if (eventType) OSLab.events.emit(eventType, { action: options.action || "administrative-action", targetUserId: options.targetUserId || null, authorizationId: result?.token || null, actorUserId: current?.id || null, administratorId: result?.administratorId || current?.id || null }, "uac");
        previousFocus?.focus?.(); resolve(result || { ok: false });
      };
      uacRoot.querySelector("[data-uac='no']").addEventListener("click", () => finish({ ok: false, reason: "cancelled" }, "elevation:denied"));
      uacRoot.querySelector("[data-uac='yes']").addEventListener("click", async () => {
        if (current?.role === "administrator") { finish({ ok: true, administratorId: current.id, token: `consent-${Date.now()}` }, "elevation:granted"); return; }
        const administratorId = uacRoot.querySelector("#uac-admin")?.value;
        const password = uacRoot.querySelector("#uac-password")?.value || "";
        const result = await OSLab.users.authorizeAdministrator(administratorId, password);
        if (!result.ok) {
          const error = uacRoot.querySelector("[data-uac-error]");
          if (error) error.textContent = "Credenciais incorretas. Tente novamente ou cancele.";
          OSLab.events.emit("elevation:invalid-credentials", { action: options.action || "administrative-action", administratorId }, "uac");
          uacRoot.querySelector("#uac-password")?.select();
          return;
        }
        finish(result, "elevation:granted");
      });
      (uacRoot.querySelector("#uac-password") || uacRoot.querySelector("[data-uac='yes']"))?.focus();
    });
  }

  function choosePermission(item) {
    ensureRoots();
    if (modalRoot._resolve) closeModal(false);
    const current = item?.permission || "read";
    modalRoot.classList.remove("is-hidden");
    modalRoot.innerHTML = `<section class="oslab-dialog security-dialog" role="dialog" aria-modal="true" aria-labelledby="security-title"><header><img src="assets/learning/icons/shield_checkmark.svg" alt="" /><div><h2 id="security-title">Propriedades de ${escapeHtml(item?.name || "item")}</h2><p>Segurança · Permissões para Todos</p></div></header><div class="permission-options"><label><input type="radio" name="permission" value="read" ${current === "read" ? "checked" : ""} /> Leitura — pode abrir e copiar</label><label><input type="radio" name="permission" value="modify" ${current === "modify" ? "checked" : ""} /> Modificação — pode editar, renomear e excluir</label><label><input type="radio" name="permission" value="none" ${current === "none" ? "checked" : ""} /> Sem acesso</label></div><footer><button type="button" data-security-cancel>Cancelar</button><button class="is-primary" type="button" data-security-save>Aplicar</button></footer></section>`;
    return new Promise((resolve) => {
      modalRoot._resolve = resolve;
      modalRoot.querySelector("[data-security-cancel]").addEventListener("click", () => closeModal(null));
      modalRoot.querySelector("[data-security-save]").addEventListener("click", () => closeModal(modalRoot.querySelector("input[name='permission']:checked")?.value || "read"));
      modalRoot.querySelector("input:checked")?.focus();
    });
  }

  function showMissionResult(result) {
    ensureRoots();
    modalRoot.classList.remove("is-hidden");
    modalRoot.innerHTML = `<section class="oslab-dialog mission-result-dialog" role="dialog" aria-modal="true" aria-labelledby="mission-result-title">
      <div class="mission-result-emblem"><img src="assets/learning/mascot/oslab-mascot-celebrate.png" alt="Mascote do OSLab comemorando" /></div>
      <h2 id="mission-result-title">Missão concluída!</h2><h3>${escapeHtml(result.title)}</h3><p>${escapeHtml(result.concept)}</p>
      <div class="mission-result-stats"><span><strong>${result.score}</strong><small>Pontos</small></span><span><strong>${result.mistakes}</strong><small>Erros</small></span><span><strong>${result.hintsUsed}</strong><small>Dicas</small></span></div>
      <footer><button type="button" data-result-action="system">Voltar ao sistema</button><button type="button" data-result-action="repeat">Repetir missão</button><button class="is-primary" type="button" data-result-action="next">Próxima missão</button></footer>
    </section>`;
    modalRoot.querySelectorAll("[data-result-action]").forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.resultAction; modalRoot.classList.add("is-hidden"); modalRoot.innerHTML = "";
      if (action === "repeat") OSLab.missions.start(result.missionId);
      if (action === "next") { const next = OSLab.missions.getMissions().find((mission) => mission.order === (OSLab.missionCatalog.find((entry) => entry.id === result.missionId)?.order || 0) + 1); if (next) { OSLab.shell?.openApp?.("missions"); OSLab.missions.start(next.id); } else OSLab.shell?.openApp?.("missions"); }
    }));
  }

  function renderWidget() { OSLab.assistantRobot?.render?.(); }

  function runTaskDialog(apps) {
    ensureRoots();
    modalRoot.classList.remove("is-hidden");
    modalRoot.innerHTML = `<section class="oslab-dialog run-task-dialog" role="dialog" aria-modal="true"><header><img src="assets/icons/taskmanager/run.png" alt="" /><div><h2>Executar nova tarefa</h2><p>Escolha um aplicativo do OSLab.</p></div></header><div class="run-task-list">${apps.map((app) => `<button type="button" data-run-app="${app.id}"><img src="${app.icon}" alt="" /><span>${escapeHtml(app.title)}</span></button>`).join("")}</div><footer><button type="button" data-run-cancel>Cancelar</button></footer></section>`;
    modalRoot.querySelector("[data-run-cancel]").addEventListener("click", () => closeModal(false));
    modalRoot.querySelectorAll("[data-run-app]").forEach((button) => button.addEventListener("click", () => { OSLab.shell.openApp(button.dataset.runApp); closeModal(true); }));
  }

  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modalRoot && !modalRoot.classList.contains("is-hidden")) closeModal(false); });
  document.addEventListener("DOMContentLoaded", ensureRoots);
  OSLab.events.subscribe("mission:completed", (event) => showMissionResult(event.detail.result));

  OSLab.ui = { notify, confirm, elevate, choosePermission, showMissionResult, renderWidget, runTaskDialog, escapeHtml };
})(window);
