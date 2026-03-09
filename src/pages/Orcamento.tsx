import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Copy, Gift, Package, ChevronDown, ChevronUp, FileText, RotateCcw } from 'lucide-react';

interface ModeloDB {
  id: string;
  nome_modelo: string;
  preco_base: number;
  categoria: string | null;
}

interface ProdutoAdicionalDB {
  id: string;
  nome_produto: string;
  preco_unitario: number;
}

interface OpcaoComponenteDB {
  id: string;
  nome_opcao: string;
  tipo_opcao: string;
  preco_adicional: number;
}

interface ItemOrcamento {
  id: string;
  descricao: string;
  valor: number;
  brinde: boolean;
  quantidade: number;
  tipo: 'modelo' | 'produto' | 'manual';
}

interface BlocoOrcamento {
  id: string;
  nome: string; // ex: "Kit", ou vazio para bloco avulso
  itens: ItemOrcamento[];
  incluirCertificado: boolean;
  incluirBainha: boolean;
  tipoBainha: string;
  incluirClipes: boolean;
  valorCustom: string; // valor total custom do bloco (vazio = soma automática)
}

export default function Orcamento() {
  const [modelos, setModelos] = useState<ModeloDB[]>([]);
  const [produtos, setProdutos] = useState<ProdutoAdicionalDB[]>([]);
  const [componentes, setComponentes] = useState<OpcaoComponenteDB[]>([]);
  const [loading, setLoading] = useState(true);

  const [blocos, setBlocos] = useState<BlocoOrcamento[]>([]);
  const [parcelas, setParcelas] = useState('10');
  const [semJuros, setSemJuros] = useState(true);
  const [textoInicio, setTextoInicio] = useState('Seriam então :');

  // Adição rápida
  const [blocoAlvo, setBlocoAlvo] = useState<string>('');
  const [modoAdicao, setModoAdicao] = useState<'modelo' | 'produto' | 'manual'>('modelo');
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [acoSelecionado, setAcoSelecionado] = useState('');
  const [empunhaduraSelecionada, setEmpunhaduraSelecionada] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [qtdProduto, setQtdProduto] = useState('1');
  const [descricaoManual, setDescricaoManual] = useState('');
  const [valorManual, setValorManual] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [modelosRes, produtosRes, componentesRes] = await Promise.all([
        supabase.from('modelos').select('*').order('nome_modelo'),
        supabase.from('produtos_adicionais').select('*').order('nome_produto'),
        supabase.from('opcoes_componentes').select('*').order('tipo_opcao'),
      ]);
      if (modelosRes.data) setModelos(modelosRes.data);
      if (produtosRes.data) setProdutos(produtosRes.data);
      if (componentesRes.data) setComponentes(componentesRes.data);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const acos = componentes.filter(c => c.tipo_opcao === 'Aço');
  const empunhaduras = componentes.filter(c => c.tipo_opcao === 'Empunhadura');

  const criarBloco = (nome: string = '') => {
    const novo: BlocoOrcamento = {
      id: crypto.randomUUID(),
      nome,
      itens: [],
      incluirCertificado: true,
      incluirBainha: true,
      tipoBainha: 'Kydex',
      incluirClipes: true,
      valorCustom: '',
    };
    setBlocos(prev => [...prev, novo]);
    setBlocoAlvo(novo.id);
    return novo.id;
  };

  const adicionarItem = () => {
    let alvo = blocoAlvo;
    if (!alvo || !blocos.find(b => b.id === alvo)) {
      alvo = criarBloco('');
    }

    let novoItem: ItemOrcamento | null = null;

    if (modoAdicao === 'modelo') {
      const modelo = modelos.find(m => m.id === modeloSelecionado);
      if (!modelo) { toast.error('Selecione um modelo'); return; }
      const aco = acoSelecionado && acoSelecionado !== 'none' ? componentes.find(c => c.id === acoSelecionado) : null;
      const emp = empunhaduraSelecionada && empunhaduraSelecionada !== 'none' ? componentes.find(c => c.id === empunhaduraSelecionada) : null;

      let desc = modelo.nome_modelo;
      let valor = modelo.preco_base;
      if (aco) { desc += ` ${aco.nome_opcao}`; valor += aco.preco_adicional; }
      if (emp) { desc += ` empunhadura em ${emp.nome_opcao}`; valor += emp.preco_adicional; }

      novoItem = { id: crypto.randomUUID(), descricao: desc, valor, brinde: false, quantidade: 1, tipo: 'modelo' };
    } else if (modoAdicao === 'produto') {
      const prod = produtos.find(p => p.id === produtoSelecionado);
      if (!prod) { toast.error('Selecione um produto'); return; }
      const qtd = parseInt(qtdProduto) || 1;
      novoItem = { id: crypto.randomUUID(), descricao: prod.nome_produto, valor: prod.preco_unitario * qtd, brinde: false, quantidade: qtd, tipo: 'produto' };
    } else {
      if (!descricaoManual.trim()) { toast.error('Preencha a descrição'); return; }
      novoItem = {
        id: crypto.randomUUID(),
        descricao: descricaoManual.trim(),
        valor: parseFloat(valorManual.replace(',', '.')) || 0,
        brinde: false,
        quantidade: 1,
        tipo: 'manual',
      };
    }

    if (!novoItem) return;

    setBlocos(prev => prev.map(b =>
      b.id === alvo ? { ...b, itens: [...b.itens, novoItem!] } : b
    ));

    setModeloSelecionado('');
    setAcoSelecionado('');
    setEmpunhaduraSelecionada('');
    setProdutoSelecionado('');
    setQtdProduto('1');
    setDescricaoManual('');
    setValorManual('');
    toast.success('Item adicionado');
  };

  const removerItem = (blocoId: string, itemId: string) => {
    setBlocos(prev => prev.map(b =>
      b.id === blocoId ? { ...b, itens: b.itens.filter(i => i.id !== itemId) } : b
    ));
  };

  const toggleBrinde = (blocoId: string, itemId: string) => {
    setBlocos(prev => prev.map(b =>
      b.id === blocoId ? {
        ...b, itens: b.itens.map(i =>
          i.id === itemId ? { ...i, brinde: !i.brinde } : i
        )
      } : b
    ));
  };

  const removerBloco = (blocoId: string) => {
    setBlocos(prev => prev.filter(b => b.id !== blocoId));
    if (blocoAlvo === blocoId) setBlocoAlvo('');
  };

  const atualizarBloco = (blocoId: string, campo: Partial<BlocoOrcamento>) => {
    setBlocos(prev => prev.map(b => b.id === blocoId ? { ...b, ...campo } : b));
  };

  const calcularTotalBloco = (bloco: BlocoOrcamento) => {
    if (bloco.valorCustom) return parseFloat(bloco.valorCustom.replace(',', '.')) || 0;
    return bloco.itens.reduce((sum, i) => sum + (i.brinde ? 0 : i.valor), 0);
  };

  const totalGeral = useMemo(() => {
    return blocos.reduce((sum, b) => sum + calcularTotalBloco(b), 0);
  }, [blocos]);

  const valorParcela = useMemo(() => {
    const n = parseInt(parcelas) || 1;
    return totalGeral / n;
  }, [totalGeral, parcelas]);

  // Gerar texto no formato exato do exemplo
  const gerarTexto = () => {
    let texto = textoInicio ? `${textoInicio}\n\n` : '';

    blocos.forEach((bloco, idx) => {
      if (bloco.itens.length === 0) return;

      const modelosBloco = bloco.itens.filter(i => i.tipo === 'modelo');
      const outrosItens = bloco.itens.filter(i => i.tipo !== 'modelo');

      // Linha principal: nome do bloco + modelos concatenados com " + "
      if (bloco.nome || modelosBloco.length > 0) {
        let linha = bloco.nome ? `${bloco.nome}  ` : '';
        linha += modelosBloco.map(m => `● ${m.descricao}`).join(' + ');
        texto += `${linha}\n\n`;
      }

      // Outros itens (produtos, manuais) em linhas separadas
      outrosItens.forEach(item => {
        const qtdPrefix = item.quantidade > 1 ? `${item.quantidade} ` : '';
        if (item.brinde) {
          texto += `● ${qtdPrefix}${item.descricao} (~${item.valor.toFixed(2).replace('.', ',')}~) Brinde \n\n`;
        } else {
          const complemento = item.valor > 0 && item.tipo === 'manual' ? '' : '';
          texto += `● ${qtdPrefix}${item.descricao}${complemento} \n\n`;
        }
      });

      // Bainha + Clipes
      if (bloco.incluirBainha) {
        texto += `● Bainhas em ${bloco.tipoBainha}  ${bloco.incluirClipes ? '+ Clipes em aço inox ' : ''}\n\n`;
      }

      // Certificado
      if (bloco.incluirCertificado) {
        texto += `● Certificado de Autenticidade e garantia vitalícia \n\n`;
      }

      // Valor do bloco
      const totalBloco = calcularTotalBloco(bloco);
      texto += `- ${totalBloco.toFixed(2).replace('.', ',')}\n\n`;

      if (idx < blocos.length - 1) texto += '\n';
    });

    // Total geral
    const n = parseInt(parcelas) || 1;
    texto += `Total: ${totalGeral.toFixed(2).replace('.', ',')}`;
    if (n > 1) {
      texto += ` em ${n}x${semJuros ? ' sem juros' : ''} de ${valorParcela.toFixed(2).replace('.', ',')}`;
    }

    return texto;
  };

  const copiarOrcamento = () => {
    navigator.clipboard.writeText(gerarTexto());
    toast.success('Orçamento copiado!');
  };

  const limparTudo = () => {
    setBlocos([]);
    setBlocoAlvo('');
    setParcelas('10');
    setSemJuros(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Carregando...</div>;
  }

  return (
    <div className="space-y-4 w-full min-w-0 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-accent flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Orçamento
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={limparTudo} className="text-xs gap-1">
            <RotateCcw className="h-3 w-3" />
            Limpar
          </Button>
          <Button size="sm" onClick={copiarOrcamento} className="text-xs gap-1 bg-accent hover:bg-accent/90">
            <Copy className="h-3.5 w-3.5" />
            Copiar Texto
          </Button>
        </div>
      </div>

      {/* Texto de abertura */}
      <Input
        value={textoInicio}
        onChange={e => setTextoInicio(e.target.value)}
        placeholder="Texto de abertura (ex: Seriam então :)"
        className="h-8 text-xs"
      />

      {/* Adicionar bloco */}
      <div className="flex gap-2">
        <Input
          placeholder='Nome do bloco (ex: "Kit", ou vazio)'
          className="h-9 text-sm flex-1"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const input = e.currentTarget;
              criarBloco(input.value);
              input.value = '';
              toast.success('Bloco criado');
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-9 text-xs gap-1"
          onClick={() => {
            criarBloco('');
            toast.success('Bloco criado');
          }}
        >
          <Package className="h-3.5 w-3.5" />
          + Bloco
        </Button>
      </div>

      {/* Blocos */}
      {blocos.map((bloco) => (
        <div key={bloco.id} className={`border rounded-lg overflow-hidden ${blocoAlvo === bloco.id ? 'border-accent' : 'border-border'}`}>
          {/* Header do bloco */}
          <div
            className={`flex items-center gap-2 p-2 cursor-pointer ${blocoAlvo === bloco.id ? 'bg-accent/10' : 'bg-muted/30'}`}
            onClick={() => setBlocoAlvo(bloco.id)}
          >
            <Package className="h-4 w-4 text-accent shrink-0" />
            <Input
              value={bloco.nome}
              onChange={e => atualizarBloco(bloco.id, { nome: e.target.value })}
              placeholder="Nome (Kit, etc.)"
              className="h-7 text-xs border-none bg-transparent p-0 focus-visible:ring-0 flex-1"
              onClick={e => e.stopPropagation()}
            />
            <span className="text-xs font-semibold text-accent whitespace-nowrap">
              {calcularTotalBloco(bloco).toFixed(2).replace('.', ',')}
            </span>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive shrink-0" onClick={e => { e.stopPropagation(); removerBloco(bloco.id); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {/* Itens do bloco */}
          <div className="p-2 space-y-1">
            {bloco.itens.map(item => (
              <div key={item.id} className="flex items-center gap-1 p-1.5 rounded bg-muted/40 group text-xs">
                <span className={`flex-1 ${item.brinde ? 'line-through text-muted-foreground' : ''}`}>
                  {item.quantidade > 1 && `${item.quantidade}x `}{item.descricao}
                  {item.valor > 0 && <span className="text-muted-foreground ml-1">({item.valor.toFixed(2).replace('.', ',')})</span>}
                </span>
                {item.brinde && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 gap-0.5">
                    <Gift className="h-2.5 w-2.5" /> Brinde
                  </Badge>
                )}
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => toggleBrinde(bloco.id, item.id)}>
                  <Gift className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => removerItem(bloco.id, item.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {bloco.itens.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Selecione este bloco e adicione itens abaixo</p>
            )}
          </div>

          {/* Opções do bloco */}
          <div className="flex flex-wrap items-center gap-3 px-2 pb-2 text-xs">
            <div className="flex items-center gap-1">
              <Checkbox id={`cert-${bloco.id}`} checked={bloco.incluirCertificado} onCheckedChange={c => atualizarBloco(bloco.id, { incluirCertificado: c === true })} className="h-3 w-3" />
              <Label htmlFor={`cert-${bloco.id}`} className="text-[10px] cursor-pointer">Certificado</Label>
            </div>
            <div className="flex items-center gap-1">
              <Checkbox id={`bai-${bloco.id}`} checked={bloco.incluirBainha} onCheckedChange={c => atualizarBloco(bloco.id, { incluirBainha: c === true })} className="h-3 w-3" />
              <Label htmlFor={`bai-${bloco.id}`} className="text-[10px] cursor-pointer">Bainha</Label>
            </div>
            {bloco.incluirBainha && (
              <Input value={bloco.tipoBainha} onChange={e => atualizarBloco(bloco.id, { tipoBainha: e.target.value })} className="h-6 text-[10px] w-16 px-1" />
            )}
            <div className="flex items-center gap-1">
              <Checkbox id={`clip-${bloco.id}`} checked={bloco.incluirClipes} onCheckedChange={c => atualizarBloco(bloco.id, { incluirClipes: c === true })} className="h-3 w-3" />
              <Label htmlFor={`clip-${bloco.id}`} className="text-[10px] cursor-pointer">Clipes</Label>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <Label className="text-[10px]">Valor:</Label>
              <Input
                value={bloco.valorCustom}
                onChange={e => atualizarBloco(bloco.id, { valorCustom: e.target.value })}
                placeholder="auto"
                className="h-6 text-[10px] w-20 px-1"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Painel de adição */}
      {blocos.length > 0 && (
        <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs font-semibold shrink-0">Adicionar ao:</Label>
            <Select value={blocoAlvo} onValueChange={setBlocoAlvo}>
              <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Selecione bloco" /></SelectTrigger>
              <SelectContent>
                {blocos.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.nome || `Bloco ${blocos.indexOf(b) + 1}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1 ml-auto">
              {(['modelo', 'produto', 'manual'] as const).map(modo => (
                <Button key={modo} size="sm" variant={modoAdicao === modo ? 'default' : 'outline'} className="text-[10px] h-7 px-2" onClick={() => setModoAdicao(modo)}>
                  {modo === 'modelo' ? 'Modelo' : modo === 'produto' ? 'Produto' : 'Manual'}
                </Button>
              ))}
            </div>
          </div>

          {modoAdicao === 'modelo' && (
            <div className="grid grid-cols-3 gap-2">
              <Select value={modeloSelecionado} onValueChange={setModeloSelecionado}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Modelo" /></SelectTrigger>
                <SelectContent>
                  {modelos.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome_modelo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={acoSelecionado} onValueChange={setAcoSelecionado}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Aço (opc.)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {acos.map(a => <SelectItem key={a.id} value={a.id}>{a.nome_opcao}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={empunhaduraSelecionada} onValueChange={setEmpunhaduraSelecionada}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Empunh. (opc.)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {empunhaduras.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_opcao}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {modoAdicao === 'produto' && (
            <div className="flex gap-2">
              <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                <SelectContent>
                  {produtos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_produto} - R${p.preco_unitario.toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" min="1" value={qtdProduto} onChange={e => setQtdProduto(e.target.value)} className="h-8 text-xs w-16" placeholder="Qtd" />
            </div>
          )}

          {modoAdicao === 'manual' && (
            <div className="flex gap-2">
              <Input placeholder="Descrição" value={descricaoManual} onChange={e => setDescricaoManual(e.target.value)} className="h-8 text-xs flex-1" />
              <Input placeholder="Valor" value={valorManual} onChange={e => setValorManual(e.target.value)} className="h-8 text-xs w-24" />
            </div>
          )}

          <Button size="sm" onClick={adicionarItem} className="w-full h-8 text-xs gap-1 bg-accent hover:bg-accent/90">
            <Plus className="h-3.5 w-3.5" />
            Adicionar Item
          </Button>
        </div>
      )}

      {/* Pagamento */}
      <div className="border border-border rounded-lg p-3 bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Label className="text-xs shrink-0">Parcelas:</Label>
            <Input type="number" min="1" value={parcelas} onChange={e => setParcelas(e.target.value)} className="h-8 text-xs w-16" />
            <div className="flex items-center gap-1">
              <Checkbox id="semJuros" checked={semJuros} onCheckedChange={c => setSemJuros(c === true)} className="h-3.5 w-3.5" />
              <Label htmlFor="semJuros" className="text-xs cursor-pointer whitespace-nowrap">Sem juros</Label>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-accent">{totalGeral.toFixed(2).replace('.', ',')}</span>
            {parseInt(parcelas) > 1 && (
              <p className="text-[10px] text-muted-foreground">
                {parcelas}x de {valorParcela.toFixed(2).replace('.', ',')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Preview sempre visível */}
      {blocos.some(b => b.itens.length > 0) && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-2 bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">Pré-visualização</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={copiarOrcamento}>
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>
          <pre className="text-sm bg-muted/10 p-3 whitespace-pre-wrap break-words font-sans leading-relaxed">
            {gerarTexto()}
          </pre>
        </div>
      )}
    </div>
  );
}
