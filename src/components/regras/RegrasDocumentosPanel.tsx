import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { fetchRegrasDocumentos } from "@/lib/supabase-queries";
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

type DocRow = {
  id: string;
  regra_mcse_id: string;
  conta_mcse_id: string;
  codigo_mcse: string | null;
  descricao_mcse: string | null;
  tipo_documento: string;
  descricao_documento: string;
  obrigatorio: boolean;
  ordem_solicitacao: number;
  formato_aceito: string | null;
  permite_pdf: boolean;
  permite_excel: boolean;
  ativo: boolean;
  observacao: string | null;
};

const emptyDocForm = {
  tipo_documento: "",
  descricao_documento: "",
  obrigatorio: true,
  ordem_solicitacao: "1",
  formato_aceito: "pdf",
  permite_pdf: true,
  permite_excel: false,
  ativo: true,
  observacao: "",
};

interface Props {
  regras: RegraRow[];
}

export default function RegrasDocumentosPanel({ regras }: Props) {
  const qc = useQueryClient();
  const [selectedRegraId, setSelectedRegraId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DocRow | null>(null);
  const [form, setForm] = useState(emptyDocForm);
  const [search, setSearch] = useState("");
  const [filterObrigatorio, setFilterObrigatorio] = useState<string>("all");
  const [filterAtivo, setFilterAtivo] = useState<string>("all");

  const selectedRegra = regras.find((r) => r.id === selectedRegraId);

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["regras_documentos", selectedRegraId],
    queryFn: async () => {
      if (!selectedRegraId) return [];
      const { data } = await fetchRegrasDocumentos(selectedRegraId);
      return (data || []) as DocRow[];
    },
    enabled: !!selectedRegraId,
  });

  const openNew = () => {
    setEditing(null);
    const nextOrdem = documentos.length > 0 ? Math.max(...documentos.map((d) => d.ordem_solicitacao)) + 1 : 1;
    setForm({ ...emptyDocForm, ordem_solicitacao: String(nextOrdem) });
    setShowForm(true);
  };

  const openEdit = (d: DocRow) => {
    setEditing(d);
    setForm({
      tipo_documento: d.tipo_documento,
      descricao_documento: d.descricao_documento,
      obrigatorio: d.obrigatorio,
      ordem_solicitacao: String(d.ordem_solicitacao),
      formato_aceito: d.formato_aceito || "pdf",
      permite_pdf: d.permite_pdf,
      permite_excel: d.permite_excel,
      ativo: d.ativo,
      observacao: d.observacao || "",
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRegra) throw new Error("Selecione uma regra MCSE");
      if (!form.tipo_documento.trim()) throw new Error("Informe o tipo de documento");
      if (!form.descricao_documento.trim()) throw new Error("Informe a descrição do documento");

      const payload = {
        regra_mcse_id: selectedRegra.id,
        conta_mcse_id: selectedRegra.conta_mcse_id,
        codigo_mcse: selectedRegra.codigo_mcse,
        descricao_mcse: selectedRegra.descricao_mcse,
        tipo_documento: form.tipo_documento.trim(),
        descricao_documento: form.descricao_documento.trim(),
        obrigatorio: form.obrigatorio,
        ordem_solicitacao: parseInt(form.ordem_solicitacao) || 1,
        formato_aceito: form.formato_aceito || "pdf",
        permite_pdf: form.permite_pdf,
        permite_excel: form.permite_excel,
        ativo: form.ativo,
        observacao: form.observacao || null,
      };

      if (editing) {
        const { error } = await supabase.from("mcse_regras_documentos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mcse_regras_documentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regras_documentos", selectedRegraId] });
      toast.success(editing ? "Documento atualizado!" : "Documento criado!");
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar documento"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mcse_regras_documentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regras_documentos", selectedRegraId] });
      toast.success("Documento excluído!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao excluir"),
  });

  const filtered = documentos.filter((d) => {
    if (search) {
      const s = search.toLowerCase();
      if (!d.tipo_documento.toLowerCase().includes(s) && !d.descricao_documento.toLowerCase().includes(s)) return false;
    }
    if (filterObrigatorio === "sim" && !d.obrigatorio) return false;
    if (filterObrigatorio === "nao" && d.obrigatorio) return false;
    if (filterAtivo === "sim" && !d.ativo) return false;
    if (filterAtivo === "nao" && d.ativo) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Seletor de regra */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[280px] max-w-md">
          <Label>Regra MCSE (conta/grupo)</Label>
          <Select value={selectedRegraId} onValueChange={(v) => { setSelectedRegraId(v); setShowForm(false); }}>
            <SelectTrigger><SelectValue placeholder="Selecione uma regra MCSE..." /></SelectTrigger>
            <SelectContent>
              {regras.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="font-mono text-xs mr-2">{r.codigo_mcse}</span>
                  {r.descricao_mcse}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedRegraId && !showForm && (
          <Button onClick={openNew}><Plus size={14} className="mr-1" /> Novo Documento</Button>
        )}
      </div>

      {!selectedRegraId && (
        <p className="text-sm text-muted-foreground py-8 text-center">Selecione uma regra MCSE para gerenciar seus documentos.</p>
      )}

      {selectedRegraId && showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{editing ? "Editar Documento" : "Novo Documento"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={16} /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded p-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground mr-2">{selectedRegra?.codigo_mcse}</span>
              <span className="font-medium">{selectedRegra?.descricao_mcse}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Documento *</Label>
                <Input value={form.tipo_documento} onChange={(e) => setForm((f) => ({ ...f, tipo_documento: e.target.value }))} placeholder="Ex: Balancete mensal, Razão contábil..." />
              </div>
              <div>
                <Label>Ordem de Solicitação</Label>
                <Input type="number" min="1" value={form.ordem_solicitacao} onChange={(e) => setForm((f) => ({ ...f, ordem_solicitacao: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Descrição do Documento *</Label>
              <Textarea value={form.descricao_documento} onChange={(e) => setForm((f) => ({ ...f, descricao_documento: e.target.value }))} rows={2} placeholder="Descreva o documento esperado..." />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.obrigatorio} onCheckedChange={(v) => setForm((f) => ({ ...f, obrigatorio: !!v }))} />
                Obrigatório
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.permite_pdf} onCheckedChange={(v) => setForm((f) => ({ ...f, permite_pdf: !!v }))} />
                Permite PDF
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.permite_excel} onCheckedChange={(v) => setForm((f) => ({ ...f, permite_excel: !!v }))} />
                Permite Excel
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: !!v }))} />
                Ativo
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Formato Aceito</Label>
                <Select value={form.formato_aceito} onValueChange={(v) => setForm((f) => ({ ...f, formato_aceito: v }))}>
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
                <Label>Observação</Label>
                <Input value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} />
              </div>
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.tipo_documento.trim()}>
              <Save size={14} className="mr-1" /> {editing ? "Salvar Alterações" : "Criar Documento"}
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedRegraId && !showForm && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Buscar tipo ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filterObrigatorio} onValueChange={setFilterObrigatorio}>
              <SelectTrigger className="w-[150px]"><Filter size={12} className="mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Obrigatoriedade</SelectItem>
                <SelectItem value="sim">Obrigatório</SelectItem>
                <SelectItem value="nao">Complementar</SelectItem>
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
                  <TableHead>Tipo Documento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Obrigatório</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead className="text-center">PDF</TableHead>
                  <TableHead className="text-center">Excel</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      {isLoading ? "Carregando..." : "Nenhum documento cadastrado para esta regra"}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((d) => (
                  <TableRow key={d.id} className={!d.ativo ? "opacity-50" : ""}>
                    <TableCell className="text-center font-mono text-xs">{d.ordem_solicitacao}</TableCell>
                    <TableCell className="text-sm font-medium">{d.tipo_documento}</TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">{d.descricao_documento}</TableCell>
                    <TableCell className="text-center">{d.obrigatorio ? <Badge variant="destructive" className="text-xs">Sim</Badge> : "—"}</TableCell>
                    <TableCell className="text-xs">{d.formato_aceito || "—"}</TableCell>
                    <TableCell className="text-center">{d.permite_pdf ? "✓" : "—"}</TableCell>
                    <TableCell className="text-center">{d.permite_excel ? "✓" : "—"}</TableCell>
                    <TableCell className="text-center">{d.ativo ? <Badge className="bg-success/15 text-success border-success/30 text-xs" variant="outline">Ativo</Badge> : <Badge variant="outline" className="text-xs">Inativo</Badge>}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir este documento?")) deleteMutation.mutate(d.id); }}><Trash2 size={14} className="text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} documento(s)</p>
        </>
      )}
    </div>
  );
}
