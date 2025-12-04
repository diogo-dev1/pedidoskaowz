import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Info } from 'lucide-react';

const ETAPAS = [
  { key: 'modelo', label: 'Modelo' },
  { key: 'aco', label: 'Aço' },
  { key: 'acabamento', label: 'Acabamento' },
  { key: 'empunhadura', label: 'Empunhadura' },
  { key: 'bainha', label: 'Bainha' },
  { key: 'laser', label: 'Personalização à Laser' },
];

interface InfoEtapa {
  id: string;
  etapa_key: string;
  titulo: string;
  conteudo: string | null;
  imagem_url: string | null;
}

export default function GerenciarInformativos() {
  const queryClient = useQueryClient();
  const [editingData, setEditingData] = useState<Record<string, Partial<InfoEtapa>>>({});

  const { data: infos, isLoading } = useQuery({
    queryKey: ['info-etapas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('info_etapas_customizacao')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data as InfoEtapa[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InfoEtapa> }) => {
      const { error } = await supabase
        .from('info_etapas_customizacao')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['info-etapas'] });
      toast.success('Informações salvas com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar informações');
    },
  });

  const getInfoForEtapa = (etapaKey: string) => {
    return infos?.find((info) => info.etapa_key === etapaKey);
  };

  const getEditingValue = (etapaKey: string, field: keyof InfoEtapa) => {
    const info = getInfoForEtapa(etapaKey);
    const editing = editingData[etapaKey];
    if (editing && field in editing) {
      return editing[field] ?? '';
    }
    return info?.[field] ?? '';
  };

  const handleChange = (etapaKey: string, field: keyof InfoEtapa, value: string) => {
    setEditingData((prev) => ({
      ...prev,
      [etapaKey]: {
        ...prev[etapaKey],
        [field]: value,
      },
    }));
  };

  const handleSave = (etapaKey: string) => {
    const info = getInfoForEtapa(etapaKey);
    const updates = editingData[etapaKey];
    if (!info || !updates) return;

    updateMutation.mutate({ id: info.id, updates });
    setEditingData((prev) => {
      const newData = { ...prev };
      delete newData[etapaKey];
      return newData;
    });
  };

  const hasChanges = (etapaKey: string) => {
    return !!editingData[etapaKey] && Object.keys(editingData[etapaKey]).length > 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Info className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Informativos</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        Configure o conteúdo exibido nos modais "Saiba mais" de cada etapa de customização.
      </p>

      <div className="grid gap-4">
        {ETAPAS.map((etapa) => (
          <Card key={etapa.key} className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{etapa.label}</span>
                {hasChanges(etapa.key) && (
                  <Button
                    size="sm"
                    onClick={() => handleSave(etapa.key)}
                    disabled={updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Título
                </label>
                <Input
                  value={getEditingValue(etapa.key, 'titulo') as string}
                  onChange={(e) => handleChange(etapa.key, 'titulo', e.target.value)}
                  placeholder="Título do informativo"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Conteúdo
                </label>
                <Textarea
                  value={getEditingValue(etapa.key, 'conteudo') as string}
                  onChange={(e) => handleChange(etapa.key, 'conteudo', e.target.value)}
                  placeholder="Texto explicativo sobre esta etapa..."
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  URL da Imagem (opcional)
                </label>
                <Input
                  value={getEditingValue(etapa.key, 'imagem_url') as string}
                  onChange={(e) => handleChange(etapa.key, 'imagem_url', e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
                {getEditingValue(etapa.key, 'imagem_url') && (
                  <div className="mt-2">
                    <img
                      src={getEditingValue(etapa.key, 'imagem_url') as string}
                      alt="Preview"
                      className="max-h-32 rounded-md object-contain"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
