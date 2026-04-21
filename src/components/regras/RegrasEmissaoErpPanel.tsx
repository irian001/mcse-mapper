import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { fetchRegrasEmissaoErp } from "@/lib/supabase-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Plus, X, Pencil, Trash2, Search, Filter } from "lucide-react";

type RegraRow = {
  id: string;
  conta_mcse_id: string;
  codigo_mcse: string | null;
  descricao_mcse: string | null;
};

type ErpRow = {
  id: string;
  regra_mcse_id: string;
  conta_mcse_id: string;
  codigo_mcse: string | null;
  descricao_mcse: string | null;
  erp_nome: string;
  nome_relatorio: string;
  modulo_erp: string | null;
  caminho_emissao: string | null;
  filtros_obrigatorios: string | null;
  campos_minimos_esperados: string | null;
  formato_preferencial: string | null;
  ordem: number;
  ativo: boolean;
  observacao: string | null;
};

const emptyForm = {
  erp_nome: "",
  nome_relatorio: "",
  modulo_erp: "",
  caminho_emissao: "",
  filtros_obrigatorios: "",
  campos_minimos_esperados: "",
  formato_preferencial: "pdf",
  ordem: "1",
  ativo: true,
  observacao: "",
};

interface Props {
  regras: RegraRow[];
}

export default function RegrasEmissaoErpPanel({ regras }: Props) {
  const qc = useQueryClient();
  const [selectedRegraId, setSelectedRegraId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ErpRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterFormato, setFilterFormato] = useState("all");
  const [filterAtivo, setFilterAtivo] = useState("all");

  const selectedRegra = regras.find((r) => r.id === selectedRegraId);

  const { data: trilhas = [], isLoading } = useQuery({
    queryKey: ["regras_emissao_erp", selectedRegraId],
    queryFn: async () => {
      if (!selectedRegraId) return [];
      const { data } = await fetchRegrasEmissaoErp(selectedRegraId);
      return (data || []) as ErpRow[];
    },
    enabled: !!selectedRegraId,
  });

  const openNew = () => {
    setEditing(null);
    const nextOrdem = trilhas.length > 0 ? Math.max(...trilhas.map((t) => t.ordem)) + 1 : 1;
    setForm({ ...emptyForm, ordem: String(nextOrdem) });
    setShowForm(true);
  };

  const openEdit = (t: ErpRow) => {
    setEditing(t);
    setForm({
      erp_nome: t.erp_nome,
      nome_relatorio: t.nome_relatorio,
      modulo_erp: t.modulo_erp || "",
      caminho_emissao: t.caminho_emissao || "",
      filtros_obrigatorios: t.filtros_obrigatorios || "",
      campos_minimos_esperados: t.campos_minimos_esperados || "",
      formato_preferencial: t.formato_preferencial || "pdf",
      ordem: String(t.ordem),
      ativo: t.ativo,
      observacao: t.observacao || "",
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRegra) throw new Error("Selecione uma regra de auditoria");
      if (!form.erp_nome.trim()) throw new Error("Informe o nome do ERP");
      if (!form.nome_relatorio.trim()) throw new Error("Informe o nome do relatório");

      const payload = {
        regra_mcse_id: selectedRegra.id,
        conta_mcse_id: selectedRegra.conta_mcse_id,
        codigo_mcse: selectedRegra.codigo_mcse,
        descricao_mcse: selectedRegra.descricao_mcse,
        erp_nome: form.erp_nome.trim(),
        nome_relatorio: form.nome_relatorio.trim(),
        modulo_erp: form.modulo_erp.trim() || null,
        caminho_emissao: form.caminho_emissao.trim() || null,
        filtros_obrigatorios: form.filtros_obrigatorios.trim() || null,
        campos_minimos_esperados: form.campos_minimos_esperados.trim() || null,
        formato_preferencial: form.formato_preferencial || "pdf",
        ordem: parseInt(form.ordem) || 1,
        ativo: form.ativo,
        observacao: form.observacao.trim() || null,
      };

      if (editing) {
        const { error } = await supabase.from("mcse_regras_emissao_erp").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mcse_regras_emissao_erp").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regras_emissao_erp", selectedRegraId] });
      toast.success(editing ? "Trilha ERP atualizada!" : "Trilha ERP criada!");
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar trilha ERP"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mcse_regras_emissao_erp").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regras_emissao_erp", selectedRegraId] });
      toast.success("Trilha ERP excluída!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao excluir"),
  });

  const filtered = trilhas.filter((t) => {
    if (search) {
      const s = search.toLowerCase();
      if (!t.erp_nome.toLowerCase().includes(s) && !t.nome_relatorio.toLowerCase().includes(s) && !(t.modulo_erp || "").toLowerCase().includes(s)) return false;
    }
    if (filterFormato !== "all" && t.formato_preferencial !== filterFormato) return false;
    if (filterAtivo === "sim" && !t.ativo) return false;
    if (filterAtivo === "nao" && t.ativo) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[280px] max-w-md">
          <Label>Regra de Auditoria (grupo contábil)</Label>
          <Select value={selectedRegraId} onValueChange={(v) => { setSelectedRegraId(v); setShowForm(false); }}>
            <SelectTrigger><SelectValue placeholder="Selecione uma regra de auditoria..." /></SelectTrigger>
            <SelectContent>
              {regras.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="font-mono text-xs mr-2">{r.codigo_mcse}</span>{r.descricao_mcse}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedRegraId && !showForm && (
          <Button onClick={openNew}><Plus size={14} className="mr-1" /> Nova Trilha ERP</Button>
        )}
      </div>

      {!selectedRegraId && (
        <p className="text-sm text-muted-foreground py-8 text-center">Selecione uma regra de auditoria para gerenciar suas trilhas de emissão ERP.</p>
      )}

      {selectedRegraId && showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{editing ? "Editar Trilha ERP" : "Nova Trilha ERP"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={16} /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded p-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground mr-2">{selectedRegra?.codigo_mcse}</span>
              <span className="font-medium">{selectedRegra?.descricao_mcse}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Nome do ERP *</Label>
                <Input value={form.erp_nome} onChange={(e) => setForm((f) => ({ ...f, erp_nome: e.target.value }))} placeholder="Ex: SAP, TOTVS..." />
              </div>
              <div>
                <Label>Nome do Relatório *</Label>
                <Input value={form.nome_relatorio} onChange={(e) => setForm((f) => ({ ...f, nome_relatorio: e.target.value }))} placeholder="Ex: Títulos em aberto" />
              </div>
              <div>
                <Label>Módulo ERP</Label>
                <Input value={form.modulo_erp} onChange={(e) => setForm((f) => ({ ...f, modulo_erp: e.target.value }))} placeholder="Ex: Financeiro" />
              </div>
            </div>
            <div>
              <Label>Caminho de Emissão</Label>
              <Input value={form.caminho_emissao} onChange={(e) => setForm((f) => ({ ...f, caminho_emissao: e.target.value }))} placeholder="Ex: Contas a Receber > Relatórios > Títulos em Aberto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Filtros Obrigatórios</Label>
                <Textarea value={form.filtros_obrigatorios} onChange={(e) => setForm((f) => ({ ...f, filtros_obrigatorios: e.target.value }))} rows={3} placeholder="Ex: data-base, status em aberto, empresa" />
              </div>
              <div>
                <Label>Campos Mínimos Esperados</Label>
                <Textarea value={form.campos_minimos_esperados} onChange={(e) => setForm((f) => ({ ...f, campos_minimos_esperados: e.target.value }))} rows={3} placeholder="Ex: código, descrição, valor, vencimento" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Formato Preferencial</Label>
                <Select value={form.formato_preferencial} onValueChange={(v) => setForm((f) => ({ ...f, formato_preferencial: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf_excel">PDF ou Excel</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ordem</Label>
                <Input type="number" min="1" value={form.ordem} onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm pb-2">
                  <Checkbox checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: !!v }))} /> Ativo
                </label>
              </div>
            </div>
            <div>
              <Label>Observação</Label>
              <Input value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} />
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.erp_nome.trim() || !form.nome_relatorio.trim()}>
              <Save size={14} className="mr-1" /> {editing ? "Salvar Alterações" : "Criar Trilha ERP"}
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedRegraId && !showForm && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Buscar ERP, relatório ou módulo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filterFormato} onValueChange={setFilterFormato}>
              <SelectTrigger className="w-[150px]"><Filter size={12} className="mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Formato</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf_excel">PDF ou Excel</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAtivo} onValueChange={setFilterAtivo}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status</SelectItem>
                <SelectItem value="sim">Ativo</SelectItem>
                <SelectItem value="nao">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Ordem</TableHead>
                  <TableHead>ERP</TableHead>
                  <TableHead>Relatório</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">{isLoading ? "Carregando..." : "Nenhuma trilha ERP cadastrada"}</TableCell></TableRow>
                )}
                {filtered.map((t) => (
                  <TableRow key={t.id} className={!t.ativo ? "opacity-50" : ""}>
                    <TableCell className="text-center font-mono text-xs">{t.ordem}</TableCell>
                    <TableCell className="text-sm font-medium">{t.erp_nome}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{t.nome_relatorio}</TableCell>
                    <TableCell className="text-sm">{t.modulo_erp || "—"}</TableCell>
                    <TableCell className="text-xs uppercase">{t.formato_preferencial || "—"}</TableCell>
                    <TableCell className="text-center">{t.ativo ? <Badge className="bg-success/15 text-success border-success/30 text-xs" variant="outline">Ativo</Badge> : <Badge variant="outline" className="text-xs">Inativo</Badge>}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir esta trilha ERP?")) deleteMutation.mutate(t.id); }}><Trash2 size={14} className="text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} trilha(s) ERP</p>
        </>
      )}
    </div>
  );
}
