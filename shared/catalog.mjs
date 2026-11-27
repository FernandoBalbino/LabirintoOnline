// Catálogo público: equipes, poderes, sabotagens e eventos (mesmas regras do jogo original).
const baseIcon = (index) => ({ sheet: "base", index, columns: 5, rows: 4 });
const luckIcon = (index) => ({ sheet: "luck", index, columns: 5, rows: 2 });
const onlineIcon = (index) => ({ sheet: "online", index, columns: 5, rows: 2 });

export const TEAMS = [
  { id: "azul", name: "Azul", color: "#49aaff", symbol: "◆" },
  { id: "vermelha", name: "Vermelha", color: "#ff647b", symbol: "▲" },
  { id: "verde", name: "Verde", color: "#6ee69c", symbol: "●" },
  { id: "amarela", name: "Amarela", color: "#ffd960", symbol: "■" },
];

export const POWERS = [
  { id: "escudo", name: "Escudo digital", description: "Bloqueia a próxima captura do vírus.", icon: baseIcon(8) },
  { id: "turbo", name: "Botas turbo", description: "Você corre duas vezes mais rápido por 10 segundos.", icon: baseIcon(9) },
  { id: "antivirus", name: "Pulso antivírus", description: "Expulsa o vírus; ele reaparece longe depois.", icon: baseIcon(10) },
  { id: "vidente", name: "Olho vidente", description: "Mostra o caminho correto em verde por 5 segundos.", icon: baseIcon(11) },
  { id: "tempo", name: "Tempo extra", description: "Adiciona 15 segundos ao cronômetro.", icon: baseIcon(12) },
  { id: "congelar", name: "Congelamento", description: "Congela o vírus por 8 segundos.", icon: baseIcon(13) },
  { id: "teleporte", name: "Salto digital", description: "Teleporta você vários corredores na direção da saída.", icon: baseIcon(14) },
  { id: "invisibilidade", name: "Modo fantasma", description: "O vírus não consegue ver você por 8 segundos.", icon: baseIcon(15) },
  { id: "bussola", name: "Bússola do portal", description: "Aponta para a saída por 10 segundos.", icon: baseIcon(16) },
  { id: "lentidao", name: "Vírus lento", description: "Diminui a velocidade do vírus até o fim da partida.", icon: baseIcon(17) },
  { id: "dado-tempo", name: "Dado cronológico", description: "Sorteia um bônus de 10, 20 ou 30 segundos.", icon: luckIcon(0), lucky: true },
  { id: "salto-sorte", name: "Salto da sorte", description: "Avança de 12 a 30 corredores pelo caminho da saída.", icon: luckIcon(1), lucky: true },
  { id: "bau-duplicador", name: "Baú duplicador", description: "Espalha dois novos baús em locais seguros do labirinto.", icon: luckIcon(2), lucky: true },
  { id: "combo-surpresa", name: "Combo surpresa", description: "Ativa dois poderes favoráveis diferentes de uma só vez.", icon: luckIcon(3), lucky: true },
  { id: "trilha-premiada", name: "Trilha premiada", description: "Cria cinco bits; cada coleta acrescenta 2 segundos.", icon: luckIcon(4), lucky: true },
  { id: "inverter", name: "Controles invertidos", description: "Inverte os comandos dos exploradores adversários por 8 segundos.", icon: onlineIcon(0), sabotage: true },
  { id: "apagao", name: "Apagão total", description: "Reduz a visão dos adversários por 6 segundos.", icon: onlineIcon(1), sabotage: true },
  { id: "caos", name: "Teletransporte do caos", description: "Envia adversários a regiões seguras, distantes da saída.", icon: onlineIcon(2), sabotage: true },
  { id: "congelamento-coletivo", name: "Congelamento coletivo", description: "Imobiliza adversários por 4 segundos, protegendo-os dos vírus.", icon: onlineIcon(3), sabotage: true },
  { id: "saida-falsa", name: "Saída falsa", description: "Cria uma armadilha de portal por 15 segundos.", icon: onlineIcon(4), sabotage: true },
  { id: "maldicao", name: "Maldição da lentidão", description: "Reduz a velocidade dos adversários pela metade por 10 segundos.", icon: onlineIcon(5), sabotage: true },
  { id: "muralha", name: "Muralha surpresa", description: "Cria obstáculos seguros para os adversários por 12 segundos.", icon: onlineIcon(6), sabotage: true },
  { id: "separacao", name: "Separação forçada", description: "Separa grupos adversários sem aproximá-los da saída.", icon: onlineIcon(7), sabotage: true },
  { id: "fantasma", name: "Labirinto fantasma", description: "Confunde adversários com paredes atravessáveis por 10 segundos.", icon: onlineIcon(8), sabotage: true },
  { id: "troca", name: "Troca de corpos", description: "Troca posições adversárias ou usa destinos punitivos seguros.", icon: onlineIcon(9), sabotage: true },
];
export const POWER_BY_ID = new Map(POWERS.map((power) => [power.id, power]));

export const EVENTS = [
  { id: "virus-multiplicado", name: "Multiplicação de vírus", description: "Três vírus extras entraram no labirinto por 15 segundos!", kind: "threat", duration: 15, icon: luckIcon(5) },
  { id: "chuva-meteoros", name: "Chuva de meteoros", description: "Saia das áreas marcadas: cada impacto tira 3 segundos.", kind: "threat", duration: 12, icon: luckIcon(6) },
  { id: "apagao-digital", name: "Apagão digital", description: "A luz do laboratório ficará reduzida por 12 segundos.", kind: "threat", duration: 12, icon: luckIcon(7) },
  { id: "chuva-baus", name: "Chuva de baús", description: "Dois novos baús apareceram em locais seguros.", kind: "help", duration: 2.5, icon: luckIcon(8) },
  { id: "onda-antivirus", name: "Onda antivírus", description: "Todos os vírus ficaram congelados por 10 segundos.", kind: "help", duration: 10, icon: luckIcon(9) },
];
export const EVENT_BY_ID = new Map(EVENTS.map((event) => [event.id, event]));

export const STATE_LABELS = {
  EXPLORING: "Explorando",
  ANSWERING: "Respondendo desafio",
  INFECTED: "Infectado",
  ESCAPED: "Escapou",
};

export const EFFECT_LABELS = {
  invertUntil: "Controles invertidos",
  blackoutUntil: "Apagão",
  freezeUntil: "Congelado",
  slowUntil: "Lentidão",
  phantomUntil: "Paredes fantasmas",
  speedUntil: "Botas turbo",
  stunUntil: "Vírus imobilizado",
  invisibleUntil: "Modo fantasma",
  seerUntil: "Olho vidente",
  compassUntil: "Bússola",
};

export const DEFAULT_CONFIG = {
  name: "Turma de informática",
  maxPlayers: 24,
  teamCount: 2,
  mapSize: "auto",
  width: 69,
  height: 51,
  powers: true,
  controlledViruses: true,
  oslab: true,
  timeLimit: 0,
  allowJoin: true,
};

export const ATLAS_FILES = {
  base: "./assets/maze-game/virus-power-atlas.webp",
  luck: "./assets/maze-game/maze-luck-event-atlas.webp",
  online: "./assets/maze-game/online-powers-atlas.svg",
};
