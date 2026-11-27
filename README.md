# Labirinto da Informática — Arena Online

Arena multiplayer em tempo real para até 24 alunos (2 a 4 equipes) e o professor. As regras, os 15 poderes, as 10 sabotagens, os 5 eventos, a infecção e o visual são os do labirinto original do [CentralJogos](https://github.com/FernandoBalbino/CentralJogos).

- Jogo: https://fernandobalbino.github.io/LabirintoOnline/
- Servidor (saúde): https://labirinto-online.onrender.com/health
- Checklist da aula: [docs/CLASSROOM.md](docs/CLASSROOM.md)

## Novidades da versão 2

- **Movimento em tempo real.** Cada aluno move o próprio personagem na hora (física idêntica à do servidor). O servidor valida cada posição (velocidade, paredes e alcance) e repassa na hora apenas a mudança de direção para quem consegue ver aquele aluno. Os colegas são **extrapolados com o relógio sincronizado**: o boneco do colega aparece onde ele está agora, sem fila de interpolação.
- **77 desafios**: 26 clássicos, 27 de **hardware** (montar peças na placa-mãe arrastando, ordenar passos, classificar entrada/saída, armazenamento) e 24 **tarefas práticas no Windows do OSLab** (criar/renomear/mover/copiar arquivos, Lixeira, papel de parede, modo escuro, volume, Wi-Fi, modo avião, Gerenciador de Tarefas, Terminal com `ipconfig`…). O OSLab roda dentro do jogo e o resultado é conferido no estado real do sistema.
- **Gerador de labirinto novo** (growing tree + atalhos): corredores longos, rotas de fuga e entradas das equipes com distância real até a saída equilibrada (diferença máxima de 4–12%).
- **Física com "quina assistida"** e centralização nos corredores: virar esquinas não trava mais.
- **Mapa ao vivo para o professor** (minimapa de toda a arena, com tela cheia para a TV).
- Imagens otimizadas: sprites de 5,2 MB → 0,4 MB; papéis de parede do OSLab de 14 MB → 0,7 MB.

## Arquitetura

| Pasta | Conteúdo |
| --- | --- |
| `shared/` | Física determinística, gerador de labirinto, RNG e catálogo (usados no navegador e no servidor) |
| `server/` | `index.mjs` (HTTP + WebSocket com `ws`), `room.mjs` (sala autoritativa), `powers.mjs`, `bank.mjs` (desafios com respostas, só no servidor) |
| `client/` | Interface, renderizador Canvas com cache em blocos, desafios e `oslab/` (cópia do OSLab com modo embutido) |
| `scripts/` | `build.mjs` (GitHub Pages), `bots.mjs` e `load.mjs` (teste de carga) |
| `tests/` | Regras, física, banco de desafios e teste de rede de ponta a ponta |

### Protocolo de movimento

- Aluno → servidor: `[seq, x, y, dirX, dirY, tv]` quando a direção muda e a cada 300 ms enquanto anda.
- Servidor → alunos: lotes `[1, horárioDoServidor, id, x, y, dirX, dirY, velocidade, flags, limite, …]` a até 30 Hz, só para quem pode ver o personagem (área de interesse do tamanho da tela). Vírus enviam o `limite` até a próxima curva.
- `tv` é a versão de teletransporte: perguntas, baús, teleportes e congelamentos incrementam o valor e descartam movimentos antigos.

### Limites do plano gratuito do Render

0,1 CPU, 512 MB, 750 horas/mês por conta, **5 GB/mês de banda de saída** e o serviço dorme após 15 minutos sem uso (acorda em ~1 minuto). Por isso:

- o site e o OSLab ficam no **GitHub Pages**; o Render só transporta mensagens do jogo;
- estado da sala no máximo 1×/s, listas compactas para os alunos e âncoras só quando algo muda;
- teste com 23 robôs bem agitados (`scripts/load.mjs`): ~5% de um núcleo em JavaScript, 74 MB de memória, ~95 MB de banda por hora de aula e nenhuma correção de posição.

## Rodar localmente

Requer Node.js 22 ou mais novo.

```sh
npm install
npm start          # http://localhost:3000
npm test
```

Para testar vários alunos no mesmo computador, abra abas com `?perfil=ana`, `?perfil=bia`… (cada perfil guarda a própria sessão). Teste de carga:

```sh
LAB_DEBUG=1 npm start
node scripts/load.mjs --bots 23 --seconds 90
```

`LAB_DEBUG=1` habilita comandos de teste (aproximar alunos, forçar desafios) — nunca use em produção.

## Publicação

- **GitHub Pages**: o workflow `.github/workflows/pages.yml` roda os testes, monta `dist/` (`npm run build`) e publica. A variável de repositório `PUBLIC_SERVER_URL` define o servidor.
- **Render**: Web Service gratuito em Virginia (`render.yaml`), `npm ci --omit=dev` e `node server/index.mjs`, com `ALLOWED_ORIGINS=https://fernandobalbino.github.io` e `SERVE_STATIC=0`. Deploy automático a cada push na `main`.

As salas ficam na memória do servidor: se o Render reiniciar, crie uma sala nova. Créditos completos em [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
