import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Copy, Gift, Package, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  valorOriginal?: number; // para exibir riscado quando brinde
  tipo: 'modelo' | 'produto' | 'manual';
}

interface GrupoOrcamento {
  id: string;
  nome: string;
  itens: ItemOrcamento[];
  aberto: boolean;
}

type ModoAdicao = 'modelo' | 'produto' | 'manual';

export default function Orcamento() {
  const [modelos, setModelos] = useState<ModeloDB[]>([]);
  const [produtos, setProdutos] = useState<ProdutoAdicionalDB[]>([]);
  const [componentes, setComponentes] = useState<OpcaoComponenteDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Grupos e itens soltos
  const [grupos, setGrupos] = useState<GrupoOrcamento[]>([]);
  const [itensSoltos, setItensSoltos] = useState<ItemOrcamento[]>([]);

  // Pagamento
  const [parcelas, setParcelas] = useState('10');
  const [semJuros, setSemJuros] = useState(true);

  // Modal de adição
  const [modoAdicao, setModoAdicao] = useState<ModoAdicao>('modelo');
  const [grupoAlvo, setGrupoAlvo] = useState<string | null>(null); // null = item solto

  // Campos de adição
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [acoSelecionado, setAcoSelecionado] = useState('');
  const [empunhaduraSelecionada, setEmpunhaduraSelecionada] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [descricaoManual, setDescricaoManual] = useState('');
  const [valorManual, setValorManual] = useState('');
  const [novoGrupoNome, setNovoGrupoNome] = useState('');

  // Inclusões padrão
  const [incluirCertificado, setIncluirCertificado] = useState(true);
  const [incluirBainha, setIncluirBainha] = useState(true);
  const [tipoBainha, setTipoBainha] = useState('Kydex');
  const [incluirClipes, setIncluirClipes] = useState(true);

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

  const adicionarItem = () => {
    let novoItem: ItemOrcamento | null = null;

    if (modoAdicao === 'modelo') {
      const modelo = modelos.find(m => m.id === modeloSelecionado);
      if (!modelo) { toast.error('Selecione um modelo'); return; }
      const aco = componentes.find(c => c.id === acoSelecionado);
      const emp = componentes.find(c => c.id === empunhaduraSelecionada);
      
      let desc = modelo.nome_modelo;
      let valor = modelo.preco_base;
      if (aco) { desc += ` ${aco.nome_opcao}`; valor += aco.preco_adicional; }
      if (emp) { desc += ` empunhadura em ${emp.nome_opcao}`; valor += emp.preco_adicional; }
      
      novoItem = { id: crypto.randomUUID(), descricao: desc, valor, brinde: false, tipo: 'modelo' };
    } else if (modoAdicao === 'produto') {
      const prod = produtos.find(p => p.id === produtoSelecionado);
      if (!prod) { toast.error('Selecione um produto'); return; }
      novoItem = { id: crypto.randomUUID(), descricao: prod.nome_produto, valor: prod.preco_unitario, brinde: false, tipo: 'produto' };
    } else {
      if (!descricaoManual.trim()) { toast.error('Preencha a descrição'); return; }
      novoItem = { 
        id: crypto.randomUUID(), 
        descricao: descricaoManual.trim(), 
        valor: parseFloat(valorManual.replace(',', '.')) || 0, 
        brinde: false, 
        tipo: 'manual' 
      };
    }

    if (!novoItem) return;

    if (grupoAlvo) {
      setGrupos(prev => prev.map(g => 
        g.id === grupoAlvo ? { ...g, itens: [...g.itens, novoItem!] } : g
      ));
    } else {
      setItensSoltos(prev => [...prev, novoItem!]);
    }

    // Limpar campos
    setModeloSelecionado('');
    setAcoSelecionado('');
    setEmpunhaduraSelecionada('');
    setProdutoSelecionado('');
    setDescricaoManual('');
    setValorManual('');
    toast.success('Item adicionado!');
  };

  const criarGrupo = () => {
    if (!novoGrupoNome.trim()) { toast.error('Digite o nome do grupo'); return; }
    const novoGrupo: GrupoOrcamento = {
      id: crypto.randomUUID(),
      nome: novoGrupoNome.trim(),
      itens: [],
      aberto: true,
    };
    setGrupos(prev => [...prev, novoGrupo]);
    setNovoGrupoNome('');
    setGrupoAlvo(novoGrupo.id);
    toast.success('Grupo criado!');
  };

  const removerItem = (grupoId: string | null, itemId: string) => {
    if (grupoId) {
      setGrupos(prev => prev.map(g => 
        g.id === grupoId ? { ...g, itens: g.itens.filter(i => i.id !== itemId) } : g
      ));
    } else {
      setItensSoltos(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const toggleBrinde = (grupoId: string | null, itemId: string) => {
    if (grupoId) {
      setGrupos(prev => prev.map(g => 
        g.id === grupoId ? { ...g, itens: g.itens.map(i => 
          i.id === itemId ? { ...i, brinde: !i.brinde, valorOriginal: !i.brinde ? i.valor : undefined } : i
        )} : g
      ));
    } else {
      setItensSoltos(prev => prev.map(i => 
        i.id === itemId ? { ...i, brinde: !i.brinde, valorOriginal: !i.brinde ? i.valor : undefined } : i
      ));
    }
  };

  const removerGrupo = (grupoId: string) => {
    setGrupos(prev => prev.filter(g => g.id !== grupoId));
    if (grupoAlvo === grupoId) setGrupoAlvo(null);
  };

  const toggleGrupo = (grupoId: string) => {
    setGrupos(prev => prev.map(g => 
      g.id === grupoId ? { ...g, aberto: !g.aberto } : g
    ));
  };

  // Cálculos
  const calcularTotalGrupo = (itens: ItemOrcamento[]) => 
    itens.reduce((sum, i) => sum + (i.brinde ? 0 : i.valor), 0);

  const totalGeral = useMemo(() => {
    const totalGrupos = grupos.reduce((sum, g) => sum + calcularTotalGrupo(g.itens), 0);
    const totalSoltos = calcularTotalGrupo(itensSoltos);
    return totalGrupos + totalSoltos;
  }, [grupos, itensSoltos]);

  const valorParcela = useMemo(() => {
    const n = parseInt(parcelas) || 1;
    return totalGeral / n;
  }, [totalGeral, parcelas]);

  // Gerar texto formatado
  const gerarTexto = () => {
    let texto = '';

    grupos.forEach(grupo => {
      if (grupo.itens.length === 0) return;
      texto += `${grupo.nome}  `;
      grupo.itens.forEach(item => {
        if (item.brinde) {
          texto += `● ${item.descricao} (~${item.valor.toFixed(2).replace('.', ',')}~) Brinde \n`;
        } else {
          texto += `● ${item.descricao} \n`;
        }
      });

      if (incluirBainha) texto += `\n● Bainhas em ${tipoBainha}  ${incluirClipes ? '+ Clipes em aço inox ' : ''}\n`;
      if (incluirCertificado) texto += `● Certificado de Autenticidade e garantia vitalícia \n`;

      const totalGrupo = calcularTotalGrupo(grupo.itens);
      texto += `\n- ${totalGrupo.toFixed(2).replace('.', ',')}\n\n`;
    });

    itensSoltos.forEach(item => {
      if (item.brinde) {
        texto += `● ${item.descricao} (~${item.valor.toFixed(2).replace('.', ',')}~) Brinde \n`;
      } else {
        texto += `● ${item.descricao} \n`;
      }
    });

    if (itensSoltos.length > 0 && grupos.length === 0) {
      if (incluirBainha) texto += `\n● Bainhas em ${tipoBainha}  ${incluirClipes ? '+ Clipes em aço inox ' : ''}\n`;
      if (incluirCertificado) texto += `● Certificado de Autenticidade e garantia vitalícia \n`;
    }

    const n = parseInt(parcelas) || 1;
    texto += `\nTotal: ${totalGeral.toFixed(2).replace('.', ',')}`;
    if (n > 1) {
      texto += ` em ${n}x${semJuros ? ' sem juros' : ''} de ${valorParcela.toFixed(2).replace('.', ',')}`;
    }

    return texto;
  };

  const copiarOrcamento = () => {
    const texto = gerarTexto();
    navigator.clipboard.writeText(texto);
    toast.success('Orçamento copiado!');
  };

  const limparTudo = () => {
    setGrupos([]);
    setItensSoltos([]);
    setGrupoAlvo(null);
    setParcelas('10');
    setSemJuros(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Carregando...</div>;
  }

  const renderItem = (item: ItemOrcamento, grupoId: string | null) => (
    <div key={item.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group">
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${item.brinde ? 'line-through text-muted-foreground' : ''}`}>
          {item.descricao}
        </span>
        {item.valor > 0 && (
          <span className={`text-xs ml-2 ${item.brinde ? 'line-through text-muted-foreground' : 'text-accent font-medium'}`}>
            R$ {item.valor.toFixed(2).replace('.', ',')}
          </span>
        )}
        {item.brinde && (
          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
            <Gift className="h-3 w-3 mr-0.5" />
            Brinde
          </Badge>
        )}
      </div>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => toggleBrinde(grupoId, item.id)} title={item.brinde ? 'Remover brinde' : 'Marcar como brinde'}>
        <Gift className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => removerItem(grupoId, item.id)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4 w-full min-w-0 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-accent">Orçamento</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={limparTudo} className="text-xs">Limpar</Button>
          <Button size="sm" onClick={copiarOrcamento} className="text-xs gap-1 bg-accent hover:bg-accent/90">
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </Button>
        </div>
      </div>

      {/* Adicionar Item */}
      <div className="border border-border rounded-lg p-3 space-y-3 bg-card">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold shrink-0">Adicionar:</Label>
          <div className="flex gap-1">
            {(['modelo', 'produto', 'manual'] as ModoAdicao[]).map(modo => (
              <Button key={modo} size="sm" variant={modoAdicao === modo ? 'default' : 'outline'} className="text-xs h-7 capitalize" onClick={() => setModoAdicao(modo)}>
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
                  <SelectItem key={m.id} value={m.id}>{m.nome_modelo} - R${m.preco_base.toFixed(2)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={acoSelecionado} onValueChange={setAcoSelecionado}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Aço (opc.)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {acos.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.nome_opcao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={empunhaduraSelecionada} onValueChange={setEmpunhaduraSelecionada}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Empunh. (opc.)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {empunhaduras.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome_opcao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {modoAdicao === 'produto' && (
          <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
            <SelectContent>
              {produtos.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nome_produto} - R${p.preco_unitario.toFixed(2)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {modoAdicao === 'manual' && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input placeholder="Descrição do item" value={descricaoManual} onChange={e => setDescricaoManual(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Valor" value={valorManual} onChange={e => setValorManual(e.target.value)} className="h-8 text-xs w-24" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Select value={grupoAlvo || 'solto'} onValueChange={v => setGrupoAlvo(v === 'solto' ? null : v)}>
            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Destino" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="solto">Item solto</SelectItem>
              {grupos.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={adicionarItem} className="h-8 text-xs gap-1 bg-accent hover:bg-accent/90">
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Criar Grupo */}
      <div className="flex items-center gap-2">
        <Input placeholder="Nome do grupo/kit" value={novoGrupoNome} onChange={e => setNovoGrupoNome(e.target.value)} className="h-8 text-xs flex-1" />
        <Button size="sm" variant="outline" onClick={criarGrupo} className="h-8 text-xs gap-1">
          <Package className="h-3.5 w-3.5" />
          Criar Grupo
        </Button>
      </div>

      {/* Inclusões padrão */}
      <div className="flex flex-wrap items-center gap-3 p-2 rounded-lg bg-muted/50 text-xs">
        <div className="flex items-center gap-1.5">
          <Checkbox id="cert" checked={incluirCertificado} onCheckedChange={c => setIncluirCertificado(c === true)} className="h-3.5 w-3.5" />
          <Label htmlFor="cert" className="text-xs cursor-pointer">Certificado</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox id="bainha" checked={incluirBainha} onCheckedChange={c => setIncluirBainha(c === true)} className="h-3.5 w-3.5" />
          <Label htmlFor="bainha" className="text-xs cursor-pointer">Bainha</Label>
        </div>
        {incluirBainha && (
          <Input value={tipoBainha} onChange={e => setTipoBainha(e.target.value)} className="h-7 text-xs w-20" />
        )}
        <div className="flex items-center gap-1.5">
          <Checkbox id="clipes" checked={incluirClipes} onCheckedChange={c => setIncluirClipes(c === true)} className="h-3.5 w-3.5" />
          <Label htmlFor="clipes" className="text-xs cursor-pointer">Clipes</Label>
        </div>
      </div>

      {/* Grupos */}
      {grupos.map(grupo => (
        <div key={grupo.id} className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-2 bg-muted/30 cursor-pointer" onClick={() => toggleGrupo(grupo.id)}>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">{grupo.nome}</span>
              <Badge variant="outline" className="text-[10px]">{grupo.itens.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-accent">R$ {calcularTotalGrupo(grupo.itens).toFixed(2).replace('.', ',')}</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={e => { e.stopPropagation(); removerGrupo(grupo.id); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
              {grupo.aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
          {grupo.aberto && (
            <div className="p-2 space-y-1">
              {grupo.itens.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum item neste grupo</p>
              )}
              {grupo.itens.map(item => renderItem(item, grupo.id))}
            </div>
          )}
        </div>
      ))}

      {/* Itens Soltos */}
      {itensSoltos.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Itens avulsos</p>
          {itensSoltos.map(item => renderItem(item, null))}
        </div>
      )}

      {/* Pagamento */}
      <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
        <div className="flex items-center gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Parcelas</Label>
            <Input type="number" min="1" value={parcelas} onChange={e => setParcelas(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex items-center gap-1.5 pt-4">
            <Checkbox id="semJuros" checked={semJuros} onCheckedChange={c => setSemJuros(c === true)} className="h-3.5 w-3.5" />
            <Label htmlFor="semJuros" className="text-xs cursor-pointer">Sem juros</Label>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm font-bold">Total</span>
          <div className="text-right">
            <span className="text-lg font-bold text-accent">R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
            {parseInt(parcelas) > 1 && (
              <p className="text-xs text-muted-foreground">
                {parcelas}x{semJuros ? ' sem juros' : ''} de R$ {valorParcela.toFixed(2).replace('.', ',')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {(grupos.length > 0 || itensSoltos.length > 0) && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
              Pré-visualizar texto <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap break-words font-sans">
              {gerarTexto()}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
