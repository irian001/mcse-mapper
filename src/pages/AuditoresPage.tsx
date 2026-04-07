import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Search, Link2, Unlink, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentAuditor } from "@/hooks/useCurrentAuditor";

const CARGOS = ["assistente", "senior", "gerente", "socio", "revisor"] as const;
type Cargo = typeof CARGOS[number];

const PERFIS_ACESSO = ["assistente", "senior", "gerente", "socio", "admin"] as const;
type PerfilAcesso = typeof PERFIS_ACESSO[number];

const cargoLabel: Record<string, string> = {
  assistente: "Assistente",
  senior: "Sênior",
  gerente: "Gerente",
  socio: "Sócio",
  revisor: "Revisor",
};

const perfilAcessoLabel: Record<string, string> = {
  assistente: "Assistente",
  senior: "Sênior",
  gerente: "Gerente",
  socio: "Sócio",
  admin: "Admin",
};

const perfilAcessoColor: Record<string, string> = {
  admin: "text-destructive bg-destructive/15 border-destructive/30",
  socio: "text-[hsl(270,60%,70%)] bg-[hsl(270,60%,55%)]/15 border-[hsl(270,60%,55%)]/30",
  gerente: "text-info bg-info/15 border-info/30",
  senior: "text-success bg-success/15 border-success/30",
  assistente: "text-muted-foreground",
};

interface AuditorForm {
  nome: string;
  email: string;
  cargo: Cargo;
  perfil: Cargo;
  perfil_acesso: PerfilAcesso;
  ativo: boolean;
  observacoes: string;
}

const emptyForm: AuditorForm = {
  nome: "", email: "", cargo: "assistente", perfil: "assistente",
  perfil_acesso: "assistente", ativo: true, observacoes: "",
};


export default function AuditoresPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AuditorForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCargo, setFilterCargo] = useState("all");
  const [filterAtivo, setFilterAtivo] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

  const { data: currentAuditor } = useCurrentAuditor();
  const isAdmin = currentAuditor?.perfil_acesso === "admin";

  const { data: currentUserId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
  });

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
        const { error } = await supabase.from("auditores").update(rest as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("auditores").insert(rest as any).select().single();
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auditores"] });
      qc.invalidateQueries({ queryKey: ["current-auditor"] });
      setDialogOpen(false);
      toast.success(editingId ? "Auditor atualizado" : "Auditor cadastrado");
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao salvar auditor"),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("auditores").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auditores"] }),
    onError: () => toast.error("Erro ao alterar status"),
  });

  const linkMutation = useMutation({
    mutationFn: async (auditorId: string) => {
      const { error } = await supabase.rpc("link_auditor_account", { p_auditor_id: auditorId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auditores"] });
      qc.invalidateQueries({ queryKey: ["current-auditor"] });
      toast.success("Conta vinculada com sucesso!");
    },
    onError: () => toast.error("Não foi possível vincular a conta"),
  });

  const unlinkMutation = useMutation({
    mutationFn: async (auditorId: string) => {
      const { error } = await supabase.from("auditores").update({ auth_user_id: null } as any).eq("id", auditorId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auditores"] });
      qc.invalidateQueries({ queryKey: ["current-auditor"] });
      toast.success("Vínculo removido");
    },
    onError: () => toast.error("Erro ao remover vínculo"),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Remove alocações em trabalhos primeiro
      await supabase.from("trabalho_auditores").delete().eq("auditor_id", id);
      const { error } = await supabase.from("auditores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auditores"] });
      qc.invalidateQueries({ queryKey: ["current-auditor"] });
      setDeleteTarget(null);
      toast.success("Auditor excluído com sucesso");
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao excluir auditor"),
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

  const currentUserAlreadyLinked = auditores.some((a: any) => a.auth_user_id === currentUserId);

  const canEdit = (a: any) => isAdmin || a.auth_user_id === currentUserId;

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: any) => {
    setEditingId(a.id);
    setForm({
      nome: a.nome, email: a.email || "", cargo: a.cargo, perfil: a.perfil,
      perfil_acesso: a.perfil_acesso || "assistente", ativo: a.ativo, observacoes: a.observacoes || "",
    });
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Auditores"
        description="Cadastro de auditores e controle de acesso"
        actions={isAdmin ? <Button size="sm" onClick={openNew}><Plus size={16} className="mr-1" />Novo Auditor</Button> : undefined}
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
              <TableHead>Perfil de Acesso</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum auditor encontrado</TableCell></TableRow>
            ) : filtered.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.nome}</TableCell>
                <TableCell className="text-muted-foreground">{a.email || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{cargoLabel[a.cargo]}</Badge></TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${perfilAcessoColor[a.perfil_acesso] || ""}`}>
                    {a.perfil_acesso === "admin" && <ShieldCheck size={12} className="mr-1" />}
                    {perfilAcessoLabel[a.perfil_acesso] || a.perfil_acesso}
                  </Badge>
                </TableCell>
                <TableCell>
                  {a.auth_user_id ? (
                    <Badge variant="outline" className="text-xs text-success bg-success/15 border-success/30">
                      <Link2 size={12} className="mr-1" />
                      {a.auth_user_id === currentUserId ? "Você" : "Vinculado"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Sem vínculo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Switch checked={a.ativo} onCheckedChange={(v) => toggleAtivo.mutate({ id: a.id, ativo: v })} disabled={!isAdmin} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                      <Pencil size={14} />
                    </Button>
                    {!a.auth_user_id && !currentUserAlreadyLinked && (
                      <Button variant="ghost" size="icon" title="Vincular meu usuário" onClick={() => linkMutation.mutate(a.id)} disabled={linkMutation.isPending}>
                        <Link2 size={14} className="text-primary" />
                      </Button>
                    )}
                    {a.auth_user_id && isAdmin && (
                      <Button variant="ghost" size="icon" title="Remover vínculo" onClick={() => unlinkMutation.mutate(a.id)} disabled={unlinkMutation.isPending}>
                        <Unlink size={14} className="text-destructive" />
                      </Button>
                    )}
                    {isAdmin && a.auth_user_id !== currentUserId && (
                      <Button variant="ghost" size="icon" title="Excluir auditor" onClick={() => setDeleteTarget({ id: a.id, nome: a.nome })}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    )}
                  </div>
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
                <Select value={form.cargo} onValueChange={(v) => setForm({ ...form, cargo: v as Cargo })} disabled={!isAdmin && !editingId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CARGOS.map((c) => <SelectItem key={c} value={c}>{cargoLabel[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Perfil de Acesso</Label>
                <Select value={form.perfil_acesso} onValueChange={(v) => setForm({ ...form, perfil_acesso: v as PerfilAcesso })} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PERFIS_ACESSO.map((p) => <SelectItem key={p} value={p}>{perfilAcessoLabel[p]}</SelectItem>)}</SelectContent>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Auditor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o auditor <strong>{deleteTarget?.nome}</strong>? Esta ação removerá também suas alocações em trabalhos de auditoria e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
