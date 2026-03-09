import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2, Copy, Gift, FileText, RotateCcw, Search } from 'lucide-react';

interface ConfiguracaoDB {
  id: string;
  nome_modelo: string;
  preco_base: number;
  categorias: string[] | null;
}

interface ProdutoAdicionalDB {
  id: string;
  nome_produto: string;
  preco_unitario: number;
}

interface ItemOrcamento {
  id: string;
  descricao: string;
  valor: number;
  brinde: boolean;
  quantidade: number;
  tipo: 'config' | 'produto' | 'manual';
  incluirCertificado: boolean;
  incluirBainha: boolean;
  tipoBainha: string;
  incluirClipes: boolean;
  complemento: string; // texto extra após o nome (ex: "+ passador de couro")
}

function criarItem(overrides: Partial<ItemOrcamento> & Pick<ItemOrcamento, 'descricao' | 'valor' | 'tipo'>): ItemOrcamento {
  return {
    id: crypto.randomUUID(),
    brinde: false,
    quantidade: 1,
    incluirCertificado: overrides.tipo === 'config',
    incluirBainha: overrides.tipo === 'config',
    tipoBainha: 'Kydex',
    incluirClipes: overrides.tipo === 'config',
    complemento: '',
    ...overrides,
  };
}

export default function Orcamento() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoDB[]>([]);
  const [produtos, setProdutos] = useState<ProdutoAdicionalDB[]>([]);
  const [loading, setLoading] = useState(true);

  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [parcelas, setParcelas] = useState('10');
  const [semJuros, setSemJuros] = useState(true);
  const [textoInicio, setTextoInicio] = useState('Seriam então :');

  // Busca
  const [busca, setBusca] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [descricaoManual, setDescricaoManual] = useState('');
  const [valorManual, setValorManual] = useState('');
  const [tab, setTab] = useState<'config' | 'produto' | 'manual'>('config');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [configRes, produtosRes] = await Promise.all([
        (supabase.from('catalogo_modelos').select('id, nome_modelo, preco_base, categorias') as any).order('nome_modelo'),
        supabase.from('produtos_adicionais').select('*').order('nome_produto'),
      ]);
      if (configRes.data) setConfiguracoes(configRes.data);
      if (produtosRes.data) setProdutos(produtosRes.data);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const configsFiltradas = useMemo(() => {
    if (!busca.trim()) return configuracoes;
    const termo = busca.toLowerCase();
    return configuracoes.filter(c =>
      c.nome_modelo.toLowerCase().includes(termo) ||
      c.categorias?.some(cat => cat.toLowerCase().includes(termo))
    );
  }, [configuracoes, busca]);

  const produtosFiltrados = useMemo(() => {
    if (!buscaProduto.trim()) return produtos;
    const termo = buscaProduto.toLowerCase();
    return produtos.filter(p => p.nome_produto.toLowerCase().includes(termo));
  }, [produtos, buscaProduto]);

  const adicionarConfig = (config: ConfiguracaoDB) => {
    setItens(prev => [...prev, criarItem({
      descricao: config.nome_modelo,
      valor: config.preco_base,
      tipo: 'config',
    })]);
    toast.success('Adicionado');
  };

  const adicionarProduto = (prod: ProdutoAdicionalDB) => {
    setItens(prev => [...prev, criarItem({
      descricao: prod.nome_produto,
      valor: prod.preco_unitario,
      tipo: 'produto',
      incluirCertificado: false,
      incluirBainha: false,
      incluirClipes: false,
    })]);
    toast.success('Adicionado');
  };

  const adicionarManual = () => {
    if (!descricaoManual.trim()) { toast.error('Preencha a descrição'); return; }
    setItens(prev => [...prev, criarItem({
      descricao: descricaoManual.trim(),
      valor: parseFloat(valorManual.replace(',', '.')) || 0,
      tipo: 'manual',
      incluirCertificado: false,
      incluirBainha: false,
      incluirClipes: false,
    })]);
    setDescricaoManual('');
    setValorManual('');
    toast.success('Adicionado');
  };

  const removerItem = (id: string) => setItens(prev => prev.filter(i => i.id !== id));

  const atualizarItem = (id: string, campo: Partial<ItemOrcamento>) => {
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...campo } : i));
  };

  const totalGeral = useMemo(() => {
    return itens.reduce((sum, i) => sum + (i.brinde ? 0 : i.valor * i.quantidade), 0);
  }, [itens]);

  const valorParcela = useMemo(() => {
    const n = parseInt(parcelas) || 1;
    return totalGeral / n;
  }, [totalGeral, parcelas]);

  const gerarTexto = () => {
    let texto = textoInicio ? `${textoInicio}\n\n` : '';

    itens.forEach(item => {
      const qtdPrefix = item.quantidade > 1 ? `${item.quantidade} ` : '';
      const compl = item.complemento ? ` ${item.complemento}` : '';

      // Descrição principal
      if (item.brinde) {
        texto += `● ${qtdPrefix}${item.descricao}${compl} (~${(item.valor * item.quantidade).toFixed(2).replace('.', ',')}~) Brinde \n\n`;
      } else {
        texto += `● ${qtdPrefix}${item.descricao}${compl} \n\n`;
      }

      // Inclusões (bainha, certificado)
      if (item.incluirBainha) {
        texto += `● Bainhas em ${item.tipoBainha}  ${item.incluirClipes ? '+ Clipes em aço inox ' : ''}\n\n`;
      }
      if (item.incluirCertificado) {
        texto += `● Certificado de Autenticidade e garantia vitalícia \n\n`;
      }

      // Valor
      if (!item.brinde) {
        texto += `- ${(item.valor * item.quantidade).toFixed(2).replace('.', ',')}\n\n`;
      }

      texto += '\n';
    });

    // Total
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
          <Button size="sm" variant="outline" onClick={() => { setItens([]); setParcelas('10'); setSemJuros(true); }} className="text-xs gap-1">
            <RotateCcw className="h-3 w-3" /> Limpar
          </Button>
          <Button size="sm" onClick={copiarOrcamento} className="text-xs gap-1 bg-accent hover:bg-accent/90">
            <Copy className="h-3.5 w-3.5" /> Copiar Texto
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

      {/* Tabs de adição */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="flex border-b border-border">
          {(['config', 'produto', 'manual'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === t ? 'bg-accent/10 text-accent border-b-2 border-accent' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t === 'config' ? 'Configurações' : t === 'produto' ? 'Produtos' : 'Manual'}
            </button>
          ))}
        </div>

        <div className="p-2 max-h-52 overflow-y-auto">
          {tab === 'config' && (
            <div className="space-y-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar configuração..."
                  className="h-8 text-xs pl-7"
                />
              </div>
              {configsFiltradas.map(c => (
                <button
                  key={c.id}
                  onClick={() => adicionarConfig(c)}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-accent/10 transition-colors text-left"
                >
                  <span className="text-xs font-medium truncate flex-1">{c.nome_modelo}</span>
                  <span className="text-xs text-accent font-semibold ml-2 shrink-0">
                    R$ {c.preco_base.toFixed(2).replace('.', ',')}
                  </span>
                </button>
              ))}
              {configsFiltradas.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhuma configuração encontrada</p>
              )}
            </div>
          )}

          {tab === 'produto' && (
            <div className="space-y-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={buscaProduto}
                  onChange={e => setBuscaProduto(e.target.value)}
                  placeholder="Buscar produto..."
                  className="h-8 text-xs pl-7"
                />
              </div>
              {produtosFiltrados.map(p => (
                <button
                  key={p.id}
                  onClick={() => adicionarProduto(p)}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-accent/10 transition-colors text-left"
                >
                  <span className="text-xs font-medium truncate flex-1">{p.nome_produto}</span>
                  <span className="text-xs text-accent font-semibold ml-2 shrink-0">
                    R$ {p.preco_unitario.toFixed(2).replace('.', ',')}
                  </span>
                </button>
              ))}
              {produtosFiltrados.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhum produto encontrado</p>
              )}
            </div>
          )}

          {tab === 'manual' && (
            <div className="flex gap-2">
              <Input placeholder="Descrição" value={descricaoManual} onChange={e => setDescricaoManual(e.target.value)} className="h-8 text-xs flex-1" />
              <Input placeholder="Valor" value={valorManual} onChange={e => setValorManual(e.target.value)} className="h-8 text-xs w-24" />
              <Button size="sm" onClick={adicionarManual} className="h-8 text-xs gap-1 bg-accent hover:bg-accent/90">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Itens adicionados */}
      {itens.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Itens do orçamento</Label>
          {itens.map(item => (
            <div key={item.id} className="border border-border rounded-lg p-2.5 space-y-1.5 bg-card">
              {/* Linha principal */}
              <div className="flex items-center gap-1.5 group">
                <Input
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={e => atualizarItem(item.id, { quantidade: parseInt(e.target.value) || 1 })}
                  className="h-7 text-xs w-12 text-center px-1"
                />
                <span className={`flex-1 text-xs font-medium ${item.brinde ? 'line-through text-muted-foreground' : ''}`}>
                  {item.descricao}
                </span>
                <Input
                  value={item.valor.toString()}
                  onChange={e => atualizarItem(item.id, { valor: parseFloat(e.target.value.replace(',', '.')) || 0 })}
                  className="h-7 text-xs w-20 text-right px-1"
                />
                {item.brinde && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 gap-0.5 shrink-0">
                    <Gift className="h-2.5 w-2.5" /> Brinde
                  </Badge>
                )}
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => atualizarItem(item.id, { brinde: !item.brinde })}>
                  <Gift className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removerItem(item.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Complemento */}
              <Input
                value={item.complemento}
                onChange={e => atualizarItem(item.id, { complemento: e.target.value })}
                placeholder="Complemento (ex: + passador de couro)"
                className="h-6 text-[10px] border-dashed"
              />

              {/* Inclusões */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Checkbox id={`cert-${item.id}`} checked={item.incluirCertificado} onCheckedChange={c => atualizarItem(item.id, { incluirCertificado: c === true })} className="h-3 w-3" />
                  <Label htmlFor={`cert-${item.id}`} className="text-[10px] cursor-pointer">Certificado</Label>
                </div>
                <div className="flex items-center gap-1">
                  <Checkbox id={`bai-${item.id}`} checked={item.incluirBainha} onCheckedChange={c => atualizarItem(item.id, { incluirBainha: c === true })} className="h-3 w-3" />
                  <Label htmlFor={`bai-${item.id}`} className="text-[10px] cursor-pointer">Bainha</Label>
                </div>
                {item.incluirBainha && (
                  <Input value={item.tipoBainha} onChange={e => atualizarItem(item.id, { tipoBainha: e.target.value })} className="h-5 text-[10px] w-16 px-1" />
                )}
                <div className="flex items-center gap-1">
                  <Checkbox id={`clip-${item.id}`} checked={item.incluirClipes} onCheckedChange={c => atualizarItem(item.id, { incluirClipes: c === true })} className="h-3 w-3" />
                  <Label htmlFor={`clip-${item.id}`} className="text-[10px] cursor-pointer">Clipes</Label>
                </div>
              </div>
            </div>
          ))}
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

      {/* Preview */}
      {itens.length > 0 && (
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
