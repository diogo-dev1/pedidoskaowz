import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, Plus, Search, Check, Eye, Copy, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProdutoAdicionalCard from '@/components/ProdutoAdicionalCard';
import { InfoEtapaModal } from '@/components/InfoEtapaModal';
import edcKnife from '@/assets/edc-knife.svg';

interface ModeloBase {
  id: string;
  nome_modelo: string;
  preco_base: number;
  categoria: string | null;
  imagem_modelo: string | null;
}

interface OpcaoComponente {
  id: string;
  nome_opcao: string;
  tipo_opcao: 'Aço' | 'Empunhadura' | 'Acabamento' | 'Bainha';
  preco_adicional: number;
}

interface ProdutoAdicional {
  id: string;
  nome_produto: string;
  preco_unitario: number;
}

interface LaminaCustomizada {
  id: string;
  modelo: ModeloBase | null;
  aco: OpcaoComponente | null;
  acabamento: OpcaoComponente | null;
  empunhadura: OpcaoComponente | null;
  bainha: OpcaoComponente | null;
  corBainha: string;
  laser: boolean;
  textoLaser: string;
  localGravacao: string[];
  embalagem: string;
  embalagemGravacao: boolean;
  embalagemTextoGravacao: string;
  subtotal: number;
}

const CORES_BAINHA = ['Preto', 'Coyote', 'Orange', 'Verde'];
const LOCAIS_GRAVACAO = ['Dorso Superior', 'Dorso Inferior', 'Lâmina'];

export default function Simulador() {
  const { profile } = useAuth();
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [componentes, setComponentes] = useState<OpcaoComponente[]>([]);
  const [produtosAdicionais, setProdutosAdicionais] = useState<ProdutoAdicional[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado da lâmina atual sendo configurada
  const [modeloSelecionado, setModeloSelecionado] = useState<string>('');
  const [acoSelecionado, setAcoSelecionado] = useState<string>('');
  const [acabamentoSelecionado, setAcabamentoSelecionado] = useState<string>('');
  const [empunhaduraSelecionada, setEmpunhaduraSelecionada] = useState<string>('');
  const [bainhaSelecionada, setBainhaSelecionada] = useState<string>('');
  const [corBainha, setCorBainha] = useState<string>('');
  const [laser, setLaser] = useState(false);
  const [textoLaser, setTextoLaser] = useState('');
  const [localGravacao, setLocalGravacao] = useState<string[]>([]);
  const [embalagem, setEmbalagem] = useState('');
  const [embalagemGravacao, setEmbalagemGravacao] = useState(false);
  const [embalagemTextoGravacao, setEmbalagemTextoGravacao] = useState('');
  const [buscaModelo, setBuscaModelo] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');

  // Lista de lâminas customizadas
  const [laminasCustomizadas, setLaminasCustomizadas] = useState<LaminaCustomizada[]>([]);
  const [quantidadesProdutos, setQuantidadesProdutos] = useState<Record<string, number>>({});

  // Modal para visualizar lâmina
  const [laminaModalAberta, setLaminaModalAberta] = useState<LaminaCustomizada | null>(null);

  // Modal de finalização
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false);
  const [textoFormatado, setTextoFormatado] = useState('');
  const [exportandoSheets, setExportandoSheets] = useState(false);

  // Dados do cliente
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [nomeCertificado, setNomeCertificado] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [canal, setCanal] = useState('');
  const [status, setStatus] = useState('Pendente');
  const [origemCliente, setOrigemCliente] = useState('');
  const [observacao, setObservacao] = useState('');
  const [cupom, setCupom] = useState('');

  // Modal IA
  const [modalIAOpen, setModalIAOpen] = useState(false);
  const [textoIA, setTextoIA] = useState('');
  const [processandoIA, setProcessandoIA] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [modelosRes, componentesRes, produtosRes] = await Promise.all([
        supabase.from('modelos').select('*').order('nome_modelo'),
        supabase.from('opcoes_componentes').select('*').order('tipo_opcao'),
        supabase.from('produtos_adicionais').select('*').order('nome_produto')
      ]);

      if (modelosRes.data) setModelos(modelosRes.data);
      if (componentesRes.data) setComponentes(componentesRes.data as OpcaoComponente[]);
      if (produtosRes.data) setProdutosAdicionais(produtosRes.data as ProdutoAdicional[]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar opções');
    } finally {
      setLoading(false);
    }
  };

  const acos = componentes.filter(c => c.tipo_opcao === 'Aço');
  const acabamentos = componentes.filter(c => c.tipo_opcao === 'Acabamento');
  const empunhaduras = componentes.filter(c => c.tipo_opcao === 'Empunhadura');
  const bainhas = componentes.filter(c => c.tipo_opcao === 'Bainha');

  const categorias = ['EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR', 'Upsell'];

  const modelosFiltrados = modelos.filter(m => {
    const matchBusca = m.nome_modelo.toLowerCase().includes(buscaModelo.toLowerCase());
    const matchCategoria = !categoriaFiltro || m.categoria === categoriaFiltro;
    return matchBusca && matchCategoria;
  });

  const mostrarModelos = categoriaFiltro !== '' || buscaModelo.trim() !== '';

  // Objetos selecionados para exibição no resumo em tempo real
  const modeloAtual = modelos.find(m => m.id === modeloSelecionado);
  const acoAtual = componentes.find(c => c.id === acoSelecionado);
  const acabamentoAtual = componentes.find(c => c.id === acabamentoSelecionado);
  const empunhaduraAtual = componentes.find(c => c.id === empunhaduraSelecionada);
  const bainhaAtual = componentes.find(c => c.id === bainhaSelecionada);

  const calcularSubtotal = (): number => {
    const precoBase = modeloAtual?.preco_base || 0;
    const precoAco = acoAtual?.preco_adicional || 0;
    const precoAcabamento = acabamentoAtual?.preco_adicional || 0;
    const precoEmpunhadura = empunhaduraAtual?.preco_adicional || 0;
    const precoBainha = bainhaAtual?.preco_adicional || 0;
    const precoLaser = laser ? 30 : 0;
    return precoBase + precoAco + precoAcabamento + precoEmpunhadura + precoBainha + precoLaser;
  };

  const valorTotalCalculado = useMemo(() => {
    const totalLaminas = laminasCustomizadas.reduce((sum, l) => sum + l.subtotal, 0);
    const subtotalAtual = modeloSelecionado ? calcularSubtotal() : 0;
    const precoProdutosAdicionais = produtosAdicionais.reduce((total, produto) => {
      const quantidade = quantidadesProdutos[produto.id] || 0;
      return total + (produto.preco_unitario * quantidade);
    }, 0);
    return totalLaminas + subtotalAtual + precoProdutosAdicionais;
  }, [laminasCustomizadas, modeloSelecionado, calcularSubtotal, produtosAdicionais, quantidadesProdutos]);

  const adicionarLamina = () => {
    if (!modeloSelecionado) {
      toast.error('Selecione um modelo');
      return;
    }

    const novaLamina: LaminaCustomizada = {
      id: `${Date.now()}-${Math.random()}`,
      modelo: modeloAtual || null,
      aco: acoAtual || null,
      acabamento: acabamentoAtual || null,
      empunhadura: empunhaduraAtual || null,
      bainha: bainhaAtual || null,
      corBainha,
      laser,
      textoLaser,
      localGravacao,
      embalagem,
      embalagemGravacao,
      embalagemTextoGravacao,
      subtotal: calcularSubtotal(),
    };

    setLaminasCustomizadas([...laminasCustomizadas, novaLamina]);
    limparFormulario();
    toast.success('Lâmina adicionada!');
  };

  const removerLamina = (id: string) => {
    setLaminasCustomizadas(laminasCustomizadas.filter(l => l.id !== id));
    toast.success('Lâmina removida');
  };

  const limparFormulario = () => {
    setModeloSelecionado('');
    setAcoSelecionado('');
    setAcabamentoSelecionado('');
    setEmpunhaduraSelecionada('');
    setBainhaSelecionada('');
    setCorBainha('');
    setLaser(false);
    setTextoLaser('');
    setLocalGravacao([]);
    setEmbalagem('');
    setEmbalagemGravacao(false);
    setEmbalagemTextoGravacao('');
    setBuscaModelo('');
    setCategoriaFiltro('');
  };

  const resetSimulacao = () => {
    limparFormulario();
    setLaminasCustomizadas([]);
    setQuantidadesProdutos({});
    setNomeCompleto('');
    setCpf('');
    setEmail('');
    setCelular('');
    setCep('');
    setEndereco('');
    setNumero('');
    setBairro('');
    setCidade('');
    setEstado('');
    setComplemento('');
    setNomeCertificado('');
    setFormaPagamento('');
    setDataNascimento('');
    setCanal('');
    setStatus('Pendente');
    setOrigemCliente('');
    setObservacao('');
    setCupom('');
    setPedidoFinalizado(false);
    setTextoFormatado('');
  };

  const processarTextoComIA = async () => {
    if (!textoIA.trim()) {
      toast.error('Cole os dados do pedido no campo de texto');
      return;
    }

    setProcessandoIA(true);

    try {
      const { data, error } = await supabase.functions.invoke('parse-order-data', {
        body: { text: textoIA }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const extractedData = data.data;

      // Preencher dados do cliente
      if (extractedData.cliente) {
        if (extractedData.cliente.nomeCompleto) setNomeCompleto(extractedData.cliente.nomeCompleto);
        if (extractedData.cliente.cpf) setCpf(extractedData.cliente.cpf);
        if (extractedData.cliente.email) setEmail(extractedData.cliente.email);
        if (extractedData.cliente.celular) setCelular(extractedData.cliente.celular);
        if (extractedData.cliente.cep) setCep(extractedData.cliente.cep);
        if (extractedData.cliente.endereco) setEndereco(extractedData.cliente.endereco);
        if (extractedData.cliente.numero) setNumero(extractedData.cliente.numero);
        if (extractedData.cliente.bairro) setBairro(extractedData.cliente.bairro);
        if (extractedData.cliente.cidade) setCidade(extractedData.cliente.cidade);
        if (extractedData.cliente.estado) setEstado(extractedData.cliente.estado);
        if (extractedData.cliente.complemento) setComplemento(extractedData.cliente.complemento);
        if (extractedData.cliente.dataNascimento) setDataNascimento(extractedData.cliente.dataNascimento);
        if (extractedData.cliente.nomeCertificado) setNomeCertificado(extractedData.cliente.nomeCertificado);
      }

      // Preencher dados do pedido
      if (extractedData.pedido) {
        if (extractedData.pedido.canal) setCanal(extractedData.pedido.canal);
        if (extractedData.pedido.status) setStatus(extractedData.pedido.status);
        if (extractedData.pedido.origemCliente) setOrigemCliente(extractedData.pedido.origemCliente);
        if (extractedData.pedido.observacao) setObservacao(extractedData.pedido.observacao);
        if (extractedData.pedido.cupom) setCupom(extractedData.pedido.cupom);
        if (extractedData.pedido.formaPagamento) setFormaPagamento(extractedData.pedido.formaPagamento);
      }

      toast.success('Dados preenchidos com sucesso!');
      setModalIAOpen(false);
      setTextoIA('');
    } catch (error) {
      console.error('Erro ao processar com IA:', error);
      toast.error('Erro ao processar dados com IA');
    } finally {
      setProcessandoIA(false);
    }
  };

  const handleFinalizarPedido = async () => {
    if (!nomeCompleto || !formaPagamento) {
      toast.error('Preencha pelo menos o nome e a forma de pagamento');
      return;
    }

    if (laminasCustomizadas.length === 0 && !modeloSelecionado) {
      toast.error('Adicione pelo menos uma lâmina ao orçamento');
      return;
    }

    setSubmitting(true);

    try {
      const todasLaminas = [...laminasCustomizadas];
      if (modeloSelecionado && modeloAtual) {
        todasLaminas.push({
          id: crypto.randomUUID(),
          modelo: modeloAtual,
          aco: acoAtual || null,
          acabamento: acabamentoAtual || null,
          empunhadura: empunhaduraAtual || null,
          bainha: bainhaAtual || null,
          corBainha,
          laser,
          textoLaser,
          localGravacao,
          embalagem,
          embalagemGravacao,
          embalagemTextoGravacao,
          subtotal: calcularSubtotal(),
        });
      }

      const descricoesPedidos = todasLaminas.map((lamina, index) => {
        const desc = `${lamina.modelo?.nome_modelo || ''} ${lamina.aco?.nome_opcao || ''} ${lamina.acabamento?.nome_opcao || ''} empunhadura em ${lamina.empunhadura?.nome_opcao || ''} ${lamina.bainha?.nome_opcao || ''}`;
        return `Lâmina ${index + 1}: ${desc}`;
      }).join('\n');

      const linhasFormatadas = todasLaminas.map((lamina) => {
        return `${nomeCompleto}, ${lamina.modelo?.nome_modelo || ''}, ${lamina.aco?.nome_opcao || ''}, ${lamina.acabamento?.nome_opcao || ''}, ${lamina.empunhadura?.nome_opcao || ''}, ${lamina.bainha?.nome_opcao || ''}, ${lamina.corBainha || ''}`;
      }).join('\n');

      const personalizacoesLaser = todasLaminas
        .filter(l => l.laser && l.textoLaser)
        .map((l, index) => `Lâmina ${index + 1}: ${l.textoLaser} (${l.localGravacao.join(', ') || 'Não especificado'})`)
        .join('\n');

      const texto = `1. NOME: ${nomeCompleto}
2. CPF: ${cpf}
3. CEP: ${cep}
4. ESTADO: ${estado}
5. CIDADE: ${cidade}
6. BAIRRO: ${bairro}
7. ENDEREÇO: ${endereco}
8. NÚMERO: ${numero}
9. COMPLEMENTO: ${complemento}
10. CELULAR: ${celular}
11. E-MAIL: ${email}
12. DATA DE NASCIMENTO: ${dataNascimento}
13. PEDIDO:
${descricoesPedidos}
14. VALOR: ${valorTotalCalculado.toFixed(2)}
15. FORMA DE PAGAMENTO: ${formaPagamento}
16. PERSONALIZAÇÃO À LASER: ${personalizacoesLaser || 'Não'}
17. NOME PROPRIETÁRIO P/ CERTIFICADO: ${nomeCertificado || nomeCompleto}
Vendedor: ${profile?.nome_vendedor || ''}

${linhasFormatadas}`;

      setTextoFormatado(texto);
      setPedidoFinalizado(true);
      toast.success('Pedido finalizado com sucesso!');
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      toast.error('Erro ao finalizar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const copiarTexto = () => {
    navigator.clipboard.writeText(textoFormatado);
    toast.success('Texto copiado para a área de transferência!');
  };

  const exportarParaSheets = async () => {
    setExportandoSheets(true);

    try {
      const todasLaminas = [...laminasCustomizadas];
      if (modeloSelecionado && modeloAtual) {
        todasLaminas.push({
          id: crypto.randomUUID(),
          modelo: modeloAtual,
          aco: acoAtual || null,
          acabamento: acabamentoAtual || null,
          empunhadura: empunhaduraAtual || null,
          bainha: bainhaAtual || null,
          corBainha,
          laser,
          textoLaser,
          localGravacao,
          embalagem,
          embalagemGravacao,
          embalagemTextoGravacao,
          subtotal: calcularSubtotal(),
        });
      }

      const laminasFormatadas = todasLaminas.map(lamina => ({
        modelo: lamina.modelo?.nome_modelo || '',
        aco: lamina.aco?.nome_opcao || '',
        empunhadura: lamina.empunhadura?.nome_opcao || '',
        acabamento: lamina.acabamento?.nome_opcao || '',
        bainha: lamina.bainha?.nome_opcao || '',
        corBainha: lamina.corBainha,
        laser: lamina.laser,
        textoLaser: lamina.textoLaser,
        localGravacao: lamina.localGravacao.join(', '),
        embalagem: lamina.embalagem,
        embalagemGravacao: lamina.embalagemGravacao,
        embalagemTextoGravacao: lamina.embalagemTextoGravacao,
        subtotal: lamina.subtotal,
      }));

      const produtosFormatados = produtosAdicionais
        .filter(produto => (quantidadesProdutos[produto.id] || 0) > 0)
        .map(produto => ({
          nome: produto.nome_produto,
          quantidade: quantidadesProdutos[produto.id],
          precoUnitario: produto.preco_unitario,
          total: produto.preco_unitario * quantidadesProdutos[produto.id],
        }));

      const exportData = {
        nomeCompleto,
        cpf,
        email,
        celular,
        cep,
        endereco,
        numero,
        bairro,
        cidade,
        estado,
        complemento,
        dataNascimento,
        nomeCertificado: nomeCertificado || nomeCompleto,
        formaPagamento,
        canal,
        status,
        origemCliente,
        observacao,
        cupom,
        laminas: laminasFormatadas,
        produtosAdicionais: produtosFormatados,
        valorTotal: valorTotalCalculado,
        vendedor: profile?.nome_vendedor || '',
      };

      const { error } = await supabase.functions.invoke('export-to-sheets', {
        body: exportData,
      });

      if (error) throw error;

      toast.success('Pedido exportado para Google Sheets com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar para Google Sheets:', error);
      toast.error('Erro ao exportar para Google Sheets. Verifique as configurações.');
    } finally {
      setExportandoSheets(false);
    }
  };

  const fecharModal = () => {
    setModalOpen(false);
    resetSimulacao();
  };

  const getModeloImagem = (modelo: ModeloBase | null | undefined) => {
    if (!modelo) return edcKnife;
    return modelo.imagem_modelo || edcKnife;
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando opções...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-4 py-6">
        {/* Botão de Preencher com IA */}
        <div className="flex justify-end mb-4">
          <Button onClick={() => setModalIAOpen(true)} variant="outline" className="gap-2">
            ✨ Preencher com IA
          </Button>
        </div>

        {/* Miniatura do modelo selecionado */}
        {modeloSelecionado && (
          <div className="mb-4 md:mb-6 flex justify-center animate-fade-in">
            <div className="relative w-full max-w-[300px] md:max-w-[500px] h-32 md:h-40 rounded-lg overflow-hidden border border-accent shadow-lg bg-white p-2 md:p-4">
              <img
                src={getModeloImagem(modeloAtual)}
                alt="Modelo selecionado"
                className="w-full h-full object-contain filter drop-shadow-sm"
                style={{ filter: 'contrast(1.2) brightness(0.95)' }}
              />
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Coluna Principal - Configuração */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Seleção de Modelo */}
              <div className="bg-card rounded-lg border border-border p-3 md:p-6 space-y-3 md:space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base md:text-lg">1. Escolha o Modelo</h3>
                    <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                  </div>
                  <InfoEtapaModal etapaKey="modelo" showLabel />
                </div>

                {/* Filtros de Categoria */}
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {categorias.map(cat => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={categoriaFiltro === cat ? "default" : "outline"}
                      onClick={() => setCategoriaFiltro(cat === categoriaFiltro ? '' : cat)}
                      className="h-7 md:h-8 text-xs px-2 md:px-3"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar modelo..."
                    value={buscaModelo}
                    onChange={(e) => setBuscaModelo(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {!mostrarModelos ? (
                  <div className="text-center py-6 md:py-8 text-xs md:text-sm text-muted-foreground border border-border rounded-lg">
                    Use a busca ou selecione uma categoria para ver os modelos
                  </div>
                ) : modelosFiltrados.length === 0 ? (
                  <div className="text-center py-6 md:py-8 text-xs md:text-sm text-muted-foreground border border-border rounded-lg">
                    Nenhum modelo encontrado
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 md:gap-2 max-h-48 md:max-h-60 overflow-y-auto border border-border rounded-lg p-1.5 md:p-2">
                    {modelosFiltrados.map(modelo => (
                      <button
                        key={modelo.id}
                        onClick={() => setModeloSelecionado(modelo.id)}
                        className={`p-2 md:p-3 rounded-lg text-left transition-all ${
                          modeloSelecionado === modelo.id
                            ? 'bg-accent text-accent-foreground shadow-md'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs md:text-sm truncate">{modelo.nome_modelo}</div>
                            {modelo.categoria && (
                              <Badge variant="outline" className="text-[10px] md:text-xs px-1 md:px-1.5 py-0 mt-0.5">
                                {modelo.categoria}
                              </Badge>
                            )}
                          </div>
                          {modeloSelecionado === modelo.id && <Check className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Opções de Customização */}
              {modeloSelecionado && (
                <div className="bg-card rounded-lg border border-border p-3 md:p-6">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="aco" className="border-border">
                      <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                        <span className="flex items-center gap-2">
                          2. Tipo de Aço {acoSelecionado && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Selecionado</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1.5 md:space-y-2 pt-2">
                        <div className="mb-2 flex justify-end">
                          <InfoEtapaModal etapaKey="aco" showLabel />
                        </div>
                        {acos.map(aco => (
                          <button
                            key={aco.id}
                            onClick={() => setAcoSelecionado(aco.id)}
                            className={`w-full p-2 md:p-2.5 rounded text-left text-xs md:text-sm transition-all ${
                              acoSelecionado === aco.id ? 'bg-accent text-accent-foreground' : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <span className="truncate">{aco.nome_opcao}</span>
                          </button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="acabamento" className="border-border">
                      <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                        <span className="flex items-center gap-2">
                          3. Acabamento {acabamentoSelecionado && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Selecionado</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1.5 md:space-y-2 pt-2">
                        <div className="mb-2 flex justify-end">
                          <InfoEtapaModal etapaKey="acabamento" showLabel />
                        </div>
                        {acabamentos.map(acabamento => (
                          <button
                            key={acabamento.id}
                            onClick={() => setAcabamentoSelecionado(acabamento.id)}
                            className={`w-full p-2 md:p-2.5 rounded text-left text-xs md:text-sm transition-all ${
                              acabamentoSelecionado === acabamento.id ? 'bg-accent text-accent-foreground' : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <span className="truncate">{acabamento.nome_opcao}</span>
                          </button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="empunhadura" className="border-border">
                      <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                        <span className="flex items-center gap-2">
                          4. Empunhadura {empunhaduraSelecionada && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Selecionado</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1.5 md:space-y-2 pt-2">
                        <div className="mb-2 flex justify-end">
                          <InfoEtapaModal etapaKey="empunhadura" showLabel />
                        </div>
                        {empunhaduras.map(empunhadura => (
                          <button
                            key={empunhadura.id}
                            onClick={() => setEmpunhaduraSelecionada(empunhadura.id)}
                            className={`w-full p-2 md:p-2.5 rounded text-left text-xs md:text-sm transition-all ${
                              empunhaduraSelecionada === empunhadura.id ? 'bg-accent text-accent-foreground' : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <span className="truncate">{empunhadura.nome_opcao}</span>
                          </button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="bainha" className="border-border">
                      <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                        <span className="flex items-center gap-2">
                          5. Bainha {bainhaSelecionada && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Selecionado</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <div className="mb-2 flex justify-end">
                          <InfoEtapaModal etapaKey="bainha" showLabel />
                        </div>
                        <div className="space-y-1.5 md:space-y-2">
                          {bainhas.map(bainha => (
                            <button
                              key={bainha.id}
                              onClick={() => setBainhaSelecionada(bainha.id)}
                              className={`w-full p-2 md:p-2.5 rounded text-left text-xs md:text-sm transition-all ${
                                bainhaSelecionada === bainha.id ? 'bg-accent text-accent-foreground' : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              <span className="truncate">{bainha.nome_opcao}</span>
                            </button>
                          ))}
                        </div>
                        {bainhaSelecionada && (
                          <div className="space-y-1.5 md:space-y-2 pt-2 border-t border-border">
                            <Label htmlFor="corBainha" className="text-xs">Cor da Bainha</Label>
                            <Select value={corBainha} onValueChange={setCorBainha}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione a cor" />
                              </SelectTrigger>
                              <SelectContent>
                                {CORES_BAINHA.map(cor => (
                                  <SelectItem key={cor} value={cor}>{cor}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="laser" className="border-border">
                      <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                        <span className="flex items-center gap-2">
                          6. Personalização à Laser {laser && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Ativo</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <div className="mb-2 flex justify-end">
                          <InfoEtapaModal etapaKey="laser" showLabel />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="laser"
                            checked={laser}
                            onCheckedChange={(checked) => setLaser(checked as boolean)}
                          />
                          <Label htmlFor="laser" className="text-xs md:text-sm cursor-pointer">
                            Adicionar personalização à laser
                          </Label>
                        </div>
                        {laser && (
                          <div className="space-y-3">
                            <div className="space-y-1.5 md:space-y-2">
                              <Label htmlFor="textoLaser" className="text-xs">Texto para gravação</Label>
                              <Input
                                id="textoLaser"
                                placeholder="Digite o texto..."
                                value={textoLaser}
                                onChange={(e) => setTextoLaser(e.target.value)}
                                className="text-xs md:text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Local da gravação</Label>
                              <div className="flex flex-wrap gap-2">
                                {LOCAIS_GRAVACAO.map(local => (
                                  <div
                                    key={local}
                                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                      localGravacao.includes(local)
                                        ? 'border-accent bg-accent/10'
                                        : 'border-border hover:border-accent/50'
                                    }`}
                                    onClick={() => {
                                      if (localGravacao.includes(local)) {
                                        setLocalGravacao(localGravacao.filter(l => l !== local));
                                      } else {
                                        setLocalGravacao([...localGravacao, local]);
                                      }
                                    }}
                                  >
                                    <Checkbox checked={localGravacao.includes(local)} />
                                    <span className="text-xs">{local}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="embalagem" className="border-border">
                      <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                        <span className="flex items-center gap-2">
                          7. Embalagem {embalagem && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Selecionado</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <div className="space-y-1.5 md:space-y-2">
                          <button
                            onClick={() => setEmbalagem(embalagem === 'Case Tática Personalizada' ? '' : 'Case Tática Personalizada')}
                            className={`w-full p-2 md:p-2.5 rounded text-left text-xs md:text-sm transition-all ${
                              embalagem === 'Case Tática Personalizada' ? 'bg-accent text-accent-foreground' : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>Case Tática Personalizada</span>
                              {embalagem === 'Case Tática Personalizada' && <Check className="h-4 w-4" />}
                            </div>
                          </button>
                        </div>
                        {embalagem === 'Case Tática Personalizada' && (
                          <div className="space-y-3 pt-2 border-t border-border">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="embalagemGravacao"
                                checked={embalagemGravacao}
                                onCheckedChange={(checked) => setEmbalagemGravacao(checked as boolean)}
                              />
                              <Label htmlFor="embalagemGravacao" className="text-xs md:text-sm cursor-pointer">
                                Adicionar gravação na embalagem
                              </Label>
                            </div>
                            {embalagemGravacao && (
                              <div className="space-y-1.5 md:space-y-2">
                                <Label htmlFor="embalagemTextoGravacao" className="text-xs">Texto para gravação na embalagem</Label>
                                <Input
                                  id="embalagemTextoGravacao"
                                  placeholder="Digite o texto..."
                                  value={embalagemTextoGravacao}
                                  onChange={(e) => setEmbalagemTextoGravacao(e.target.value)}
                                  className="text-xs md:text-sm"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}

              {/* Produtos Adicionais */}
              {produtosAdicionais.length > 0 && (
                <div className="bg-card rounded-lg border border-border p-3 md:p-6 space-y-3 md:space-y-4">
                  <h3 className="font-semibold text-base md:text-lg">Produtos Adicionais</h3>
                  <div className="grid gap-3 grid-cols-2">
                    {produtosAdicionais.map((produto) => (
                      <ProdutoAdicionalCard
                        key={produto.id}
                        nome={produto.nome_produto}
                        precoUnitario={produto.preco_unitario}
                        quantidade={quantidadesProdutos[produto.id] || 0}
                        onAdd={() => setQuantidadesProdutos(prev => ({
                          ...prev,
                          [produto.id]: (prev[produto.id] || 0) + 1
                        }))}
                        onRemove={() => setQuantidadesProdutos(prev => ({
                          ...prev,
                          [produto.id]: Math.max(0, (prev[produto.id] || 0) - 1)
                        }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Botão Adicionar */}
              {modeloSelecionado && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={adicionarLamina} className="flex-1 bg-accent hover:bg-accent/90 text-xs md:text-sm">
                    <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
                    Adicionar Lâmina
                  </Button>
                  <Button onClick={limparFormulario} variant="outline" className="text-xs md:text-sm">
                    Limpar
                  </Button>
                </div>
              )}
            </div>

            {/* Coluna Lateral - Resumo */}
            <div className="lg:col-span-1 space-y-4">
              {/* Resumo em Tempo Real */}
              {modeloSelecionado && (
                <div className="bg-card rounded-lg border border-border p-3 md:p-6 lg:sticky lg:top-24 space-y-3 md:space-y-4">
                  <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                    <Eye className="h-4 w-4 text-accent" />
                    Configuração Atual
                  </h3>

                  <div className="space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between py-1.5 border-b border-border">
                      <span className="text-muted-foreground">Modelo:</span>
                      <span className="font-medium text-right max-w-[60%] truncate">{modeloAtual?.nome_modelo || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border">
                      <span className="text-muted-foreground">Aço:</span>
                      <span className="font-medium text-right max-w-[60%] truncate">{acoAtual?.nome_opcao || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border">
                      <span className="text-muted-foreground">Acabamento:</span>
                      <span className="font-medium text-right max-w-[60%] truncate">{acabamentoAtual?.nome_opcao || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border">
                      <span className="text-muted-foreground">Empunhadura:</span>
                      <span className="font-medium text-right max-w-[60%] truncate">{empunhaduraAtual?.nome_opcao || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border">
                      <span className="text-muted-foreground">Bainha:</span>
                      <span className="font-medium text-right max-w-[60%] truncate">{bainhaAtual?.nome_opcao || '-'}</span>
                    </div>
                    {corBainha && (
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Cor da Bainha:</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{corBainha}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 border-b border-border">
                      <span className="text-muted-foreground">Laser:</span>
                      <span className="font-medium">{laser ? (textoLaser || 'Sim') : 'Não'}</span>
                    </div>
                    {laser && localGravacao.length > 0 && (
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Local:</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{localGravacao.join(', ')}</span>
                      </div>
                    )}
                    {embalagem && (
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Embalagem:</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{embalagem}</span>
                      </div>
                    )}
                    {embalagemGravacao && embalagemTextoGravacao && (
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Gravação Emb.:</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{embalagemTextoGravacao}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lâminas Adicionadas */}
              <div className="bg-card rounded-lg border border-border p-3 md:p-6 lg:sticky lg:top-24 space-y-3 md:space-y-4" style={{ top: modeloSelecionado ? 'calc(24rem + 6rem)' : '6rem' }}>
                <h3 className="font-semibold text-base md:text-lg">Lâminas Adicionadas ({laminasCustomizadas.length})</h3>

                {laminasCustomizadas.length === 0 ? (
                  <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">
                    Nenhuma lâmina adicionada ainda
                  </p>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {laminasCustomizadas.map((lamina) => (
                      <div
                        key={lamina.id}
                        className="p-2 md:p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => setLaminaModalAberta(lamina)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs md:text-sm truncate">{lamina.modelo?.nome_modelo}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                              {[lamina.aco?.nome_opcao, lamina.acabamento?.nome_opcao, lamina.empunhadura?.nome_opcao].filter(Boolean).join(' • ') || 'Clique para ver detalhes'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              removerLamina(lamina.id);
                            }}
                            className="h-7 w-7 md:h-8 md:w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar fixo com resumo */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Total do Pedido</p>
              <p className="text-2xl font-bold text-accent">R$ {valorTotalCalculado.toFixed(2)}</p>
            </div>

            {modeloSelecionado && (
              <Button onClick={adicionarLamina} variant="outline" size="sm" className="flex-shrink-0 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                Adicionar
              </Button>
            )}

            {(laminasCustomizadas.length > 0 || modeloSelecionado) && (
              <Button onClick={() => setModalOpen(true)} size="sm" className="flex-shrink-0 bg-accent hover:bg-accent/90">
                Fechar Pedido
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes da Lâmina */}
      <Dialog open={!!laminaModalAberta} onOpenChange={() => setLaminaModalAberta(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {laminaModalAberta?.modelo?.nome_modelo || 'Detalhes da Lâmina'}
            </DialogTitle>
          </DialogHeader>

          {laminaModalAberta && (
            <div className="space-y-3 text-sm">
              {/* SVG do modelo */}
              <div className="flex justify-center mb-4">
                <div className="w-full max-w-[200px] h-24 rounded-lg overflow-hidden border border-border bg-white p-2">
                  <img
                    src={getModeloImagem(laminaModalAberta.modelo)}
                    alt="Modelo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted p-2.5 rounded-lg">
                  <p className="text-muted-foreground text-xs">Modelo</p>
                  <p className="font-medium">{laminaModalAberta.modelo?.nome_modelo || '-'}</p>
                </div>
                <div className="bg-muted p-2.5 rounded-lg">
                  <p className="text-muted-foreground text-xs">Aço</p>
                  <p className="font-medium">{laminaModalAberta.aco?.nome_opcao || '-'}</p>
                </div>
                <div className="bg-muted p-2.5 rounded-lg">
                  <p className="text-muted-foreground text-xs">Acabamento</p>
                  <p className="font-medium">{laminaModalAberta.acabamento?.nome_opcao || '-'}</p>
                </div>
                <div className="bg-muted p-2.5 rounded-lg">
                  <p className="text-muted-foreground text-xs">Empunhadura</p>
                  <p className="font-medium">{laminaModalAberta.empunhadura?.nome_opcao || '-'}</p>
                </div>
                <div className="bg-muted p-2.5 rounded-lg">
                  <p className="text-muted-foreground text-xs">Bainha</p>
                  <p className="font-medium">{laminaModalAberta.bainha?.nome_opcao || '-'}</p>
                </div>
                {laminaModalAberta.corBainha && (
                  <div className="bg-muted p-2.5 rounded-lg">
                    <p className="text-muted-foreground text-xs">Cor da Bainha</p>
                    <p className="font-medium">{laminaModalAberta.corBainha}</p>
                  </div>
                )}
                {laminaModalAberta.embalagem && (
                  <div className="bg-muted p-2.5 rounded-lg col-span-2">
                    <p className="text-muted-foreground text-xs">Embalagem</p>
                    <p className="font-medium">{laminaModalAberta.embalagem}</p>
                    {laminaModalAberta.embalagemGravacao && laminaModalAberta.embalagemTextoGravacao && (
                      <p className="text-xs text-muted-foreground mt-1">Gravação: {laminaModalAberta.embalagemTextoGravacao}</p>
                    )}
                  </div>
                )}
              </div>

              {laminaModalAberta.laser && (
                <div className="bg-accent/10 p-3 rounded-lg border border-accent/20">
                  <p className="text-muted-foreground text-xs">Personalização à Laser</p>
                  <p className="font-medium">{laminaModalAberta.textoLaser || 'Sim'}</p>
                  {laminaModalAberta.localGravacao.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Local: {laminaModalAberta.localGravacao.join(', ')}</p>
                  )}
                </div>
              )}

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  removerLamina(laminaModalAberta.id);
                  setLaminaModalAberta(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Lâmina
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Finalização */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pedidoFinalizado ? 'Pedido Finalizado' : 'Finalizar Pedido'}</DialogTitle>
            <DialogDescription>
              {pedidoFinalizado ? 'Copie as informações abaixo' : 'Preencha os dados do cliente para enviar o pedido para produção'}
            </DialogDescription>
          </DialogHeader>

          {!pedidoFinalizado ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input id="nome" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="celular">Celular</Label>
                  <Input id="celular" value={celular} onChange={(e) => setCelular(e.target.value)} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input id="dataNascimento" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} placeholder="DD/MM/AAAA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input id="estado" value={estado} onChange={(e) => setEstado(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input id="complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificado">Nome para Certificado</Label>
                <Input id="certificado" value={nomeCertificado} onChange={(e) => setNomeCertificado(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagamento">Forma de Pagamento *</Label>
                <Input id="pagamento" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} placeholder="Ex: PIX, Cartão de Crédito, etc." required />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="canal">Canal</Label>
                  <Input id="canal" value={canal} onChange={(e) => setCanal(e.target.value)} placeholder="Ex: WhatsApp, Instagram" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Input id="status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Ex: Pendente, Pago" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origem">Origem Cliente</Label>
                  <Input id="origem" value={origemCliente} onChange={(e) => setOrigemCliente(e.target.value)} placeholder="Ex: Indicação, Redes Sociais" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Input id="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observações gerais do pedido" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cupom">Cupom</Label>
                <Input id="cupom" value={cupom} onChange={(e) => setCupom(e.target.value)} placeholder="Código de cupom (se houver)" />
              </div>

              <Button onClick={handleFinalizarPedido} disabled={submitting} className="w-full" size="lg">
                {submitting ? 'Finalizando...' : 'Finalizar Pedido'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono">{textoFormatado}</pre>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button onClick={copiarTexto} className="flex-1">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Texto
                  </Button>
                  <Button onClick={exportarParaSheets} disabled={exportandoSheets} variant="secondary" className="flex-1">
                    {exportandoSheets ? 'Exportando...' : 'Exportar para Sheets'}
                  </Button>
                </div>
                <Button onClick={fecharModal} variant="outline" className="w-full">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de IA para Preencher Dados */}
      <Dialog open={modalIAOpen} onOpenChange={setModalIAOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preencher Formulário com IA</DialogTitle>
            <DialogDescription>
              Cole os dados do pedido e a IA reconhecerá e preencherá automaticamente os campos do formulário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="textoIA">Cole os dados do pedido aqui</Label>
              <textarea
                id="textoIA"
                value={textoIA}
                onChange={(e) => setTextoIA(e.target.value)}
                placeholder="Cole aqui as informações do pedido..."
                className="w-full min-h-[300px] p-3 border border-border rounded-lg bg-background resize-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={processarTextoComIA} disabled={processandoIA || !textoIA.trim()} className="flex-1">
                {processandoIA ? 'Processando...' : '✨ Processar com IA'}
              </Button>
              <Button
                onClick={() => {
                  setModalIAOpen(false);
                  setTextoIA('');
                }}
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
