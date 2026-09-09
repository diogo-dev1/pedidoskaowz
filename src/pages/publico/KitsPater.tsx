import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, Check, Gift, MessageCircle, PackagePlus, Shield, Sparkles, Star, Truck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import imgSandvikCompleto from '@/assets/kit-pater-sandvik-completo.jpg';
import imgSandvikTriade from '@/assets/kit-pater-sandvik-triade.jpg';
import imgInox420Triade from '@/assets/kit-pater-inox-420-triade.jpg';
import imgInox420Completo from '@/assets/kit-pater-inox-420-completo.jpg';

const WHATSAPP_NUMBER = '5528999025695';

const kits = [
  {
    id: 'sandvik-completo',
    nome: 'Kit Pater Sandvik Completo',
    imagem: imgSandvikCompleto,
    caso: 'O conjunto definitivo para quem leva o churrasco a sério. Completo, equilibrado e pronto para qualquer corte.',
    link: 'https://kaowz.com.br/products/kit-pater-defensor-provisor-sandvik',
    publico: 'experiente',
  },
  {
    id: 'sandvik-triade',
    nome: 'Kit Pater Sandvik Tríade',
    imagem: imgSandvikTriade,
    caso: 'A tríade essencial: chef, trinchante e faca de uso geral. Para quem quer começar com o melhor.',
    link: 'https://kaowz.com.br/products/kit-pater-defensor-provisor-sandvik-triade',
    publico: 'experiente',
  },
  {
    id: 'inox-420-triade',
    nome: 'Kit Pater Inox 420 Tríade',
    imagem: imgInox420Triade,
    caso: 'Praticidade do inox 420 com o mesmo corte afiado Kaowz. Ideal para o dia a dia na cozinha e no churrasco.',
    link: 'https://kaowz.com.br/products/kit-churrasco-kaowz-grafite-3-itens',
    publico: 'inicio',
  },
  {
    id: 'inox-420-completo',
    nome: 'Kit Pater Inox 420 Completo',
    imagem: imgInox420Completo,
    caso: 'Versatilidade completa em aço inox 420. Presente de peso para quem valoriza ferramentas que duram gerações.',
    link: 'https://kaowz.com.br/products/kit-pater-defensor-provisor-inox-420',
    publico: 'inicio',
  },
];

const diferenciais = [
  {
    icone: Shield,
    titulo: 'Aço de verdade',
    texto: 'Sandvik 12C27 e Inox 420 tratados termicamente. Fio que mantém o corte e resistência que não se dobra com o uso.',
  },
  {
    icone: Sparkles,
    titulo: 'Acabamento artesanal',
    texto: 'Cada peça passa por polimento, ajuste de encaixe e inspeção manual. Não sai da bancada até estar no padrão Kaowz.',
  },
  {
    icone: Truck,
    titulo: 'Feito para durar',
    texto: 'Materiais selecionados, soldas limpas e cabos ergonomicamente desenhados para anos de uso intenso.',
  },
];

function whatsappLink(mensagem: string) {
  const text = encodeURIComponent(mensagem);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

export default function KitsPater() {
  const [revelado, setRevelado] = useState(false);
  const bifurcacaoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setRevelado(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const scrollToBifurcacao = () => {
    bifurcacaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-zinc-950 text-zinc-100">
      {/* HERO */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-4 py-20 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.18),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(234,179,8,0.10),transparent_40%)]" />

        <div className={`relative z-10 max-w-4xl transition-all duration-700 ${revelado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-red-500">
            Cutelaria Artesanal Kaowz
          </p>
          <h1 className="font-bebas text-6xl font-normal uppercase leading-[0.9] tracking-tight text-white sm:text-7xl md:text-8xl lg:text-9xl">
            A ferramenta certa<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-yellow-500">
              no momento certo
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300 md:text-xl">
            No churrasco, na cozinha ou no campo, uma lâmina ruim te deixa na mão.
            Os Kits Pater foram feitos para quem não aceita depender de ferramenta inferior.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              onClick={scrollToBifurcacao}
              size="lg"
              className="h-14 rounded-none bg-red-600 px-10 text-lg font-semibold uppercase tracking-wider text-white hover:bg-red-700"
            >
              Escolher meu kit
            </Button>
            <Link
              to="/vitrine"
              className="text-sm font-medium uppercase tracking-widest text-zinc-400 transition-colors hover:text-white"
            >
              Ver todas as lâminas
            </Link>
          </div>
        </div>

        <button
          onClick={scrollToBifurcacao}
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-zinc-500 transition-colors hover:text-red-500"
          aria-label="Rolar para baixo"
        >
          <ArrowDown className="h-6 w-6 animate-bounce" />
        </button>
      </section>

      {/* HISTÓRIA / AUTORIDADE */}
      <section className="relative border-y border-zinc-900 bg-zinc-950 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
                Nossa declaração
              </p>
              <h2 className="font-bebas text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl md:text-6xl">
                Ferramenta é compromisso
              </h2>
            </div>
            <div className="space-y-5 text-base leading-relaxed text-zinc-300 md:text-lg">
              <p>
                A Kaowz nasceu da recusa em aceitar o descartável. Cada kit que sai da nossa bancada carrega
                aço selecionado, tratamento térmico controlado e o cuidado de quem entende que uma lâmina
                boa não corta apenas carne — ela respeita quem a usa.
              </p>
              <p>
                Usamos aço Sandvik 12C27 e Inox 420 em processos artesanais que priorizam o equilíbrio
                entre fio, durabilidade e ergonomia. Não fazemos volume. Fazemos ferramentas que você
                passa adiante.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {diferenciais.map((item) => (
              <div
                key={item.titulo}
                className="group border border-zinc-900 bg-zinc-900/40 p-6 transition-colors hover:border-red-900/50 hover:bg-zinc-900/70"
              >
                <item.icone className="mb-4 h-7 w-7 text-yellow-500" />
                <h3 className="font-bebas text-2xl uppercase tracking-wide text-white">{item.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APRESENTAÇÃO DA LINHA */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-red-500">A linha Pater</p>
            <h2 className="font-bebas text-4xl uppercase tracking-tight text-white sm:text-5xl md:text-6xl">
              Kits para cada propósito
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {kits.map((kit) => (
              <a
                key={kit.id}
                href={kit.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col overflow-hidden border border-zinc-800 bg-zinc-900/30 transition-all hover:-translate-y-1 hover:border-red-800/60 hover:bg-zinc-900/60"
              >
                <div className="relative aspect-square overflow-hidden bg-zinc-950">
                  <img
                    src={kit.imagem}
                    alt={kit.nome}
                    width={1024}
                    height={1024}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-bebas text-2xl uppercase tracking-wide text-white">{kit.nome}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{kit.caso}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-400 transition-colors group-hover:text-red-300">
                    Ver na loja <span aria-hidden>→</span>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* PROVA / DIFERENCIAL */}
      <section className="border-y border-zinc-900 bg-zinc-900/20 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">Qualidade comprovada</p>
              <h2 className="font-bebas text-4xl uppercase leading-none tracking-tight text-white sm:text-5xl md:text-6xl">
                Aço, fio e garantia vitalícia
              </h2>
              <p className="mt-6 text-base leading-relaxed text-zinc-300 md:text-lg">
                Cada Kit Pater é acompanhado de certificado de autenticidade e garantia vitalícia contra defeitos
                de fabricação. Não vendemos apenas facas. Vendemos tranquilidade para quem usa.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  'Aço Sandvik 12C27 e Inox 420 tratados termicamente',
                  'Corte afiado e retenção de fio superior',
                  'Cabos ergonomicamente desenhados',
                  'Garantia vitalícia Kaowz',
                ].map((texto) => (
                  <li key={texto} className="flex items-start gap-3 text-sm text-zinc-300 md:text-base">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    {texto}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden border border-zinc-800 bg-zinc-950">
              <img
                src={imgSandvikCompleto}
                alt="Kit Pater Sandvik Completo em detalhe"
                width={1024}
                height={1024}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950 to-transparent p-6 pt-20">
                <div className="flex items-center gap-2 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <p className="mt-2 text-sm text-zinc-300">
                  "A única coisa que muda é que você nunca mais aceita usar outra coisa."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BIFURCAÇÃO FINAL */}
      <section ref={bifurcacaoRef} className="relative px-4 py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-red-500">Escolha seu caminho</p>
            <h2 className="font-bebas text-4xl uppercase tracking-tight text-white sm:text-5xl md:text-6xl">
              Qual é a sua situação?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
              Selecione o bloco que faz sentido para você. Cada caminho leva à melhor escolha.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Bloco A — Já tenho uma lâmina Kaowz */}
            <div className="flex flex-col border border-zinc-800 bg-zinc-900/40 p-7 transition-all hover:border-yellow-600/50 hover:bg-zinc-900/70">
              <div className="mb-5 flex h-12 w-12 items-center justify-center bg-yellow-500/10 text-yellow-500">
                <PackagePlus className="h-6 w-6" />
              </div>
              <h3 className="font-bebas text-3xl uppercase tracking-wide text-white">Já tenho uma lâmina Kaowz</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">
                Você já sentiu o corte Kaowz nas mãos. Agora é hora de completar o conjunto com as peças
                que faltam no seu arsenal.
              </p>
              <div className="mt-6 space-y-3">
                <a
                  href="https://kaowz.com.br/products/kit-pater-defensor-provisor-sandvik"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full rounded-none bg-yellow-600 py-6 text-sm font-bold uppercase tracking-wider text-zinc-950 hover:bg-yellow-500">
                    Completar com Sandvik Completo
                  </Button>
                </a>
                <a
                  href="https://kaowz.com.br/products/kit-pater-defensor-provisor-sandvik-triade"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="w-full rounded-none border-zinc-700 py-6 text-sm font-bold uppercase tracking-wider text-white hover:border-yellow-600 hover:bg-zinc-800"
                  >
                    Completar com Tríade Sandvik
                  </Button>
                </a>
              </div>
            </div>

            {/* Bloco B — Estou começando agora */}
            <div className="relative flex flex-col border border-red-900/50 bg-gradient-to-b from-zinc-900/60 to-zinc-950/60 p-7 shadow-2xl shadow-red-950/20 transition-all hover:border-red-500/60 hover:bg-zinc-900/80">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                Recomendado
              </div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center bg-red-500/10 text-red-500">
                <UserPlus className="h-6 w-6" />
              </div>
              <h3 className="font-bebas text-3xl uppercase tracking-wide text-white">Estou começando agora</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">
                Não tem nenhuma peça ainda? O Kit Urban EDC e o Kit Pater Inox 420 são os pontos de entrada
                perfeitos para começar com qualidade Kaowz.
              </p>
              <div className="mt-6 space-y-3">
                <a
                  href="https://kaowz.com.br/products/kit-urban-edc"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full rounded-none bg-red-600 py-6 text-sm font-bold uppercase tracking-wider text-white hover:bg-red-700">
                    Começar com Urban EDC
                  </Button>
                </a>
                <a
                  href="https://kaowz.com.br/products/kit-pater-defensor-provisor-inox-420"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="w-full rounded-none border-zinc-700 py-6 text-sm font-bold uppercase tracking-wider text-white hover:border-red-600 hover:bg-zinc-800"
                  >
                    Começar com Pater Inox 420
                  </Button>
                </a>
              </div>
            </div>

            {/* Bloco C — Quero presentear alguém */}
            <div className="flex flex-col border border-zinc-800 bg-zinc-900/40 p-7 transition-all hover:border-red-600/50 hover:bg-zinc-900/70">
              <div className="mb-5 flex h-12 w-12 items-center justify-center bg-red-500/10 text-red-500">
                <Gift className="h-6 w-6" />
              </div>
              <h3 className="font-bebas text-3xl uppercase tracking-wide text-white">Quero presentear alguém</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">
                Um Kit Pater não é apenas um presente. É um legado. Fale com a gente no WhatsApp e montamos
                a entrega com cuidado.
              </p>
              <div className="mt-6 space-y-3">
                <a
                  href={whatsappLink('Olá! Tenho interesse em presentear alguém com um Kit Pater. Pode me ajudar a escolher o melhor conjunto?')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full rounded-none bg-green-600 py-6 text-sm font-bold uppercase tracking-wider text-white hover:bg-green-700">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Pedir pelo WhatsApp
                  </Button>
                </a>
                <a
                  href="https://kaowz.com.br/products/kit-pater-defensor-provisor-sandvik"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="w-full rounded-none border-zinc-700 py-6 text-sm font-bold uppercase tracking-wider text-white hover:border-red-600 hover:bg-zinc-800"
                  >
                    Ver Kit Sandvik Completo
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER SIMPLES */}
      <footer className="border-t border-zinc-900 px-4 py-10 text-center">
        <p className="font-bebas text-2xl uppercase tracking-widest text-white">Kaowz Lâminas</p>
        <p className="mt-2 text-xs uppercase tracking-widest text-zinc-600">
          Cutelaria artesanal · Garantia vitalícia · Kaowz.com.br
        </p>
      </footer>
    </div>
  );
}
