// Estrutura visual do jogo original (tela inicial e área de jogo), com ajustes do modo online.
export const hero = `
  <section class="maze-start-screen" aria-labelledby="maze-start-title">
    <div class="maze-start-art" aria-hidden="true">
      <span class="maze-art-wall wall-a"></span><span class="maze-art-wall wall-b"></span><span class="maze-art-wall wall-c"></span>
      <span class="maze-start-character"></span><span class="maze-start-exit"></span><span class="maze-start-path"></span>
    </div>
    <div class="maze-start-copy">
      <span class="maze-kicker">Arena multiplayer • Missão de informática</span>
      <h1 id="maze-start-title">LABIRINTO DA<br><em>INFORMÁTICA</em></h1>
      <p>Sua equipe precisa encontrar a saída antes dos vírus. Quando o cronômetro zerar, resolva um desafio de hardware ou faça uma tarefa de verdade no Windows do OSLab para continuar.</p>
      <div class="maze-streak-explainer" aria-label="Tempo ganho por acertos consecutivos">
        <span><b>1º</b><strong>20s</strong></span><i>→</i><span><b>2º seguido</b><strong>30s</strong></span><i>→</i><span><b>3º</b><strong>40s</strong></span><i>→</i><span><b>4º</b><strong>50s</strong></span>
      </div>
      <button type="button" class="maze-primary-button" data-action="roles">INICIAR MISSÃO <span aria-hidden="true">→</span></button>
      <div class="maze-start-controls"><span>⌨️ Setas ou WASD para andar</span><span>Até 24 alunos, 2 a 4 equipes</span><button type="button" data-action="sound">🔊 Som ligado</button></div>
    </div>
  </section>`;

export const gameShell = `
  <div class="maze-game-shell">
    <header class="maze-game-topbar">
      <div class="maze-game-brand"><span class="maze-brand-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span><strong>Labirinto da Informática</strong><small>Arena em tempo real</small></span></div>
      <div class="maze-game-tools"><span class="lag-pill" data-lag title="Tempo de ida e volta até o servidor">— ms</span><button type="button" data-maze-action="toggle-sound">🔊 Som ligado</button><button type="button" data-maze-action="fullscreen">⛶ Tela cheia</button></div>
    </header>
    <main class="maze-play-layout">
      <section class="maze-viewport" aria-label="Labirinto jogável">
        <canvas class="maze-canvas" aria-label="Labirinto. Use as setas do teclado para mover o personagem até a saída."></canvas>
        <div class="maze-location-chip"><span aria-hidden="true">⌖</span><strong>LABORATÓRIO DIGITAL</strong></div>
        <div class="online-effect-badge" hidden></div>
        <ul class="game-feed" data-feed aria-live="polite"></ul>
        <div class="maze-power-layer" hidden></div>
        <div class="maze-power-toast" role="status" aria-live="polite" hidden></div>
        <div class="maze-event-banner" role="status" aria-live="polite" hidden></div>
        <div class="maze-dpad" aria-label="Controles de movimento">
          <button type="button" data-direction="up" aria-label="Mover para cima">▲</button>
          <button type="button" data-direction="left" aria-label="Mover para esquerda">◀</button>
          <button type="button" data-direction="down" aria-label="Mover para baixo">▼</button>
          <button type="button" data-direction="right" aria-label="Mover para direita">▶</button>
        </div>
      </section>
      <aside class="maze-hud" aria-label="Informações da missão">
        <div class="maze-hud-objective"><span>OBJETIVO</span><strong>Encontre a saída!</strong><p>Explore os corredores e fuja dos vírus.</p></div>
        <div class="maze-time-card"><span>Tempo para explorar</span><strong data-maze-time>00:20</strong><div class="maze-time-track"><i data-maze-time-bar></i></div></div>
        <div class="maze-streak-card"><span>Sequência de acertos</span><strong><b aria-hidden="true">🔥</b> <i data-maze-streak>0</i></strong><p data-maze-next>Próximo acerto: 20s</p></div>
        <div class="maze-power-status-card"><span>PODERES E AMEAÇAS</span><strong data-maze-virus-status>Vírus à espreita</strong><p data-maze-power-status>Nenhum poder ativo.</p></div>
        <div class="maze-status-card" aria-live="polite"><span class="maze-status-dot"></span><strong data-maze-status>Explorando</strong><small data-maze-status-detail>O relógio é individual.</small></div>
        <div class="live-score" data-score></div>
        <button type="button" class="hud-leave" data-maze-action="leave">Sair da partida</button>
      </aside>
    </main>
    <div class="maze-challenge-layer" hidden><div class="maze-challenge-host"></div></div>
  </div>`;
