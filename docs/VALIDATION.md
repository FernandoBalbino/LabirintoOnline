# Validação

As verificações automatizadas incluem os testes de geração, colisão, cronômetro, desafios e recursos derivados do original, testes da arena e integração com 24 conexões Socket.IO reais.

O teste de carga cria professor e 24 alunos na mesma sala, movimenta personagens, responde perguntas, escolhe poderes, acompanha infecções e saídas e força reconexões. Reinicia partidas com novos lobbies quando uma rodada termina, mantendo carga por toda a duração solicitada. Ele usa as interfaces reais da aplicação, sem atalhos administrativos para conceder poderes ou resultados.

Relatórios efetivamente executados serão registrados nesta pasta; execuções interrompidas não contam como teste contínuo aprovado.

As métricas de CPU e memória são obtidas do processo do backend pela sessão autenticada de professor. Latência de mensagens é medida pelo cliente de carga; arquivos de evidência não contêm os tokens das salas.
