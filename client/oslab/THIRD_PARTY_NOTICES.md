# Avisos de terceiros

## Diagnóstico de Wi-Fi

Os novos ícones locais, as capturas dos glifos oficiais, o gerador QR offline e o ícone ilustrado original estão descritos em [Créditos de assets da trilha Wi-Fi](docs/diagnostico-wifi-assets.md), com revisões e licenças incluídas em `assets/wifi/`. As redes, credenciais e propriedades são cenários educacionais fictícios.

## win11React

- Projeto original: https://github.com/blueedgetechno/win11React
- Autor/equipe: blueedgetechno e colaboradores
- Licença: CC0-1.0
- Uso no OSLab: ícones raster e referência visual para o desktop, a barra de tarefas, as janelas, Configurações e Gerenciador de Tarefas. O resolvedor interno aplica um asset genérico visível quando uma imagem não pode ser carregada.
- Referência fixada: commit `afb02e797106c208314abbf837ec11bf50da9d62`.
- A fonte local `assets/fonts/SettingsIcons-win11React.woff2` é uma cópia de `src/containers/applications/apps/assets/SettingsIcons.woff2` dessa revisão. O mapeamento em `js/ui/windows-icons.js` usa os símbolos originais de `settingsData.json`, preservando os ícones lineares das opções de Configurações.
- Os assets de categorias em `assets/settings` foram conferidos contra os arquivos originais dessa revisão. Os ícones de aplicativos e categorias conservam suas cores.

O OSLab não é afiliado à Microsoft. A interface é uma simulação educacional executada no navegador e não corresponde ao sistema operacional Windows.

## Microsoft Fluent UI System Icons

- Projeto original: https://github.com/microsoft/fluentui-system-icons
- Autor/equipe: Microsoft Corporation e colaboradores
- Licença: MIT
- Arquivo de licença incluído: `assets/learning/icons/LICENSE.txt`
- Uso no OSLab: ícones específicos das trilhas de Missões e Exercícios, estados de progresso e ações do assistente educacional.
- Também em `assets/icons/taskmanager/fluent/` (cópia do pacote `@fluentui/svg-icons` 1.1.347, licença em `assets/icons/taskmanager/fluent/LICENSE.txt`): menu lateral e comandos do Gerenciador de Tarefas, cursor da animação "como abrir o Gerenciador" e ícones do menu Energia.

## Google Material Symbols

- Projeto original: https://github.com/google/material-design-icons (pacote `@material-symbols/svg-400` 0.49.0)
- Autor/equipe: Google
- Licença: Apache 2.0
- Arquivo de licença incluído: `assets/browser/google/LICENSE-material-symbols.txt`
- Uso no OSLab: ícones da barra do Chrome, da Nova guia e da página de resultados do Google (voltar, avançar, recarregar, estrela, aplicativos, teclado, fechar, temas).

## Nunito Sans

- Catálogo oficial: https://github.com/google/fonts/tree/main/ofl/nunitosans
- Autores: The Nunito Sans Project Authors
- Licença: SIL Open Font License 1.1
- Arquivo de licença incluído: `assets/fonts/OFL-NunitoSans.txt`
- Uso no OSLab: tipografia hospedada localmente somente nas superfícies educacionais de Missões, Exercícios e assistente.

## Mascote OSLab

- Origem: ilustrações originais criadas para este projeto.
- Uso no OSLab: estados neutro, oferecendo ajuda e celebrando no assistente educacional.
- Observação: o mascote não reutiliza personagens, marcas ou assets do Duolingo.

## Ícone da trilha de Usuários e Permissões

- Arquivo: `assets/users-permissions/trail-icon.png`
- Origem: imagem original gerada para o OSLab com a ferramenta de geração de imagens da OpenAI em 12/10/2026.
- Uso no OSLab: atalho, Menu Iniciar e cabeçalho da trilha Gerenciamento de Usuários e Permissões.
- Composição solicitada: perfis de usuários, pasta compartilhada e escudo de permissões em linguagem visual inspirada no Fluent Design, sem texto, marcas ou logotipos de terceiros.

## Trilha de Drivers

- `assets/drivers/printer-*.png`: foto de impressora enviada pelo professor (Fernando), com fundo transparente. O logotipo e o selo originais foram trocados pela marca fictícia **Printix** e por um selo genérico "INK". As variações de modelo são a mesma foto recolorida ou espelhada.
- `assets/drivers/trail-icon.svg`, `driver-file.svg` e `system-info.svg`: desenhos originais do OSLab.
- `assets/drivers/devmgr/*.png`: ícones extraídos dos arquivos do Windows 11 (`setupapi.dll`, `devmgr.dll`, `mmc.exe`, `imageres.dll`, `mmsys.cpl`, `mmres.dll` e `ddores.dll`). A pasta usa os IDs que o registro do Windows indica para cada classe de dispositivo, como `setupapi.dll,-5` para Adaptadores de rede e a sobreposição `setupapi.dll,-500` para o triângulo amarelo. São propriedade da Microsoft e aparecem aqui só para simular fielmente o Gerenciador de Dispositivos em uma atividade educacional sem fins lucrativos.
- Printix, os modelos InkJet e o site `suporte.printix.com.br` são fictícios. Nenhum arquivo real é baixado.

## Ícones do Windows 11 (Explorador, área de trabalho e Gerenciador)

- `assets/icons/win11/*.png`: ícones extraídos dos arquivos do Windows 11 no computador de desenvolvimento, nos tamanhos 16, 48 e 256 px: `shell32.dll` (Início `317`, Galeria `318`), `imageres.dll` (Área de Trabalho `105`/`174`, Downloads `175`, Documentos `189`/`188`, Imagens `190`/`108`, Músicas `191`/`103`, Vídeos `192`/`178`, Lixeira `50`/`49`, Este Computador `104`, Disco Local (C:) `31`, Rede `20`, pasta `3`, pasta compactada `165`, documento de texto `97`, arquivo `2`, imagem `16`, Usuários `169`), `explorer.exe` (Explorador de Arquivos) e `Taskmgr.exe` (Gerenciador de Tarefas). Os números são os índices de ícone de cada arquivo.
- São propriedade da Microsoft e aparecem aqui só para simular fielmente o Windows 11 em uma atividade educacional sem fins lucrativos, como os ícones do Gerenciador de Dispositivos.
- Os botões da barra de comandos do Explorador (`assets/icons/taskmanager/fluent/fx-*.svg`) vêm do pacote Fluent UI System Icons (MIT), listado acima.

## Microsoft Store do OSLab

- `assets/store/*-icon.webp`, `*-poster.webp`, `*-hero.webp` e `*-shot*.webp`: ícones, pôsteres, imagens de destaque e capturas de tela dos produtos, baixados do catálogo público da Microsoft Store para o Brasil (`displaycatalog.mp.microsoft.com` e `storeedgefd.dsx.mp.microsoft.com`) em 22/11/2026 e convertidos para WebP menores. Título, editor, categoria, nota e preço também vêm desse catálogo (`js/store/store-catalog.js`).
- Os nomes, logotipos e imagens são marcas e materiais de divulgação de seus donos (Microsoft, OpenAI, Spotify, Netflix, Discord, ibis, Brave, Opera, Mozilla, Meta, Roblox, Epic Games e outros). Aparecem só para simular a loja em uma atividade educacional sem fins lucrativos; o OSLab não é afiliado a nenhum deles.
- Só ChatGPT, Spotify, Netflix, Discord, ibis Paint, Brave, Opera, Firefox, Calculadora, Microsoft To Do, Relógio e Notas Autoadesivas funcionam no OSLab, com telas próprias e simplificadas (as músicas e os filmes são fictícios). Os outros mostram o aviso de que ainda não existem.
- `assets/icons/win11/store-*.png`: ícone da Microsoft Store do mesmo catálogo. `assets/store/trail-icon.svg`: desenho original do OSLab.

## Trilha de Som

- `assets/drivers/devmgr/camera-*.png`: ícone da classe Câmeras extraído de `ddores.dll,-2555` do Windows 11.
- `*-disabled-*.png` e `media-warn-*.png`: composições com as sobreposições oficiais de `setupapi.dll` (`-501`, a seta para baixo de desabilitado, e `-500`, o triângulo amarelo). Mesmas condições dos demais ícones do Gerenciador.
- `assets/audio/tray-muted.png` e `tray-nodevice.png`: derivados do `assets/icons/ui/audio.png` (win11React). As ondas foram trocadas por um "x" (mudo) e por um círculo vermelho com "x" (sem dispositivo).
- `assets/audio/trail-icon.svg`, `aula-icon.svg` e `assets/audio/icons/*.svg`: desenhos originais do OSLab, no estilo dos ícones Fluent já usados nas trilhas.
- Vertex, Sonora, o site `suporte.vertex.com.br` e a professora da Aula On-line são fictícios.

## Flag Icons

- Projeto original: https://github.com/lipis/flag-icons
- Autor/equipe: Panayiotis Lipiridis e colaboradores
- Licença: MIT
- Arquivo de licença incluído: `assets/vpn/flags/LICENSE.txt`
- Uso no OSLab: bandeiras dos servidores comerciais no aplicativo VPN.

## Lorem Picsum / Unsplash

- Catálogo: https://picsum.photos/
- Créditos individuais: `assets/vpn/posters/CREDITS.md`
- Uso no OSLab: imagens locais recortadas como capas fictícias dos 20 títulos da Netflix simulada.
- Observação: não são pôsteres oficiais da Netflix nem de séries reais; os títulos e metadados do catálogo são fictícios, salvo o nome usado na atividade pedagógica de disponibilidade regional.

## Logotipos e marcas dos navegadores

O OSLab apresenta interfaces educacionais simuladas. Não é afiliado nem endossado pelos fabricantes. Os arquivos abaixo são cópias locais; não há carregamento remoto de imagens durante as atividades.

| Arquivo | Fonte oficial | Observação |
| --- | --- | --- |
| `assets/browser/chrome.svg` | [Google Chrome](https://www.google.com/chrome/static/images/chrome-logo-m100.svg) | Logotipo do produto. Chrome e Google são marcas do Google. Consulte o [Google Brand Resource Center](https://about.google/brand-resource-center/products-and-services/). |
| `assets/browser/edge.png` | Ícone extraído da instalação oficial `msedge.exe` do Microsoft Edge para Windows no computador de desenvolvimento | Representa o navegador Microsoft Edge (Chromium). Microsoft e Edge são marcas da Microsoft. Consulte as [diretrizes do Edge 2026](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/mscle/documents/presentations/Microsoft_Edge_trademark_guidelines_2026.pdf). |
| `assets/browser/firefox.png` | [Mozilla Firefox favicon](https://www.mozilla.org/media/img/favicons/firefox/browser/favicon-196x196.png) | Firefox é marca da Mozilla. Consulte as [diretrizes de marcas](https://www.mozilla.org/en-US/foundation/trademarks/policy/). A biblioteca de assets Mozilla Protocol é distribuída sob MPL 2.0, mas este arquivo foi obtido diretamente do site Mozilla. |
| `assets/browser/brave-icon.png` | [Brave favicon](https://brave.com/static-assets/images/brave-favicon.png) | Brave é marca da Brave Software. |
| `assets/browser/brave.png` | [Pacote oficial Brave](https://brave.com/static-assets/files/BrandBrave.zip), arquivo `Brave-Logos/light background/PNG/brave_color_lightbackground.png` | Logotipo completo para o card do museu. Consulte a [página de branding](https://brave.com/brave-branding-assets/). |
| `assets/browser/google/googlelogo_color_272x92dp.png` e `googlelogo_light_color_272x92dp.png` | [Logotipo do Google](https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png) (versão clara e versão para fundo escuro) | Logotipo da página inicial e dos resultados do Google simulados. Google é marca do Google. |
| `assets/browser/google/googlemic_color_24dp.png` e `lens_2023q2_48dp.png` | [Microfone](https://www.gstatic.com/images/branding/googlemic/2x/googlemic_color_24dp.png) e [Google Lens](https://www.gstatic.com/images/branding/product/2x/lens_2023q2_48dp.png) do gstatic | Ícones da caixa de pesquisa (apenas visuais). |
| `assets/browser/opera.png` | [Pacote oficial Opera One 2026](https://media-production-opera-website.operacdn.com/media/documents/Opera_Logo.zip), arquivo `2. Marque/For Screen/PNG/Medium/Opera_Marque_med.png` | Opera é marca da Opera Norway AS. Consulte as [diretrizes Opera](https://brand.opera.com/opera-product-logos). |

As marcas são usadas apenas para identificar os navegadores na atividade comparativa. As páginas visitadas, telas e dados exibidos no OSLab são simulações locais.


## WhatsApp simulado (trilha Segurança Digital)

O OSLab não é afiliado nem endossado pelo WhatsApp ou pela Meta. A interface é uma simulação local para fins educacionais; nenhuma mensagem é enviada para fora do computador.

- `assets/icons/trails/whatsapp.svg`: logotipo do WhatsApp, cópia local do arquivo [WhatsApp.svg](https://commons.wikimedia.org/wiki/File:WhatsApp.svg) do Wikimedia Commons. WhatsApp é marca registrada da WhatsApp LLC/Meta e aparece apenas para identificar o aplicativo simulado.
- Ícones de traço da interface (`js/apps/zap-app.js`): redesenhados no estilo do [Lucide](https://lucide.dev/) (licença ISC).
- `assets/whatsapp/doodle-light.svg`, `assets/whatsapp/doodle-dark.svg`, `assets/whatsapp/people/promo.svg`, `suporte.svg`, `vaga.svg` e os ícones de `assets/icons/trails/` (exceto o do WhatsApp): desenhos próprios do OSLab.
- Fotos: [Unsplash](https://unsplash.com/) sob a [Licença Unsplash](https://unsplash.com/license) (uso gratuito, sem atribuição obrigatória; os créditos ficam aqui por cortesia). As pessoas das fotos não têm relação com as personagens. Os contatos golpistas usam fotos sem rosto (máscara, moto, pôr do sol) ou avatares desenhados.

| Arquivo | Fotógrafo(a) | Origem |
| --- | --- | --- |
| `assets/whatsapp/people/antonio.webp` | [@jcorl](https://unsplash.com/@jcorl) | `https://images.unsplash.com/photo-1718717436460-907cc7be39e3` |
| `assets/whatsapp/people/lucas.webp` | [@wtonfers](https://unsplash.com/@wtonfers) | `https://images.unsplash.com/photo-1695927621677-ec96e048dce2` |
| `assets/whatsapp/people/junior.webp` | [@andremagalhaes](https://unsplash.com/@andremagalhaes) | `https://images.unsplash.com/photo-1626790890768-4c246c6417cd` |
| `assets/whatsapp/people/davi.webp` | [@mikenaboa](https://unsplash.com/@mikenaboa) | `https://images.unsplash.com/photo-1710357956796-4227c56641ca` |
| `assets/whatsapp/people/jorge.webp` | [@abstralofficial](https://unsplash.com/@abstralofficial) | `https://images.unsplash.com/photo-1535643302794-19c3804b874b` |
| `assets/whatsapp/people/carol.webp` | [@luca_nicoletti](https://unsplash.com/@luca_nicoletti) | `https://images.unsplash.com/photo-1631377307692-36a9b6ae3ef6` |
| `assets/whatsapp/people/bia.webp` | [@jabarib](https://unsplash.com/@jabarib) | `https://images.unsplash.com/photo-1656473031961-9d5d9ee19f40` |
| `assets/whatsapp/people/fernanda.webp` | [@alexcrphoto](https://unsplash.com/@alexcrphoto) | `https://images.unsplash.com/photo-1772989665252-7cb41ae759cc` |
| `assets/whatsapp/people/vovo.webp` | [@dani_franco](https://unsplash.com/@dani_franco) | `https://images.unsplash.com/photo-1496672254107-b07a26403885` |
| `assets/whatsapp/people/rose.webp` | [@ofelipequeiroz](https://unsplash.com/@ofelipequeiroz) | `https://images.unsplash.com/photo-1704749301600-29be53d0f534` |
| `assets/whatsapp/people/mae.webp` | [@davieees](https://unsplash.com/@davieees) | `https://images.unsplash.com/photo-1652226825940-46ad2a55d132` |
| `assets/whatsapp/people/marta.webp` | [@luandmario](https://unsplash.com/@luandmario) | `https://images.unsplash.com/photo-1629540266304-fff9c67b7660` |
| `assets/whatsapp/people/rafael.webp` | [@jassirjonis](https://unsplash.com/@jassirjonis) | `https://images.unsplash.com/photo-1588560979004-a4de3190506e` |
| `assets/whatsapp/people/tadeu.webp` | [@mdishakrahman](https://unsplash.com/@mdishakrahman) | `https://images.unsplash.com/photo-1780733058106-1126f2c42c0d` |
| `assets/whatsapp/media/capivara-1.webp` | [@annaroro](https://unsplash.com/@annaroro) | `https://images.unsplash.com/photo-1716064554838-f9ae49db992b` |
| `assets/whatsapp/media/capivara-2.webp` | [@antonioxyz](https://unsplash.com/@antonioxyz) | `https://images.unsplash.com/photo-1786115066642-cd12692ef022` |
| `assets/whatsapp/media/capivara-3.webp` | [@hakiost](https://unsplash.com/@hakiost) | `https://images.unsplash.com/photo-1763686041681-31f8d3bafe0f` |
| `assets/whatsapp/media/capivara-4.webp` | [@sushioutlaw](https://unsplash.com/@sushioutlaw) | `https://images.unsplash.com/photo-1595017013941-cab3d4c8d02f` |
| `assets/whatsapp/media/capivara-5.webp` | [@on_earth_in_space](https://unsplash.com/@on_earth_in_space) | `https://images.unsplash.com/photo-1633123784883-9cc9ba6d8c9e` |
| `assets/whatsapp/media/capivara-6.webp` | [@didinhasb_](https://unsplash.com/@didinhasb_) | `https://images.unsplash.com/photo-1700553792546-3fbfc6b6613e` |
| `assets/whatsapp/people/hacker.webp` | [@stumpie10](https://unsplash.com/@stumpie10) | `https://images.unsplash.com/photo-1648917980781-06b43457390b` |
| `assets/whatsapp/people/larissa.webp` | [@lemonvlad](https://unsplash.com/@lemonvlad) | `https://images.unsplash.com/photo-1629916318676-4b6f77aa4f6d` |
| `assets/whatsapp/people/cleiton.webp` | [@takeshi2](https://unsplash.com/@takeshi2) | `https://images.unsplash.com/photo-1747227231297-829a32781f65` |
| `assets/whatsapp/media/webcam-pug.webp` | [@charlesdeluvio](https://unsplash.com/@charlesdeluvio) | `https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc` |
| `assets/whatsapp/media/bomdia.webp` | [@aaronburden](https://unsplash.com/@aaronburden) | `https://images.unsplash.com/photo-1533523611631-15e4ef69be08` |
| `assets/whatsapp/media/milho.webp` | [@bamin](https://unsplash.com/@bamin) | `https://images.unsplash.com/photo-1623066798929-946425dbe1b0` |
| `assets/whatsapp/people/gabriel.webp` | [@josiasegl](https://unsplash.com/@josiasegl) | `https://images.unsplash.com/photo-1757744705465-ea08b0ddc38a` |
| `assets/whatsapp/people/marcos.webp` | [@dmnphoto](https://unsplash.com/@dmnphoto) | `https://images.unsplash.com/photo-1583692331507-fc0bd348695d` |
| `assets/whatsapp/people/kaua.webp` | [@lauraintacoma](https://unsplash.com/@lauraintacoma) | `https://images.unsplash.com/photo-1602896441343-ed0dc62ed65e` |
| `assets/whatsapp/people/anaclara.webp` | [@nolanrmanning](https://unsplash.com/@nolanrmanning) | `https://images.unsplash.com/photo-1662850886700-4ec19bd30d11` |
| `assets/whatsapp/people/julia.webp` | [@ritamalcok](https://unsplash.com/@ritamalcok) | `https://images.unsplash.com/photo-1595085610896-fb31cfd5d4b7` |
| `assets/whatsapp/people/celia.webp` | [@michaelrmims](https://unsplash.com/@michaelrmims) | `https://images.unsplash.com/photo-1526080652727-5b77f74eacd2` |
| `assets/whatsapp/people/osvaldo.webp` | [@popovski](https://unsplash.com/@popovski) | `https://images.unsplash.com/photo-1468218457742-ee484fe2fe4c` |
| `assets/whatsapp/people/paulo.webp` | [@epartner](https://unsplash.com/@epartner) | `https://images.unsplash.com/photo-1687377559195-87aa52e57acb` |
| `assets/whatsapp/people/thiago.webp` | [@i_bekkers](https://unsplash.com/@i_bekkers) | `https://images.unsplash.com/photo-1515349541556-ef8cc276e382` |
| `assets/whatsapp/people/tigrinho.webp` | [@yapics](https://unsplash.com/@yapics) | `https://images.unsplash.com/photo-1627667928346-5fc86d099a5c` |

Também são desenhos próprios do OSLab: `assets/whatsapp/media/tigrinho-print.svg`, `assets/whatsapp/media/meme-blur.svg` (sem foto de pessoa) e `assets/whatsapp/people/turma.svg`.

## Servidor do grupo da turma

- `server/zap-group/` usa a biblioteca [ws](https://github.com/websockets/ws) (licença MIT) para o WebSocket.
