import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOpcoesN8n } from '@/hooks/useOpcoesN8n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Trash2, Plus, Search, Check, Eye, Copy, X, Image, FileText, ChevronDown, ChevronUp, Pencil, Minus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InfoEtapaModal } from '@/components/InfoEtapaModal';
import edcKnife from '@/assets/edc-knife.svg';
import { enviarParaProducaoManual } from '@/services/producaoService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  tipo_opcao: 'Aço' | 'Empunhadura' | 'Acabamento' | 'Bainha' | 'Cor de Bainha' | 'Embalagem';
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
  bruteForge: boolean;
  empunhadura: OpcaoComponente | null;
  dragonScale: boolean;
  bainha: OpcaoComponente | null;
  corBainha: string;
  corBainhaPersonalizada: string;
  textoLaser: string;
  embalagem: string;
  observacoesLamina: string;
  subtotal: number;
  quantidade: number;
}



export default function Simulador() {
  const { profile } = useAuth();
  const { opcoes: opcoesN8n } = useOpcoesN8n();
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [componentes, setComponentes] = useState<OpcaoComponente[]>([]);
  const [produtosAdicionais, setProdutosAdicionais] = useState<ProdutoAdicional[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado da lâmina atual sendo configurada
  const [modeloSelecionado, setModeloSelecionado] = useState<string>('');
  const [acoSelecionado, setAcoSelecionado] = useState<string>('');
  const [acabamentoSelecionado, setAcabamentoSelecionado] = useState<string>('');
  const [bruteForge, setBruteForge] = useState(false);
  const [empunhaduraSelecionada, setEmpunhaduraSelecionada] = useState<string>('');
  const [dragonScale, setDragonScale] = useState(false);
  const [bainhaSelecionada, setBainhaSelecionada] = useState<string>('');
  const [corBainha, setCorBainha] = useState<string>('Preto');
  const [corBainhaPersonalizada, setCorBainhaPersonalizada] = useState<string>('');
  const [textoLaser, setTextoLaser] = useState('');
  const [embalagem, setEmbalagem] = useState('');
  const [observacoesLamina, setObservacoesLamina] = useState('');
  const [buscaModelo, setBuscaModelo] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');

  // Lista de lâminas customizadas
  const [laminasCustomizadas, setLaminasCustomizadas] = useState<LaminaCustomizada[]>([]);
  const [quantidadesProdutos, setQuantidadesProdutos] = useState<Record<string, number>>({});
  const [observacoesProdutos, setObservacoesProdutos] = useState('');

  // Modal para visualizar lâmina
  const [laminaModalAberta, setLaminaModalAberta] = useState<LaminaCustomizada | null>(null);
  const laminaModalRef = useRef<HTMLDivElement>(null);
  
  // Estado para edição de lâmina
  const [laminaEmEdicao, setLaminaEmEdicao] = useState<string | null>(null);
  const pedidoExportRef = useRef<HTMLDivElement>(null);
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
  const [clienteAntigo, setClienteAntigo] = useState(false);
  const [origemCliente, setOrigemCliente] = useState('');
  const [observacao, setObservacao] = useState('');
  const [cupom, setCupom] = useState('');
  const [prazo, setPrazo] = useState('');
  const [brindes, setBrindes] = useState('');
  const [valorPedido, setValorPedido] = useState('');

  // Modal IA
  const [modalIAOpen, setModalIAOpen] = useState(false);
  const [textoIA, setTextoIA] = useState('');
  const [processandoIA, setProcessandoIA] = useState(false);

  // Collapsibles - accordion behavior
  const [showExtras, setShowExtras] = useState(false);
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null);

  // Searchable empunhadura
  const [buscaEmpunhadura, setBuscaEmpunhadura] = useState('');

  // Wizard step
  const [currentStep, setCurrentStep] = useState(0);
  const STEPS = [
    { label: 'Lâmina' },
    { label: 'Empunhadura' },
    { label: 'Bainha' },
    { label: 'Personalização' },
  ];

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

  // Helper: converte strings do n8n em OpcaoComponente, preservando preço do Supabase mas usando NOME do n8n
  const mergeOpcoes = (n8nList: string[] | undefined, supabaseList: OpcaoComponente[], tipoOpcao: OpcaoComponente['tipo_opcao']): OpcaoComponente[] => {
    if (!n8nList || n8nList.length === 0) return supabaseList;
    return n8nList.map((nome) => {
      const match = supabaseList.find(s => s.nome_opcao === nome);
      return {
        id: match?.id || `n8n-${tipoOpcao}-${nome}`,
        nome_opcao: nome,
        tipo_opcao: tipoOpcao,
        preco_adicional: match?.preco_adicional || 0,
      };
    });
  };

  const acos = mergeOpcoes(opcoesN8n?.acos, componentes.filter(c => c.tipo_opcao === 'Aço'), 'Aço');
  const acabamentos = mergeOpcoes(opcoesN8n?.acabamentos, componentes.filter(c => c.tipo_opcao === 'Acabamento'), 'Acabamento');
  const empunhaduras = mergeOpcoes(opcoesN8n?.empunhaduras, componentes.filter(c => c.tipo_opcao === 'Empunhadura'), 'Empunhadura');
  const bainhas = mergeOpcoes(opcoesN8n?.bainhas, componentes.filter(c => c.tipo_opcao === 'Bainha'), 'Bainha');
  const coresBainha = mergeOpcoes(opcoesN8n?.coresBainha, componentes.filter(c => c.tipo_opcao === 'Cor de Bainha'), 'Cor de Bainha');
  const embalagens = componentes.filter(c => c.tipo_opcao === 'Embalagem');

  // Filtrar modelos: se n8n retornar lista de modelos, usar apenas esses nomes
  const modelosDisponiveis = useMemo(() => {
    if (opcoesN8n?.modelos && opcoesN8n.modelos.length > 0) {
      return opcoesN8n.modelos.map((nome) => {
        const match = modelos.find(m => m.nome_modelo === nome);
        return match || {
          id: `n8n-modelo-${nome}`,
          nome_modelo: nome,
          preco_base: 0,
          categoria: null,
          imagem_modelo: null,
        };
      });
    }
    return modelos;
  }, [modelos, opcoesN8n]);

  const modelosFiltrados = modelosDisponiveis.filter(m => {
    const matchBusca = m.nome_modelo.toLowerCase().includes(buscaModelo.toLowerCase());
    return matchBusca;
  });

  const mostrarModelos = buscaModelo.trim() !== '';

  // Objetos selecionados - buscar tanto nos componentes Supabase quanto nas listas mescladas
  const modeloAtual = modelosDisponiveis.find(m => m.id === modeloSelecionado);
  const acoAtual = acos.find(c => c.id === acoSelecionado);
  const acabamentoAtual = acabamentos.find(c => c.id === acabamentoSelecionado);
  const empunhaduraAtual = empunhaduras.find(c => c.id === empunhaduraSelecionada);
  const bainhaAtual = bainhas.find(c => c.id === bainhaSelecionada);

  const calcularSubtotal = (): number => {
    const precoBase = modeloAtual?.preco_base || 0;
    const precoAco = acoAtual?.preco_adicional || 0;
    const precoAcabamento = acabamentoAtual?.preco_adicional || 0;
    const precoEmpunhadura = empunhaduraAtual?.preco_adicional || 0;
    const precoBainha = bainhaAtual?.preco_adicional || 0;
    const precoLaser = textoLaser && textoLaser !== '-' ? 30 : 0;
    return precoBase + precoAco + precoAcabamento + precoEmpunhadura + precoBainha + precoLaser;
  };

  const valorTotalCalculado = useMemo(() => {
    const totalLaminas = laminasCustomizadas.reduce((sum, l) => sum + (l.subtotal * l.quantidade), 0);
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

    // Determinar cor da bainha final (personalizada ou selecionada)
    const corBainhaFinal = corBainha === 'OUTRA' ? corBainhaPersonalizada : corBainha;
    
    const novaLamina: LaminaCustomizada = {
      id: `${Date.now()}-${Math.random()}`,
      modelo: modeloAtual || null,
      aco: acoAtual || null,
      acabamento: acabamentoAtual || null,
      bruteForge,
      empunhadura: empunhaduraAtual || null,
      dragonScale,
      bainha: bainhaAtual || null,
      corBainha: corBainhaFinal,
      corBainhaPersonalizada,
      textoLaser: textoLaser || '-',
      embalagem,
      observacoesLamina,
      subtotal: calcularSubtotal(),
      quantidade: 1,
    };

    setLaminasCustomizadas([...laminasCustomizadas, novaLamina]);
    limparFormulario();
    toast.success('Lâmina adicionada!');
  };

  const removerLamina = (id: string) => {
    setLaminasCustomizadas(laminasCustomizadas.filter(l => l.id !== id));
    setLaminaEmEdicao(null);
    toast.success('Lâmina removida');
  };

  // Função para editar uma lâmina existente
  const editarLamina = (lamina: LaminaCustomizada) => {
    // Carregar os valores da lâmina no formulário
    setModeloSelecionado(lamina.modelo?.id || '');
    setAcoSelecionado(lamina.aco?.id || '');
    setAcabamentoSelecionado(lamina.acabamento?.id || '');
    setBruteForge(lamina.bruteForge);
    setEmpunhaduraSelecionada(lamina.empunhadura?.id || '');
    setDragonScale(lamina.dragonScale);
    setBainhaSelecionada(lamina.bainha?.id || '');
    if (lamina.corBainhaPersonalizada) {
      setCorBainha('OUTRA');
      setCorBainhaPersonalizada(lamina.corBainhaPersonalizada);
    } else {
      setCorBainha(lamina.corBainha);
      setCorBainhaPersonalizada('');
    }
    setTextoLaser(lamina.textoLaser === '-' ? '' : lamina.textoLaser);
    setEmbalagem(lamina.embalagem);
    setObservacoesLamina(lamina.observacoesLamina || '');
    setLaminaEmEdicao(lamina.id);
    setLaminaModalAberta(null);
    toast.info('Editando lâmina - faça as alterações e clique em Salvar');
  };

  // Função para salvar alterações na lâmina em edição
  const salvarEdicaoLamina = () => {
    if (!laminaEmEdicao || !modeloSelecionado) {
      toast.error('Selecione um modelo');
      return;
    }

    const laminaExistente = laminasCustomizadas.find(l => l.id === laminaEmEdicao);
    
    const corBainhaFinal = corBainha === 'OUTRA' ? corBainhaPersonalizada : corBainha;
    
    const laminaAtualizada: LaminaCustomizada = {
      id: laminaEmEdicao,
      modelo: modeloAtual || null,
      aco: acoAtual || null,
      acabamento: acabamentoAtual || null,
      bruteForge,
      empunhadura: empunhaduraAtual || null,
      dragonScale,
      bainha: bainhaAtual || null,
      corBainha: corBainhaFinal,
      corBainhaPersonalizada,
      textoLaser: textoLaser || '-',
      embalagem,
      observacoesLamina,
      subtotal: calcularSubtotal(),
      quantidade: laminaExistente?.quantidade || 1,
    };

    setLaminasCustomizadas(laminasCustomizadas.map(l => 
      l.id === laminaEmEdicao ? laminaAtualizada : l
    ));
    limparFormulario();
    setLaminaEmEdicao(null);
    toast.success('Lâmina atualizada!');
  };

  // Função para cancelar edição
  const cancelarEdicao = () => {
    limparFormulario();
    setLaminaEmEdicao(null);
  };

  // Função para duplicar uma lâmina
  const duplicarLamina = (lamina: LaminaCustomizada) => {
    const novaLamina: LaminaCustomizada = {
      ...lamina,
      id: `${Date.now()}-${Math.random()}`,
      quantidade: 1,
    };
    setLaminasCustomizadas([...laminasCustomizadas, novaLamina]);
    toast.success('Lâmina duplicada!');
  };

  // Função para alterar quantidade de uma lâmina
  const alterarQuantidadeLamina = (id: string, novaQuantidade: number) => {
    if (novaQuantidade < 1) return;
    setLaminasCustomizadas(prev => prev.map(l => 
      l.id === id ? { ...l, quantidade: novaQuantidade } : l
    ));
    // Atualizar também o modal se estiver aberto
    if (laminaModalAberta?.id === id) {
      setLaminaModalAberta(prev => prev ? { ...prev, quantidade: novaQuantidade } : null);
    }
  };

  const limparFormulario = () => {
    setModeloSelecionado('');
    setAcoSelecionado('');
    setAcabamentoSelecionado('');
    setBruteForge(false);
    setEmpunhaduraSelecionada('');
    setDragonScale(false);
    setBainhaSelecionada('');
    setCorBainha('Preto');
    setCorBainhaPersonalizada('');
    setTextoLaser('');
    setEmbalagem('');
    setObservacoesLamina('');
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
    setClienteAntigo(false);
    setOrigemCliente('');
    setObservacao('');
    setCupom('');
    setPrazo('');
    setBrindes('');
    setValorPedido('');
    setPedidoFinalizado(false);
    setTextoFormatado('');
  };

  const exportarLaminaComoImagem = async () => {
    if (!laminaModalRef.current) return;
    
    try {
      const canvas = await html2canvas(laminaModalRef.current, {
        backgroundColor: '#ffffff',
        scale: 4,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `lamina-${laminaModalAberta?.modelo?.nome_modelo || 'detalhes'}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast.success('Imagem exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar imagem:', error);
      toast.error('Erro ao exportar imagem');
    }
  };

  const exportarLaminaComoPDF = async () => {
    if (!laminaModalRef.current) return;
    
    try {
      const canvas = await html2canvas(laminaModalRef.current, {
        backgroundColor: '#ffffff',
        scale: 4,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      });
      
      const imgWidth = 148;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`lamina-${laminaModalAberta?.modelo?.nome_modelo || 'detalhes'}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const exportarPedidoComoImagem = async () => {
    if (!pedidoExportRef.current) return;
    
    try {
      const canvas = await html2canvas(pedidoExportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Garantir que imagens tenham tamanho adequado no clone
          const images = clonedDoc.querySelectorAll('img');
          images.forEach((img) => {
            img.style.objectFit = 'contain';
          });
        }
      });
      
      const link = document.createElement('a');
      link.download = `pedido-${nomeCompleto || 'cliente'}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast.success('Imagem do pedido exportada!');
    } catch (error) {
      console.error('Erro ao exportar imagem:', error);
      toast.error('Erro ao exportar imagem');
    }
  };

  const exportarPedidoComoPDF = async () => {
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const checkPage = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      const drawLine = (yPos: number) => {
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
      };

      // === CABEÇALHO DA EMPRESA ===
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('KAOWZ FACAS', pageWidth / 2, y, { align: 'center' });
      y += 6;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('CNPJ: 44.188.566/0001-64', pageWidth / 2, y, { align: 'center' });
      y += 8;
      drawLine(y);
      y += 6;

      // === TÍTULO DO DOCUMENTO ===
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CONFIRMAÇÃO DE PEDIDO', pageWidth / 2, y, { align: 'center' });
      y += 6;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      pdf.text(`Data: ${dataHoje}`, pageWidth / 2, y, { align: 'center' });
      y += 8;
      drawLine(y);
      y += 6;

      // === DADOS DO CLIENTE ===
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DADOS DO CLIENTE', margin, y);
      y += 6;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');

      const addField = (label: string, value: string, xOffset = margin) => {
        checkPage(5);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${label}: `, xOffset, y);
        const labelWidth = pdf.getTextWidth(`${label}: `);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value || '-', xOffset + labelWidth, y);
      };

      const addFieldRow = (label1: string, val1: string, label2: string, val2: string) => {
        checkPage(5);
        addField(label1, val1, margin);
        addField(label2, val2, pageWidth / 2);
        y += 5;
      };

      if (clienteAntigo) {
        addField('Cliente', nomeCompleto);
        y += 5;
      } else {
        addFieldRow('Nome', nomeCompleto, 'CPF', cpf || '-');
        addFieldRow('Email', email || '-', 'Celular', celular || '-');
        if (endereco) {
          addField('Endereço', `${endereco}, ${numero} - ${bairro}, ${cidade}/${estado}${complemento ? ` (${complemento})` : ''}`);
          y += 5;
        }
        if (cep) { addFieldRow('CEP', cep, 'Nascimento', dataNascimento || '-'); }
      }

      y += 2;
      drawLine(y);
      y += 6;

      // === LÂMINAS DO PEDIDO ===
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ITENS DO PEDIDO', margin, y);
      y += 6;

      const todasLaminas = [...laminasCustomizadas, ...(modeloSelecionado && modeloAtual ? [{
        id: 'current',
        modelo: modeloAtual,
        aco: acoAtual,
        acabamento: acabamentoAtual,
        bruteForge,
        empunhadura: empunhaduraAtual,
        dragonScale,
        bainha: bainhaAtual,
        corBainha,
        textoLaser: textoLaser || '-',
        embalagem,
        observacoesLamina,
        subtotal: calcularSubtotal(),
        quantidade: 1,
        corBainhaPersonalizada: '',
      }] as LaminaCustomizada[] : [])];

      todasLaminas.forEach((lamina, index) => {
        checkPage(35);

        // Item header
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const qtd = (lamina as any).quantidade > 1 ? ` (x${(lamina as any).quantidade})` : '';
        pdf.text(`${index + 1}. ${lamina.modelo?.nome_modelo || 'Modelo'}${qtd}`, margin, y);
        y += 5;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);

        const specs = [
          ['Aço', lamina.aco?.nome_opcao || '-'],
          ['Acabamento', `${lamina.acabamento?.nome_opcao || '-'}${(lamina as any).bruteForge ? ' + Brute Forge' : ''}`],
          ['Empunhadura', `${lamina.empunhadura?.nome_opcao || '-'}${lamina.dragonScale ? ' + Dragon Scale' : ''}`],
          ['Bainha', `${lamina.bainha?.nome_opcao || '-'}${lamina.corBainha && !lamina.bainha?.nome_opcao?.toLowerCase().includes(lamina.corBainha.toLowerCase()) ? ` ${lamina.corBainha}` : ''}`],
        ];

        if (lamina.embalagem) specs.push(['Embalagem', lamina.embalagem]);
        if (lamina.textoLaser && lamina.textoLaser !== '-') specs.push(['Gravação', lamina.textoLaser]);
        if ((lamina as any).observacoesLamina) specs.push(['Observações', (lamina as any).observacoesLamina]);

        // Two-column specs
        for (let i = 0; i < specs.length; i += 2) {
          checkPage(5);
          const [l1, v1] = specs[i];
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${l1}: `, margin + 4, y);
          pdf.setFont('helvetica', 'normal');
          pdf.text(v1, margin + 4 + pdf.getTextWidth(`${l1}: `), y);

          if (i + 1 < specs.length) {
            const [l2, v2] = specs[i + 1];
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${l2}: `, pageWidth / 2, y);
            pdf.setFont('helvetica', 'normal');
            pdf.text(v2, pageWidth / 2 + pdf.getTextWidth(`${l2}: `), y);
          }
          y += 4.5;
        }

        y += 3;
        if (index < todasLaminas.length - 1) {
          pdf.setDrawColor(230, 230, 230);
          pdf.setLineWidth(0.2);
          pdf.line(margin + 4, y - 1, pageWidth - margin, y - 1);
        }
      });

      // === PRODUTOS ADICIONAIS ===
      const produtosComQuantidade = produtosAdicionais.filter(p => (quantidadesProdutos[p.id] || 0) > 0);
      if (produtosComQuantidade.length > 0) {
        checkPage(15);
        drawLine(y);
        y += 6;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('PRODUTOS ADICIONAIS', margin, y);
        y += 5;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        produtosComQuantidade.forEach(produto => {
          checkPage(5);
          pdf.text(`• ${produto.nome_produto} x${quantidadesProdutos[produto.id]}`, margin + 4, y);
          y += 4.5;
        });
        if (observacoesProdutos) {
          checkPage(5);
          pdf.setFont('helvetica', 'italic');
          pdf.text(`Obs: ${observacoesProdutos}`, margin + 4, y);
          y += 4.5;
        }
      }

      // === PAGAMENTO ===
      checkPage(25);
      y += 2;
      drawLine(y);
      y += 6;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('PAGAMENTO', margin, y);
      y += 6;

      pdf.setFontSize(9);
      addFieldRow('Valor Total', `R$ ${valorPedido || valorTotalCalculado.toFixed(2)}`, 'Forma', formaPagamento || '-');
      addFieldRow('Status', status, 'Prazo', prazo || '-');
      if (cupom) { addField('Cupom', cupom); y += 5; }

      // === CERTIFICADO ===
      checkPage(10);
      y += 2;
      drawLine(y);
      y += 6;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      addField('Certificado', nomeCertificado || nomeCompleto);
      y += 5;

      // === OBSERVAÇÕES ===
      if (observacao) {
        checkPage(10);
        const obsLines = pdf.splitTextToSize(`Observações: ${observacao}`, contentWidth - 4);
        pdf.setFont('helvetica', 'italic');
        obsLines.forEach((line: string) => {
          checkPage(5);
          pdf.text(line, margin, y);
          y += 4.5;
        });
      }

      // === RODAPÉ ===
      checkPage(15);
      y += 4;
      drawLine(y);
      y += 6;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(130, 130, 130);
      pdf.text(`Vendedor: ${profile?.nome_vendedor || '-'}`, margin, y);
      pdf.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, y, { align: 'right' });
      y += 5;
      pdf.setFontSize(7);
      pdf.text('Kaowz Facas — Garantia Vitalícia de qualidade e manutenção de afiação em todas as nossas lâminas', pageWidth / 2, y, { align: 'center' });

      pdf.save(`pedido-${nomeCompleto || 'cliente'}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
      toast.success('PDF do pedido exportado!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
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

      // Verificar se é apenas o nome do cliente (cliente já cadastrado)
      const cliente = extractedData.cliente || {};
      const temApenasNome = cliente.nomeCompleto && 
        !cliente.cpf && !cliente.email && !cliente.celular && !cliente.cep && 
        !cliente.endereco && !cliente.numero && !cliente.bairro && !cliente.cidade && 
        !cliente.estado && !cliente.dataNascimento;

      if (temApenasNome) {
        // Cliente já cadastrado - preencher apenas o nome
        setNomeCompleto(cliente.nomeCompleto);
        if (cliente.nomeCertificado) setNomeCertificado(cliente.nomeCertificado);
        toast.info('Cliente já cadastrado - apenas nome preenchido');
      } else if (extractedData.cliente) {
        // Cliente novo - preencher todos os dados disponíveis
        if (cliente.nomeCompleto) setNomeCompleto(cliente.nomeCompleto);
        if (cliente.cpf) setCpf(cliente.cpf);
        if (cliente.email) setEmail(cliente.email);
        if (cliente.celular) setCelular(cliente.celular);
        if (cliente.cep) setCep(cliente.cep);
        if (cliente.endereco) setEndereco(cliente.endereco);
        if (cliente.numero) setNumero(cliente.numero);
        if (cliente.bairro) setBairro(cliente.bairro);
        if (cliente.cidade) setCidade(cliente.cidade);
        if (cliente.estado) setEstado(cliente.estado);
        if (cliente.complemento) setComplemento(cliente.complemento);
        if (cliente.dataNascimento) setDataNascimento(cliente.dataNascimento);
        if (cliente.nomeCertificado) setNomeCertificado(cliente.nomeCertificado);
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
    if (!nomeCompleto.trim()) {
      toast.error('Preencha pelo menos o nome do cliente');
      return;
    }

    if (laminasCustomizadas.length === 0 && !modeloSelecionado) {
      toast.error('Adicione pelo menos uma lâmina ao orçamento');
      return;
    }

    setSubmitting(true);

    try {
      console.log('DEBUG handleFinalizarPedido:', {
        laminasCustomizadasLength: laminasCustomizadas.length,
        laminasCustomizadas: laminasCustomizadas.map(l => l.modelo?.nome_modelo),
        modeloSelecionado,
        modeloAtual: modeloAtual?.nome_modelo,
      });
      const todasLaminas = [...laminasCustomizadas];
      if (modeloSelecionado && modeloAtual) {
        const corBainhaFinal = corBainha === 'OUTRA' ? corBainhaPersonalizada : corBainha;
        todasLaminas.push({
          id: crypto.randomUUID(),
          modelo: modeloAtual,
          aco: acoAtual || null,
          acabamento: acabamentoAtual || null,
          bruteForge,
          empunhadura: empunhaduraAtual || null,
          dragonScale,
          bainha: bainhaAtual || null,
          corBainha: corBainhaFinal,
          corBainhaPersonalizada,
            textoLaser: textoLaser || '-',
          embalagem,
          observacoesLamina,
          subtotal: calcularSubtotal(),
          quantidade: 1,
        });
      }

      // Enviar dados para planilha de produção via Google Apps Script
      try {
        await enviarParaProducaoManual(todasLaminas, nomeCompleto, prazo);
        console.log('Dados enviados para planilha de produção com sucesso');
      } catch (error) {
        console.error('Erro ao enviar para planilha de produção:', error);
        toast.error('Erro ao enviar dados para a planilha de produção');
      }

      // Expandir lâminas por quantidade
      const laminasExpandidas: typeof todasLaminas = [];
      for (const lamina of todasLaminas) {
        for (let i = 0; i < lamina.quantidade; i++) {
          laminasExpandidas.push({ ...lamina, quantidade: 1 });
        }
      }

      // Formatar itens com rótulos explícitos para n8n
      const itensPedido = laminasExpandidas.map((lamina, index) => {
        const modelo = lamina.modelo?.nome_modelo || '';
        const aco = lamina.aco?.nome_opcao || '';
        const acabamento = (lamina.acabamento?.nome_opcao || '') + (lamina.bruteForge ? ' + Brute Forge' : '');
        const empunhadura = (lamina.empunhadura?.nome_opcao || '') + (lamina.dragonScale ? ' + Dragon Scale' : '');
        
        const nomeBainha = lamina.bainha?.nome_opcao || '';
        const bainhaLimpa = nomeBainha.replace(/^bainha\s*/i, '').trim();
        const corBainha = lamina.corBainha || '';
        
        return `\nItem ${index + 1}:\nModelo: ${modelo}\nAço: ${aco}\nAcabamento: ${acabamento}\nEmpunhadura: ${empunhadura}\nBainha: ${bainhaLimpa}\nCor Bainha: ${corBainha}\n`;
      }).join('\n\n');

      // Personalização à laser - sempre listar por item
      const personalizacaoTexto = '\n' + laminasExpandidas.map((lamina, index) => {
        return `Item ${index + 1}: ${lamina.textoLaser && lamina.textoLaser !== '-' ? lamina.textoLaser : 'Sem gravação'}`;
      }).join('\n');

      // Embalagem por lâmina
      const embalagemPorLamina = laminasExpandidas.map((l, i) => {
        if (!l.embalagem) return null;
        return `Item ${i + 1}: ${l.embalagem}`;
      }).filter(Boolean);
      const embalagemTexto = embalagemPorLamina.length > 0 ? embalagemPorLamina.join('\n') : '-';

      // Produtos adicionais como brindes ou itens extras
      const produtosSelecionados = produtosAdicionais
        .filter(p => (quantidadesProdutos[p.id] || 0) > 0)
        .map(p => `${p.nome_produto} x${quantidadesProdutos[p.id]}`)
        .join(', ');

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
${itensPedido}
14. VALOR: ${valorPedido || valorTotalCalculado.toFixed(2)}
15. FORMA DE PAGAMENTO: ${formaPagamento}
16. PERSONALIZAÇÃO À LASER: ${personalizacaoTexto}
17. NOME PROPRIETÁRIO P/ CERTIFICADO: ${nomeCertificado || nomeCompleto}
18. VENDEDOR: ${profile?.nome_vendedor || ''}
19. CANAL DE VENDA: ${canal || '-'}
20. CUPOM: ${cupom || '-'}
21. STATUS DO PEDIDO: ${status}
22. PRAZO: ${prazo || '-'}
23. EMBALAGEM: ${embalagemTexto}
24. BRINDES: ${brindes || produtosSelecionados || '-'}
OBS: ${observacao || '-'}`;

      setTextoFormatado(texto);
      setPedidoFinalizado(true);
      toast.success('Pedido finalizado com sucesso!');

      // ── CONFIRMAR PEDIDO NO SISTEMA ──────────────────────────
      try {
        const { data: confirmacao, error: erroConfirmacao } = await supabase.functions.invoke(
          'confirmar-pedido',
          {
            body: {
              // Cliente
              nomeCompleto,
              cpf,
              email,
              celular,
              cep,
              estado,
              cidade,
              bairro,
              endereco,
              numero,
              complemento,
              dataNascimento,
              // Pedido
              canal,
              formaPagamento,
              status,
              prazo,
              brindes,
              cupom,
              observacao,
              nomeCertificado: nomeCertificado || nomeCompleto,
              embalagem,
              valorTotal: valorPedido || valorTotalCalculado,
              vendedorId: profile?.id,
              // Lâminas — array completo
              laminas: todasLaminas,
              // Produtos adicionais
              produtosAdicionais: produtosAdicionais
                .filter(p => (quantidadesProdutos[p.id] || 0) > 0)
                .map(p => ({
                  nome: p.nome_produto,
                  quantidade: quantidadesProdutos[p.id],
                  preco: p.preco_unitario,
                })),
            },
          }
        );

        if (erroConfirmacao) {
          console.error('Erro ao confirmar pedido:', erroConfirmacao);
          toast.error('Pedido enviado para produção, mas erro ao registrar no sistema.');
        } else {
          console.log('Pedido confirmado:', confirmacao);
          toast.success(`✅ ${confirmacao.mensagem}`);
        }
      } catch (erroCatch) {
        console.error('Erro inesperado ao confirmar pedido:', erroCatch);
        // Não bloqueia — pedido já foi para o Sheets
      }
      // ── FIM CONFIRMAR PEDIDO ─────────────────────────────────
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
        const corBainhaFinal = corBainha === 'OUTRA' ? corBainhaPersonalizada : corBainha;
        todasLaminas.push({
          id: crypto.randomUUID(),
          modelo: modeloAtual,
          aco: acoAtual || null,
          acabamento: acabamentoAtual || null,
          bruteForge,
          empunhadura: empunhaduraAtual || null,
          dragonScale,
          bainha: bainhaAtual || null,
          corBainha: corBainhaFinal,
          corBainhaPersonalizada,
            textoLaser: textoLaser || '-',
          embalagem,
          observacoesLamina,
          subtotal: calcularSubtotal(),
          quantidade: 1,
        });
      }

      const laminasFormatadas = todasLaminas.map(lamina => ({
        modelo: ((lamina.modelo?.nome_modelo || '') + (lamina.bruteForge ? ' Brute Forge' : '')).trim(),
        aco: lamina.aco?.nome_opcao || '',
        empunhadura: [lamina.empunhadura?.nome_opcao, lamina.dragonScale ? 'Dragon Scale' : null, lamina.espacador ? `Espaçador G10 ${lamina.espacador.nome_opcao}` : null].filter(Boolean).join(' / '),
        acabamento: lamina.acabamento?.nome_opcao || '',
        bainha: lamina.bainha?.nome_opcao || '',
        corBainha: lamina.corBainha,
        textoLaser: lamina.textoLaser,
        embalagem: lamina.embalagem,
        observacoesLamina: lamina.observacoesLamina || '',
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
        prazo,
        laminas: laminasFormatadas,
        produtosAdicionais: produtosFormatados,
        valorTotal: valorPedido ? parseFloat(valorPedido.replace(',', '.')) : valorTotalCalculado,
        vendedor: profile?.nome_vendedor || '',
      };

      const { data, error } = await supabase.functions.invoke('export-to-sheets', {
        body: exportData,
      });

      if (error) throw error;

      if (data?.error) {
        // Erro retornado pela função (ex: lâmina falhou no meio do processo)
        toast.error(`Erro: ${data.error}${data.processadas ? ` (${data.processadas}/${data.total} lâminas processadas)` : ''}`);
      } else if (data?.success) {
        toast.success(data.message || 'Pedido exportado para Produção e Vendas!');
      } else {
        toast.success('Pedido exportado para Produção e Vendas!');
      }
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



  const empunhadurasFiltradas = empunhaduras.filter(e =>
    e.nome_opcao.toLowerCase().includes(buscaEmpunhadura.toLowerCase())
  );

  // Summary pieces for floating bar
  const resumoParts = [
    modeloAtual?.nome_modelo,
    acoAtual?.nome_opcao,
    acabamentoAtual?.nome_opcao,
    empunhaduraAtual?.nome_opcao,
  ].filter(Boolean);

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando opções...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-36">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold tracking-tight">Monte sua Faca</h1>
          <div className="flex items-center gap-2">
            {laminasCustomizadas.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {laminasCustomizadas.reduce((s, l) => s + l.quantidade, 0)} lâmina{laminasCustomizadas.reduce((s, l) => s + l.quantidade, 0) > 1 ? 's' : ''}
              </Badge>
            )}
            <Button onClick={() => setModalIAOpen(true)} variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              ✨ IA
            </Button>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-end gap-2 mb-4 px-1">
          {STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep || (i > 0 && modeloSelecionado);
            return (
              <button
                key={i}
                onClick={() => { if (i === 0 || modeloSelecionado) setCurrentStep(i); }}
                className="flex flex-col items-center gap-1 flex-1 group"
              >
                <span className={`transition-all leading-tight text-center ${
                  isActive
                    ? 'text-sm font-bold text-foreground'
                    : isDone
                      ? 'text-[10px] font-medium text-muted-foreground'
                      : 'text-[10px] font-medium text-muted-foreground/50'
                }`}>
                  {step.label}
                </span>
                <div className={`w-full rounded-full transition-all ${
                  isActive
                    ? 'h-1 bg-accent'
                    : isDone
                      ? 'h-0.5 bg-accent/40'
                      : 'h-0.5 bg-border'
                }`} />
              </button>
            );
          })}
        </div>

        {/* ===== STEP 0: Modelo + Aço + Acabamento ===== */}
        {currentStep === 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-semibold text-sm">Escolha o Modelo</h2>
              <InfoEtapaModal etapaKey="modelo" />
            </div>

            {modeloSelecionado && modeloAtual && (
              <div className="bg-muted rounded-lg p-3 mb-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{modeloAtual.nome_modelo}</p>
                  <p className="text-[10px] text-muted-foreground">{modeloAtual.categoria}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setModeloSelecionado('')} className="h-7 w-7 p-0 flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}


            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar modelo..." value={buscaModelo} onChange={(e) => setBuscaModelo(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>

            {mostrarModelos && modelosFiltrados.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto mb-3">
                {modelosFiltrados.map(modelo => (
                  <button key={modelo.id} onClick={() => setModeloSelecionado(modelo.id)}
                    className={`p-2.5 rounded-lg text-left text-xs transition-all flex items-center justify-between ${
                      modeloSelecionado === modelo.id ? 'bg-accent text-accent-foreground ring-1 ring-accent' : 'bg-muted hover:bg-muted/80'
                    }`}>
                    <span className="truncate font-medium">{modelo.nome_modelo}</span>
                    {modeloSelecionado === modelo.id && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {modeloSelecionado && (
              <div className="space-y-3 pt-3 border-t border-border">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-xs text-muted-foreground font-medium">Aço</Label>
                    <InfoEtapaModal etapaKey="aco" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {acos.map(opt => (
                      <button key={opt.id} onClick={() => setAcoSelecionado(opt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          acoSelecionado === opt.id ? 'bg-accent text-accent-foreground ring-1 ring-accent shadow-sm' : 'bg-muted hover:bg-muted/80 text-foreground'
                        }`}>
                        {opt.nome_opcao}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-xs text-muted-foreground font-medium">Acabamento</Label>
                    <InfoEtapaModal etapaKey="acabamento" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {acabamentos.map(opt => (
                      <button key={opt.id} onClick={() => setAcabamentoSelecionado(opt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          acabamentoSelecionado === opt.id ? 'bg-accent text-accent-foreground ring-1 ring-accent shadow-sm' : 'bg-muted hover:bg-muted/80 text-foreground'
                        }`}>
                        {opt.nome_opcao}
                      </button>
                    ))}
                  </div>
                  {acabamentoSelecionado && (
                    <button
                      onClick={() => setBruteForge(!bruteForge)}
                      className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        bruteForge ? 'bg-accent text-accent-foreground ring-1 ring-accent shadow-sm' : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      Brute Forge
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 1: Empunhadura ===== */}
        {currentStep === 1 && modeloSelecionado && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-semibold text-sm">Empunhadura</h2>
              <InfoEtapaModal etapaKey="empunhadura" />
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar empunhadura..." value={buscaEmpunhadura} onChange={(e) => setBuscaEmpunhadura(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {empunhadurasFiltradas.map(opt => (
                <button key={opt.id} onClick={() => setEmpunhaduraSelecionada(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    empunhaduraSelecionada === opt.id ? 'bg-accent text-accent-foreground ring-1 ring-accent shadow-sm' : 'bg-muted hover:bg-muted/80 text-foreground'
                  }`}>
                  {opt.nome_opcao}
                </button>
              ))}
              {empunhadurasFiltradas.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Nenhuma encontrada</p>
              )}
            </div>

          </div>
        )}

        {/* ===== STEP 2: Bainha ===== */}
        {currentStep === 2 && modeloSelecionado && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-semibold text-sm">Bainha</h2>
              <InfoEtapaModal etapaKey="bainha" />
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {bainhas.map(opt => (
                <button key={opt.id} onClick={() => setBainhaSelecionada(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    bainhaSelecionada === opt.id ? 'bg-accent text-accent-foreground ring-1 ring-accent shadow-sm' : 'bg-muted hover:bg-muted/80 text-foreground'
                  }`}>
                  {opt.nome_opcao}
                </button>
              ))}
            </div>

            {bainhaSelecionada && (
              <div className="space-y-2 pt-3 border-t border-border">
                <Label className="text-xs text-muted-foreground font-medium">Cor da Bainha</Label>
                <div className="flex flex-wrap gap-1.5">
                  {coresBainha.map(cor => (
                    <button key={cor.id} onClick={() => { setCorBainha(cor.nome_opcao); setCorBainhaPersonalizada(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        corBainha === cor.nome_opcao ? 'bg-accent text-accent-foreground ring-1 ring-accent shadow-sm' : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}>
                      {cor.nome_opcao}
                    </button>
                  ))}
                  <button onClick={() => setCorBainha('OUTRA')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      corBainha === 'OUTRA' ? 'bg-accent text-accent-foreground ring-1 ring-accent shadow-sm' : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}>
                    Outra
                  </button>
                </div>
                {corBainha === 'OUTRA' && (
                  <Input placeholder="Digite a cor desejada..." value={corBainhaPersonalizada} onChange={(e) => setCorBainhaPersonalizada(e.target.value)} className="h-9 text-sm" />
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 3: Personalização ===== */}
        {currentStep === 3 && modeloSelecionado && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="font-semibold text-sm mb-3">Personalização</h2>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground font-medium">Gravação à Laser</Label>
                  <InfoEtapaModal etapaKey="laser" />
                </div>
                <Input placeholder="Texto para gravação (vazio = sem gravação)" value={textoLaser} onChange={(e) => setTextoLaser(e.target.value)} className="h-9 text-sm" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground font-medium">Embalagem</Label>
                  <InfoEtapaModal etapaKey="embalagem" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {embalagens.map(emb => (
                    <button key={emb.id} onClick={() => setEmbalagem(embalagem === emb.nome_opcao ? '' : emb.nome_opcao)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        embalagem === emb.nome_opcao ? 'bg-accent text-accent-foreground ring-1 ring-accent shadow-sm' : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}>
                      {emb.nome_opcao}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Observações da Lâmina</Label>
                <Input placeholder="Ex: presente, acabamento especial..." value={observacoesLamina} onChange={(e) => setObservacoesLamina(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* ===== Produtos Adicionais - sempre visível ===== */}
        {produtosAdicionais.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 mt-3">
            <h3 className="font-semibold text-sm mb-2">Produtos Adicionais</h3>
            <div className="space-y-1.5">
              {produtosAdicionais.map(produto => {
                const quantidade = quantidadesProdutos[produto.id] || 0;
                return (
                  <div key={produto.id} className={`p-2.5 rounded-lg flex items-center justify-between gap-2 ${
                    quantidade > 0 ? 'bg-accent/10 border border-accent/30' : 'bg-muted'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{produto.nome_produto}</p>
                      <p className="text-[10px] text-muted-foreground">R$ {produto.preco_unitario.toFixed(2)} un.</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setQuantidadesProdutos(prev => ({ ...prev, [produto.id]: Math.max(0, (prev[produto.id] || 0) - 1) }))} className="h-6 w-6 p-0" disabled={quantidade <= 0}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-medium w-4 text-center">{quantidade}</span>
                      <Button size="sm" variant="ghost" onClick={() => setQuantidadesProdutos(prev => ({ ...prev, [produto.id]: (prev[produto.id] || 0) + 1 }))} className="h-6 w-6 p-0">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lâminas Adicionadas - sempre visível */}
        {laminasCustomizadas.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 mt-3">
            <h3 className="font-semibold text-sm mb-2">
              Lâminas ({laminasCustomizadas.reduce((sum, l) => sum + l.quantidade, 0)})
            </h3>
            <div className="space-y-1.5">
              {laminasCustomizadas.map((lamina) => (
                <div key={lamina.id}
                  className={`p-2.5 rounded-lg flex items-center justify-between gap-2 ${
                    laminaEmEdicao === lamina.id ? 'bg-accent/20 border border-accent' : 'bg-muted hover:bg-muted/80'
                  }`}>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setLaminaModalAberta(lamina)}>
                    <p className="text-xs font-medium truncate">
                      {lamina.modelo?.nome_modelo}
                      {lamina.quantidade > 1 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">x{lamina.quantidade}</Badge>}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {[lamina.aco?.nome_opcao, lamina.acabamento?.nome_opcao, lamina.empunhadura?.nome_opcao].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); alterarQuantidadeLamina(lamina.id, lamina.quantidade - 1); }} className="h-6 w-6 p-0" disabled={lamina.quantidade <= 1}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-medium w-4 text-center">{lamina.quantidade}</span>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); alterarQuantidadeLamina(lamina.id, lamina.quantidade + 1); }} className="h-6 w-6 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); editarLamina(lamina); setCurrentStep(0); }} className="h-6 w-6 p-0" title="Editar">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); removerLamina(lamina.id); }} className="h-6 w-6 p-0 text-destructive hover:text-destructive" title="Remover">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== BOTTOM BAR ===== */}
      <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border shadow-lg z-40 md:bottom-0">
        {resumoParts.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <p className="text-[11px] text-muted-foreground truncate text-center">
              {resumoParts.join(' → ')}
            </p>
          </div>
        )}
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
            <div>
              {currentStep > 0 && (
                <Button onClick={() => setCurrentStep(currentStep - 1)} variant="outline" size="sm" className="text-xs h-9">
                  Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {laminaEmEdicao ? (
                <>
                  <Button onClick={() => { cancelarEdicao(); setCurrentStep(0); }} variant="outline" size="sm" className="text-xs h-9">
                    Cancelar
                  </Button>
                  <Button onClick={() => { salvarEdicaoLamina(); setCurrentStep(0); }} size="sm" className="text-xs h-9 bg-accent hover:bg-accent/90">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Salvar
                  </Button>
                </>
              ) : currentStep < 3 ? (
                <>
                  {laminasCustomizadas.length > 0 && (
                    <Button onClick={() => setModalOpen(true)} size="sm" className="text-xs h-9 bg-accent hover:bg-accent/90 font-semibold">
                      Fechar Pedido
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button onClick={() => { adicionarLamina(); setCurrentStep(0); }} size="sm" className="text-xs h-9 bg-accent hover:bg-accent/90">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar
                  </Button>
                  {(laminasCustomizadas.length > 0 || modeloSelecionado) && (
                    <Button onClick={() => setModalOpen(true)} size="sm" className="text-xs h-9 bg-accent hover:bg-accent/90 font-semibold">
                      Fechar Pedido
                    </Button>
                  )}
                </>
              )}
            </div>
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
              <div ref={laminaModalRef} className="space-y-3 bg-background p-4 rounded-lg">
                <h3 className="text-center font-bold text-lg">{laminaModalAberta.modelo?.nome_modelo || 'Lâmina'}</h3>
                
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
                    <p className="font-medium">
                      {laminaModalAberta.acabamento?.nome_opcao || '-'}
                      {laminaModalAberta.bruteForge && ' + Brute Forge'}
                    </p>
                  </div>
                  <div className="bg-muted p-2.5 rounded-lg">
                    <p className="text-muted-foreground text-xs">Empunhadura</p>
                    <p className="font-medium">
                      {laminaModalAberta.empunhadura?.nome_opcao || '-'}
                      {laminaModalAberta.dragonScale && ' + Dragon Scale'}
                    </p>
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
                    </div>
                  )}
                </div>

                {laminaModalAberta.textoLaser && laminaModalAberta.textoLaser !== '-' && (
                  <div className="bg-accent/10 p-3 rounded-lg border border-accent/20">
                    <p className="text-muted-foreground text-xs">Gravação à Laser</p>
                    <p className="font-medium">{laminaModalAberta.textoLaser}</p>
                  </div>
                )}
              </div>

              {/* Controle de quantidade no modal */}
              <div className="flex items-center justify-center gap-3 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Quantidade:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => alterarQuantidadeLamina(laminaModalAberta.id, laminaModalAberta.quantidade - 1)}
                  disabled={laminaModalAberta.quantidade <= 1}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-bold w-8 text-center">{laminaModalAberta.quantidade}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => alterarQuantidadeLamina(laminaModalAberta.id, laminaModalAberta.quantidade + 1)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={exportarLaminaComoImagem}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Imagem
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={exportarLaminaComoPDF}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => editarLamina(laminaModalAberta)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    duplicarLamina(laminaModalAberta);
                    setLaminaModalAberta(null);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </Button>
              </div>

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base">{pedidoFinalizado ? 'Pedido Finalizado' : 'Finalizar Pedido'}</DialogTitle>
            <DialogDescription className="text-xs">
              {pedidoFinalizado ? 'Copie as informações abaixo' : 'Preencha os dados do cliente'}
            </DialogDescription>
          </DialogHeader>

          {!pedidoFinalizado ? (
            <div className="space-y-3">
              {/* Cliente Antigo toggle */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                <Checkbox
                  id="clienteAntigo"
                  checked={clienteAntigo}
                  onCheckedChange={(checked) => setClienteAntigo(checked === true)}
                  className="h-4 w-4"
                />
                <Label htmlFor="clienteAntigo" className="text-xs cursor-pointer font-medium">Cliente Antigo (apenas nome)</Label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="nome" className="text-xs">Nome *</Label>
                  <Input id="nome" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} className="h-8 text-xs" required />
                </div>
                {!clienteAntigo && (
                  <div className="space-y-1">
                    <Label htmlFor="cpf" className="text-xs">CPF</Label>
                    <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} className="h-8 text-xs" />
                  </div>
                )}
              </div>

              {!clienteAntigo && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs">Email</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="celular" className="text-xs">Celular</Label>
                      <Input id="celular" value={celular} onChange={(e) => setCelular(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="dataNascimento" className="text-xs">Nascimento</Label>
                      <Input id="dataNascimento" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} placeholder="DD/MM/AAAA" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cep" className="text-xs">CEP</Label>
                      <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="endereco" className="text-xs">Endereço</Label>
                    <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="h-8 text-xs" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="numero" className="text-xs">Nº</Label>
                      <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bairro" className="text-xs">Bairro</Label>
                      <Input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cidade" className="text-xs">Cidade</Label>
                      <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="estado" className="text-xs">Estado</Label>
                      <Input id="estado" value={estado} onChange={(e) => setEstado(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="complemento" className="text-xs">Complemento</Label>
                      <Input id="complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="nomeCertificado" className="text-xs">Certificado</Label>
                  <Input id="nomeCertificado" value={nomeCertificado || nomeCompleto} onChange={(e) => setNomeCertificado(e.target.value)} placeholder="Nome do certificado" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                   <Label htmlFor="formaPagamento" className="text-xs">Pagamento *</Label>
                   <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                     <SelectTrigger className="h-8 text-xs">
                       <SelectValue placeholder="Selecione" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="PIX">PIX</SelectItem>
                       <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                       <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                       <SelectItem value="Boleto">Boleto</SelectItem>
                       <SelectItem value="Transferência">Transferência</SelectItem>
                       <SelectItem value="Pix + Cartão">Pix + Cartão</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="statusPagamento" className="text-xs">Status Pagamento</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pago">Pago</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prazo" className="text-xs">Prazo</Label>
                  <Input id="prazo" value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="DD/MM/AAAA" className="h-8 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="valorPedido" className="text-xs">Valor do Pedido (R$)</Label>
                  <Input id="valorPedido" value={valorPedido} onChange={(e) => setValorPedido(e.target.value)} placeholder="Ex: 1500,00" className="h-8 text-xs" />
                </div>
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                    Informações adicionais
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="canal" className="text-xs">Canal</Label>
                      <Input id="canal" value={canal} onChange={(e) => setCanal(e.target.value)} placeholder="WhatsApp, Instagram" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="origemCliente" className="text-xs">Origem</Label>
                      <Input id="origemCliente" value={origemCliente} onChange={(e) => setOrigemCliente(e.target.value)} placeholder="Indicação, Ads" className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="cupom" className="text-xs">Cupom</Label>
                      <Input id="cupom" value={cupom} onChange={(e) => setCupom(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="brindes" className="text-xs">Brindes</Label>
                      <Input id="brindes" value={brindes} onChange={(e) => setBrindes(e.target.value)} placeholder="Chaveiro, Adesivo" className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="observacao" className="text-xs">Observações</Label>
                    <Input id="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} className="h-8 text-xs" />
                  </div>
                </CollapsibleContent>
              </Collapsible>


              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleFinalizarPedido} disabled={submitting} className="flex-1 bg-accent hover:bg-accent/90">
                  {submitting ? 'Processando...' : 'Finalizar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div ref={pedidoExportRef} className="bg-background p-4 rounded-lg space-y-4">
                {/* Cabeçalho do pedido */}
                <div data-pdf-section className="text-center border-b border-border pb-3">
                  <h3 className="font-bold text-lg">Pedido - {nomeCompleto}</h3>
                  <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                {/* Dados do cliente - completo ou simplificado */}
                {clienteAntigo ? (
                  <div data-pdf-section className="text-sm space-y-1">
                    <div><span className="text-muted-foreground font-medium">Cliente:</span> {nomeCompleto}</div>
                  </div>
                ) : (
                  <div data-pdf-section className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Nome:</span> {nomeCompleto}</div>
                    <div><span className="text-muted-foreground">CPF:</span> {cpf || '-'}</div>
                    <div><span className="text-muted-foreground">Email:</span> {email || '-'}</div>
                    <div><span className="text-muted-foreground">Celular:</span> {celular || '-'}</div>
                    {endereco && (
                      <div className="col-span-2"><span className="text-muted-foreground">Endereço:</span> {`${endereco}, ${numero} - ${bairro}, ${cidade}/${estado}`}{complemento ? ` (${complemento})` : ''}</div>
                    )}
                    {cep && <div><span className="text-muted-foreground">CEP:</span> {cep}</div>}
                    {dataNascimento && <div><span className="text-muted-foreground">Nascimento:</span> {dataNascimento}</div>}
                  </div>
                )}

                {/* Título das lâminas */}
                <div data-pdf-section className="border-t border-border pt-3">
                  <h4 className="font-semibold mb-2">Lâminas do Pedido</h4>
                </div>

                {/* Cada lâmina como card similar à imagem de referência */}
                {[...laminasCustomizadas, ...(modeloSelecionado && modeloAtual ? [{
                  id: 'current',
                  modelo: modeloAtual,
                  aco: acoAtual,
                  acabamento: acabamentoAtual,
                  bruteForge,
                  empunhadura: empunhaduraAtual,
                  dragonScale,
                  bainha: bainhaAtual,
                  corBainha,
                  textoLaser: textoLaser || '-',
                  embalagem,
                  observacoesLamina,
                  corBainhaPersonalizada,
                  subtotal: calcularSubtotal(),
                  quantidade: 1,
                }] as LaminaCustomizada[] : [])].map((lamina, index) => (
                  <div key={lamina.id} data-pdf-section className="mb-3 p-4 border border-border rounded-lg bg-card">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-28 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-border p-1">
                        <img 
                          src={getModeloImagem(lamina.modelo)} 
                          alt={lamina.modelo?.nome_modelo || ''} 
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-base">{lamina.modelo?.nome_modelo}</span>
                        <span className="text-muted-foreground ml-2 text-sm">#{index + 1}</span>
                        {(lamina as any).quantidade > 1 && (
                          <Badge variant="secondary" className="ml-2 text-xs">x{(lamina as any).quantidade}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span>Aço: {lamina.aco?.nome_opcao || '-'}</span>
                      <span>Acabamento: {lamina.acabamento?.nome_opcao || '-'}{(lamina as any).bruteForge ? ' + Brute Forge' : ''}</span>
                      <span>Empunhadura: {lamina.empunhadura?.nome_opcao || '-'}{lamina.dragonScale ? ' + DS' : ''}</span>
                      <span>Bainha: {lamina.bainha?.nome_opcao || '-'} {lamina.corBainha}</span>
                      {lamina.embalagem && <span>Embalagem: {lamina.embalagem}</span>}
                      {lamina.textoLaser && lamina.textoLaser !== '-' && <span className="col-span-2">Gravação: {lamina.textoLaser}</span>}
                      {(lamina as any).observacoesLamina && <span className="col-span-2 text-muted-foreground italic">Obs: {(lamina as any).observacoesLamina}</span>}
                    </div>
                  </div>
                ))}

                {/* Produtos Adicionais no resumo */}
                {produtosAdicionais.some(p => (quantidadesProdutos[p.id] || 0) > 0) && (
                  <div data-pdf-section className="border-t border-border pt-3">
                    <h4 className="font-semibold mb-2">Produtos Adicionais</h4>
                    <div className="space-y-1 text-xs">
                      {produtosAdicionais.filter(p => (quantidadesProdutos[p.id] || 0) > 0).map(produto => (
                        <div key={produto.id} className="flex justify-between text-muted-foreground">
                          <span>{produto.nome_produto} x{quantidadesProdutos[produto.id]}</span>
                        </div>
                      ))}
                      {observacoesProdutos && (
                        <p className="text-muted-foreground mt-1 italic">Obs: {observacoesProdutos}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Informações de Pagamento */}
                <div data-pdf-section className="border-t border-border pt-3">
                  <h4 className="font-semibold mb-2">Pagamento</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Valor Total:</span> <span className="font-bold">R$ {valorPedido || valorTotalCalculado.toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Forma:</span> {formaPagamento || '-'}</div>
                    <div><span className="text-muted-foreground">Status:</span> <span className={status === 'Pago' ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>{status}</span></div>
                    {prazo && <div><span className="text-muted-foreground">Prazo:</span> {prazo}</div>}
                    {cupom && <div><span className="text-muted-foreground">Cupom:</span> {cupom}</div>}
                  </div>
                </div>

                {/* Certificado */}
                <div data-pdf-section className="text-sm">
                  <span className="text-muted-foreground">Certificado:</span> {nomeCertificado || nomeCompleto}
                </div>

                {/* Observações */}
                {observacao && (
                  <div data-pdf-section className="text-sm">
                    <span className="text-muted-foreground">Observações:</span> {observacao}
                  </div>
                )}

                {/* Rodapé */}
                <div data-pdf-section className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
                  Vendedor: {profile?.nome_vendedor || '-'}
                </div>
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    Ver texto formatado
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap max-h-40 overflow-auto">
                    {textoFormatado}
                  </pre>
                </CollapsibleContent>
              </Collapsible>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={copiarTexto}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Texto
                </Button>
                <Button variant="outline" onClick={exportarParaSheets} disabled={exportandoSheets}>
                  {exportandoSheets ? 'Exportando...' : 'Google Sheets'}
                </Button>
                <Button variant="outline" onClick={exportarPedidoComoImagem}>
                  <Image className="h-4 w-4 mr-2" />
                  Imagem
                </Button>
                <Button variant="outline" onClick={exportarPedidoComoPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>

              <Button onClick={fecharModal} className="w-full bg-accent hover:bg-accent/90">
                Novo Pedido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal IA */}
      <Dialog open={modalIAOpen} onOpenChange={setModalIAOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preencher com IA</DialogTitle>
            <DialogDescription>
              Cole os dados do cliente e a IA preencherá automaticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <textarea
              className="w-full h-40 p-3 text-sm border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Cole aqui os dados do cliente..."
              value={textoIA}
              onChange={(e) => setTextoIA(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModalIAOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={processarTextoComIA} disabled={processandoIA} className="flex-1 bg-accent hover:bg-accent/90">
                {processandoIA ? 'Processando...' : 'Processar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
