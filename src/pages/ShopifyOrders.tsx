import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';

export default function ShopifyOrders() {
  const hoje = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  const sincronizar = async () => {
    setLoading(true);
    setResultado(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-orders', {
        body: { data_inicio: dataInicio, data_fim: dataFim },
      });

      if (error) {
        const ctx = (error as any).context;
        let detalhe = error.message;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            detalhe = body?.erro || body?.error || JSON.stringify(body);
          } catch (_) {}
        }
        toast.error(detalhe);
        setResultado('Erro: ' + detalhe);
        return;
      }

      if (data?.sucesso) {
        toast.success(data.mensagem);
        setResultado(data.mensagem);
      } else {
        toast.error(data?.erro || 'Erro desconhecido');
        setResultado(data?.erro || 'Erro');
      }
    } catch (err: any) {
      toast.error('Erro ao sincronizar: ' + (err.message || err));
      setResultado('Erro: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Pedidos Shopify → Vendas Diário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Puxa os pedidos da Shopify e lança na planilha de Relatório de Vendas.
          </p>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium">Data início</label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Data fim</label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>

          <Button onClick={sincronizar} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Sincronizar Pedidos
              </>
            )}
          </Button>

          {resultado && (
            <p className="text-sm text-center p-3 bg-muted rounded-md">{resultado}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
