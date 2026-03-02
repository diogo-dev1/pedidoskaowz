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
  Filter,
  MoreVertical,
  Phone,
  Calendar,
  MapPin,
  Edit,
  Trash2,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Copy,
  Settings,
  X,
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
    if (!telefone.trim()) {
      toast.error("Telefone é obrigatório");
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

  const formatPhone = (phone: string) => {
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
    <div className="space-y-3 pb-20 px-3 py-3">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-xs">Gerencie seus contatos e oportunidades</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gerenciar Situações</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {/* Add/Edit form */}
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome da situação"
                      value={novaSituacaoNome}
                      onChange={(e) => setNovaSituacaoNome(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={novaSituacaoCor} onValueChange={setNovaSituacaoCor}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CORES_DISPONIVEIS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${c.class.split(" ")[0].replace("/20", "")}`} />
                              {c.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    {editingSituacao ? (
                      <>
                        <Button size="sm" onClick={handleUpdateSituacao} className="flex-1">
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditSituacao}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={handleAddSituacao} className="w-full">
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="space-y-2">
                  {situacoes.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 bg-muted/20 rounded-md"
                    >
                      <Badge variant="outline" className={`${getSituacaoStyle(s.nome)} border`}>
                        {s.nome}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => startEditSituacao(s)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSituacao(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome do lead (opcional)"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Situação</Label>
                    <Select value={situacao} onValueChange={setSituacao}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {situacoes.map((s) => (
                          <SelectItem key={s.id} value={s.nome}>
                            {s.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Origem</Label>
                    <Select value={origem} onValueChange={setOrigem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIGENS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Textarea
                    placeholder="Anotações sobre o lead..."
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit}>
                    {editingLead ? "Salvar" : "Cadastrar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="border-border/50">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-lg font-bold leading-none">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold leading-none">{stats.novos}</p>
                <p className="text-[10px] text-muted-foreground">Novos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold leading-none">{stats.emContato}</p>
                <p className="text-[10px] text-muted-foreground">Progresso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold leading-none">{stats.fechados}</p>
                <p className="text-[10px] text-muted-foreground">Fechados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterSituacao} onValueChange={setFilterSituacao}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {situacoes.map((s) => (
                <SelectItem key={s.id} value={s.nome}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterOrigem} onValueChange={setFilterOrigem}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {ORIGENS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {leads.length === 0
                ? "Nenhum lead cadastrado ainda"
                : "Nenhum lead encontrado com os filtros aplicados"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.id}
              className="group hover:border-primary/30 transition-all duration-200"
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">{lead.nome || "Sem nome"}</h3>
                      <Badge
                        variant="outline"
                        className={`${getSituacaoStyle(lead.situacao)} border text-[10px] px-1.5`}
                      >
                        {lead.situacao}
                      </Badge>
                      {lead.origem && (
                        <Badge variant="secondary" className="text-xs">
                          {getOrigemLabel(lead.origem)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${lead.telefone}`}
                          className="flex items-center gap-1.5 hover:text-primary transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {formatPhone(lead.telefone)}
                        </a>
                        <button
                          onClick={() => copyPhone(lead.telefone)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Copiar telefone"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    
                    {/* Inline editable observation */}
                    {editingObsId === lead.id ? (
                      <Textarea
                        ref={obsTextareaRef}
                        value={editingObsValue}
                        onChange={(e) => setEditingObsValue(e.target.value)}
                        onBlur={() => handleObsBlur(lead.id)}
                        placeholder="Adicionar observação..."
                        className="text-sm bg-muted/50 border-primary/30 min-h-[60px] mt-2"
                        rows={2}
                      />
                    ) : (
                      <div
                        onClick={() => handleObsClick(lead)}
                        className="text-xs text-muted-foreground/80 bg-muted/30 rounded-md p-1.5 cursor-pointer hover:bg-muted/50 transition-colors min-h-[28px]"
                      >
                        {lead.observacao || (
                          <span className="text-muted-foreground/50 italic">
                            Clique para adicionar observação...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Select
                      value={lead.situacao}
                      onValueChange={(value) => updateLeadSituacao(lead.id, value)}
                    >
                      <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <div className="w-full h-full flex items-center justify-center">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {situacoes.map((s) => (
                          <SelectItem key={s.id} value={s.nome}>
                            {s.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(lead)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(lead.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
