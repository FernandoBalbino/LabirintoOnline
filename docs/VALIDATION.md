# Validação

As verificações automatizadas incluem os testes de geração, colisão, cronômetro, desafios e recursos derivados do original, testes da arena e integração com 24 conexões Socket.IO reais.

O teste de carga cria professor e 24 alunos na mesma sala, movimenta personagens, responde perguntas, escolhe poderes, acompanha infecções e saídas e força reconexões. Reinicia partidas com novos lobbies quando uma rodada termina, mantendo carga por toda a duração solicitada. Ele usa as interfaces reais da aplicação, sem atalhos administrativos para conceder poderes ou resultados.

Relatórios efetivamente executados serão registrados nesta pasta; execuções interrompidas não contam como teste contínuo aprovado.

As métricas de CPU e memória são obtidas do processo do backend pela sessão autenticada de professor. Latência de mensagens é medida pelo cliente de carga; arquivos de evidência não contêm os tokens das salas.

## Execuções de 13 de outubro de 2026

- 41 testes de regras, mapas, banco, rede Node e predição concluídos antes do último ajuste visual do cliente.
- Cloudflare local: integração de 24 sessões, limite de vagas, permissões, duplicações e reconexão aprovada.
- Render, 10 alunos (5 por equipe): 241,8 segundos; todos se movimentaram, 42 respostas, 13 baús, 3 saídas, 5 reconexões provocadas, nenhuma desconexão inesperada. Mediana 379 ms, p95 4096 ms. Relatório `public-team-5-four-minutes.json`.
- Render, 24 alunos: 1801,5 segundos em oito rodadas, 90 erros. Mediana 924 ms, p95 10000 ms, tick máximo 1006 ms. Execução concluída, desempenho reprovado; relatório `load-public-24.json`.
- Cloudflare, 10 alunos (5 por equipe): 240,3 segundos, nenhuma falha. Mediana 187 ms, p95 647 ms; atraso adicional de cadência p95 5,2 ms. Relatório `cloudflare-team-5-four-minutes.json`. CPU e memória não são expostas pelo aplicativo Cloudflare e constam como indisponíveis.
- Comparação local da busca de caminhos dos vírus: 24 alvos, 100 buscas; redução de 97,2% no tempo de processamento. Essa medição local não representa a latência de rede; relatório `routing-benchmark.json`.

Professor e aluno acessaram o GitHub Pages em navegadores separados. Os exercícios práticos do navegador foram operados pela interface, incluindo pesquisar Netflix, abrir o primeiro resultado e confirmar a resposta. Foram registradas telas em 1366×768, 1920×1080 e 390×844.

O usuário solicitou interromper novos testes e publicar somente a correção do cliente. Não foi executada a repetição de 30 minutos no Cloudflare nem uma rodada de testes de interface após a última correção visual. A publicação utiliza o workflow normal do repositório. As evidências anteriores permanecem registradas sem tratá-las como aprovação integral da versão final.
