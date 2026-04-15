import { useState } from "react";
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
import { Plus, Pencil, Search, FileSignature } from "lucide-react";
import { toast } from "sonner";

const TIPOS_CONTRATACAO = [
  { value: "por_hora", label: "Por Hora" },
  { value: "por_demanda", label: "Por Demanda" },
  { value: "preco_fixo", label: "Preço Fixo" },
  { value: "misto", label: "Misto" },
];

const FORMAS_PAGAMENTO = [
  { value: "mensal", label: "Mensal" },
  { value: "por_entrega", label: "Por Entrega" },
  { value: "por_hora", label: "Por Hora" },
  { value: "misto", label: "Misto" },
];

const STATUS_CONTRATO = [
  { value: "em_negociacao", label: "Em Negociação", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  { value: "ativo", label: "Ativo", className: "bg-success/15 text-success border-success/30" },
  { value: "suspenso", label: "Suspenso", className: "bg-muted text-muted-foreground border-border" },
  { value: "encerrado", label: "Encerrado", className: "bg-destructive/15 text-destructive border-destructive/30" },
];

const emptyForm = {
  cliente_id: "",
  numero_contrato: "",
  descricao: "",
  data_inicio: "",
  data_fim: "",
  valor_total_contrato: "",
  moeda: "BRL",
  tipo_contratacao: "preco_fixo",
  forma_pagamento: "mensal",
  condicao_pagamento: "",
  gestor_contrato_id: "",
  parceiro_responsavel: "",
  centro_custo: "",
  data_assinatura: "",
  renovacao_automatica: false,
  prazo_aviso_previo: "",
  status_contrato: "em_negociacao",
  ativo: true,
  observacoes: "",
};

export default function ContratosPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["contratos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contratos")
        .select("*, clientes(razao_social, nome_fantasia), auditores:gestor_contrato_id(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id, razao_social, nome_fantasia").order("razao_social");
      return data || [];
    },
  });

  const { data: auditores = [] } = useQuery({
    queryKey: ["auditores-select"],
    queryFn: async () => {
      const { data } = await supabase.from("auditores").select("id, nome").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const record: any = {
        cliente_id: payload.cliente_id,
        descricao: payload.descricao,
        data_inicio: payload.data_inicio,
        data_fim: payload.data_fim,
        moeda: payload.moeda,
        tipo_contratacao: payload.tipo_contratacao,
        forma_pagamento: payload.forma_pagamento,
        condicao_pagamento: payload.condicao_pagamento || null,
        gestor_contrato_id: payload.gestor_contrato_id || null,
        parceiro_responsavel: payload.parceiro_responsavel || null,
        centro_custo: payload.centro_custo || null,
        data_assinatura: payload.data_assinatura || null,
        renovacao_automatica: payload.renovacao_automatica,
        prazo_aviso_previo: payload.prazo_aviso_previo ? Number(payload.prazo_aviso_previo) : null,
        status_contrato: payload.status_contrato,
        ativo: payload.ativo,
        observacoes: payload.observacoes || null,
        numero_contrato: payload.numero_contrato || null,
        valor_total_contrato: payload.valor_total_contrato ? Number(payload.valor_total_contrato) : null,
      };

      if (editing) {
        const { error } = await (supabase as any).from("contratos").update(record).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("contratos").insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success(editing ? "Contrato atualizado!" : "Contrato criado!");
      handleClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleClose = () => { setOpen(false); setEditing(null); setForm(emptyForm); };

  const handleEdit = (c: any) => {
    setEditing(c);
    setForm({
      cliente_id: c.cliente_id || "",
      numero_contrato: c.numero_contrato || "",
      descricao: c.descricao || "",
      data_inicio: c.data_inicio || "",
      data_fim: c.data_fim || "",
      valor_total_contrato: c.valor_total_contrato?.toString() || "",
      moeda: c.moeda || "BRL",
      tipo_contratacao: c.tipo_contratacao || "preco_fixo",
      forma_pagamento: c.forma_pagamento || "mensal",
      condicao_pagamento: c.condicao_pagamento || "",
      gestor_contrato_id: c.gestor_contrato_id || "",
      parceiro_responsavel: c.parceiro_responsavel || "",
      centro_custo: c.centro_custo || "",
      data_assinatura: c.data_assinatura || "",
      renovacao_automatica: c.renovacao_automatica ?? false,
      prazo_aviso_previo: c.prazo_aviso_previo?.toString() || "",
      status_contrato: c.status_contrato || "em_negociacao",
      ativo: c.ativo ?? true,
      observacoes: c.observacoes || "",
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.cliente_id || !form.data_inicio || !form.data_fim || !form.descricao) {
      toast.error("Preencha os campos obrigatórios: Cliente, Descrição, Data Início e Data Fim.");
      return;
    }
    saveMutation.mutate(form);
  };

  const today = new Date().toISOString().slice(0, 10);

  const filtered = contratos.filter((c: any) => {
    if (filterCliente !== "all" && c.cliente_id !== filterCliente) return false;
    if (filterStatus !== "all" && c.status_contrato !== filterStatus) return false;
    if (filterTipo !== "all" && c.tipo_contratacao !== filterTipo) return false;
    if (search) {
      const s = search.toLowerCase();
      const clienteNome = (c.clientes?.razao_social || c.clientes?.nome_fantasia || "").toLowerCase();
      if (
        !clienteNome.includes(s) &&
        !(c.numero_contrato || "").toLowerCase().includes(s) &&
        !(c.descricao || "").toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const s = STATUS_CONTRATO.find(x => x.value === status);
    return <Badge variant="outline" className={`text-xs font-medium ${s?.className || ""}`}>{s?.label || status}</Badge>;
  };

  const formatCurrency = (v: number | null) =>
    v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

  const clienteLabel = (c: any) => c.clientes?.nome_fantasia || c.clientes?.razao_social || "—";

  return (
    <>
      <PageHeader
        title="Contratos"
        description="Gestão de contratos de clientes"
        actions={
          <Button onClick={() => { setForm(emptyForm); setEditing(null); setOpen(true); }}>
            <Plus size={16} className="mr-2" /> Novo Contrato
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-56 h-9" />
        </div>
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Clientes</SelectItem>
            {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUS_CONTRATO.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TIPOS_CONTRATACAO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto max-h-[calc(100vh-260px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Nº Contrato</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum contrato encontrado</TableCell></TableRow>
            ) : filtered.map((c: any) => (
              <TableRow key={c.id} className={!c.ativo ? "opacity-50" : ""}>
                <TableCell className="font-medium">{clienteLabel(c)}</TableCell>
                <TableCell>{c.numero_contrato || "—"}</TableCell>
                <TableCell className="max-w-48 truncate">{c.descricao}</TableCell>
                <TableCell>{TIPOS_CONTRATACAO.find(t => t.value === c.tipo_contratacao)?.label || c.tipo_contratacao}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatCurrency(c.valor_total_contrato)}</TableCell>
                <TableCell className="text-xs">{c.data_inicio}</TableCell>
                <TableCell className="text-xs">
                  <span className={c.data_fim < today ? "text-destructive" : ""}>{c.data_fim}</span>
                </TableCell>
                <TableCell>{getStatusBadge(c.status_contrato)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}>
                    <Pencil size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature size={18} />
              {editing ? "Editar Contrato" : "Novo Contrato"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Linha 1: Cliente + Número */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={v => setForm(f => ({ ...f, cliente_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nº Contrato</Label>
                <Input value={form.numero_contrato} onChange={e => setForm(f => ({ ...f, numero_contrato: e.target.value }))} />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Data Início *</Label>
                <Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data Fim *</Label>
                <Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data Assinatura</Label>
                <Input type="date" value={form.data_assinatura} onChange={e => setForm(f => ({ ...f, data_assinatura: e.target.value }))} />
              </div>
            </div>

            {/* Comercial */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo Contratação</Label>
                <Select value={form.tipo_contratacao} onValueChange={v => setForm(f => ({ ...f, tipo_contratacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONTRATACAO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Forma Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm(f => ({ ...f, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor Total</Label>
                <Input type="number" step="0.01" value={form.valor_total_contrato} onChange={e => setForm(f => ({ ...f, valor_total_contrato: e.target.value }))} />
              </div>
            </div>

            {/* Condição + Status */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Condição Pagamento</Label>
                <Input placeholder="Ex: 30 dias" value={form.condicao_pagamento} onChange={e => setForm(f => ({ ...f, condicao_pagamento: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status_contrato} onValueChange={v => setForm(f => ({ ...f, status_contrato: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_CONTRATO.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Moeda</Label>
                <Input value={form.moeda} onChange={e => setForm(f => ({ ...f, moeda: e.target.value }))} />
              </div>
            </div>

            {/* Operacional */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Gestor do Contrato</Label>
                <Select value={form.gestor_contrato_id || "none"} onValueChange={v => setForm(f => ({ ...f, gestor_contrato_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {auditores.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Parceiro Responsável</Label>
                <Input value={form.parceiro_responsavel} onChange={e => setForm(f => ({ ...f, parceiro_responsavel: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Centro de Custo</Label>
                <Input value={form.centro_custo} onChange={e => setForm(f => ({ ...f, centro_custo: e.target.value }))} />
              </div>
            </div>

            {/* Jurídico */}
            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Prazo Aviso Prévio (dias)</Label>
                <Input type="number" value={form.prazo_aviso_previo} onChange={e => setForm(f => ({ ...f, prazo_aviso_previo: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3 pb-1">
                <Switch checked={form.renovacao_automatica} onCheckedChange={v => setForm(f => ({ ...f, renovacao_automatica: v }))} />
                <Label>Renovação Automática</Label>
              </div>
              <div className="flex items-center gap-3 pb-1">
                <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
                <Label>Ativo</Label>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
