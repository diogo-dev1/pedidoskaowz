import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import { useSimuladorConfig } from '@/hooks/useSimuladorConfig';
import {
  BRL,
  calcItem,
  classeDo,
  espacadorIdx,
  newItem,
  precoClasse,
  textoItem,
  type ItemCfg,
  type Opcao,
  type SimuladorData,
} from '@/lib/simuladorData';
import {
  carregarModelosPublicos,
  gravarToken,
  lerRespostas,
  lerToken,
  linkWhatsApp,
  mensagemConfiguracao,
  salvarProjeto,
  traducao,
} from '@/lib/publico';
import { etiquetasDoPerfil, type ModeloRecomendavel } from '@/lib/recomendacao';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Swords, Check } from 'lucide-react';

const Secao = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="font-bebas text-xl tracking-widest text-[hsl(0_0%_70%)]">{titulo}</h2>
    <div className="grid gap-2 sm:grid-cols-2">{children}</div>
  </section>
);

function CartaoOpcao({
  nome,
  extra,
  ativo,
  imagem,
  onClick,
}: {
  nome: string;
  extra: number;
  ativo: boolean;
  imagem?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all duration-200 ${
        ativo
          ? 'border-[hsl(42_72%_58%)] bg-[hsl(42_72%_58%/0.08)]'
          : 'border-[hsl(0_0%_16%)] bg-[hsl(0_0%_8%)] hover:border-[hsl(0_72%_45%)]'
      }`}
    >
      {imagem && <img src={imagem} alt={nome} loading="lazy" className="h-12 w-12 rounded object-cover" />}
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-bebas text-lg tracking-wide">{nome}</span>
          <span className="shrink-0 text-xs text-[hsl(42_72%_58%)]">
            {extra > 0 ? `+ ${BRL(extra)}` : 'incluso'}
          </span>
        </span>
        {traducao(nome) && <span className="mt-0.5 block text-xs text-[hsl(0_0%_58%)]">{traducao(nome)}</span>}
      </span>
      {ativo && <Check className="h-4 w-4 shrink-0 text-[hsl(42_72%_58%)]" />}
    </button>
  );
}

const Cores = ({ cores, valor, onPick }: { cores: string[]; valor: string | null; onPick: (c: string) => void }) => (
  <div className="col-span-full flex flex-wrap gap-1.5 pb-1">
    {cores.map((c) => (
      <button
        key={c}
        type="button"
        onClick={() => onPick(c)}
        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
          valor === c
            ? 'border-[hsl(42_72%_58%)] text-[hsl(42_72%_58%)]'
            : 'border-[hsl(0_0%_20%)] text-[hsl(0_0%_60%)]'
        }`}
      >
        {c}
      </button>
    ))}
  </div>
);

export default function Montar() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data } = useSimuladorConfig();
  const [cfg, setCfg] = useState<ItemCfg>(() => newItem());
  const [catalogo, setCatalogo] = useState<ModeloRecomendavel[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [dialogo, setDialogo] = useState(false);
  const [nomeProjeto, setNomeProjeto] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => { carregarModelosPublicos().then(setCatalogo); }, []);

  // Modelo vindo do resultado do quiz / da vitrine.
  useEffect(() => {
    const alvo = params.get('modelo');
    if (!alvo) return;
    const idx = data.modelos.findIndex(
      (m) => m.nome.toLowerCase().trim() === alvo.toLowerCase().trim(),
    );
    const aprox = idx >= 0 ? idx : data.modelos.findIndex((m) => alvo.toLowerCase().includes(m.nome.toLowerCase()));
    if (aprox >= 0) setCfg((c) => ({ ...c, modeloIdx: aprox }));
  }, [params, data.modelos]);

  const modelo = cfg.modeloIdx !== null ? data.modelos[cfg.modeloIdx] : null;
  const classe = classeDo(modelo);
  const total = calcItem(data, cfg);
  const imagemModelo = useMemo(
    () => catalogo.find((m) => m.nome_modelo.toLowerCase() === (modelo?.nome ?? '').toLowerCase())?.imagem_modelo ?? null,
    [catalogo, modelo],
  );
  const eIdx = espacadorIdx(data);
  const empunhaduras = data.empunhaduras.filter((_, i) => i !== eIdx);
  const preco = (o: Opcao | undefined) => precoClasse(o?.precos ?? {}, classe);

  const resumo = useMemo(() => {
    const linhas = textoItem(data, cfg, 1).slice(1);
    return { titulo: modelo?.nome ?? '', linhas, preco: total };
  }, [data, cfg, modelo, total]);

  const abrirWhatsApp = () => {
    if (!modelo) { toast.error('Escolha uma lâmina primeiro'); return; }
    window.open(linkWhatsApp(mensagemConfiguracao(resumo, nomeProjeto || undefined)), '_blank');
  };

  const salvar = async () => {
    if (!modelo) { toast.error('Escolha uma lâmina primeiro'); return; }
    if (!nomeProjeto.trim()) { toast.error('Dê um nome ao projeto'); return; }
    setSalvando(true);
    try {
      const respostas = lerRespostas();
      const res = await salvarProjeto({
        token: lerToken(),
        whatsapp: whatsapp.replace(/\D/g, ''),
        nome: nomeProjeto.trim(),
        modeloNome: modelo.nome,
        preco: total,
        resumo: resumo.linhas.join('\n'),
        configuracao: cfg,
        perfil: respostas,
        etiquetas: respostas ? etiquetasDoPerfil(respostas) : [],
      });
      gravarToken(res.token);
      toast.success('Projeto guardado no seu arsenal');
      navigate(`/arsenal/${res.token}`);
    } catch {
      toast.error('Não foi possível salvar agora');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <PublicoLayout>
      <TituloPublico>Monte a sua</TituloPublico>
      <p className="mt-1 text-sm text-[hsl(0_0%_58%)]">
        Escolha peça por peça. O valor acompanha cada troca — sem cadastro, sem compromisso.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Secao titulo="Lâmina">
            <div className="col-span-full">
              <select
                value={cfg.modeloIdx ?? ''}
                onChange={(e) =>
                  setCfg((c) => ({ ...c, modeloIdx: e.target.value === '' ? null : Number(e.target.value) }))
                }
                className="w-full rounded border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_8%)] px-3 py-2.5 text-sm outline-none focus:border-[hsl(42_72%_58%)]"
              >
                <option value="">Escolha a lâmina</option>
                {data.modelos.map((m, i) => (
                  <option key={m.nome} value={i}>
                    {m.nome} — {BRL(m.preco)}
                  </option>
                ))}
              </select>
            </div>
          </Secao>

          <Secao titulo="Aço">
            {data.acos.map((a, i) => (
              <CartaoOpcao
                key={a.nome}
                nome={a.nome}
                extra={preco(a)}
                ativo={cfg.acoIdx === i}
                onClick={() => setCfg((c) => ({ ...c, acoIdx: i }))}
              />
            ))}
            <CartaoOpcao
              nome="Brute Forge"
              extra={precoClasse(data.bruteForge, classe)}
              ativo={cfg.bruteForge}
              onClick={() => setCfg((c) => ({ ...c, bruteForge: !c.bruteForge }))}
            />
          </Secao>

          <Secao titulo="Empunhadura">
            {empunhaduras.map((e) => {
              const i = data.empunhaduras.indexOf(e);
              return (
                <CartaoOpcao
                  key={e.nome}
                  nome={e.nome}
                  extra={preco(e)}
                  ativo={cfg.empIdx === i}
                  onClick={() => setCfg((c) => ({ ...c, empIdx: i, empCor: null }))}
                />
              );
            })}
            {data.empunhaduras[cfg.empIdx]?.cores?.length ? (
              <Cores
                cores={data.empunhaduras[cfg.empIdx].cores!}
                valor={cfg.empCor}
                onPick={(cor) => setCfg((c) => ({ ...c, empCor: cor }))}
              />
            ) : null}
            <CartaoOpcao
              nome="Dragon Scale"
              extra={precoClasse(data.dragonScale, classe)}
              ativo={cfg.dragonScale}
              onClick={() => setCfg((c) => ({ ...c, dragonScale: !c.dragonScale }))}
            />
            {eIdx >= 0 && (
              <CartaoOpcao
                nome="Espaçador"
                extra={preco(data.empunhaduras[eIdx])}
                ativo={cfg.espacador}
                onClick={() => setCfg((c) => ({ ...c, espacador: !c.espacador, espacadorCor: null }))}
              />
            )}
            {cfg.espacador && data.empunhaduras[eIdx]?.cores?.length ? (
              <Cores
                cores={data.empunhaduras[eIdx].cores!}
                valor={cfg.espacadorCor}
                onPick={(cor) => setCfg((c) => ({ ...c, espacadorCor: cor }))}
              />
            ) : null}
          </Secao>

          <Secao titulo="Acabamento">
            {data.acabamentos.map((a, i) => (
              <CartaoOpcao
                key={a.nome}
                nome={a.nome}
                extra={preco(a)}
                ativo={cfg.acabIdx === i}
                onClick={() => setCfg((c) => ({ ...c, acabIdx: i }))}
              />
            ))}
          </Secao>

          <Secao titulo="Bainha">
            {data.bainhas.map((b, i) => {
              const ativo = cfg.bainhaIdxs.includes(i);
              return (
                <div key={b.nome} className="contents">
                  <CartaoOpcao
                    nome={b.nome}
                    extra={preco(b)}
                    ativo={ativo}
                    onClick={() =>
                      setCfg((c) => ({
                        ...c,
                        bainhaIdxs: ativo ? c.bainhaIdxs.filter((x) => x !== i) : [...c.bainhaIdxs, i],
                      }))
                    }
                  />
                  {ativo && b.cores?.length ? (
                    <Cores
                      cores={b.cores}
                      valor={cfg.bainhaCores?.[i] ?? null}
                      onPick={(cor) =>
                        setCfg((c) => ({ ...c, bainhaCores: { ...c.bainhaCores, [i]: cor } }))
                      }
                    />
                  ) : null}
                </div>
              );
            })}
          </Secao>
        </div>

        {/* Painel que mostra a peça se montando */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-[hsl(0_0%_16%)] bg-[hsl(0_0%_8%)] p-4">
            {imagemModelo ? (
              <img
                src={imagemModelo}
                alt={modelo?.nome ?? ''}
                className="mb-3 h-40 w-full rounded object-cover transition-opacity duration-300"
              />
            ) : (
              <div className="mb-3 flex h-40 items-center justify-center rounded border border-dashed border-[hsl(0_0%_18%)] text-xs uppercase tracking-widest text-[hsl(0_0%_35%)]">
                sua peça aparece aqui
              </div>
            )}
            <h3 className="font-bebas text-2xl tracking-wide">{modelo?.nome ?? 'Escolha a lâmina'}</h3>
            <ul className="mt-2 space-y-1 text-xs text-[hsl(0_0%_62%)]">
              {resumo.linhas.slice(1, -1).map((l) => (
                <li key={l} className="transition-all duration-200">{l}</li>
              ))}
            </ul>
            <p className="mt-4 font-bebas text-3xl text-[hsl(42_72%_58%)]">{BRL(total)}</p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setDialogo(true)}
                disabled={!modelo}
                className="flex w-full items-center justify-center gap-2 rounded border border-[hsl(0_0%_22%)] px-4 py-2.5 text-xs uppercase tracking-widest text-[hsl(0_0%_80%)] disabled:opacity-40"
              >
                <Swords className="h-4 w-4" /> Salvar no meu arsenal
              </button>
              <button
                type="button"
                onClick={abrirWhatsApp}
                disabled={!modelo}
                className="flex w-full items-center justify-center gap-2 rounded bg-[hsl(0_72%_45%)] px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-40"
              >
                <MessageCircle className="h-4 w-4" /> Tirar do papel
              </button>
            </div>
          </div>
        </aside>
      </div>

      {dialogo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-lg border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_7%)] p-5">
            <h3 className="font-bebas text-2xl tracking-wide">Guardar no arsenal</h3>
            <p className="mt-1 text-xs text-[hsl(0_0%_58%)]">
              Você recebe um link permanente com os seus projetos. Guarde no seu WhatsApp.
            </p>
            <input
              value={nomeProjeto}
              onChange={(e) => setNomeProjeto(e.target.value)}
              placeholder="Nome do projeto — ex: minha de caça"
              className="mt-4 w-full rounded border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] px-3 py-2.5 text-sm outline-none focus:border-[hsl(42_72%_58%)]"
            />
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Seu WhatsApp (opcional)"
              inputMode="numeric"
              className="mt-2 w-full rounded border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_10%)] px-3 py-2.5 text-sm outline-none focus:border-[hsl(42_72%_58%)]"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDialogo(false)}
                className="flex-1 rounded border border-[hsl(0_0%_20%)] py-2.5 text-xs uppercase tracking-widest text-[hsl(0_0%_65%)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                className="flex flex-1 items-center justify-center gap-2 rounded bg-[hsl(42_72%_58%)] py-2.5 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
              >
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicoLayout>
  );
}
