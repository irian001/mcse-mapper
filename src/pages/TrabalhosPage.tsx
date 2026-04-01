import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Pencil, Search, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
}

const emptyForm: TrabalhoForm = {
  cliente_id: "", exercicio_id: "", nome_trabalho: "", descricao: "",
  data_inicio_programada: "", data_fim_programada: "", data_inicio_real: "", data_fim_real: "",
  status_trabalho: "planejado", observacoes: "",
};

export default function TrabalhosPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrabalhoForm>(emptyForm);
  const [equipeDialogOpen, setEquipeDialogOpen] = useState(false);
  const [selectedTrabalhoId, setSelectedTrabalhoId] = useState<string | null>(null);
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

  const exerciciosFiltrados = useMemo(() => {
    if (!form.cliente_id) return [];
    return exercicios.filter((e: any) => e.cliente_id === form.cliente_id);
  }, [exercicios, form.cliente_id]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (values: TrabalhoForm & { id?: string }) => {
      const { id, ...rest } = values;
      const payload: any = { ...rest };
      if (!payload.data_inicio_programada) payload.data_inicio_programada = null;
      if (!payload.data_fim_programada) payload.data_fim_programada = null;
      if (!payload.data_inicio_real) payload.data_inicio_real = null;
      if (!payload.data_fim_real) payload.data_fim_real = null;
      if (id) {
        const { error } = await supabase.from("trabalhos_auditoria").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trabalhos_auditoria").insert(payload);
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
    });
    setDialogOpen(true);
  };
  const openEquipe = (id: string) => { setSelectedTrabalhoId(id); setEquipeDialogOpen(true); };

  // Add auditor form state
  const [addAuditorId, setAddAuditorId] = useState("");
  const [addPapel, setAddPapel] = useState<string>("elaborador");
  const [addResp, setAddResp] = useState(false);

  const auditoresDisponiveis = useMemo(() => {
    const idsJaVinculados = equipeAtual.map((e: any) => e.auditor_id);
    return auditores.filter((a: any) => !idsJaVinculados.includes(a.id));
  }, [auditores, equipeAtual]);

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
              <TableHead>Equipe</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum trabalho encontrado</TableCell></TableRow>
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
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEquipe(t.id)}>
                    <Users size={14} /> {t.trabalho_auditores?.length || 0}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil size={14} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Criar/Editar Trabalho */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar Trabalho" : "Novo Trabalho"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Trabalho *</Label>
              <Input value={form.nome_trabalho} onChange={(e) => setForm({ ...form, nome_trabalho: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v, exercicio_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Exercício *</Label>
                <Select value={form.exercicio_id} onValueChange={(v) => setForm({ ...form, exercicio_id: v })} disabled={!form.cliente_id}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{exerciciosFiltrados.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.ano_exercicio}</SelectItem>)}</SelectContent>
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
