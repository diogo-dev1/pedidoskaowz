import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  tipo_opcao: 'Aço' | 'Empunhadura' | 'Acabamento' | 'Bainha' | 'Cor de Bainha' | 'Embalagem' | 'Espaçador';
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
  espacador: OpcaoComponente | null;
  laser: boolean;
  textoLaser: string;
  localGravacao: string[];
  embalagem: string;
  embalagemGravacao: boolean;
  embalagemTextoGravacao: string;
  observacoesLamina: string;
  subtotal: number;
  quantidade: number;
}

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
  const [bruteForge, setBruteForge] = useState(false);
  const [empunhaduraSelecionada, setEmpunhaduraSelecionada] = useState<string>('');
  const [dragonScale, setDragonScale] = useState(false);
  const [bainhaSelecionada, setBainhaSelecionada] = useState<string>('');
  const [corBainha, setCorBainha] = useState<string>('');
  const [corBainhaPersonalizada, setCorBainhaPersonalizada] = useState<string>('');
  const [espacadorSelecionado, setEspacadorSelecionado] = useState<string>('');
  const [laser, setLaser] = useState(false);
  const [textoLaser, setTextoLaser] = useState('');
  const [localGravacao, setLocalGravacao] = useState<string[]>([]);
  const [embalagem, setEmbalagem] = useState('');
  const [embalagemGravacao, setEmbalagemGravacao] = useState(false);
  const [embalagemTextoGravacao, setEmbalagemTextoGravacao] = useState('');
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
  const [origemCliente, setOrigemCliente] = useState('');
  const [observacao, setObservacao] = useState('');
  const [cupom, setCupom] = useState('');
  const [prazo, setPrazo] = useState('');
  const [brindes, setBrindes] = useState('');

  // Modal IA
  const [modalIAOpen, setModalIAOpen] = useState(false);
  const [textoIA, setTextoIA] = useState('');
  const [processandoIA, setProcessandoIA] = useState(false);

  // Collapsibles
  const [showExtras, setShowExtras] = useState(false);

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
  const coresBainha = componentes.filter(c => c.tipo_opcao === 'Cor de Bainha');
  const embalagens = componentes.filter(c => c.tipo_opcao === 'Embalagem');
  const espacadores = componentes.filter(c => c.tipo_opcao === 'Espaçador');

  const categorias = ['EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR'];

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

  const espacadorAtualCalc = componentes.find(c => c.id === espacadorSelecionado);

  const calcularSubtotal = (): number => {
    const precoBase = modeloAtual?.preco_base || 0;
    const precoAco = acoAtual?.preco_adicional || 0;
    const precoAcabamento = acabamentoAtual?.preco_adicional || 0;
    const precoEmpunhadura = empunhaduraAtual?.preco_adicional || 0;
    const precoBainha = bainhaAtual?.preco_adicional || 0;
    const precoEspacador = espacadorAtualCalc?.preco_adicional || 0;
    const precoLaser = laser ? 30 : 0;
    return precoBase + precoAco + precoAcabamento + precoEmpunhadura + precoBainha + precoEspacador + precoLaser;
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

    const espacadorAtual = componentes.find(c => c.id === espacadorSelecionado);
    
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
      espacador: espacadorAtual || null,
      laser,
      textoLaser,
      localGravacao,
      embalagem,
      embalagemGravacao,
      embalagemTextoGravacao,
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
    // Se tiver cor personalizada, setar como OUTRA
    if (lamina.corBainhaPersonalizada) {
      setCorBainha('OUTRA');
      setCorBainhaPersonalizada(lamina.corBainhaPersonalizada);
    } else {
      setCorBainha(lamina.corBainha);
      setCorBainhaPersonalizada('');
    }
    setEspacadorSelecionado(lamina.espacador?.id || '');
    setLaser(lamina.laser);
    setTextoLaser(lamina.textoLaser);
    setLocalGravacao(lamina.localGravacao);
    setEmbalagem(lamina.embalagem);
    setEmbalagemGravacao(lamina.embalagemGravacao);
    setEmbalagemTextoGravacao(lamina.embalagemTextoGravacao);
    setObservacoesLamina(lamina.observacoesLamina || '');
    setLaminaEmEdicao(lamina.id);
    setLaminaModalAberta(null);
    toast.info('Editando lâmina - faça as alterações e clique em Salvar');
    setEmbalagemTextoGravacao(lamina.embalagemTextoGravacao);
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

    const espacadorAtual = componentes.find(c => c.id === espacadorSelecionado);
    const laminaExistente = laminasCustomizadas.find(l => l.id === laminaEmEdicao);
    
    // Determinar cor da bainha final (personalizada ou selecionada)
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
      espacador: espacadorAtual || null,
      laser,
      textoLaser,
      localGravacao,
      embalagem,
      embalagemGravacao,
      embalagemTextoGravacao,
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
    setCorBainha('');
    setCorBainhaPersonalizada('');
    setEspacadorSelecionado('');
    setLaser(false);
    setTextoLaser('');
    setLocalGravacao([]);
    setEmbalagem('');
    setEmbalagemGravacao(false);
    setEmbalagemTextoGravacao('');
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
    setOrigemCliente('');
    setObservacao('');
    setCupom('');
    setPrazo('');
    setBrindes('');
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
    if (!pedidoExportRef.current) return;
    
    try {
      // Dimensões A4 em mm
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const MARGIN_MM = 10;
      const CONTENT_WIDTH_MM = A4_WIDTH_MM - (MARGIN_MM * 2);
      const SECTION_GAP_MM = 3;

      // Buscar seções do pedido para captura individual
      const sections = Array.from(
        pedidoExportRef.current.querySelectorAll('[data-pdf-section]')
      ) as HTMLElement[];

      // Se não houver seções marcadas, capturar tudo de uma vez
      if (sections.length === 0) {
        const canvas = await html2canvas(pedidoExportRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          imageTimeout: 0,
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        
        const imgWidth = CONTENT_WIDTH_MM;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', MARGIN_MM, MARGIN_MM, imgWidth, Math.min(imgHeight, A4_HEIGHT_MM - MARGIN_MM * 2));
        pdf.save(`pedido-${nomeCompleto || 'cliente'}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
        toast.success('PDF do pedido exportado!');
        return;
      }

      // Capturar cada seção individualmente
      const sectionData: { canvas: HTMLCanvasElement; heightMM: number }[] = [];

      for (const section of sections) {
        const canvas = await html2canvas(section, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          imageTimeout: 0,
          onclone: (clonedDoc, element) => {
            // Garantir que imagens mantenham proporção
            const images = element.querySelectorAll('img');
            images.forEach((img) => {
              img.style.objectFit = 'contain';
            });
          }
        });

        // Calcular altura em mm
        const widthPx = canvas.width / 2;
        const heightPx = canvas.height / 2;
        const scaleFactor = CONTENT_WIDTH_MM / widthPx;
        const heightMM = heightPx * scaleFactor;

        sectionData.push({ canvas, heightMM });
      }

      // Criar PDF com quebras de página inteligentes
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let currentY = MARGIN_MM;

      for (const { canvas, heightMM } of sectionData) {
        const remainingSpace = A4_HEIGHT_MM - MARGIN_MM - currentY;

        // Se seção não couber na página atual, adicionar nova página
        if (heightMM > remainingSpace && currentY > MARGIN_MM) {
          pdf.addPage();
          currentY = MARGIN_MM;
        }

        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', MARGIN_MM, currentY, CONTENT_WIDTH_MM, heightMM);
        currentY += heightMM + SECTION_GAP_MM;
      }

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
      const todasLaminas = [...laminasCustomizadas];
      if (modeloSelecionado && modeloAtual) {
        const espacadorAtual = componentes.find(c => c.id === espacadorSelecionado);
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
          espacador: espacadorAtual || null,
          laser,
          textoLaser,
          localGravacao,
          embalagem,
          embalagemGravacao,
          embalagemTextoGravacao,
          observacoesLamina,
          subtotal: calcularSubtotal(),
          quantidade: 1,
        });
      }

      // Formatar itens no padrão: Modelo Aço Acabamento Empunhadura Bainha [Tipo] [Cor]
      const itensPedido = todasLaminas.map((lamina, index) => {
        const modelo = lamina.modelo?.nome_modelo || '';
        const aco = lamina.aco?.nome_opcao || '';
        const acabamento = (lamina.acabamento?.nome_opcao || '') + (lamina.bruteForge ? ' + Brute Forge' : '');
        const empunhadura = (lamina.empunhadura?.nome_opcao || '') + (lamina.dragonScale ? ' + Dragon Scale' : '');
        
        // Formato bainha: "Bainha [Tipo] [Cor]"
        const bainhaFormatada = lamina.bainha?.nome_opcao 
          ? `Bainha ${lamina.bainha.nome_opcao}${lamina.corBainha ? ` ${lamina.corBainha}` : ''}`
          : '';
        
        const espacadorInfo = lamina.espacador ? `Espaçador ${lamina.espacador.nome_opcao}` : '';
        
        const partes = [modelo, aco, acabamento, empunhadura, bainhaFormatada, espacadorInfo].filter(Boolean).join(' ');
        return `Item ${index + 1}: ${partes}`;
      }).join('\n\n');

      // Personalização à laser
      const laminasComLaser = todasLaminas.filter(l => l.laser && l.textoLaser);
      let personalizacaoTexto = 'Não';
      if (laminasComLaser.length > 0) {
        const todasIguais = laminasComLaser.every(l => l.textoLaser === laminasComLaser[0].textoLaser);
        if (todasIguais && laminasComLaser.length === todasLaminas.length) {
          personalizacaoTexto = laminasComLaser[0].textoLaser;
        } else {
          personalizacaoTexto = '\n' + laminasComLaser.map((l, i) => {
            const idx = todasLaminas.indexOf(l) + 1;
            return `Item ${idx}: ${l.textoLaser}`;
          }).join('\n');
        }
      }

      // Embalagem consolidada
      const embalagens = todasLaminas.map(l => l.embalagem).filter(Boolean);
      const embalagemTexto = embalagens.length > 0 ? embalagens.join(', ') : '-';

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
14. VALOR: ${valorTotalCalculado.toFixed(2)}
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
        const espacadorAtual = componentes.find(c => c.id === espacadorSelecionado);
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
          espacador: espacadorAtual || null,
          laser,
          textoLaser,
          localGravacao,
          embalagem,
          embalagemGravacao,
          embalagemTextoGravacao,
          observacoesLamina,
          subtotal: calcularSubtotal(),
          quantidade: 1,
        });
      }

      const laminasFormatadas = todasLaminas.map(lamina => ({
        modelo: lamina.modelo?.nome_modelo || '',
        aco: lamina.aco?.nome_opcao || '',
        empunhadura: (lamina.empunhadura?.nome_opcao || '') + (lamina.dragonScale ? ' + Dragon Scale' : ''),
        acabamento: (lamina.acabamento?.nome_opcao || '') + (lamina.bruteForge ? ' + Brute Forge' : ''),
        bainha: lamina.bainha?.nome_opcao || '',
        corBainha: lamina.corBainha,
        espacador: lamina.espacador?.nome_opcao || '',
        laser: lamina.laser,
        textoLaser: lamina.textoLaser,
        localGravacao: lamina.localGravacao.join(', '),
        embalagem: lamina.embalagem,
        embalagemGravacao: lamina.embalagemGravacao,
        embalagemTextoGravacao: lamina.embalagemTextoGravacao,
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
        valorTotal: valorTotalCalculado,
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

  // Componente de seleção inline compacto
  // Componente colapsável para seleção limpa
  const CollapsibleSelect = ({ 
    options, 
    selected, 
    onSelect, 
    label,
    etapaKey 
  }: { 
    options: OpcaoComponente[], 
    selected: string, 
    onSelect: (id: string) => void, 
    label: string,
    etapaKey?: string 
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.id === selected);

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-all">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              {selectedOption && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {selectedOption.nome_opcao}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {etapaKey && (
                <span onClick={(e) => e.stopPropagation()}>
                  <InfoEtapaModal etapaKey={etapaKey} />
                </span>
              )}
              {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex flex-wrap gap-1.5">
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  onSelect(opt.id);
                  setIsOpen(false);
                }}
                className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                  selected === opt.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'bg-background border border-border hover:border-accent/50'
                }`}
              >
                {opt.nome_opcao}
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando opções...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="container mx-auto px-3 py-4 max-w-5xl">
        {/* Header com IA */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {laminasCustomizadas.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {laminasCustomizadas.length} lâmina{laminasCustomizadas.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Button onClick={() => setModalIAOpen(true)} variant="outline" size="sm" className="gap-1.5 text-xs">
            ✨ IA
          </Button>
        </div>

        {/* Imagem do modelo selecionado - Acima do card */}
        {modeloSelecionado && modeloAtual && (
          <div className="bg-muted rounded-lg p-4 mb-3">
            <div className="w-full h-32 bg-white rounded overflow-hidden mb-3">
              <img
                src={getModeloImagem(modeloAtual)}
                alt={modeloAtual.nome_modelo}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{modeloAtual.nome_modelo}</p>
              <Button size="sm" variant="ghost" onClick={() => setModeloSelecionado('')} className="h-7 w-7 p-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Seleção de Modelo - Compacta */}
        <div className="bg-card rounded-lg border border-border p-3 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-sm">Modelo</h3>
            <InfoEtapaModal etapaKey="modelo" />
          </div>

          {/* Filtros inline */}
          <div className="flex flex-wrap gap-1 mb-2">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(cat === categoriaFiltro ? '' : cat)}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  categoriaFiltro === cat 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={buscaModelo}
              onChange={(e) => setBuscaModelo(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {mostrarModelos && modelosFiltrados.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
              {modelosFiltrados.map(modelo => (
                <button
                  key={modelo.id}
                  onClick={() => setModeloSelecionado(modelo.id)}
                  className={`p-2 rounded text-left text-xs transition-all flex items-center justify-between ${
                    modeloSelecionado === modelo.id
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="truncate">{modelo.nome_modelo}</span>
                  {modeloSelecionado === modelo.id && <Check className="h-3 w-3 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Customização - Collapsibles */}
        {modeloSelecionado && (
          <div className="bg-card rounded-lg border border-border p-3 mb-3 space-y-2">
            <CollapsibleSelect 
              options={acos} 
              selected={acoSelecionado} 
              onSelect={setAcoSelecionado} 
              label="Aço"
              etapaKey="aco"
            />

            <div className="space-y-1.5">
              <CollapsibleSelect 
                options={acabamentos} 
                selected={acabamentoSelecionado} 
                onSelect={setAcabamentoSelecionado} 
                label="Acabamento"
                etapaKey="acabamento"
              />
              {acabamentoSelecionado && (
                <div className="flex items-center gap-2 pl-3">
                  <Checkbox
                    id="bruteForge"
                    checked={bruteForge}
                    onCheckedChange={(checked) => setBruteForge(checked === true)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="bruteForge" className="text-xs cursor-pointer">Brute Forge</Label>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <CollapsibleSelect 
                options={empunhaduras} 
                selected={empunhaduraSelecionada} 
                onSelect={setEmpunhaduraSelecionada} 
                label="Empunhadura"
                etapaKey="empunhadura"
              />
              {empunhaduraSelecionada && (
                <div className="flex items-center gap-2 pl-3">
                  <Checkbox
                    id="dragonScale"
                    checked={dragonScale}
                    onCheckedChange={(checked) => setDragonScale(checked === true)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="dragonScale" className="text-xs cursor-pointer">Dragon Scale</Label>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <CollapsibleSelect 
                options={bainhas} 
                selected={bainhaSelecionada} 
                onSelect={setBainhaSelecionada} 
                label="Bainha"
                etapaKey="bainha"
              />
              {bainhaSelecionada && (
                <div className="space-y-2 ml-3">
                  <Select value={corBainha} onValueChange={(value) => {
                    setCorBainha(value);
                    if (value !== 'OUTRA') setCorBainhaPersonalizada('');
                  }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Cor da bainha" />
                    </SelectTrigger>
                    <SelectContent>
                      {coresBainha.map(cor => (
                        <SelectItem key={cor.id} value={cor.nome_opcao} className="text-xs">
                          {cor.nome_opcao}
                        </SelectItem>
                      ))}
                      <SelectItem value="OUTRA" className="text-xs">
                        Outra (digitar)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {corBainha === 'OUTRA' && (
                    <Input
                      placeholder="Digite a cor desejada..."
                      value={corBainhaPersonalizada}
                      onChange={(e) => setCorBainhaPersonalizada(e.target.value)}
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Espaçador */}
            <CollapsibleSelect 
              options={espacadores} 
              selected={espacadorSelecionado} 
              onSelect={setEspacadorSelecionado} 
              label="Espaçador"
              etapaKey="espacador"
            />

            {/* Extras colapsável */}
            <Collapsible open={showExtras} onOpenChange={setShowExtras}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <span className="flex items-center gap-1.5">
                    Laser & Embalagem
                    {(laser || embalagem) && <Badge variant="outline" className="text-[10px] px-1 py-0">Ativo</Badge>}
                  </span>
                  {showExtras ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {/* Laser */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="laser"
                      checked={laser}
                      onCheckedChange={(checked) => setLaser(checked as boolean)}
                      className="h-3.5 w-3.5"
                    />
                    <Label htmlFor="laser" className="text-xs cursor-pointer">Personalização à Laser</Label>
                    <InfoEtapaModal etapaKey="laser" />
                  </div>
                  {laser && (
                    <div className="space-y-2 pl-5">
                      <Input
                        placeholder="Texto para gravação..."
                        value={textoLaser}
                        onChange={(e) => setTextoLaser(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {LOCAIS_GRAVACAO.map(local => (
                          <button
                            key={local}
                            onClick={() => {
                              if (localGravacao.includes(local)) {
                                setLocalGravacao(localGravacao.filter(l => l !== local));
                              } else {
                                setLocalGravacao([...localGravacao, local]);
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              localGravacao.includes(local)
                                ? 'bg-accent text-accent-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            {local}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Embalagem */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Embalagem</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {embalagens.map(emb => (
                      <button
                        key={emb.id}
                        onClick={() => setEmbalagem(embalagem === emb.nome_opcao ? '' : emb.nome_opcao)}
                        className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                          embalagem === emb.nome_opcao
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {emb.nome_opcao}
                      </button>
                    ))}
                  </div>
                  {embalagem && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="embalagemGravacao"
                        checked={embalagemGravacao}
                        onCheckedChange={(checked) => setEmbalagemGravacao(checked as boolean)}
                        className="h-3.5 w-3.5"
                      />
                      <Label htmlFor="embalagemGravacao" className="text-xs cursor-pointer">Gravação na embalagem</Label>
                    </div>
                  )}
                  {embalagemGravacao && (
                    <Input
                      placeholder="Texto para embalagem..."
                      value={embalagemTextoGravacao}
                      onChange={(e) => setEmbalagemTextoGravacao(e.target.value)}
                      className="h-8 text-xs"
                    />
                  )}
                </div>

                {/* Observações da Lâmina */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Observações da Lâmina</Label>
                  <Input
                    placeholder="Observações específicas desta lâmina..."
                    value={observacoesLamina}
                    onChange={(e) => setObservacoesLamina(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Produtos Adicionais - Inline */}
        {produtosAdicionais.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-3 mb-3">
            <h3 className="text-sm font-medium mb-2">Produtos Adicionais</h3>
            <div className="space-y-2 mb-3">
              {produtosAdicionais.map((produto) => {
                const quantidade = quantidadesProdutos[produto.id] || 0;
                return (
                  <div
                    key={produto.id}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                      quantidade > 0
                        ? 'bg-accent/10 border border-accent/30'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{produto.nome_produto}</p>
                      <p className="text-[10px] text-muted-foreground">
                        R$ {produto.preco_unitario.toFixed(2)} un.
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setQuantidadesProdutos(prev => ({
                          ...prev,
                          [produto.id]: Math.max(0, (prev[produto.id] || 0) - 1)
                        }))}
                        className="h-6 w-6 p-0"
                        disabled={quantidade <= 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-medium w-4 text-center">{quantidade}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setQuantidadesProdutos(prev => ({
                          ...prev,
                          [produto.id]: (prev[produto.id] || 0) + 1
                        }))}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Input
              placeholder="Observações sobre produtos adicionais..."
              value={observacoesProdutos}
              onChange={(e) => setObservacoesProdutos(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        )}

        {/* Lâminas Adicionadas - Inline compacto */}
        {laminasCustomizadas.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-3 mb-3">
            <h3 className="font-semibold text-sm mb-2">
              Lâminas ({laminasCustomizadas.reduce((sum, l) => sum + l.quantidade, 0)})
            </h3>
            <div className="space-y-1.5">
              {laminasCustomizadas.map((lamina) => (
                <div
                  key={lamina.id}
                  className={`p-2 rounded flex items-center justify-between gap-2 ${
                    laminaEmEdicao === lamina.id 
                      ? 'bg-accent/20 border border-accent' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setLaminaModalAberta(lamina)}
                  >
                    <p className="text-xs font-medium truncate">
                      {lamina.modelo?.nome_modelo}
                      {lamina.quantidade > 1 && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                          x{lamina.quantidade}
                        </Badge>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {[lamina.aco?.nome_opcao, lamina.acabamento?.nome_opcao].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  
                  {/* Controles de quantidade */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        alterarQuantidadeLamina(lamina.id, lamina.quantidade - 1);
                      }}
                      className="h-6 w-6 p-0"
                      disabled={lamina.quantidade <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-medium w-4 text-center">{lamina.quantidade}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        alterarQuantidadeLamina(lamina.id, lamina.quantidade + 1);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Botão editar */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      editarLamina(lamina);
                    }}
                    className="h-6 w-6 p-0"
                    title="Editar"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>

                  {/* Botão remover */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      removerLamina(lamina.id);
                    }}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    title="Remover"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
        <div className="px-3 py-3">
          <div className="flex items-center justify-end gap-2 max-w-5xl mx-auto">
            <div className="flex gap-2">
              {laminaEmEdicao ? (
                <>
                  <Button onClick={cancelarEdicao} variant="outline" size="sm" className="text-xs h-9">
                    Cancelar
                  </Button>
                  <Button onClick={salvarEdicaoLamina} size="sm" className="text-xs h-9 bg-accent hover:bg-accent/90">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Salvar Alterações
                  </Button>
                </>
              ) : (
                <>
                  {modeloSelecionado && (
                    <>
                      <Button onClick={limparFormulario} variant="outline" size="sm" className="text-xs h-9">
                        Limpar
                      </Button>
                      <Button onClick={adicionarLamina} variant="outline" size="sm" className="text-xs h-9 border-accent text-accent">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Adicionar
                      </Button>
                    </>
                  )}
                  {(laminasCustomizadas.length > 0 || modeloSelecionado) && (
                    <Button onClick={() => setModalOpen(true)} size="sm" className="text-xs h-9 bg-accent hover:bg-accent/90">
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
                  {laminaModalAberta.espacador && (
                    <div className="bg-muted p-2.5 rounded-lg">
                      <p className="text-muted-foreground text-xs">Espaçador</p>
                      <p className="font-medium">{laminaModalAberta.espacador.nome_opcao}</p>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pedidoFinalizado ? 'Pedido Finalizado' : 'Finalizar Pedido'}</DialogTitle>
            <DialogDescription>
              {pedidoFinalizado ? 'Copie as informações abaixo' : 'Preencha os dados do cliente'}
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

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeCertificado">Nome no Certificado</Label>
                  <Input id="nomeCertificado" value={nomeCertificado} onChange={(e) => setNomeCertificado(e.target.value)} placeholder="Se diferente do nome" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                      <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                    Informações adicionais
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="canal">Canal de Venda</Label>
                      <Input id="canal" value={canal} onChange={(e) => setCanal(e.target.value)} placeholder="Ex: WhatsApp, Instagram" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="origemCliente">Origem do Cliente</Label>
                      <Input id="origemCliente" value={origemCliente} onChange={(e) => setOrigemCliente(e.target.value)} placeholder="Ex: Indicação, Ads" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Confirmado">Confirmado</SelectItem>
                          <SelectItem value="Em Produção">Em Produção</SelectItem>
                          <SelectItem value="Enviado">Enviado</SelectItem>
                          <SelectItem value="Entregue">Entregue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cupom">Cupom</Label>
                      <Input id="cupom" value={cupom} onChange={(e) => setCupom(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prazo">Prazo de Entrega</Label>
                      <Input id="prazo" value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="DD/MM/AAAA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brindes">Brindes</Label>
                      <Input id="brindes" value={brindes} onChange={(e) => setBrindes(e.target.value)} placeholder="Ex: Chaveiro, Adesivo" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observacao">Observações</Label>
                    <Input id="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
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

                {/* Dados do cliente */}
                <div data-pdf-section className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> {nomeCompleto}</div>
                  <div><span className="text-muted-foreground">CPF:</span> {cpf || '-'}</div>
                  <div><span className="text-muted-foreground">Email:</span> {email || '-'}</div>
                  <div><span className="text-muted-foreground">Celular:</span> {celular || '-'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Endereço:</span> {endereco ? `${endereco}, ${numero} - ${bairro}, ${cidade}/${estado}` : '-'}</div>
                </div>

                {/* Título das lâminas */}
                <div data-pdf-section className="border-t border-border pt-3">
                  <h4 className="font-semibold mb-2">Lâminas do Pedido</h4>
                </div>

                {/* Cada lâmina em seção separada */}
                {[...laminasCustomizadas, ...(modeloSelecionado && modeloAtual ? [{
                  id: 'current',
                  modelo: modeloAtual,
                  aco: acoAtual,
                  acabamento: acabamentoAtual,
                  empunhadura: empunhaduraAtual,
                  dragonScale,
                  bainha: bainhaAtual,
                  corBainha,
                  laser,
                  textoLaser,
                  localGravacao,
                  embalagem,
                  embalagemGravacao,
                  embalagemTextoGravacao,
                  subtotal: calcularSubtotal()
                }] : [])].map((lamina, index) => (
                  <div key={lamina.id} data-pdf-section className="mb-3 p-3 bg-muted rounded text-xs">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-20 h-14 bg-white rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={getModeloImagem(lamina.modelo)} 
                          alt={lamina.modelo?.nome_modelo || ''} 
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-sm">{lamina.modelo?.nome_modelo}</span>
                        <span className="text-muted-foreground ml-2">#{index + 1}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                      <span>Aço: {lamina.aco?.nome_opcao || '-'}</span>
                      <span>Acabamento: {lamina.acabamento?.nome_opcao || '-'}</span>
                      <span>Empunhadura: {lamina.empunhadura?.nome_opcao || '-'}{lamina.dragonScale ? ' + DS' : ''}</span>
                      <span>Bainha: {lamina.bainha?.nome_opcao || '-'} {lamina.corBainha}</span>
                      {lamina.laser && <span className="col-span-2">Laser: {lamina.textoLaser}</span>}
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

                {/* Rodapé */}
                <div data-pdf-section className="text-xs text-muted-foreground text-center pt-2">
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
