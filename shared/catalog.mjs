const basePowerIcon = (index) => ({ sheet: "base", index, columns: 5, rows: 4 });
const luckEventIcon = (index) => ({ sheet: "luck-event", index, columns: 5, rows: 2 });

export const mazePowers = [
  { id: "escudo", name: "Escudo digital", description: "Bloqueia a próxima captura do vírus.", icon: basePowerIcon(8) },
  { id: "turbo", name: "Botas turbo", description: "Você corre duas vezes mais rápido por 10 segundos.", icon: basePowerIcon(9) },
  { id: "antivirus", name: "Pulso antivírus", description: "Expulsa o vírus; ele reaparece longe depois.", icon: basePowerIcon(10) },
  { id: "vidente", name: "Olho vidente", description: "Mostra o caminho correto em verde por 5 segundos.", icon: basePowerIcon(11) },
  { id: "tempo", name: "Tempo extra", description: "Adiciona 15 segundos ao cronômetro.", icon: basePowerIcon(12) },
  { id: "congelar", name: "Congelamento", description: "Congela o vírus por 8 segundos.", icon: basePowerIcon(13) },
  { id: "teleporte", name: "Salto digital", description: "Teleporta você vários corredores na direção da saída.", icon: basePowerIcon(14) },
  { id: "invisibilidade", name: "Modo fantasma", description: "O vírus não consegue ver você por 8 segundos.", icon: basePowerIcon(15) },
  { id: "bussola", name: "Bússola do portal", description: "Aponta para a saída por 10 segundos.", icon: basePowerIcon(16) },
  { id: "lentidao", name: "Vírus lento", description: "Diminui a velocidade do vírus até o fim da partida.", icon: basePowerIcon(17) },
  { id: "dado-tempo", name: "Dado cronológico", description: "Sorteia um bônus de 10, 20 ou 30 segundos.", icon: luckEventIcon(0), lucky: true },
  { id: "salto-sorte", name: "Salto da sorte", description: "Avança de 12 a 30 corredores pelo caminho da saída.", icon: luckEventIcon(1), lucky: true },
  { id: "bau-duplicador", name: "Baú duplicador", description: "Espalha dois novos baús em locais seguros do labirinto.", icon: luckEventIcon(2), lucky: true },
  { id: "combo-surpresa", name: "Combo surpresa", description: "Ativa dois poderes favoráveis diferentes de uma só vez.", icon: luckEventIcon(3), lucky: true },
  { id: "trilha-premiada", name: "Trilha premiada", description: "Cria cinco bits; cada coleta acrescenta 2 segundos.", icon: luckEventIcon(4), lucky: true }
];

export const mazeEvents = [
  {
    id: "virus-multiplicado",
    name: "Multiplicação de vírus",
    description: "Três vírus extras entraram no labirinto por 15 segundos!",
    kind: "threat",
    duration: 15,
    icon: luckEventIcon(5)
  },
  {
    id: "chuva-meteoros",
    name: "Chuva de meteoros",
    description: "Saia das áreas marcadas: cada impacto tira 3 segundos.",
    kind: "threat",
    duration: 12,
    icon: luckEventIcon(6)
  },
  {
    id: "apagao-digital",
    name: "Apagão digital",
    description: "A luz do laboratório ficará reduzida por 12 segundos.",
    kind: "threat",
    duration: 12,
    icon: luckEventIcon(7)
  },
  {
    id: "chuva-baus",
    name: "Chuva de baús",
    description: "Dois novos baús apareceram em locais seguros.",
    kind: "help",
    duration: 2.5,
    icon: luckEventIcon(8)
  },
  {
    id: "onda-antivirus",
    name: "Onda antivírus",
    description: "Todos os vírus ficaram congelados por 10 segundos.",
    kind: "help",
    duration: 10,
    icon: luckEventIcon(9)
  }
];

