import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchClientes, fetchExercicios, fetchParametros } from "@/lib/supabase-queries";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Building2, Calendar, Settings } from "lucide-react";

type StatusCliente = "ativo" | "inativo" | "prospecto";
type StatusExercicio = "aberto" | "em_andamento" | "fechado" | "arquivado";

export default function ClientesPage() {
  const qc = useQueryClient();
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: async () => { const { data } = await fetchClientes(); return data || []; } });

  const [clienteDialog, setClienteDialog] = useState(false);
  const [editCliente, setEditCliente] = useState<any>(null);
  const [clienteForm, setClienteForm] = useState({ razao_social: "", nome_fantasia: "", cnpj: "", status: "ativo" as StatusCliente });

  const [selectedCliente, setSelectedCliente] = useState<any>(null);

  // Exercicios
  const { data: exercicios = [] } = useQuery({
    queryKey: ["exercicios", selectedCliente?.id],
    queryFn: async () => { if (!selectedCliente) return []; const { data } = await fetchExercicios(selectedCliente.id); return data || []; },
    enabled: !!selectedCliente,
  });
  const [exercicioDialog, setExercicioDialog] = useState(false);
  const [exercicioForm, setExercicioForm] = useState({ ano_exercicio: new Date().getFullYear(), data_inicio: "", data_fim: "", status: "aberto" as StatusExercicio });

  // Parametros
  const { data: parametros } = useQuery({
    queryKey: ["parametros", selectedCliente?.id],
    queryFn: async () => { if (!selectedCliente) return null; const { data } = await fetchParametros(selectedCliente.id); return data; },
    enabled: !!selectedCliente,
  });
  const [paramDialog, setParamDialog] = useState(false);
  const [paramForm, setParamForm] = useState({ materialidade_global: "", limite_variacao_padrao: "", erp_principal: "", observacoes: "" });

  const saveCliente = useMutation({
    mutationFn: async () => {
      if (editCliente) {
        await supabase.from("clientes").update(clienteForm).eq("id", editCliente.id);
      } else {
        await supabase.from("clientes").insert(clienteForm);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clientes"] }); setClienteDialog(false); toast.success("Cliente salvo!"); }
  });

  const saveExercicio = useMutation({
    mutationFn: async () => {
      await supabase.from("exercicios").insert({ ...exercicioForm, cliente_id: selectedCliente.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exercicios"] }); setExercicioDialog(false); toast.success("Exercício salvo!"); }
  });

  const saveParametros = useMutation({
    mutationFn: async () => {
      const payload = {
        cliente_id: selectedCliente.id,
        materialidade_global: paramForm.materialidade_global ? parseFloat(paramForm.materialidade_global) : null,
        limite_variacao_padrao: paramForm.limite_variacao_padrao ? parseFloat(paramForm.limite_variacao_padrao) : null,
        erp_principal: paramForm.erp_principal || null,
        observacoes: paramForm.observacoes || null,
      };
      if (parametros) {
        await supabase.from("cliente_parametros").update(payload).eq("id", parametros.id);
      } else {
        await supabase.from("cliente_parametros").insert(payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["parametros"] }); setParamDialog(false); toast.success("Parâmetros salvos!"); }
  });

  const openNewCliente = () => { setEditCliente(null); setClienteForm({ razao_social: "", nome_fantasia: "", cnpj: "", status: "ativo" }); setClienteDialog(true); };
  const openEditCliente = (c: any) => { setEditCliente(c); setClienteForm({ razao_social: c.razao_social, nome_fantasia: c.nome_fantasia || "", cnpj: c.cnpj, status: c.status }); setClienteDialog(true); };

  const openNewExercicio = () => {
    setExercicioForm({ ano_exercicio: new Date().getFullYear(), data_inicio: `${new Date().getFullYear()}-01-01`, data_fim: `${new Date().getFullYear()}-12-31`, status: "aberto" });
    setExercicioDialog(true);
  };

  const openParamDialog = () => {
    setParamForm({
      materialidade_global: parametros?.materialidade_global?.toString() || "",
      limite_variacao_padrao: parametros?.limite_variacao_padrao?.toString() || "",
      erp_principal: parametros?.erp_principal || "",
      observacoes: parametros?.observacoes || "",
    });
    setParamDialog(true);
  };

  return (
    <div>
      <PageHeader title="Clientes" description="Cadastro de empresas permissionárias" actions={<Button size="sm" onClick={openNewCliente}><Plus size={14} className="mr-1" /> Novo Cliente</Button>} />

      <div className="grid grid-cols-3 gap-6">
        {/* Lista de clientes */}
        <div className="col-span-1">
          <div className="rounded border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="w-20">Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {clientes.map((c: any) => (
                  <TableRow key={c.id} className={`cursor-pointer ${selectedCliente?.id === c.id ? "bg-primary/5" : ""}`} onClick={() => setSelectedCliente(c)}>
                    <TableCell>
                      <div className="font-medium text-sm">{c.razao_social}</div>
                      <div className="text-xs text-muted-foreground font-mono">{c.cnpj}</div>
                    </TableCell>
                    <TableCell><StatusBadge status={c.status === "ativo" ? "ativo" : "inativo"} /></TableCell>
                  </TableRow>
                ))}
                {clientes.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Nenhum cliente</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Detalhe do cliente */}
        <div className="col-span-2">
          {selectedCliente ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><Building2 size={18} />{selectedCliente.razao_social}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => openEditCliente(selectedCliente)}><Pencil size={14} className="mr-1" /> Editar</Button>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="grid grid-cols-2 gap-2">
                    <div>CNPJ: <span className="font-mono text-foreground">{selectedCliente.cnpj}</span></div>
                    <div>Nome Fantasia: <span className="text-foreground">{selectedCliente.nome_fantasia || "—"}</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* Exercícios */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Calendar size={16} />Exercícios</CardTitle>
                  <Button variant="outline" size="sm" onClick={openNewExercicio}><Plus size={14} className="mr-1" /> Novo</Button>
                </CardHeader>
                <CardContent>
                  {exercicios.length > 0 ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>Ano</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {exercicios.map((e: any) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-mono">{e.ano_exercicio}</TableCell>
                            <TableCell>{e.data_inicio}</TableCell>
                            <TableCell>{e.data_fim}</TableCell>
                            <TableCell className="capitalize text-sm">{e.status?.replace("_", " ")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <p className="text-sm text-muted-foreground">Nenhum exercício cadastrado</p>}
                </CardContent>
              </Card>

              {/* Parâmetros */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Settings size={16} />Parâmetros</CardTitle>
                  <Button variant="outline" size="sm" onClick={openParamDialog}><Pencil size={14} className="mr-1" /> Editar</Button>
                </CardHeader>
                <CardContent className="text-sm">
                  {parametros ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>Materialidade global: <span className="font-mono text-foreground">{parametros.materialidade_global || "—"}</span></div>
                      <div>Variação padrão: <span className="font-mono text-foreground">{parametros.limite_variacao_padrao || "—"}</span></div>
                      <div>ERP principal: <span className="text-foreground">{parametros.erp_principal || "—"}</span></div>
                    </div>
                  ) : <p className="text-muted-foreground">Parâmetros não definidos</p>}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">Selecione um cliente para ver detalhes</div>
          )}
        </div>
      </div>

      {/* Cliente Dialog */}
      <Dialog open={clienteDialog} onOpenChange={setClienteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Razão Social</Label><Input value={clienteForm.razao_social} onChange={e => setClienteForm(f => ({ ...f, razao_social: e.target.value }))} /></div>
            <div><Label>Nome Fantasia</Label><Input value={clienteForm.nome_fantasia} onChange={e => setClienteForm(f => ({ ...f, nome_fantasia: e.target.value }))} /></div>
            <div><Label>CNPJ</Label><Input value={clienteForm.cnpj} onChange={e => setClienteForm(f => ({ ...f, cnpj: e.target.value }))} /></div>
            <div>
              <Label>Status</Label>
              <Select value={clienteForm.status} onValueChange={v => setClienteForm(f => ({ ...f, status: v as StatusCliente }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="prospecto">Prospecto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => saveCliente.mutate()} disabled={saveCliente.isPending}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exercicio Dialog */}
      <Dialog open={exercicioDialog} onOpenChange={setExercicioDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Exercício</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Ano</Label><Input type="number" value={exercicioForm.ano_exercicio} onChange={e => setExercicioForm(f => ({ ...f, ano_exercicio: parseInt(e.target.value) }))} /></div>
            <div><Label>Data Início</Label><Input type="date" value={exercicioForm.data_inicio} onChange={e => setExercicioForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
            <div><Label>Data Fim</Label><Input type="date" value={exercicioForm.data_fim} onChange={e => setExercicioForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => saveExercicio.mutate()} disabled={saveExercicio.isPending}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Parametros Dialog */}
      <Dialog open={paramDialog} onOpenChange={setParamDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Parâmetros do Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Materialidade Global</Label><Input type="number" step="0.01" value={paramForm.materialidade_global} onChange={e => setParamForm(f => ({ ...f, materialidade_global: e.target.value }))} /></div>
            <div><Label>Limite Variação Padrão (%)</Label><Input type="number" step="0.01" value={paramForm.limite_variacao_padrao} onChange={e => setParamForm(f => ({ ...f, limite_variacao_padrao: e.target.value }))} /></div>
            <div><Label>ERP Principal</Label><Input value={paramForm.erp_principal} onChange={e => setParamForm(f => ({ ...f, erp_principal: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={paramForm.observacoes} onChange={e => setParamForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => saveParametros.mutate()} disabled={saveParametros.isPending}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
