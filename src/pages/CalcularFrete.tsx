import { useState } from 'react';
import { Truck, Loader2, AlertCircle, Package as PackageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Servico {
  codigo: string;
  nome: string;
  valor: string;
  prazoEntrega: string;
  msgErro: string;
  erro: string;
}

const maskCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export default function CalcularFrete() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<Servico[] | null>(null);

  const [form, setForm] = useState({
    cepOrigem: '',
    cepDestino: '',
    peso: '1',
    comprimento: '20',
    largura: '15',
    altura: '10',
    formato: '1',
    valorDeclarado: '',
    avisoRecebimento: 'N',
  });

  const upd = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleCalcular = async () => {
    if (form.cepOrigem.replace(/\D/g, '').length !== 8 || form.cepDestino.replace(/\D/g, '').length !== 8) {
      toast({ title: 'CEPs inválidos', description: 'Informe CEPs com 8 dígitos.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResultados(null);
    try {
      const { data, error } = await supabase.functions.invoke('calcular-frete', {
        body: {
          cepOrigem: form.cepOrigem,
          cepDestino: form.cepDestino,
          peso: form.peso,
          comprimento: form.comprimento,
          largura: form.largura,
          altura: form.altura,
          formato: form.formato,
          valorDeclarado: form.valorDeclarado || '0',
          avisoRecebimento: form.avisoRecebimento,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResultados(data?.servicos || []);
    } catch (e) {
      toast({
        title: 'Erro ao calcular frete',
        description: e instanceof Error ? e.message : 'Falha desconhecida.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBRL = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    if (isNaN(n) || n === 0) return '—';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <Truck className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calcular Frete</h1>
          <p className="text-sm text-muted-foreground">Cotação SEDEX e PAC via Correios</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do envio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cepOrigem">CEP de origem</Label>
              <Input
                id="cepOrigem"
                placeholder="00000-000"
                value={form.cepOrigem}
                onChange={(e) => upd('cepOrigem', maskCep(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cepDestino">CEP de destino</Label>
              <Input
                id="cepDestino"
                placeholder="00000-000"
                value={form.cepDestino}
                onChange={(e) => upd('cepDestino', maskCep(e.target.value))}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input id="peso" type="number" step="0.1" min="0" value={form.peso} onChange={(e) => upd('peso', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comprimento">Comprimento (cm)</Label>
              <Input id="comprimento" type="number" min="0" value={form.comprimento} onChange={(e) => upd('comprimento', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="largura">Largura (cm)</Label>
              <Input id="largura" type="number" min="0" value={form.largura} onChange={(e) => upd('largura', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="altura">Altura (cm)</Label>
              <Input id="altura" type="number" min="0" value={form.altura} onChange={(e) => upd('altura', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Formato do pacote</Label>
              <Select value={form.formato} onValueChange={(v) => upd('formato', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Caixa / Pacote</SelectItem>
                  <SelectItem value="2">Rolo / Prisma</SelectItem>
                  <SelectItem value="3">Envelope</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valorDeclarado">Valor declarado (R$, opcional)</Label>
              <Input
                id="valorDeclarado"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.valorDeclarado}
                onChange={(e) => upd('valorDeclarado', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Aviso de recebimento</Label>
              <Select value={form.avisoRecebimento} onValueChange={(v) => upd('avisoRecebimento', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">Não</SelectItem>
                  <SelectItem value="S">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleCalcular} disabled={loading} className="w-full md:w-auto">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculando...</> : <><Truck className="h-4 w-4 mr-2" /> Calcular Frete</>}
          </Button>
        </CardContent>
      </Card>

      {resultados && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resultados.map((s) => {
            const hasError = (s.erro && s.erro !== '0') || !!s.msgErro;
            return (
              <Card key={s.codigo} className={hasError ? 'border-destructive/40' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PackageIcon className="h-5 w-5 text-accent" />
                    {s.nome}
                    <span className="text-xs font-normal text-muted-foreground ml-auto">#{s.codigo}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasError ? (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{s.msgErro || `Erro ${s.erro}`}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Preço</p>
                        <p className="text-2xl font-semibold text-foreground">{formatBRL(s.valor)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Prazo de entrega</p>
                        <p className="text-base font-medium">{s.prazoEntrega} dia{s.prazoEntrega === '1' ? '' : 's'} útil{s.prazoEntrega === '1' ? '' : 'eis'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
