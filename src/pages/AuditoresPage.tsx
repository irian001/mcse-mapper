import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

const CARGOS = ["assistente", "senior", "gerente", "socio", "revisor"] as const;
type Cargo = typeof CARGOS[number];

const cargoLabel: Record<string, string> = {
  assistente: "Assistente",
  senior: "Sênior",
  gerente: "Gerente",
  socio: "Sócio",
  revisor: "Revisor",
};

interface AuditorForm {
  nome: string;
  email: string;
  cargo: Cargo;
  perfil: Cargo;
  ativo: boolean;
  observacoes: string;
}

const emptyForm: AuditorForm = { nome: "", email: "", cargo: "assistente", perfil: "assistente", ativo: true, observacoes: "" };

export default function AuditoresPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AuditorForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCargo, setFilterCargo] = useState("all");
  const [filterAtivo, setFilterAtivo] = useState("all");

  const { data: auditores = [], isLoading } = useQuery({
    queryKey: ["auditores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("auditores").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: AuditorForm & { id?: string }) => {
      const { id, ...rest } = values;
      if (id) {
        const { error } = await supabase.from("auditores").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("auditores").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auditores"] });
      setDialogOpen(false);
      toast.success(editingId ? "Auditor atualizado" : "Auditor cadastrado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("auditores").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auditores"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let list = auditores;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((a: any) => a.nome?.toLowerCase().includes(s) || a.email?.toLowerCase().includes(s));
    }
    if (filterCargo !== "all") list = list.filter((a: any) => a.cargo === filterCargo);
    if (filterAtivo !== "all") list = list.filter((a: any) => (filterAtivo === "ativo" ? a.ativo : !a.ativo));
    return list;
  }, [auditores, search, filterCargo, filterAtivo]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: any) => {
    setEditingId(a.id);
    setForm({ nome: a.nome, email: a.email || "", cargo: a.cargo, perfil: a.perfil, ativo: a.ativo, observacoes: a.observacoes || "" });
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Auditores"
        description="Cadastro de auditores da equipe"
        actions={<Button size="sm" onClick={openNew}><Plus size={16} className="mr-1" />Novo Auditor</Button>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email" className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCargo} onValueChange={setFilterCargo}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Cargo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cargos</SelectItem>
            {CARGOS.map((c) => <SelectItem key={c} value={c}>{cargoLabel[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAtivo} onValueChange={setFilterAtivo}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum auditor encontrado</TableCell></TableRow>
            ) : filtered.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.nome}</TableCell>
                <TableCell className="text-muted-foreground">{a.email || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{cargoLabel[a.cargo]}</Badge></TableCell>
                <TableCell><Badge variant="secondary" className="text-xs">{cargoLabel[a.perfil]}</Badge></TableCell>
                <TableCell>
                  <Switch checked={a.ativo} onCheckedChange={(v) => toggleAtivo.mutate({ id: a.id, ativo: v })} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil size={14} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar Auditor" : "Novo Auditor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cargo</Label>
                <Select value={form.cargo} onValueChange={(v) => setForm({ ...form, cargo: v as Cargo })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CARGOS.map((c) => <SelectItem key={c} value={c}>{cargoLabel[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Perfil</Label>
                <Select value={form.perfil} onValueChange={(v) => setForm({ ...form, perfil: v as Cargo })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CARGOS.map((c) => <SelectItem key={c} value={c}>{cargoLabel[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button disabled={!form.nome.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
