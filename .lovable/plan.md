

## Problema Identificado

Dos 460 produtos no catálogo, apenas 167 possuem `descricao_html` preenchido. Os outros 293 mostram apenas o texto curto de `apresentacao_venda` sem especificações técnicas nem itens inclusos.

A causa raiz está na sincronização com a Shopify: quando o campo `descriptionHtml` da Shopify está vazio, o fallback converte o `description` para HTML mas o resultado ainda pode ficar vazio. Além disso, muitos produtos foram inseridos manualmente antes da integração Shopify e nunca receberam HTML.

## Plano

### 1. Melhorar a lógica de fallback no sync-shopify

Na Edge Function `sync-shopify/index.ts`, garantir que o `descricao_html` **sempre** seja preenchido. Se `descriptionHtml` estiver vazio, converter o `description` plain text para HTML com formatação adequada:
- Detectar seções conhecidas (Itens Inclusos, Especificações técnicas, Diferenciais, Descrição do produto) e convertê-las em `<h2>` com classe `theme-title`
- Converter emojis de lista (✔️, 📌, 🔪) em `<br>` separados para manter a formatação visual
- Converter quebras de linha duplas em `<p>` tags

### 2. Converter apresentacao_venda existente para HTML

Para os 293 produtos que já estão no banco sem `descricao_html`, mas que possuem `apresentacao_venda` longa (com specs/items), o frontend deve tratar `apresentacao_venda` como semi-formatado:
- Alterar o fallback em `CatalogoDetalhe.tsx` para converter `apresentacao_venda` em HTML quando contiver indicadores de seções (emojis ✔️, 📌, ou palavras-chave como "Itens Inclusos", "Especificações")
- Aplicar a mesma classe `shopify-description` para manter a formatação visual consistente

### 3. Detalhes técnicos

**`supabase/functions/sync-shopify/index.ts`**:
- Quando `descriptionHtml` está vazio, usar regex para converter `description` plain text em HTML estruturado
- Manter a lógica existente de upsert

**`src/pages/CatalogoDetalhe.tsx`**:
- No fallback de `apresentacao_venda`, usar uma função que converte texto plain com emojis/seções em HTML e renderizar com `dangerouslySetInnerHTML` + classe `shopify-description`
- Criar função `convertPlainToHtml(text: string)` que identifica padrões e gera HTML formatado

