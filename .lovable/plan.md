# Área pública Kaowz — Quiz, Configurador e Arsenal

Nova experiência pública para o cliente final, sem login, vivendo em rotas próprias (`/descubra`, `/vitrine`, `/montar`, `/arsenal/:token`). O Simulador interno (`/simulador-precos`) e o Novo Pedido continuam intactos — nada do fluxo do vendedor é alterado.

## Premissas (confirme se discordar)

- Os atributos do quiz entram na tabela do **catálogo** (`catalogo_modelos`), que é a que já tem foto, preço, descrição e sincroniza com a Shopify. O CRUD de admin correspondente é `/admin/catalogo`, onde entra a nova aba de atributos. A sincronização Shopify faz upsert por `nome_modelo` gravando só campos vindos da loja, então os atributos manuais não são apagados.
- O arsenal é um registro no banco identificado por um token no link; sem login, sem app. O link é o objeto.
- Checkout continua na Shopify. O configurador público termina em WhatsApp, não em pedido.
- Sem gamificação: nenhum ponto, medalha ou nível em nenhuma tela.

---

## Fase 1 — Atributos de recomendação nos modelos

Novos campos em `catalogo_modelos`:

- `casos_uso` (lista: campo, caça, pesca, EDC urbano, defesa, tático/operacional, churrasco, coleção)
- `tipo_porte` (lista: velado, ostensivo cintura, mochila/colete, não se aplica)
- `nivel_envolvimento` (lista: iniciante, usuário, experiente, colecionador)
- `posicao_escada` (único: entrada, ideal, definitiva)
- `grupo_escada` (texto livre — agrupa os degraus da mesma escada)
- `forma_enxoval` (lista de modelos que compõem conjunto com este)
- `manutencao` (corte extremo/exige cuidado vs. resistente/esquecível) — necessário para a pergunta 5 do quiz
- `porque_texto` (texto curto do "porquê" exibido na recomendação)

Entregável: nova aba **Atributos** em `/admin/catalogo`, com edição em lote por modelo (chips de múltipla escolha, seletor único da escada, campo de grupo, seletor de modelos do enxoval e o texto do porquê). Nada é exibido ao público ainda.

## Fase 2 — Motor de pontuação

Camada única de scoring reutilizada pelo quiz e pela vitrine filtrada:

- Cada resposta gera pesos por atributo; cada modelo soma os pesos dos atributos que possui.
- Perfil misto multiplica caminhos em vez de excluir: caça + coleção pontua as duas famílias.
- Nunca retorna vazio — na ausência de casamento forte, cai para os melhores parciais.
- Modelo novo entra na recomendação só cadastrando atributos, sem tocar em código.

Entregável: motor testado com casos reais (EDC urbano velado iniciante; caçador colecionador; operacional; churrasco).

## Fase 3 — Quiz de descoberta (`/descubra`)

Sete perguntas sobre a pessoa, sem termo técnico, cartões grandes com imagem de uso real:

1. Quem é você (múltipla) 2. Onde vai usar (múltipla) 3. Como pretende portar 4. Função principal 5. Manutenção (aço sem falar de aço) 6. Desempate entre o que marcou 7. Envolvimento (segmenta ticket sem falar de preço)

- Sem login, sem e-mail, sem faixa de preço em momento nenhum.
- Saída "só quero ver todas as lâminas" visível em toda tela → leva à vitrine com os filtros do quiz aplicados ao lado.
- Respostas guardadas no navegador para permitir refazer/voltar.

## Fase 4 — Tela de resultado

- Abre com uma frase sobre a pessoa, não sobre o produto.
- Perfil misto gera **enxoval**: uma peça por uso, cada uma com sua justificativa.
- **Escada de valor** com três níveis (entrada / ideal / definitiva); a hierarquia visual inverte conforme o envolvimento — iniciante vê o canivete em destaque e a peça premium como horizonte; colecionador vê o inverso.
- Cada recomendação exibe o porquê escrito (é o texto que substitui o atendimento).
- Dois caminhos lado a lado: à esquerda as configurações que já existem no site (foto, preço, comprar na Shopify); à direita "monte a sua" → configurador.

## Fase 5 — Configurador público (`/montar`)

Reaproveita a lógica de preço do simulador (aço, empunhadura + espaçador, acabamento, bainhas, cálculo em tempo real), em versão de cliente:

- Cartões com foto no lugar de dropdowns, cada opção com uma linha de tradução ("micarta: leve, absorve suor, aderência melhora com o uso"; "stonewash: fosco, disfarça riscos, baixa reflexão").
- A peça se monta na tela a cada escolha, com transição suave e resposta imediata — o prazer está no gesto.
- Preço sempre visível.
- Final não fecha pedido: gera resumo completo da configuração e abre o WhatsApp com tudo embutido.

## Fase 6 — Arsenal (`/arsenal/:token`)

- "Salvar no meu arsenal", com nome dado pela pessoa ("minha de caça"). Nunca "favoritos" nem "carrinho".
- Link único e permanente, sem login: a pessoa salva o link no WhatsApp dela. Voltar pelo link recupera tudo.
- O WhatsApp só é pedido no momento de salvar — nunca antes.
- Cada projeto tem botão discreto "tirar do papel" (falar com quem faz).
- Compartilhamento gera imagem da faca montada com nome do projeto e marca Kaowz.
- PWA instalável (manifest e ícones atualizados para a área pública); push fica desligado nesta fase.

## Fase 7 — Funil

- O arsenal é a qualificação: o que montou, quantas vezes voltou, qual configuração repetiu.
- Webhook de saída com o evento (quiz concluído, projeto salvo, "tirar do papel") + perfil e caso de uso etiquetados, para n8n → Kommo.
- Painel interno simples listando arsenais e projetos, para o vendedor abrir o link do cliente antes de responder.

## Fase 8 — Identidade e acabamento

- Tema público próprio seguindo kaowz.com.br: fundo escuro, vermelho e dourado, Bebas Neue nos títulos; tom sóbrio, sem elemento infantil.
- Mobile-first, sem rolagem horizontal.
- SEO das rotas públicas (títulos, descrição, dados estruturados) e imagens com carregamento tardio.

---

## Detalhes técnicos

- **Banco**: colunas novas em `catalogo_modelos` (arrays de texto para as múltiplas, texto para escada/grupo/porquê); tabelas novas `arsenais` (token público, contato opcional, contadores de visita) e `arsenal_projetos` (nome, configuração em JSON, modelo de origem). Leitura pública por token; escrita restrita ao próprio token.
- **Motor**: módulo puro em `src/lib/`, sem dependência de React, consumido pelo quiz, pela vitrine e pelo painel interno.
- **Preços do configurador**: mesma fonte do simulador (`simulador_precos_config`), sem duplicar tabela de valores.
- **Shopify**: nenhuma alteração nas edge functions existentes; o resultado só linka para os produtos já sincronizados.
- **Webhook**: edge function única de saída, endereço configurável em admin.
