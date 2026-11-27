(function createFileSystem(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const ROOTS = Object.freeze({
    desktop: "root-desktop",
    documents: "root-documents",
    downloads: "root-downloads",
    pictures: "root-pictures",
    public: "root-public",
  });
  const ROOT_LABELS = {
    [ROOTS.desktop]: "Área de Trabalho",
    [ROOTS.documents]: "Documentos",
    [ROOTS.downloads]: "Downloads",
    [ROOTS.pictures]: "Imagens",
    [ROOTS.public]: "Pública",
  };

  let state = null;
  let persist = () => {};

  function makeId(prefix = "item") {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function normal(value) {
    return String(value || "").trim().toLocaleLowerCase("pt-BR");
  }

  function store() {
    return state.fileSystem.items;
  }

  function inferredSize(item) {
    if (item?.kind === "folder") return 0;
    if (Number.isFinite(Number(item?.sizeBytes)) && Number(item.sizeBytes) >= 0) return Number(item.sizeBytes);
    return Math.max(1024, String(item?.content || "").length * 2);
  }

  function get(id) {
    return store().find((item) => item.id === id) || null;
  }

  function actorId() {
    return OSLab.users?.getCurrent?.()?.id || OSLab.users?.getSelected?.()?.id || "user-aluno";
  }

  function isPublicItem(item) {
    if (!item) return false;
    if (item.parentId === ROOTS.public) return true;
    let parent = get(item.parentId);
    while (parent) { if (parent.parentId === ROOTS.public) return true; parent = get(parent.parentId); }
    return false;
  }

  function canRead(item) {
    if (!item || !isPublicItem(item)) return true;
    if (item.ownerId === actorId() || OSLab.users?.isAdministrator?.()) return true;
    return ["read", "modify"].includes(item.permission || "read");
  }

  function canModify(item) {
    if (!item || !isPublicItem(item)) return true;
    if (item.ownerId === actorId() || OSLab.users?.isAdministrator?.()) return true;
    return (item.permission || "read") === "modify";
  }

  function deny(item, operation) {
    OSLab.events.emit("file:access-denied", { fileId: item?.id || null, name: item?.name || "item", operation, actorUserId: actorId() }, "fileSystem");
    OSLab.events.emit("file:write-denied", { fileId: item?.id || null, operation, actorUserId: actorId() }, "fileSystem");
    return null;
  }

  function descendants(id) {
    const result = [];
    const visit = (parentId) => {
      store().filter((item) => item.parentId === parentId).forEach((item) => {
        result.push(item);
        visit(item.id);
      });
    };
    visit(id);
    return result;
  }

  function list(parentId, options = {}) {
    return store().filter((item) => item.parentId === parentId && canRead(item) && (options.trashed ? Boolean(item.trashedAt) : !item.trashedAt));
  }

  function uniqueName(parentId, requested, excludeId = null) {
    const clean = String(requested || "Novo item").trim().slice(0, 80) || "Novo item";
    const siblings = new Set(list(parentId).filter((item) => item.id !== excludeId).map((item) => normal(item.name)));
    if (!siblings.has(normal(clean))) return clean;
    const match = clean.match(/^(.*?)(\.[^.]+)?$/);
    const base = match?.[1] || clean;
    const extension = match?.[2] || "";
    let index = 2;
    while (siblings.has(normal(`${base} (${index})${extension}`))) index += 1;
    return `${base} (${index})${extension}`;
  }

  function syncLegacy() {
    if (!state) return;
    state.desktopFolders = list(ROOTS.desktop).filter((item) => item.kind === "folder").map(({ id, name, createdAt, kind }) => ({ id, name, createdAt, kind }));
    state.desktopFiles = list(ROOTS.desktop).filter((item) => item.kind === "file").map(({ id, name, createdAt, kind, content }) => ({ id, name, createdAt, kind, content: content || "" }));
    state.recycleBin = store().filter((item) => item.trashedAt && item.trashRootId === item.id).map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      content: item.content || "",
      createdAt: item.createdAt,
      deletedAt: item.trashedAt,
      originalLocation: pathLabel(item.originalParentId),
    }));
  }

  function commit() {
    syncLegacy();
    persist();
  }

  function migrate(oldState) {
    const existing = Array.isArray(oldState.fileSystem?.items) ? oldState.fileSystem.items : [];
    if (existing.length) {
      oldState.fileSystem.version = 1;
      oldState.fileSystem.items = existing.map((item) => ({ ...item, ownerId: item.ownerId || "user-aluno", permission: item.permission || (isPublicItem(item) ? "read" : "private"), sizeBytes: inferredSize(item) }));
      return;
    }
    const items = [];
    (oldState.desktopFolders || []).forEach((item) => items.push({
      id: item.id || makeId("folder"), parentId: ROOTS.desktop, kind: "folder", name: item.name || "Nova pasta",
      mime: "inode/directory", content: "", sourceId: null, createdAt: item.createdAt || Date.now(), createdByMission: false,
      missionId: null, trashRootId: null, trashedAt: null, originalParentId: null,
    }));
    (oldState.desktopFiles || []).forEach((item) => items.push({
      id: item.id || makeId("file"), parentId: ROOTS.desktop, kind: "file", name: item.name || "Novo Documento de Texto.txt",
      mime: "text/plain", content: item.content || "", sourceId: null, createdAt: item.createdAt || Date.now(), createdByMission: false,
      missionId: null, trashRootId: null, trashedAt: null, originalParentId: null,
    }));
    (oldState.recycleBin || []).forEach((item) => {
      const id = item.id || makeId(item.kind === "folder" ? "folder" : "file");
      items.push({
        id, parentId: ROOTS.desktop, kind: item.kind === "folder" ? "folder" : "file", name: item.name || "Item excluído",
        mime: item.kind === "folder" ? "inode/directory" : "application/octet-stream", content: item.content || "", sourceId: null,
        createdAt: item.createdAt || Date.now(), createdByMission: false, missionId: null, trashRootId: id,
        trashedAt: item.deletedAt || Date.now(), originalParentId: ROOTS.desktop,
      });
    });
    oldState.fileSystem = { version: 1, items };
  }

  function create(input) {
    const parentId = input.parentId || ROOTS.desktop;
    const kind = input.kind === "folder" ? "folder" : "file";
    const item = {
      id: input.id && !get(input.id) ? input.id : makeId(kind),
      parentId,
      kind,
      name: uniqueName(parentId, input.name || (kind === "folder" ? "Nova pasta" : "Novo arquivo.txt")),
      mime: input.mime || (kind === "folder" ? "inode/directory" : "application/octet-stream"),
      content: typeof input.content === "string" ? input.content : "",
      sizeBytes: kind === "folder" ? 0 : Math.max(0, Number(input.sizeBytes) || String(input.content || "").length * 2 || 1024),
      sourceId: input.sourceId || null,
      createdAt: input.createdAt || Date.now(),
      createdByMission: Boolean(input.createdByMission),
      missionId: input.missionId || null,
      trashRootId: null,
      trashedAt: null,
      originalParentId: null,
      ownerId: input.ownerId || actorId(),
      permission: input.permission || (parentId === ROOTS.public || isPublicItem(get(parentId)) ? "read" : "private"),
    };
    store().push(item);
    commit();
    OSLab.events.emit("file:created", { fileId: item.id, name: item.name, kind: item.kind, parentFolderId: parentId, item: { ...item } }, "fileSystem");
    return item;
  }

  function rename(id, requestedName) {
    const item = get(id);
    if (!item || item.trashedAt) return null;
    if (!canModify(item)) return deny(item, "rename");
    const previousName = item.name;
    const nextName = uniqueName(item.parentId, requestedName, id);
    if (!nextName || nextName === previousName) return item;
    item.name = nextName;
    commit();
    OSLab.events.emit("file:renamed", { fileId: id, previousName, name: nextName, parentFolderId: item.parentId, item: { ...item } }, "fileSystem");
    return item;
  }

  function move(id, parentId) {
    const item = get(id);
    const destination = get(parentId);
    if (!item || item.trashedAt || (parentId && !ROOT_LABELS[parentId] && destination?.kind !== "folder")) return null;
    if (!canModify(item) || (destination && !canModify(destination))) return deny(item, "move");
    if (id === parentId || descendants(id).some((child) => child.id === parentId)) return null;
    const previousParentId = item.parentId;
    item.parentId = parentId;
    item.name = uniqueName(parentId, item.name, item.id);
    commit();
    OSLab.events.emit("file:moved", { fileId: id, previousParentId, parentFolderId: parentId, item: { ...item } }, "fileSystem");
    return item;
  }

  function copy(id, parentId, options = {}) {
    const source = get(id);
    if (!source || source.trashedAt || !canRead(source)) return deny(source, "copy");
    const destination = get(parentId);
    if (destination && !canModify(destination)) return deny(destination, "copy-destination");
    const clone = create({ ...source, id: null, parentId, name: uniqueName(parentId, source.name), sourceId: source.id, createdAt: Date.now(), missionId: options.missionId || source.missionId, createdByMission: Boolean(options.createdByMission || source.createdByMission) });
    if (source.kind === "folder") {
      list(source.id).forEach((child) => copy(child.id, clone.id, options));
    }
    OSLab.events.emit("file:copied", { sourceId: source.id, fileId: clone.id, parentFolderId: parentId, item: { ...clone } }, "fileSystem");
    return clone;
  }

  function remove(id) {
    const item = get(id);
    if (!item || item.trashedAt) return null;
    if (!canModify(item)) return deny(item, "delete");
    const deletedAt = Date.now();
    const affected = [item, ...descendants(id)];
    affected.forEach((entry) => {
      entry.trashRootId = id;
      entry.trashedAt = deletedAt;
      if (entry.id === id) entry.originalParentId = entry.parentId;
    });
    commit();
    OSLab.events.emit("file:deleted", { fileId: id, name: item.name, originalParentId: item.originalParentId, item: { ...item } }, "fileSystem");
    return item;
  }

  function recycleItems() {
    return store().filter((item) => item.trashedAt && item.trashRootId === item.id).sort((a, b) => b.trashedAt - a.trashedAt);
  }

  function restore(id) {
    const item = get(id);
    if (!item?.trashedAt || item.trashRootId !== id) return null;
    const parentId = get(item.originalParentId)?.trashedAt ? ROOTS.desktop : (item.originalParentId || ROOTS.desktop);
    const affected = [item, ...descendants(id).filter((child) => child.trashRootId === id)];
    affected.forEach((entry) => { entry.trashedAt = null; entry.trashRootId = null; });
    item.parentId = parentId;
    item.originalParentId = null;
    item.name = uniqueName(parentId, item.name, item.id);
    commit();
    OSLab.events.emit("recycle:restored", { fileId: id, parentFolderId: parentId, item: { ...item } }, "fileSystem");
    return item;
  }

  function permanentlyDelete(id) {
    const ids = new Set([id, ...descendants(id).map((item) => item.id)]);
    state.fileSystem.items = store().filter((item) => !ids.has(item.id));
    commit();
    OSLab.events.emit("recycle:deleted", { fileId: id }, "fileSystem");
  }

  function emptyRecycleBin() {
    const removed = recycleItems().map((item) => item.id);
    if (!removed.length) return [];
    const trashedIds = new Set(store().filter((item) => item.trashedAt).map((item) => item.id));
    state.fileSystem.items = store().filter((item) => !trashedIds.has(item.id));
    commit();
    OSLab.events.emit("recycle:emptied", { removedIds: removed }, "fileSystem");
    return removed;
  }

  function search(query, parentId = null) {
    const needle = normal(query);
    const allowed = parentId ? new Set([parentId, ...descendants(parentId).map((item) => item.id)]) : null;
    return store().filter((item) => !item.trashedAt && canRead(item) && item.kind === "file" && (!allowed || allowed.has(item.parentId)) && normal(item.name).includes(needle));
  }

  function pathIds(id) {
    const ids = [];
    let current = get(id);
    while (current) { ids.unshift(current.id); current = get(current.parentId); }
    return ids;
  }

  function pathLabel(parentId) {
    if (ROOT_LABELS[parentId]) return ROOT_LABELS[parentId];
    const parts = [];
    let current = get(parentId);
    while (current) { parts.unshift(current.name); if (ROOT_LABELS[current.parentId]) { parts.unshift(ROOT_LABELS[current.parentId]); break; } current = get(current.parentId); }
    return parts.join("/") || "Área de Trabalho";
  }

  function removeMissionItems(missionId) {
    const ids = new Set(store().filter((item) => item.missionId === missionId).map((item) => item.id));
    state.fileSystem.items = store().filter((item) => !ids.has(item.id) && !ids.has(item.trashRootId));
    commit();
  }

  function bytesForItem(id) {
    const target = get(id);
    if (!target) return 0;
    return inferredSize(target) + descendants(id).reduce((sum, item) => sum + inferredSize(item), 0);
  }

  function usedBytes() {
    return store().reduce((sum, item) => sum + inferredSize(item), 0);
  }

  function folderBytes(parentId) {
    return list(parentId).reduce((sum, item) => sum + bytesForItem(item.id), 0);
  }

  function setPermission(id, permission) {
    const item = get(id);
    const next = ["none", "read", "modify"].includes(permission) ? permission : "read";
    if (!item || !isPublicItem(item)) return { ok: false, reason: "not-public" };
    if (item.ownerId !== actorId() && !OSLab.users?.isAdministrator?.()) return { ok: false, reason: "forbidden" };
    item.permission = next;
    commit();
    OSLab.events.emit("file:permission-changed", { fileId: id, permission: next, ownerId: item.ownerId, actorUserId: actorId() }, "fileSystem");
    return { ok: true, item: { ...item } };
  }

  OSLab.fileSystem = {
    roots: ROOTS,
    labels: ROOT_LABELS,
    bind(sharedState, save) {
      state = sharedState;
      persist = typeof save === "function" ? save : persist;
      migrate(state);
      state.version = Math.max(3, Number(state.version) || 0);
      syncLegacy();
      return this;
    },
    get,
    list,
    create,
    rename,
    move,
    copy,
    delete: remove,
    restore,
    permanentlyDelete,
    emptyRecycleBin,
    recycleItems,
    search,
    descendants,
    pathIds,
    pathLabel,
    uniqueName,
    removeMissionItems,
    bytesForItem,
    usedBytes,
    folderBytes,
    canRead,
    canModify,
    isPublicItem,
    setPermission,
    find(parentId, name, kind = null) {
      return list(parentId).find((item) => normal(item.name) === normal(name) && (!kind || item.kind === kind)) || null;
    },
    snapshot() { return JSON.parse(JSON.stringify(state.fileSystem)); },
    restoreSnapshot(snapshot) { if (snapshot?.items) { state.fileSystem = JSON.parse(JSON.stringify(snapshot)); commit(); } },
  };
})(window);
