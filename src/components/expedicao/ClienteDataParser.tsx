import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardPaste, Check } from 'lucide-react';
import { parseClientData, type ClientData } from '@/lib/parseClientData';

interface Props {
  onParsed: (data: Partial<ClientData>) => void;
}

export function ClienteDataParser({ onParsed }: Props) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<Partial<ClientData> | null>(null);

  const handleParse = () => {
    const result = parseClientData(raw);
    setParsed(result);
  };

  const handleConfirm = () => {
    if (parsed) {
      onParsed(parsed);
      setRaw('');
      setParsed(null);
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <ClipboardPaste className="h-3.5 w-3.5" />
        Colar Dados do Cliente
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
      <p className="text-xs text-muted-foreground">
        Cole o texto formatado (1. NOME: ... 2. CPF: ... etc.)
      </p>
      <Textarea
        rows={6}
        value={raw}
        onChange={(e) => { setRaw(e.target.value); setParsed(null); }}
        placeholder={"1. NOME: José Willian\n2. CPF: 076.061.239-00\n3. CEP: 86041-220\n..."}
        className="text-xs font-mono"
      />

      {parsed && Object.keys(parsed).length > 0 && (
        <div className="text-xs space-y-0.5 p-2 rounded bg-green-500/10 border border-green-500/20">
          {Object.entries(parsed).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-muted-foreground w-28 flex-shrink-0">{k}:</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {!parsed ? (
          <Button size="sm" onClick={handleParse} disabled={!raw.trim()}>Extrair Dados</Button>
        ) : (
          <Button size="sm" onClick={handleConfirm} className="gap-1">
            <Check className="h-3.5 w-3.5" /> Confirmar e Salvar
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setRaw(''); setParsed(null); }}>Cancelar</Button>
      </div>
    </div>
  );
}
