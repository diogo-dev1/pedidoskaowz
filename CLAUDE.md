# CLAUDE.md — Sistema Kaowz Gestão
> Leia este arquivo inteiro antes de qualquer tarefa. Ele contém todo o contexto do negócio e regras críticas de desenvolvimento.

---

## O QUE É ESSE SISTEMA

E-commerce de lâminas artesanais (facas, canivetes, push daggers).
Sistema de gestão interno cobrindo: lançamento de pedidos, triagem, produção por lote, expedição, certificados, financeiro e insumos.

**Princípio central: One Shot Distribution**
O vendedor clica "Confirmar Pedido" → uma edge function distribui automaticamente para Supabase, Bling, Google Sheets, expedição, certificado, insumos e WhatsApp — tudo em paralelo.

---

## STACK

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions Deno)
- Roteamento: React Router v6
- Estado/Cache: TanStack Query v5
- Formulários: React Hook Form + Zod
- PDF: html2canvas + jsPDF
- PWA: vite-plugin-pwa

---

## PERFIS DE ACESSO

| Cargo | Acesso |
|---|---|
| `dono` | Tudo + financeiro + comissões + configurações + usuários |
| `gestor` | Triagem + produção + expedição + certificados + insumos |
| `vendedor` | Simulador + orçamento + leads + catálogos + ferramentas de venda |

**Atual no código:** só existe `admin` e `vendedor` em profiles.cargo.
**Expandir para:** `dono`, `gestor`, `vendedor`.

---

## REGRAS DE NEGÓCIO CRÍTICAS

### Pedidos
- Número do pedido: `KWZ-AAAA-XXXX` — ex: KWZ-2026-1502 — sequencial por ano
- Prazo padrão: **+65 dias úteis** da confirmação (pular sábado e domingo)
- Um pedido pode ter **múltiplas lâminas** (pedido_itens)
- Status: `aguardando_triagem` → `aprovado` → `em_producao` → `pronto` → `em_expedicao` → `entregue`

### Lotes de produção
- Capacidade máxima: **45 pedidos por lote**
- Fecha automaticamente quando atinge 45 ou quando prazo ≤ 70 dias
- ID semana: formato `2026-06-S2` (compatível com Apps Script existente)
- Número sequencial inteiro: Lote 44, 52, 53, 54, 55...
- **NÃO modificar o Apps Script — ele continua gerenciando lotes na planilha**

### Expedição — padrões reais identificados
- Destinatário pode ser DIFERENTE do comprador (campo separado obrigatório)
- Pedidos podem ter flag de bloqueio: "não enviar até pagar"
- Tipos de caixa: Patola, Tradicional/Comum, Maleta GG, Maleta Vinho
- Conferência item a item obrigatória antes de embalar (ficha de conferência)

### Certificados
- Numeração sequencial a partir do **1090** (último registrado)
- Um certificado por lâmina (pedido_item)
- Categorias: Ferramentas, Canivetes, Cintos, Shiv, Shank, Kits, InfoArmas, HQ, HQ Butcher, Freedom, Cris Hunt

### Financeiro
- Meta diária: R$ 9.000,00 (configurável)
- Vendedores: Diogo, Daniel, Mel + Site
- Canais: WhatsApp, Instagram, Site, Mel, Daniel
- Formas de pagamento: PIX, Cartão de Crédito, Pix Parcelado

---

## ARQUIVOS CRÍTICOS — NÃO QUEBRAR

### src/pages/Simulador.tsx
Wizard de 4 etapas para lançamento de pedido.
Função principal: `handleFinalizarPedido()` — linha ~838.

**Fluxo atual da função:**
1. Monta `todasLaminas[]` com todas as lâminas do pedido
2. Chama `enviarParaProducaoManual()` → Apps Script → Google Sheets
3. Formata texto do pedido (campos 1–24)
4. Chama `supabase.functions.invoke('export-to-sheets', ...)` → Sheets + Vendas
5. Exibe texto formatado + botão copiar para WhatsApp

**O que MANTER intacto:**
- Toda a UI do wizard (4 etapas)
- Geração do texto formatado (campos 1–24)
- Botão copiar para WhatsApp
- `enviarParaProducaoManual()` continua sendo chamado
- `export-to-sheets` continua sendo chamado

**O que ADICIONAR (Sprint 1):**
Após o `export-to-sheets`, adicionar chamada à nova edge function `confirmar-pedido`
que salva no banco e distribui para os outros destinos.

### src/services/producaoService.ts
Envia dados para Google Apps Script via POST.
URL do Web App: `https://script.google.com/macros/s/AKfycbwhmLi.../exec`
**NÃO modificar este arquivo.**

### supabase/functions/export-to-sheets/index.ts
Escreve em C6:M6 da planilha Lançamento Venda e chama `lancarPedido()` do Apps Script.
**NÃO modificar este arquivo.**

### supabase/functions/bling-api/index.ts
Proxy autenticado para Bling API v3 com refresh automático de token.
**Reutilizar esta função — não criar nova.**

---

## TABELAS EXISTENTES NO SUPABASE (não modificar estrutura)

```
profiles, modelos_base, opcoes_componentes, produtos_adicionais,
mensagens_padrao, leads, leads_situacoes,
catalogo_modelos, categorias_catalogo_visiveis, configuracoes_catalogo,
banners_catalogo, midias_catalogo, ordem_categoria_modelos,
config_revendedor, margem_revendedor_produto, ordem_categoria_revendedor,
preview_config, info_etapas_customizacao, midias_info_etapas,
albuns_midia, imagens_album,
bling_tokens, bling_contatos, bling_pedidos, bling_sync_log,
parcelamento_taxas, parcelamento_orcamentos,
cases_patola_modelos, cases_patola_solicitacoes, cases_patola_config,
kit_laminas_config, kit_laminas_combos
```

---

## NOVAS TABELAS A CRIAR

### pedidos
```sql
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT UNIQUE NOT NULL,
  vendedor_id UUID REFERENCES public.profiles(id),
  canal TEXT,
  cliente_nome TEXT NOT NULL,
  cliente_cpf TEXT,
  cliente_email TEXT,
  cliente_celular TEXT,
  cliente_cep TEXT,
  cliente_estado TEXT,
  cliente_cidade TEXT,
  cliente_bairro TEXT,
  cliente_endereco TEXT,
  cliente_numero TEXT,
  cliente_complemento TEXT,
  cliente_nascimento DATE,
  bling_contato_id BIGINT,
  valor_total DECIMAL(10,2),
  forma_pagamento TEXT,
  cupom TEXT,
  desconto DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'aguardando_triagem',
  lote_id UUID,
  prazo_entrega DATE,
  nome_certificado TEXT,
  embalagem TEXT,
  brindes TEXT,
  observacao TEXT,
  bloqueado_expedicao BOOLEAN DEFAULT false,
  motivo_bloqueio TEXT,
  bling_pedido_id BIGINT,
  bling_nfe_id BIGINT,
  aprovado_por UUID REFERENCES public.profiles(id),
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### pedido_itens
```sql
CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
  modelo TEXT,
  aco TEXT,
  acabamento TEXT,
  empunhadura TEXT,
  bainha TEXT,
  cor_bainha TEXT,
  brute_forge BOOLEAN DEFAULT false,
  dragon_scale BOOLEAN DEFAULT false,
  texto_laser TEXT,
  posicao_laser TEXT,
  embalagem_item TEXT,
  observacoes_item TEXT,
  preco_unitario DECIMAL(10,2),
  quantidade INT DEFAULT 1,
  status_lamina TEXT DEFAULT 'pendente',
  status_empunhadura TEXT DEFAULT 'pendente',
  status_bainha TEXT DEFAULT 'pendente',
  status_laser TEXT DEFAULT 'nao_aplicavel',
  certificado_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### lotes
```sql
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_lote INT UNIQUE NOT NULL,
  lote_id_semana TEXT,
  capacidade_max INT DEFAULT 45,
  total_pedidos INT DEFAULT 0,
  prazo_envio DATE,
  status TEXT DEFAULT 'aberto',
  exportado_sheets BOOLEAN DEFAULT false,
  data_exportacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### expedicao
```sql
CREATE TABLE public.expedicao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) UNIQUE,
  nome_destinatario TEXT,
  cep_destino TEXT,
  endereco_completo TEXT,
  tipo_caixa TEXT,
  espuma_cortada BOOLEAN DEFAULT false,
  transportadora TEXT DEFAULT 'Correios',
  codigo_rastreio TEXT,
  data_postagem DATE,
  prazo_previsto DATE,
  data_entrega DATE,
  status TEXT DEFAULT 'aguardando',
  brindes TEXT,
  observacoes TEXT,
  data_mesa TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### certificados
```sql
CREATE TABLE public.certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT UNIQUE NOT NULL,
  pedido_item_id UUID REFERENCES public.pedido_itens(id),
  nome_proprietario TEXT NOT NULL,
  modelo TEXT NOT NULL,
  categoria TEXT,
  data_emissao DATE DEFAULT CURRENT_DATE,
  observacoes TEXT,
  arquivo_gerado BOOLEAN DEFAULT false,
  arquivo_gravado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### insumos
```sql
CREATE TABLE public.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  cor TEXT,
  unidade TEXT DEFAULT 'unidade',
  qtd_disponivel DECIMAL(10,2) DEFAULT 0,
  qtd_minima DECIMAL(10,2) DEFAULT 0,
  local_compra TEXT,
  observacoes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### financeiro_recebimentos
```sql
CREATE TABLE public.financeiro_recebimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id),
  valor DECIMAL(10,2),
  forma_pagamento TEXT,
  status TEXT DEFAULT 'pendente',
  data_vencimento DATE,
  data_recebimento DATE,
  parcela INT DEFAULT 1,
  total_parcelas INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## NOVA EDGE FUNCTION PRINCIPAL: confirmar-pedido

```
supabase/functions/confirmar-pedido/
  index.ts              ← orquestradora
  _handlers/
    banco.ts            ← INSERT pedidos + pedido_itens (CRÍTICO — síncrono)
    bling.ts            ← cria contato + pedido + NF-e no Bling
    sheets.ts           ← reutiliza lógica do export-to-sheets existente
    expedicao.ts        ← cria registro na tabela expedicao
    certificado.ts      ← reserva números sequenciais a partir de 1090
    insumos.ts          ← desconta estoque por item
    financeiro.ts       ← cria registro em financeiro_recebimentos
    notificacao.ts      ← WhatsApp para o cliente (Z-API ou Evolution API)
```

**Fluxo da orquestradora:**
```typescript
// 1. Salva no banco — SÍNCRONO — se falhar, para tudo
const { pedido, itens } = await salvarNoBanco(supabase, payload)

// 2. Retorna imediatamente para o vendedor
// 3. Distribui em background — não bloqueia a resposta
EdgeRuntime.waitUntil(
  Promise.allSettled([
    criarNoBling(supabase, pedido, itens),
    exportarSheets(supabase, pedido, itens),   // mantém Apps Script
    criarExpedicao(supabase, pedido),
    reservarCertificado(supabase, pedido, itens),
    descontarInsumos(supabase, itens),
    registrarFinanceiro(supabase, pedido),
    notificarCliente(supabase, pedido),
  ])
)

return Response.json({
  sucesso: true,
  numero_pedido: pedido.numero_pedido,  // ex: KWZ-2026-1502
  prazo: pedido.prazo_entrega,
})
```

---

## NOVAS ROTAS A CRIAR

| Rota | Arquivo | Perfil | Substitui |
|---|---|---|---|
| `/triagem` | Triagem.tsx | gestor+ | Aba "PEDIDOS A LANÇAR" |
| `/financeiro` | Financeiro.tsx | dono | Relatório de Vendas (16 abas) |
| `/expedicao` | Expedicao.tsx | gestor+ | Planilha Expedição (25 abas) |
| `/certificados` | Certificados.tsx | gestor+ | Planilha Certificados (13 abas) |
| `/insumos` | Insumos.tsx | gestor+ | Cortes de Espuma + Lista de Compras |

---

## ROTAS EXISTENTES — NÃO MODIFICAR

```
/ → Simulador (modificar handleFinalizarPedido apenas)
/orcamento, /lista-valores, /calcular-frete
/leads, /clientes, /tarefas, /mensagens, /midia
/auxilio-vendas, /bling, /admin/*
/catalogo, /catalogo/:id, /catalogo-revendedor
/push-dagger-kaowz, /monte-seu-kit, /cases-patola
/p/:slug → parcelamento público
```

---

## INTEGRAÇÕES ATIVAS

| Sistema | Status | Como usar |
|---|---|---|
| Bling API v3 | ✅ OAuth2 funcionando | `supabase.functions.invoke('bling-api', { body: { endpoint, method, body } })` |
| Google Sheets | ✅ Service Account JWT | `supabase.functions.invoke('export-to-sheets', ...)` — NÃO MODIFICAR |
| Apps Script | ✅ Webhook POST | `producaoService.ts` — NÃO MODIFICAR |
| Correios XML | ✅ Funcionando | `supabase.functions.invoke('calcular-frete', ...)` |
| Shopify GraphQL | ✅ Sync produtos | `supabase.functions.invoke('sync-shopify', ...)` |

---

## PRODUTOS REAIS DA LINHA

Push Dagger (Standard, Compact, Micro, Tactical, Sandvik, Fake San Mai, Non Metallic),
EDC Standard, EDC Mini, EDC Tantō, Ring Tantô, Adaga EDC, Adaga Full Size,
Karambit, Warncliffe, Camp Knife, Big Camp Brute Forge,
Jagunço SVK SW, Defcon-1 Tactical, KZR Full Size, KZR Nimbowie, KZR Nimbus, KZR Elite Knight,
Shank, Shiv, Kiritsuke 8.5', Butcher, Chef Royal, Picanheira 9',
Garfo 8', Chaira 8'/10', Tábua 19',
Cinto Tático Kaowz (Preto/Coyote), Clipe de Bolso PETG,
Bainha/Kydex, Maleta, Pederneira, Strop

---

## ORDEM DOS SPRINTS

### Sprint 1 — ATUAL (começar aqui)
**Objetivo:** Salvar pedido no banco + edge function confirmar-pedido

Arquivos a criar:
- `supabase/migrations/[timestamp]_criar_tabelas_core.sql`
- `supabase/functions/confirmar-pedido/index.ts`
- `supabase/functions/confirmar-pedido/_handlers/banco.ts`
- `supabase/functions/confirmar-pedido/_handlers/sheets.ts`
- `supabase/functions/confirmar-pedido/_handlers/bling.ts` (stub por enquanto)
- `supabase/functions/confirmar-pedido/_handlers/expedicao.ts` (stub)
- `supabase/functions/confirmar-pedido/_handlers/certificado.ts` (stub)
- `supabase/functions/confirmar-pedido/_handlers/insumos.ts` (stub)
- `supabase/functions/confirmar-pedido/_handlers/financeiro.ts` (stub)
- `supabase/functions/confirmar-pedido/_handlers/notificacao.ts` (stub)

Arquivo a modificar:
- `src/pages/Simulador.tsx` → adicionar chamada à confirmar-pedido no handleFinalizarPedido

### Sprint 2 — Triagem + Bling real
### Sprint 3 — Dashboard Financeiro
### Sprint 4 — Módulo Expedição com ficha de conferência
### Sprint 5 — Certificados automáticos
### Sprint 6 — Insumos e cortes de espuma
### Sprint 7 — Perfis dono/gestor/vendedor + RLS
### Sprint 8 — Kanban no banco + polimento

---

## CONVENÇÕES DO PROJETO

- Sempre usar `supabase` do `@/integrations/supabase/client`
- Sempre usar `useAuth()` para acessar `profile` e `user`
- Componentes shadcn/ui de `@/components/ui/`
- Toast com `import { toast } from 'sonner'`
- Ícones com `lucide-react`
- Datas em português: `dd/MM/yyyy`
- Valores em BRL: `R$ 1.090,00`
- IDs sempre UUID gerados pelo Supabase

---

## DADOS REAIS PARA TESTES

Pedidos reais na planilha de produção (Lotes 44, 52, 53, 54):
- Marcus Felipe Brito — 9 lâminas (Push Dagger, Karambit, Camp Knife, KZR, Shank, Shiv, Adaga...)
- Daniel Gioielli de Castilho — 9 lâminas em Maleta GG
- Cleber Streher — 6 lâminas Kit Churrasco em Patola com strop
- José Humberto Furlan — 5 lâminas, bloqueado: "pagar R$1.000 pendentes antes de enviar"
- Daniel Matias — 6 lâminas, destinatário: EDSON MATIAS (diferente do comprador)

Esses casos cobrem todos os cenários complexos do sistema.
