import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertCircle, Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";

interface Props {
  materialidade: any;
  trabalho: any;
  readOnly: boolean;
}

interface BaseRow {
  id: string;
  trabalho_materialidade_id: string;
  trabalho_auditoria_id: string;
  cliente_id: string;
  exercicio_id: string | null;
  nome_base: string;
  descricao_base: string | null;
  balancete_id: string | null;
  balancete_linha_id: string | null;
  codigo_conta_snapshot: string | null;
  descricao_conta_snapshot: string | null;
  saldo_base_snapshot: number | null;
  criterio_saldo_base: string;
  percentual_aplicado: number | null;
  valor_materialidade: number | null;
  observacoes: string | null;
  ordem: number | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

const CRITERIOS = [
  { value: "saldo_final_absoluto", label: "Saldo final (absoluto)" },
  { value: "saldo_final", label: "Saldo final" },
  { value: "saldo_devedor", label: "Saldo devedor" },
  { value: "saldo_credor", label: "Saldo credor" },
  { value: "valor_manual", label: "Valor manual" },
];

const fmtBRL = (v: any) =>
  v === null || v === undefined || v === ""
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
const fmtPct = (v: any) =>
  v === null || v === undefined || v === ""
    ? "—"
    : `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
const orDash = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));

const parseNum = (v: string): number | null => {
  const t2 = (v || "").trim().replace(",", ".");
  if (!t2) return null;
  const n = Number(t2);
  return isNaN(n) ? null : n;
};

export default function MaterialidadeBasesPanel({ materialidade, trabalho, readOnly }: Props) {
  const qc = useQueryClient();
  const matId = materialidade?.id as string | undefined;
  const trabalhoId = trabalho?.id as string | undefined;

  const basesQ = useQuery({
    queryKey: ["trabalho-materialidade-bases", matId],
    enabled: !!matId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("trabalho_materialidade_bases")
        .select("*")
        .eq("trabalho_materialidade_id", matId!)
        .order("ativo", { ascending: false })
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as BaseRow[];
    },
  });

  const ativas = (basesQ.data || []).filter((b) => b.ativo).length;
  const limiteAtingido = ativas >= 3;

  const balancetesQ = useQuery({
    queryKey: ["trabalho-balancetes-mat", trabalhoId],
    enabled: !!trabalhoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("balancetes")
        .select("id, nome_arquivo, tipo_balancete, data_importacao")
        .eq("trabalho_auditoria_id", trabalhoId!)
        .order("data_importacao", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  type FormState = {
    id: string | null;
    nome_base: string;
    descricao_base: string;
    balancete_id: string;
    balancete_linha_id: string;
    codigo_conta_snapshot: string;
    descricao_conta_snapshot: string;
    saldo_base_snapshot: string;
    criterio_saldo_base: string;
    percentual_aplicado: string;
    observacoes: string;
    ordem: string;
    ativo: boolean;
  };
  const emptyForm: FormState = {
    id: null,
    nome_base: "",
    descricao_base: "",
    balancete_id: "",
    balancete_linha_id: "",
    codigo_conta_snapshot: "",
    descricao_conta_snapshot: "",
    saldo_base_snapshot: "",
    criterio_saldo_base: "saldo_final_absoluto",
    percentual_aplicado: "",
    observacoes: "",
    ordem: "",
    ativo: true,
  };
  const [editing, setEditing] = useState<null | "create" | "edit">(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [contaFiltro, setContaFiltro] = useState("");

  const linhasQ = useQuery({
    queryKey: ["balancete-linhas-mat", form.balancete_id],
    enabled: !!form.balancete_id && editing !== null,
    queryFn: async () => {
      const all: any[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("balancete_linhas")
          .select("id, codigo_conta_balancete, descricao_conta_balancete, saldo_atual, saldo_anterior, debitos, creditos")
          .eq("balancete_id", form.balancete_id)
          .order("codigo_conta_balancete")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  const linhasFiltradas = useMemo(() => {
    const arr = linhasQ.data || [];
    const f = contaFiltro.trim().toLowerCase();
    if (!f) return arr.slice(0, 500);
    return arr.filter((l) =>
      String(l.codigo_conta_balancete || "").toLowerCase().includes(f) ||
      String(l.descricao_conta_balancete || "").toLowerCase().includes(f)
    ).slice(0, 500);
  }, [linhasQ.data, contaFiltro]);

  const valorCalculado = useMemo(() => {
    const s = parseNum(form.saldo_base_snapshot);
    const p = parseNum(form.percentual_aplicado);
    if (s === null || p === null) return null;
    return (s * p) / 100;
  }, [form.saldo_base_snapshot, form.percentual_aplicado]);

  const aplicarConta = (linha: any) => {
    if (!linha) return;
    const codigo = linha.codigo_conta_balancete ?? "";
    const desc = linha.descricao_conta_balancete ?? "";
    let saldo: number | null = null;
    const cb = form.criterio_saldo_base;
    const saldoAtual = linha.saldo_atual != null ? Number(linha.saldo_atual) : null;
    if (cb === "saldo_final") saldo = saldoAtual;
    else if (cb === "saldo_final_absoluto") saldo = saldoAtual != null ? Math.abs(saldoAtual) : null;
    else if (cb === "saldo_devedor") saldo = saldoAtual != null && saldoAtual > 0 ? saldoAtual : (saldoAtual != null ? 0 : null);
    else if (cb === "saldo_credor") saldo = saldoAtual != null && saldoAtual < 0 ? Math.abs(saldoAtual) : (saldoAtual != null ? 0 : null);
    else saldo = saldoAtual;
    setForm((f) => ({
      ...f,
      balancete_linha_id: linha.id,
      codigo_conta_snapshot: codigo,
      descricao_conta_snapshot: desc,
      saldo_base_snapshot: saldo != null ? String(saldo).replace(".", ",") : "",
    }));
  };

  useEffect(() => {
    if (form.criterio_saldo_base === "valor_manual") return;
    if (!form.balancete_linha_id) return;
    const linha = (linhasQ.data || []).find((l: any) => l.id === form.balancete_linha_id);
    if (linha) aplicarConta(linha);
  }, [form.criterio_saldo_base]);

  const openCreate = () => {
    if (readOnly) return;
    if (limiteAtingido) {
      toast.error("Limite inicial de 3 bases ativas atingido para esta materialidade.");
      return;
    }
    setForm(emptyForm);
    setEditing("create");
  };

  const openEdit = (b: BaseRow) => {
    if (readOnly) return;
    setForm({
      id: b.id,
      nome_base: b.nome_base ?? "",
      descricao_base: b.descricao_base ?? "",
      balancete_id: b.balancete_id ?? "",
      balancete_linha_id: b.balancete_linha_id ?? "",
      codigo_conta_snapshot: b.codigo_conta_snapshot ?? "",
      descricao_conta_snapshot: b.descricao_conta_snapshot ?? "",
      saldo_base_snapshot: b.saldo_base_snapshot != null ? String(b.saldo_base_snapshot).replace(".", ",") : "",
      criterio_saldo_base: b.criterio_saldo_base || "saldo_final_absoluto",
      percentual_aplicado: b.percentual_aplicado != null ? String(b.percentual_aplicado).replace(".", ",") : "",
      observacoes: b.observacoes ?? "",
      ordem: b.ordem != null ? String(b.ordem) : "",
      ativo: !!b.ativo,
    });
    setEditing("edit");
  };

  const validate = (): string | null => {
    if (!form.nome_base.trim()) return "Informe o nome da base.";
    if (!form.criterio_saldo_base) return "Selecione o critério de saldo-base.";
    if (form.criterio_saldo_base === "valor_manual") {
      if (parseNum(form.saldo_base_snapshot) === null) return "Para valor manual, informe o saldo-base.";
    } else {
      if (!form.balancete_linha_id) return "Selecione a conta do balancete (ou use 'Valor manual').";
    }
    const p = parseNum(form.percentual_aplicado);
    if (p !== null && p < 0) return "Percentual aplicado não pode ser negativo.";
    return null;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!matId || !trabalhoId) throw new Error("Materialidade/trabalho inválidos.");
      if (materialidade.status_materialidade !== "rascunho") {
        throw new Error("Apenas materialidade em rascunho aceita alterações de bases.");
      }
      const err = validate();
      if (err) throw new Error(err);

      const saldo = parseNum(form.saldo_base_snapshot);
      const perc = parseNum(form.percentual_aplicado);
      const valorMat = saldo != null && perc != null ? (saldo * perc) / 100 : null;

      const payload: any = {
        nome_base: form.nome_base.trim(),
        descricao_base: form.descricao_base.trim() || null,
        balancete_id: form.balancete_id || null,
        balancete_linha_id: form.criterio_saldo_base === "valor_manual" ? null : (form.balancete_linha_id || null),
        codigo_conta_snapshot: form.codigo_conta_snapshot || null,
        descricao_conta_snapshot: form.descricao_conta_snapshot || null,
        saldo_base_snapshot: saldo,
        criterio_saldo_base: form.criterio_saldo_base,
        percentual_aplicado: perc,
        valor_materialidade: valorMat,
        observacoes: form.observacoes.trim() || null,
        ordem: form.ordem ? Number(form.ordem) : null,
        ativo: form.ativo,
      };

      if (editing === "edit" && form.id) {
        const { error } = await (supabase as any)
          .from("trabalho_materialidade_bases")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        if (form.ativo) {
          const ativasNow = (basesQ.data || []).filter((b) => b.ativo).length;
          if (ativasNow >= 3) throw new Error("Limite inicial de 3 bases ativas atingido para esta materialidade.");
        }
        const insertPayload = {
          ...payload,
          trabalho_materialidade_id: matId,
          trabalho_auditoria_id: trabalhoId,
          cliente_id: trabalho?.cliente_id ?? null,
          exercicio_id: trabalho?.exercicio_id ?? null,
        };
        const { error } = await (supabase as any)
          .from("trabalho_materialidade_bases")
          .insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing === "edit" ? "Base atualizada" : "Base criada");
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["trabalho-materialidade-bases", matId] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar base"),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async (b: BaseRow) => {
      if (materialidade.status_materialidade !== "rascunho") {
        throw new Error("Materialidade não está em rascunho.");
      }
      if (!b.ativo) {
        const ativasNow = (basesQ.data || []).filter((x) => x.ativo).length;
        if (ativasNow >= 3) throw new Error("Limite inicial de 3 bases ativas atingido.");
      }
      const { error } = await (supabase as any)
        .from("trabalho_materialidade_bases")
        .update({ ativo: !b.ativo })
        .eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Base atualizada");
      qc.invalidateQueries({ queryKey: ["trabalho-materialidade-bases", matId] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao alterar base"),
  });

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          Bases de Materialidade
          <span className="ml-2 text-xs text-muted-foreground">
            ({ativas}/3 ativas · {(basesQ.data || []).length} total)
          </span>
        </div>
        {!readOnly && !editing && (
          <Button size="sm" onClick={openCreate} disabled={limiteAtingido}>
            <Plus size={14} className="mr-1" />Adicionar base
          </Button>
        )}
      </div>

      {readOnly && (
        <div className="rounded-md border border-muted-foreground/20 bg-muted/30 p-2 text-xs">
          As bases de materialidade vinculadas a uma materialidade aprovada ou substituída permanecem apenas para consulta.
          Alterações serão tratadas por nova versão em etapa futura.
        </div>
      )}

      {editing ? (
        <div className="space-y-3 border rounded-md p-3 bg-muted/20">
          <div className="text-sm font-medium">{editing === "create" ? "Nova base" : "Editar base"}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome da base <span className="text-destructive">*</span></Label>
              <Input value={form.nome_base} maxLength={200}
                onChange={(e) => setForm({ ...form, nome_base: e.target.value })}
                placeholder="Ex.: Receita operacional" />
            </div>
            <div>
              <Label className="text-xs">Critério de saldo-base <span className="text-destructive">*</span></Label>
              <Select value={form.criterio_saldo_base} onValueChange={(v) => setForm({ ...form, criterio_saldo_base: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRITERIOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {(form.criterio_saldo_base === "saldo_devedor" || form.criterio_saldo_base === "saldo_credor") && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  Critério tratado a partir do saldo final disponível.
                </div>
              )}
            </div>

            {form.criterio_saldo_base !== "valor_manual" && (
              <>
                <div>
                  <Label className="text-xs">Balancete</Label>
                  <Select
                    value={form.balancete_id}
                    onValueChange={(v) => setForm({ ...form, balancete_id: v, balancete_linha_id: "", codigo_conta_snapshot: "", descricao_conta_snapshot: "", saldo_base_snapshot: "" })}
                    disabled={balancetesQ.isLoading}
                  >
                    <SelectTrigger><SelectValue placeholder={balancetesQ.isLoading ? "Carregando..." : "Selecione o balancete"} /></SelectTrigger>
                    <SelectContent>
                      {(balancetesQ.data || []).map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nome_arquivo} · {b.tipo_balancete}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!balancetesQ.isLoading && (balancetesQ.data || []).length === 0 && (
                    <div className="text-[11px] text-muted-foreground mt-1">Nenhum balancete vinculado ao trabalho.</div>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Buscar conta</Label>
                  <Input value={contaFiltro} onChange={(e) => setContaFiltro(e.target.value)} placeholder="Código ou descrição..." disabled={!form.balancete_id} />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs">Conta do balancete</Label>
                  {!form.balancete_id ? (
                    <div className="text-xs text-muted-foreground border rounded p-2">Selecione um balancete primeiro.</div>
                  ) : linhasQ.isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={form.balancete_linha_id}
                      onValueChange={(v) => {
                        const linha = (linhasQ.data || []).find((l: any) => l.id === v);
                        aplicarConta(linha);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Selecione a conta (${linhasFiltradas.length} exibidas)`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {linhasFiltradas.map((l: any) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.codigo_conta_balancete} — {l.descricao_conta_balancete} — {fmtBRL(l.saldo_atual)}
                          </SelectItem>
                        ))}
                        {linhasFiltradas.length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma conta encontrada.</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {form.balancete_linha_id && form.saldo_base_snapshot === "" && (
                    <div className="text-[11px] text-warning-foreground mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Saldo não localizado para a conta selecionada.
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <Label className="text-xs">
                Saldo-base (R$){form.criterio_saldo_base === "valor_manual" && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                inputMode="decimal"
                value={form.saldo_base_snapshot}
                onChange={(e) => setForm({ ...form, saldo_base_snapshot: e.target.value })}
                disabled={form.criterio_saldo_base !== "valor_manual"}
              />
            </div>
            <div>
              <Label className="text-xs">Percentual aplicado (%)</Label>
              <Input inputMode="decimal" value={form.percentual_aplicado}
                onChange={(e) => setForm({ ...form, percentual_aplicado: e.target.value })}
                placeholder="Ex.: 1,5" />
            </div>
            <div>
              <Label className="text-xs">Valor da materialidade (calculado)</Label>
              <Input value={valorCalculado != null ? fmtBRL(valorCalculado) : ""} readOnly />
            </div>
            <div>
              <Label className="text-xs">Ordem</Label>
              <Input inputMode="numeric" value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                id="base-ativo"
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              />
              <Label htmlFor="base-ativo" className="text-xs">Ativa</Label>
            </div>
          </div>

          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={2} maxLength={2000} value={form.descricao_base}
              onChange={(e) => setForm({ ...form, descricao_base: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} maxLength={2000} value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditing(null); setForm(emptyForm); }} disabled={saveMutation.isPending}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar base"}
            </Button>
          </div>
        </div>
      ) : basesQ.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (basesQ.data || []).length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nenhuma base de materialidade cadastrada.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Critério</TableHead>
              <TableHead className="text-right">Saldo-base</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(basesQ.data || []).map((b) => (
              <TableRow key={b.id}>
                <TableCell className="text-sm">
                  <div className="font-medium">{orDash(b.nome_base)}</div>
                  {b.descricao_base && <div className="text-[11px] text-muted-foreground">{b.descricao_base}</div>}
                </TableCell>
                <TableCell className="text-xs">
                  {b.codigo_conta_snapshot ? (
                    <>
                      <div className="font-mono">{b.codigo_conta_snapshot}</div>
                      <div className="text-muted-foreground">{orDash(b.descricao_conta_snapshot)}</div>
                    </>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs">{orDash(CRITERIOS.find(c => c.value === b.criterio_saldo_base)?.label || b.criterio_saldo_base)}</TableCell>
                <TableCell className="text-right text-sm">{fmtBRL(b.saldo_base_snapshot)}</TableCell>
                <TableCell className="text-right text-sm">{fmtPct(b.percentual_aplicado)}</TableCell>
                <TableCell className="text-right text-sm font-medium">{fmtBRL(b.valor_materialidade)}</TableCell>
                <TableCell>
                  {b.ativo
                    ? <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">ativa</Badge>
                    : <Badge variant="outline" className="text-[10px]">inativa</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  {!readOnly && (
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(b)} title="Editar">
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleAtivoMutation.mutate(b)}
                        disabled={toggleAtivoMutation.isPending}
                        title={b.ativo ? "Inativar" : "Reativar"}
                      >
                        <Power size={14} />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
