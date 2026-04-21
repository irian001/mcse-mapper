import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
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
import { Plus, Pencil, Building2, Calendar, Settings, Search, MapPin, User } from "lucide-react";

type StatusCliente = "ativo" | "inativo" | "prospecto";
type StatusExercicio = "aberto" | "em_andamento" | "fechado" | "arquivado";

interface ClienteForm {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  status: StatusCliente;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  nome_contador: string;
  email_contato: string;
}

const emptyClienteForm: ClienteForm = {
  razao_social: "", nome_fantasia: "", cnpj: "", status: "ativo",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  nome_contador: "", email_contato: "",
};

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function ClientesPage() {
  const qc = useQueryClient();
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: async () => { const { data } = await fetchClientes(); return data || []; } });

  const [clienteDialog, setClienteDialog] = useState(false);
  const [editCliente, setEditCliente] = useState<any>(null);
  const [clienteForm, setClienteForm] = useState<ClienteForm>(emptyClienteForm);
  const [buscandoCep, setBuscandoCep] = useState(false);

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

  const buscarCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setClienteForm(f => ({
          ...f,
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          uf: data.uf || "",
        }));
      } else {
        toast.error("CEP não encontrado");
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setBuscandoCep(false);
    }
  };

  const saveCliente = useMutation({
    mutationFn: async () => {
      const payload = { ...clienteForm };
      if (editCliente) {
        await supabase.from("clientes").update(payload).eq("id", editCliente.id);
      } else {
        await supabase.from("clientes").insert(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setClienteDialog(false);
      toast.success("Cliente salvo!");
      if (editCliente && selectedCliente?.id === editCliente.id) {
        setSelectedCliente({ ...selectedCliente, ...clienteForm });
      }
    }
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

  const openNewCliente = () => { setEditCliente(null); setClienteForm(emptyClienteForm); setClienteDialog(true); };
  const openEditCliente = (c: any) => {
    setEditCliente(c);
    setClienteForm({
      razao_social: c.razao_social, nome_fantasia: c.nome_fantasia || "", cnpj: c.cnpj, status: c.status,
      cep: c.cep || "", logradouro: c.logradouro || "", numero: c.numero || "", complemento: c.complemento || "",
      bairro: c.bairro || "", cidade: c.cidade || "", uf: c.uf || "",
      nome_contador: c.nome_contador || "", email_contato: c.email_contato || "",
    });
    setClienteDialog(true);
  };

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
      <PageHeader title="Gestão de Clientes" description="Cadastro e manutenção de clientes" actions={<Button size="sm" onClick={openNewCliente}><Plus size={14} className="mr-1" /> Novo Cliente</Button>} />

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
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>CNPJ: <span className="font-mono text-foreground">{selectedCliente.cnpj}</span></div>
                    <div>Nome Fantasia: <span className="text-foreground">{selectedCliente.nome_fantasia || "—"}</span></div>
                  </div>
                  {(selectedCliente.logradouro || selectedCliente.cidade) && (
                    <div className="border-t pt-2">
                      <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1"><MapPin size={12} /> Endereço</div>
                      <div className="text-foreground text-sm">
                        {[selectedCliente.logradouro, selectedCliente.numero, selectedCliente.complemento].filter(Boolean).join(", ")}
                        {selectedCliente.bairro && ` — ${selectedCliente.bairro}`}
                      </div>
                      <div className="text-foreground text-sm">
                        {[selectedCliente.cidade, selectedCliente.uf].filter(Boolean).join(" / ")}
                        {selectedCliente.cep && ` — CEP ${selectedCliente.cep}`}
                      </div>
                    </div>
                  )}
                  {(selectedCliente.nome_contador || selectedCliente.email_contato) && (
                    <div className="border-t pt-2">
                      <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1"><User size={12} /> Contador / Contato</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>Contador: <span className="text-foreground">{selectedCliente.nome_contador || "—"}</span></div>
                        <div>E-mail: <span className="text-foreground">{selectedCliente.email_contato || "—"}</span></div>
                      </div>
                    </div>
                  )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editCliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Dados básicos */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><Building2 size={14} /> Dados da Empresa</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Razão Social</Label><Input value={clienteForm.razao_social} onChange={e => setClienteForm(f => ({ ...f, razao_social: e.target.value }))} /></div>
                <div><Label>Nome Fantasia</Label><Input value={clienteForm.nome_fantasia} onChange={e => setClienteForm(f => ({ ...f, nome_fantasia: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-3 border-t pt-4">
              <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><MapPin size={14} /> Endereço</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>CEP</Label>
                  <div className="flex gap-1">
                    <Input
                      value={clienteForm.cep}
                      onChange={e => setClienteForm(f => ({ ...f, cep: e.target.value }))}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => buscarCep(clienteForm.cep)} disabled={buscandoCep}>
                      <Search size={14} />
                    </Button>
                  </div>
                </div>
                <div className="col-span-2"><Label>Logradouro</Label><Input value={clienteForm.logradouro} onChange={e => setClienteForm(f => ({ ...f, logradouro: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><Label>Número</Label><Input value={clienteForm.numero} onChange={e => setClienteForm(f => ({ ...f, numero: e.target.value }))} /></div>
                <div><Label>Complemento</Label><Input value={clienteForm.complemento} onChange={e => setClienteForm(f => ({ ...f, complemento: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Bairro</Label><Input value={clienteForm.bairro} onChange={e => setClienteForm(f => ({ ...f, bairro: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Label>Cidade</Label><Input value={clienteForm.cidade} onChange={e => setClienteForm(f => ({ ...f, cidade: e.target.value }))} /></div>
                <div>
                  <Label>UF</Label>
                  <Select value={clienteForm.uf} onValueChange={v => setClienteForm(f => ({ ...f, uf: v }))}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {UF_LIST.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contador / Contato */}
            <div className="space-y-3 border-t pt-4">
              <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><User size={14} /> Contador / Contato</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome do Contador</Label><Input value={clienteForm.nome_contador} onChange={e => setClienteForm(f => ({ ...f, nome_contador: e.target.value }))} /></div>
                <div><Label>E-mail de Contato</Label><Input type="email" value={clienteForm.email_contato} onChange={e => setClienteForm(f => ({ ...f, email_contato: e.target.value }))} /></div>
              </div>
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
