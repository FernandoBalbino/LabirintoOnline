(function defineMissionCatalog(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const roots = () => OSLab.fileSystem.roots;
  const missionItem = (missionId, input) => OSLab.fileSystem.create({ ...input, createdByMission: true, missionId });
  const item = (id) => OSLab.fileSystem.get(id);
  const eventType = (event, type) => event?.type === type;

  function folderPath(parentId, names, missionId) {
    let current = parentId;
    names.forEach((name) => {
      const existing = OSLab.fileSystem.find(current, name, "folder");
      current = existing?.id || missionItem(missionId, { parentId: current, kind: "folder", name }).id;
    });
    return current;
  }

  const catalog = [
    {
      id: "open-first-app", order: 1, title: "Abrindo seu primeiro aplicativo", categories: ["Primeiros passos", "Aplicativos", "Atalhos"],
      description: "Encontre e abra o Explorador de Arquivos usando o menu Iniciar.", concept: "Menu Iniciar e abertura de aplicativos",
      objectives: [{ id: "start", label: "Abrir o menu Iniciar" }, { id: "explorer", label: "Abrir o Explorador de Arquivos" }],
      hint: {
        title: "Como abrir o Explorador pelo menu Iniciar",
        intro: "Siga o caminho completo para conhecer o ponto de partida dos aplicativos do sistema.",
        steps: [
          "Olhe para o centro da barra de tarefas, na parte inferior da tela, e clique no botão Iniciar com o logotipo do Windows.",
          "Espere o menu Iniciar aparecer acima da barra de tarefas e localize a área de aplicativos fixados.",
          "Procure o item Explorador de Arquivos, identificado pela imagem de uma pasta amarela.",
          "Clique uma vez em Explorador de Arquivos e aguarde a janela abrir.",
        ],
        check: "A missão avança quando o menu Iniciar foi aberto e a janela do Explorador de Arquivos aparece na tela.",
      },
      setup(ctx) { ctx.shell.closeApp("explorer"); return {}; },
      validate(event, ctx) {
        if (eventType(event, "start:opened")) ctx.fact("start", true);
        if (eventType(event, "app:opened") && event.detail.appId === "explorer") {
          if (ctx.fact("start")) ctx.fact("explorer", true); else ctx.mistake();
        }
        return [ctx.fact("start") && "start", ctx.fact("explorer") && "explorer"].filter(Boolean);
      },
    },
    {
      id: "window-control", order: 2, title: "Controlando uma janela", categories: ["Primeiros passos", "Aplicativos"],
      description: "Minimize e restaure a mesma janela pela barra de tarefas.", concept: "Gerenciamento de janelas",
      objectives: [{ id: "minimize", label: "Minimizar o Editor de Texto" }, { id: "restore", label: "Restaurar pela barra de tarefas" }],
      hint: {
        title: "Como minimizar e restaurar a mesma janela",
        intro: "Use primeiro os controles da janela e depois a barra de tarefas para trazê-la de volta.",
        steps: [
          "Na janela Editor de Texto preparada pelo laboratório, encontre os três botões no canto superior direito.",
          "Clique no botão Minimizar, representado por um pequeno traço. A janela deve sumir sem ser fechada.",
          "Observe a barra de tarefas na parte inferior e localize o ícone do Editor de Texto que continua marcado como aberto.",
          "Clique nesse ícone uma vez para restaurar exatamente a mesma janela.",
        ],
        check: "A janela deve reaparecer com o mesmo conteúdo; fechar e abrir outro Editor de Texto não conclui a etapa.",
      },
      setup(ctx) { const record = ctx.shell.openTextEditor({ missionId: ctx.id, title: "Editor de Texto" }); return { windowId: record?.windowId || "texteditor" }; },
      validate(event, ctx) {
        if (event.detail.windowId !== ctx.scenario.windowId) return ctx.completed();
        if (eventType(event, "window:minimized")) ctx.fact("minimize", true);
        if (eventType(event, "window:restored") && ctx.fact("minimize")) ctx.fact("restore", true);
        return [ctx.fact("minimize") && "minimize", ctx.fact("restore") && "restore"].filter(Boolean);
      },
    },
    {
      id: "create-folder", order: 3, title: "Criando uma pasta", categories: ["Arquivos e pastas"],
      description: "Crie uma pasta chamada Atividades Escolares dentro de Documentos.", concept: "Criação e localização de diretórios",
      objectives: [{ id: "folder", label: "Criar Atividades Escolares em Documentos" }],
      hint: {
        title: "Como criar a pasta no local correto",
        intro: "A pasta precisa ficar dentro de Documentos e ter o nome exatamente como foi pedido.",
        steps: [
          "Na janela do Explorador já aberta, entre em Documentos pelo painel de navegação ou pelo item mostrado na tela.",
          "Na barra de comandos do Explorador, clique em Novo e depois escolha Pasta.",
          "Quando o campo de nome aparecer, digite Atividades Escolares, mantendo os espaços e as letras maiúsculas.",
          "Pressione Enter ou clique fora do campo para confirmar a criação.",
        ],
        check: "Confira se Atividades Escolares aparece como uma pasta dentro de Documentos, e não na Área de Trabalho.",
      },
      setup(ctx) { const old = OSLab.fileSystem.find(roots().documents, "Atividades Escolares", "folder"); if (old?.missionId === ctx.id) OSLab.fileSystem.delete(old.id); ctx.shell.openFolder(roots().documents); return {}; },
      validate(event, ctx) {
        const found = OSLab.fileSystem.find(roots().documents, "Atividades Escolares", "folder");
        // O Windows cria primeiro "Nova pasta" e só então confirma o nome.
        // Só uma renomeação confirmada incorreta conta como tentativa relevante.
        if (eventType(event, "file:renamed") && !found && event.detail.parentFolderId === roots().documents) ctx.mistake();
        return found ? ["folder"] : [];
      },
    },
    {
      id: "rename-document", order: 4, title: "Renomeando um documento", categories: ["Arquivos e pastas"],
      description: "Renomeie o documento criado pelo laboratório sem substituí-lo.", concept: "Identidade de arquivos e renomeação",
      objectives: [{ id: "rename", label: "Renomear para Atividade de Informática.txt" }],
      hint: {
        title: "Como renomear sem trocar o arquivo",
        intro: "Renomear preserva a identidade do documento; criar outro arquivo não atende ao objetivo.",
        steps: [
          "No Explorador aberto em Documentos, clique uma vez em documento-novo.txt para selecioná-lo.",
          "Na barra de comandos, clique em Renomear. O nome atual ficará editável.",
          "Digite Atividade de Informática.txt exatamente, incluindo o acento e a extensão .txt.",
          "Pressione Enter para salvar o novo nome.",
        ],
        check: "O item deve continuar no mesmo local e aparecer como Atividade de Informática.txt; não deve existir uma cópia adicional.",
      },
      setup(ctx) { const file = missionItem(ctx.id, { parentId: roots().documents, kind: "file", name: "documento-novo.txt", mime: "text/plain" }); ctx.shell.openFolder(roots().documents); return { fileId: file.id }; },
      validate(event, ctx) {
        const target = item(ctx.scenario.fileId);
        if (eventType(event, "file:renamed") && event.detail.fileId === ctx.scenario.fileId && event.detail.name !== "Atividade de Informática.txt") ctx.mistake();
        return target && target.parentId === roots().documents && target.name === "Atividade de Informática.txt" ? ["rename"] : [];
      },
    },
    {
      id: "move-file", order: 5, title: "Colocando o arquivo no lugar correto", categories: ["Arquivos e pastas"],
      description: "Mova o arquivo da Área de Trabalho para Documentos/Informática.", concept: "Mover arquivos entre diretórios",
      objectives: [{ id: "move", label: "Mover pesquisa-informatica.docx para Informática" }],
      hint: {
        title: "Como mover o arquivo para Informática",
        intro: "Use Recortar e Colar para transferir o arquivo, evitando deixar uma cópia na Área de Trabalho.",
        steps: [
          "Na Área de Trabalho ou no Explorador, selecione pesquisa-informatica.docx.",
          "Clique em Recortar na barra de comandos; o arquivo ficará pronto para ser movido.",
          "Abra Documentos e, dentro dele, abra a pasta Informática preparada pela missão.",
          "Clique em Colar para colocar o arquivo nessa pasta.",
        ],
        check: "Abra Documentos/Informática e confirme que pesquisa-informatica.docx está lá e não aparece mais na Área de Trabalho.",
      },
      setup(ctx) { const file = missionItem(ctx.id, { parentId: roots().desktop, kind: "file", name: "pesquisa-informatica.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }); const folder = missionItem(ctx.id, { parentId: roots().documents, kind: "folder", name: "Informática" }); ctx.shell.refreshDesktop(); ctx.shell.openFolder(roots().desktop); return { fileId: file.id, folderId: folder.id }; },
      validate(event, ctx) {
        const target = item(ctx.scenario.fileId);
        if (eventType(event, "file:copied") && event.detail.sourceId === ctx.scenario.fileId) ctx.mistake();
        return target && !target.trashedAt && target.parentId === ctx.scenario.folderId ? ["move"] : [];
      },
    },
    {
      id: "copy-file", order: 6, title: "Criando uma cópia de segurança", categories: ["Arquivos e pastas", "Segurança"],
      description: "Copie o trabalho final para Backup sem remover o original.", concept: "Cópias de segurança",
      objectives: [{ id: "copy", label: "Manter o original e criar uma cópia em Backup" }],
      hint: {
        title: "Como criar uma cópia de segurança",
        intro: "O original precisa permanecer em Documentos enquanto uma segunda cópia é criada em Backup.",
        steps: [
          "Em Documentos, selecione o arquivo trabalho-final.pdf.",
          "Clique em Copiar na barra de comandos. Não use Recortar, pois o original deve continuar no lugar.",
          "Abra a pasta Backup que aparece no mesmo diretório.",
          "Clique em Colar e espere a cópia aparecer dentro da pasta.",
        ],
        check: "Confirme que trabalho-final.pdf existe em Documentos e também dentro de Documentos/Backup.",
      },
      setup(ctx) { const file = missionItem(ctx.id, { parentId: roots().documents, kind: "file", name: "trabalho-final.pdf", mime: "application/pdf", content: "OSLab PDF" }); const backup = missionItem(ctx.id, { parentId: roots().documents, kind: "folder", name: "Backup" }); ctx.shell.openFolder(roots().documents); return { fileId: file.id, backupId: backup.id }; },
      validate(event, ctx) {
        const original = item(ctx.scenario.fileId);
        const copy = OSLab.fileSystem.list(ctx.scenario.backupId).find((entry) => entry.sourceId === ctx.scenario.fileId && entry.name === "trabalho-final.pdf");
        if (eventType(event, "file:moved") && event.detail.fileId === ctx.scenario.fileId) ctx.mistake();
        return original?.parentId === roots().documents && copy ? ["copy"] : [];
      },
    },
    {
      id: "restore-file", order: 7, title: "Recuperando um arquivo apagado", categories: ["Arquivos e pastas", "Segurança"],
      description: "Restaure o arquivo importante pelo mecanismo real da Lixeira.", concept: "Exclusão segura e recuperação",
      objectives: [{ id: "restore", label: "Restaurar atividade-importante.docx" }],
      hint: {
        title: "Como recuperar o documento pela Lixeira",
        intro: "Restaurar devolve o mesmo arquivo ao local de origem, sem criar uma cópia manual.",
        steps: [
          "Abra a Lixeira pelo atalho na Área de Trabalho, caso ela ainda não esteja aberta.",
          "Na lista de itens excluídos, clique uma vez em atividade-importante.docx.",
          "Na barra superior da Lixeira, clique em Restaurar.",
          "Abra Documentos no Explorador para verificar o local ao qual o arquivo voltou.",
        ],
        check: "atividade-importante.docx deve desaparecer da Lixeira e reaparecer dentro de Documentos.",
      },
      setup(ctx) { const file = missionItem(ctx.id, { parentId: roots().documents, kind: "file", name: "atividade-importante.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }); OSLab.fileSystem.delete(file.id); ctx.shell.openRecycleBin(); return { fileId: file.id, originalParentId: roots().documents }; },
      validate(event, ctx) {
        const target = item(ctx.scenario.fileId);
        if (eventType(event, "recycle:restored") && event.detail.fileId !== ctx.scenario.fileId) ctx.mistake();
        return target && !target.trashedAt && target.parentId === ctx.scenario.originalParentId ? ["restore"] : [];
      },
    },
    {
      id: "search-file", order: 8, title: "Encontrando um documento perdido", categories: ["Arquivos e pastas", "Atalhos"],
      description: "Use a pesquisa recursiva do Explorador para encontrar um arquivo profundo.", concept: "Pesquisa e caminhos de arquivos",
      objectives: [{ id: "search", label: "Pesquisar relatorio-final.pdf" }, { id: "select", label: "Selecionar o resultado correto" }],
      hint: {
        title: "Como localizar um arquivo em pastas internas",
        intro: "A busca do Explorador percorre as subpastas de Documentos e mostra o caminho do resultado.",
        steps: [
          "No Explorador aberto em Documentos, localize a caixa Pesquisar no canto superior direito.",
          "Clique na caixa, digite relatorio-final e aguarde a lista de resultados ser atualizada.",
          "Procure o resultado chamado relatorio-final.pdf e observe que ele está dentro de Escola/Informática.",
          "Clique uma vez no resultado correto para selecioná-lo.",
        ],
        check: "A missão marca as duas etapas quando a pesquisa encontra o arquivo e o resultado relatorio-final.pdf é selecionado.",
      },
      setup(ctx) { const deep = folderPath(roots().documents, ["Escola", "Informática"], ctx.id); missionItem(ctx.id, { parentId: roots().documents, kind: "file", name: "anotacoes.txt", mime: "text/plain" }); const file = missionItem(ctx.id, { parentId: deep, kind: "file", name: "relatorio-final.pdf", mime: "application/pdf" }); ctx.shell.openFolder(roots().documents); return { fileId: file.id }; },
      validate(event, ctx) {
        if (eventType(event, "file:searched") && event.detail.resultIds?.includes(ctx.scenario.fileId)) ctx.fact("search", true);
        if (eventType(event, "file:selected") && event.detail.fileId === ctx.scenario.fileId && ctx.fact("search")) ctx.fact("select", true);
        return [ctx.fact("search") && "search", ctx.fact("select") && "select"].filter(Boolean);
      },
    },
    {
      id: "change-wallpaper", order: 9, title: "Personalizando o computador", categories: ["Personalização"],
      description: "Troque o plano de fundo para Windows 11 claro.", concept: "Personalização do ambiente",
      objectives: [{ id: "wallpaper", label: "Aplicar o papel de parede Windows 11 claro" }],
      hint: {
        title: "Como aplicar o plano de fundo claro",
        intro: "A alteração é feita nas opções de Personalização do sistema simulado.",
        steps: [
          "Abra o menu Iniciar e clique em Configurações.",
          "Na coluna esquerda das Configurações, entre em Personalização.",
          "Na seção Plano de fundo, observe as miniaturas disponíveis.",
          "Clique na terceira imagem, identificada como Windows 11 claro.",
        ],
        check: "Volte à Área de Trabalho e confira se o fundo claro do Windows 11 foi aplicado imediatamente.",
      },
      setup(ctx) { ctx.shell.setWallpaper("1"); ctx.shell.openSettings("personalization"); return { targetWallpaperId: "3" }; },
      validate(event, ctx) { return eventType(event, "wallpaper:changed") && event.detail.wallpaperId === ctx.scenario.targetWallpaperId ? ["wallpaper"] : ctx.completed(); },
    },
    {
      id: "adjust-volume", order: 10, title: "Diminuindo o volume da sala", categories: ["Primeiros passos", "Personalização"],
      description: "O som está alto. Ajuste-o para aproximadamente 20%.", concept: "Controle de recursos do sistema",
      objectives: [{ id: "volume", label: "Definir volume entre 18% e 22%, sem mudo" }],
      hint: {
        title: "Como ajustar o volume para 20%",
        intro: "Use as Configurações rápidas e mantenha o som ativo, apenas mais baixo.",
        steps: [
          "No canto inferior direito da barra de tarefas, clique no conjunto de ícones de rede, som e bateria.",
          "No painel de Configurações rápidas, encontre o controle deslizante de volume.",
          "Arraste o indicador para a esquerda até o valor ficar próximo de 20%.",
          "Se o ícone estiver marcado como mudo, clique nele para reativar o som sem alterar muito o valor.",
        ],
        check: "O volume deve ficar entre 18% e 22% e o estado Mudo precisa permanecer desativado.",
      },
      setup(ctx) { ctx.shell.setVolume(100, false); ctx.shell.notify("Som muito alto", "Diminua o volume da sala para 20%.", "warning"); return {}; },
      validate(event, ctx) { const audio = ctx.shell.getAudioState(); return eventType(event, "volume:changed") && audio.volume >= 18 && audio.volume <= 22 && !audio.muted ? ["volume"] : ctx.completed(); },
    },
    {
      id: "close-frozen-app", order: 11, title: "Fechando um programa travado", categories: ["Aplicativos", "Diagnóstico"],
      description: "Encerre um Editor de Texto que não está respondendo.", concept: "Diagnóstico e encerramento de processos",
      objectives: [{ id: "open", label: "Abrir o Gerenciador de Tarefas" }, { id: "locate", label: "Localizar o Editor de Texto" }, { id: "select", label: "Selecionar o processo" }, { id: "end", label: "Finalizar a tarefa" }],
      hint: {
        title: "Como encerrar somente o aplicativo travado",
        intro: "O Gerenciador de Tarefas mostra qual processo não responde e permite fechá-lo com segurança.",
        steps: [
          "Clique com o botão direito em uma área vazia da barra de tarefas e escolha Gerenciador de Tarefas.",
          "Na seção Processos, procure Editor de Texto e confirme que o status mostra Não respondendo.",
          "Clique uma vez na linha Editor de Texto para selecionar esse processo, sem escolher itens do sistema.",
          "Na barra superior, clique em Finalizar tarefa.",
          "Espere a janela travada desaparecer e confira se o processo também saiu da lista.",
        ],
        check: "A missão termina quando o Editor de Texto travado foi localizado, selecionado e encerrado pelo Gerenciador de Tarefas.",
      },
      setup(ctx) { const record = ctx.shell.openTextEditor({ missionId: ctx.id, title: "Editor de Texto", frozen: true }); return { windowId: record?.windowId || "texteditor", pid: record?.pid || null }; },
      validate(event, ctx) {
        if (eventType(event, "app:opened") && event.detail.appId === "taskmanager") ctx.fact("open", true);
        if (eventType(event, "process:located") && event.detail.pid === ctx.scenario.pid) ctx.fact("locate", true);
        if (eventType(event, "process:selected") && event.detail.pid === ctx.scenario.pid) ctx.fact("select", true);
        if (eventType(event, "process:ended")) {
          if (event.detail.pid === ctx.scenario.pid && event.detail.reason === "task-manager") ctx.fact("end", !ctx.shell.isWindowOpen(ctx.scenario.windowId));
          else if (event.detail.reason === "task-manager") ctx.mistake();
        }
        return ["open", "locate", "select", "end"].filter((id) => ctx.fact(id));
      },
    },
    {
      id: "organize-school", order: 12, title: "Organizando o computador da escola", categories: ["Arquivos e pastas", "Segurança", "Diagnóstico"],
      description: "Organize arquivos, volume, Lixeira e aplicativos em uma missão final.", concept: "Organização e administração integrada do sistema",
      objectives: [
        { id: "math", label: "Mover trabalho-matematica.pdf" }, { id: "computing", label: "Mover pesquisa-informatica.docx" },
        { id: "pictures", label: "Mover foto-passeio.jpg" }, { id: "volume", label: "Diminuir o volume para 20%" },
        { id: "recycle", label: "Esvaziar a Lixeira" }, { id: "app", label: "Fechar o aplicativo desnecessário" },
      ],
      hint: {
        title: "Roteiro para organizar o computador da escola",
        intro: "Conclua as tarefas por grupos: arquivos, recursos do sistema e limpeza final.",
        steps: [
          "Na Área de Trabalho, recorte exercicios-matematica.pdf e cole em Documentos/Escola/Matemática.",
          "Recorte trabalho-informatica.docx e cole em Documentos/Escola/Informática.",
          "Recorte foto-passeio.jpg e cole em Documentos/Escola/Imagens.",
          "Abra as Configurações rápidas e ajuste o volume para aproximadamente 20%, sem ativar o mudo.",
          "Abra a Lixeira e clique em Esvaziar Lixeira para remover os itens restantes.",
          "Feche a janela do Google que foi aberta pela missão e mantenha apenas os aplicativos necessários.",
        ],
        check: "Confira as três pastas, o volume entre 18% e 22%, a Lixeira vazia e o Google fechado.",
      },
      setup(ctx) {
        const school = folderPath(roots().documents, ["Escola"], ctx.id);
        const math = folderPath(school, ["Matemática"], ctx.id); const computing = folderPath(school, ["Informática"], ctx.id); const pictures = folderPath(school, ["Imagens"], ctx.id);
        const mathFile = missionItem(ctx.id, { parentId: roots().desktop, kind: "file", name: "trabalho-matematica.pdf", mime: "application/pdf" });
        const computingFile = missionItem(ctx.id, { parentId: roots().desktop, kind: "file", name: "pesquisa-informatica.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        const pictureFile = missionItem(ctx.id, { parentId: roots().desktop, kind: "file", name: "foto-passeio.jpg", mime: "image/jpeg" });
        const temp = missionItem(ctx.id, { parentId: roots().desktop, kind: "file", name: "temporario.tmp", mime: "application/octet-stream" }); OSLab.fileSystem.delete(temp.id);
        ctx.shell.setVolume(100, false); const app = ctx.shell.openApp("google", { missionId: ctx.id }); ctx.shell.refreshDesktop();
        return { math, computing, pictures, mathFile: mathFile.id, computingFile: computingFile.id, pictureFile: pictureFile.id, unnecessaryWindowId: app?.windowId || "google" };
      },
      validate(_event, ctx) {
        const ready = ctx.scenario.mathFile && ctx.scenario.computingFile && ctx.scenario.pictureFile
          && ctx.scenario.math && ctx.scenario.computing && ctx.scenario.pictures && ctx.scenario.unnecessaryWindowId;
        if (!ready) return ctx.completed();
        const audio = ctx.shell.getAudioState();
        return [
          item(ctx.scenario.mathFile)?.parentId === ctx.scenario.math && "math",
          item(ctx.scenario.computingFile)?.parentId === ctx.scenario.computing && "computing",
          item(ctx.scenario.pictureFile)?.parentId === ctx.scenario.pictures && "pictures",
          audio.volume >= 18 && audio.volume <= 22 && !audio.muted && "volume",
          OSLab.fileSystem.recycleItems().length === 0 && "recycle",
          !ctx.shell.isWindowOpen(ctx.scenario.unnecessaryWindowId) && "app",
        ].filter(Boolean);
      },
    },
  ];

  const presentation = {
    "open-first-app": { icon: "assets/learning/icons/apps.svg", difficulty: "Fácil" },
    "window-control": { icon: "assets/learning/icons/window.svg", difficulty: "Fácil" },
    "create-folder": { icon: "assets/learning/icons/folder_add.svg", difficulty: "Fácil" },
    "rename-document": { icon: "assets/learning/icons/rename.svg", difficulty: "Média" },
    "move-file": { icon: "assets/learning/icons/folder_arrow_right.svg", difficulty: "Média" },
    "copy-file": { icon: "assets/learning/icons/copy.svg", difficulty: "Média" },
    "restore-file": { icon: "assets/learning/icons/arrow_counterclockwise.svg", difficulty: "Média" },
    "search-file": { icon: "assets/learning/icons/folder_search.svg", difficulty: "Média" },
    "change-wallpaper": { icon: "assets/learning/icons/paint_brush.svg", difficulty: "Média" },
    "adjust-volume": { icon: "assets/learning/icons/speaker_2.svg", difficulty: "Média" },
    "close-frozen-app": { icon: "assets/learning/icons/window_wrench.svg", difficulty: "Desafio" },
    "organize-school": { icon: "assets/learning/icons/shield_checkmark.svg", difficulty: "Desafio" },
  };

  catalog.forEach((mission) => {
    Object.assign(mission, presentation[mission.id]);
    mission.instructions = mission.description;
    mission.requirements = mission.order === 1 ? [] : [catalog[mission.order - 2]?.id].filter(Boolean);
    mission.cleanup ||= () => {};
    mission.reset ||= () => {};
  });

  OSLab.missionCatalog = Object.freeze(catalog);
})(window);
