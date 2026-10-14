# Labirinto da Informática — Arena Online

Evolução multiplayer do jogo original do [CentralJogos](https://github.com/FernandoBalbino/CentralJogos), preservado a partir de `e1db29efa16b865e2e3087de2c2502b73c826270`.

- Jogo: https://fernandobalbino.github.io/LabirintoOnline/
- Backend ativo e saúde: https://labirinto-online.dev-fernandobalbino.workers.dev/health
- Até 24 alunos e professor sem ocupar vaga; 2, 3 ou 4 equipes.
- 60 desafios (36 originais, 16 de navegador e 8 novos de hardware), 15 poderes preservados, 10 sabotagens e cinco eventos aleatórios.
- Infecção em cadeia, baús individuais, placar ao vivo, espectador e reconexão.

## Rodar localmente

Use Node.js 24 e pnpm 11.25.0:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Abra `http://localhost:3000`. O servidor também serve o frontend para desenvolvimento. A configuração local usa a origem do navegador. Para testar sessões independentes, use navegadores ou perfis distintos; o token de sessão fica no armazenamento do navegador.

```sh
pnpm test
pnpm check
pnpm load -- --url http://localhost:3000 --seconds 1800
```

O programa usa variáveis do processo. Para carregar `.env` localmente: `node --env-file=.env server/index.mjs`. Copie `.env.example` e mantenha o arquivo real fora do Git.

## Como jogar

O professor escolhe **INICIAR MISSÃO → SOU PROFESSOR**, cria a sala e divulga o código. Alunos entram por **SOU ALUNO**, informam nome e código e aguardam o início. Não há conta nem e-mail.

Setas/WASD ou botões direcionais movimentam o personagem. O cronômetro é individual. Ao zerar, um desafio pausa apenas aquele aluno. Acertos consecutivos concedem 20, 30, 40, 50 segundos e continuam aumentando segundo o original. Erros zeram a sequência. O professor pode liberar 30 segundos pelo painel.

Cada aluno tem 16 baús pessoais. Um baú oferece quatro poderes, com 15 segundos para escolher; o primeiro é aplicado se o prazo acabar. Infectados controlam um vírus, sem perguntas, baús ou poderes. Quem encontra a saída acompanha a partida como espectador; clicar no mapa alterna o personagem acompanhado.

## Regras e recuperação

- Entradas de equipes ficam em extremidades distintas, com percursos iniciais equilibrados por distância real; exploradores podem passar uns pelos outros para evitar congestionamento.
- Questões protegem o aluno por 90 segundos. Erros não renovam a proteção; o prazo esgotado registra erro e permite continuar tentando sem proteção. O retorno correto leva 700 ms, como no original.
- Uma queda de conexão congela personagem e cronômetro, consumindo até dois minutos acumulados de proteção por aluno na partida. Depois o personagem fica vulnerável. Efeitos temporários seguem o relógio compartilhado.
- Infecção mantém a posição, é permanente e conserva a equipe de origem para pontuação. Um novo vírus espera um segundo para infectar.
- Congelamento de sabotagem protege contra infecção. Repetições renovam duração sem multiplicar intensidade; turbo ×2 e lentidão ×0,5 combinam.
- Escudo bloqueia captura, pulso imobiliza vírus humanos por 4,5 s, congelamento por 8 s, e Vírus lento reduz velocidade com piso de 72 pixels/s. NPCs preservam perseguição e sprites originais. Modo fantasma oculta o explorador dos vírus.
- Teleporte punitivo usa BFS: nunca reduz a distância à saída, exige pelo menos 60% da maior distância alcançável, evita ocupações e vírus e é cancelado se não houver destino seguro. Saltos benéficos continuam avançando pelo caminho da saída.
- Vence a equipe com mais salvos. Empate: quem atingiu aquela pontuação primeiro. Sem salvos e todos infectados, ou tempo geral esgotado, vencem os vírus. O primeiro escape não encerra a partida, exceto quando já define uma vitória impossível de superar ou empatar.
- Encerramento manual sem salvos cancela a partida, sem vencedor.

No Cloudflare, cada sala usa um Durable Object com armazenamento SQLite persistente. Checkpoints são feitos a cada dois segundos e em eventos críticos, com expiração após duas horas sem participantes conectados. Após recuperação, o professor reconecta e escolhe **RETOMAR PARTIDA RECUPERADA**. O relógio fica congelado durante a indisponibilidade. Movimentos desde o último checkpoint podem retroceder até dois segundos.

O plano gratuito do Cloudflare tem cotas diárias. Os limites atuais incluem 100 mil solicitações equivalentes e 13 mil GB-s de Durable Objects por dia, e 5 GB de armazenamento. Mensagens WebSocket recebidas usam proporção 20:1 para a cota de solicitações; mensagens enviadas não são cobradas como solicitações. Ao esgotar uma cota gratuita, as operações falham até a renovação. A simulação ativa impede hibernação; a sala para quando não há conexões. Não existe garantia de atraso zero ou disponibilidade contínua. [Limites oficiais](https://developers.cloudflare.com/durable-objects/platform/pricing/).

O backend Render anterior continua disponível para referência, com sua persistência Redis opcional. O Key Value gratuito do Render perde dados se reiniciar; não é a persistência utilizada pelo backend Cloudflare ativo. [Limitações do Render](https://render.com/docs/free).

O cache offline guarda somente os recursos estáticos. Participar da arena exige conexão. A tela inicial pode abrir sem rede, mas criar/entrar em uma sala depende do backend.

## GitHub Pages

O workflow `.github/workflows/pages.yml` testa, verifica os recursos, prepara `dist/` e publica com GitHub Actions. Em Settings → Pages, selecione GitHub Actions. Configure a variável de repositório `PUBLIC_SERVER_URL` se a URL do backend mudar. A raiz publicada contém somente frontend e módulos compartilhados; o banco com soluções fica em `server/` e não é publicado no Pages.

## Render

O `render.yaml` descreve um Web Service e um Key Value gratuitos em Virginia. O servidor usa `PORT` e `/health`. Instalação: `corepack pnpm install --frozen-lockfile`; início: `node server/index.mjs`. O comando direto evita alterar os executáveis protegidos do ambiente Render.

Variáveis: `CLIENT_ORIGIN=https://fernandobalbino.github.io`, `REDIS_URL` com a conexão privada do Key Value, `TICK_RATE=20`, `SNAPSHOT_RATE=10`. Tokens são aleatórios por sala/aluno, armazenados como hashes no servidor; não existe senha fixa nem segredo administrativo no build estático.

O novo repositório público não está entre os repositórios autorizados no aplicativo GitHub do Render. Por isso, o Auto-Deploy do serviço fica desativado e atualizações do backend são publicadas pelo controle de deploy do Render. O frontend continua sendo publicado automaticamente pelo GitHub Actions. Essa configuração evita guardar credenciais adicionais no GitHub.

Para publicação manual, importe o repositório e aplique o Blueprint, ou use Manual Deploy no serviço. Nunca coloque conexões privadas ou tokens no Git. Atualizações do frontend e do backend podem ser publicadas separadamente.

## Cloudflare gratuito

`wrangler.jsonc` declara o Worker `labirinto-online` e uma classe de Durable Object com SQLite. Não requer Key Value, plano pago ou mudança do visual. Depois de autenticar sua conta com o Wrangler:

```sh
pnpm exec wrangler dev
pnpm exec wrangler deploy
```

O frontend permanece no GitHub Pages; `PUBLIC_SERVER_URL` aponta para o Worker. O transporte Cloudflare usa WebSocket nativo com o mesmo protocolo de ações confirmadas da aplicação. O adaptador Socket.IO continua disponível para Node/Render. Uma migração entre provedores exige criar novas salas; os tokens existentes ficam vinculados ao backend que os emitiu.

O cálculo dos caminhos dos vírus compartilha uma BFS entre todos os alvos. O cliente reaplica comandos ainda não confirmados após uma atualização autoritativa, respeitando paredes e teleporte. Teleportes de poderes continuam intencionais e agora mostram aviso.

## Arquitetura

`client/`: composição, CSS, sprites, renderizador Canvas e gerenciador de desafios reutilizados, acrescidos da conexão, lobby, efeitos, predição e interpolação. `shared/`: geração, movimento, colisão, transporte e catálogos públicos. `server/`: salas autoritativas, banco privado, teleporte, poderes, vitória, autenticação e persistência Node. `cloudflare/`: execução dessas mesmas salas no Worker/Durable Objects.

Os comandos críticos recebem `requestId` e confirmação; repetições retornam o mesmo resultado. Movimentos usam sequência e direção, não coordenadas. Snapshots completos enviam o mapa na entrada/início/reconexão; atualizações usam deltas compactos. Respostas e baús pertencem somente ao destinatário. Operações administrativas validam a sessão de professor.

Consulte [validação](docs/VALIDATION.md) e [checklist da aula](docs/CLASSROOM.md). Créditos completos em [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
