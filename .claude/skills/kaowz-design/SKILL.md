---
name: kaowz-design
description: Padrão de design do Sistema Kaowz — junta Emil Kowalski (acabamento e animação), Impeccable (qualidade, estados, acessibilidade) e Taste (anti "cara de IA") usando SÓ as cores e tokens que o projeto já tem em src/index.css. Use em qualquer trabalho de interface neste projeto: criar, redesenhar, revisar ou polir telas, componentes, cards, dashboards, painéis internos (Pronta Entrega, Financeiro, Triagem, Expedição), páginas públicas (catálogo, oferta, campanha), animações e layout mobile. Também quando o usuário disser que algo está feio, genérico, poluído, "com cara de IA", ou pedir para deixar mais limpo, minimalista ou profissional.
---

# Kaowz Design

Uma skill só, feita para este projeto. Ela resume as três skills de design instaladas e
prende tudo à paleta e aos componentes que já existem. **Quando houver conflito, vale esta
ordem:** pedido do usuário → este arquivo → CLAUDE.md → as skills de origem.

Para se aprofundar num assunto, abra a skill de origem:

| Assunto | Skill |
|---|---|
| Animação: se deve animar, curva, duração, interrupção | `animate`, `emil-design-eng` |
| Revisar animações existentes | `review-animations` |
| Animação travando | `animation-performance` |
| Celular parecendo "site" e não app | `mobile-native` |
| Testar com dados extremos (nome enorme, lista vazia) | `break-ui` |
| Auditoria de qualidade, acessibilidade, estados | `impeccable` (`audit`, `polish`, `harden`) |
| Tela de trabalho (dashboard, fila, admin) | `design-taste-frontend` → `references/app-screens.md` |
| Toasts (Sonner) | `ask-sonner` |

---

## 1. Primeiro: que tipo de tela é?

O modo define o quanto de "expressão" cabe (ideia do Impeccable).

- **Operar** — telas internas onde alguém trabalha: Pronta Entrega, Financeiro, Triagem,
  Expedição, Certificados, Insumos, Home, Simulador, Leads. Aqui a ambição é **precisão e calma**:
  ler rápido, achar a ação, não errar. Cor vai para dado e status, não para enfeite.
- **Persuadir** — páginas públicas que vendem: `/catalogo`, `/push-dagger-kaowz`, `/monte-seu-kit`,
  `/cases-patola`, ofertas e campanhas. Aqui cabe mais personalidade, foto grande, Bebas Neue.

Na dúvida, é **Operar**. A maior parte do sistema é ferramenta interna.

---

## 2. Cores — use só os tokens do projeto

Fonte: `src/index.css` (valores HSL; o tema escuro está em `.dark`). Em código, sempre a classe
Tailwind do token (`bg-card`, `text-muted-foreground`, `border-border`…). **Nunca** hex, `rgb()`,
`orange-500`, `zinc-*` ou `gray-*` em código novo.

### Papéis

| Token | Claro | Escuro | Para que serve |
|---|---|---|---|
| `background` | `220 16% 96%` cinza frio | `0 0% 10%` | Fundo da página |
| `card` / `popover` | branco | `0 0% 12%` | Superfícies (cards, dialogs, menus) |
| `foreground` | `220 14% 18%` | branco | Texto principal |
| `muted` / `muted-foreground` | `220 16% 94%` / `220 9% 46%` | `0 0% 15%` / `0 0% 60%` | Fundo discreto / texto secundário |
| `secondary` | `220 16% 93%` | `0 0% 15%` | Botão secundário, abas |
| `border` / `input` | `220 14% 89%` | `0 0% 20%` | Linhas e campos |
| `primary` = `accent` = `brand` | `24 92% 52%` laranja Kaowz | `24 84% 48%` | **A ação principal** e destaque de marca |
| `brand-hover` | `24 92% 45%` | `24 84% 42%` | Hover do laranja |
| `ring` | `24 84% 44%` | `28 90% 55%` | Anel de foco |
| `destructive` | `0 70% 45%` | `0 70% 50%` | Erro, excluir, **atrasado** |
| `warning` | `42 90% 36%` | `42 90% 60%` | Atenção, **vence hoje / amanhã** |
| `success` | `150 65% 32%` | `150 65% 55%` | Feito, pago, **pronto / enviado** |
| `chart-1…5` | laranja, verde, azul, vermelho, roxo | — | Só gráficos, nesta ordem |
| `sidebar-*` | grafite + laranja | — | Só a sidebar |
| `oferta-*`, `campanha-*` | tema escuro de venda | — | Só páginas públicas de oferta/campanha |

### Regras de cor

1. **Um laranja por área.** O laranja marca a ação principal e no máximo mais uma coisa. Se tudo é
   laranja, nada é importante. (Taste: "uma base, uma tinta, um destaque".)
2. **Cor tem significado fixo.** Vermelho = problema/atrasado, âmbar = atenção/hoje, verde = feito.
   Não use verde só "porque é bonito" nem vermelho para enfeite. Zero não ganha cor: um contador
   "Atrasados: 0" fica neutro.
3. **Cor no dado, não na moldura.** Em telas de Operar, o cromo (cabeçalhos, bordas, navegação) é
   neutro. A cor aparece no número que importa, no status, na ação.
4. **Fundos de status são suaves:** `bg-destructive/10` + `border-destructive` + `text-destructive`.
   Fundo cheio (`bg-destructive`) só em botão de ação perigosa ou alerta crítico.
5. **Texto sobre cor:** `text-primary-foreground` / `text-destructive-foreground` (brancos). Para
   `success` e `warning` não há token de texto — use `text-white` no fundo cheio.
6. **Texto corrido na cor cheia** (`text-foreground`). `text-muted-foreground` só para apoio
   (datas, legendas, números secundários). Tela inteira em cinza parece inacabada.
7. **Modo escuro e Modo TV:** adicionar a classe `dark` num container troca todos os tokens.
   Não crie cores novas para o escuro.
8. **Token novo só se for inevitável** — e aí ele entra no `index.css` em `:root` **e** em `.dark`,
   em HSL, com comentário dizendo para que serve. Pergunte antes.

> Legado: ainda existe `zinc-*`, `orange-*` e gradiente laranja no código (ex.: card de meta na Home,
> páginas de oferta). **Não "corrija" o que está fora do escopo do pedido** — só não repita em código novo.

---

## 3. Tipografia

- **Inter** (`font-sans`) em tudo. **Bebas Neue** (`font-bebas`) só como título em páginas de
  Persuadir. Nunca mais que essas duas.
- **Números sempre com `tabular-nums`** (valores, contadores, horários, tabelas) para não "dançar".
- Poucos tamanhos visíveis por tela: um grande (o número ou título que importa), o texto, e um pequeno.
  Em Operar, título de página `text-xl sm:text-2xl`; sem "hero".
- Sem rótulo pequeno em CAIXA ALTA espaçada acima de títulos ("eyebrow"). O título fala sozinho.
- Sem monospace como enfeite — só para código de rastreio, IDs e números de pedido quando ajudar a ler.
- Escreva na língua da operação: "Envio concluído", "Aguardando rastreio do Bling", "Falta: certificado",
  não "Itens", "Registros", "Status". Datas `dd/MM/yyyy`, valores `R$ 1.090,00`.

---

## 4. Superfícies, bordas e profundidade

- Card = `bg-card border` e **sem sombra parado**. Sombra só no que flutua (dialog, popover, menu).
  Separação entre áreas: um degrau de tom (`bg-background` → `bg-card` → `bg-muted`) ou 1px de borda.
- **Raio:** siga o que a tela já usa. Painéis internos de operação (Pronta Entrega e os novos módulos
  de expedição) usam `rounded-none`. O resto do app usa o padrão shadcn (`rounded-lg`/`rounded-xl`).
  Não misture raios na mesma tela.
- Nada de card dentro de card, linha de cards iguais com ícone em círculo colorido, sparkline em KPI,
  gradiente (fundo, botão ou texto), vidro/blur decorativo, emoji no lugar de ícone. Ícones: `lucide-react`.
- Faixa lateral colorida em card **só quando carrega significado** (ex.: a faixa de prazo da Pronta
  Entrega). Nunca como decoração.
- **KPI é tipografia, não azulejo:** número grande + rótulo curto. Sem ícone, sem "+12%" inventado.

---

## 5. Movimento (Emil Kowalski)

Antes de animar, responda em ordem:

1. **Deve animar?** Ação feita dezenas de vezes por dia (marcar checkbox, trocar aba, atalho de
   teclado) → **não anima** ou anima quase nada. Dialog, drawer, toast → animação padrão.
   Momento raro (meta batida) → pode ter um toque de alegria.
2. **Para quê?** Feedback, mostrar mudança de estado, evitar que algo "pule". "Fica bonito" não basta.
3. **Curva:** entrando/saindo → ease-out forte. Movendo na tela → ease-in-out. **Nunca ease-in.**
   - ease-out: `ease-[cubic-bezier(0.23,1,0.32,1)]`
   - ease-in-out: `ease-[cubic-bezier(0.77,0,0.175,1)]`
   - drawer: `ease-[cubic-bezier(0.32,0.72,0,1)]`
4. **Duração:** botão 100–160ms · tooltip 125–200ms · dropdown 150–250ms · dialog/drawer 200–500ms.
   Interface fica abaixo de 300ms.

Regras fixas:
- Botão responde ao toque: `active:scale-[0.97]` com `transition-transform duration-150`.
- Nunca aparecer de `scale(0)`: comece em `scale-95 opacity-0`.
- Anime só `transform` e `opacity`. Nunca `transition-all`: nomeie a propriedade.
- Saída mais rápida que a entrada.
- Respeite `motion-reduce:` (troque movimento por fade ou nada).
- Hover só em quem tem mouse: o Tailwind 3 do projeto aplica `hover:` também no toque — para efeitos
  de hover que atrapalham no celular, use `[@media(hover:hover)]:hover:…`.

---

## 6. Celular

- Alvos de toque com **no mínimo 44px** de altura (`h-11` / `min-h-11`).
- A `TopNav` é `sticky top-0 h-14`. Algo fixo abaixo dela usa `sticky top-14`.
- `overflow-x-hidden` num ancestral **quebra** `position: sticky` — use `overflow-x-clip`
  (veja `src/components/Layout.tsx`).
- Altura de tela cheia com `dvh`, não `vh`.
- Inputs com fonte ≥16px no celular para o iOS não dar zoom.
- Colunas lado a lado viram **uma coluna ou abas** no celular. Nada de rolagem horizontal da página.
- Detalhes no celular abrem em `Sheet` de baixo; no desktop em `Dialog` (padrão do `PedidoDetalhes`).

---

## 7. Estados e acabamento (Impeccable)

Toda tela entregue tem:
- **Carregando**, **vazio** (com frase útil: o que vai aparecer ali), **erro** (o que houve e como
  resolver) e **sucesso** (toast `sonner`, com "Desfazer" quando a ação for reversível).
- **Hover, foco visível** (`focus-visible:ring-2 ring-ring`), **desabilitado** e **ocupado** (spinner
  `Loader2` no botão, botão desabilitado durante o salvamento).
- **Contraste:** texto ≥ 4.5:1, texto grande ≥ 3:1. `muted-foreground` sobre `muted` é o limite — não
  vá mais claro.
- **Dados reais e extremos:** nome enorme, pedido com 9 lâminas, lista vazia, valor zero. Use os casos
  do CLAUDE.md (Marcus Felipe Brito com 9 lâminas, Daniel Matias com destinatário diferente).
- Zero aparece como `0`, valor ausente como `—`.

---

## 8. Projeto

- Componentes de `@/components/ui/` (shadcn), toast de `sonner`, ícones `lucide-react`,
  `cn()` de `@/lib/utils`, dados com TanStack Query, `supabase` de `@/integrations/supabase/client`.
- Não adicione biblioteca de UI ou de animação sem perguntar (CSS + Tailwind resolvem quase tudo).
- Código legível: componentes pequenos, uma ideia por arquivo, sem JSX inteiro numa linha.

---

## 9. Como trabalhar

1. Defina o modo (Operar ou Persuadir) e a **pergunta que a tela responde** ("o que está atrasado?").
2. Leia a tela e os componentes ao redor. Refinar preserva identidade; só redesenhe se for pedido.
3. Construa com os tokens acima. Primeiro hierarquia e espaço, depois cor, por último movimento.
4. **Olhe o resultado.** Com o MCP do Playwright, abra a tela em **390px** (celular) e **1440px**
   (PC) e confira: hierarquia, estados, overflow, foco, modo escuro quando existir. Corrija tudo o
   que uma olhada mostrar antes de olhar de novo.
5. Rode `npm run build`.

### Formato de revisão

Ao revisar interface, responda numa tabela (formato do Emil):

| Antes | Depois | Por quê |
|---|---|---|
| `bg-orange-500` | `bg-primary` | Token da marca; acompanha o modo escuro |
| `transition-all duration-300` | `transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]` | Propriedade explícita e curva forte |
| Card com `shadow-lg` parado | `border bg-card` | Sombra só no que flutua |
