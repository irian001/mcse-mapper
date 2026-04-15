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
import { Plus, Pencil, Search, Package } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS = [
  { value: "auditoria_contabil", label: "Auditoria Contábil" },
  { value: "auditoria_regulatoria", label: "Auditoria Regulatória" },
  { value: "revisao_limitada", label: "Revisão Limitada" },
  { value: "ppa", label: "PPA" },
  { value: "outros", label: "Outros" },
];

const SEGMENTOS = [
  { value: "setor_eletrico", label: "Setor Elétrico" },
  { value: "cooperativas_credito", label: "Cooperativas de Crédito" },
  { value: "industria", label: "Indústria" },
  { value: "outros", label: "Outros" },
];

const SUBTIPOS = [
  { value: "societaria", label: "Societária" },
  { value: "regulatoria", label: "Regulatória" },
  { value: "consolidada", label: "Consolidada" },
  { value: "individual", label: "Individual" },
];

const COMPLEXIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

const RISCOS = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
];

type Produto = {
  id: string;
  codigo_produto: string;
  nome_produto: string;
  descricao: string | null;
  categoria: string;
  segmento: string;
  subtipo: string;
  complexidade_padrao: string;
  risco_padrao: string;
  horas_base_estimadas: number | null;
  valor_base_referencia: number | null;
  exige_balancete: boolean;
  exige_documentacao: boolean;
  ativo: boolean;
};

const emptyForm = {
  codigo_produto: "",
  nome_produto: "",
  descricao: "",
  categoria: "auditoria_contabil",
  segmento: "setor_eletrico",
  subtipo: "societaria",
  complexidade_padrao: "media",
  risco_padrao: "medio",
  horas_base_estimadas: "",
  valor_base_referencia: "",
  exige_balancete: true,
  exige_documentacao: true,
  ativo: true,
};

export default function ProdutosAuditoriaPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("all");
  const [filtroSegmento, setFiltroSegmento] = useState("all");
  const [filtroAtivo, setFiltroAtivo] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos-auditoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos_auditoria")
        .select("*")
        .order("codigo_produto");
      if (error) throw error;
      return data as Produto[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        codigo_produto: values.codigo_produto.trim(),
        nome_produto: values.nome_produto.trim(),
        descricao: values.descricao?.trim() || null,
        categoria: values.categoria as any,
        segmento: values.segmento as any,
        subtipo: values.subtipo as any,
        complexidade_padrao: values.complexidade_padrao as any,
        risco_padrao: values.risco_padrao as any,
        horas_base_estimadas: values.horas_base_estimadas ? Number(values.horas_base_estimadas) : null,
        valor_base_referencia: values.valor_base_referencia ? Number(values.valor_base_referencia) : null,
        exige_balancete: values.exige_balancete,
        exige_documentacao: values.exige_documentacao,
        ativo: values.ativo,
      };

      if (values.id) {
        const { error } = await supabase.from("produtos_auditoria").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos_auditoria").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos-auditoria"] });
      setDialogOpen(false);
      toast.success(editingId ? "Produto atualizado" : "Produto criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: Produto) => {
    setEditingId(p.id);
    setForm({
      codigo_produto: p.codigo_produto,
      nome_produto: p.nome_produto,
      descricao: p.descricao || "",
      categoria: p.categoria,
      segmento: p.segmento,
      subtipo: p.subtipo,
      complexidade_padrao: p.complexidade_padrao,
      risco_padrao: p.risco_padrao,
      horas_base_estimadas: p.horas_base_estimadas?.toString() || "",
      valor_base_referencia: p.valor_base_referencia?.toString() || "",
      exige_balancete: p.exige_balancete,
      exige_documentacao: p.exige_documentacao,
      ativo: p.ativo,
    });
    setDialogOpen(true);
  };

  const filtered = produtos.filter((p) => {
    if (filtroCategoria !== "all" && p.categoria !== filtroCategoria) return false;
    if (filtroSegmento !== "all" && p.segmento !== filtroSegmento) return false;
    if (filtroAtivo === "ativo" && !p.ativo) return false;
    if (filtroAtivo === "inativo" && p.ativo) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.codigo_produto.toLowerCase().includes(s) || p.nome_produto.toLowerCase().includes(s);
    }
    return true;
  });

  const labelCat = (v: string) => CATEGORIAS.find((c) => c.value === v)?.label || v;
  const labelSeg = (v: string) => SEGMENTOS.find((c) => c.value === v)?.label || v;
  const labelCompl = (v: string) => COMPLEXIDADES.find((c) => c.value === v)?.label || v;

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos de Auditoria" description="Catálogo de serviços da firma" />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar código ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Segmento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos segmentos</SelectItem>
            {SEGMENTOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroAtivo} onValueChange={setFiltroAtivo}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openNew}><Plus size={16} className="mr-1" /> Novo Produto</Button>
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Complexidade</TableHead>
              <TableHead className="text-right">Horas Base</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                <Package size={32} className="mx-auto mb-2 opacity-40" />Nenhum produto encontrado
              </TableCell></TableRow>
            ) : filtered.map((p) => (
              <TableRow key={p.id} className={!p.ativo ? "opacity-50" : ""}>
                <TableCell className="font-mono text-xs">{p.codigo_produto}</TableCell>
                <TableCell className="font-medium">{p.nome_produto}</TableCell>
                <TableCell><Badge variant="outline">{labelCat(p.categoria)}</Badge></TableCell>
                <TableCell className="text-sm">{labelSeg(p.segmento)}</TableCell>
                <TableCell className="text-sm">{labelCompl(p.complexidade_padrao)}</TableCell>
                <TableCell className="text-right tabular-nums">{p.horas_base_estimadas ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto de Auditoria"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editingId || undefined }); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Código *</Label>
                <Input value={form.codigo_produto} onChange={(e) => setForm({ ...form, codigo_produto: e.target.value })} placeholder="AUD-EL-SOC" required />
              </div>
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={form.nome_produto} onChange={(e) => setForm({ ...form, nome_produto: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Segmento</Label>
                <Select value={form.segmento} onValueChange={(v) => setForm({ ...form, segmento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEGMENTOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subtipo</Label>
                <Select value={form.subtipo} onValueChange={(v) => setForm({ ...form, subtipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBTIPOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Complexidade</Label>
                <Select value={form.complexidade_padrao} onValueChange={(v) => setForm({ ...form, complexidade_padrao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPLEXIDADES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Risco Padrão</Label>
                <Select value={form.risco_padrao} onValueChange={(v) => setForm({ ...form, risco_padrao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RISCOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Horas Base Estimadas</Label>
                <Input type="number" step="0.5" min="0" value={form.horas_base_estimadas} onChange={(e) => setForm({ ...form, horas_base_estimadas: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Base Referência (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.valor_base_referencia} onChange={(e) => setForm({ ...form, valor_base_referencia: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.exige_balancete} onCheckedChange={(v) => setForm({ ...form, exige_balancete: v })} />
                <Label>Exige Balancete</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.exige_documentacao} onCheckedChange={(v) => setForm({ ...form, exige_documentacao: v })} />
                <Label>Exige Documentação</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <Label>Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
