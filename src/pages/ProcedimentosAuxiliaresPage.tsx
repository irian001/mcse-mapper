import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Plus, Pencil, Search, Eye, ClipboardCheck, X } from "lucide-react";
import { toast } from "sonner";
import ProcedimentoDetailDialog from "@/components/procedimentos/ProcedimentoDetailDialog";

const TIPOS_PROCEDIMENTO = [
  { value: "contagem_caixa", label: "Contagem de Caixa" },
  { value: "contagem_estoque", label: "Contagem de Estoque" },
  { value: "faturas_em_aberto", label: "Faturas em Aberto" },
  { value: "ordens_compra", label: "Ordens de Compra" },
  { value: "ordens_imobilizacao", label: "Ordens de Imobilização" },
];

const STATUS_PROCEDIMENTO = [
  { value: "planejado", label: "Planejado", className: "bg-muted text-muted-foreground border-border" },
  { value: "em_execucao", label: "Em Execução", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  { value: "aguardando_documentos", label: "Aguardando Documentos", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  { value: "em_revisao", label: "Em Revisão", className: "bg-primary/15 text-primary border-primary/30" },
  { value: "concluido", label: "Concluído", className: "bg-success/15 text-success border-success/30" },
  { value: "encerrado", label: "Encerrado", className: "bg-destructive/15 text-destructive border-destructive/30" },
];

const emptyForm = {
  trabalho_auditoria_id: "",
  cliente_id: "",
  exercicio_id: "",
  tipo_procedimento: "contagem_caixa",
  titulo: "",
  descricao: "",
  data_procedimento: "",
  data_base_referencia: "",
  conta_mcse_id: "",
  codigo_mcse: "",
  descricao_mcse: "",
  responsavel_execucao_id: "",
  responsavel_revisao_id: "",
  status_procedimento: "planejado",
  objetivo_procedimento: "",
  conclusao_preliminar: "",
  conclusao_final: "",
  observacoes: "",
  ativo: true,
};

export default function ProcedimentosAuxiliaresPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState("all");
  const [filterTrabalho, setFilterTrabalho] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMcse, setFilterMcse] = useState("all");
  const [filterDataIni, setFilterDataIni] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");

  const { data: procedimentos = [], isLoading } = useQuery({
    queryKey: ["procedimentos-auxiliares"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimentos_auxiliares")
        .select(
          "*, clientes(razao_social, nome_fantasia), trabalhos_auditoria(nome_trabalho), mcse_contas:conta_mcse_id(codigo_mcse, descricao_conta), exec:responsavel_execucao_id(nome), rev:responsavel_revisao_id(nome)"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, razao_social, nome_fantasia").order("razao_social");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: trabalhos = [] } = useQuery({
    queryKey: ["trabalhos-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabalhos_auditoria")
        .select("id, nome_trabalho, cliente_id, exercicio_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: auditores = [] } = useQuery({
    queryKey: ["auditores-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("auditores").select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: mcseContas = [] } = useQuery({
    queryKey: ["mcse-contas-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mcse_contas")
        .select("id, codigo_mcse, descricao_conta")
        .eq("ativo", true)
        .order("codigo_mcse");
      if (error) throw error;
      return data || [];
    },
  });

  const trabalhosFiltrados = useMemo(() => {
    if (!form.cliente_id) return trabalhos;
    return trabalhos.filter((t: any) => t.cliente_id === form.cliente_id);
  }, [trabalhos, form.cliente_id]);

  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const data = {
        ...payload,
        valor: undefined,
        exercicio_id: payload.exercicio_id || null,
        conta_mcse_id: payload.conta_mcse_id || null,
        responsavel_execucao_id: payload.responsavel_execucao_id || null,
        responsavel_revisao_id: payload.responsavel_revisao_id || null,
        data_procedimento: payload.data_procedimento || null,
        data_base_referencia: payload.data_base_referencia || null,
      };
      if (editing) {
        const { error } = await (supabase as any).from("procedimentos_auxiliares").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("procedimentos_auxiliares").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedimentos-auxiliares"] });
      toast.success(editing ? "Procedimento atualizado" : "Procedimento criado");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const handleEdit = (p: any) => {
    setEditing(p);
    setForm({
      trabalho_auditoria_id: p.trabalho_auditoria_id || "",
      cliente_id: p.cliente_id || "",
      exercicio_id: p.exercicio_id || "",
      tipo_procedimento: p.tipo_procedimento || "contagem_caixa",
      titulo: p.titulo || "",
      descricao: p.descricao || "",
      data_procedimento: p.data_procedimento || "",
      data_base_referencia: p.data_base_referencia || "",
      conta_mcse_id: p.conta_mcse_id || "",
      codigo_mcse: p.codigo_mcse || "",
      descricao_mcse: p.descricao_mcse || "",
      responsavel_execucao_id: p.responsavel_execucao_id || "",
      responsavel_revisao_id: p.responsavel_revisao_id || "",
      status_procedimento: p.status_procedimento || "planejado",
      objetivo_procedimento: p.objetivo_procedimento || "",
      conclusao_preliminar: p.conclusao_preliminar || "",
      conclusao_final: p.conclusao_final || "",
      observacoes: p.observacoes || "",
      ativo: p.ativo ?? true,
    });
    setOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.trabalho_auditoria_id) return toast.error("Trabalho é obrigatório");
    if (!form.cliente_id) return toast.error("Cliente é obrigatório");
    if (!form.tipo_procedimento) return toast.error("Tipo é obrigatório");
    if (!form.titulo) return toast.error("Título é obrigatório");
    upsert.mutate(form);
  };

  const onTrabalhoChange = (id: string) => {
    const t: any = trabalhos.find((x: any) => x.id === id);
    setForm((f) => ({
      ...f,
      trabalho_auditoria_id: id,
      cliente_id: t?.cliente_id || f.cliente_id,
      exercicio_id: t?.exercicio_id || f.exercicio_id,
    }));
  };

  const onMcseChange = (id: string) => {
    const m: any = mcseContas.find((x: any) => x.id === id);
    setForm((f) => ({
      ...f,
      conta_mcse_id: id === "none" ? "" : id,
      codigo_mcse: id === "none" ? "" : m?.codigo_mcse || "",
      descricao_mcse: id === "none" ? "" : m?.descricao_conta || "",
    }));
  };

  const filtered = procedimentos.filter((p: any) => {
    if (filterCliente !== "all" && p.cliente_id !== filterCliente) return false;
    if (filterTrabalho !== "all" && p.trabalho_auditoria_id !== filterTrabalho) return false;
    if (filterTipo !== "all" && p.tipo_procedimento !== filterTipo) return false;
    if (filterStatus !== "all" && p.status_procedimento !== filterStatus) return false;
    if (filterMcse !== "all" && p.conta_mcse_id !== filterMcse) return false;
    if (filterDataIni && (!p.data_base_referencia || p.data_base_referencia < filterDataIni)) return false;
    if (filterDataFim && (!p.data_base_referencia || p.data_base_referencia > filterDataFim)) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = [p.titulo, p.descricao, p.codigo_mcse, p.clientes?.razao_social, p.trabalhos_auditoria?.nome_trabalho]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  const renderStatus = (s: string) => {
    const cfg = STATUS_PROCEDIMENTO.find((x) => x.value === s);
    return <Badge variant="outline" className={cfg?.className}>{cfg?.label || s}</Badge>;
  };

  const renderTipo = (t: string) => TIPOS_PROCEDIMENTO.find((x) => x.value === t)?.label || t;

  return (
    <div>
      <PageHeader
        title="Procedimentos Auxiliares"
        description="Cabeçalhos de procedimentos auxiliares de auditoria (contagem de caixa, estoque, faturas, ordens, etc.)"
        actions={
          <Button onClick={handleNew}>
            <Plus size={16} className="mr-1" /> Novo Procedimento
          </Button>
        }
      />

      <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterCliente} onValueChange={setFilterCliente}>
            <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTrabalho} onValueChange={setFilterTrabalho}>
            <SelectTrigger><SelectValue placeholder="Trabalho" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os trabalhos</SelectItem>
              {trabalhos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_trabalho}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {TIPOS_PROCEDIMENTO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_PROCEDIMENTO.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMcse} onValueChange={setFilterMcse}>
            <SelectTrigger><SelectValue placeholder="Conta MCSE" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas MCSE</SelectItem>
              {mcseContas.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.codigo_mcse} — {m.descricao_conta}</SelectItem>)}
            </SelectContent>
          </Select>
          <div>
            <Label className="text-xs text-muted-foreground">Data base de</Label>
            <Input type="date" value={filterDataIni} onChange={(e) => setFilterDataIni(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Data base até</Label>
            <Input type="date" value={filterDataFim} onChange={(e) => setFilterDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Trabalho</TableHead>
              <TableHead>Data Base</TableHead>
              <TableHead>Conta MCSE</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resp. Execução</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                <ClipboardCheck className="mx-auto mb-2 opacity-50" /> Nenhum procedimento encontrado.
              </TableCell></TableRow>
            )}
            {filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{renderTipo(p.tipo_procedimento)}</TableCell>
                <TableCell className="font-medium">{p.titulo}</TableCell>
                <TableCell className="text-sm">{p.clientes?.nome_fantasia || p.clientes?.razao_social || "—"}</TableCell>
                <TableCell className="text-sm">{p.trabalhos_auditoria?.nome_trabalho || "—"}</TableCell>
                <TableCell className="text-sm">{p.data_base_referencia ? new Date(p.data_base_referencia + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell className="text-sm">{p.codigo_mcse ? `${p.codigo_mcse}` : "—"}</TableCell>
                <TableCell>{renderStatus(p.status_procedimento)}</TableCell>
                <TableCell className="text-sm">{p.exec?.nome || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setDetail(p)}><Eye size={14} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Pencil size={14} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} Procedimento Auxiliar</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Trabalho *</Label>
                <Select value={form.trabalho_auditoria_id} onValueChange={onTrabalhoChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {trabalhos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_trabalho}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Procedimento *</Label>
                <Select value={form.tipo_procedimento} onValueChange={(v) => setForm({ ...form, tipo_procedimento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_PROCEDIMENTO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status_procedimento} onValueChange={(v) => setForm({ ...form, status_procedimento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_PROCEDIMENTO.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div>
                <Label>Data do Procedimento</Label>
                <Input type="date" value={form.data_procedimento} onChange={(e) => setForm({ ...form, data_procedimento: e.target.value })} />
              </div>
              <div>
                <Label>Data Base de Referência</Label>
                <Input type="date" value={form.data_base_referencia} onChange={(e) => setForm({ ...form, data_base_referencia: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Conta MCSE (opcional)</Label>
                <Select value={form.conta_mcse_id || "none"} onValueChange={onMcseChange}>
                  <SelectTrigger><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {mcseContas.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.codigo_mcse} — {m.descricao_conta}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsável Execução</Label>
                <Select value={form.responsavel_execucao_id || "none"} onValueChange={(v) => setForm({ ...form, responsavel_execucao_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {auditores.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsável Revisão</Label>
                <Select value={form.responsavel_revisao_id || "none"} onValueChange={(v) => setForm({ ...form, responsavel_revisao_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {auditores.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Objetivo do Procedimento</Label>
                <Textarea rows={2} value={form.objetivo_procedimento} onChange={(e) => setForm({ ...form, objetivo_procedimento: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Conclusão Preliminar</Label>
                <Textarea rows={2} value={form.conclusao_preliminar} onChange={(e) => setForm({ ...form, conclusao_preliminar: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Conclusão Final</Label>
                <Textarea rows={2} value={form.conclusao_final} onChange={(e) => setForm({ ...form, conclusao_final: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <Label>Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog com abas (Dados Gerais / Execução / Evidências / Conclusão) */}
      <ProcedimentoDetailDialog procedimento={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
