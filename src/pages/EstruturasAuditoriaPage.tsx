import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Search, Database } from "lucide-react";
import { toast } from "sonner";
import { useSegmentos, type EstruturaAuditoria } from "@/hooks/useSegmentos";

const emptyForm = {
  segmento_id: "",
  codigo: "",
  nome: "",
  descricao: "",
  estrutura_origem: "",
  ativo: true,
};

export default function EstruturasAuditoriaPage() {
  const qc = useQueryClient();
  const { data: segmentos = [], isLoading: loadingSegmentos } = useSegmentos();

  const [search, setSearch] = useState("");
  const [filterSegmento, setFilterSegmento] = useState<string>("__all__");
  const [filterAtivo, setFilterAtivo] = useState<string>("__all__");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EstruturaAuditoria | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: estruturas = [], isLoading } = useQuery({
    queryKey: ["estruturas-auditoria-admin"],
    queryFn: async (): Promise<EstruturaAuditoria[]> => {
      const { data, error } = await (supabase.from as any)("estruturas_auditoria")
        .select("*")
        .order("nome");
      if (error) {
        if (error.code === "42P01" || error.message?.includes("not find")) return [];
        throw error;
      }
      return (data || []) as EstruturaAuditoria[];
    },
  });

  const segmentoMap = useMemo(() => {
    const m = new Map<string, { codigo: string; nome: string }>();
    segmentos.forEach((s) => m.set(s.id, { codigo: s.codigo, nome: s.nome }));
    return m;
  }, [segmentos]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const arr = estruturas.filter((e) => {
      if (filterSegmento !== "__all__" && e.segmento_id !== filterSegmento) return false;
      if (filterAtivo === "ativos" && !e.ativo) return false;
      if (filterAtivo === "inativos" && e.ativo) return false;
      if (s && !`${e.codigo} ${e.nome}`.toLowerCase().includes(s)) return false;
      return true;
    });
    arr.sort((a, b) => {
      const sa = segmentoMap.get(a.segmento_id)?.nome || "";
      const sb = segmentoMap.get(b.segmento_id)?.nome || "";
      const c = sa.localeCompare(sb);
      if (c !== 0) return c;
      return a.nome.localeCompare(b.nome);
    });
    return arr;
  }, [estruturas, search, filterSegmento, filterAtivo, segmentoMap]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!form.segmento_id) throw new Error("Selecione o segmento");
      if (!form.codigo.trim()) throw new Error("Informe o código");
      if (!form.nome.trim()) throw new Error("Informe o nome");

      const payload: any = {
        segmento_id: form.segmento_id,
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        estrutura_origem: form.estrutura_origem.trim() || null,
        ativo: form.ativo,
      };

      if (editing) {
        const { error } = await (supabase.from as any)("estruturas_auditoria")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("estruturas_auditoria").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estruturas-auditoria-admin"] });
      qc.invalidateQueries({ queryKey: ["estruturas-auditoria"] });
      toast.success(editing ? "Estrutura atualizada" : "Estrutura criada");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar"),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async (e: EstruturaAuditoria) => {
      const { error } = await (supabase.from as any)("estruturas_auditoria")
        .update({ ativo: !e.ativo })
        .eq("id", e.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estruturas-auditoria-admin"] });
      qc.invalidateQueries({ queryKey: ["estruturas-auditoria"] });
      toast.success("Status atualizado");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao alterar status"),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, segmento_id: segmentos[0]?.id || "" });
    setOpen(true);
  };

  const openEdit = (e: EstruturaAuditoria) => {
    setEditing(e);
    setForm({
      segmento_id: e.segmento_id,
      codigo: e.codigo,
      nome: e.nome,
      descricao: e.descricao || "",
      estrutura_origem: e.estrutura_origem || "",
      ativo: e.ativo,
    });
    setOpen(true);
  };

  const tabelaIndisponivel = !isLoading && estruturas.length === 0 && !loadingSegmentos && segmentos.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estruturas de Auditoria"
        description="Estruturas de referência por segmento (MCSE, COSIF, etc.)."
        actions={
          <Button onClick={openNew} disabled={loadingSegmentos || segmentos.length === 0}>
            <Plus className="mr-1" size={16} /> Nova Estrutura
          </Button>
        }
      />

      {tabelaIndisponivel && (
        <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
          As tabelas <code>segmentos</code> e <code>estruturas_auditoria</code> ainda não estão disponíveis no banco.
          Execute o SQL <code>docs/sql/segmentos-estruturas-auditoria.sql</code> no Supabase para habilitar esta tela.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2 top-2.5 text-muted-foreground" size={16} />
          <Input
            placeholder="Buscar por código ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="w-[220px]">
          <Label className="text-xs text-muted-foreground">Segmento</Label>
          <Select value={filterSegmento} onValueChange={setFilterSegmento}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os segmentos</SelectItem>
              {segmentos.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[180px]">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filterAtivo} onValueChange={setFilterAtivo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="ativos">Apenas ativos</SelectItem>
              <SelectItem value="inativos">Apenas inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[200px]">Segmento</TableHead>
              <TableHead className="w-[160px]">Estrutura origem</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <Database className="mx-auto mb-2 opacity-40" size={28} />
                  Nenhuma estrutura encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.codigo}</TableCell>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {segmentoMap.get(e.segmento_id)?.nome || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.estrutura_origem || "—"}
                  </TableCell>
                  <TableCell>
                    {e.ativo ? (
                      <Badge variant="outline" className="bg-success/15 text-success border-success/30">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleAtivoMutation.mutate(e)}
                        disabled={toggleAtivoMutation.isPending}
                      >
                        {e.ativo ? "Inativar" : "Ativar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Estrutura" : "Nova Estrutura"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Segmento *</Label>
              <Select value={form.segmento_id} onValueChange={(v) => setForm({ ...form, segmento_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                <SelectContent>
                  {segmentos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código *</Label>
                <Input
                  placeholder="MCSE, COSIF, PLANO_AGRO..."
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <Label>Estrutura origem</Label>
                <Input
                  placeholder="Ex.: MCSE"
                  value={form.estrutura_origem}
                  onChange={(e) => setForm({ ...form, estrutura_origem: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Nome *</Label>
              <Input
                placeholder="Nome da estrutura"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição da estrutura"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label className="cursor-pointer" onClick={() => setForm({ ...form, ativo: !form.ativo })}>
                Ativo
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsertMutation.mutate()} disabled={upsertMutation.isPending}>
              {editing ? "Salvar alterações" : "Criar estrutura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
