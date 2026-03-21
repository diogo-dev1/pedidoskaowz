import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import edcKnife from '@/assets/edc-knife.svg';

interface ModeloBase {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
}

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

export default function Preview() {
  const [searchParams] = useSearchParams();
  const previewRef = useRef<HTMLDivElement>(null);

  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);

  // Engraving options
  const [lateralAtivo, setLateralAtivo] = useState(false);
  const [dorsoAtivo, setDorsoAtivo] = useState(false);
  const [logoAtivo, setLogoAtivo] = useState(false);
  const [textoDorso, setTextoDorso] = useState('');
  const [textoLateral, setTextoLateral] = useState('');

  // Load URL params
  useEffect(() => {
    const pLateral = searchParams.get('lateral');
    const pDorso = searchParams.get('dorso');
    const pLogo = searchParams.get('logo');
    const pTexto = searchParams.get('texto');

    if (pLateral === '1' || pLateral === 'true') setLateralAtivo(true);
    if (pDorso === '1' || pDorso === 'true') setDorsoAtivo(true);
    if (pLogo === '1' || pLogo === 'true') setLogoAtivo(true);
    if (pTexto) {
      const clean = pTexto.replace(EMOJI_REGEX, '');
      setTextoDorso(clean.slice(0, 50));
    }
  }, [searchParams]);

  useEffect(() => {
    loadModelos();
  }, []);

  const loadModelos = async () => {
    const { data } = await supabase
      .from('modelos')
      .select('id, nome_modelo, preco_base, imagem_modelo')
      .order('nome_modelo');
    if (data) {
      setModelos(data);
      if (data.length > 0) setModeloSelecionado(data[0].id);
    }
    setLoading(false);
  };

  const modelo = modelos.find(m => m.id === modeloSelecionado);

  const precoAdicional =
    (lateralAtivo ? 15 : 0) +
    (dorsoAtivo ? 15 : 0) +
    (logoAtivo ? 75 : 0);

  const handleTextoDorso = (value: string) => {
    const clean = value.replace(EMOJI_REGEX, '');
    if (clean.length <= 50) setTextoDorso(clean);
  };

  const handleTextoLateral = (value: string) => {
    const clean = value.replace(EMOJI_REGEX, '');
    if (clean.length <= 20) setTextoLateral(clean);
  };

  const gerarPDF = async () => {
    if (!previewRef.current) return;
    setGerando(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('KAOWZ FACAS - Preview de Personalização', 14, 15);

      // Image
      const imgW = pageW - 28;
      const imgH = (canvas.height / canvas.width) * imgW;
      const maxImgH = pageH - 60;
      const finalH = Math.min(imgH, maxImgH);
      pdf.addImage(imgData, 'PNG', 14, 25, imgW, finalH);

      // Info below image
      let y = 25 + finalH + 10;
      if (y > pageH - 30) {
        pdf.addPage();
        y = 15;
      }
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      if (modelo) pdf.text(`Modelo: ${modelo.nome_modelo}`, 14, y);
      y += 6;
      const opcoes: string[] = [];
      if (lateralAtivo) opcoes.push(`Lateral: "${textoLateral}"`);
      if (dorsoAtivo) opcoes.push(`Dorso: "${textoDorso}"`);
      if (logoAtivo) opcoes.push('Logo');
      if (opcoes.length > 0) {
        pdf.text(`Gravações: ${opcoes.join(' | ')}`, 14, y);
        y += 6;
      }
      pdf.text(`Valor adicional: R$ ${precoAdicional.toFixed(2)}`, 14, y);

      pdf.save(`preview-${modelo?.nome_modelo || 'faca'}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setGerando(false);
    }
  };

  const enviarWhatsApp = () => {
    const linhas: string[] = ['*Preview de Personalização - KAOWZ*\n'];
    if (modelo) linhas.push(`Modelo: ${modelo.nome_modelo}`);
    if (lateralAtivo) linhas.push(`Gravação Lateral: "${textoLateral}"`);
    if (dorsoAtivo) linhas.push(`Gravação Dorso: "${textoDorso}"`);
    if (logoAtivo) linhas.push('Gravação Logo: Sim');
    linhas.push(`\nValor adicional: R$ ${precoAdicional.toFixed(2)}`);
    linhas.push('\nGostaria de aprovar esta personalização.');

    const msg = encodeURIComponent(linhas.join('\n'));
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const svgUrl = modelo?.imagem_modelo || edcKnife;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Preview - Personalização</h1>
      </div>

      <div className="max-w-5xl mx-auto p-4 flex flex-col lg:flex-row gap-6">
        {/* Preview Area */}
        <div className="flex-1">
          <div
            ref={previewRef}
            className="relative bg-white rounded-xl border border-border p-6 overflow-hidden"
            style={{ minHeight: 280 }}
          >
            {/* SVG Knife */}
            <img
              src={svgUrl}
              alt={modelo?.nome_modelo || 'Faca'}
              className="w-full h-auto block"
              crossOrigin="anonymous"
            />

            {/* SVG overlay — same viewBox as the knife for pixel-perfect positioning */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 25000 10000"
              preserveAspectRatio="xMidYMid meet"
              style={{ padding: 'inherit' }}
            >
              {/* Lateral — flat side of the blade */}
              {lateralAtivo && textoLateral && (
                <text
                  x="4500"
                  y="5200"
                  fill="#1a1a1a"
                  fontSize="420"
                  fontFamily="serif"
                  letterSpacing="3"
                  transform="rotate(-2, 4500, 5200)"
                >
                  {textoLateral}
                </text>
              )}

              {/* Dorso — spine (top edge) of the blade */}
              {dorsoAtivo && textoDorso && (
                <text
                  x="5000"
                  y="3600"
                  fill="#2a2a2a"
                  fontSize="280"
                  fontFamily="monospace"
                  letterSpacing="5"
                  transform="rotate(-1.5, 5000, 3600)"
                >
                  {textoDorso}
                </text>
              )}

              {/* Logo — ricasso area where the maker's mark goes */}
              {logoAtivo && (
                <g transform="translate(14150, 3460)">
                  <rect
                    x="0" y="0" width="500" height="500"
                    fill="none" stroke="#666" strokeWidth="20"
                    strokeDasharray="40 20" rx="30"
                  />
                  <text
                    x="250" y="280"
                    fill="#666" fontSize="160"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    LOGO
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Price summary */}
          {precoAdicional > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-accent/30 border border-accent text-center">
              <span className="text-sm text-foreground">
                A escolha irá adicionar{' '}
                <strong className="text-primary">R$ {precoAdicional.toFixed(2)}</strong>{' '}
                ao valor final.
              </span>
            </div>
          )}
        </div>

        {/* Configuration Area */}
        <div className="lg:w-96 space-y-5">
          {/* Model selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Modelo da Lâmina</Label>
            <Select value={modeloSelecionado} onValueChange={setModeloSelecionado}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {modelos.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome_modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Engraving options */}
          <div className="space-y-4 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Personalização a Laser</h3>

            {/* Lateral */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="lateral"
                  checked={lateralAtivo}
                  onCheckedChange={(v) => setLateralAtivo(v === true)}
                />
                <Label htmlFor="lateral" className="text-sm cursor-pointer">
                  Lateral <span className="text-muted-foreground">(+ R$ 15,00)</span>
                </Label>
              </div>
              {lateralAtivo && (
                <div className="pl-7 space-y-1">
                  <Input
                    value={textoLateral}
                    onChange={(e) => handleTextoLateral(e.target.value)}
                    placeholder="Texto na lateral (máx. 20)"
                    maxLength={20}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground text-right">{textoLateral.length}/20</p>
                </div>
              )}
            </div>

            {/* Dorso */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="dorso"
                  checked={dorsoAtivo}
                  onCheckedChange={(v) => setDorsoAtivo(v === true)}
                />
                <Label htmlFor="dorso" className="text-sm cursor-pointer">
                  Dorso <span className="text-muted-foreground">(+ R$ 15,00)</span>
                </Label>
              </div>
              {dorsoAtivo && (
                <div className="pl-7 space-y-1">
                  <Input
                    value={textoDorso}
                    onChange={(e) => handleTextoDorso(e.target.value)}
                    placeholder="Texto no dorso (máx. 50)"
                    maxLength={50}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground text-right">{textoDorso.length}/50</p>
                </div>
              )}
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="logo"
                  checked={logoAtivo}
                  onCheckedChange={(v) => setLogoAtivo(v === true)}
                />
                <Label htmlFor="logo" className="text-sm cursor-pointer">
                  Logo <span className="text-muted-foreground">(+ R$ 75,00)</span>
                </Label>
              </div>
              {logoAtivo && (
                <p className="pl-7 text-xs text-muted-foreground">
                  Envie o arquivo do logo em preto e branco via WhatsApp ao solicitar aprovação.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={gerarPDF}
              disabled={gerando}
              className="h-12 text-base gap-2"
            >
              {gerando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              {gerando ? 'Gerando...' : 'Gerar previsão em PDF'}
            </Button>

            <Button
              onClick={enviarWhatsApp}
              variant="outline"
              className="h-12 text-base gap-2 border-primary/60 text-primary hover:bg-accent"
            >
              <MessageCircle className="h-5 w-5" />
              Enviar para aprovação
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
