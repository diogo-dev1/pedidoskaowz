# Fase 2 — Upsell por cliente sobre a base unificada do Bling

A página `/upsell-clientes` deixa de listar pedidos da Shopify e passa a listar **clientes** vindos de `clientes_metricas` / `clientes_produtos`, com todos os filtros resolvidos no banco.

## O que já foi verificado

- `clientes_metricas`: 2.651 linhas; `clientes_produtos`: 410 produtos normalizados distintos.
- `upsell_clientes_contatos`: 140 registros de status. Cruzando `order_id` com `bling_pedidos.dados_completos->>'numeroLoja'`, **101 têm correspondência** com um contato do Bling; os outros 39 não têm e serão descartados (466 pedidos no cache têm `numeroLoja`).
- RLS atual: `clientes_metricas`/`clientes_produtos` = leitura para `authenticated`; tabelas de upsell = ALL para `authenticated`. As tabelas novas seguem o mesmo padrão.
- `normalizarTelefone` já vive em `src/lib/telefone.ts`.

## Migrações SQL

**1. `upsell_clientes_contatos` → chave por cliente**

- Adiciona `contato_bling_id BIGINT`.
- Preenche a partir do mapeamento `order_id = bling_pedidos.numeroLoja → contato_bling_id`; quando o mesmo cliente tem vários pedidos com status diferentes, mantém o mais avançado (`vendeu` > `contatado` > `sem_interesse` > `pendente`) e o `contatado_em` mais recente.
- Remove as linhas sem correspondência, dropa `order_id`, cria `UNIQUE (contato_bling_id)`.

**2. `upsell_segmentos`** (segmentos salvos)

`id`, `user_id` (dono), `nome`, `filtros jsonb`, `created_at`, `updated_at` + trigger de updated_at. GRANTs para `authenticated`/`service_role`; RLS: cada usuário vê/edita só os seus.

**3. Função de consulta `buscar_clientes_upsell(...)`** (`SECURITY INVOKER`, `STABLE`)

Uma única função recebe todos os filtros e devolve a página de clientes já com o status do upsell embutido. Uma segunda função `resumo_clientes_upsell(...)` com os mesmos parâmetros devolve o resumo do segmento (total de clientes, com WhatsApp válido, soma gasta, ticket médio) e as contagens por status para as abas.

Parâmetros: busca, `ufs text[]`, `tipo_pessoa`, `gasto_min/max`, `comprou_ha_dias`, `sem_comprar_ha_dias`, `min_pedidos`, `canais text[]`, `produtos_incluir text[]`, `produtos_excluir text[]`, `so_whatsapp`, `status`, `ordem`, `limite`, `offset`.

Esqueleto da query:

```sql
FROM clientes_metricas m
LEFT JOIN upsell_clientes_contatos u ON u.contato_bling_id = m.contato_bling_id
WHERE (busca IS NULL OR m.nome ILIKE ... OR m.documento ILIKE ... OR m.email ILIKE ... OR m.telefone_whatsapp ILIKE ...)
  AND (ufs IS NULL OR m.uf = ANY(ufs))
  AND (canais IS NULL OR m.canais && canais)          -- usa o índice GIN
  AND (produtos_incluir IS NULL OR m.produtos @> produtos_incluir)
  -- anti-join de cross-sell:
  AND (produtos_excluir IS NULL OR NOT EXISTS (
        SELECT 1 FROM clientes_produtos cp
         WHERE cp.contato_bling_id = m.contato_bling_id
           AND cp.produto_normalizado = ANY(produtos_excluir)))
  AND (sem_comprar_ha_dias IS NULL OR m.ultimo_pedido_em < current_date - sem_comprar_ha_dias)
  AND (comprou_ha_dias IS NULL OR m.ultimo_pedido_em >= current_date - comprou_ha_dias)
  AND (COALESCE(u.status,'pendente') = status OR status = 'todos')
```

O "nunca comprou Y" é `NOT EXISTS` sobre `clientes_produtos` (índice em `contato_bling_id, produto_normalizado`), nunca em memória. O "comprou X" usa `@>` no array `produtos` de `clientes_metricas`, que já tem GIN. Ordenação por `total_gasto`, `ultimo_pedido_em` (asc/desc) ou `qtd_pedidos`, com paginação por `LIMIT/OFFSET` (50 por página, botão "carregar mais").

**4. `listar_produtos_upsell()`** — devolve os produtos normalizados distintos com contagem de clientes, para alimentar os seletores de produto sem baixar `clientes_produtos` inteira.

## Frontend

`src/pages/UpsellClientes.tsx` reescrita:

- Remove a chamada a `shopify-clientes-pedidos`; zero chamadas à Shopify. React Query mantido, com a chave incluindo o objeto de filtros (debounce de 350 ms na busca).
- Cada card = um cliente: nome, cidade/UF, telefone, total gasto, qtd de pedidos, ticket médio, último pedido com "há X dias", badges de canal e chips dos produtos comprados (com "+N").
- Abas de status (todos / pendente / contatado / vendeu / sem interesse) com contagens vindas de `resumo_clientes_upsell`.
- Faixa de resumo no topo: clientes no segmento, quantos com WhatsApp válido, total gasto somado, ticket médio.
- Status gravado por `contato_bling_id` (upsert com `onConflict: 'contato_bling_id'`).

**Filtros no mobile**: a barra fixa mostra só busca + botão "Filtros" com contador de filtros ativos + ordenação. O resto abre num `Sheet` de baixo para cima, em seções colapsáveis: Localização (UF, com aviso "cobertura parcial — 421 de 2.651 clientes"), Perfil (PF/PJ, canal, só com WhatsApp), Valor (gasto mín/máx, mín. de pedidos), Recência (chips rápidos 30/60/90/180/365 dias para "comprou" e "não compra há"), Produtos (comprou X / nunca comprou Y, com busca dentro do seletor). Rodapé do Sheet: "Limpar tudo" e "Ver N clientes". Fora do Sheet, chips removíveis mostram os filtros ativos. No desktop as mesmas seções ficam numa coluna lateral.

**Segmentos salvos**: linha de chips acima dos filtros com os segmentos do usuário; "Salvar filtro atual" pede um nome, clique aplica, ícone de lixeira exclui.

**Mensagens**: `upsell_clientes_templates` e o disparo `wa.me` ficam como estão. As variáveis passam a ser `{nome}`, `{nome_completo}`, `{vendedor}`, `{cidade}`, `{total_gasto}`, `{qtd_pedidos}`, `{ultimo_produto}`, `{produtos}`, `{dias_sem_comprar}`. As antigas por pedido são mapeadas por compatibilidade (`{total}` → total gasto, `{itens}` → produtos) e `{pedido}`/`{data}` são removidas, com aviso no editor de modelos listando as variáveis válidas.

## Fora do escopo

`/clientes`, `/checkouts-abandonados` e a edge function `shopify-clientes-pedidos` (que continua existindo, só deixa de ser usada aqui) permanecem intactas.
