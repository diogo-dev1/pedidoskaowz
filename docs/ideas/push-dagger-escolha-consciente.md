# Push Dagger: escolha consciente

> Status: **validado pela Kaowz em 2026-10-24** — em implementação.
> "Entenda a diferença" fica **para depois**.
> Os valores marcados como **referência** vêm de fontes públicas de mercado e precisam ser trocados pelos da Kaowz.

## Problema

Como podemos fazer o cliente, que não entende de materiais, escolher cada opção da Push Dagger com base em dados reais e entendendo o que eles significam, sem perder o foco na faca e no preço?

## Direção escolhida

Cada opção mostra **um dado técnico + uma tradução curta**. Cada grupo tem **uma frase fixa** explicando o que aquele dado significa, e um link **"Entenda a diferença"** que abre o informativo já existente (`info_etapas_customizacao`, editável em Admin → Gerenciar Informativos).

Textos e números ficam **editáveis no admin desde o início**, salvos em `push_dagger_config` (tabela chave/valor que já existe — sem migração).

```
AÇO
┌────────────────┐ ┌────────────────┐
│ SANDVIK 14C28N │ │  INOX AISI 420 │
│ 60 HRC         │ │ 58 HRC         │
└────────────────┘ └────────────────┘
HRC = dureza do aço                Entenda a diferença
```

## Conteúdo (preencher / corrigir)

### Aço — dado do grupo: dureza (HRC)

> Decisão: no aço aparece **só o dado** (HRC), sem tradução curta e sem frase longa.
> Tradução nos demais grupos: **decidir grupo a grupo**.

**Frase do grupo:** sem frase longa (minimalista). Legenda mínima confirmada ✅: *HRC = dureza do aço*. O detalhe vai para o "Entenda a diferença".

| Opção | Dado | Tradução | Base da pesquisa | Kaowz confirma |
|---|---|---|---|---|
| Sandvik 14C28N | **60 HRC** ✅ | — (sem tradução) | Faixa oficial do fabricante (Alleima/Sandvik): **55–62 HRC**; faixa prática citada no mercado: 58–62 HRC. Aço sueco desenvolvido para fio afiado, estável e resistente à corrosão. | [x] 60 HRC (confirmado pela Kaowz) |
| Inox AISI 420 | **58 HRC** ✅ | — (sem tradução) | Faixa típica em facas: **47–55 HRC**, conforme o teor de carbono e a têmpera; exemplo comercial: 52–54 HRC. | [x] 58 HRC (confirmado pela Kaowz) · variante não informada — exibir só "Inox AISI 420" |

### Empunhadura — dado do grupo: característica

> Decisão: cada opção mostra **só a característica**, sem tradução e sem frase de grupo. Sem citar tecido nem textura.

| Opção | Dado | Base da pesquisa |
|---|---|---|
| G10 Black | **À prova d'água** ✅ | Fibra de vidro com resina epóxi, prensada a quente: absorção praticamente nula e aparência que não muda com o tempo. |
| Micarta Grafite | **Toque natural** ✅ | Tecido com resina fenólica: toque mais "quente", ganha aspecto de couro usado com os anos. |

> Composição e detalhes ficam para o "Entenda a diferença".

### Acabamento — dado do grupo: característica

> Decisão: cada opção mostra **só a característica** (junto da amostra com foto). Sem legenda de grupo.

| Opção | Dado | Base da pesquisa |
|---|---|---|
| Acetinada | **Brilho clássico** ✅ | Lixamento direcional: riscos finos em uma direção que refletem a luz; mostra mais as marcas de uso. |
| Stone Washed | **Esconde riscos** ✅ | Tamboreado com abrasivos: textura que disfarça arranhões do dia a dia; pouca manutenção. |
| Tactical | **Não reflete** ✅ | **Cerakote** (confirmado): revestimento cerâmico aplicado e curado — fosco, pouco reflexo e proteção extra contra corrosão. |

### Versão — dado do grupo: material

> Decisão: cada opção mostra **só o dado**. Peso não será usado.

| Opção | Dado |
|---|---|
| Metálica | **Aço** ✅ |
| Non Metallic | **G10** ✅ (sem nenhuma parte metálica) |
| Blue (Treino) | **Para treino** ✅ |

> ⚠️ O texto atual do admin descreve a Non Metallic como "Polímero técnico de alta resistência" (`refSub`) e "indetectável a sensores" (`heroDesc`). O material correto é **G10** — corrigir no admin. E avaliar com cuidado o uso de "indetectável", que pode ter implicação legal.

### Tamanho — dado do grupo: comprimento da lâmina

> Decisão: cada opção mostra **só o comprimento da lâmina**.

| Opção | Dado | Fonte |
|---|---|---|
| Standard | **62,5 mm** ✅ | Código atual (`SIZE_LIST`: 62,49 mm) |
| Compact | **52,7 mm** ✅ | Código atual (52,74 mm) |
| Micro | **37,2 mm** ✅ | Código atual (37,16 mm) |

## Suposições a validar

- [ ] **Tem que ser verdade:** os números são medidos ou garantidos pela Kaowz. → você preenche as colunas "Kaowz confirma".
- [ ] **Deveria ser verdade:** "dado + tradução" fica legível em botões de ~110 px no celular. → protótipo e print em 390 px antes de ligar ao admin.
- [ ] **Pode ser verdade:** entender as diferenças leva a escolher opções mais caras. → registrar o clique no WhatsApp com a configuração e comparar antes/depois.

## Escopo da primeira versão

- Página: dado + tradução em cada opção; frase fixa por grupo; link "Entenda a diferença".
- Admin (`/admin/push-dagger-kaowz`): seção "Especificações" para editar dado, tradução e frase de cada opção.
- Ligar "Entenda a diferença" ao informativo existente.

## Não vamos fazer agora

- **Notas/estrelas inventadas** ("Corte ●●●○○") — parecem objetivas e não são; o número real faz esse papel com honestidade.
- **Ficha técnica completa** (composição química, % de carbono) — pertence ao "Entenda a diferença", não ao botão.
- **Frase que muda a cada escolha** — deixa a tela mexendo; a frase é fixa por grupo.
- **Preço por opção** — continua fora; a barra do topo mostra o total mudando.

### Bainha extra — dado do grupo: característica

| Opção | Dado |
|---|---|
| Velada | **Porte discreto** ✅ |
| Multifuncional | **Várias posições** ✅ |

## Perguntas em aberto

- Nenhuma no momento. Tudo validado pela Kaowz em 2026-10-24.

## Fontes

- Alleima (Sandvik) — 14C28N: https://alleima.com/se/products/strip-steel/strip-products/knife-steel/our-knife-steels/14c28n
- zknives — 14C28N: https://zknives.com/knives/steels/14c28n.shtml
- Koi Knives — Sandvik: https://koiknives.com/blogs/knife-steel-makers/sandvik
- steel-guide.eu — 1.4031 (420): https://www.steel-guide.eu/product/1.4031
- TBS — canivete AISI 420 (52–54 HRC): https://tbs-online.de/gb/en/New/Tool/Hand-tools/TBS-Pocket-knife-with-AISI-420-stainless-steel-blade/One-handed-knife-TBS-AISI-420-sid2496936.html
- Montana Knife Company — G10: https://www.montanaknifecompany.com/blogs/news/g10-knife-handle
- BladeForums — Micarta vs G10: https://www.bladeforums.com/threads/micarta-vs-g10.822607
- CJRB — Stonewash, Satin ou Black PVD: https://cjrb.net/blogs/knife-knowledge/stonewash-vs-satin-vs-black-pvd-blade-finish-guide
- Artisan Cutlery — guia de acabamentos: https://artisancutlery.net/blogs/ai/knife-finish-guide-stonewash-vs-satin-vs-bead-blast-vs-pvd-dlc-coating
- GP Knives — Cold Steel FGX Push Blade II: https://www.gpknives.com/cold-steel-fgx-push-blade-ii-92fpb
