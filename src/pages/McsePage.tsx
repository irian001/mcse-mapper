import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchGrupos, fetchSubgrupos, fetchContas } from "@/lib/supabase-queries";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Upload } from "lucide-react";
import ImportMcseDialog from "@/components/mcse/ImportMcseDialog";

type NaturezaConta = "ativo" | "passivo" | "patrimonio_liquido" | "receita" | "despesa" | "compensacao";
const naturezaOptions: { value: NaturezaConta; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "passivo", label: "Passivo" },
  { value: "patrimonio_liquido", label: "Patrimônio Líquido" },
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
  { value: "compensacao", label: "Compensação" },
];

export default function McsePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("grupos");

  // Grupos
  const { data: grupos = [] } = useQuery({ queryKey: ["mcse_grupos"], queryFn: async () => { const { data } = await fetchGrupos(); return data || []; } });
  const [grupoDialog, setGrupoDialog] = useState(false);
  const [editGrupo, setEditGrupo] = useState<any>(null);
  const [grupoForm, setGrupoForm] = useState({ codigo_grupo: "", descricao_grupo: "", ordem: 0 });

  const saveGrupo = useMutation({
    mutationFn: async () => {
      if (editGrupo) {
        await supabase.from("mcse_grupos").update(grupoForm).eq("id", editGrupo.id);
      } else {
        await supabase.from("mcse_grupos").insert(grupoForm);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mcse_grupos"] }); setGrupoDialog(false); toast.success("Grupo salvo!"); }
  });

  // Subgrupos
  const [filtroGrupo, setFiltroGrupo] = useState<string>("");
  const { data: subgrupos = [] } = useQuery({ queryKey: ["mcse_subgrupos", filtroGrupo], queryFn: async () => { const { data } = await fetchSubgrupos(filtroGrupo || undefined); return data || []; } });
  const [subgrupoDialog, setSubgrupoDialog] = useState(false);
  const [editSubgrupo, setEditSubgrupo] = useState<any>(null);
  const [subgrupoForm, setSubgrupoForm] = useState({ grupo_id: "", codigo_subgrupo: "", descricao_subgrupo: "", ordem: 0 });

  const saveSubgrupo = useMutation({
    mutationFn: async () => {
      if (editSubgrupo) {
        await supabase.from("mcse_subgrupos").update(subgrupoForm).eq("id", editSubgrupo.id);
      } else {
        await supabase.from("mcse_subgrupos").insert(subgrupoForm);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mcse_subgrupos"] }); setSubgrupoDialog(false); toast.success("Subgrupo salvo!"); }
  });

  // Contas
  const [filtroGrupoConta, setFiltroGrupoConta] = useState<string>("");
  const { data: contas = [] } = useQuery({ queryKey: ["mcse_contas", filtroGrupoConta], queryFn: async () => { const { data } = await fetchContas(filtroGrupoConta || undefined); return data || []; } });
  const [contaDialog, setContaDialog] = useState(false);
  const [editConta, setEditConta] = useState<any>(null);
  const [contaForm, setContaForm] = useState({
    codigo_mcse: "", descricao_conta: "", grupo_id: "", subgrupo_id: "" as string | null,
    nivel: 1, natureza: "ativo" as NaturezaConta, aceita_lancamento: false, conta_critica: false, aceita_reg_soc: false,
  });

  const saveConta = useMutation({
    mutationFn: async () => {
      const payload = { ...contaForm, subgrupo_id: contaForm.subgrupo_id || null };
      if (editConta) {
        await supabase.from("mcse_contas").update(payload).eq("id", editConta.id);
      } else {
        await supabase.from("mcse_contas").insert(payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mcse_contas"] }); setContaDialog(false); toast.success("Conta salva!"); }
  });

  const openEditGrupo = (g: any) => {
    setEditGrupo(g);
    setGrupoForm({ codigo_grupo: g.codigo_grupo, descricao_grupo: g.descricao_grupo, ordem: g.ordem });
    setGrupoDialog(true);
  };

  const openNewGrupo = () => {
    setEditGrupo(null);
    setGrupoForm({ codigo_grupo: "", descricao_grupo: "", ordem: 0 });
    setGrupoDialog(true);
  };

  const openEditSubgrupo = (s: any) => {
    setEditSubgrupo(s);
    setSubgrupoForm({ grupo_id: s.grupo_id, codigo_subgrupo: s.codigo_subgrupo, descricao_subgrupo: s.descricao_subgrupo, ordem: s.ordem });
    setSubgrupoDialog(true);
  };

  const openNewSubgrupo = () => {
    setEditSubgrupo(null);
    setSubgrupoForm({ grupo_id: filtroGrupo || "", codigo_subgrupo: "", descricao_subgrupo: "", ordem: 0 });
    setSubgrupoDialog(true);
  };

  const openEditConta = (c: any) => {
    setEditConta(c);
    setContaForm({
      codigo_mcse: c.codigo_mcse, descricao_conta: c.descricao_conta, grupo_id: c.grupo_id,
      subgrupo_id: c.subgrupo_id, nivel: c.nivel, natureza: c.natureza, aceita_lancamento: c.aceita_lancamento,
      conta_critica: c.conta_critica, aceita_reg_soc: c.aceita_reg_soc,
    });
    setContaDialog(true);
  };

  const openNewConta = () => {
    setEditConta(null);
    setContaForm({ codigo_mcse: "", descricao_conta: "", grupo_id: filtroGrupoConta || "", subgrupo_id: null, nivel: 1, natureza: "ativo", aceita_lancamento: false, conta_critica: false, aceita_reg_soc: false });
    setContaDialog(true);
  };

  return (
    <div>
      <PageHeader title="Base MCSE" description="Manual de Contabilidade do Setor Elétrico" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
          <TabsTrigger value="subgrupos">Subgrupos</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
        </TabsList>

        <TabsContent value="grupos" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={openNewGrupo}><Plus size={14} className="mr-1" /> Novo Grupo</Button>
          </div>
          <div className="rounded border bg-card">
            <Table>
              <TableHeader>
                <TableRow><TableHead className="w-24">Código</TableHead><TableHead>Descrição</TableHead><TableHead className="w-20">Ordem</TableHead><TableHead className="w-20">Status</TableHead><TableHead className="w-16" /></TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map((g: any) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-sm">{g.codigo_grupo}</TableCell>
                    <TableCell>{g.descricao_grupo}</TableCell>
                    <TableCell>{g.ordem}</TableCell>
                    <TableCell><StatusBadge status={g.ativo ? "ativo" : "inativo"} /></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => openEditGrupo(g)}><Pencil size={14} /></Button></TableCell>
                  </TableRow>
                ))}
                {grupos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum grupo cadastrado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="subgrupos" className="mt-4">
          <div className="flex items-center justify-between mb-3 gap-3">
            <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Filtrar por grupo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {grupos.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.codigo_grupo} - {g.descricao_grupo}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openNewSubgrupo}><Plus size={14} className="mr-1" /> Novo Subgrupo</Button>
          </div>
          <div className="rounded border bg-card">
            <Table>
              <TableHeader>
                <TableRow><TableHead className="w-24">Código</TableHead><TableHead>Descrição</TableHead><TableHead>Grupo</TableHead><TableHead className="w-20">Ordem</TableHead><TableHead className="w-16" /></TableRow>
              </TableHeader>
              <TableBody>
                {subgrupos.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.codigo_subgrupo}</TableCell>
                    <TableCell>{s.descricao_subgrupo}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.mcse_grupos?.descricao_grupo}</TableCell>
                    <TableCell>{s.ordem}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => openEditSubgrupo(s)}><Pencil size={14} /></Button></TableCell>
                  </TableRow>
                ))}
                {subgrupos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum subgrupo cadastrado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="contas" className="mt-4">
          <div className="flex items-center justify-between mb-3 gap-3">
            <Select value={filtroGrupoConta} onValueChange={setFiltroGrupoConta}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Filtrar por grupo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {grupos.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.codigo_grupo} - {g.descricao_grupo}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openNewConta}><Plus size={14} className="mr-1" /> Nova Conta</Button>
          </div>
          <div className="rounded border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Código</TableHead><TableHead>Descrição</TableHead><TableHead className="w-28">Natureza</TableHead>
                  <TableHead className="w-16">Nível</TableHead><TableHead className="w-20">Crítica</TableHead><TableHead className="w-20">Status</TableHead><TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((c: any) => (
                  <TableRow key={c.id} className={c.conta_critica ? "bg-destructive/5" : ""}>
                    <TableCell className="font-mono text-sm">{c.codigo_mcse}</TableCell>
                    <TableCell>{c.descricao_conta}</TableCell>
                    <TableCell className="text-sm capitalize">{c.natureza?.replace("_", " ")}</TableCell>
                    <TableCell>{c.nivel}</TableCell>
                    <TableCell>{c.conta_critica && <StatusBadge status="critico" />}</TableCell>
                    <TableCell><StatusBadge status={c.ativo ? "ativo" : "inativo"} /></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => openEditConta(c)}><Pencil size={14} /></Button></TableCell>
                  </TableRow>
                ))}
                {contas.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma conta cadastrada</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Grupo Dialog */}
      <Dialog open={grupoDialog} onOpenChange={setGrupoDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editGrupo ? "Editar Grupo" : "Novo Grupo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Código</Label><Input value={grupoForm.codigo_grupo} onChange={e => setGrupoForm(f => ({ ...f, codigo_grupo: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Input value={grupoForm.descricao_grupo} onChange={e => setGrupoForm(f => ({ ...f, descricao_grupo: e.target.value }))} /></div>
            <div><Label>Ordem</Label><Input type="number" value={grupoForm.ordem} onChange={e => setGrupoForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))} /></div>
            <Button className="w-full" onClick={() => saveGrupo.mutate()} disabled={saveGrupo.isPending}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subgrupo Dialog */}
      <Dialog open={subgrupoDialog} onOpenChange={setSubgrupoDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editSubgrupo ? "Editar Subgrupo" : "Novo Subgrupo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Grupo</Label>
              <Select value={subgrupoForm.grupo_id} onValueChange={v => setSubgrupoForm(f => ({ ...f, grupo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                <SelectContent>{grupos.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.codigo_grupo} - {g.descricao_grupo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Código</Label><Input value={subgrupoForm.codigo_subgrupo} onChange={e => setSubgrupoForm(f => ({ ...f, codigo_subgrupo: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Input value={subgrupoForm.descricao_subgrupo} onChange={e => setSubgrupoForm(f => ({ ...f, descricao_subgrupo: e.target.value }))} /></div>
            <div><Label>Ordem</Label><Input type="number" value={subgrupoForm.ordem} onChange={e => setSubgrupoForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))} /></div>
            <Button className="w-full" onClick={() => saveSubgrupo.mutate()} disabled={saveSubgrupo.isPending}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conta Dialog */}
      <Dialog open={contaDialog} onOpenChange={setContaDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editConta ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código MCSE</Label><Input value={contaForm.codigo_mcse} onChange={e => setContaForm(f => ({ ...f, codigo_mcse: e.target.value }))} /></div>
              <div><Label>Nível</Label><Input type="number" value={contaForm.nivel} onChange={e => setContaForm(f => ({ ...f, nivel: parseInt(e.target.value) || 1 }))} /></div>
            </div>
            <div><Label>Descrição</Label><Input value={contaForm.descricao_conta} onChange={e => setContaForm(f => ({ ...f, descricao_conta: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Grupo</Label>
                <Select value={contaForm.grupo_id} onValueChange={v => setContaForm(f => ({ ...f, grupo_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
                  <SelectContent>{grupos.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.codigo_grupo} - {g.descricao_grupo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Natureza</Label>
                <Select value={contaForm.natureza} onValueChange={v => setContaForm(f => ({ ...f, natureza: v as NaturezaConta }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{naturezaOptions.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={contaForm.aceita_lancamento} onCheckedChange={v => setContaForm(f => ({ ...f, aceita_lancamento: !!v }))} />Aceita lançamento</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={contaForm.conta_critica} onCheckedChange={v => setContaForm(f => ({ ...f, conta_critica: !!v }))} />Conta crítica</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={contaForm.aceita_reg_soc} onCheckedChange={v => setContaForm(f => ({ ...f, aceita_reg_soc: !!v }))} />Reg. Societário</label>
            </div>
            <Button className="w-full" onClick={() => saveConta.mutate()} disabled={saveConta.isPending}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
