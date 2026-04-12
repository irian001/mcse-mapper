import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { fetchClientes } from "@/lib/supabase-queries";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Search, Link2 } from "lucide-react";
import { useCurrentAuditor } from "@/hooks/useCurrentAuditor";

interface UsuarioForm {
  nome: string;
  email: string;
  cliente_id: string;
  ativo: boolean;
}

const emptyForm: UsuarioForm = { nome: "", email: "", cliente_id: "", ativo: true };

export default function ClienteUsuariosPage() {
  const qc = useQueryClient();
  const { data: currentAuditor } = useCurrentAuditor();
  const isAdmin = currentAuditor?.perfil_acesso === "admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UsuarioForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCliente, setFilterCliente] = useState("all");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUsuarioId, setLinkUsuarioId] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => { const { data } = await fetchClientes(); return data || []; },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["cliente-usuarios"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cliente_usuarios")
        .select("*, clientes(razao_social)")
        .order("nome");
      return data || [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (f: UsuarioForm & { id?: string }) => {
      const payload = { nome: f.nome, email: f.email || null, cliente_id: f.cliente_id, ativo: f.ativo };
      if (f.id) {
        const { error } = await supabase.from("cliente_usuarios").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cliente_usuarios").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente-usuarios"] });
      setDialogOpen(false);
      toast.success(editingId ? "Usuário atualizado" : "Usuário criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const linkMut = useMutation({
    mutationFn: async ({ usuarioId, email }: { usuarioId: string; email: string }) => {
      // Find auth user by email via the existing RPC
      const { data: users, error: searchErr } = await supabase.rpc("get_auth_users_for_linking");
      if (searchErr) throw searchErr;
      const found = (users as any[])?.find((u: any) => u.user_email?.toLowerCase() === email.toLowerCase());
      if (!found) throw new Error("Nenhum usuário encontrado com este e-mail");

      // Check not already an auditor
      const { data: existingAuditor } = await supabase
        .from("auditores")
        .select("id")
        .eq("auth_user_id", found.user_id)
        .maybeSingle();
      if (existingAuditor) throw new Error("Este usuário já está vinculado como auditor");

      // Check not already a client user
      const { data: existingCU } = await supabase
        .from("cliente_usuarios")
        .select("id")
        .eq("auth_user_id", found.user_id)
        .maybeSingle();
      if (existingCU) throw new Error("Este usuário já está vinculado a outro cliente");

      const { error } = await supabase
        .from("cliente_usuarios")
        .update({ auth_user_id: found.user_id })
        .eq("id", usuarioId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente-usuarios"] });
      setLinkDialogOpen(false);
      toast.success("Usuário vinculado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unlinkMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cliente_usuarios").update({ auth_user_id: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente-usuarios"] });
      toast.success("Vínculo removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = usuarios.filter((u: any) => {
    const matchSearch = !search || u.nome?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchCliente = filterCliente === "all" || u.cliente_id === filterCliente;
    return matchSearch && matchCliente;
  });

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (u: any) => {
    setEditingId(u.id);
    setForm({ nome: u.nome, email: u.email || "", cliente_id: u.cliente_id, ativo: u.ativo });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários do Cliente" description="Gerenciar vínculos entre usuários autenticados e clientes" />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && <Button onClick={openNew} size="sm"><Plus size={16} className="mr-1" /> Novo usuário</Button>}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Ativo</TableHead>
              {isAdmin && <TableHead className="w-24">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado</TableCell></TableRow>
            )}
            {filtered.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{u.email || "—"}</TableCell>
                <TableCell>{(u as any).clientes?.razao_social || "—"}</TableCell>
                <TableCell>
                  {u.auth_user_id ? (
                    <Badge variant="outline" className="text-success border-success/30 bg-success/10">Vinculado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Sem vínculo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={u.ativo ? "default" : "secondary"}>{u.ativo ? "Sim" : "Não"}</Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}><Pencil size={14} /></Button>
                      {!u.auth_user_id ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setLinkUsuarioId(u.id); setLinkEmail(""); setLinkDialogOpen(true); }}><Link2 size={14} /></Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => unlinkMut.mutate(u.id)}>
                          <Link2 size={14} className="opacity-50" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar" : "Novo"} usuário do cliente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div>
              <Label>Cliente *</Label>
              <Select value={form.cliente_id} onValueChange={v => setForm(f => ({ ...f, cliente_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button disabled={!form.nome || !form.cliente_id} onClick={() => saveMut.mutate({ ...form, id: editingId || undefined })}>
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular usuário autenticado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Informe o e-mail do usuário autenticado para vincular a este registro de cliente.</p>
            <div><Label>E-mail do usuário</Label><Input type="email" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} placeholder="usuario@email.com" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button disabled={!linkEmail || !linkUsuarioId} onClick={() => linkMut.mutate({ usuarioId: linkUsuarioId!, email: linkEmail })}>Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
