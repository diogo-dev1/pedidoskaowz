# Pronta Entrega — painel e notas

## Kit Completo SLS
- [ ] Incluir kit, case personalizada e inclusos próprios na campanha com valores reais.
- [ ] Mostrar cartão, selo, seleção 2x2, banner editável, moeda conquistada, FAQ e WhatsApp na /sls.
- [ ] Validar valores e seleção em 375px/1280px, painel, testes e compilação.

## Vídeo de teste /sls
- [x] Adicionar campo de vídeo, upload/URL, prévia e remoção no painel de campanhas.
- [x] Mostrar vídeo vertical após o mecanismo, com carregamento próximo da tela, reprodução por visibilidade e controles de som/pausa.
- [x] Validar upload e gravação reais, estado vazio e reprodução em 375px/1280px, sem rolagem lateral; som, pausa, retomada, saída da tela e botão de oferta conferidos. Vídeo temporário removido do campo e armazenamento; nove testes e compilação OK.

## Editor visual /sls
- [x] Permitir trocar imagens e adicionar, retirar e ordenar blocos sem alterar outras campanhas.
- [x] Gravação, upload, releitura e remoção conferidos com sessão admin real; bloco de teste retirado e imagens/blocos originais restaurados. Nove testes passaram e compilação OK.

## Ajustes da página /sls
- [x] Corrigir textos e regras de prazo/pagamento, destacar brindes reais e adicionar seção de porte.
- [x] Adicionar foto de porte editável na campanha com upload e prévia; gravação, releitura e exibição pública conferidas, foto original restaurada.
- [x] Validar dados reais em 375px/1280px sem rolagem horizontal, datas ou Pix parcelado; brindes Micro R$175, Compact R$325 e Standard R$450; 28 testes e compilação OK. Prévia social específica por rota não implementada: hospedagem atual entrega o mesmo HTML estático.
- [x] Retirar a moldura branca da foto da faca no hero: foto em proporção natural, inteira e do tamanho da tela (46vh no celular / 440px no computador); conferido em 375px e 1280px sem rolagem lateral, 9 testes e compilação OK.
- [x] Unir foto e brindes num cartão único do hero (borda fina, fundo da barra, foto object-cover 4:3 celular / 1:1 desktop, rodapé com ícone Gift, bolinhas, "Até R$ X em brindes" e linha de apoio); linha laranja e "+" removidos; conferido em 375px/1280px com dados reais, sem rolagem lateral, compilação OK.

## Campanhas minimalistas
- [x] Mostrar a foto inteira no cartão (object-contain, fundo branco, 8px celular / 12px desktop, bolinhas inativas zinc-300); conferir 375px e 1280px com itens reais, modal intacto, 23 testes e compilação OK.
- [x] Adicionar nome curto opcional na biblioteca/cadastro/importação, reorganizar brindes em grade de três e espaçar preço/parcelamento/botão; gravação e releitura reais conferidas, valores restaurados, 375px/desktop sem rolagem lateral, 23 testes e compilação OK.
- [x] Redesenhar cartão/modal e upsells com preços brancos, brindes na foto e ações discretas, sem alterar Novidades ou regras.
- [x] Conferir 19 testes, compilação e cartão/modal públicos com dados reais em 375px e desktop, sem rolagem horizontal.
- [x] Mover os círculos dos brindes da foto para o corpo do cartão (nomes em cima, círculos abaixo); conferir 375px e desktop sem rolagem horizontal.

## Redesenho de campanhas e combos
- [x] Criar combos, descrições curtas e campos de apresentação com permissões de campanha.
- [x] Implementar cartões/modal exclusivos, seleção e cálculo de preços sem alterar Novidades.
- [x] Adicionar edição de combos e limpeza de descrições na importação/atualização.
- [x] Conferir 19 testes, compilação e telas em 375px/1280px; cadastro, edição, ordenação e leitura de combos com sessão admin real, seleção e WhatsApp conferidos. Dados temporários removidos.

## Brindes e upsells de campanhas
- [x] Criar biblioteca e vínculos com acesso público seguro e escrita admin; estrutura aplicada e conferida.
- [x] Implementar cadastro, seleção, edição, ordenação e atualização do Shopify.
- [x] Exibir brindes e upsells apenas nas campanhas públicas; nove testes passaram e cadastro/vínculos/preço especial/WhatsApp foram conferidos em 390px e 1280px com exemplos isolados, sem erros ou rolagem horizontal; compilação OK.
- [ ] Validar gravação, upload e atualização Shopify com conta admin real: solicitante sem conta correspondente; precisa entrar na prévia.

## Campanhas de oferta
- [x] Compartilhar visual das Novidades sem alterar a página atual.
- [x] Criar campanhas públicas, administração e seleção/atualização Shopify.
- [x] Aplicar permissões, campanha inicial e validar cartões/modal e painel (buscar, adicionar, editar, atualizar, remover) com dados simulados em 390px e 1280px; cinco testes de regras passaram. Registros privados temporários removidos.
- [ ] Validar seleção e atualização de produtos reais no painel: precisa de uma sessão de administrador na prévia.

## Gráfico da tela inicial
- [x] Substituir somente o gráfico por Dia/Semana/Mês com totais e detalhamento diário.
- [x] Validar oito cenários de cálculo e abas/detalhamento em 390px e 1280px com vendas simuladas, sem rolagem horizontal.
- [ ] Conferir a tela inicial com vendas reais: acesso autenticado indisponível; requer entrar na prévia.

- [x] Criar acompanhamento, detalhes Shopify e rastreio Bling preservando dados locais.
- [x] Reorganizar a página em três colunas com detalhes e confirmação simples.
- [x] Corrigir host/token Bling em todas as funções e atributos do simulador.
- [x] Validar GET Bling com limite 1, testes isolados de helpers e fluxos interceptados em 1920×1080, 1024×768 e 390×844; compilação OK.
- [x] Confirmar atualização de dados do Shopify com sessão real: card aberto e "Atualizar dados do Shopify" sem erros.
- [ ] Confirmar rastreio Bling com pedido real já enviado: nenhum pedido enviado no momento; exige uma expedição real.
- [x] Mostrar a data do pedido em cada card e no detalhe.

- [x] Substituir a apresentação por Kanban integrado ao tema do app e detalhes completos.
- [x] Validar monitor, tablet e celular, incluindo envio e desfazer com dados interceptados.

- [x] Redesenhar somente a apresentação com grade única, indicador principal e barras de prazo.
- [x] Validar estados, animações e interação em 1920×1080 e 390×844 sem alterar dados.

- [x] Mover classificação e prazo para cada item; remover decisão de envio.
- [x] Reformatar notas internas curtas com bloco de pronta entrega no topo.
- [x] Atualizar sincronização, atributos e envio somente de itens prontos.
- [x] Criar painel por urgência com atualização automática, tela cheia e confirmação identificada.
- [x] Validar regras, telas e funções publicadas; conferir pedidos reais e fluxo manual completo com sessão autenticada. Dados temporários removidos.- [x] Notificações push de carrinho perdido (função, agendamento a cada 5 min, botão Notificações, abrir carrinho pela notificação).
- [ ] Ativar um aparelho real no app publicado (exige publicar e ativar no celular).
