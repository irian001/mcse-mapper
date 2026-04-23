import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Upload, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ImportItensEstoqueDialog from "./ImportItensEstoqueDialog";

const fmtBRL = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  nao_contado: { label: "Não contado", cls: "bg-muted/40 text-muted-foreground border-border" },
  sem_diferenca: { label: "Sem diferença", cls: "bg-success/15 text-success border-success/30" },
  sobra: { label: "Sobra", cls: "bg-info/15 text-info border-info/30" },
  falta: { label: "Falta", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  relevante: { label: "Relevante", cls: "bg-warning/15 text-warning-foreground border-warning/30" },
};

// Helper: determina se um item ainda NÃO foi contado.
// Compatível com o SQL atual (v1/v2) e com o novo v3 (campo `contado` + status `nao_contado`).
function isNaoContado(item: any): boolean {
  if (item?.status_divergencia === "nao_contado") return true;
  if (item?.contado === false) return true;
  // Fallback heurístico: item importado sem quantidade contada preenchida
  const qtdCnt = item?.quantidade_contada;
  const semContagem = qtdCnt === null || qtdCnt === undefined || Number(qtdCnt) === 0;
  if (semContagem && item?.origem_item === "importado") return true;
  return false;
}

interface NovoItem {
  codigo_item: string;
  descricao_item: string;
  unidade_medida: string;
  quantidade_sistema: string;
  quantidade_contada: string;
  valor_unitario: string;
  observacao: string;
}

const emptyNovo: NovoItem = {
  codigo_item: "",
  descricao_item: "",
  unidade_medida: "",
  quantidade_sistema: "",
  quantidade_contada: "",
  valor_unitario: "",
  observacao: "",
};

interface Props {
  bloco: any | null;
  open: boolean;
  onClose: () => void;
}

export default function ContagemEstoqueBlocoDetail({ bloco, open, onClose }: Props) {
  const qc = useQueryClient();
  const [novo, setNovo] = useState<NovoItem>(emptyNovo);
  const [openImport, setOpenImport] = useState(false);
  const [busca, setBusca] = useState("");
  const [qtdContadaRapida, setQtdContadaRapida] = useState("");
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const qtdContadaRef = useRef<HTMLInputElement>(null);

  const blocoId = bloco?.id || null;

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["ce-itens", blocoId],
    enabled: !!blocoId && open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimento_contagem_estoque_itens")
        .select("*")
        .eq("contagem_estoque_bloco_id", blocoId)
        .order("codigo_item", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const totais = useMemo(() => {
    let sis = 0;        // total sistema (apenas itens contados)
    let cnt = 0;        // total contado (apenas itens contados)
    let dif = 0;        // diferença financeira (apenas itens contados)
    let withDif = 0;    // itens contados com divergência (sobra/falta/relevante)
    let importados = 0;
    let naoContados = 0;
    let contados = 0;
    for (const i of itens as any[]) {
      if (i.origem_item === "importado") importados += 1;
      if (isNaoContado(i)) {
        naoContados += 1;
        continue; // não soma nos totais financeiros
      }
      contados += 1;
      sis += Number(i.valor_total_sistema) || 0;
      cnt += Number(i.valor_total_contado) || 0;
      dif += Number(i.diferenca_valor) || 0;
      if (i.status_divergencia && i.status_divergencia !== "sem_diferenca") withDif += 1;
    }
    return { sis, cnt, dif, withDif, count: itens.length, importados, naoContados, contados };
  }, [itens]);

  // Index por código para busca rápida
  const codeIndex = useMemo(() => {
    const m = new Map<string, any>();
    for (const it of itens as any[]) {
      if (it.codigo_item) m.set(String(it.codigo_item).toLowerCase(), it);
    }
    return m;
  }, [itens]);

  const itemEncontrado = useMemo(() => {
    const k = busca.trim().toLowerCase();
    if (!k) return null;
    return codeIndex.get(k) || null;
  }, [busca, codeIndex]);

  const itensFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return (itens as any[]).filter(
      (i) =>
        String(i.codigo_item || "").toLowerCase().includes(q) ||
        String(i.descricao_item || "").toLowerCase().includes(q)
    );
  }, [itens, busca]);

  const insertItem = useMutation({
    mutationFn: async () => {
      if (!blocoId) throw new Error("Bloco inválido");
      const payload = {
        contagem_estoque_bloco_id: blocoId,
        codigo_item: novo.codigo_item || null,
        descricao_item: novo.descricao_item || null,
        unidade_medida: novo.unidade_medida || null,
        quantidade_sistema: novo.quantidade_sistema === "" ? 0 : Number(novo.quantidade_sistema),
        quantidade_contada: novo.quantidade_contada === "" ? 0 : Number(novo.quantidade_contada),
        valor_unitario: novo.valor_unitario === "" ? 0 : Number(novo.valor_unitario),
        observacao: novo.observacao || null,
        origem_item: "manual",
      };
      const { error } = await (supabase as any)
        .from("procedimento_contagem_estoque_itens")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ce-itens", blocoId] });
      qc.invalidateQueries({ queryKey: ["ce-itens-resumo"] });
      setNovo(emptyNovo);
      toast.success("Item adicionado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao adicionar item"),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await (supabase as any)
        .from("procedimento_contagem_estoque_itens")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ce-itens", blocoId] });
      qc.invalidateQueries({ queryKey: ["ce-itens-resumo"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("procedimento_contagem_estoque_itens")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ce-itens", blocoId] });
      qc.invalidateQueries({ queryKey: ["ce-itens-resumo"] });
      toast.success("Item removido");
    },
  });

  const handleAdd = () => {
    if (!novo.descricao_item && !novo.codigo_item)
      return toast.error("Informe código ou descrição");
    insertItem.mutate();
  };

  // Digitação assistida: ao confirmar quantidade contada do item localizado
  const aplicarContagemRapida = () => {
    if (!itemEncontrado) return toast.error("Nenhum item encontrado para esse código");
    if (qtdContadaRapida === "") return toast.error("Informe a quantidade contada");
    updateItem.mutate(
      {
        id: itemEncontrado.id,
        patch: { quantidade_contada: Number(qtdContadaRapida) },
      },
      {
        onSuccess: () => {
          toast.success(`Atualizado: ${itemEncontrado.codigo_item}`);
          setBusca("");
          setQtdContadaRapida("");
          setTimeout(() => buscaInputRef.current?.focus(), 50);
        },
      }
    );
  };

  // Foca no campo de busca ao abrir
  useEffect(() => {
    if (open) setTimeout(() => buscaInputRef.current?.focus(), 200);
  }, [open]);

  // Quando item é encontrado, foca em quantidade contada
  useEffect(() => {
    if (itemEncontrado && busca) {
      setTimeout(() => qtdContadaRef.current?.focus(), 50);
    }
  }, [itemEncontrado, busca]);

  const blocoLabel = `${bloco?.filial || "—"} · ${bloco?.setor || "—"} · ${bloco?.tipo_estoque || "—"}`;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-7xl max-h-[94vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <DialogTitle className="text-base">Itens do Bloco — {blocoLabel}</DialogTitle>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{totais.count} itens</span>
                  {totais.importados > 0 && <span>· {totais.importados} importados</span>}
                  <span>· Total Sistema: <span className="font-mono text-foreground">{fmtBRL(totais.sis)}</span></span>
                  <span>· Total Contado: <span className="font-mono text-foreground">{fmtBRL(totais.cnt)}</span></span>
                  <span className={totais.dif === 0 ? "" : totais.dif > 0 ? "text-success" : "text-destructive"}>
                    · Diferença: <span className="font-mono">{fmtBRL(totais.dif)}</span>
                  </span>
                  {totais.withDif > 0 && (
                    <span className="text-warning-foreground">· {totais.withDif} com divergência</span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setOpenImport(true)}>
                <Upload size={14} className="mr-1" /> Importar Itens
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Digitação assistida por código */}
            <div className="border border-primary/30 rounded-lg p-3 bg-primary/5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <Search size={12} /> Digitação assistida
              </div>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <Label className="text-xs">Código do item</Label>
                  <Input
                    ref={buscaInputRef}
                    placeholder="Digite ou bipe o código..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={itemEncontrado?.descricao_item || ""}
                    readOnly
                    className="bg-muted/40"
                    placeholder={busca && !itemEncontrado ? "Item não encontrado neste bloco" : ""}
                  />
                </div>
                <div className="col-span-1">
                  <Label className="text-xs">UN</Label>
                  <Input value={itemEncontrado?.unidade_medida || ""} readOnly className="bg-muted/40" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Qtd. Sistema</Label>
                  <Input
                    value={
                      itemEncontrado
                        ? Number(itemEncontrado.quantidade_sistema || 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 })
                        : ""
                    }
                    readOnly
                    className="bg-muted/40 text-right font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Qtd. Contada</Label>
                  <Input
                    ref={qtdContadaRef}
                    type="number"
                    step="0.0001"
                    value={qtdContadaRapida}
                    onChange={(e) => setQtdContadaRapida(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        aplicarContagemRapida();
                      }
                    }}
                    disabled={!itemEncontrado}
                    className="text-right font-mono"
                    placeholder="0,0000"
                  />
                </div>
              </div>
              {busca && !itemEncontrado && (
                <div className="text-xs text-warning-foreground flex items-center gap-1 mt-2">
                  <AlertCircle size={12} /> Código "{busca}" não localizado neste bloco. Adicione manualmente abaixo ou importe.
                </div>
              )}
              <div className="flex justify-end mt-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBusca("");
                    setQtdContadaRapida("");
                    setTimeout(() => buscaInputRef.current?.focus(), 50);
                  }}
                >
                  Limpar
                </Button>
                <Button size="sm" onClick={aplicarContagemRapida} disabled={!itemEncontrado || qtdContadaRapida === ""}>
                  <Save size={13} className="mr-1" /> Registrar Contagem
                </Button>
              </div>
            </div>

            {/* Inserção rápida (manual) */}
            <details className="border border-border rounded-lg bg-muted/10">
              <summary className="px-3 py-2 cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                + Adicionar item manualmente
              </summary>
              <div className="p-3 pt-0">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Código</Label>
                    <Input value={novo.codigo_item} onChange={(e) => setNovo({ ...novo, codigo_item: e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={novo.descricao_item}
                      onChange={(e) => setNovo({ ...novo, descricao_item: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">UN</Label>
                    <Input value={novo.unidade_medida} onChange={(e) => setNovo({ ...novo, unidade_medida: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Qtd. Sistema</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={novo.quantidade_sistema}
                      onChange={(e) => setNovo({ ...novo, quantidade_sistema: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Qtd. Contada</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={novo.quantidade_contada}
                      onChange={(e) => setNovo({ ...novo, quantidade_contada: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Valor Unit. (R$)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={novo.valor_unitario}
                      onChange={(e) => setNovo({ ...novo, valor_unitario: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <Button size="sm" onClick={handleAdd} disabled={insertItem.isPending}>
                    <Plus size={14} className="mr-1" /> Adicionar
                  </Button>
                </div>
              </div>
            </details>

            {/* Tabela de itens */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>UN</TableHead>
                    <TableHead className="text-right">Qtd. Sistema</TableHead>
                    <TableHead className="text-right bg-primary/5">Qtd. Contada</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-right">Vlr. Unit.</TableHead>
                    <TableHead className="text-right">Dif. Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && itensFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                        {itens.length === 0
                          ? "Nenhum item registrado. Importe uma planilha ou adicione manualmente."
                          : "Nenhum item corresponde ao filtro."}
                      </TableCell>
                    </TableRow>
                  )}
                  {itensFiltrados.map((it: any) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      onSave={(patch) => updateItem.mutate({ id: it.id, patch })}
                      onDelete={() => {
                        if (confirm("Remover este item?")) deleteItem.mutate(it.id);
                      }}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImportItensEstoqueDialog
        open={openImport}
        onClose={() => setOpenImport(false)}
        blocoId={blocoId}
        blocoLabel={blocoLabel}
      />
    </>
  );
}

function ItemRow({
  item,
  onSave,
  onDelete,
}: {
  item: any;
  onSave: (patch: any) => void;
  onDelete: () => void;
}) {
  const importado = item.origem_item === "importado";
  const qtdSistemaAjustada = !!item.quantidade_sistema_ajustada;

  const [edit, setEdit] = useState({
    quantidade_sistema: String(item.quantidade_sistema ?? ""),
    quantidade_contada: String(item.quantidade_contada ?? ""),
    valor_unitario: String(item.valor_unitario ?? ""),
  });

  // Sync se item mudar externamente
  useEffect(() => {
    setEdit({
      quantidade_sistema: String(item.quantidade_sistema ?? ""),
      quantidade_contada: String(item.quantidade_contada ?? ""),
      valor_unitario: String(item.valor_unitario ?? ""),
    });
  }, [item.id, item.quantidade_sistema, item.quantidade_contada, item.valor_unitario]);

  const dirty =
    Number(edit.quantidade_sistema || 0) !== Number(item.quantidade_sistema || 0) ||
    Number(edit.quantidade_contada || 0) !== Number(item.quantidade_contada || 0) ||
    Number(edit.valor_unitario || 0) !== Number(item.valor_unitario || 0);

  const status = STATUS_LABELS[item.status_divergencia] || STATUS_LABELS.sem_diferenca;
  const dif = Number(item.diferenca_valor) || 0;
  const difQ = Number(item.diferenca_quantidade) || 0;

  const handleSave = () => {
    onSave({
      quantidade_sistema: Number(edit.quantidade_sistema || 0),
      quantidade_contada: Number(edit.quantidade_contada || 0),
      valor_unitario: Number(edit.valor_unitario || 0),
    });
  };

  return (
    <TableRow>
      <TableCell className="text-sm font-mono">
        <div className="flex items-center gap-1">
          {item.codigo_item || "—"}
          {importado && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-accent/30 border-accent">
              IMP
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm">{item.descricao_item || "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{item.unidade_medida || "—"}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {qtdSistemaAjustada && (
            <span title="Quantidade do sistema ajustada manualmente" className="text-warning-foreground">
              <AlertCircle size={11} />
            </span>
          )}
          <Input
            type="number"
            step="0.0001"
            className={`h-8 text-right font-mono text-xs ${qtdSistemaAjustada ? "border-warning/50" : ""}`}
            value={edit.quantidade_sistema}
            onChange={(e) => setEdit({ ...edit, quantidade_sistema: e.target.value })}
            onBlur={() => dirty && handleSave()}
          />
        </div>
      </TableCell>
      <TableCell className="text-right bg-primary/5">
        <Input
          type="number"
          step="0.0001"
          className="h-8 text-right font-mono text-xs font-semibold"
          value={edit.quantidade_contada}
          onChange={(e) => setEdit({ ...edit, quantidade_contada: e.target.value })}
          onBlur={() => dirty && handleSave()}
        />
      </TableCell>
      <TableCell
        className={`text-right font-mono text-sm ${
          difQ === 0 ? "" : difQ > 0 ? "text-success" : "text-destructive"
        }`}
      >
        {difQ.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          step="0.0001"
          className="h-8 text-right font-mono text-xs"
          value={edit.valor_unitario}
          onChange={(e) => setEdit({ ...edit, valor_unitario: e.target.value })}
          onBlur={() => dirty && handleSave()}
        />
      </TableCell>
      <TableCell
        className={`text-right font-mono text-sm ${
          dif === 0 ? "" : dif > 0 ? "text-success" : "text-destructive"
        }`}
      >
        {fmtBRL(dif)}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={status.cls}>
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        {dirty && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave} title="Salvar">
            <Save size={13} />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Remover">
          <Trash2 size={13} />
        </Button>
      </TableCell>
    </TableRow>
  );
}
