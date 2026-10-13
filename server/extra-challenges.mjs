const hardwareOptions=[['ssd','SSD','ssd.jpg'],['ram','Memória RAM','memoria-ram.jpg'],['processador','Processador','processador.jpg'],['placa-mae','Placa-mãe','placa-mae.jpg'],['monitor','Monitor','monitor.jpg'],['teclado','Teclado','teclado.jpg'],['mouse','Mouse','mouse.jpg'],['headset','Headset','headset.jpg']].map(([id,label,file])=>({id,label,icon:`./assets/items/${file}`}));
export const extraHardware=[
 ['hardware-upgrade-ram','Instale a peça que ajuda o computador a manter vários programas abertos ao mesmo tempo.','ram','drop'],
 ['hardware-instalar-cpu','Instale a peça que executa os cálculos e as instruções dos programas.','processador','drop'],
 ['hardware-trocar-ssd','Troque o armazenamento lento por uma unidade SSD.','ssd','drop'],
 ['hardware-exibir-imagem','Selecione o equipamento que mostra as imagens do computador.','monitor','select'],
 ['hardware-digitar-texto','Escolha o equipamento para digitar uma pesquisa no navegador.','teclado','select'],
 ['hardware-clicar','Escolha o equipamento para mover o ponteiro e clicar nos links.','mouse','select'],
 ['hardware-ouvir-aula','Escolha um equipamento para ouvir uma videoaula e falar pelo microfone.','headset','select'],
 ['hardware-conectar-pecas','Instale a placa que conecta processador, memória e outras peças.','placa-mae','drop']
].map(([id,instruction,solution,mode])=>({id,theme:'Hardware na prática',template:'hardware',instruction,payload:{mode,options:hardwareOptions,targetLabel:'Gabinete do computador'},solution}));
const browser=(id,instruction,solution,payload={})=>({id:`navegador-${id}`,theme:'Navegador na prática',template:'browser-sim',instruction,payload:{initialPage:'google',...payload},solution});
export const browserChallenges=[
 browser('netflix','Na página principal do Google, pesquise Netflix e entre no primeiro site.',['search:netflix','open:netflix']),
 browser('youtube','Pesquise YouTube no Google e abra o primeiro resultado.',['search:youtube','open:youtube']),
 browser('wikipedia','Pesquise Wikipédia no Google e entre no site da enciclopédia.',['search:wikipedia','open:wikipedia']),
 browser('endereco-netflix','Use a barra de endereço para entrar em www.netflix.com.',['address:netflix']),
 browser('endereco-youtube','Digite www.youtube.com na barra de endereço e entre no site.',['address:youtube']),
 browser('voltar','Você abriu a Netflix. Volte à página anterior usando o botão do navegador.',['back'],{initialPage:'netflix',initialHistory:['google','netflix']}),
 browser('avancar','Você voltou ao Google. Avance para a página da Netflix que estava aberta.',['forward'],{initialHistory:['google','netflix'],historyIndex:0}),
 browser('atualizar','Atualize a página do YouTube usando o botão do navegador.',['reload'],{initialPage:'youtube'}),
 browser('nova-aba','Abra uma nova aba sem fechar a página da Netflix.',['new-tab'],{initialPage:'netflix'}),
 browser('alternar-aba','Há duas abas abertas. Alterne para a aba da Netflix.',['tab:netflix'],{tabs:['google','netflix']}),
 browser('fechar-aba','Feche somente a aba da Netflix, mantendo a aba do Google aberta.',['close:netflix'],{tabs:['google','netflix'],activeTab:1}),
 browser('favoritar','Adicione a página da Wikipédia aos favoritos do navegador.',['bookmark'],{initialPage:'wikipedia'}),
 browser('abrir-favorito','Abra o menu de favoritos e entre na Netflix salva na lista.',['bookmark-menu','favorite:netflix'],{favorites:['netflix','wikipedia']}),
 browser('historico','Abra o histórico do navegador e volte ao site do YouTube visitado anteriormente.',['history-menu','history:youtube'],{visited:['netflix','youtube','wikipedia']}),
 browser('download','Baixe o material aula.pdf e encontre o arquivo na lista de downloads do navegador.',['download:aula.pdf','downloads-menu'],{initialPage:'aula'}),
 browser('nova-pesquisa','Pesquise mouse no Google. Depois faça uma nova pesquisa por teclado.',['search:mouse','search:teclado'])
];
export function validateBrowserResponse(challenge,response){
 if(!Array.isArray(response)||response.length>100||response.some(v=>typeof v!=='string'||v.length>120))return false;
 let index=0;for(const action of response)if(action===challenge.solution[index])index++;return index===challenge.solution.length;
}
