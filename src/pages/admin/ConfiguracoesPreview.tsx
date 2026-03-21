import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Upload, RotateCcw } from 'lucide-react';
import edcKnife from '@/assets/edc-knife.svg';

interface ModeloBase {
  id: string;
  nome_modelo: string;
  imagem_modelo: string | null;
}

interface PreviewConfig {
  id?: string;
  modelo_id: string;
  lateral_x: number;
  lateral_y: number;
  lateral_font_size: number;
  lateral_font_family: string;
  lateral_rotation: number;
  lateral_letter_spacing: number;
  lateral_color: string;
  dorso_x: number;
  dorso_y: number;
  dorso_font_size: number;
  dorso_font_family: string;
  dorso_rotation: number;
  dorso_letter_spacing: number;
  dorso_color: string;
  logo_x: number;
  logo_y: number;
  logo_width: number;
  logo_height: number;
  viewbox_width: number;
  viewbox_height: number;
  imagem_preview: string | null;
}

const DEFAULTS: Omit<PreviewConfig, 'modelo_id'> = {
  lateral_x: 4500,
  lateral_y: 5200,
  lateral_font_size: 420,
  lateral_font_family: 'serif',
  lateral_rotation: -2,
  lateral_letter_spacing: 3,
  lateral_color: '#1a1a1a',
  dorso_x: 5000,
  dorso_y: 3600,
  dorso_font_size: 280,
  dorso_font_family: 'monospace',
  dorso_rotation: -1.5,
  dorso_letter_spacing: 5,
  dorso_color: '#2a2a2a',
  logo_x: 14150,
  logo_y: 3460,
  logo_width: 500,
  logo_height: 500,
  viewbox_width: 25000,
  viewbox_height: 10000,
  imagem_preview: null,
};

const FONT_OPTIONS = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans-serif' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'cursive', label: 'Cursive' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Courier New, monospace', label: 'Courier New' },
];

export default function ConfiguracoesPreview() {
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [config, setConfig] = useState<PreviewConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadModelos();
  }, []);

  useEffect(() => {
    if (modeloSelecionado) loadConfig(modeloSelecionado);
  }, [modeloSelecionado]);

  const loadModelos = async () => {
    const { data } = await supabase
      .from('modelos')
      .select('id, nome_modelo, imagem_modelo')
      .order('nome_modelo');
    if (data) {
      setModelos(data);
      if (data.length > 0) setModeloSelecionado(data[0].id);
    }
    setLoading(false);
  };

  const loadConfig = async (modeloId: string) => {
    const { data } = await supabase
      .from('preview_config')
      .select('*')
      .eq('modelo_id', modeloId)
      .maybeSingle();

    if (data) {
      setConfig(data as unknown as PreviewConfig);
    } else {
      setConfig({ ...DEFAULTS, modelo_id: modeloId });
    }
  };

  const handleChange = (field: keyof PreviewConfig, value: string | number) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const handleNumChange = (field: keyof PreviewConfig, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) handleChange(field, num);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const payload = { ...config };
      delete (payload as any).id;
      delete (payload as any).created_at;
      delete (payload as any).updated_at;

      if (config.id) {
        const { error } = await supabase
          .from('preview_config')
          .update(payload as any)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('preview_config')
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        if (data) setConfig(data as unknown as PreviewConfig);
      }
      toast.success('Configuração salva!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!config) return;
    setConfig({ ...DEFAULTS, modelo_id: config.modelo_id, id: config.id, imagem_preview: config.imagem_preview });
    toast.info('Valores restaurados para o padrão');
  };

  const handleUploadSvg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;
    if (!file.name.endsWith('.svg')) {
      toast.error('Apenas arquivos SVG são aceitos');
      return;
    }
    setUploading(true);
    try {
      const fileName = `preview-${config.modelo_id}-${Date.now()}.svg`;
      const { error: uploadError } = await supabase.storage
        .from('modelo-imagens')
        .upload(fileName, file, { contentType: 'image/svg+xml', upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('modelo-imagens').getPublicUrl(fileName);
      handleChange('imagem_preview', urlData.publicUrl);
      toast.success('SVG enviado! Salve para aplicar.');
    } catch (err: any) {
      toast.error(err.message || 'Erro no upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePreviewSvg = () => {
    if (!config) return;
    setConfig({ ...config, imagem_preview: null });
    toast.info('SVG do preview removido. Salve para aplicar.');
  };

  const modelo = modelos.find(m => m.id === modeloSelecionado);
  const svgUrl = config?.imagem_preview || modelo?.imagem_modelo || edcKnife;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Configurações do Preview</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
            <RotateCcw className="h-4 w-4" /> Padrão
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Model selector */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Modelo</Label>
        <Select value={modeloSelecionado} onValueChange={setModeloSelecionado}>
          <SelectTrigger className="h-10 max-w-sm">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {modelos.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.nome_modelo}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {config && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Live preview */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Pré-visualização</Label>
            <div className="relative bg-white rounded-lg border border-border p-4 overflow-hidden" style={{ minHeight: 200 }}>
              <img src={svgUrl} alt={modelo?.nome_modelo || 'Faca'} className="w-full h-auto block" crossOrigin="anonymous" />
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${config.viewbox_width} ${config.viewbox_height}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ padding: 'inherit' }}
              >
                <text
                  x={config.lateral_x}
                  y={config.lateral_y}
                  fill={config.lateral_color}
                  fontSize={config.lateral_font_size}
                  fontFamily={config.lateral_font_family}
                  letterSpacing={config.lateral_letter_spacing}
                  transform={`rotate(${config.lateral_rotation}, ${config.lateral_x}, ${config.lateral_y})`}
                >
                  Texto Lateral
                </text>
                <text
                  x={config.dorso_x}
                  y={config.dorso_y}
                  fill={config.dorso_color}
                  fontSize={config.dorso_font_size}
                  fontFamily={config.dorso_font_family}
                  letterSpacing={config.dorso_letter_spacing}
                  transform={`rotate(${config.dorso_rotation}, ${config.dorso_x}, ${config.dorso_y})`}
                >
                  Texto Dorso
                </text>
                <g transform={`translate(${config.logo_x}, ${config.logo_y})`}>
                  <rect
                    x="0" y="0"
                    width={config.logo_width} height={config.logo_height}
                    fill="none" stroke="#666" strokeWidth="20"
                    strokeDasharray="40 20" rx="30"
                  />
                  <text
                    x={config.logo_width / 2}
                    y={config.logo_height / 2}
                    fill="#666" fontSize="160"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    LOGO
                  </text>
                </g>
              </svg>
            </div>

            {/* SVG Upload */}
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label className="text-sm font-semibold">SVG do Preview</Label>
              <p className="text-xs text-muted-foreground">
                Envie um SVG exclusivo para o preview. O simulador continuará usando o SVG original.
              </p>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg"
                  onChange={handleUploadSvg}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-1"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload SVG
                </Button>
                {config.imagem_preview && (
                  <Button variant="ghost" size="sm" onClick={handleRemovePreviewSvg} className="text-destructive text-xs">
                    Remover
                  </Button>
                )}
              </div>
              {config.imagem_preview && (
                <p className="text-xs text-muted-foreground truncate">Usando: SVG personalizado</p>
              )}
              {!config.imagem_preview && (
                <p className="text-xs text-muted-foreground">Usando: SVG do modelo (simulador)</p>
              )}
            </div>
          </div>

          {/* Configuration fields */}
          <div className="space-y-4">
            {/* ViewBox */}
            <fieldset className="rounded-lg border border-border p-3 space-y-3">
              <legend className="text-sm font-semibold px-1">ViewBox</legend>
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Largura" value={config.viewbox_width} onChange={v => handleNumChange('viewbox_width', v)} />
                <NumField label="Altura" value={config.viewbox_height} onChange={v => handleNumChange('viewbox_height', v)} />
              </div>
            </fieldset>

            {/* Lateral */}
            <fieldset className="rounded-lg border border-border p-3 space-y-3">
              <legend className="text-sm font-semibold px-1">Gravação Lateral</legend>
              <div className="grid grid-cols-2 gap-3">
                <NumField label="X" value={config.lateral_x} onChange={v => handleNumChange('lateral_x', v)} />
                <NumField label="Y" value={config.lateral_y} onChange={v => handleNumChange('lateral_y', v)} />
                <NumField label="Tamanho" value={config.lateral_font_size} onChange={v => handleNumChange('lateral_font_size', v)} />
                <NumField label="Rotação" value={config.lateral_rotation} onChange={v => handleNumChange('lateral_rotation', v)} />
                <NumField label="Espaçamento" value={config.lateral_letter_spacing} onChange={v => handleNumChange('lateral_letter_spacing', v)} />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cor</Label>
                  <Input type="color" value={config.lateral_color} onChange={e => handleChange('lateral_color', e.target.value)} className="h-9 p-1" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fonte</Label>
                <Select value={config.lateral_font_family} onValueChange={v => handleChange('lateral_font_family', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>

            {/* Dorso */}
            <fieldset className="rounded-lg border border-border p-3 space-y-3">
              <legend className="text-sm font-semibold px-1">Gravação Dorso</legend>
              <div className="grid grid-cols-2 gap-3">
                <NumField label="X" value={config.dorso_x} onChange={v => handleNumChange('dorso_x', v)} />
                <NumField label="Y" value={config.dorso_y} onChange={v => handleNumChange('dorso_y', v)} />
                <NumField label="Tamanho" value={config.dorso_font_size} onChange={v => handleNumChange('dorso_font_size', v)} />
                <NumField label="Rotação" value={config.dorso_rotation} onChange={v => handleNumChange('dorso_rotation', v)} />
                <NumField label="Espaçamento" value={config.dorso_letter_spacing} onChange={v => handleNumChange('dorso_letter_spacing', v)} />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cor</Label>
                  <Input type="color" value={config.dorso_color} onChange={e => handleChange('dorso_color', e.target.value)} className="h-9 p-1" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fonte</Label>
                <Select value={config.dorso_font_family} onValueChange={v => handleChange('dorso_font_family', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>

            {/* Logo */}
            <fieldset className="rounded-lg border border-border p-3 space-y-3">
              <legend className="text-sm font-semibold px-1">Logo</legend>
              <div className="grid grid-cols-2 gap-3">
                <NumField label="X" value={config.logo_x} onChange={v => handleNumChange('logo_x', v)} />
                <NumField label="Y" value={config.logo_y} onChange={v => handleNumChange('logo_y', v)} />
                <NumField label="Largura" value={config.logo_width} onChange={v => handleNumChange('logo_width', v)} />
                <NumField label="Altura" value={config.logo_height} onChange={v => handleNumChange('logo_height', v)} />
              </div>
            </fieldset>
          </div>
        </div>
      )}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 text-sm"
        step="any"
      />
    </div>
  );
}
