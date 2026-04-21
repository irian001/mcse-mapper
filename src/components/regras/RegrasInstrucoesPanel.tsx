import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { fetchRegrasInstrucoes } from "@/lib/supabase-queries";
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

type InstrucaoRow = {
  id: string;
  regra_mcse_id: string;
  conta_mcse_id: string;
  codigo_mcse: string | null;
  descricao_mcse: string | null;
  titulo_instrucao: string;
  texto_instrucao: string;
  publico_alvo: string;
  ordem: number;
  ativo: boolean;
};

const PUBLICO_OPTIONS = [
  { value: "cliente", label: "Cliente" },
  { value: "auditor", label: "Auditor" },
  { value: "ambos", label: "Ambos" },
];

const emptyForm = {
  titulo_instrucao: "",
  texto_instrucao: "",
  publico_alvo: "cliente",
  ordem: "1",
  ativo: true,
};

interface Props {
  regras: RegraRow[];
}

export default function RegrasInstrucoesPanel({ regras }: Props) {
  const qc = useQueryClient();
  const [selectedRegraId, setSelectedRegraId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InstrucaoRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterPublico, setFilterPublico] = useState("all");
  const [filterAtivo, setFilterAtivo] = useState("all");

  const selectedRegra = regras.find((r) => r.id === selectedRegraId);

  const { data: instrucoes = [], isLoading } = useQuery({
    queryKey: ["regras_instrucoes", selectedRegraId],
    queryFn: async () => {
      if (!selectedRegraId) return [];
      const { data } = await fetchRegrasInstrucoes(selectedRegraId);
      return (data || []) as InstrucaoRow[];
    },
    enabled: !!selectedRegraId,
  });

  const openNew = () => {
    setEditing(null);
    const nextOrdem = instrucoes.length > 0 ? Math.max(...instrucoes.map((i) => i.ordem)) + 1 : 1;
    setForm({ ...emptyForm, ordem: String(nextOrdem) });
    setShowForm(true);
  };

  const openEdit = (i: InstrucaoRow) => {
    setEditing(i);
    setForm({
      titulo_instrucao: i.titulo_instrucao,
      texto_instrucao: i.texto_instrucao,
      publico_alvo: i.publico_alvo,
      ordem: String(i.ordem),
      ativo: i.ativo,
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRegra) throw new Error("Selecione uma regra de auditoria");
      if (!form.titulo_instrucao.trim()) throw new Error("Informe o título da instrução");

      const payload = {
        regra_mcse_id: selectedRegra.id,
        conta_mcse_id: selectedRegra.conta_mcse_id,
        codigo_mcse: selectedRegra.codigo_mcse,
        descricao_mcse: selectedRegra.descricao_mcse,
        titulo_instrucao: form.titulo_instrucao.trim(),
        texto_instrucao: form.texto_instrucao.trim(),
        publico_alvo: form.publico_alvo,
        ordem: parseInt(form.ordem) || 1,
        ativo: form.ativo,
      };

      if (editing) {
        const { error } = await supabase.from("mcse_regras_instrucoes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mcse_regras_instrucoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regras_instrucoes", selectedRegraId] });
      toast.success(editing ? "Instrução atualizada!" : "Instrução criada!");
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar instrução"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mcse_regras_instrucoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regras_instrucoes", selectedRegraId] });
      toast.success("Instrução excluída!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao excluir"),
  });

  const filtered = instrucoes.filter((i) => {
    if (search) {
      const s = search.toLowerCase();
      if (!i.titulo_instrucao.toLowerCase().includes(s) && !i.texto_instrucao.toLowerCase().includes(s)) return false;
    }
    if (filterPublico !== "all" && i.publico_alvo !== filterPublico) return false;
    if (filterAtivo === "sim" && !i.ativo) return false;
    if (filterAtivo === "nao" && i.ativo) return false;
    return true;
  });

  const publicoLabel = (v: string) => PUBLICO_OPTIONS.find((o) => o.value === v)?.label || v;

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
          <Button onClick={openNew}><Plus size={14} className="mr-1" /> Nova Instrução</Button>
        )}
      </div>

      {!selectedRegraId && (
        <p className="text-sm text-muted-foreground py-8 text-center">Selecione uma regra de auditoria para gerenciar suas instruções.</p>
      )}

      {selectedRegraId && showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{editing ? "Editar Instrução" : "Nova Instrução"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={16} /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded p-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground mr-2">{selectedRegra?.codigo_mcse}</span>
              <span className="font-medium">{selectedRegra?.descricao_mcse}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Título da Instrução *</Label>
                <Input value={form.titulo_instrucao} onChange={(e) => setForm((f) => ({ ...f, titulo_instrucao: e.target.value }))} placeholder="Ex: Emitir relatório com data-base do fechamento" />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input type="number" min="1" value={form.ordem} onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Texto da Instrução</Label>
              <Textarea value={form.texto_instrucao} onChange={(e) => setForm((f) => ({ ...f, texto_instrucao: e.target.value }))} rows={4} placeholder="Descreva a instrução detalhada ao cliente ou auditor..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Público-Alvo</Label>
                <Select value={form.publico_alvo} onValueChange={(v) => setForm((f) => ({ ...f, publico_alvo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PUBLICO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm pb-2">
                  <Checkbox checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: !!v }))} /> Ativo
                </label>
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.titulo_instrucao.trim()}>
              <Save size={14} className="mr-1" /> {editing ? "Salvar Alterações" : "Criar Instrução"}
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedRegraId && !showForm && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Buscar título ou texto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filterPublico} onValueChange={setFilterPublico}>
              <SelectTrigger className="w-[150px]"><Filter size={12} className="mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Público-Alvo</SelectItem>
                {PUBLICO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
                  <TableHead>Título</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">{isLoading ? "Carregando..." : "Nenhuma instrução cadastrada"}</TableCell></TableRow>
                )}
                {filtered.map((i) => (
                  <TableRow key={i.id} className={!i.ativo ? "opacity-50" : ""}>
                    <TableCell className="text-center font-mono text-xs">{i.ordem}</TableCell>
                    <TableCell className="text-sm font-medium max-w-[350px] truncate">{i.titulo_instrucao}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{publicoLabel(i.publico_alvo)}</Badge></TableCell>
                    <TableCell className="text-center">{i.ativo ? <Badge className="bg-success/15 text-success border-success/30 text-xs" variant="outline">Ativo</Badge> : <Badge variant="outline" className="text-xs">Inativo</Badge>}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir esta instrução?")) deleteMutation.mutate(i.id); }}><Trash2 size={14} className="text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} instrução(ões)</p>
        </>
      )}
    </div>
  );
}
