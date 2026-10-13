# Atribuições dos recursos visuais

## Recursos novos do LabirintoOnline

- Bandeiras, atlas dos dez poderes online e vírus controlável: desenhos SVG originais em pixel art, construídos para este projeto em `scripts/sprites.mjs`. Manifesto em `client/assets/maze-game/online-sprites.json`. Podem ser redistribuídos com o projeto.
- Os atlas, fontes, recursos e sons do Labirinto da Informática original foram preservados. Base: CentralJogos, commit `e1db29efa16b865e2e3087de2c2502b73c826270`.

Todos os recursos usados pelo site são armazenados localmente. Este arquivo complementa os créditos exibidos na interface.

## Balcão da Informática

- Os 17 produtos reutilizam imagens locais de `assets/items/`, sem alterações nos arquivos originais; as fontes, autores e licenças já registrados em `js/credits-data.js` permanecem válidos. O mapeamento completo está em `docs/balcao-da-informatica.md`.
- Loja, personagens, balcão e sacola são formas originais feitas em HTML/CSS para o CentralJogos. Não foram usadas fotografias de clientes nem novas imagens externas. As fontes locais Atkinson Hyperlegible e Fredoka mantêm seus créditos existentes.

## Labirinto da Informática

- **Personagem em pixel art** — imagem original gerada para este projeto com OpenAI ImageGen e armazenada em `assets/maze-game/player-sprites.png`.
- **Objetos do laboratório em pixel art** — imagem original gerada para este projeto com OpenAI ImageGen e armazenada em `assets/maze-game/lab-props.png`.
- **Vírus, baús e poderes em pixel art** — atlas original gerado para este projeto com OpenAI ImageGen e armazenado em `assets/maze-game/virus-power-atlas.png`.
- **Poderes de sorte e eventos em pixel art** — atlas original gerado para este projeto com OpenAI ImageGen e armazenado em `assets/maze-game/maze-luck-event-atlas.png`.
- **Animação de meteoros em pixel art** — sequência original de quatro quadros gerada para este projeto com OpenAI ImageGen e armazenada em `assets/maze-game/maze-meteor-sprites.png`.

## Técnico em Ação 3D e modo offline

- **Three.js 0.185.1** — Copyright © 2010-2026 three.js authors — licença MIT. A cópia usada pelo site está em `vendor/three/` e a licença completa em `vendor/three/LICENSE.txt`.
- **Fredoka** — fonte distribuída pela Google Fonts sob SIL Open Font License 1.1. Licença em `assets/fonts/OFL-Fredoka.txt`.
- **Atkinson Hyperlegible** — fonte distribuída pela Google Fonts sob SIL Open Font License 1.1. Licença em `assets/fonts/OFL-Atkinson-Hyperlegible.txt`.
- **Ilustração Técnico em Ação 3D** — imagem original gerada para este projeto e armazenada localmente em `assets/windows-mission/tecnico-em-acao-card.png`.

## Descubra o Windows

- **Cenas e vídeos educativos** — as cinco cenas limpas do Windows 11, os pôsteres e os 30 vídeos WebM VP9 foram produzidos localmente para este projeto, sem download de vídeos de terceiros. Os arquivos estão em `assets/windows-discovery/`.
- **Cursor do Windows** — a imagem do cursor usada durante a produção dos vídeos foi extraída da instalação local do Windows exclusivamente para representar a interação do sistema na atividade educativa.
- **Ícones da interface** — o jogo reutiliza os Material Design Icons locais já atribuídos abaixo.

## Organize o Windows — Arquivos e Extensões

- **Microsoft Word, Excel e PowerPoint (2019–2025)** — ícones oficiais da Microsoft Corporation, obtidos por meio das páginas de arquivo do Wikimedia Commons e armazenados sem alteração em `assets/windows-file-organizer/icons/`. Os arquivos são identificados como logotipos simples de domínio público, sujeitos a direitos de marca.
- **Adobe PDF** — ícone de arquivo PDF associado ao Adobe Reader, autoria atribuída a Adobe Systems/CMetalCore na página do arquivo no Wikimedia Commons, armazenado localmente como `pdf.svg`.
- **Google Chrome** — ícone oficial de 2022 disponibilizado pelo Google em `google.com/chrome/static/images/chrome-logo.svg` e copiado localmente sem alteração.
- **Discord** — símbolo Clyde na cor oficial Blurple `#5865F2`, mantido sem distorção ou recoloração e armazenado localmente como `discord.svg`.
- **Minecraft Launcher** — ícone oficial do Launcher com rosto de Creeper, obtido de `minecraft.net` e armazenado localmente como `minecraft-launcher.png`.
- **TXT, JPG, PNG, MP4, MP3, ZIP, programa e pasta** — ícones vetoriais originais criados para esta atividade.
- **Demonstrações educativas** — os vídeos WebM e pôsteres WebP de arrastar e de abrir Propriedades foram produzidos localmente pelo script `scripts/create-windows-file-organizer-media.ps1`.

Microsoft, Adobe, Google Chrome, Discord e Minecraft são marcas de seus respectivos titulares. Os ícones aparecem somente para identificar funcionalmente os tipos e aplicativos citados em contexto educacional. Este projeto não é oficial, patrocinado ou endossado por essas empresas.

## Acervo original do CentralJogos

As 40 fotografias e marcas que já faziam parte dos jogos Classificação e Forca continuam documentadas individualmente em `js/credits-data.js`, com fonte, autoria, título e licença. Os arquivos correspondentes permanecem em `assets/items/`.

## Material Design Icons

Os ícones de interface e os ícones conceituais do jogo Escolha seu lado foram obtidos do pacote `@material-design-icons/svg` 0.14.13, variante `round`, e armazenados em `assets/side-game/icons/`.

- Projeto: Material Design Icons, Google
- Fonte: https://github.com/google/material-design-icons
- Documentação: https://developers.google.com/fonts/docs/material_symbols
- Licença: Apache License 2.0
- Uso: controles, setas e representações educacionais de conceitos e novos periféricos

## Simple Icons

Os logotipos Linux e Android foram obtidos do projeto Simple Icons e armazenados em `assets/side-game/brands/`.

- Projeto: Simple Icons
- Fonte: https://github.com/simple-icons/simple-icons
- Licença do projeto: CC0 1.0
- Observação: nomes e marcas pertencem aos respectivos titulares e são usados somente para identificação em contexto educacional.

## Reprodução local

O script `scripts/download-side-game-assets.ps1` registra as versões e endereços usados para baixar novamente os ícones. Execute-o somente quando for necessário reconstruir o acervo local.

## Oficina do PC — montagem e manutenção 3D

- **Modelos procedurais originais:** gabinete, placa-mãe, CPU, cooler, RAM, HD, SSD SATA, GPU, fonte, bancada, monitor, teclado, mouse, tomada e plugues foram construídos especificamente para o CentralJogos em `js/oficina-pc-models.mjs`. Os cabos são curvas procedurais da cena. Usam formas genéricas, sem marcas, texturas ou modelos externos. Autoria: projeto CentralJogos, implementação assistida por Codex. Redistribuição junto com o código do projeto.
- **Prévia do card:** `assets/oficina-pc/oficina-pc-preview.jpg` é uma captura da própria cena da Oficina, com a mesma autoria dos modelos.
- **OrbitControls r185:** three.js authors, MIT, obtido de `https://github.com/mrdoob/three.js/blob/r185/examples/jsm/controls/OrbitControls.js`. A alteração local troca apenas o import `three` por `../three.module.min.js`. Coberto por `vendor/three/LICENSE.txt`, junto com Three.js 0.185.1.
- **Fontes e cores:** reutilizam os recursos locais já presentes na CentralJogos; as atribuições existentes de Atkinson Hyperlegible e Fredoka permanecem válidas.
- **Áudio:** cliques, encaixes e ruído de ventoinha são sintetizados pela Web Audio API; não há gravações externas.

A pesquisa considerou o [Furniture Kit de Kenney](https://kenney.nl/assets/furniture-kit), CC0, e o [CPU/cooler de GAMICO no Sketchfab](https://sketchfab.com/3d-models/cpu-processor-cpu-cooler-detailed-3d-model-f50555aedd2f455fa433cb3e135099dd), indicado como CC BY 4.0 e com download exigindo login. Não foi validado um conjunto completo de componentes para esta versão. Esses recursos não foram incorporados; as referências registram a pesquisa. Detalhes em `assets/oficina-pc/SOURCES.md`.

## Ilustrações do Ache os Pares

As representações de topologias, protocolos, serviços de rede, segurança e malware em `assets/memory-game/tech-illustrations.svg` foram desenhadas especificamente para este projeto com formas vetoriais originais. Não utilizam imagens externas e podem ser redistribuídas junto com o código do CentralJogos.

O novo jogo também reutiliza fotografias, marcas e ícones que já estavam armazenados localmente em `assets/items/`, `assets/side-game/icons/` e `assets/side-game/brands/`. As atribuições originais permanecem válidas nas seções anteriores e em `js/credits-data.js`.
