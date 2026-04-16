import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

const OBRIGATORIEDADE_OPTIONS = [
  { value: "obrigatorio", label: "Obrigatório", className: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "opcional", label: "Opcional", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  { value: "adicional", label: "Adicional", className: "bg-muted text-muted-foreground border-border" },
];

const emptyForm = {
  produto_auditoria_id: "",
  horas_previstas: "",
  horas_limite: "",
  quantidade_prevista: "",
  obrigatoriedade: "obrigatorio",
  ativo: true,
  observacoes: "",
};

interface Props {
  contratoId: string;
  tipoContratacao: string;
}

export default function ContratoEscopoTab({ contratoId, tipoContratacao }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["contrato-produtos", contratoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contrato_produtos")
        .select("*, produtos_auditoria(codigo_produto, nome_produto, categoria, segmento, complexidade_padrao, horas_base_estimadas)")
        .eq("contrato_id", contratoId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("produtos_auditoria").select("id, codigo_produto, nome_produto, horas_base_estimadas").eq("ativo", true).order("nome_produto");
      return data || [];
    },
  });

  const produtosJaVinculados = new Set(itens.map((i: any) => i.produto_auditoria_id));
  const produtosDisponiveis = produtos.filter((p: any) => !produtosJaVinculados.has(p.id) || (editing && editing.produto_auditoria_id === p.id));

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const record: any = {
        contrato_id: contratoId,
        produto_auditoria_id: payload.produto_auditoria_id,
        horas_previstas: payload.horas_previstas ? Number(payload.horas_previstas) : null,
        horas_limite: payload.horas_limite ? Number(payload.horas_limite) : null,
        quantidade_prevista: payload.quantidade_prevista ? Number(payload.quantidade_prevista) : null,
        obrigatoriedade: payload.obrigatoriedade,
        ativo: payload.ativo,
        observacoes: payload.observacoes || null,
      };

      if (tipoContratacao === "por_hora" && !record.horas_previstas) {
        throw new Error("Horas previstas são obrigatórias para contratos por hora.");
      }

      if (editing) {
        const { error } = await (supabase as any).from("contrato_produtos").update(record).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("contrato_produtos").insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato-produtos", contratoId] });
      toast.success(editing ? "Produto atualizado!" : "Produto vinculado!");
      handleClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("contrato_produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato-produtos", contratoId] });
      toast.success("Produto removido do contrato.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleClose = () => { setOpen(false); setEditing(null); setForm(emptyForm); };

  const handleEdit = (item: any) => {
    setEditing(item);
    setForm({
      produto_auditoria_id: item.produto_auditoria_id,
      horas_previstas: item.horas_previstas?.toString() || "",
      horas_limite: item.horas_limite?.toString() || "",
      quantidade_prevista: item.quantidade_prevista?.toString() || "",
      obrigatoriedade: item.obrigatoriedade || "obrigatorio",
      ativo: item.ativo ?? true,
      observacoes: item.observacoes || "",
    });
    setOpen(true);
  };

  const handleAdd = () => {
    setForm(emptyForm);
    setEditing(null);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.produto_auditoria_id) {
      toast.error("Selecione um produto.");
      return;
    }
    saveMutation.mutate(form);
  };

  const handleSelectProduto = (produtoId: string) => {
    const prod = produtos.find((p: any) => p.id === produtoId);
    setForm(f => ({
      ...f,
      produto_auditoria_id: produtoId,
      horas_previstas: f.horas_previstas || (prod?.horas_base_estimadas?.toString() || ""),
    }));
  };

  const totalHoras = itens.reduce((s: number, i: any) => s + (i.horas_previstas || 0), 0);

  const getObrigBadge = (val: string) => {
    const o = OBRIGATORIEDADE_OPTIONS.find(x => x.value === val);
    return <Badge variant="outline" className={`text-xs ${o?.className || ""}`}>{o?.label || val}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Produtos do Contrato</h3>
          <Badge variant="secondary" className="text-xs">{itens.length} produto(s) · {totalHoras.toLocaleString("pt-BR")}h previstas</Badge>
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Plus size={14} className="mr-1" /> Adicionar Produto
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Horas Previstas</TableHead>
              <TableHead className="text-right">Horas Limite</TableHead>
              <TableHead>Obrigatoriedade</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>
            ) : itens.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhum produto vinculado</TableCell></TableRow>
            ) : itens.map((item: any) => (
              <TableRow key={item.id} className={!item.ativo ? "opacity-50" : ""}>
                <TableCell className="font-mono text-xs">{item.produtos_auditoria?.codigo_produto || "—"}</TableCell>
                <TableCell className="font-medium text-sm">{item.produtos_auditoria?.nome_produto || "—"}</TableCell>
                <TableCell className="text-right font-mono text-xs">{item.horas_previstas != null ? `${item.horas_previstas}h` : "—"}</TableCell>
                <TableCell className="text-right font-mono text-xs">{item.horas_limite != null ? `${item.horas_limite}h` : "—"}</TableCell>
                <TableCell>{getObrigBadge(item.obrigatoriedade)}</TableCell>
                <TableCell>{item.ativo ? <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30">Sim</Badge> : <Badge variant="outline" className="text-xs">Não</Badge>}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Remover este produto do contrato?")) removeMutation.mutate(item.id); }}><Trash2 size={14} /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package size={18} />
              {editing ? "Editar Produto no Contrato" : "Adicionar Produto ao Contrato"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Produto *</Label>
              <Select value={form.produto_auditoria_id} onValueChange={handleSelectProduto} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                <SelectContent>
                  {produtosDisponiveis.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo_produto} — {p.nome_produto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Horas Previstas {tipoContratacao === "por_hora" ? "*" : ""}</Label>
                <Input type="number" step="0.5" value={form.horas_previstas} onChange={e => setForm(f => ({ ...f, horas_previstas: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Horas Limite</Label>
                <Input type="number" step="0.5" value={form.horas_limite} onChange={e => setForm(f => ({ ...f, horas_limite: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Qtd Prevista</Label>
                <Input type="number" value={form.quantidade_prevista} onChange={e => setForm(f => ({ ...f, quantidade_prevista: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Obrigatoriedade</Label>
                <Select value={form.obrigatoriedade} onValueChange={v => setForm(f => ({ ...f, obrigatoriedade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OBRIGATORIEDADE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pb-1">
                <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
                <Label>Ativo</Label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : editing ? "Atualizar" : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
