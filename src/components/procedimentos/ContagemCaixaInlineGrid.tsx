import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Coins, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

const DENOMINACOES_MOEDA = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0];
const DENOMINACOES_NOTA = [2, 5, 10, 20, 50, 100, 200];

const fmtBRL = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Tipo = "nota" | "moeda";

interface Row {
  // Local row state. id present = persisted, undefined = pending
  id?: string;
  _localKey: string;
  tipo_denomincacao: Tipo;
  valor_unitario: string; // string for input control
  quantidade: string;
  observacao: string;
  _dirty?: boolean;
  _saving?: boolean;
}

interface Props {
  itemId: string;
  procedimentoId: string;
  detalhes: any[];
}

let LOCAL_SEQ = 0;
const newKey = () => `tmp-${++LOCAL_SEQ}-${Date.now()}`;

function rowFromServer(d: any): Row {
  return {
    id: d.id,
    _localKey: d.id,
    tipo_denomincacao: d.tipo_denomincacao,
    valor_unitario: String(d.valor_unitario ?? ""),
    quantidade: String(d.quantidade ?? ""),
    observacao: d.observacao || "",
  };
}

function emptyRow(tipo: Tipo = "nota", valor: string = ""): Row {
  return {
    _localKey: newKey(),
    tipo_denomincacao: tipo,
    valor_unitario: valor,
    quantidade: "",
    observacao: "",
    _dirty: false,
  };
}

export default function ContagemCaixaInlineGrid({ itemId, procedimentoId, detalhes }: Props) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() => {
    const base = (detalhes || []).map(rowFromServer);
    return base.length > 0 ? [...base, emptyRow()] : [emptyRow()];
  });
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Re-sync when server data changes (after invalidate). Preserve dirty unsaved rows.
  useEffect(() => {
    setRows((prev) => {
      const dirtyPending = prev.filter((r) => !r.id && (r._dirty || r.quantidade || r.valor_unitario));
      const fromServer = (detalhes || []).map(rowFromServer);
      const trailingEmpty = emptyRow();
      return [...fromServer, ...dirtyPending, trailingEmpty];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify((detalhes || []).map((d) => `${d.id}:${d.valor_unitario}:${d.quantidade}:${d.tipo_denomincacao}:${d.observacao || ""}`))]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["contagem-caixa-detalhes", procedimentoId] });
    qc.invalidateQueries({ queryKey: ["contagem-caixa-itens", procedimentoId] });
  };

  const saveRow = useMutation({
    mutationFn: async (row: Row) => {
      const valor = Number(row.valor_unitario);
      const qtd = parseInt(row.quantidade || "0", 10);
      if (!valor || !qtd) throw new Error("Preencha valor e quantidade");
      const payload = {
        contagem_caixa_item_id: itemId,
        tipo_denomincacao: row.tipo_denomincacao,
        valor_unitario: valor,
        quantidade: qtd,
        observacao: row.observacao || null,
      };
      if (row.id) {
        const { error } = await (supabase as any)
          .from("procedimento_contagem_caixa_detalhes")
          .update(payload)
          .eq("id", row.id);
        if (error) throw error;
        return row.id;
      } else {
        const { data, error } = await (supabase as any)
          .from("procedimento_contagem_caixa_detalhes")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
    onSettled: () => invalidate(),
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("procedimento_contagem_caixa_detalhes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Linha removida");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  const persistRow = async (key: string) => {
    const row = rows.find((r) => r._localKey === key);
    if (!row) return;
    const valor = Number(row.valor_unitario);
    const qtd = parseInt(row.quantidade || "0", 10);
    if (!valor || !qtd) return; // skip empty
    if (!row._dirty) return;
    setRows((prev) => prev.map((r) => (r._localKey === key ? { ...r, _saving: true } : r)));
    try {
      const id = await saveRow.mutateAsync(row);
      setRows((prev) =>
        prev.map((r) => (r._localKey === key ? { ...r, id, _dirty: false, _saving: false } : r)),
      );
    } catch {
      setRows((prev) => prev.map((r) => (r._localKey === key ? { ...r, _saving: false } : r)));
    }
  };

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) => (r._localKey === key ? { ...r, ...patch, _dirty: true } : r)),
    );
  };

  const addEmpty = (tipo: Tipo = "nota") => {
    const k = newKey();
    setRows((prev) => [...prev, { ...emptyRow(tipo), _localKey: k }]);
    setTimeout(() => cellRefs.current[`${k}-qtd`]?.focus(), 30);
  };

  const ensureTrailingEmpty = () => {
    setRows((prev) => {
      const last = prev[prev.length - 1];
      if (last && !last.id && !last.valor_unitario && !last.quantidade) return prev;
      return [...prev, emptyRow(last?.tipo_denomincacao || "nota")];
    });
  };

  const handleEnter = async (key: string) => {
    await persistRow(key);
    const idx = rows.findIndex((r) => r._localKey === key);
    const next = rows[idx + 1];
    if (next) {
      cellRefs.current[`${next._localKey}-qtd`]?.focus();
    } else {
      ensureTrailingEmpty();
      setTimeout(() => {
        setRows((prev) => {
          const last = prev[prev.length - 1];
          if (last) cellRefs.current[`${last._localKey}-qtd`]?.focus();
          return prev;
        });
      }, 50);
    }
  };

  const removeRow = async (row: Row) => {
    if (row.id) {
      if (!confirm("Remover este lançamento?")) return;
      deleteRow.mutate(row.id);
    } else {
      setRows((prev) => prev.filter((r) => r._localKey !== row._localKey));
    }
  };

  // MODO RÁPIDO: pré-popula todas as denominações
  const carregarModoRapido = () => {
    const existing = new Set(
      rows
        .filter((r) => r.id || (r.valor_unitario && r.quantidade))
        .map((r) => `${r.tipo_denomincacao}:${Number(r.valor_unitario)}`),
    );
    const novas: Row[] = [];
    for (const v of DENOMINACOES_NOTA) {
      const k = `nota:${v}`;
      if (!existing.has(k)) novas.push({ ...emptyRow("nota", String(v)), _localKey: newKey() });
    }
    for (const v of DENOMINACOES_MOEDA) {
      const k = `moeda:${v}`;
      if (!existing.has(k)) novas.push({ ...emptyRow("moeda", String(v)), _localKey: newKey() });
    }
    if (novas.length === 0) {
      toast.info("Todas as denominações já estão na grade");
      return;
    }
    setRows((prev) => {
      const cleaned = prev.filter((r) => r.id || r.valor_unitario || r.quantidade);
      return [...cleaned, ...novas, emptyRow()];
    });
    toast.success(`${novas.length} denominações carregadas. Preencha as quantidades.`);
    setTimeout(() => {
      const first = novas[0];
      if (first) cellRefs.current[`${first._localKey}-qtd`]?.focus();
    }, 50);
  };

  const totalGrid = useMemo(() => {
    return rows.reduce((acc, r) => {
      const v = Number(r.valor_unitario) || 0;
      const q = parseInt(r.quantidade || "0", 10) || 0;
      return acc + v * q;
    }, 0);
  }, [rows]);

  const denominacoesPara = (tipo: Tipo) =>
    tipo === "nota" ? DENOMINACOES_NOTA : DENOMINACOES_MOEDA;

  const onKeyDownQtd = (e: KeyboardEvent<HTMLInputElement>, key: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnter(key);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs text-muted-foreground">
          Digite direto na tabela. <kbd className="px-1 py-0.5 border rounded text-[10px]">Tab</kbd> navega,{" "}
          <kbd className="px-1 py-0.5 border rounded text-[10px]">Enter</kbd> salva e vai para próxima linha.
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={carregarModoRapido}>
            <Zap size={12} className="mr-1" /> Modo rápido
          </Button>
          <Button size="sm" variant="outline" onClick={() => addEmpty("nota")}>
            <Plus size={12} className="mr-1" /> Nova linha
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Tipo</TableHead>
              <TableHead className="w-[140px]">Valor Unitário</TableHead>
              <TableHead className="w-[110px] text-right">Quantidade</TableHead>
              <TableHead className="w-[130px] text-right">Total</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const valor = Number(r.valor_unitario) || 0;
              const qtd = parseInt(r.quantidade || "0", 10) || 0;
              const total = valor * qtd;
              const denoms = denominacoesPara(r.tipo_denomincacao);
              const isCustomValor =
                r.valor_unitario !== "" && !denoms.map(String).includes(String(Number(r.valor_unitario)));
              return (
                <TableRow key={r._localKey} className={r._dirty ? "bg-warning/5" : ""}>
                  <TableCell>
                    <select
                      value={r.tipo_denomincacao}
                      onChange={(e) =>
                        updateRow(r._localKey, {
                          tipo_denomincacao: e.target.value as Tipo,
                          valor_unitario: "",
                        })
                      }
                      onBlur={() => persistRow(r._localKey)}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="nota">Nota</option>
                      <option value="moeda">Moeda</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <select
                        value={isCustomValor ? "__custom__" : r.valor_unitario}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__custom__") {
                            updateRow(r._localKey, { valor_unitario: "" });
                            setTimeout(() => cellRefs.current[`${r._localKey}-valor`]?.focus(), 20);
                          } else {
                            updateRow(r._localKey, { valor_unitario: v });
                          }
                        }}
                        onBlur={() => persistRow(r._localKey)}
                        className="h-8 w-full rounded-md border border-input bg-background px-1 text-xs font-mono"
                      >
                        <option value="">—</option>
                        {denoms.map((d) => (
                          <option key={d} value={String(d)}>
                            {fmtBRL(d)}
                          </option>
                        ))}
                        <option value="__custom__">Outro...</option>
                      </select>
                      {isCustomValor && (
                        <Input
                          ref={(el) => (cellRefs.current[`${r._localKey}-valor`] = el)}
                          type="number"
                          step="0.01"
                          value={r.valor_unitario}
                          onChange={(e) => updateRow(r._localKey, { valor_unitario: e.target.value })}
                          onBlur={() => persistRow(r._localKey)}
                          className="h-8 w-20 text-xs font-mono"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      ref={(el) => (cellRefs.current[`${r._localKey}-qtd`] = el)}
                      type="number"
                      min="0"
                      value={r.quantidade}
                      onChange={(e) => updateRow(r._localKey, { quantidade: e.target.value })}
                      onBlur={() => persistRow(r._localKey)}
                      onKeyDown={(e) => onKeyDownQtd(e, r._localKey)}
                      className="h-8 text-right font-mono text-xs"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">
                    {total > 0 ? fmtBRL(total) : "—"}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={r.observacao}
                      onChange={(e) => updateRow(r._localKey, { observacao: e.target.value })}
                      onBlur={() => persistRow(r._localKey)}
                      className="h-8 text-xs"
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r._saving && <span className="text-[10px] text-muted-foreground">...</span>}
                      {r.id && !r._dirty && !r._saving && (
                        <span className="text-[10px] text-success">✓</span>
                      )}
                      {(r.id || r.valor_unitario || r.quantidade) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeRow(r)}
                        >
                          <Trash2 size={11} />
                        </Button>
                      )}
                      <span className="inline-flex items-center text-muted-foreground">
                        {r.tipo_denomincacao === "nota" ? <Banknote size={11} /> : <Coins size={11} />}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end text-xs">
        <span className="text-muted-foreground mr-2">Total contado nesta grade:</span>
        <span className="font-mono font-semibold">{fmtBRL(totalGrid)}</span>
      </div>
    </div>
  );
}
