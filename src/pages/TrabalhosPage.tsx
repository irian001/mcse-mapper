import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Pencil, Search, Users, Trash2, Clock, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ContextoClienteEstrutura from "@/components/ContextoClienteEstrutura";
import TrabalhoPlanejamentoDialog from "@/components/trabalhos/TrabalhoPlanejamentoDialog";
import { useUserProfile } from "@/hooks/useUserProfile";

const STATUS_LIST = ["planejado", "iniciado", "em_execucao", "revisao_1", "revisao_2", "finalizado_para_parecer", "encerrado"] as const;
type StatusTrabalho = typeof STATUS_LIST[number];

const statusConfig: Record<string, { label: string; className: string }> = {
  planejado: { label: "Planejado", className: "bg-muted text-muted-foreground border-border" },
  iniciado: { label: "Iniciado", className: "bg-info/15 text-info border-info/30" },
  em_execucao: { label: "Em Execução", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  revisao_1: { label: "Revisão 1", className: "bg-[hsl(25,80%,55%)]/15 text-[hsl(25,80%,45%)] border-[hsl(25,80%,55%)]/30" },
  revisao_2: { label: "Revisão 2", className: "bg-[hsl(270,60%,55%)]/15 text-[hsl(270,60%,45%)] border-[hsl(270,60%,55%)]/30" },
  finalizado_para_parecer: { label: "Finalizado p/ Parecer", className: "bg-success/15 text-success border-success/30" },
  encerrado: { label: "Encerrado", className: "bg-success/25 text-success border-success/50" },
};

const PAPEIS = ["elaborador", "revisor_1", "revisor_2", "gerente", "socio"] as const;
const papelLabel: Record<string, string> = { elaborador: "Elaborador", revisor_1: "Revisor 1", revisor_2: "Revisor 2", gerente: "Gerente", socio: "Sócio" };

const TIPO_CONTROLE_HORAS = ["obrigatorio", "opcional", "nao_aplicavel"] as const;
const tipoControleLabel: Record<string, string> = { obrigatorio: "Obrigatório", opcional: "Opcional", nao_aplicavel: "Não Aplicável" };

interface TrabalhoForm {
  cliente_id: string;
  exercicio_id: string;
  nome_trabalho: string;
  descricao: string;
  data_inicio_programada: string;
  data_fim_programada: string;
  data_inicio_real: string;
  data_fim_real: string;
  status_trabalho: StatusTrabalho;
  observacoes: string;
  contrato_id: string;
  contrato_produto_id: string;
  controle_horas_ativo: boolean;
  tipo_controle_horas: string;
}

const emptyForm: TrabalhoForm = {
  cliente_id: "", exercicio_id: "", nome_trabalho: "", descricao: "",
  data_inicio_programada: "", data_fim_programada: "", data_inicio_real: "", data_fim_real: "",
  status_trabalho: "planejado", observacoes: "",
  contrato_id: "", contrato_produto_id: "", controle_horas_ativo: false, tipo_controle_horas: "nao_aplicavel",
};

export default function TrabalhosPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrabalhoForm>(emptyForm);
  const [equipeDialogOpen, setEquipeDialogOpen] = useState(false);
  const [selectedTrabalhoId, setSelectedTrabalhoId] = useState<string | null>(null);
  const [planejamentoOpen, setPlanejamentoOpen] = useState(false);
  const [planejamentoTrabalho, setPlanejamentoTrabalho] = useState<any | null>(null);
  const { data: userProfile } = useUserProfile();
  const isInterno = userProfile?.role === "auditor";
  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Queries
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => { const { data } = await supabase.from("clientes").select("*").order("razao_social"); return data || []; },
  });

  const { data: exercicios = [] } = useQuery({
    queryKey: ["exercicios-all"],
    queryFn: async () => { const { data } = await supabase.from("exercicios").select("*, clientes(razao_social)").order("ano_exercicio", { ascending: false }); return data || []; },
  });

  const { data: trabalhos = [], isLoading } = useQuery({
    queryKey: ["trabalhos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabalhos_auditoria")
        .select("*, clientes(razao_social), exercicios(ano_exercicio), trabalho_auditores(id, auditor_id, auditores(nome))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: auditores = [] } = useQuery({
    queryKey: ["auditores-ativos"],
    queryFn: async () => { const { data } = await supabase.from("auditores").select("*").eq("ativo", true).order("nome"); return data || []; },
  });

  const { data: equipeAtual = [], refetch: refetchEquipe } = useQuery({
    queryKey: ["equipe", selectedTrabalhoId],
    enabled: !!selectedTrabalhoId,
    queryFn: async () => {
      const { data } = await supabase
        .from("trabalho_auditores")
        .select("*, auditores(nome, cargo)")
        .eq("trabalho_auditoria_id", selectedTrabalhoId!);
      return data || [];
    },
  });

  // Contratos do cliente selecionado (excluindo encerrados para novo trabalho)
  const { data: contratosCliente = [] } = useQuery({
    queryKey: ["contratos-cliente", form.cliente_id],
    enabled: !!form.cliente_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("contratos" as any)
        .select("*")
        .eq("cliente_id", form.cliente_id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  // Produtos do contrato selecionado
  const { data: produtosContrato = [] } = useQuery({
    queryKey: ["contrato-produtos", form.contrato_id],
    enabled: !!form.contrato_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("contrato_produtos" as any)
        .select("*, produtos_auditoria(nome_produto, codigo_produto)")
        .eq("contrato_id", form.contrato_id)
        .eq("ativo", true);
      return (data || []) as any[];
    },
  });

  // Filtrar contratos: para edição mostrar todos; para criação excluir encerrados
  const contratosDisponiveis = useMemo(() => {
    if (editingId) return contratosCliente;
    return contratosCliente.filter((c: any) => c.status_contrato !== "encerrado");
  }, [contratosCliente, editingId]);

  const exerciciosFiltrados = useMemo(() => {
    if (!form.cliente_id) return [];
    return exercicios.filter((e: any) => e.cliente_id === form.cliente_id);
  }, [exercicios, form.cliente_id]);

  const criarExerciciosMutation = useMutation({
    mutationFn: async (clienteId: string) => {
      const anoAtual = new Date().getFullYear();
      const anos = [anoAtual - 1, anoAtual];
      const existentes = exercicios.filter((e: any) => e.cliente_id === clienteId).map((e: any) => e.ano_exercicio);
      const novos = anos.filter((a) => !existentes.includes(a));
      if (novos.length === 0) return;
      const rows = novos.map((ano) => ({
        cliente_id: clienteId,
        ano_exercicio: ano,
        data_inicio: `${ano}-01-01`,
        data_fim: `${ano}-12-31`,
        status: "aberto" as const,
      }));
      const { error } = await supabase.from("exercicios").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercicios-all"] });
      toast.success("Exercícios criados com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (values: TrabalhoForm & { id?: string }) => {
      const { id, ...rest } = values;
      const payload: any = { ...rest };
      if (!payload.data_inicio_programada) payload.data_inicio_programada = null;
      if (!payload.data_fim_programada) payload.data_fim_programada = null;
      if (!payload.data_inicio_real) payload.data_inicio_real = null;
      if (!payload.data_fim_real) payload.data_fim_real = null;
      if (!payload.contrato_id) { payload.contrato_id = null; payload.contrato_produto_id = null; }
      if (!payload.contrato_produto_id) payload.contrato_produto_id = null;
      if (id) {
        const { error } = await supabase.from("trabalhos_auditoria").update(payload as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trabalhos_auditoria").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trabalhos"] }); setDialogOpen(false); toast.success(editingId ? "Trabalho atualizado" : "Trabalho criado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addAuditorMutation = useMutation({
    mutationFn: async ({ auditor_id, papel, responsavel }: { auditor_id: string; papel: string; responsavel: boolean }) => {
      const { error } = await supabase.from("trabalho_auditores").insert({
        trabalho_auditoria_id: selectedTrabalhoId!, auditor_id, papel_no_trabalho: papel as any, responsavel_principal: responsavel,
      });
      if (error) throw error;
    },
    onSuccess: () => { refetchEquipe(); qc.invalidateQueries({ queryKey: ["trabalhos"] }); toast.success("Auditor adicionado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeAuditorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trabalho_auditores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refetchEquipe(); qc.invalidateQueries({ queryKey: ["trabalhos"] }); toast.success("Auditor removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEquipeMutation = useMutation({
    mutationFn: async ({ id, papel_no_trabalho, responsavel_principal }: { id: string; papel_no_trabalho?: typeof PAPEIS[number]; responsavel_principal?: boolean }) => {
      const update: any = {};
      if (papel_no_trabalho !== undefined) update.papel_no_trabalho = papel_no_trabalho;
      if (responsavel_principal !== undefined) update.responsavel_principal = responsavel_principal;
      const { error } = await supabase.from("trabalho_auditores").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refetchEquipe(); qc.invalidateQueries({ queryKey: ["trabalhos"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Filters
  const filtered = useMemo(() => {
    let list = trabalhos;
    if (search) { const s = search.toLowerCase(); list = list.filter((t: any) => t.nome_trabalho?.toLowerCase().includes(s)); }
    if (filterCliente !== "all") list = list.filter((t: any) => t.cliente_id === filterCliente);
    if (filterStatus !== "all") list = list.filter((t: any) => t.status_trabalho === filterStatus);
    return list;
  }, [trabalhos, search, filterCliente, filterStatus]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      cliente_id: t.cliente_id, exercicio_id: t.exercicio_id, nome_trabalho: t.nome_trabalho,
      descricao: t.descricao || "", data_inicio_programada: t.data_inicio_programada || "",
      data_fim_programada: t.data_fim_programada || "", data_inicio_real: t.data_inicio_real || "",
      data_fim_real: t.data_fim_real || "", status_trabalho: t.status_trabalho, observacoes: t.observacoes || "",
      contrato_id: t.contrato_id || "", contrato_produto_id: t.contrato_produto_id || "",
      controle_horas_ativo: t.controle_horas_ativo || false,
      tipo_controle_horas: t.tipo_controle_horas || "nao_aplicavel",
    });
    setDialogOpen(true);
  };
  const openEquipe = (id: string) => { setSelectedTrabalhoId(id); setEquipeDialogOpen(true); };

  // Sugerir tipo_controle_horas baseado no contrato
  const handleContratoChange = (contratoId: string) => {
    const contrato = contratosCliente.find((c: any) => c.id === contratoId);
    let sugestaoControle = form.tipo_controle_horas;
    let sugestaoAtivo = form.controle_horas_ativo;

    if (contrato) {
      if (contrato.tipo_contratacao === "por_hora") {
        sugestaoControle = "obrigatorio";
        sugestaoAtivo = true;
      } else if (contrato.tipo_contratacao === "por_demanda") {
        sugestaoControle = "opcional";
        sugestaoAtivo = true;
      } else if (contrato.tipo_contratacao === "preco_fixo") {
        sugestaoControle = "opcional";
        sugestaoAtivo = false;
      }
    }

    setForm({
      ...form,
      contrato_id: contratoId,
      contrato_produto_id: "",
      controle_horas_ativo: sugestaoAtivo,
      tipo_controle_horas: sugestaoControle,
    });
  };

  // Add auditor form state
  const [addAuditorId, setAddAuditorId] = useState("");
  const [addPapel, setAddPapel] = useState<string>("elaborador");
  const [addResp, setAddResp] = useState(false);

  const auditoresDisponiveis = useMemo(() => {
    const idsJaVinculados = equipeAtual.map((e: any) => e.auditor_id);
    return auditores.filter((a: any) => !idsJaVinculados.includes(a.id));
  }, [auditores, equipeAtual]);

  const contratoStatusLabel: Record<string, string> = {
    em_negociacao: "Negociação", ativo: "Ativo", suspenso: "Suspenso", encerrado: "Encerrado",
  };

  return (
    <div>
      <PageHeader
        title="Trabalhos de Auditoria"
        description="Gestão de trabalhos e equipes de auditoria"
        actions={<Button size="sm" onClick={openNew}><Plus size={16} className="mr-1" />Novo Trabalho</Button>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Buscar trabalho" className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trabalho</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Exercício</TableHead>
              <TableHead>Início Prog.</TableHead>
              <TableHead>Fim Prog.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum trabalho encontrado</TableCell></TableRow>
            ) : filtered.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nome_trabalho}</TableCell>
                <TableCell className="text-muted-foreground">{t.clientes?.razao_social || "—"}</TableCell>
                <TableCell>{t.exercicios?.ano_exercicio || "—"}</TableCell>
                <TableCell className="text-sm">{t.data_inicio_programada ? format(new Date(t.data_inicio_programada + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="text-sm">{t.data_fim_programada ? format(new Date(t.data_fim_programada + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs font-medium ${statusConfig[t.status_trabalho]?.className || ""}`}>
                    {statusConfig[t.status_trabalho]?.label || t.status_trabalho}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(t as any).controle_horas_ativo ? (
                    <Badge variant="outline" className="text-xs bg-info/10 text-info border-info/30">
                      <Clock size={10} className="mr-1" />
                      {tipoControleLabel[(t as any).tipo_controle_horas] || "—"}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEquipe(t.id)}>
                    <Users size={14} /> {t.trabalho_auditores?.length || 0}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {isInterno && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Planejamento do Trabalho"
                        onClick={() => { setPlanejamentoTrabalho(t); setPlanejamentoOpen(true); }}
                      >
                        <ClipboardList size={14} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil size={14} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Criar/Editar Trabalho */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Trabalho" : "Novo Trabalho"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Trabalho *</Label>
              <Input value={form.nome_trabalho} onChange={(e) => setForm({ ...form, nome_trabalho: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v, exercicio_id: "", contrato_id: "", contrato_produto_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Exercício *</Label>
                <Select value={form.exercicio_id} onValueChange={(v) => setForm({ ...form, exercicio_id: v })} disabled={!form.cliente_id}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {exerciciosFiltrados.length === 0 && form.cliente_id ? (
                      <div className="px-2 py-3 text-center">
                        <p className="text-xs text-muted-foreground mb-2">Nenhum exercício cadastrado</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          disabled={criarExerciciosMutation.isPending}
                          onClick={(e) => { e.stopPropagation(); criarExerciciosMutation.mutate(form.cliente_id); }}
                        >
                          <Plus size={12} className="mr-1" />
                          {criarExerciciosMutation.isPending ? "Criando..." : `Criar ${new Date().getFullYear() - 1} e ${new Date().getFullYear()}`}
                        </Button>
                      </div>
                    ) : (
                      exerciciosFiltrados.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.ano_exercicio}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.cliente_id && (
              <ContextoClienteEstrutura clienteId={form.cliente_id} variant="block" />
            )}

            {/* Contrato e Produto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contrato</Label>
                <Select value={form.contrato_id || "none"} onValueChange={(v) => handleContratoChange(v === "none" ? "" : v)} disabled={!form.cliente_id}>
                  <SelectTrigger><SelectValue placeholder="Sem contrato" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem contrato</SelectItem>
                    {contratosDisponiveis.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.numero_contrato ? `${c.numero_contrato} — ` : ""}{c.descricao?.substring(0, 40) || "Sem descrição"}
                        {" "}({contratoStatusLabel[c.status_contrato] || c.status_contrato})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Produto do Contrato</Label>
                <Select
                  value={form.contrato_produto_id || "none"}
                  onValueChange={(v) => setForm({ ...form, contrato_produto_id: v === "none" ? "" : v })}
                  disabled={!form.contrato_id}
                >
                  <SelectTrigger><SelectValue placeholder="Sem produto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem produto vinculado</SelectItem>
                    {produtosContrato.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.produtos_auditoria?.codigo_produto} — {p.produtos_auditoria?.nome_produto}
                        {p.horas_previstas ? ` (${p.horas_previstas}h)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início Programado</Label>
                <Input type="date" value={form.data_inicio_programada} onChange={(e) => setForm({ ...form, data_inicio_programada: e.target.value })} />
              </div>
              <div>
                <Label>Fim Programado</Label>
                <Input type="date" value={form.data_fim_programada} onChange={(e) => setForm({ ...form, data_fim_programada: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início Real</Label>
                <Input type="date" value={form.data_inicio_real} onChange={(e) => setForm({ ...form, data_inicio_real: e.target.value })} />
              </div>
              <div>
                <Label>Fim Real</Label>
                <Input type="date" value={form.data_fim_real} onChange={(e) => setForm({ ...form, data_fim_real: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status_trabalho} onValueChange={(v) => setForm({ ...form, status_trabalho: v as StatusTrabalho })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Controle de Horas */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-info" />
                  <Label className="text-sm font-medium">Controle de Horas</Label>
                </div>
                <Switch
                  checked={form.controle_horas_ativo}
                  onCheckedChange={(v) => setForm({ ...form, controle_horas_ativo: v })}
                />
              </div>
              {form.controle_horas_ativo && (
                <div>
                  <Label className="text-xs">Tipo de Controle</Label>
                  <Select value={form.tipo_controle_horas} onValueChange={(v) => setForm({ ...form, tipo_controle_horas: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPO_CONTROLE_HORAS.map((t) => (
                        <SelectItem key={t} value={t}>{tipoControleLabel[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!form.nome_trabalho.trim() || !form.cliente_id || !form.exercicio_id || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Equipe */}
      <Dialog open={equipeDialogOpen} onOpenChange={setEquipeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Equipe do Trabalho</DialogTitle>
            <DialogDescription>Gerencie os auditores vinculados a este trabalho</DialogDescription>
          </DialogHeader>

          {/* Add auditor */}
          <div className="flex items-end gap-2 border-b pb-4">
            <div className="flex-1">
              <Label className="text-xs">Auditor</Label>
              <Select value={addAuditorId} onValueChange={setAddAuditorId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{auditoresDisponiveis.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Label className="text-xs">Papel</Label>
              <Select value={addPapel} onValueChange={setAddPapel}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{PAPEIS.map((p) => <SelectItem key={p} value={p}>{papelLabel[p]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5 pb-0.5">
              <Switch checked={addResp} onCheckedChange={setAddResp} />
              <Label className="text-xs whitespace-nowrap">Resp.</Label>
            </div>
            <Button size="sm" disabled={!addAuditorId || addAuditorMutation.isPending} onClick={() => {
              addAuditorMutation.mutate({ auditor_id: addAuditorId, papel: addPapel, responsavel: addResp });
              setAddAuditorId(""); setAddResp(false);
            }}>
              <Plus size={14} />
            </Button>
          </div>

          {/* Current team */}
          <div className="space-y-2 max-h-64 overflow-auto">
            {equipeAtual.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum auditor vinculado</p>
            ) : equipeAtual.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 border rounded px-3 py-2">
                <span className="flex-1 text-sm font-medium">{m.auditores?.nome}</span>
                <Select value={m.papel_no_trabalho} onValueChange={(v) => updateEquipeMutation.mutate({ id: m.id, papel_no_trabalho: v as typeof PAPEIS[number] })}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAPEIS.map((p) => <SelectItem key={p} value={p}>{papelLabel[p]}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Switch checked={m.responsavel_principal} onCheckedChange={(v) => updateEquipeMutation.mutate({ id: m.id, responsavel_principal: v })} />
                  <span className="text-xs text-muted-foreground">Resp.</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeAuditorMutation.mutate(m.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
