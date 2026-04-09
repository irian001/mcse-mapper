import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { fetchContas, fetchRegras } from "@/lib/supabase-queries";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Search, Plus, X, Pencil, Filter, FileText, Settings } from "lucide-react";
import RegrasDocumentosPanel from "@/components/regras/RegrasDocumentosPanel";

const GRUPOS_DOCUMENTAIS = [
  "contabil", "fiscal", "regulatorio", "societario", "trabalhista", "ambiental", "outro",
];

const grupoLabel: Record<string, string> = {
  contabil: "Contábil", fiscal: "Fiscal", regulatorio: "Regulatório",
  societario: "Societário", trabalhista: "Trabalhista", ambiental: "Ambiental", outro: "Outro",
};

type RegraRow = {
  id: string;
  conta_mcse_id: string;
  codigo_mcse: string | null;
  descricao_mcse: string | null;
  conta_critica: boolean;
  exige_documento_obrigatorio: boolean;
  exige_revisao_humana: boolean;
  exige_conciliacao_reg_soc: boolean;
  materialidade_padrao: number | null;
  limite_variacao_percentual: number | null;
  limite_variacao_absoluta: number | null;
  grupo_documental: string | null;
  gera_solicitacao_automatica: boolean;
  ativo: boolean;
  observacao_regra: string | null;
};

const emptyForm = {
  conta_mcse_id: "", codigo_mcse: "", descricao_mcse: "",
  conta_critica: false, exige_documento_obrigatorio: false,
  exige_revisao_humana: false, exige_conciliacao_reg_soc: false,
  materialidade_padrao: "", limite_variacao_percentual: "",
  limite_variacao_absoluta: "", grupo_documental: "",
  gera_solicitacao_automatica: false, ativo: true, observacao_regra: "",
};

export default function RegrasPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<RegraRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCritica, setFilterCritica] = useState<string>("all");
  const [filterSolicitacao, setFilterSolicitacao] = useState<string>("all");
  const [filterAtivo, setFilterAtivo] = useState<string>("all");

  const { data: contas = [] } = useQuery({
    queryKey: ["mcse_contas_all"],
    queryFn: async () => { const { data } = await fetchContas(); return data || []; },
  });

  const { data: regras = [], isLoading } = useQuery({
    queryKey: ["regras_all"],
    queryFn: async () => { const { data } = await fetchRegras(); return (data || []) as RegraRow[]; },
  });

  const contasComRegra = new Set(regras.map((r) => r.conta_mcse_id));

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };

  const openEdit = (r: RegraRow) => {
    setEditing(r);
    setForm({
      conta_mcse_id: r.conta_mcse_id, codigo_mcse: r.codigo_mcse || "", descricao_mcse: r.descricao_mcse || "",
      conta_critica: r.conta_critica, exige_documento_obrigatorio: r.exige_documento_obrigatorio,
      exige_revisao_humana: r.exige_revisao_humana, exige_conciliacao_reg_soc: r.exige_conciliacao_reg_soc,
      materialidade_padrao: r.materialidade_padrao?.toString() || "",
      limite_variacao_percentual: r.limite_variacao_percentual?.toString() || "",
      limite_variacao_absoluta: r.limite_variacao_absoluta?.toString() || "",
      grupo_documental: r.grupo_documental || "", gera_solicitacao_automatica: r.gera_solicitacao_automatica,
      ativo: r.ativo, observacao_regra: r.observacao_regra || "",
    });
    setShowForm(true);
  };

  const handleSelectConta = (contaId: string) => {
    const conta = contas.find((c: any) => c.id === contaId);
    if (conta) {
      setForm((f) => ({ ...f, conta_mcse_id: contaId, codigo_mcse: conta.codigo_mcse, descricao_mcse: conta.descricao_conta, conta_critica: conta.conta_critica || false }));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.conta_mcse_id) throw new Error("Selecione uma conta MCSE");
      const payload = {
        conta_mcse_id: form.conta_mcse_id, codigo_mcse: form.codigo_mcse || null,
        descricao_mcse: form.descricao_mcse || null, conta_critica: form.conta_critica,
        exige_documento_obrigatorio: form.exige_documento_obrigatorio,
        exige_revisao_humana: form.exige_revisao_humana,
        exige_conciliacao_reg_soc: form.exige_conciliacao_reg_soc,
        materialidade_padrao: form.materialidade_padrao ? parseFloat(form.materialidade_padrao) : null,
        limite_variacao_percentual: form.limite_variacao_percentual ? parseFloat(form.limite_variacao_percentual) : null,
        limite_variacao_absoluta: form.limite_variacao_absoluta ? parseFloat(form.limite_variacao_absoluta) : null,
        grupo_documental: form.grupo_documental || null, gera_solicitacao_automatica: form.gera_solicitacao_automatica,
        ativo: form.ativo, observacao_regra: form.observacao_regra || null,
      };
      if (editing) {
        const { error } = await supabase.from("mcse_regras_conta").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mcse_regras_conta").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regras_all"] });
      toast.success(editing ? "Regra atualizada!" : "Regra criada!");
      setShowForm(false);
    },
    onError: (e: any) => {
      if (e?.message?.includes("unique") || e?.code === "23505") toast.error("Já existe uma regra para esta conta MCSE.");
      else toast.error(e?.message || "Erro ao salvar regra");
    },
  });

  const filtered = regras.filter((r) => {
    if (search) { const s = search.toLowerCase(); if (!(r.codigo_mcse || "").toLowerCase().includes(s) && !(r.descricao_mcse || "").toLowerCase().includes(s)) return false; }
    if (filterCritica === "sim" && !r.conta_critica) return false;
    if (filterCritica === "nao" && r.conta_critica) return false;
    if (filterSolicitacao === "sim" && !r.gera_solicitacao_automatica) return false;
    if (filterSolicitacao === "nao" && r.gera_solicitacao_automatica) return false;
    if (filterAtivo === "sim" && !r.ativo) return false;
    if (filterAtivo === "nao" && r.ativo) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Regras MCSE" description="Regras de auditoria e documentos por conta MCSE" />

      <Tabs defaultValue="regras" className="space-y-4">
        <TabsList>
          <TabsTrigger value="regras" className="gap-1.5"><Settings size={14} /> Regras</TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1.5"><FileText size={14} /> Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="regras">
          {showForm ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{editing ? "Editar Regra" : "Nova Regra MCSE"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={16} /></Button>
              </CardHeader>
              <CardContent className="space-y-5">
                {!editing && (
                  <div>
                    <Label>Conta MCSE *</Label>
                    <Select value={form.conta_mcse_id} onValueChange={handleSelectConta}>
                      <SelectTrigger><SelectValue placeholder="Selecione a conta MCSE" /></SelectTrigger>
                      <SelectContent>
                        {contas.filter((c: any) => !contasComRegra.has(c.id)).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="font-mono text-xs mr-2">{c.codigo_mcse}</span>{c.descricao_conta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {editing && (
                  <div className="bg-muted/50 rounded p-3">
                    <span className="font-mono text-xs text-muted-foreground mr-2">{form.codigo_mcse}</span>
                    <span className="text-sm font-medium">{form.descricao_mcse}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.conta_critica} onCheckedChange={(v) => setForm((f) => ({ ...f, conta_critica: !!v }))} /> Conta Crítica</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.exige_documento_obrigatorio} onCheckedChange={(v) => setForm((f) => ({ ...f, exige_documento_obrigatorio: !!v }))} /> Documento Obrigatório</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.exige_revisao_humana} onCheckedChange={(v) => setForm((f) => ({ ...f, exige_revisao_humana: !!v }))} /> Revisão Humana</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.exige_conciliacao_reg_soc} onCheckedChange={(v) => setForm((f) => ({ ...f, exige_conciliacao_reg_soc: !!v }))} /> Conciliação REG/SOC</label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Materialidade Padrão</Label><Input type="number" step="0.01" value={form.materialidade_padrao} onChange={(e) => setForm((f) => ({ ...f, materialidade_padrao: e.target.value }))} /></div>
                  <div><Label>Variação Percentual (%)</Label><Input type="number" step="0.01" value={form.limite_variacao_percentual} onChange={(e) => setForm((f) => ({ ...f, limite_variacao_percentual: e.target.value }))} /></div>
                  <div><Label>Variação Absoluta</Label><Input type="number" step="0.01" value={form.limite_variacao_absoluta} onChange={(e) => setForm((f) => ({ ...f, limite_variacao_absoluta: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Grupo Documental</Label>
                    <Select value={form.grupo_documental} onValueChange={(v) => setForm((f) => ({ ...f, grupo_documental: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{GRUPOS_DOCUMENTAIS.map((g) => (<SelectItem key={g} value={g}>{grupoLabel[g]}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.gera_solicitacao_automatica} onCheckedChange={(v) => setForm((f) => ({ ...f, gera_solicitacao_automatica: !!v }))} /> Gera Solicitação Automática</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: !!v }))} /> Ativo</label>
                  </div>
                </div>
                <div><Label>Observações</Label><Textarea value={form.observacao_regra} onChange={(e) => setForm((f) => ({ ...f, observacao_regra: e.target.value }))} rows={3} /></div>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.conta_mcse_id}>
                  <Save size={14} className="mr-1" /> {editing ? "Salvar Alterações" : "Criar Regra"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input placeholder="Buscar código ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                </div>
                <Select value={filterCritica} onValueChange={setFilterCritica}>
                  <SelectTrigger className="w-[150px]"><Filter size={12} className="mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Criticidade</SelectItem><SelectItem value="sim">Crítica</SelectItem><SelectItem value="nao">Não crítica</SelectItem></SelectContent>
                </Select>
                <Select value={filterSolicitacao} onValueChange={setFilterSolicitacao}>
                  <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Solicitação</SelectItem><SelectItem value="sim">Gera solic.</SelectItem><SelectItem value="nao">Não gera</SelectItem></SelectContent>
                </Select>
                <Select value={filterAtivo} onValueChange={setFilterAtivo}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Status</SelectItem><SelectItem value="sim">Ativo</SelectItem><SelectItem value="nao">Inativo</SelectItem></SelectContent>
                </Select>
                <Button onClick={openNew}><Plus size={14} className="mr-1" /> Nova Regra</Button>
              </div>
              <div className="rounded border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead><TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Crítica</TableHead><TableHead className="text-center">Doc. Obrig.</TableHead>
                      <TableHead className="text-center">Rev. Humana</TableHead><TableHead className="text-center">Conc. REG/SOC</TableHead>
                      <TableHead>Grupo Doc.</TableHead><TableHead className="text-center">Solic. Auto</TableHead>
                      <TableHead className="text-center">Ativo</TableHead><TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-12">{isLoading ? "Carregando..." : "Nenhuma regra encontrada"}</TableCell></TableRow>
                    )}
                    {filtered.map((r) => (
                      <TableRow key={r.id} className={!r.ativo ? "opacity-50" : ""}>
                        <TableCell className="font-mono text-xs">{r.codigo_mcse}</TableCell>
                        <TableCell className="text-sm max-w-[250px] truncate">{r.descricao_mcse}</TableCell>
                        <TableCell className="text-center">{r.conta_critica ? <Badge variant="destructive" className="text-xs">Sim</Badge> : "—"}</TableCell>
                        <TableCell className="text-center">{r.exige_documento_obrigatorio ? "✓" : "—"}</TableCell>
                        <TableCell className="text-center">{r.exige_revisao_humana ? "✓" : "—"}</TableCell>
                        <TableCell className="text-center">{r.exige_conciliacao_reg_soc ? "✓" : "—"}</TableCell>
                        <TableCell className="text-sm">{r.grupo_documental ? grupoLabel[r.grupo_documental] || r.grupo_documental : "—"}</TableCell>
                        <TableCell className="text-center">{r.gera_solicitacao_automatica ? "✓" : "—"}</TableCell>
                        <TableCell className="text-center">{r.ativo ? <Badge className="bg-success/15 text-success border-success/30 text-xs" variant="outline">Ativo</Badge> : <Badge variant="outline" className="text-xs">Inativo</Badge>}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={14} /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{filtered.length} regra(s) encontrada(s)</p>
            </>
          )}
        </TabsContent>

        <TabsContent value="documentos">
          <RegrasDocumentosPanel regras={regras} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
