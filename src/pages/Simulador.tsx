import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Calculator, Copy, X, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ModelCard from '@/components/ModelCard';
import ComponentCard from '@/components/ComponentCard';
import ProdutoAdicionalCard from '@/components/ProdutoAdicionalCard';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ModeloBase {
  id: string;
  nome_modelo: string;
  preco_base: number;
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

interface LaminaConfigurada {
  id: string;
  modelo: ModeloBase;
  aco: OpcaoComponente | null;
  empunhadura: OpcaoComponente | null;
  acabamento: OpcaoComponente | null;
  bainha: OpcaoComponente | null;
  laser: boolean;
  textoLaser: string;
  subtotal: number;
}

export default function Simulador() {
  const { profile } = useAuth();
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [componentes, setComponentes] = useState<OpcaoComponente[]>([]);
  const [produtosAdicionais, setProdutosAdicionais] = useState<ProdutoAdicional[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de seleção para a lâmina atual
  const [selectedModel, setSelectedModel] = useState<ModeloBase | null>(null);
  const [selectedAco, setSelectedAco] = useState<OpcaoComponente | null>(null);
  const [selectedEmpunhadura, setSelectedEmpunhadura] = useState<OpcaoComponente | null>(null);
  const [selectedAcabamento, setSelectedAcabamento] = useState<OpcaoComponente | null>(null);
  const [selectedBainha, setSelectedBainha] = useState<OpcaoComponente | null>(null);
  const [selectedLaser, setSelectedLaser] = useState(false);
  const [textLaser, setTextLaser] = useState('');
  const [quantidadesProdutos, setQuantidadesProdutos] = useState<Record<string, number>>({});
  
  // Lista de lâminas configuradas
  const [laminasConfiguradas, setLaminasConfiguradas] = useState<LaminaConfigurada[]>([]);
  const [editandoLaminaId, setEditandoLaminaId] = useState<string | null>(null);

  // Modal de finalização
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
  const [corBainha, setCorBainha] = useState('');
  const [observacaoLamina, setObservacaoLamina] = useState('');
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false);
  const [textoFormatado, setTextoFormatado] = useState('');
  const [exportandoSheets, setExportandoSheets] = useState(false);
  const [modalIAOpen, setModalIAOpen] = useState(false);
  const [textoIA, setTextoIA] = useState('');
  const [processandoIA, setProcessandoIA] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [modelosRes, componentesRes, produtosRes] = await Promise.all([
      supabase.from('modelos_base').select('*').order('nome_modelo'),
      supabase.from('opcoes_componentes').select('*').order('tipo_opcao'),
      supabase.from('produtos_adicionais').select('*').order('nome_produto')
    ]);

    if (modelosRes.data) setModelos(modelosRes.data);
    if (componentesRes.data) setComponentes(componentesRes.data as OpcaoComponente[]);
    if (produtosRes.data) setProdutosAdicionais(produtosRes.data as ProdutoAdicional[]);
    setLoading(false);
  };

  // Filtrar componentes por tipo
  const acos = useMemo(() => componentes.filter(c => c.tipo_opcao === 'Aço'), [componentes]);
  const empunhaduras = useMemo(() => componentes.filter(c => c.tipo_opcao === 'Empunhadura'), [componentes]);
  const acabamentos = useMemo(() => componentes.filter(c => c.tipo_opcao === 'Acabamento'), [componentes]);
  const bainhas = useMemo(() => componentes.filter(c => c.tipo_opcao === 'Bainha'), [componentes]);

  // Cálculo do subtotal da lâmina atual
  const subtotalLaminaAtual = useMemo(() => {
    const precoBase = selectedModel?.preco_base || 0;
    const precoAco = selectedAco?.preco_adicional || 0;
    const precoEmpunhadura = selectedEmpunhadura?.preco_adicional || 0;
    const precoAcabamento = selectedAcabamento?.preco_adicional || 0;
    const precoBainha = selectedBainha?.preco_adicional || 0;
    const precoLaser = selectedLaser ? 30 : 0;

    return precoBase + precoAco + precoEmpunhadura + precoAcabamento + precoBainha + precoLaser;
  }, [selectedModel, selectedAco, selectedEmpunhadura, selectedAcabamento, selectedBainha, selectedLaser]);

  // Cálculo do total geral
  const valorTotalCalculado = useMemo(() => {
    const totalLaminas = laminasConfiguradas.reduce((total, lamina) => total + lamina.subtotal, 0);
    const totalLaminaAtual = subtotalLaminaAtual;
    
    const precoProdutosAdicionais = produtosAdicionais.reduce((total, produto) => {
      const quantidade = quantidadesProdutos[produto.id] || 0;
      return total + (produto.preco_unitario * quantidade);
    }, 0);

    return totalLaminas + totalLaminaAtual + precoProdutosAdicionais;
  }, [laminasConfiguradas, subtotalLaminaAtual, produtosAdicionais, quantidadesProdutos]);

  const limparLaminaAtual = () => {
    setSelectedModel(null);
    setSelectedAco(null);
    setSelectedEmpunhadura(null);
    setSelectedAcabamento(null);
    setSelectedBainha(null);
    setSelectedLaser(false);
    setTextLaser('');
    setCorBainha('');
    setObservacaoLamina('');
    setEditandoLaminaId(null);
  };

  const adicionarLamina = () => {
    if (!selectedModel) {
      toast.error('Selecione um modelo para adicionar a lâmina');
      return;
    }

    const novaLamina: LaminaConfigurada = {
      id: editandoLaminaId || crypto.randomUUID(),
      modelo: selectedModel,
      aco: selectedAco,
      empunhadura: selectedEmpunhadura,
      acabamento: selectedAcabamento,
      bainha: selectedBainha,
      laser: selectedLaser,
      textoLaser: textLaser,
      subtotal: subtotalLaminaAtual,
    };

    if (editandoLaminaId) {
      setLaminasConfiguradas(prev => 
        prev.map(l => l.id === editandoLaminaId ? novaLamina : l)
      );
      toast.success('Lâmina atualizada com sucesso!');
    } else {
      setLaminasConfiguradas(prev => [...prev, novaLamina]);
      toast.success('Lâmina adicionada ao orçamento!');
    }

    limparLaminaAtual();
  };

  const editarLamina = (lamina: LaminaConfigurada) => {
    setSelectedModel(lamina.modelo);
    setSelectedAco(lamina.aco);
    setSelectedEmpunhadura(lamina.empunhadura);
    setSelectedAcabamento(lamina.acabamento);
    setSelectedBainha(lamina.bainha);
    setSelectedLaser(lamina.laser);
    setTextLaser(lamina.textoLaser);
    setEditandoLaminaId(lamina.id);
    toast.info('Editando lâmina - faça as alterações e clique em "Atualizar Lâmina"');
  };

  const removerLamina = (id: string) => {
    setLaminasConfiguradas(prev => prev.filter(l => l.id !== id));
    if (editandoLaminaId === id) {
      limparLaminaAtual();
    }
    toast.success('Lâmina removida do orçamento');
  };

  const resetSimulacao = () => {
    limparLaminaAtual();
    setLaminasConfiguradas([]);
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

      // Processar lâminas
      if (extractedData.laminas && extractedData.laminas.length > 0) {
        const laminasProcessadas: LaminaConfigurada[] = [];

        for (const laminaData of extractedData.laminas) {
          // Encontrar modelo correspondente
          const modelo = modelos.find(m => 
            m.nome_modelo.toLowerCase().includes(laminaData.modelo?.toLowerCase() || '')
          );

          if (modelo) {
            const aco = laminaData.aco ? acos.find(a => 
              a.nome_opcao.toLowerCase().includes(laminaData.aco.toLowerCase())
            ) : null;

            const acabamento = laminaData.acabamento ? acabamentos.find(a => 
              a.nome_opcao.toLowerCase().includes(laminaData.acabamento.toLowerCase())
            ) : null;

            const empunhadura = laminaData.empunhadura ? empunhaduras.find(e => 
              e.nome_opcao.toLowerCase().includes(laminaData.empunhadura.toLowerCase())
            ) : null;

            const bainha = laminaData.bainha ? bainhas.find(b => 
              b.nome_opcao.toLowerCase().includes(laminaData.bainha.toLowerCase())
            ) : null;

            const temLaser = !!laminaData.textoLaser;
            const precoLaser = temLaser ? 30 : 0;

            const subtotal = 
              modelo.preco_base + 
              (aco?.preco_adicional || 0) + 
              (acabamento?.preco_adicional || 0) + 
              (empunhadura?.preco_adicional || 0) + 
              (bainha?.preco_adicional || 0) + 
              precoLaser;

            laminasProcessadas.push({
              id: crypto.randomUUID(),
              modelo,
              aco: aco || null,
              acabamento: acabamento || null,
              empunhadura: empunhadura || null,
              bainha: bainha || null,
              laser: temLaser,
              textoLaser: laminaData.textoLaser || '',
              subtotal
            });

            // Preencher cor da bainha e observação da primeira lâmina
            if (laminasProcessadas.length === 1) {
              if (laminaData.corBainha) setCorBainha(laminaData.corBainha);
              if (laminaData.observacao) setObservacaoLamina(laminaData.observacao);
            }
          }
        }

        setLaminasConfiguradas(laminasProcessadas);
      }

      // Processar produtos adicionais
      if (extractedData.produtosAdicionais && extractedData.produtosAdicionais.length > 0) {
        const novasQuantidades: Record<string, number> = {};
        
        for (const produtoData of extractedData.produtosAdicionais) {
          const produto = produtosAdicionais.find(p => 
            p.nome_produto.toLowerCase().includes(produtoData.nome?.toLowerCase() || '')
          );
          
          if (produto) {
            novasQuantidades[produto.id] = produtoData.quantidade || 1;
          }
        }

        setQuantidadesProdutos(novasQuantidades);
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

    if (laminasConfiguradas.length === 0 && !selectedModel) {
      toast.error('Adicione pelo menos uma lâmina ao orçamento');
      return;
    }

    setSubmitting(true);

    try {
      // Montar descrições de todas as lâminas
      const todasLaminas = [...laminasConfiguradas];
      if (selectedModel) {
        todasLaminas.push({
          id: crypto.randomUUID(),
          modelo: selectedModel,
          aco: selectedAco,
          empunhadura: selectedEmpunhadura,
          acabamento: selectedAcabamento,
          bainha: selectedBainha,
          laser: selectedLaser,
          textoLaser: textLaser,
          subtotal: subtotalLaminaAtual,
        });
      }

      const descricoesPedidos = todasLaminas.map((lamina, index) => {
        const desc = `${lamina.modelo.nome_modelo} ${lamina.aco?.nome_opcao || ''} ${lamina.acabamento?.nome_opcao || ''} empunhadura em ${lamina.empunhadura?.nome_opcao || ''} ${lamina.bainha?.nome_opcao || ''}`;
        return `Lâmina ${index + 1}: ${desc}`;
      }).join('\n');

      const linhasFormatadas = todasLaminas.map((lamina) => {
        return `${nomeCompleto}, ${lamina.modelo.nome_modelo}, ${lamina.aco?.nome_opcao || ''}, ${lamina.acabamento?.nome_opcao || ''}, ${lamina.empunhadura?.nome_opcao || ''}, ${lamina.bainha?.nome_opcao || ''}`;
      }).join('\n');

      const personalizacoesLaser = todasLaminas
        .filter(l => l.laser && l.textoLaser)
        .map((l, index) => `Lâmina ${index + 1}: ${l.textoLaser}`)
        .join('\n');

      // Montar texto formatado
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
      // Montar dados para exportação
      const todasLaminas = [...laminasConfiguradas];
      if (selectedModel) {
        todasLaminas.push({
          id: crypto.randomUUID(),
          modelo: selectedModel,
          aco: selectedAco,
          empunhadura: selectedEmpunhadura,
          acabamento: selectedAcabamento,
          bainha: selectedBainha,
          laser: selectedLaser,
          textoLaser: textLaser,
          subtotal: subtotalLaminaAtual,
        });
      }

      const laminasFormatadas = todasLaminas.map(lamina => ({
        modelo: lamina.modelo.nome_modelo,
        aco: lamina.aco?.nome_opcao || '',
        empunhadura: lamina.empunhadura?.nome_opcao || '',
        acabamento: lamina.acabamento?.nome_opcao || '',
        bainha: lamina.bainha?.nome_opcao || '',
        corBainha: corBainha,
        laser: lamina.laser,
        textoLaser: lamina.textoLaser,
        observacaoLamina: observacaoLamina,
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

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Container principal mobile-first */}
      <div className="pb-24">
        <div className="px-4 py-6 space-y-8">
          {/* Botão de Preencher com IA */}
          <div className="flex justify-end">
            <Button
              onClick={() => setModalIAOpen(true)}
              variant="outline"
              className="gap-2"
            >
              ✨ Preencher com IA
            </Button>
          </div>

          {/* Seção 1: Escolha o Modelo */}
          <section>
            <h2 className="text-lg font-semibold text-accent mb-4">Escolha o Modelo</h2>
            <div className="grid gap-3 grid-cols-2">
              {modelos.map((modelo) => (
                <ModelCard
                  key={modelo.id}
                  nome={modelo.nome_modelo}
                  preco={modelo.preco_base}
                  imagem={modelo.imagem_modelo}
                  isSelected={selectedModel?.id === modelo.id}
                  onClick={() => setSelectedModel(modelo)}
                />
              ))}
            </div>
            {modelos.length === 0 && (
              <p className="text-center py-12 text-muted-foreground text-sm">
                Nenhum modelo cadastrado
              </p>
            )}
          </section>

          {/* Seção 2: Configure os Componentes */}
          {selectedModel && (
            <section>
              <h2 className="text-lg font-semibold text-accent mb-4">Configure os Componentes</h2>
              <Accordion type="single" collapsible className="w-full space-y-2">
                <AccordionItem value="aco" className="border border-border bg-card rounded-lg overflow-hidden">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-normal">Aço</span>
                      {selectedAco && (
                        <span className="text-sm text-muted-foreground">
                          {selectedAco.nome_opcao}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid gap-2 grid-cols-2 pt-2">
                      {acos.map((aco) => (
                        <ComponentCard
                          key={aco.id}
                          nome={aco.nome_opcao}
                          preco={aco.preco_adicional}
                          isSelected={selectedAco?.id === aco.id}
                          onClick={() => setSelectedAco(aco)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="empunhadura" className="border border-border bg-card rounded-lg overflow-hidden">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-normal">Empunhadura</span>
                      {selectedEmpunhadura && (
                        <span className="text-sm text-muted-foreground">
                          {selectedEmpunhadura.nome_opcao}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid gap-2 grid-cols-2 pt-2">
                      {empunhaduras.map((emp) => (
                        <ComponentCard
                          key={emp.id}
                          nome={emp.nome_opcao}
                          preco={emp.preco_adicional}
                          isSelected={selectedEmpunhadura?.id === emp.id}
                          onClick={() => setSelectedEmpunhadura(emp)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="acabamento" className="border border-border bg-card rounded-lg overflow-hidden">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-normal">Acabamento</span>
                      {selectedAcabamento && (
                        <span className="text-sm text-muted-foreground">
                          {selectedAcabamento.nome_opcao}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid gap-2 grid-cols-2 pt-2">
                      {acabamentos.map((acab) => (
                        <ComponentCard
                          key={acab.id}
                          nome={acab.nome_opcao}
                          preco={acab.preco_adicional}
                          isSelected={selectedAcabamento?.id === acab.id}
                          onClick={() => setSelectedAcabamento(acab)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bainha" className="border border-border bg-card rounded-lg overflow-hidden">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-normal">Bainha</span>
                      {selectedBainha && (
                        <span className="text-sm text-muted-foreground">
                          {selectedBainha.nome_opcao}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid gap-2 grid-cols-2 pt-2">
                      {bainhas.map((bainha) => (
                        <ComponentCard
                          key={bainha.id}
                          nome={bainha.nome_opcao}
                          preco={bainha.preco_adicional}
                          isSelected={selectedBainha?.id === bainha.id}
                          onClick={() => setSelectedBainha(bainha)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          )}

          {/* Seção 3: Extras */}
          {selectedModel && (
            <section>
              <h2 className="text-lg font-semibold text-accent mb-4">Extras</h2>
              <div className="border border-border rounded-lg bg-card p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="laser"
                    checked={selectedLaser}
                    onCheckedChange={(checked) => setSelectedLaser(checked as boolean)}
                  />
                  <Label htmlFor="laser" className="cursor-pointer text-sm font-normal">
                    Personalização a Laser (+R$ 30)
                  </Label>
                </div>

                {selectedLaser && (
                  <div className="space-y-2 pl-7">
                    <Input
                      id="texto-laser"
                      value={textLaser}
                      onChange={(e) => setTextLaser(e.target.value)}
                      placeholder="Texto para gravação"
                      className="border-border"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="cor-bainha" className="text-sm">Cor da Bainha</Label>
                  <Input
                    id="cor-bainha"
                    value={corBainha}
                    onChange={(e) => setCorBainha(e.target.value)}
                    placeholder="Ex: Preto, Marrom, etc."
                    className="border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="obs-lamina" className="text-sm">Observação da Lâmina</Label>
                  <Input
                    id="obs-lamina"
                    value={observacaoLamina}
                    onChange={(e) => setObservacaoLamina(e.target.value)}
                    placeholder="Observações sobre esta lâmina"
                    className="border-border"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Seção 4: Produtos Adicionais */}
          {selectedModel && produtosAdicionais.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-accent mb-4">Produtos Adicionais</h2>
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
            </section>
          )}
        </div>
      </div>

      {/* Bottom bar fixo com resumo */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
        <div className="px-4 py-4 space-y-3">
          {/* Lâminas adicionadas - scroll horizontal */}
          {laminasConfiguradas.length > 0 && (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-2 min-w-max">
                {laminasConfiguradas.map((lamina, index) => (
                  <div key={lamina.id} className="flex-shrink-0 w-40 p-2 border border-border rounded bg-background">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-medium">Lâmina {index + 1}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removerLamina(lamina.id)}
                        className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{lamina.modelo.nome_modelo}</p>
                    <p className="text-sm font-bold text-accent mt-1">R$ {lamina.subtotal.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações principais */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Total do Pedido</p>
              <p className="text-2xl font-bold text-accent">R$ {valorTotalCalculado.toFixed(2)}</p>
            </div>
            
            {selectedModel && (
              <Button
                onClick={adicionarLamina}
                variant="outline"
                size="sm"
                className="flex-shrink-0 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              >
                {editandoLaminaId ? 'Atualizar' : 'Adicionar'}
              </Button>
            )}
            
            {(laminasConfiguradas.length > 0 || selectedModel) && (
              <Button
                onClick={() => setModalOpen(true)}
                size="sm"
                className="flex-shrink-0 bg-accent hover:bg-accent/90"
              >
                Fechar Pedido
              </Button>
            )}
          </div>
        </div>
      </div>

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
                  <Input
                    id="nome"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input
                    id="dataNascimento"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificado">Nome para Certificado</Label>
                <Input
                  id="certificado"
                  value={nomeCertificado}
                  onChange={(e) => setNomeCertificado(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagamento">Forma de Pagamento *</Label>
                <Input
                  id="pagamento"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  placeholder="Ex: PIX, Cartão de Crédito, etc."
                  required
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="canal">Canal</Label>
                  <Input
                    id="canal"
                    value={canal}
                    onChange={(e) => setCanal(e.target.value)}
                    placeholder="Ex: WhatsApp, Instagram"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Input
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="Ex: Pendente, Pago"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origem">Origem Cliente</Label>
                  <Input
                    id="origem"
                    value={origemCliente}
                    onChange={(e) => setOrigemCliente(e.target.value)}
                    placeholder="Ex: Indicação, Redes Sociais"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Input
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observações gerais do pedido"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cupom">Cupom</Label>
                <Input
                  id="cupom"
                  value={cupom}
                  onChange={(e) => setCupom(e.target.value)}
                  placeholder="Código de cupom (se houver)"
                />
              </div>

              <Button
                onClick={handleFinalizarPedido}
                disabled={submitting}
                className="w-full"
                size="lg"
              >
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
                    Copiar Texto
                  </Button>
                  <Button 
                    onClick={exportarParaSheets} 
                    disabled={exportandoSheets}
                    variant="secondary" 
                    className="flex-1"
                  >
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
                placeholder="Cole aqui as informações do pedido, como:&#10;&#10;Cliente: João Silva&#10;CPF: 123.456.789-00&#10;Email: joao@email.com&#10;Telefone: (11) 98765-4321&#10;&#10;Pedido:&#10;- 1 Faca Bowie em aço 1095&#10;- Acabamento fosco&#10;- Empunhadura em madeira&#10;- Bainha em couro preta&#10;- Personalização: 'João Silva'&#10;&#10;Forma de pagamento: PIX&#10;Canal: WhatsApp"
                className="w-full min-h-[300px] p-3 border border-border rounded-lg bg-background resize-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={processarTextoComIA}
                disabled={processandoIA || !textoIA.trim()}
                className="flex-1"
              >
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

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Dicas:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Cole qualquer texto com informações do pedido</li>
                <li>A IA extrairá automaticamente nomes, CPF, endereço, telefone, etc.</li>
                <li>Informações sobre lâminas (modelo, aço, acabamento, etc.) serão reconhecidas</li>
                <li>Produtos adicionais também podem ser detectados</li>
                <li>Dados parciais também funcionam - a IA preenche o que conseguir identificar</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
