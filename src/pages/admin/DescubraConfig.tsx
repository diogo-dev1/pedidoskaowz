import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AtributosRecomendacaoTab } from '@/components/admin/AtributosRecomendacaoTab';
import {
  carregarQuizConfig,
  salvarQuizConfig,
  quizConfigPadrao,
  type QuizPerguntaConfig,
} from '@/lib/publico';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Loader2, RotateCcw, Save } from 'lucide-react';

export default function DescubraConfig() {
  const [cfg, setCfg] = useState<QuizPerguntaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    carregarQuizConfig().then((c) => { setCfg(c); setLoading(false); });
  }, []);

  const patch = (id: string, campo: keyof QuizPerguntaConfig, valor: any) =>
    setCfg((p) => p.map((q) => (q.id === id ? { ...q, [campo]: valor } : q)));

  const patchOpcao = (id: string, valor: string, campo: 'titulo' | 'descricao' | 'ativo', v: any) =>
    setCfg((p) =>
      p.map((q) =>
        q.id === id ? { ...q, opcoes: q.opcoes.map((o) => (o.valor === valor ? { ...o, [campo]: v } : o)) } : q,
      ),
    );

  const mover = (index: number, delta: number) =>
    setCfg((p) => {
      const novo = [...p];
      const alvo = index + delta;
      if (alvo < 0 || alvo >= novo.length) return p;
      [novo[index], novo[alvo]] = [novo[alvo], novo[index]];
      return novo.map((q, i) => ({ ...q, ordem: i }));
    });

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarQuizConfig(cfg.map((q, i) => ({ ...q, ordem: i })));
      toast.success('Etapas do quiz atualizadas');
    } catch {
      toast.error('Erro ao salvar as etapas');
    }
    setSalvando(false);
  };

  const restaurar = () => { setCfg(quizConfigPadrao()); toast.info('Textos padrão restaurados — salve para aplicar'); };

  return (
      <div className="mx-auto max-w-6xl space-y-4 p-3 md:p-6">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Configurar Descubra</h1>
          <p className="text-sm text-muted-foreground">
            Personalize as etapas do quiz público e defina para quais casos de uso serve cada lâmina.
          </p>
        </div>

        <Tabs defaultValue="etapas">
          <TabsList>
            <TabsTrigger value="etapas">Etapas do quiz</TabsTrigger>
            <TabsTrigger value="laminas">Lâminas e casos de uso</TabsTrigger>
          </TabsList>

          <TabsContent value="etapas" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Textos, ordem e visibilidade são editáveis. A lógica de recomendação de cada opção é fixa.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={restaurar}>
                      <RotateCcw className="mr-1.5 h-4 w-4" /> Padrão
                    </Button>
                    <Button size="sm" onClick={salvar} disabled={salvando}>
                      {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                      Salvar
                    </Button>
                  </div>
                </div>

                {cfg.map((q, i) => {
                  const expandido = aberto === q.id;
                  return (
                    <Card key={q.id} className={q.ativo ? '' : 'opacity-60'}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <button type="button" onClick={() => mover(i, -1)} className="text-muted-foreground hover:text-foreground">
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => mover(i, 1)} className="text-muted-foreground hover:text-foreground">
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setAberto(expandido ? null : q.id)}
                          >
                            <p className="truncate text-sm font-medium">
                              {i + 1}. {q.titulo}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {q.opcoes.filter((o) => o.ativo).length} opções ativas
                            </p>
                          </button>
                          <Badge variant="secondary" className="hidden sm:inline-flex">{q.id}</Badge>
                          <Switch checked={q.ativo} onCheckedChange={(v) => patch(q.id, 'ativo', v)} />
                        </div>

                        {expandido && (
                          <div className="mt-4 space-y-4 border-t pt-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Título da pergunta</Label>
                                <Input value={q.titulo} onChange={(e) => patch(q.id, 'titulo', e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Texto de ajuda</Label>
                                <Input value={q.ajuda} onChange={(e) => patch(q.id, 'ajuda', e.target.value)} />
                              </div>
                            </div>

                            {q.id === 'desempate' ? (
                              <p className="text-xs text-muted-foreground">
                                As opções desta etapa são geradas automaticamente a partir das respostas anteriores.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <Label className="text-xs">Opções</Label>
                                {q.opcoes.map((o) => (
                                  <div key={o.valor} className="rounded-lg border p-2">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                      <Badge variant="outline" className="text-[10px]">{o.valor}</Badge>
                                      <Switch
                                        checked={o.ativo}
                                        onCheckedChange={(v) => patchOpcao(q.id, o.valor, 'ativo', v)}
                                      />
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <Input
                                        value={o.titulo}
                                        placeholder="Título"
                                        onChange={(e) => patchOpcao(q.id, o.valor, 'titulo', e.target.value)}
                                      />
                                      <Input
                                        value={o.descricao}
                                        placeholder="Descrição"
                                        onChange={(e) => patchOpcao(q.id, o.valor, 'descricao', e.target.value)}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                <div className="flex justify-end">
                  <Button onClick={salvar} disabled={salvando}>
                    {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                    Salvar etapas
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="laminas" className="mt-4">
            <AtributosRecomendacaoTab />
          </TabsContent>
        </Tabs>
      </div>
  );
}
