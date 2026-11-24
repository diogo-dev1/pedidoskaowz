# Plano — Landings por categoria com scrollytelling

> Cole este arquivo na raiz do repositório (ou em `docs/`) e peça ao Claude no Cursor:
> **"Leia o CLAUDE.md e o PLANO_LANDINGS_CATEGORIA.md. Execute a Fase 0 e pare."**
> Depois vá liberando fase por fase: **"Execute a Fase N e pare."**
> Cada fase termina com um commit. Não pule a revisão entre as fases.

---

## Objetivo

Criar na área pública uma **landing page por categoria de uso** (a primeira é **Porte velado**), com scrollytelling, e um **admin** para gerenciar textos, passos do scroll e lâminas de cada landing sem mexer em código.

- **Público:** quem quer **descobrir** os modelos (chegou pelo Instagram, por um anúncio ou pelo WhatsApp e ainda não sabe o que quer).
- **Conversão:** do ticket de entrada ao premium, usando a escada de valor que já existe no catálogo (entrada → ideal → definitiva).
- **Papel na área pública:** as categorias são a vitrine para explorar, o quiz (`/descubra`) é o atalho para decidir e o arsenal é onde se salva o resultado.

---

## Regras para o agente (valem para todas as fases)

1. **Leia o `CLAUDE.md` antes de tudo.** Respeite "Arquivos críticos — não quebrar" e "Rotas existentes — não modificar".
2. **Não criar cadastro novo de lâminas.** As lâminas vêm de `catalogo_modelos`, com o mesmo filtro de `carregarModelosPublicos()` em `src/lib/publico.ts` (`visivel_catalogo = true` e `visivel_publico = true`). Reaproveite as colunas `posicao_escada`, `grupo_escada`, `casos_uso`, `tipo_porte`, `preco_base`, `imagem_modelo`, `video_url`, `porque_texto`, `apresentacao_venda`, `prazo_entrega` e `garantia`.
3. **Não alterar** quiz, vitrine, arsenal, catálogo, simulador nem telas internas. A única alteração fora dos arquivos novos é registrar as rotas no `src/App.tsx` e o item de menu do admin.
4. **Visual da área pública:** usar `PublicoLayout` e `TituloPublico` de `src/components/publico`, fundo escuro, cor `accent` e o mesmo estilo de chips e cards do `src/pages/publico/Vitrine.tsx` e do `LaminaCard`. Mobile first: o público abre pelo navegador do WhatsApp e do Instagram.
5. **Animação:** `framer-motion` (já instalado). Use `useScroll`, `useTransform` e `useReducedMotion`. Não instalar GSAP nem outras libs de animação.
6. **Tipos do Supabase:** o `src/integrations/supabase/types.ts` não vai conhecer as tabelas novas até o Lovable regenerar. Siga o padrão que já existe no projeto (`supabase.from("tabela" as any)`) e defina interfaces próprias em `src/lib/landings.ts`.
7. **Convenções:** `supabase` de `@/integrations/supabase/client`, `useAuth()`, shadcn de `@/components/ui/`, toast do `sonner`, ícones do `lucide-react` e valores em `R$ 1.090,00`.
8. **Ao fim de cada fase:** rode `npm run build` (e `npm run lint`, se existir), corrija os erros, faça o commit com a mensagem indicada e **pare** mostrando o que foi feito e o que eu preciso testar.

---

## Decisões da Fase 0 (23/11/2026) — valem sobre o texto das fases

1. **Visual:** os componentes novos da landing seguem o padrão da página `/ofertas` (redesign unslop), não o do `LaminaCard`/`Vitrine`: tokens `--oferta-*`, nomes de modelo em Bebas Neue, laranja (`accent`) só no preço, sem degradê/brilho, texto ≥ 12px, botões de 44px no celular. Por isso o card de lâmina da landing é um componente novo em `src/components/publico/landing/` (o `LaminaCard` também não suporta as regras de preço e CTA). `Vitrine` e `LaminaCard` ficam como estão.
2. **Sticky:** trocar `overflow-x-hidden` por `overflow-x-clip` na raiz do `PublicoLayout` (única alteração em arquivo existente além de `App.tsx` e menu). Sem isso o sticky da Fase 5 não funciona. Efeito colateral aceito: o header fixo volta a grudar em quiz, vitrine, arsenal, montar e resultado.
3. **Permissão:** RLS de escrita com `public.is_admin(auth.uid())` (só `cargo = 'admin'`). Como `/admin/*` também deixa `vendedor` entrar, o admin de landings mostra aviso de somente leitura para quem não é admin, em vez de erro ao salvar. Prévia de rascunho idem: só admin.
4. **Detalhes técnicos encontrados:**
   - `TituloPublico` é exportado de `src/components/publico/PublicoLayout.tsx` (não há arquivo próprio).
   - `prazo_entrega` e `garantia` existem em `catalogo_modelos` (text), mas não no tipo `ModeloRecomendavel`; o `landings.ts` declara o próprio tipo.
   - CTA `montar` aponta para `/montar?modelo=<nome_modelo>` (o configurador já pré-seleciona por esse parâmetro).
   - Sem vitest: os testes da Fase 2 seguem o padrão `node:test` dos `src/lib/*.test.ts`, rodando com `npx tsx --test`.
   - Sem lib de arrastar: ordenação por botões ↑ ↓, como no `DescubraConfig`.
   - Bucket `landings` criado no próprio SQL (`storage.buckets`), além das policies.

---

## Fase 0 — Preparação

- `git pull` na branch principal (o Lovable commita direto no GitHub).
- Criar a branch `feat/landings-categoria`.
- Ler `CLAUDE.md`, `src/App.tsx`, `src/lib/publico.ts`, `src/lib/recomendacao.ts`, `src/pages/publico/Vitrine.tsx`, `src/components/publico/*` e uma tela de admin parecida (ex.: `src/pages/admin/DescubraConfig.tsx`, `src/pages/admin/OfertasAdmin.tsx`).
- Ver como as migrations mais recentes foram escritas em `supabase/migrations/` (padrão de RLS com `public.is_admin(auth.uid())` e de buckets de storage).
- **Entrega:** um resumo curto do que encontrou e de qualquer conflito com este plano. Nenhum código ainda.

---

## Fase 1 — Banco de dados

Criar `supabase/migrations/<timestamp>_landings_categoria.sql` com:

### `landings_categoria`
| coluna | tipo | observação |
|---|---|---|
| id | uuid pk | |
| slug | text unique not null | ex.: `porte-velado` |
| titulo | text not null | |
| frase_abertura | text | tipografia de manifesto |
| subtitulo | text | |
| capa_url | text | |
| capa_tipo | text | `'imagem'` ou `'video'` |
| publicada | bool default false | |
| ordem | int default 0 | |
| filtro_casos_uso | text[] default '{}' | só para **sugerir** lâminas no admin |
| filtro_tipo_porte | text[] default '{}' | idem |
| texto_nivel_entrada / texto_nivel_ideal / texto_nivel_definitiva | text | frase de cada degrau |
| preco_entrada / preco_ideal / preco_definitiva | text | `'mostrar'`, `'a_partir'` ou `'consulta'` |
| cta_entrada / cta_ideal / cta_definitiva | text | `'detalhes'`, `'montar'` ou `'vendedor'` |
| mensagem_whatsapp | text | |
| created_at / updated_at | timestamptz | trigger de updated_at |

Padrões: entrada = `mostrar` + `detalhes`; ideal = `a_partir` + `montar`; definitiva = `consulta` + `vendedor`. Usar CHECK constraints nos enums.

### `landing_passos`
id, landing_id (fk, on delete cascade), ordem, titulo, texto, midia_url, midia_tipo (`'imagem'` ou `'video'`), foco (legenda opcional da mídia).

### `landing_laminas`
id, landing_id (fk cascade), modelo_id (fk `catalogo_modelos`, on delete cascade), ordem, nivel_override (`'entrada'`, `'ideal'`, `'definitiva'` ou null), texto_categoria, preco_override e cta_override (mesmos enums ou null), url_compra (link do produto na loja Shopify, opcional), destaque (bool). Unique (landing_id, modelo_id).

### `landing_eventos`
id, landing_id, evento (`'visita'`, `'fim_scroll'` ou `'clique_cta'`), modelo_id null, cta null, created_at. Índice em (landing_id, created_at).

### Segurança (RLS)
- `landings_categoria`: SELECT público só quando `publicada = true`. Admin lê e escreve tudo.
- `landing_passos` e `landing_laminas`: SELECT público só se a landing dona estiver publicada. Admin lê e escreve tudo.
- `landing_eventos`: INSERT liberado para `anon` e `authenticated`; SELECT só admin.
- GRANTs no mesmo padrão das migrations recentes.
- Bucket `landings`: leitura pública, upload, update e delete só para autenticados.

### Semente — "Porte velado" (textos provisórios)
- slug `porte-velado`, titulo "Porte velado", `publicada = false`, `filtro_tipo_porte = {velado}`.
- frase_abertura: **"Ninguém precisa saber. Mas você precisa ter."**
- subtitulo: "Lâminas feitas para andar com você sem aparecer."
- Passos (sem mídia por enquanto):
  1. **Some sob a roupa** — Lâmina curta, perfil baixo, nenhum volume aparente na cintura.
  2. **Fica no lugar** — Bainha e clipe pensados para o corpo: firme o dia inteiro, livre quando você precisa.
  3. **Encontra a mão sem olhar** — Empunhadura, anel e textura que dão aderência mesmo sob suor.
  4. **Discreta até no metal** — Acabamentos foscos que não refletem luz nem chamam atenção.
- Níveis: entrada "O primeiro passo no porte velado." · ideal "O equilíbrio para quem já usa todo dia." · definitiva "A peça definitiva, para quem não abre mão de nada."
- mensagem_whatsapp: "Olá! Vi a página de porte velado da Kaowz e quero saber mais"
- Lâminas: nenhuma (escolho no admin).

### ⚠️ Aplicar no banco do Lovable
A migration no repositório **não roda sozinha** no banco do projeto. Depois do merge (Fase 7), o SQL precisa ser executado no banco do Lovable. **Entrega desta fase:** além do arquivo da migration, mostre o SQL completo para eu poder aplicar, e me avise que esse passo é manual.

**Commit:** `feat(landings): tabelas, RLS e semente porte velado`

---

## Fase 2 — Camada de dados (`src/lib/landings.ts`)

- Interfaces `Landing`, `LandingPasso`, `LandingLamina` e `LaminaResolvida` (lâmina já com nível, preço e CTA finais).
- `carregarLanding(slug, { preview })`: busca a landing, os passos (ordenados) e as lâminas com join em `catalogo_modelos`. Descarta modelos que não estejam mais públicos.
- **Regras de resolução**, uma função pura cada, com testes rápidos se o projeto tiver vitest:
  - nível = `nivel_override` → `posicao_escada` do modelo → `'ideal'`;
  - texto = `texto_categoria` → `porque_texto` → `apresentacao_venda` (sem HTML);
  - exibição de preço = `preco_override` → padrão do nível na landing;
  - CTA = `cta_override` → padrão do nível;
  - formatar o preço: `mostrar` = "R$ 1.090,00", `a_partir` = "a partir de R$ 1.090,00", `consulta` = "Valor sob consulta";
  - destino do CTA: `detalhes` = `url_compra` ou `/catalogo/:id`; `montar` = `/montar`; `vendedor` = `linkWhatsApp()` de `src/lib/publico.ts` com a `mensagem_whatsapp` + " — " + nome da lâmina.
- `registrarEvento(landingId, evento, extra?)`: dispara e esquece, nunca quebra a página, e não registra em modo preview.
- `sugerirLaminas(filtros)` para o admin: modelos públicos que batem com casos de uso e porte, agrupados por `grupo_escada`.

**Commit:** `feat(landings): camada de dados e regras de exibição`

---

## Fase 3 — Admin (`/admin/landings`)

Rota com `ProtectedRoute requireAdmin` + `Layout`, e item no menu lateral junto das outras configurações públicas.

**Lista:** título, slug, publicada/rascunho, nº de lâminas, visitas e cliques dos últimos 30 dias, e os botões Editar, Ver página, Copiar link e Nova landing.

**Editor em abas:**
1. **Geral:** título, slug (gerado do título, editável), frase de abertura, subtítulo, capa (upload no bucket `landings` ou URL, imagem ou vídeo), publicada e mensagem de WhatsApp.
2. **Passos do scroll:** lista com ordem arrastável; cada passo tem título, texto, mídia (upload/URL) e foco. Adicionar e remover. Aviso se passar de 6 passos.
3. **Lâminas:**
   - Busca por nome, filtros de caso de uso e porte e agrupamento por `grupo_escada` (o catálogo tem muitas variações do mesmo modelo; o agrupamento ajuda a escolher uma por família).
   - Botão **"Sugerir pelo filtro"** que lista os modelos que batem com os filtros da landing, para eu marcar.
   - Cada lâmina escolhida mostra foto, nome, preço, nível (editável), texto para esta categoria, exibição de preço, CTA (padrão do nível ou override), URL de compra e destaque.
   - Agrupadas por nível, com ordem arrastável dentro de cada nível.
4. **Escada e conversão:** texto de cada nível e o padrão de preço e CTA por nível.

- Botão **Ver prévia** que abre `/categoria/:slug?preview=1`, mesmo em rascunho, só para admin logado.
- Mobile first e didático: rótulo claro e uma linha de ajuda em cada campo, porque outras pessoas do time vão usar.
- Arraste: use o que o projeto já tiver (procure por `dnd-kit` ou similar no `package.json`). Se não houver nada, use botões ↑ ↓ em vez de instalar lib.

**Commit:** `feat(landings): admin de landings por categoria`

---

## Fase 4 — Página pública: estrutura (sem animação ainda)

Rota pública `/categoria/:slug` em `src/pages/publico/LandingCategoria.tsx`. Componentes em `src/components/publico/landing/`.

Seções, nesta ordem:
1. **Abertura:** capa em tela cheia (vídeo mudo, em loop, `playsInline`, `preload="metadata"`), frase de abertura grande, subtítulo, indicador de "role para baixo" e um link discreto no topo, "Pular para as lâminas".
2. **Passos:** por enquanto uma lista simples, com mídia e texto.
3. **Escada de valor:** blocos Entrada → Ideal → Definitiva, cada um com o texto do nível e a grade das lâminas (cards no estilo do `LaminaCard`: foto, nome, texto, preço conforme a regra e CTA). Lâmina com destaque ganha selo. Nível sem lâmina não aparece.
4. **Comparativo:** a primeira lâmina de cada nível lado a lado, com prazo de entrega, garantia e preço conforme a regra. Só aparece com pelo menos 2 níveis. No celular, rolagem horizontal ou cards empilhados.
5. **Fechamento:** "Não sabe qual escolher?", com os botões **Fazer o quiz** (`/descubra`) e **Falar com um vendedor** (WhatsApp).

- Landing não publicada (sem preview de admin) ou slug inexistente: mensagem amigável com link para `/vitrine`.
- Estados de carregando com skeleton, no estilo da Vitrine.
- `<title>` e `meta description` com a frase de abertura (para o link ficar bonito no WhatsApp).

**Commit:** `feat(landings): página pública /categoria/:slug (estrutura)`

---

## Fase 5 — Scrollytelling

Transformar a seção de passos em **sticky scrollytelling**:

- **Celular:** a mídia fica fixa (sticky) na metade de cima da tela e os passos rolam embaixo, cada um ocupando cerca de 70–80% da altura da tela.
- **Desktop (`md:` para cima):** mídia sticky à direita e texto à esquerda.
- O passo ativo é detectado pelo scroll (`useScroll` com `target` em cada passo, ou `useInView`). Ao trocar de passo, a mídia faz crossfade com leve zoom (scale de 1.05 → 1).
- Legenda (`foco`) sobre a mídia e indicador de progresso (bolinhas ou barra fina).
- Passo sem mídia: usa a capa com zoom progressivo.
- Vídeo dentro do passo: só dá play quando o passo está ativo e pausa ao sair.
- **`useReducedMotion()` = true:** nada de sticky nem animação; cada passo vira um bloco estático com a mídia acima do texto.
- A abertura ganha um parallax suave na capa e um fade da frase conforme o scroll.

**Commit:** `feat(landings): scrollytelling dos passos`

---

## Fase 6 — Conversão e medição

- Animação de revelação dos cards ao entrar na tela (`whileInView`, uma vez só). Os cards do nível Definitiva ficam maiores e com revelação mais lenta.
- Registrar os eventos:
  - `visita` ao abrir a página;
  - `fim_scroll` quando o fechamento entra na tela (uma vez por sessão, controlado por `sessionStorage`);
  - `clique_cta` em todo CTA, com `modelo_id` e o tipo de CTA.
- Nada é registrado em modo preview.
- No admin, mostrar na lista e no editor: visitas, % que chegou ao fim e cliques por CTA (últimos 30 dias).

**Commit:** `feat(landings): eventos de conversão e métricas no admin`

---

## Fase 7 — Polimento, revisão e publicação

**Checklist (o agente confere e me mostra o resultado):**
- [ ] `npm run build` sem erros.
- [ ] Testado em viewport de celular (375 px) e desktop.
- [ ] Imagens fora da primeira dobra com `loading="lazy"`.
- [ ] Reduzir movimento testado (DevTools → Rendering → `prefers-reduced-motion`).
- [ ] Rascunho não aparece para visitante deslogado; preview funciona para admin.
- [ ] Nenhum arquivo da lista "não quebrar" do `CLAUDE.md` foi alterado (`git diff --stat` da branch).
- [ ] Adicionar ao `CLAUDE.md` uma seção curta "Landings por categoria" (tabelas, rotas e regras de nível, preço e CTA).

**Publicação (eu faço, com o agente me guiando):**
1. Abrir o PR de `feat/landings-categoria` e fazer o merge na branch principal.
2. Conferir no Lovable que o código chegou.
3. **Aplicar o SQL da Fase 1 no banco do Lovable** e conferir que as tabelas existem.
4. No admin: escolher as lâminas de Porte velado, subir capa e mídias dos passos e revisar os textos.
5. Abrir a prévia no celular, ajustar e publicar.

**Commit final:** `docs: landings por categoria no CLAUDE.md`

---

## Depois da primeira landing

- Divulgar o link de Porte velado e acompanhar visitas, % que chega ao fim e cliques por nível.
- Ajustar textos, ordem e regras de preço pelo admin (sem código).
- Criar a próxima categoria pelo botão **Nova landing**. O modelo é o mesmo, só muda o conteúdo.
