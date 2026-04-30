import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Boxes, Layers, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ContagemEstoqueBlocoDetail from "./ContagemEstoqueBlocoDetail";

const fmtBRL = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });


interface Props {
  procedimentoId: string;
  procedimento?: any;
}

interface BlocoForm {
  filial: string;
  setor: string;
  tipo_estoque: string;
  categoria_estoque: string;
  descricao_bloco: string;
  responsavel_local: string;
  observacao: string;
  data_referencia: string;
  data_execucao: string;
}

const emptyBloco: BlocoForm = {
  filial: "",
  setor: "",
  tipo_estoque: "",
  categoria_estoque: "",
  descricao_bloco: "",
  responsavel_local: "",
  observacao: "",
  data_referencia: "",
  data_execucao: "",
};

export default function ContagemEstoquePanel({ procedimentoId, procedimento }: Props) {
  const qc = useQueryClient();
  const [openBloco, setOpenBloco] = useState(false);
  const [editingBloco, setEditingBloco] = useState<any>(null);
  const [form, setForm] = useState<BlocoForm>(emptyBloco);
  const [openDetailBlocoId, setOpenDetailBlocoId] = useState<string | null>(null);

  const { data: blocos = [], isLoading } = useQuery({
    queryKey: ["ce-blocos", procedimentoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimento_contagem_estoque_blocos")
        .select("*")
        .eq("procedimento_auxiliar_id", procedimentoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["ce-itens-resumo", procedimentoId, blocos.map((b: any) => b.id).join(",")],
    enabled: blocos.length > 0,
    queryFn: async () => {
      const ids = blocos.map((b: any) => b.id);
      if (ids.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("procedimento_contagem_estoque_itens")
        .select(
          "contagem_estoque_bloco_id, diferenca_valor, status_divergencia, quantidade_contada, origem_item, contado"
        )
        .in("contagem_estoque_bloco_id", ids);
      if (error) throw error;
      return data || [];
    },
  });

  // Mesma heurística usada no detalhe do bloco
  const isNaoContadoLocal = (i: any) => {
    if (i?.status_divergencia === "nao_contado") return true;
    if (i?.contado === false) return true;
    const q = i?.quantidade_contada;
    const semContagem = q === null || q === undefined || Number(q) === 0;
    return semContagem && i?.origem_item === "importado";
  };

  const resumoPorBloco = useMemo(() => {
    const map: Record<
      string,
      { total: number; contados: number; naoContados: number; diferenca: number; comDif: number }
    > = {};
    for (const i of itens as any[]) {
      const k = i.contagem_estoque_bloco_id;
      if (!map[k]) map[k] = { total: 0, contados: 0, naoContados: 0, diferenca: 0, comDif: 0 };
      map[k].total += 1;
      if (isNaoContadoLocal(i)) {
        map[k].naoContados += 1;
        continue; // não soma em diferença
      }
      map[k].contados += 1;
      map[k].diferenca += Number(i.diferenca_valor) || 0;
      if (i.status_divergencia && i.status_divergencia !== "sem_diferenca") map[k].comDif += 1;
    }
    return map;
  }, [itens]);

  const totaisGerais = useMemo(() => {
    let totalItens = 0;
    let totalContados = 0;
    let totalNaoContados = 0;
    let totalDif = 0;
    let totalComDif = 0;
    for (const k of Object.keys(resumoPorBloco)) {
      totalItens += resumoPorBloco[k].total;
      totalContados += resumoPorBloco[k].contados;
      totalNaoContados += resumoPorBloco[k].naoContados;
      totalDif += resumoPorBloco[k].diferenca;
      totalComDif += resumoPorBloco[k].comDif;
    }
    return { totalItens, totalContados, totalNaoContados, totalDif, totalComDif, blocos: blocos.length };
  }, [resumoPorBloco, blocos.length]);

  const upsertBloco = useMutation({
    mutationFn: async () => {
      const payload = {
        procedimento_auxiliar_id: procedimentoId,
        filial: form.filial || null,
        setor: form.setor || null,
        tipo_estoque: form.tipo_estoque || null,
        categoria_estoque: form.categoria_estoque || null,
        descricao_bloco: form.descricao_bloco || null,
        responsavel_local: form.responsavel_local || null,
        observacao: form.observacao || null,
        data_referencia: form.data_referencia || null,
        data_execucao: form.data_execucao || null,
      };
      if (editingBloco) {
        const { error } = await (supabase as any)
          .from("procedimento_contagem_estoque_blocos")
          .update(payload)
          .eq("id", editingBloco.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("procedimento_contagem_estoque_blocos")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ce-blocos", procedimentoId] });
      toast.success(editingBloco ? "Bloco atualizado" : "Bloco criado");
      setOpenBloco(false);
      setEditingBloco(null);
      setForm(emptyBloco);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar bloco"),
  });

  const deleteBloco = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("procedimento_contagem_estoque_blocos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ce-blocos", procedimentoId] });
      toast.success("Bloco removido");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  const handleNew = () => {
    setEditingBloco(null);
    const hoje = new Date().toISOString().slice(0, 10);
    setForm({
      ...emptyBloco,
      data_referencia: procedimento?.data_base_referencia || "",
      data_execucao: hoje,
    });
    setOpenBloco(true);
  };

  const handleEdit = (b: any) => {
    setEditingBloco(b);
    setForm({
      filial: b.filial || "",
      setor: b.setor || "",
      tipo_estoque: b.tipo_estoque || "",
      categoria_estoque: b.categoria_estoque || "",
      descricao_bloco: b.descricao_bloco || "",
      responsavel_local: b.responsavel_local || "",
      observacao: b.observacao || "",
      data_referencia: b.data_referencia || "",
      data_execucao: b.data_execucao || "",
    });
    setOpenBloco(true);
  };

  const submitBloco = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.filial && !form.setor && !form.descricao_bloco)
      return toast.error("Informe ao menos Filial, Setor ou Descrição do bloco");
    upsertBloco.mutate();
  };

  const blocoAtivo = blocos.find((b: any) => b.id === openDetailBlocoId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Boxes size={16} /> Contagem de Estoque
          </h3>
          <p className="text-xs text-muted-foreground">
            Blocos de contagem por filial, setor e tipo de estoque com itens detalhados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link
              to={`/procedimentos/dashboard-estoques?${new URLSearchParams(
                Object.entries({
                  cliente_id: procedimento?.cliente_id,
                  trabalho_id: procedimento?.trabalho_id,
                  procedimento_id: procedimentoId,
                }).filter(([, v]) => Boolean(v)) as [string, string][]
              ).toString()}`}
            >
              <BarChart3 size={14} className="mr-1" /> Ver Dashboard
            </Link>
          </Button>
          <Button size="sm" onClick={handleNew}>
            <Plus size={14} className="mr-1" /> Novo Bloco
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Blocos" value={String(totaisGerais.blocos)} />
        <SummaryCard label="Itens importados" value={String(totaisGerais.totalItens)} />
        <SummaryCard
          label="Não contados"
          value={String(totaisGerais.totalNaoContados)}
          tone={totaisGerais.totalNaoContados > 0 ? "warning" : "neutral"}
        />
        <SummaryCard
          label="Contados"
          value={String(totaisGerais.totalContados)}
          tone={totaisGerais.totalContados > 0 ? "positive" : "neutral"}
        />
        <SummaryCard
          label="Com divergência"
          value={String(totaisGerais.totalComDif)}
          tone={totaisGerais.totalComDif > 0 ? "negative" : "neutral"}
        />
        <SummaryCard
          label="Diferença financeira"
          value={fmtBRL(totaisGerais.totalDif)}
          tone={totaisGerais.totalDif === 0 ? "neutral" : totaisGerais.totalDif > 0 ? "positive" : "negative"}
        />
      </div>

      {/* Lista de blocos */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filial</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Execução</TableHead>
              <TableHead>Responsável local</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead className="text-right">Divergências</TableHead>
              <TableHead className="text-right">Dif. Financeira</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-6">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && blocos.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  <Layers className="mx-auto mb-2 opacity-50" size={28} />
                  Nenhum bloco de contagem cadastrado. Clique em "Novo Bloco" para iniciar.
                </TableCell>
              </TableRow>
            )}
            {blocos.map((b: any) => {
              const r =
                resumoPorBloco[b.id] || { total: 0, contados: 0, naoContados: 0, diferenca: 0, comDif: 0 };
              const fmtD = (d?: string | null) =>
                d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
              return (
                <TableRow
                  key={b.id}
                  className="cursor-pointer"
                  onClick={() => setOpenDetailBlocoId(b.id)}
                >
                  <TableCell className="font-medium">{b.filial || "—"}</TableCell>
                  <TableCell className="text-sm">{b.setor || "—"}</TableCell>
                  <TableCell className="text-sm">{b.tipo_estoque || "—"}</TableCell>
                  <TableCell className="text-sm">{b.categoria_estoque || "—"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{fmtD(b.data_referencia)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{fmtD(b.data_execucao)}</TableCell>
                  <TableCell className="text-sm">{b.responsavel_local || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <span className="text-success">{r.contados}</span>
                    <span className="text-muted-foreground"> / {r.total}</span>
                    {r.naoContados > 0 && (
                      <div className="text-[10px] text-warning-foreground">
                        {r.naoContados} pendentes
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.comDif > 0 ? (
                      <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/30">
                        {r.comDif}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm ${
                      r.diferenca === 0 ? "" : r.diferenca > 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {fmtBRL(r.diferenca)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(b)}>
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => {
                        if (confirm("Remover este bloco e todos os seus itens?"))
                          deleteBloco.mutate(b.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: bloco */}
      <Dialog
        open={openBloco}
        onOpenChange={(v) => {
          setOpenBloco(v);
          if (!v) {
            setEditingBloco(null);
            setForm(emptyBloco);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBloco ? "Editar Bloco" : "Novo Bloco de Contagem"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitBloco} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Filial</Label>
                <Input
                  value={form.filial}
                  onChange={(e) => setForm({ ...form, filial: e.target.value })}
                  placeholder="Ex: Matriz - SP"
                />
              </div>
              <div>
                <Label>Setor</Label>
                <Input
                  value={form.setor}
                  onChange={(e) => setForm({ ...form, setor: e.target.value })}
                  placeholder="Ex: Almoxarifado Central"
                />
              </div>
              <div>
                <Label>Tipo de Estoque</Label>
                <Input
                  value={form.tipo_estoque}
                  onChange={(e) => setForm({ ...form, tipo_estoque: e.target.value })}
                  placeholder="Ex: Matéria-prima, Produto Acabado"
                />
              </div>
              <div>
                <Label>Categoria (opcional)</Label>
                <Input
                  value={form.categoria_estoque}
                  onChange={(e) => setForm({ ...form, categoria_estoque: e.target.value })}
                  placeholder="Ex: Insumos elétricos"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de referência</Label>
                <Input
                  type="date"
                  value={form.data_referencia}
                  onChange={(e) => setForm({ ...form, data_referencia: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Data-base contábil deste bloco. Sugerida a partir da data-base geral do procedimento.
                </p>
              </div>
              <div>
                <Label>Data de execução</Label>
                <Input
                  type="date"
                  value={form.data_execucao}
                  onChange={(e) => setForm({ ...form, data_execucao: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Data em que esta contagem foi efetivamente realizada.
                </p>
              </div>
            </div>
            <div>
              <Label>Descrição do Bloco</Label>
              <Input
                value={form.descricao_bloco}
                onChange={(e) => setForm({ ...form, descricao_bloco: e.target.value })}
                placeholder="Ex: Contagem física do almoxarifado matriz"
              />
            </div>
            <div>
              <Label>Responsável Local</Label>
              <Input
                value={form.responsavel_local}
                onChange={(e) => setForm({ ...form, responsavel_local: e.target.value })}
              />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea
                rows={2}
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenBloco(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsertBloco.isPending}>
                {upsertBloco.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detalhe do bloco (itens) */}
      <ContagemEstoqueBlocoDetail
        bloco={blocoAtivo}
        open={!!openDetailBlocoId}
        onClose={() => setOpenDetailBlocoId(null)}
      />
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
  tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  const toneCls =
    tone === "positive"
      ? "text-success border-success/30"
      : tone === "negative"
      ? "text-destructive border-destructive/30"
      : tone === "warning"
      ? "text-warning-foreground border-warning/30"
      : "text-foreground border-border";
  return (
    <div className={`bg-card border rounded-lg p-3 ${toneCls}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold font-mono mt-1">{value}</div>
    </div>
  );
}
