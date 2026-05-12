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

const empty = { codigo_municipio: "", nome_municipio: "", uf: "", codigo_ibge: "", regional_codigo: "", regional_nome: "", ativo: true };

export default function CadastroMunicipiosFaturamento({ clienteId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(empty);

  const { data = [] } = useQuery({
    queryKey: ["mun-fat", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cliente_municipios_faturamento").select("*")
        .eq("cliente_id", clienteId).order("codigo_municipio");
      if (error) throw error; return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.codigo_municipio.trim() || !form.nome_municipio.trim()) throw new Error("Código e nome são obrigatórios");
      const payload = { ...form, cliente_id: clienteId };
      if (editing) {
        const { error } = await (supabase as any).from("cliente_municipios_faturamento").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("cliente_municipios_faturamento").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mun-fat", clienteId] });
      setOpen(false); setEditing(null); setForm(empty);
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("cliente_municipios_faturamento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mun-fat", clienteId] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data.length} município(s) cadastrado(s)</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpenImport(true)}>
            <Upload size={14} /> Importar Municípios
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>
            <Plus size={14} /> Novo município
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>UF</TableHead><TableHead>IBGE</TableHead><TableHead>Regional</TableHead><TableHead>Ativo</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {data.map((m: any) => (
            <TableRow key={m.id}>
              <TableCell>{m.codigo_municipio}</TableCell>
              <TableCell>{m.nome_municipio}</TableCell>
              <TableCell>{m.uf || "-"}</TableCell>
              <TableCell>{m.codigo_ibge || "-"}</TableCell>
              <TableCell>{m.regional_nome || m.regional_codigo || "-"}</TableCell>
              <TableCell>{m.ativo ? "Sim" : "Não"}</TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(m); setForm({ codigo_municipio: m.codigo_municipio, nome_municipio: m.nome_municipio, uf: m.uf || "", codigo_ibge: m.codigo_ibge || "", regional_codigo: m.regional_codigo || "", regional_nome: m.regional_nome || "", ativo: m.ativo }); setOpen(true); }}><Pencil size={14} /></Button>
                <Button size="icon" variant="ghost" onClick={() => confirm("Remover?") && del.mutate(m.id)}><Trash2 size={14} /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Município</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Código *</Label><Input value={form.codigo_municipio} onChange={(e) => setForm({ ...form, codigo_municipio: e.target.value })} /></div>
            <div><Label>Nome *</Label><Input value={form.nome_municipio} onChange={(e) => setForm({ ...form, nome_municipio: e.target.value })} /></div>
            <div><Label>UF</Label><Input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
            <div><Label>IBGE</Label><Input value={form.codigo_ibge} onChange={(e) => setForm({ ...form, codigo_ibge: e.target.value })} /></div>
            <div><Label>Regional (cód.)</Label><Input value={form.regional_codigo} onChange={(e) => setForm({ ...form, regional_codigo: e.target.value })} /></div>
            <div><Label>Regional (nome)</Label><Input value={form.regional_nome} onChange={(e) => setForm({ ...form, regional_nome: e.target.value })} /></div>
            <div className="col-span-2 flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportCadastroAuxiliarDialog
        open={openImport}
        onClose={() => setOpenImport(false)}
        clienteId={clienteId}
        table="cliente_municipios_faturamento"
        uniqueKey="codigo_municipio"
        title="Importar Municípios de Faturamento"
        invalidateKey={["mun-fat", clienteId]}
        fields={[
          { key: "codigo_municipio", label: "Código", required: true, hints: ["codigo", "código", "cod"] },
          { key: "nome_municipio", label: "Nome", required: true, hints: ["nome", "municip"] },
          { key: "uf", label: "UF", hints: ["uf", "estado"] },
          { key: "codigo_ibge", label: "IBGE", hints: ["ibge"] },
          { key: "regional_codigo", label: "Regional (cód.)", hints: ["regional cod", "cod regional"] },
          { key: "regional_nome", label: "Regional (nome)", hints: ["regional nome", "nome regional", "regional"] },
          { key: "ativo", label: "Ativo", hints: ["ativo", "status"] },
        ]}
      />
    </div>
  );
}
