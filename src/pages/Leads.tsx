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

const SITUACOES = [
  { value: "novo", label: "Novo", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "contato", label: "Em Contato", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "negociando", label: "Negociando", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "fechado", label: "Fechado", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "perdido", label: "Perdido", color: "bg-red-500/20 text-red-400 border-red-500/30" },
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSituacao, setFilterSituacao] = useState<string>("todos");
  const [filterOrigem, setFilterOrigem] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // Inline editing state
  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [editingObsValue, setEditingObsValue] = useState("");
  const obsTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Form state
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [situacao, setSituacao] = useState("novo");
  const [origem, setOrigem] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  useEffect(() => {
    if (editingObsId && obsTextareaRef.current) {
      obsTextareaRef.current.focus();
    }
  }, [editingObsId]);

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
    setSituacao("novo");
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

    try {
      if (editingLead) {
        const { error } = await supabase
          .from("leads")
          .update({
            nome: nome.trim() || "Sem nome",
            telefone: telefone.trim(),
            situacao,
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
          situacao,
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

  const updateSituacao = async (id: string, novaSituacao: string) => {
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
    
    // Only update if value changed
    if (lead && lead.observacao !== newValue) {
      try {
        const { error } = await supabase
          .from("leads")
          .update({ observacao: newValue })
          .eq("id", leadId);

        if (error) throw error;
        
        // Update local state
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

  const getSituacaoStyle = (situacao: string) => {
    return SITUACOES.find((s) => s.value === situacao)?.color || "bg-gray-500/20 text-gray-400";
  };

  const getSituacaoLabel = (situacao: string) => {
    return SITUACOES.find((s) => s.value === situacao)?.label || situacao;
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

  // Stats
  const stats = {
    total: leads.length,
    novos: leads.filter((l) => l.situacao === "novo").length,
    emContato: leads.filter((l) => l.situacao === "contato" || l.situacao === "negociando").length,
    fechados: leads.filter((l) => l.situacao === "fechado").length,
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus contatos e oportunidades</p>
        </div>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SITUACOES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.novos}</p>
                <p className="text-xs text-muted-foreground">Novos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emContato}</p>
                <p className="text-xs text-muted-foreground">Em Progresso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.fechados}</p>
                <p className="text-xs text-muted-foreground">Fechados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterSituacao} onValueChange={setFilterSituacao}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {SITUACOES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterOrigem} onValueChange={setFilterOrigem}>
            <SelectTrigger className="w-[140px]">
              <MapPin className="h-4 w-4 mr-2" />
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
        <div className="grid gap-3">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.id}
              className="group hover:border-primary/30 transition-all duration-200 bg-gradient-to-r from-card to-card/80"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold truncate">{lead.nome || "Sem nome"}</h3>
                      <Badge
                        variant="outline"
                        className={`${getSituacaoStyle(lead.situacao)} border text-xs`}
                      >
                        {getSituacaoLabel(lead.situacao)}
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
                        className="text-sm text-muted-foreground/80 bg-muted/30 rounded-md p-2 mt-2 cursor-pointer hover:bg-muted/50 transition-colors min-h-[40px]"
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
                      onValueChange={(value) => updateSituacao(lead.id, value)}
                    >
                      <SelectTrigger className="h-8 w-8 p-0 border-0 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-full h-full flex items-center justify-center">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {SITUACOES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
