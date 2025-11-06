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
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false);
  const [textoFormatado, setTextoFormatado] = useState('');

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
    setPedidoFinalizado(false);
    setTextoFormatado('');
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

  const fecharModal = () => {
    setModalOpen(false);
    resetSimulacao();
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calculator className="h-8 w-8 text-accent" />
          Simulador de Preços
        </h1>
        <p className="text-muted-foreground">Configure a faca personalizada e veja o preço em tempo real</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda - Configurador */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seção 1: Escolha o Modelo */}
          <Card>
            <CardHeader>
              <CardTitle>1. Escolha o Modelo</CardTitle>
              <CardDescription>Selecione o modelo base da lâmina</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
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
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum modelo cadastrado ainda.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Seção 2: Configure os Componentes */}
          {selectedModel && (
            <Card>
              <CardHeader>
                <CardTitle>2. Configure os Componentes</CardTitle>
                <CardDescription>Personalize sua faca com as opções disponíveis</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="aco">
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Aço</span>
                        {selectedAco && (
                          <span className="text-sm text-muted-foreground">
                            {selectedAco.nome_opcao}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
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

                  <AccordionItem value="empunhadura">
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Empunhadura</span>
                        {selectedEmpunhadura && (
                          <span className="text-sm text-muted-foreground">
                            {selectedEmpunhadura.nome_opcao}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
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

                  <AccordionItem value="acabamento">
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Acabamento</span>
                        {selectedAcabamento && (
                          <span className="text-sm text-muted-foreground">
                            {selectedAcabamento.nome_opcao}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
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

                  <AccordionItem value="bainha">
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Bainha</span>
                        {selectedBainha && (
                          <span className="text-sm text-muted-foreground">
                            {selectedBainha.nome_opcao}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
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
              </CardContent>
            </Card>
          )}

          {/* Seção 3: Extras */}
          {selectedModel && (
            <Card>
              <CardHeader>
                <CardTitle>3. Extras</CardTitle>
                <CardDescription>Adicione personalizações especiais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="laser"
                    checked={selectedLaser}
                    onCheckedChange={(checked) => setSelectedLaser(checked as boolean)}
                  />
                  <Label htmlFor="laser" className="cursor-pointer">
                    Personalização a Laser (Adiciona R$ 30,00)
                  </Label>
                </div>

                {selectedLaser && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="texto-laser">Texto da Personalização</Label>
                    <Input
                      id="texto-laser"
                      value={textLaser}
                      onChange={(e) => setTextLaser(e.target.value)}
                      placeholder="Digite o texto para gravar a laser"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Seção 4: Produtos Adicionais */}
          {selectedModel && produtosAdicionais.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>4. Produtos Adicionais</CardTitle>
                <CardDescription>Adicione produtos complementares ao pedido</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna Direita - Resumo Sticky */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Lâminas já adicionadas */}
            {laminasConfiguradas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Lâminas Adicionadas ({laminasConfiguradas.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {laminasConfiguradas.map((lamina, index) => (
                    <div key={lamina.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm">Lâmina {index + 1}</p>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editarLamina(lamina)}
                            className="h-7 px-2"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerLamina(lamina.id)}
                            className="h-7 px-2 text-destructive"
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{lamina.modelo.nome_modelo}</p>
                      <p className="text-sm font-semibold mt-1">R$ {lamina.subtotal.toFixed(2)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Resumo da lâmina atual */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-accent/5">
                <CardTitle className="text-3xl font-bold text-center">
                  R$ {valorTotalCalculado.toFixed(2)}
                </CardTitle>
                <CardDescription className="text-center">Valor Total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {selectedModel ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <p className="text-sm font-semibold text-muted-foreground">
                        {editandoLaminaId ? 'Editando Lâmina' : 'Lâmina Atual'}
                      </p>
                      <p className="text-sm font-semibold">R$ {subtotalLaminaAtual.toFixed(2)}</p>
                    </div>

                    <div className="pb-3 border-b">
                      <p className="text-sm text-muted-foreground">Modelo</p>
                      <p className="font-semibold">{selectedModel.nome_modelo}</p>
                      <p className="text-sm">R$ {selectedModel.preco_base.toFixed(2)}</p>
                    </div>

                    {selectedAco && (
                      <div className="pb-3 border-b">
                        <p className="text-sm text-muted-foreground">Aço</p>
                        <p className="font-semibold">{selectedAco.nome_opcao}</p>
                        <p className="text-sm">R$ {selectedAco.preco_adicional.toFixed(2)}</p>
                      </div>
                    )}

                    {selectedEmpunhadura && (
                      <div className="pb-3 border-b">
                        <p className="text-sm text-muted-foreground">Empunhadura</p>
                        <p className="font-semibold">{selectedEmpunhadura.nome_opcao}</p>
                        <p className="text-sm">R$ {selectedEmpunhadura.preco_adicional.toFixed(2)}</p>
                      </div>
                    )}

                    {selectedAcabamento && (
                      <div className="pb-3 border-b">
                        <p className="text-sm text-muted-foreground">Acabamento</p>
                        <p className="font-semibold">{selectedAcabamento.nome_opcao}</p>
                        <p className="text-sm">R$ {selectedAcabamento.preco_adicional.toFixed(2)}</p>
                      </div>
                    )}

                    {selectedBainha && (
                      <div className="pb-3 border-b">
                        <p className="text-sm text-muted-foreground">Bainha</p>
                        <p className="font-semibold">{selectedBainha.nome_opcao}</p>
                        <p className="text-sm">R$ {selectedBainha.preco_adicional.toFixed(2)}</p>
                      </div>
                    )}

                    {selectedLaser && (
                      <div className="pb-3 border-b">
                        <p className="text-sm text-muted-foreground">Laser</p>
                        <p className="font-semibold">Sim</p>
                        <p className="text-sm">R$ 30,00</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={adicionarLamina}
                        className="flex-1"
                        variant="outline"
                      >
                        {editandoLaminaId ? 'Atualizar Lâmina' : 'Adicionar Lâmina'}
                      </Button>
                      {selectedModel && (
                        <Button
                          onClick={limparLaminaAtual}
                          variant="ghost"
                          size="icon"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Selecione um modelo para começar
                  </p>
                )}

                {produtosAdicionais.map((produto) => {
                  const quantidade = quantidadesProdutos[produto.id] || 0;
                  if (quantidade === 0) return null;
                  return (
                    <div key={produto.id} className="pb-3 border-b">
                      <p className="text-sm text-muted-foreground">{produto.nome_produto}</p>
                      <p className="font-semibold">{quantidade}x R$ {produto.preco_unitario.toFixed(2)}</p>
                      <p className="text-sm">R$ {(quantidade * produto.preco_unitario).toFixed(2)}</p>
                    </div>
                  );
                })}

                {(laminasConfiguradas.length > 0 || selectedModel) && (
                  <Button
                    onClick={() => setModalOpen(true)}
                    className="w-full"
                    size="lg"
                  >
                    Revisar e Fechar Pedido
                  </Button>
                )}
              </CardContent>
            </Card>
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
              <div className="flex gap-2">
                <Button onClick={copiarTexto} className="flex-1">
                  Copiar Texto
                </Button>
                <Button onClick={fecharModal} variant="outline" className="flex-1">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
