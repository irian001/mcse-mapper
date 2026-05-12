import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import ImportCadastroAuxiliarDialog from "./ImportCadastroAuxiliarDialog";

interface Props { clienteId: string; }

export default function CadastroClassesFaturamento({ clienteId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ codigo_classe: "", descricao_classe: "", grupo_classe: "", ativo: true });

  const { data = [] } = useQuery({
    queryKey: ["classes-fat", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cliente_classes_faturamento").select("*")
        .eq("cliente_id", clienteId).order("codigo_classe");
      if (error) throw error; return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.codigo_classe.trim() || !form.descricao_classe.trim()) throw new Error("Código e descrição são obrigatórios");
      const payload = { ...form, cliente_id: clienteId };
      if (editing) {
        const { error } = await (supabase as any).from("cliente_classes_faturamento").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("cliente_classes_faturamento").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes-fat", clienteId] });
      setOpen(false); setEditing(null);
      setForm({ codigo_classe: "", descricao_classe: "", grupo_classe: "", ativo: true });
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("cliente_classes_faturamento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes-fat", clienteId] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data.length} classe(s) cadastrada(s)</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpenImport(true)}>
            <Upload size={14} /> Importar Classes
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setForm({ codigo_classe: "", descricao_classe: "", grupo_classe: "", ativo: true }); setOpen(true); }}>
            <Plus size={14} /> Nova classe
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Descrição</TableHead><TableHead>Grupo</TableHead><TableHead>Ativo</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {data.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell>{c.codigo_classe}</TableCell>
              <TableCell>{c.descricao_classe}</TableCell>
              <TableCell>{c.grupo_classe || "-"}</TableCell>
              <TableCell>{c.ativo ? "Sim" : "Não"}</TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setForm({ codigo_classe: c.codigo_classe, descricao_classe: c.descricao_classe, grupo_classe: c.grupo_classe || "", ativo: c.ativo }); setOpen(true); }}><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => confirm("Remover?") && del.mutate(c.id)}><Trash2 size={14} /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Classe</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Código *</Label><Input value={form.codigo_classe} onChange={(e) => setForm({ ...form, codigo_classe: e.target.value })} /></div>
            <div><Label>Descrição *</Label><Input value={form.descricao_classe} onChange={(e) => setForm({ ...form, descricao_classe: e.target.value })} /></div>
            <div><Label>Grupo</Label><Input value={form.grupo_classe} onChange={(e) => setForm({ ...form, grupo_classe: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
