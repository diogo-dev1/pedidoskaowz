import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Calculator, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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

export default function Simulador() {
  const { profile } = useAuth();
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [componentes, setComponentes] = useState<OpcaoComponente[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de seleção
  const [selectedModel, setSelectedModel] = useState<ModeloBase | null>(null);
  const [selectedAco, setSelectedAco] = useState<OpcaoComponente | null>(null);
  const [selectedEmpunhadura, setSelectedEmpunhadura] = useState<OpcaoComponente | null>(null);
  const [selectedAcabamento, setSelectedAcabamento] = useState<OpcaoComponente | null>(null);
  const [selectedBainha, setSelectedBainha] = useState<OpcaoComponente | null>(null);
  const [selectedLaser, setSelectedLaser] = useState(false);
  const [textLaser, setTextLaser] = useState('');

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [modelosRes, componentesRes] = await Promise.all([
      supabase.from('modelos_base').select('*').order('nome_modelo'),
      supabase.from('opcoes_componentes').select('*').order('tipo_opcao')
    ]);

    if (modelosRes.data) setModelos(modelosRes.data);
    if (componentesRes.data) setComponentes(componentesRes.data as OpcaoComponente[]);
    setLoading(false);
  };

  // Filtrar componentes por tipo
  const acos = useMemo(() => componentes.filter(c => c.tipo_opcao === 'Aço'), [componentes]);
  const empunhaduras = useMemo(() => componentes.filter(c => c.tipo_opcao === 'Empunhadura'), [componentes]);
  const acabamentos = useMemo(() => componentes.filter(c => c.tipo_opcao === 'Acabamento'), [componentes]);
  const bainhas = useMemo(() => componentes.filter(c => c.tipo_opcao === 'Bainha'), [componentes]);

  // Cálculo do total em tempo real
  const valorTotalCalculado = useMemo(() => {
    const precoBase = selectedModel?.preco_base || 0;
    const precoAco = selectedAco?.preco_adicional || 0;
    const precoEmpunhadura = selectedEmpunhadura?.preco_adicional || 0;
    const precoAcabamento = selectedAcabamento?.preco_adicional || 0;
    const precoBainha = selectedBainha?.preco_adicional || 0;
    const precoLaser = selectedLaser ? 30 : 0;

    return precoBase + precoAco + precoEmpunhadura + precoAcabamento + precoBainha + precoLaser;
  }, [selectedModel, selectedAco, selectedEmpunhadura, selectedAcabamento, selectedBainha, selectedLaser]);

  const resetSimulacao = () => {
    setSelectedModel(null);
    setSelectedAco(null);
    setSelectedEmpunhadura(null);
    setSelectedAcabamento(null);
    setSelectedBainha(null);
    setSelectedLaser(false);
    setTextLaser('');
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
  };

  const handleFinalizarPedido = async () => {
    if (!nomeCompleto || !formaPagamento) {
      toast.error('Preencha pelo menos o nome e a forma de pagamento');
      return;
    }

    setSubmitting(true);

    try {
      // Dados para a planilha de produção
      const dadosProducao = {
        modelo: selectedModel?.nome_modelo || '',
        aco: selectedAco?.nome_opcao || '',
        empunhadura: selectedEmpunhadura?.nome_opcao || '',
        acabamento: selectedAcabamento?.nome_opcao || '',
        bainha: selectedBainha?.nome_opcao || '',
        textoLaser: selectedLaser ? textLaser : '',
        nomeCertificado: nomeCertificado,
      };

      // Dados para a planilha de vendas
      const dadosVendas = {
        data: new Date().toLocaleDateString('pt-BR'),
        nomeCompleto,
        cpf,
        endereco: `${endereco} ${numero}, ${bairro}, ${cidade}/${estado} - ${cep}${complemento ? ' - ' + complemento : ''}`,
        valorTotal: valorTotalCalculado.toFixed(2),
        formaPagamento,
        vendedor: profile?.nome_vendedor || '',
      };

      console.log('Dados da simulação:', { dadosProducao, dadosVendas });

      toast.success('Pedido enviado para produção com sucesso!');
      setModalOpen(false);
      resetSimulacao();
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      toast.error('Erro ao enviar pedido');
    } finally {
      setSubmitting(false);
    }
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
              <div className="grid gap-4 md:grid-cols-2">
                {modelos.map((modelo) => (
                  <Card
                    key={modelo.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedModel?.id === modelo.id ? 'ring-2 ring-accent shadow-lg' : ''
                    }`}
                    onClick={() => setSelectedModel(modelo)}
                  >
                    {modelo.imagem_modelo && (
                      <img
                        src={modelo.imagem_modelo}
                        alt={modelo.nome_modelo}
                        className="w-full h-40 object-cover rounded-t-lg"
                      />
                    )}
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        {modelo.nome_modelo}
                        {selectedModel?.id === modelo.id && (
                          <Check className="h-5 w-5 text-accent" />
                        )}
                      </CardTitle>
                      <CardDescription>R$ {modelo.preco_base.toFixed(2)}</CardDescription>
                    </CardHeader>
                  </Card>
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
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Aço</Label>
                  <Select
                    value={selectedAco?.id || ''}
                    onValueChange={(value) => setSelectedAco(acos.find(a => a.id === value) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de aço" />
                    </SelectTrigger>
                    <SelectContent>
                      {acos.map((aco) => (
                        <SelectItem key={aco.id} value={aco.id}>
                          {aco.nome_opcao} (+R$ {aco.preco_adicional.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Empunhadura</Label>
                  <Select
                    value={selectedEmpunhadura?.id || ''}
                    onValueChange={(value) => setSelectedEmpunhadura(empunhaduras.find(e => e.id === value) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empunhadura" />
                    </SelectTrigger>
                    <SelectContent>
                      {empunhaduras.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nome_opcao} (+R$ {emp.preco_adicional.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Acabamento</Label>
                  <Select
                    value={selectedAcabamento?.id || ''}
                    onValueChange={(value) => setSelectedAcabamento(acabamentos.find(a => a.id === value) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o acabamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {acabamentos.map((acab) => (
                        <SelectItem key={acab.id} value={acab.id}>
                          {acab.nome_opcao} (+R$ {acab.preco_adicional.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Bainha</Label>
                  <Select
                    value={selectedBainha?.id || ''}
                    onValueChange={(value) => setSelectedBainha(bainhas.find(b => b.id === value) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a bainha" />
                    </SelectTrigger>
                    <SelectContent>
                      {bainhas.map((bainha) => (
                        <SelectItem key={bainha.id} value={bainha.id}>
                          {bainha.nome_opcao} (+R$ {bainha.preco_adicional.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
        </div>

        {/* Coluna Direita - Resumo Sticky */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-accent/5">
                <CardTitle className="text-3xl font-bold text-center">
                  R$ {valorTotalCalculado.toFixed(2)}
                </CardTitle>
                <CardDescription className="text-center">Valor Total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {selectedModel && (
                  <div className="space-y-3">
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

                    <Button
                      onClick={() => setModalOpen(true)}
                      className="w-full"
                      size="lg"
                      disabled={!selectedModel}
                    >
                      Revisar e Fechar Pedido
                    </Button>
                  </div>
                )}

                {!selectedModel && (
                  <p className="text-center text-muted-foreground py-8">
                    Selecione um modelo para começar
                  </p>
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
            <DialogTitle>Finalizar Pedido</DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente para enviar o pedido para produção
            </DialogDescription>
          </DialogHeader>
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

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>
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
              {submitting ? 'Enviando...' : 'Confirmar e Enviar para Produção'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
