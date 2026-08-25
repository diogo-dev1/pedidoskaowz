# Fase 1 — Base de clientes consultável a partir do cache do Bling

Objetivo: transformar o cache do Bling numa base de clientes rápida e filtrável, com métricas pré-calculadas na gravação. Sem mexer na UI de `/clientes` nem nos modelos de mensagem.

## O que já foi verificado no cache atual

- `bling_pedidos.dados_completos` tem o campo **`loja`** (`{"loja": {"id": 205375013, ...}}`). Distribuição atual: 467 pedidos com `loja.id = 205375013` (loja Shopify integrada) e 452 com `loja.id = 0` (sem loja → lançamento manual). Existe também `numeroLoja` (id do pedido na Shopify), preenchido só nos pedidos com loja.
- `bling_contatos.endereco` está vazio em **todos** os 2651 registros — o endpoint de lista de contatos do Bling não devolve endereço. `tipo` também está nulo em todos.
- O payload do pedido traz `contato.tipoPessoa` ("F"/"J") e `numeroDocumento`, e `transporte.etiqueta` com `uf`/`municipio` — preenchidos em 479 dos 919 pedidos.
- `pg_cron` e `pg_net` já estão instalados no banco.

Consequência de projeto: PF/PJ, cidade e UF serão derivados prioritariamente dos **pedidos** (tipoPessoa, etiqueta), com fallback pelo tamanho do documento; contatos sem nenhum pedido com etiqueta ficam sem cidade/UF nesta fase (opcionalmente enriquecidos depois via detalhe do contato, que custa 1 request por cliente).

## Tarefa 1 — Canal de origem do pedido

Novas colunas em `bling_pedidos`: `loja_id BIGINT`, `canal TEXT`.

Normalização:
- `loja.id = 205375013` (ou qualquer loja Shopify integrada) → `'site'`
- `loja.id` ausente ou `0` → `'manual'`
- outras lojas → nome/id da loja, resolvido em uma tabela de apoio `bling_lojas` (id, nome, canal_normalizado) alimentada pela sincronização a partir de `/lojas`; enquanto não houver nome, grava `loja-<id>`.

Backfill: `UPDATE` sobre `dados_completos->'loja'->>'id'` para todos os 919 pedidos já em cache.

## Tarefa 2 — Sincronização incremental

`bling-sync` ganha `type: 'incremental'` (mantendo `'full'` e `'contatos'`/`'pedidos'`):
- Lê o watermark da nova tabela `bling_sync_state` (chave `contatos`, `pedidos`), com margem de segurança de 1h para trás.
- Consulta o Bling com os filtros de data de alteração da API v3 (`dataAlteracaoInicial`/`dataAlteracaoFinal` em pedidos de venda; equivalente em contatos). O nome exato do parâmetro é confirmado com uma chamada real de teste antes de fixar no código; se a API não aceitar o filtro em contatos, cai para filtro por data de inclusão + varredura das páginas mais recentes.
- Throttle de ~350 ms entre páginas (3 req/s) e retry com backoff em 429, como já existe hoje.
- Watermark só avança quando a sincronização daquele tipo termina sem erro; falha → `bling_sync_log` com `status='failed'` e watermark intacto.
- Log passa a registrar progresso (páginas/registros processados) além do total final.

## Tarefa 3 — Agendamento

`cron.schedule` diário às **06:00 UTC (03:00 BRT)** chamando a edge function via `pg_net`, com `type: 'incremental'`. A página continua lendo só o cache.

## Tarefa 4 — Métricas por cliente

Tabela nova `clientes_metricas` (1 linha por `contato_bling_id`), preenchida na sincronização (e por backfill inicial):

| campo | descrição |
|---|---|
| `contato_bling_id` | PK, referência lógica a `bling_contatos.bling_id` |
| `nome`, `documento` | desnormalizados para busca |
| `tipo_pessoa` | 'PF'/'PJ' (de `contato.tipoPessoa`, fallback pelo documento) |
| `total_gasto`, `qtd_pedidos`, `ticket_medio` | agregados dos pedidos |
| `primeiro_pedido_em`, `ultimo_pedido_em` | datas (dias desde o último calculado na consulta) |
| `cidade`, `uf` | extraídos da etiqueta do pedido mais recente que tiver |
| `telefone_whatsapp`, `whatsapp_valido` | mesma lógica de `normalizarTelefone` de CheckoutsAbandonados |
| `canais` | `text[]` — `{site}`, `{manual}` ou ambos |
| `produtos` | `text[]` de nomes normalizados (índice GIN) |

Produtos comprados também em tabela relacional `clientes_produtos` (`contato_bling_id`, `produto_normalizado`, `produto_original`, `qtd_total`, `valor_total`, `ultima_compra_em`), extraída de `bling_pedidos.itens[].descricao`/`codigo`. Isso permite tanto “comprou X” (GIN no array) quanto “comprou X e nunca comprou Y” (anti-join) sem varrer JSON.

A recomputação é feita por uma função SQL `recalcular_metricas_clientes(p_contato_ids bigint[] default null)`, chamada pela sincronização apenas para os contatos tocados (ou sem argumento no backfill/full).

A lógica de `normalizarTelefone` é extraída para `src/lib/telefone.ts`, reusada em `CheckoutsAbandonados.tsx` (sem mudança de comportamento) e espelhada em SQL/Deno para o cálculo das métricas.

## Índices

`clientes_metricas`: `uf`, `tipo_pessoa`, `total_gasto`, `ultimo_pedido_em`, GIN em `canais` e `produtos`, trigram/`lower(nome)` para busca.
`clientes_produtos`: `(produto_normalizado)`, `(contato_bling_id)`.
`bling_pedidos`: `canal`, `contato_bling_id`, `data`.

## RLS

Mesmo padrão das demais tabelas do projeto: leitura para `authenticated`, escrita apenas por `service_role` (edge function), com os GRANTs explícitos na mesma migração. Migração idempotente (`IF NOT EXISTS` / `CREATE OR REPLACE`).

## Compatibilidade

`/clientes` continua lendo `bling_contatos` e `bling_pedidos` como hoje — só há colunas adicionais, nenhuma removida ou renomeada. Nada da UI muda nesta fase.

## Entregas técnicas

1. Migração: colunas `loja_id`/`canal`, tabelas `bling_lojas`, `bling_sync_state`, `clientes_metricas`, `clientes_produtos`, função de recálculo, índices, RLS/GRANTs.
2. Backfill de canal e métricas (SQL, sem chamar o Bling).
3. `bling-sync`: modo incremental, watermark, throttle, log de progresso, gravação de `loja_id`/`canal` e disparo do recálculo de métricas.
4. Cron diário 03:00 BRT.
5. `src/lib/telefone.ts` compartilhado.

## Pronto para a fase 2

Consulta única e indexada para a UI de filtros (UF, PF/PJ, faixa de gasto, recência, canal, produto comprado / não comprado) e base para segmentos salvos.
