import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Banknote, Coins, FileSignature } from "lucide-react";
import { toast } from "sonner";
import TermoContagemCaixa from "./TermoContagemCaixa";

const DENOMINACOES_MOEDA = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0];
const DENOMINACOES_NOTA = [2, 5, 10, 20, 50, 100, 200];

const fmtBRL = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  procedimentoId: string;
  procedimento?: any;
}

export default function ContagemCaixaPanel({ procedimentoId, procedimento }: Props) {
  const qc = useQueryClient();
  const [openItem, setOpenItem] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [openDetalhe, setOpenDetalhe] = useState<{ itemId: string; editing: any } | null>(null);
  const [openTermo, setOpenTermo] = useState(false);

  const [itemForm, setItemForm] = useState({
    caixa_identificacao: "",
    descricao_local: "",
    responsavel_caixa: "",
    valor_informado: "",
    observacao: "",
  });

  const [detalheForm, setDetalheForm] = useState({
    tipo_denomincacao: "nota" as "nota" | "moeda",
    valor_unitario: "",
    quantidade: "",
    observacao: "",
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["contagem-caixa-itens", procedimentoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimento_contagem_caixa_itens")
        .select("*")
        .eq("procedimento_auxiliar_id", procedimentoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: detalhes = [] } = useQuery({
    queryKey: ["contagem-caixa-detalhes", procedimentoId, itens.map((i: any) => i.id).join(",")],
    enabled: itens.length > 0,
    queryFn: async () => {
      const ids = itens.map((i: any) => i.id);
      if (ids.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("procedimento_contagem_caixa_detalhes")
        .select("*")
        .in("contagem_caixa_item_id", ids)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const detalhesPorItem = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const d of detalhes as any[]) {
      (map[d.contagem_caixa_item_id] ||= []).push(d);
    }
    return map;
  }, [detalhes]);

  const totais = useMemo(() => {
    let informado = 0;
    let contado = 0;
    for (const i of itens as any[]) {
      informado += Number(i.valor_informado) || 0;
      contado += Number(i.valor_contado) || 0;
    }
    return { informado, contado, diferenca: contado - informado };
  }, [itens]);

  const upsertItem = useMutation({
    mutationFn: async () => {
      const payload = {
        procedimento_auxiliar_id: procedimentoId,
        caixa_identificacao: itemForm.caixa_identificacao,
        descricao_local: itemForm.descricao_local || null,
        responsavel_caixa: itemForm.responsavel_caixa || null,
        valor_informado: itemForm.valor_informado === "" ? 0 : Number(itemForm.valor_informado),
        observacao: itemForm.observacao || null,
      };
      if (editingItem) {
        const { error } = await (supabase as any)
          .from("procedimento_contagem_caixa_itens")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("procedimento_contagem_caixa_itens").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contagem-caixa-itens", procedimentoId] });
      toast.success(editingItem ? "Item atualizado" : "Item criado");
      setOpenItem(false);
      setEditingItem(null);
      resetItemForm();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar item"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("procedimento_contagem_caixa_itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contagem-caixa-itens", procedimentoId] });
      toast.success("Item removido");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  const upsertDetalhe = useMutation({
    mutationFn: async () => {
      if (!openDetalhe) return;
      const payload = {
        contagem_caixa_item_id: openDetalhe.itemId,
        tipo_denomincacao: detalheForm.tipo_denomincacao,
        valor_unitario: Number(detalheForm.valor_unitario),
        quantidade: parseInt(detalheForm.quantidade || "0", 10),
        observacao: detalheForm.observacao || null,
      };
      if (openDetalhe.editing) {
        const { error } = await (supabase as any)
          .from("procedimento_contagem_caixa_detalhes")
          .update(payload)
          .eq("id", openDetalhe.editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("procedimento_contagem_caixa_detalhes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contagem-caixa-detalhes", procedimentoId] });
      qc.invalidateQueries({ queryKey: ["contagem-caixa-itens", procedimentoId] });
      toast.success("Lançamento salvo");
      setOpenDetalhe(null);
      resetDetalheForm();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar lançamento"),
  });

  const deleteDetalhe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("procedimento_contagem_caixa_detalhes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contagem-caixa-detalhes", procedimentoId] });
      qc.invalidateQueries({ queryKey: ["contagem-caixa-itens", procedimentoId] });
      toast.success("Lançamento removido");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover lançamento"),
  });

  function resetItemForm() {
    setItemForm({
      caixa_identificacao: "",
      descricao_local: "",
      responsavel_caixa: "",
      valor_informado: "",
      observacao: "",
    });
  }
  function resetDetalheForm() {
    setDetalheForm({ tipo_denomincacao: "nota", valor_unitario: "", quantidade: "", observacao: "" });
  }

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setItemForm({
      caixa_identificacao: item.caixa_identificacao || "",
      descricao_local: item.descricao_local || "",
      responsavel_caixa: item.responsavel_caixa || "",
      valor_informado: item.valor_informado != null ? String(item.valor_informado) : "",
      observacao: item.observacao || "",
    });
    setOpenItem(true);
  };

  const handleNewItem = () => {
    setEditingItem(null);
    resetItemForm();
    setOpenItem(true);
  };

  const handleNewDetalhe = (itemId: string) => {
    resetDetalheForm();
    setOpenDetalhe({ itemId, editing: null });
  };

  const handleEditDetalhe = (itemId: string, det: any) => {
    setDetalheForm({
      tipo_denomincacao: det.tipo_denomincacao,
      valor_unitario: String(det.valor_unitario),
      quantidade: String(det.quantidade),
      observacao: det.observacao || "",
    });
    setOpenDetalhe({ itemId, editing: det });
  };

  const submitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.caixa_identificacao.trim()) return toast.error("Identificação do caixa é obrigatória");
    upsertItem.mutate();
  };

  const submitDetalhe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detalheForm.valor_unitario) return toast.error("Valor unitário é obrigatório");
    if (!detalheForm.quantidade) return toast.error("Quantidade é obrigatória");
    upsertDetalhe.mutate();
  };

  const denominacoesSugeridas =
    detalheForm.tipo_denomincacao === "nota" ? DENOMINACOES_NOTA : DENOMINACOES_MOEDA;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Banknote size={16} /> Contagem de Caixa
          </h3>
          <p className="text-xs text-muted-foreground">
            Itens de caixa com detalhamento físico (cédulas e moedas).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (itens.length === 0) return toast.error("Cadastre ao menos 1 caixa");
              if ((detalhes as any[]).length === 0) return toast.error("Adicione ao menos 1 lançamento (cédula/moeda)");
              setOpenTermo(true);
            }}
          >
            <FileSignature size={14} className="mr-1" /> Gerar Termo
          </Button>
          <Button size="sm" onClick={handleNewItem}>
            <Plus size={14} className="mr-1" /> Novo Caixa
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total Informado" value={fmtBRL(totais.informado)} />
        <SummaryCard label="Total Contado" value={fmtBRL(totais.contado)} />
        <SummaryCard
          label="Diferença Total"
          value={fmtBRL(totais.diferenca)}
          tone={totais.diferenca === 0 ? "neutral" : totais.diferenca > 0 ? "positive" : "negative"}
        />
      </div>

      {/* Lista de itens */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Caixa</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Informado</TableHead>
              <TableHead className="text-right">Contado</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && itens.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                  Nenhum caixa registrado. Clique em "Novo Caixa" para iniciar.
                </TableCell>
              </TableRow>
            )}
            {itens.map((item: any) => {
              const expanded = expandedItem === item.id;
              const dets = detalhesPorItem[item.id] || [];
              const dif = Number(item.diferenca) || 0;
              return (
                <>
                  <TableRow key={item.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setExpandedItem(expanded ? null : item.id)}
                      >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{item.caixa_identificacao}</TableCell>
                    <TableCell className="text-sm">{item.descricao_local || "—"}</TableCell>
                    <TableCell className="text-sm">{item.responsavel_caixa || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtBRL(item.valor_informado)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtBRL(item.valor_contado)}</TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm ${
                        dif === 0 ? "" : dif > 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {fmtBRL(dif)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditItem(item)}>
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (confirm("Remover este item de caixa e todos os seus lançamentos?"))
                            deleteItem.mutate(item.id);
                        }}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow key={`${item.id}-exp`}>
                      <TableCell colSpan={8} className="bg-muted/30 p-0">
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Mapa de Contagem — {item.caixa_identificacao}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleNewDetalhe(item.id)}>
                              <Plus size={12} className="mr-1" /> Lançar Cédula/Moeda
                            </Button>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Valor Unitário</TableHead>
                                <TableHead className="text-right">Quantidade</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Observação</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dets.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-muted-foreground py-4 text-sm">
                                    Nenhum lançamento. Adicione cédulas ou moedas.
                                  </TableCell>
                                </TableRow>
                              )}
                              {dets.map((d: any) => (
                                <TableRow key={d.id}>
                                  <TableCell>
                                    <span className="inline-flex items-center gap-1 text-xs">
                                      {d.tipo_denomincacao === "nota" ? (
                                        <>
                                          <Banknote size={12} /> Nota
                                        </>
                                      ) : (
                                        <>
                                          <Coins size={12} /> Moeda
                                        </>
                                      )}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm">
                                    {fmtBRL(d.valor_unitario)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm">{d.quantidade}</TableCell>
                                  <TableCell className="text-right font-mono text-sm font-semibold">
                                    {fmtBRL(d.valor_total_linha)}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{d.observacao || "—"}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleEditDetalhe(item.id, d)}
                                    >
                                      <Pencil size={12} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => {
                                        if (confirm("Remover este lançamento?")) deleteDetalhe.mutate(d.id);
                                      }}
                                    >
                                      <Trash2 size={12} />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {item.observacao && (
                            <div className="text-xs text-muted-foreground mt-2">
                              <span className="font-semibold">Observação do caixa:</span> {item.observacao}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog item */}
      <Dialog
        open={openItem}
        onOpenChange={(v) => {
          setOpenItem(v);
          if (!v) {
            setEditingItem(null);
            resetItemForm();
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Caixa" : "Novo Caixa"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitItem} className="space-y-3">
            <div>
              <Label>Identificação do Caixa *</Label>
              <Input
                value={itemForm.caixa_identificacao}
                onChange={(e) => setItemForm({ ...itemForm, caixa_identificacao: e.target.value })}
                placeholder="Ex: Caixa 01 - Recepção"
              />
            </div>
            <div>
              <Label>Descrição do Local</Label>
              <Input
                value={itemForm.descricao_local}
                onChange={(e) => setItemForm({ ...itemForm, descricao_local: e.target.value })}
                placeholder="Ex: Filial Centro - 1º andar"
              />
            </div>
            <div>
              <Label>Responsável pelo Caixa</Label>
              <Input
                value={itemForm.responsavel_caixa}
                onChange={(e) => setItemForm({ ...itemForm, responsavel_caixa: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor Informado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={itemForm.valor_informado}
                  onChange={(e) => setItemForm({ ...itemForm, valor_informado: e.target.value })}
                />
              </div>
              {editingItem && (
                <>
                  <div>
                    <Label>Valor Contado (calculado)</Label>
                    <Input value={fmtBRL(editingItem.valor_contado)} disabled />
                  </div>
                </>
              )}
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea
                rows={2}
                value={itemForm.observacao}
                onChange={(e) => setItemForm({ ...itemForm, observacao: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenItem(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsertItem.isPending}>
                {upsertItem.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog detalhe */}
      <Dialog
        open={!!openDetalhe}
        onOpenChange={(v) => {
          if (!v) {
            setOpenDetalhe(null);
            resetDetalheForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{openDetalhe?.editing ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitDetalhe} className="space-y-3">
            <div>
              <Label>Tipo *</Label>
              <Select
                value={detalheForm.tipo_denomincacao}
                onValueChange={(v: "nota" | "moeda") =>
                  setDetalheForm({ ...detalheForm, tipo_denomincacao: v, valor_unitario: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota">Nota (cédula)</SelectItem>
                  <SelectItem value="moeda">Moeda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor Unitário (R$) *</Label>
              <Select
                value={detalheForm.valor_unitario}
                onValueChange={(v) => setDetalheForm({ ...detalheForm, valor_unitario: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a denominação" />
                </SelectTrigger>
                <SelectContent>
                  {denominacoesSugeridas.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {fmtBRL(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Ou digite outro valor"
                className="mt-2"
                value={detalheForm.valor_unitario}
                onChange={(e) => setDetalheForm({ ...detalheForm, valor_unitario: e.target.value })}
              />
            </div>
            <div>
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="0"
                value={detalheForm.quantidade}
                onChange={(e) => setDetalheForm({ ...detalheForm, quantidade: e.target.value })}
              />
            </div>
            {detalheForm.valor_unitario && detalheForm.quantidade && (
              <div className="text-sm text-muted-foreground">
                Total da linha:{" "}
                <span className="font-semibold text-foreground font-mono">
                  {fmtBRL(Number(detalheForm.valor_unitario) * parseInt(detalheForm.quantidade || "0", 10))}
                </span>
              </div>
            )}
            <div>
              <Label>Observação</Label>
              <Textarea
                rows={2}
                value={detalheForm.observacao}
                onChange={(e) => setDetalheForm({ ...detalheForm, observacao: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDetalhe(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsertDetalhe.isPending}>
                {upsertDetalhe.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneCls =
    tone === "positive"
      ? "text-success border-success/30"
      : tone === "negative"
      ? "text-destructive border-destructive/30"
      : "text-foreground border-border";
  return (
    <div className={`bg-card border rounded-lg p-3 ${toneCls}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold font-mono mt-1">{value}</div>
    </div>
  );
}
