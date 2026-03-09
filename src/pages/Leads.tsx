import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  TrendingUp,
  Copy,
  Settings,
} from "lucide-react";

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  situacao: string;
  origem: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

interface Situacao {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
}

const CORES_DISPONIVEIS = [
  { value: "blue", label: "Azul", class: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "yellow", label: "Amarelo", class: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "purple", label: "Roxo", class: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "green", label: "Verde", class: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "red", label: "Vermelho", class: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "orange", label: "Laranja", class: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "pink", label: "Rosa", class: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { value: "cyan", label: "Ciano", class: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
];

const DEFAULT_SITUACOES = [
  { nome: "Novo", cor: "blue", ordem: 0 },
  { nome: "Em Contato", cor: "yellow", ordem: 1 },
  { nome: "Negociando", cor: "purple", ordem: 2 },
  { nome: "Fechado", cor: "green", ordem: 3 },
  { nome: "Perdido", cor: "red", ordem: 4 },
];

const ORIGENS = [
  { value: "convencao", label: "Convenção" },
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [situacoes, setSituacoes] = useState<Situacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSituacao, setFilterSituacao] = useState<string>("todos");
  const [filterOrigem, setFilterOrigem] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // Inline editing state
  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [editingObsValue, setEditingObsValue] = useState("");
  const obsTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Form state
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [situacao, setSituacao] = useState("");
  const [origem, setOrigem] = useState("");
  const [observacao, setObservacao] = useState("");

  // Situacao form state
  const [novaSituacaoNome, setNovaSituacaoNome] = useState("");
  const [novaSituacaoCor, setNovaSituacaoCor] = useState("blue");
  const [editingSituacao, setEditingSituacao] = useState<Situacao | null>(null);

  useEffect(() => {
    if (user) {
      fetchSituacoes();
      fetchLeads();
    }
  }, [user]);

  useEffect(() => {
    if (editingObsId && obsTextareaRef.current) {
      obsTextareaRef.current.focus();
    }
  }, [editingObsId]);

  const fetchSituacoes = async () => {
    try {
      const { data, error } = await supabase
        .from("situacoes_leads")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      
      // If no custom situacoes, create defaults
      if (!data || data.length === 0) {
        await createDefaultSituacoes();
      } else {
        setSituacoes(data);
        if (!situacao && data.length > 0) {
          setSituacao(data[0].nome);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar situações:", error);
    }
  };

  const createDefaultSituacoes = async () => {
    try {
      const inserts = DEFAULT_SITUACOES.map((s) => ({
        user_id: user?.id,
        nome: s.nome,
        cor: s.cor,
        ordem: s.ordem,
      }));

      const { data, error } = await supabase
        .from("situacoes_leads")
        .insert(inserts)
        .select();

      if (error) throw error;
      setSituacoes(data || []);
      if (data && data.length > 0) {
        setSituacao(data[0].nome);
      }
    } catch (error) {
      console.error("Erro ao criar situações padrão:", error);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNome("");
    setTelefone("");
    setSituacao(situacoes.length > 0 ? situacoes[0].nome : "");
    setOrigem("");
    setObservacao("");
    setEditingLead(null);
  };

  const openEditDialog = (lead: Lead) => {
    setEditingLead(lead);
    setNome(lead.nome);
    setTelefone(lead.telefone);
    setSituacao(lead.situacao);
    setOrigem(lead.origem || "");
    setObservacao(lead.observacao || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!telefone.trim() || telefone.trim().length < 4) {
      toast.error("Informe pelo menos 4 dígitos para referência");
      return;
    }

    const situacaoToUse = situacao || (situacoes.length > 0 ? situacoes[0].nome : "Novo");

    try {
      if (editingLead) {
        const { error } = await supabase
          .from("leads")
          .update({
            nome: nome.trim() || "Sem nome",
            telefone: telefone.trim(),
            situacao: situacaoToUse,
            origem: origem || null,
            observacao: observacao.trim() || null,
          })
          .eq("id", editingLead.id);

        if (error) throw error;
        toast.success("Lead atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("leads").insert({
          user_id: user?.id,
          nome: nome.trim() || "Sem nome",
          telefone: telefone.trim(),
          situacao: situacaoToUse,
          origem: origem || null,
          observacao: observacao.trim() || null,
        });

        if (error) throw error;
        toast.success("Lead cadastrado com sucesso!");
      }

      resetForm();
      setIsDialogOpen(false);
      fetchLeads();
    } catch (error) {
      console.error("Erro ao salvar lead:", error);
      toast.error("Erro ao salvar lead");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;

    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lead excluído com sucesso!");
      fetchLeads();
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
      toast.error("Erro ao excluir lead");
    }
  };

  const updateLeadSituacao = async (id: string, novaSituacao: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ situacao: novaSituacao })
        .eq("id", id);

      if (error) throw error;
      toast.success("Situação atualizada!");
      fetchLeads();
    } catch (error) {
      console.error("Erro ao atualizar situação:", error);
      toast.error("Erro ao atualizar situação");
    }
  };

  const handleObsClick = (lead: Lead) => {
    setEditingObsId(lead.id);
    setEditingObsValue(lead.observacao || "");
  };

  const handleObsBlur = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    const newValue = editingObsValue.trim() || null;
    
    if (lead && lead.observacao !== newValue) {
      try {
        const { error } = await supabase
          .from("leads")
          .update({ observacao: newValue })
          .eq("id", leadId);

        if (error) throw error;
        
        setLeads(prev => prev.map(l => 
          l.id === leadId ? { ...l, observacao: newValue } : l
        ));
        toast.success("Observação salva!");
      } catch (error) {
        console.error("Erro ao salvar observação:", error);
        toast.error("Erro ao salvar observação");
      }
    }
    
    setEditingObsId(null);
    setEditingObsValue("");
  };

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Telefone copiado!");
    } catch {
      toast.error("Erro ao copiar telefone");
    }
  };

  // Situacao management
  const handleAddSituacao = async () => {
    if (!novaSituacaoNome.trim()) {
      toast.error("Nome da situação é obrigatório");
      return;
    }

    try {
      const maxOrdem = situacoes.reduce((max, s) => Math.max(max, s.ordem), 0);
      
      const { error } = await supabase.from("situacoes_leads").insert({
        user_id: user?.id,
        nome: novaSituacaoNome.trim(),
        cor: novaSituacaoCor,
        ordem: maxOrdem + 1,
      });

      if (error) throw error;
      toast.success("Situação criada!");
      setNovaSituacaoNome("");
      setNovaSituacaoCor("blue");
      fetchSituacoes();
    } catch (error) {
      console.error("Erro ao criar situação:", error);
      toast.error("Erro ao criar situação");
    }
  };

  const handleUpdateSituacao = async () => {
    if (!editingSituacao || !novaSituacaoNome.trim()) return;

    try {
      const { error } = await supabase
        .from("situacoes_leads")
        .update({
          nome: novaSituacaoNome.trim(),
          cor: novaSituacaoCor,
        })
        .eq("id", editingSituacao.id);

      if (error) throw error;
      toast.success("Situação atualizada!");
      setEditingSituacao(null);
      setNovaSituacaoNome("");
      setNovaSituacaoCor("blue");
      fetchSituacoes();
    } catch (error) {
      console.error("Erro ao atualizar situação:", error);
      toast.error("Erro ao atualizar situação");
    }
  };

  const handleDeleteSituacao = async (id: string) => {
    const situacaoToDelete = situacoes.find(s => s.id === id);
    const leadsUsing = leads.filter(l => l.situacao === situacaoToDelete?.nome);
    
    if (leadsUsing.length > 0) {
      toast.error(`Esta situação está sendo usada por ${leadsUsing.length} lead(s)`);
      return;
    }

    if (!confirm("Tem certeza que deseja excluir esta situação?")) return;

    try {
      const { error } = await supabase.from("situacoes_leads").delete().eq("id", id);
      if (error) throw error;
      toast.success("Situação excluída!");
      fetchSituacoes();
    } catch (error) {
      console.error("Erro ao excluir situação:", error);
      toast.error("Erro ao excluir situação");
    }
  };

  const startEditSituacao = (s: Situacao) => {
    setEditingSituacao(s);
    setNovaSituacaoNome(s.nome);
    setNovaSituacaoCor(s.cor);
  };

  const cancelEditSituacao = () => {
    setEditingSituacao(null);
    setNovaSituacaoNome("");
    setNovaSituacaoCor("blue");
  };

  const getSituacaoStyle = (situacaoNome: string) => {
    const sit = situacoes.find((s) => s.nome === situacaoNome);
    if (!sit) return "bg-muted text-muted-foreground";
    const cor = CORES_DISPONIVEIS.find(c => c.value === sit.cor);
    return cor?.class || "bg-muted text-muted-foreground";
  };

  const getOrigemLabel = (origem: string | null) => {
    if (!origem) return "-";
    return ORIGENS.find((o) => o.value === origem)?.label || origem;
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone.includes(searchTerm);
    const matchesSituacao = filterSituacao === "todos" || lead.situacao === filterSituacao;
    const matchesOrigem = filterOrigem === "todos" || lead.origem === filterOrigem;
    return matchesSearch && matchesSituacao && matchesOrigem;
  });

  const stats = {
    total: leads.length,
    novos: leads.filter((l) => situacoes.find(s => s.nome === l.situacao)?.ordem === 0).length,
    emContato: leads.filter((l) => {
      const sit = situacoes.find(s => s.nome === l.situacao);
      return sit && sit.ordem > 0 && sit.ordem < situacoes.length - 1;
    }).length,
    fechados: leads.filter((l) => {
      const sit = situacoes.find(s => s.nome === l.situacao);
      return sit && sit.cor === "green";
    }).length,
  };

  // Métricas simples
  const metricas = (() => {
    const total = leads.length;
    const porSituacao = situacoes.map(s => ({
      ...s,
      count: leads.filter(l => l.situacao === s.nome).length,
    }));
    const fechados = porSituacao.filter(s => s.cor === 'green').reduce((sum, s) => sum + s.count, 0);
    const perdidos = porSituacao.filter(s => s.cor === 'red').reduce((sum, s) => sum + s.count, 0);
    const frios = porSituacao.filter(s => s.ordem === 0).reduce((sum, s) => sum + s.count, 0);
    const taxaConversao = total > 0 ? (fechados / total) * 100 : 0;
    return { total, porSituacao, fechados, perdidos, frios, taxaConversao };
  })();

  const formatPhone = (phone: string) => {
    if (phone.length <= 4) return phone;
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-20 px-3 py-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Leads</h1>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button size="sm" className="h-8 gap-1" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Novo
          </Button>
        </div>
      </div>

      {/* Situation filter badges + metrics inline */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        <Badge
          variant={filterSituacao === 'todos' ? 'default' : 'outline'}
          className="text-[10px] px-2 py-0.5 cursor-pointer flex-shrink-0"
          onClick={() => setFilterSituacao('todos')}
        >
          Todos {leads.length}
        </Badge>
        {metricas.porSituacao.map(s => {
          const corObj = CORES_DISPONIVEIS.find(c => c.value === s.cor);
          return (
            <Badge
              key={s.id}
              variant="outline"
              className={`${corObj?.class || ''} border text-[10px] px-2 py-0.5 whitespace-nowrap flex-shrink-0 cursor-pointer ${filterSituacao === s.nome ? 'ring-1 ring-primary' : ''}`}
              onClick={() => setFilterSituacao(filterSituacao === s.nome ? 'todos' : s.nome)}
            >
              {s.nome} {s.count}
            </Badge>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar nome ou referência..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Conversion line */}
      {leads.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {metricas.fechados} fechados ({metricas.taxaConversao.toFixed(0)}%) · {metricas.perdidos} perdidos · {metricas.frios} frios
        </p>
      )}

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {leads.length === 0 ? "Nenhum lead ainda" : "Nenhum resultado"}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="group flex items-center gap-2 p-2.5 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
            >
              {/* Left: info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{lead.nome || "Sem nome"}</span>
                  <Badge
                    variant="outline"
                    className={`${getSituacaoStyle(lead.situacao)} border text-[9px] px-1 py-0 leading-tight`}
                  >
                    {lead.situacao}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground font-mono">{formatPhone(lead.telefone)}</span>
                  {lead.origem && (
                    <span className="text-[10px] text-muted-foreground">{getOrigemLabel(lead.origem)}</span>
                  )}
                </div>
                {/* Inline obs */}
                {editingObsId === lead.id ? (
                  <Textarea
                    ref={obsTextareaRef}
                    value={editingObsValue}
                    onChange={(e) => setEditingObsValue(e.target.value)}
                    onBlur={() => handleObsBlur(lead.id)}
                    placeholder="Observação..."
                    className="text-xs mt-1 min-h-[40px] bg-muted/30"
                    rows={1}
                  />
                ) : lead.observacao ? (
                  <p
                    onClick={() => handleObsClick(lead)}
                    className="text-[10px] text-muted-foreground/70 mt-0.5 cursor-pointer truncate"
                  >
                    {lead.observacao}
                  </p>
                ) : (
                  <p
                    onClick={() => handleObsClick(lead)}
                    className="text-[10px] text-muted-foreground/30 mt-0.5 cursor-pointer italic"
                  >
                    + obs
                  </p>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => copyPhone(lead.telefone)}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
                <Select
                  value={lead.situacao}
                  onValueChange={(value) => updateLeadSituacao(lead.id, value)}
                >
                  <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent">
                    <TrendingUp className="h-3 w-3" />
                  </SelectTrigger>
                  <SelectContent>
                    {situacoes.map((s) => (
                      <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors">
                      <MoreVertical className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(lead)}>
                      <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(lead.id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Situações</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nova situação"
                value={novaSituacaoNome}
                onChange={(e) => setNovaSituacaoNome(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
              <Select value={novaSituacaoCor} onValueChange={setNovaSituacaoCor}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CORES_DISPONIVEIS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className={`w-3 h-3 rounded-full ${c.class.split(" ")[0].replace("/20", "")}`} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingSituacao ? (
                <>
                  <Button size="sm" className="h-8 text-xs" onClick={handleUpdateSituacao}>Ok</Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={cancelEditSituacao}>✕</Button>
                </>
              ) : (
                <Button size="sm" className="h-8 text-xs" onClick={handleAddSituacao}>+</Button>
              )}
            </div>
            {situacoes.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1">
                <Badge variant="outline" className={`${getSituacaoStyle(s.nome)} border text-[10px]`}>{s.nome}</Badge>
                <div className="flex gap-0.5">
                  <button className="p-1 rounded hover:bg-muted" onClick={() => startEditSituacao(s)}><Edit className="h-3 w-3" /></button>
                  <button className="p-1 rounded hover:bg-muted text-destructive" onClick={() => handleDeleteSituacao(s.id)}><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* New/Edit Lead Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingLead ? "Editar" : "Novo Lead"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome (opcional)" value={nome} onChange={(e) => setNome(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Referência — 4 últimos dígitos *" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="h-8 text-xs" maxLength={20} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={situacao} onValueChange={setSituacao}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Situação" /></SelectTrigger>
                <SelectContent>
                  {situacoes.map((s) => (<SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Observação..." value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} className="text-xs" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { resetForm(); setIsDialogOpen(false); }}>Cancelar</Button>
              <Button size="sm" className="flex-1" onClick={handleSubmit}>{editingLead ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
