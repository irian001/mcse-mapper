/**
 * ModeloMatrizRiscoItensPanel — Fase 0A.3.5.2
 *
 * Painel de Riscos do Modelo (itens padrão da matriz de riscos).
 * Tabela: public.modelo_matriz_risco_itens
 *
 * Regras:
 * - Edição (criar/editar/inativar/reativar) somente quando o modelo está em rascunho
 *   e o usuário possui perfil admin / socio / gerente.
 * - DELETE físico não é permitido (trigger no banco).
 * - Snapshots da conta MCSE (codigo/descricao/grupo) são preenchidos pelo trigger
 *   `validar_modelo_matriz_risco_item` — NÃO enviar manualmente.
 *
 * Dívida técnica: types do Supabase ainda não reconhecem `modelo_matriz_risco_itens`;
 * usamos interface local + `(supabase as any)`.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Info, Pencil, Plus, Power, RotateCcw, Search, Eye, Link2 } from "lucide-react";
import { toast } from "sonner";
import ModeloRiscoItemVinculosDialog from "./ModeloRiscoItemVinculosDialog";

// ============ Tipagem local ============
export interface ModeloMatrizRiscoItem {
  id: string;
  modelo_matriz_risco_id: string;
  codigo_item_modelo: string | null;
  ordem: number;
  area_ciclo: string | null;
  conta_mcse_id: string | null;
  codigo_conta_snapshot: string | null;
  descricao_conta_snapshot: string | null;
  grupo_contabil: string | null;
  assertiva: string | null;
  risco_identificado: string;
  tipo_risco: string | null;
  causa: string | null;
  impacto_potencial: string | null;
  probabilidade: string | null;
  impacto: string | null;
  nivel_risco: string | null;
  risco_significativo: boolean;
  risco_fraude: boolean;
  controle_relevante: boolean;
  risco_controle: boolean;
  resposta_planejada: string | null;
  natureza_resposta: string | null;
  extensao_resposta: string | null;
  oportunidade_resposta: string | null;
  evidencia_esperada: string | null;
  procedimento_sugerido: string | null;
  obrigatorio: boolean;
  ativo: boolean;
  observacoes: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============ Domínios ============
const ASSERTIVAS = [
  "existencia", "integridade", "direitos_obrigacoes", "avaliacao",
  "apresentacao_divulgacao", "corte", "ocorrencia", "exatidao", "outro",
] as const;
const TIPOS_RISCO = [
  "risco_inerente", "risco_controle", "risco_distorcao_relevante", "risco_fraude",
  "risco_divulgacao", "risco_estimativa", "risco_ti", "risco_operacional", "outro",
] as const;
const PROBABILIDADES = ["baixa", "media", "alta"] as const;
const IMPACTOS = ["baixo", "medio", "alto"] as const;
const NIVEIS_RISCO = ["baixo", "medio", "alto", "critico"] as const;

const NONE = "__none__";
const LABELS: Record<string, string> = {
  existencia: "Existência", integridade: "Integridade",
  direitos_obrigacoes: "Direitos e Obrigações", avaliacao: "Avaliação",
  apresentacao_divulgacao: "Apresentação e Divulgação", corte: "Corte",
  ocorrencia: "Ocorrência", exatidao: "Exatidão", outro: "Outro",
  risco_inerente: "Risco inerente", risco_controle: "Risco de controle",
  risco_distorcao_relevante: "Risco de distorção relevante",
  risco_fraude: "Risco de fraude", risco_divulgacao: "Risco de divulgação",
  risco_estimativa: "Risco de estimativa", risco_ti: "Risco de TI",
  risco_operacional: "Risco operacional",
  baixa: "Baixa", media: "Média", alta: "Alta",
  baixo: "Baixo", medio: "Médio", alto: "Alto", critico: "Crítico",
};
const niceLabel = (v: string | null | undefined) => (v ? LABELS[v] || v.replace(/_/g, " ") : "—");
const nivelOrder: Record<string, number> = { critico: 4, alto: 3, medio: 2, baixo: 1 };
const probabilidadePeso: Record<string, number> = { baixa: 1, media: 2, alta: 3 };
const impactoPeso: Record<string, number> = { baixo: 1, medio: 2, alto: 3 };
const nivelByScore = (score: number): string => {
  if (score <= 2) return "baixo";
  if (score <= 4) return "medio";
  if (score <= 6) return "alto";
  return "critico";
};
const badgeNivelClass = (n: string | null | undefined) => {
  switch (n) {
    case "critico": return "bg-red-600 text-white";
    case "alto":    return "bg-orange-500 text-white";
    case "medio":   return "bg-amber-400 text-black";
    case "baixo":   return "bg-emerald-600 text-white";
    default:        return "bg-muted text-muted-foreground";
  }
};

// ============ Form ============
type FormState = {
  codigo_item_modelo: string;
  ordem: string;
  area_ciclo: string;
  conta_mcse_id: string;
  assertiva: string;
  risco_identificado: string;
  tipo_risco: string;
  causa: string;
  impacto_potencial: string;
  probabilidade: string;
  impacto: string;
  nivel_risco: string;
  risco_significativo: boolean;
  risco_fraude: boolean;
  controle_relevante: boolean;
  risco_controle: boolean;
  resposta_planejada: string;
  natureza_resposta: string;
  extensao_resposta: string;
  oportunidade_resposta: string;
  evidencia_esperada: string;
  procedimento_sugerido: string;
  obrigatorio: boolean;
  ativo: boolean;
  observacoes: string;
};
const emptyForm: FormState = {
  codigo_item_modelo: "", ordem: "0", area_ciclo: "", conta_mcse_id: "",
  assertiva: "", risco_identificado: "", tipo_risco: "", causa: "",
  impacto_potencial: "", probabilidade: "", impacto: "", nivel_risco: "",
  risco_significativo: false, risco_fraude: false,
  controle_relevante: false, risco_controle: false,
  resposta_planejada: "", natureza_resposta: "", extensao_resposta: "",
  oportunidade_resposta: "", evidencia_esperada: "", procedimento_sugerido: "",
  obrigatorio: false, ativo: true, observacoes: "",
};

interface Props {
  modeloId: string;
  statusModelo: string;
  canEdit: boolean;
}

function mapErr(err: any, fallback = "Erro inesperado"): string {
  const msg = String(err?.message || "");
  if (err?.code === "42501" || msg.includes("row-level security") || msg.includes("permission") || msg.includes("permissao")) {
    return "Acesso negado: você não tem permissão para esta ação.";
  }
  if (err?.code === "23505" || msg.includes("uq_mmri_modelo_codigo_item") || msg.includes("duplicate") || msg.includes("unique")) {
    return "Já existe um item com este código neste modelo.";
  }
  if (msg.includes("rascunho")) {
    return "Os itens só podem ser alterados enquanto o modelo estiver em rascunho.";
  }
  if (msg.includes("conta MCSE") && msg.includes("inativa")) {
    return "A conta MCSE selecionada está inativa e não pode permanecer em item ativo.";
  }
  if (msg.includes("Conta MCSE nao localizada") || msg.includes("Conta MCSE não localizada")) {
    return "Conta MCSE não localizada.";
  }
  if (msg.includes("excluir fisicamente") || msg.includes("Nao e permitido excluir")) {
    return "Não é permitido excluir fisicamente. Utilize inativação.";
  }
  if (msg.includes("risco_identificado") || msg.includes("chk_mmri_risco_identificado")) {
    return "Descreva o risco identificado.";
  }
  return msg || fallback;
}

export default function ModeloMatrizRiscoItensPanel({ modeloId, statusModelo, canEdit }: Props) {
  const qc = useQueryClient();
  const isRascunho = statusModelo === "rascunho";
  const canMutate = canEdit && isRascunho;
  const readOnly = !canMutate;

  // ---------- Query ----------
  const itensQ = useQuery({
    queryKey: ["modelo-matriz-risco-itens", modeloId],
    enabled: !!modeloId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("modelo_matriz_risco_itens")
        .select("*")
        .eq("modelo_matriz_risco_id", modeloId)
        .order("ativo", { ascending: false })
        .order("obrigatorio", { ascending: false })
        .order("ordem", { ascending: true })
        .order("risco_identificado", { ascending: true });
      if (error) throw error;
      return (data || []) as ModeloMatrizRiscoItem[];
    },
  });

  const itens = useMemo(() => {
    const arr = itensQ.data || [];
    return [...arr].sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      if (a.obrigatorio !== b.obrigatorio) return a.obrigatorio ? -1 : 1;
      if ((a.ordem ?? 0) !== (b.ordem ?? 0)) return (a.ordem ?? 0) - (b.ordem ?? 0);
      const n = (nivelOrder[b.nivel_risco || ""] || 0) - (nivelOrder[a.nivel_risco || ""] || 0);
      if (n !== 0) return n;
      return (a.risco_identificado || "").localeCompare(b.risco_identificado || "");
    });
  }, [itensQ.data]);

  // ---------- Dialog/Form ----------
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [contaSearch, setContaSearch] = useState("");

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setViewOnly(false);
    setContaSearch("");
    setOpen(true);
  };
  const openEdit = (r: ModeloMatrizRiscoItem) => {
    setForm({
      codigo_item_modelo: r.codigo_item_modelo || "",
      ordem: String(r.ordem ?? 0),
      area_ciclo: r.area_ciclo || "",
      conta_mcse_id: r.conta_mcse_id || "",
      assertiva: r.assertiva || "",
      risco_identificado: r.risco_identificado || "",
      tipo_risco: r.tipo_risco || "",
      causa: r.causa || "",
      impacto_potencial: r.impacto_potencial || "",
      probabilidade: r.probabilidade || "",
      impacto: r.impacto || "",
      nivel_risco: r.nivel_risco || "",
      risco_significativo: !!r.risco_significativo,
      risco_fraude: !!r.risco_fraude,
      controle_relevante: !!r.controle_relevante,
      risco_controle: !!r.risco_controle,
      resposta_planejada: r.resposta_planejada || "",
      natureza_resposta: r.natureza_resposta || "",
      extensao_resposta: r.extensao_resposta || "",
      oportunidade_resposta: r.oportunidade_resposta || "",
      evidencia_esperada: r.evidencia_esperada || "",
      procedimento_sugerido: r.procedimento_sugerido || "",
      obrigatorio: !!r.obrigatorio,
      ativo: !!r.ativo,
      observacoes: r.observacoes || "",
    });
    setEditingId(r.id);
    setViewOnly(readOnly);
    setContaSearch("");
    setOpen(true);
  };

  // Snapshot exibido apenas para referência (preenchido pelo banco)
  const contaAtualLabel = useMemo(() => {
    if (!editingId) return null;
    const r = (itensQ.data || []).find((x) => x.id === editingId);
    if (!r?.conta_mcse_id) return null;
    return `${r.codigo_conta_snapshot || "?"} — ${r.descricao_conta_snapshot || ""}`;
  }, [editingId, itensQ.data]);

  // ---------- Busca de Conta MCSE ----------
  const contasQ = useQuery({
    queryKey: ["mcse-contas-modelo-itens", contaSearch],
    enabled: open && contaSearch.trim().length >= 2,
    queryFn: async () => {
      const term = contaSearch.trim();
      const { data, error } = await supabase
        .from("mcse_contas")
        .select("id, codigo_mcse, descricao_conta, aceita_lancamento, ativo, mcse_grupos(descricao_grupo)")
        .or(`codigo_mcse.ilike.%${term}%,descricao_conta.ilike.%${term}%`)
        .eq("ativo", true)
        .order("aceita_lancamento", { ascending: false })
        .order("codigo_mcse")
        .limit(30);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // ---------- Nível sugerido ----------
  const scoreSugerido = useMemo(() => {
    const p = probabilidadePeso[form.probabilidade];
    const i = impactoPeso[form.impacto];
    if (!p || !i) return null;
    return p * i;
  }, [form.probabilidade, form.impacto]);
  const nivelSugerido = scoreSugerido ? nivelByScore(scoreSugerido) : "";

  // ---------- Save ----------
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.risco_identificado.trim()) {
        throw new Error("Informe a descrição do risco identificado.");
      }
      const ordemNum = parseInt(form.ordem || "0", 10);
      if (Number.isNaN(ordemNum) || ordemNum < 0) {
        throw new Error("Ordem deve ser um inteiro não negativo.");
      }
      const payload: any = {
        codigo_item_modelo: form.codigo_item_modelo.trim() || null,
        ordem: ordemNum,
        area_ciclo: form.area_ciclo.trim() || null,
        conta_mcse_id: form.conta_mcse_id || null,
        assertiva: form.assertiva || null,
        risco_identificado: form.risco_identificado.trim(),
        tipo_risco: form.tipo_risco || null,
        causa: form.causa.trim() || null,
        impacto_potencial: form.impacto_potencial.trim() || null,
        probabilidade: form.probabilidade || null,
        impacto: form.impacto || null,
        nivel_risco: form.nivel_risco || null,
        risco_significativo: form.risco_significativo,
        risco_fraude: form.risco_fraude,
        controle_relevante: form.controle_relevante,
        risco_controle: form.risco_controle,
        resposta_planejada: form.resposta_planejada.trim() || null,
        natureza_resposta: form.natureza_resposta.trim() || null,
        extensao_resposta: form.extensao_resposta.trim() || null,
        oportunidade_resposta: form.oportunidade_resposta.trim() || null,
        evidencia_esperada: form.evidencia_esperada.trim() || null,
        procedimento_sugerido: form.procedimento_sugerido.trim() || null,
        obrigatorio: form.obrigatorio,
        ativo: form.ativo,
        observacoes: form.observacoes.trim() || null,
      };
      if (editingId) {
        const { error } = await (supabase as any)
          .from("modelo_matriz_risco_itens")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        payload.modelo_matriz_risco_id = modeloId;
        const { error } = await (supabase as any)
          .from("modelo_matriz_risco_itens")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelo-matriz-risco-itens", modeloId] });
      toast.success(editingId ? "Item atualizado" : "Item criado");
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(mapErr(err, "Erro ao salvar item")),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async (r: ModeloMatrizRiscoItem) => {
      const { error } = await (supabase as any)
        .from("modelo_matriz_risco_itens")
        .update({ ativo: !r.ativo })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelo-matriz-risco-itens", modeloId] });
      toast.success("Status alterado");
    },
    onError: (err: any) => toast.error(mapErr(err, "Erro ao alterar status")),
  });

  return (
    <div className="space-y-4">
      {/* Aviso modelo bloqueado */}
      {!isRascunho && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            Itens de modelos publicados, substituídos ou arquivados ficam bloqueados para edição.
            Crie nova versão do modelo para alterar riscos padrão.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {itens.length} item{itens.length !== 1 ? "s" : ""} cadastrado{itens.length !== 1 ? "s" : ""}
        </div>
        {canMutate && (
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1" /> Novo risco
          </Button>
        )}
      </div>

      {/* Lista */}
      {itensQ.isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : itensQ.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Erro ao carregar itens: {mapErr(itensQ.error)}</span>
        </div>
      ) : itens.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border rounded-md">
          Nenhum risco cadastrado neste modelo.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Ordem</TableHead>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Área/Ciclo</TableHead>
                <TableHead>Conta MCSE</TableHead>
                <TableHead>Assertiva</TableHead>
                <TableHead className="w-[110px]">Nível</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((r) => (
                <TableRow key={r.id} className={!r.ativo ? "opacity-60" : ""}>
                  <TableCell className="tabular-nums">{r.ordem}</TableCell>
                  <TableCell className="font-mono text-xs">{r.codigo_item_modelo || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{r.risco_identificado}</div>
                    {r.tipo_risco && (
                      <div className="text-xs text-muted-foreground">{niceLabel(r.tipo_risco)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{r.area_ciclo || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {r.conta_mcse_id ? (
                      <>
                        <div className="font-mono">{r.codigo_conta_snapshot || "?"}</div>
                        <div className="text-muted-foreground line-clamp-1">{r.descricao_conta_snapshot || ""}</div>
                      </>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{niceLabel(r.assertiva)}</TableCell>
                  <TableCell>
                    {r.nivel_risco ? (
                      <Badge className={badgeNivelClass(r.nivel_risco)}>{niceLabel(r.nivel_risco)}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.obrigatorio && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Obrig.</Badge>}
                      {r.risco_significativo && <Badge variant="outline" className="bg-orange-500/15 text-orange-600 border-orange-500/30">Signif.</Badge>}
                      {r.risco_fraude && <Badge variant="outline" className="bg-red-500/15 text-red-600 border-red-500/30">Fraude</Badge>}
                      {r.controle_relevante && <Badge variant="outline">Controle rel.</Badge>}
                      {r.risco_controle && <Badge variant="outline">R. controle</Badge>}
                      {!r.ativo && <Badge variant="outline" className="bg-muted">Inativo</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title={canMutate ? "Editar" : "Visualizar"}>
                        {canMutate ? <Pencil size={14} /> : <Eye size={14} />}
                      </Button>
                      {canMutate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleAtivoMutation.mutate(r)}
                          disabled={toggleAtivoMutation.isPending}
                          title={r.ativo ? "Inativar" : "Reativar"}
                        >
                          {r.ativo ? <Power size={14} /> : <RotateCcw size={14} />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="flex flex-col overflow-hidden w-[95vw] max-w-[95vw] h-[90vh] max-h-[90vh] p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pr-16">
            <DialogTitle>
              {editingId ? (viewOnly ? "Visualizar risco" : "Editar risco") : "Novo risco do modelo"}
            </DialogTitle>
            <DialogDescription>
              {viewOnly
                ? "Visualização somente leitura. Edite somente quando o modelo estiver em rascunho."
                : "Snapshots da conta MCSE (código/descrição/grupo) são preenchidos automaticamente pelo banco."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Código do item</Label>
                <Input
                  value={form.codigo_item_modelo}
                  onChange={(e) => setForm({ ...form, codigo_item_modelo: e.target.value })}
                  disabled={viewOnly}
                  placeholder="opcional"
                />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: e.target.value })}
                  disabled={viewOnly}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Área / Ciclo</Label>
                <Input
                  value={form.area_ciclo}
                  onChange={(e) => setForm({ ...form, area_ciclo: e.target.value })}
                  disabled={viewOnly}
                  placeholder="ex.: Receitas, Despesas, Caixa..."
                />
              </div>

              <div className="md:col-span-2 lg:col-span-4">
                <Label>Risco identificado *</Label>
                <Textarea
                  rows={2}
                  value={form.risco_identificado}
                  onChange={(e) => setForm({ ...form, risco_identificado: e.target.value })}
                  disabled={viewOnly}
                />
              </div>

              {/* Conta MCSE */}
              <div className="md:col-span-2 lg:col-span-4 space-y-2 border rounded-md p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="m-0">Conta MCSE (opcional)</Label>
                  {form.conta_mcse_id && !viewOnly && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setForm({ ...form, conta_mcse_id: "" })}
                    >
                      Remover conta
                    </Button>
                  )}
                </div>
                {form.conta_mcse_id ? (
                  <div className="text-sm rounded-md bg-muted/50 px-3 py-2">
                    {contaAtualLabel || "Conta selecionada (snapshots serão preenchidos pelo banco ao salvar)"}
                  </div>
                ) : viewOnly ? (
                  <div className="text-sm text-muted-foreground">Sem conta vinculada.</div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Buscar conta MCSE por código ou descrição..."
                        value={contaSearch}
                        onChange={(e) => setContaSearch(e.target.value)}
                      />
                    </div>
                    {contaSearch.trim().length >= 2 && (
                      <div className="rounded-md border max-h-48 overflow-y-auto">
                        {contasQ.isLoading ? (
                          <div className="p-2 text-sm text-muted-foreground">Buscando...</div>
                        ) : (contasQ.data || []).length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">Nenhuma conta encontrada.</div>
                        ) : (
                          (contasQ.data || []).map((c: any) => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-b-0"
                              onClick={() => {
                                setForm({ ...form, conta_mcse_id: c.id });
                                setContaSearch("");
                              }}
                            >
                              <span className="font-mono mr-2">{c.codigo_mcse}</span>
                              {c.descricao_conta}
                              {c?.mcse_grupos?.descricao_grupo && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({c.mcse_grupos.descricao_grupo})
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <Label>Assertiva</Label>
                <Select
                  value={form.assertiva || NONE}
                  onValueChange={(v) => setForm({ ...form, assertiva: v === NONE ? "" : v })}
                  disabled={viewOnly}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {ASSERTIVAS.map((v) => <SelectItem key={v} value={v}>{niceLabel(v)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de risco</Label>
                <Select
                  value={form.tipo_risco || NONE}
                  onValueChange={(v) => setForm({ ...form, tipo_risco: v === NONE ? "" : v })}
                  disabled={viewOnly}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {TIPOS_RISCO.map((v) => <SelectItem key={v} value={v}>{niceLabel(v)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Probabilidade</Label>
                <Select
                  value={form.probabilidade || NONE}
                  onValueChange={(v) => setForm({ ...form, probabilidade: v === NONE ? "" : v })}
                  disabled={viewOnly}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {PROBABILIDADES.map((v) => <SelectItem key={v} value={v}>{niceLabel(v)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Impacto</Label>
                <Select
                  value={form.impacto || NONE}
                  onValueChange={(v) => setForm({ ...form, impacto: v === NONE ? "" : v })}
                  disabled={viewOnly}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {IMPACTOS.map((v) => <SelectItem key={v} value={v}>{niceLabel(v)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Nível de risco
                  {nivelSugerido && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (sugerido: {niceLabel(nivelSugerido)})
                    </span>
                  )}
                </Label>
                <Select
                  value={form.nivel_risco || NONE}
                  onValueChange={(v) => setForm({ ...form, nivel_risco: v === NONE ? "" : v })}
                  disabled={viewOnly}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {NIVEIS_RISCO.map((v) => <SelectItem key={v} value={v}>{niceLabel(v)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Causa</Label>
                <Textarea rows={2} value={form.causa}
                  onChange={(e) => setForm({ ...form, causa: e.target.value })} disabled={viewOnly} />
              </div>
              <div className="md:col-span-2">
                <Label>Impacto potencial</Label>
                <Textarea rows={2} value={form.impacto_potencial}
                  onChange={(e) => setForm({ ...form, impacto_potencial: e.target.value })} disabled={viewOnly} />
              </div>

              {/* Flags */}
              <div className="md:col-span-2 lg:col-span-4 grid grid-cols-2 md:grid-cols-5 gap-3 border rounded-md p-3">
                {([
                  ["risco_significativo", "Risco significativo"],
                  ["risco_fraude", "Risco de fraude"],
                  ["controle_relevante", "Controle relevante"],
                  ["risco_controle", "Risco de controle"],
                  ["obrigatorio", "Obrigatório"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      checked={(form as any)[key]}
                      onCheckedChange={(v) => setForm({ ...form, [key]: !!v } as FormState)}
                      disabled={viewOnly}
                    />
                    <Label className="m-0">{label}</Label>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.ativo}
                    onCheckedChange={(v) => setForm({ ...form, ativo: !!v })}
                    disabled={viewOnly}
                  />
                  <Label className="m-0">Ativo</Label>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label>Resposta planejada</Label>
                <Textarea rows={2} value={form.resposta_planejada}
                  onChange={(e) => setForm({ ...form, resposta_planejada: e.target.value })} disabled={viewOnly} />
              </div>
              <div>
                <Label>Natureza da resposta</Label>
                <Input value={form.natureza_resposta}
                  onChange={(e) => setForm({ ...form, natureza_resposta: e.target.value })} disabled={viewOnly} />
              </div>
              <div>
                <Label>Extensão da resposta</Label>
                <Input value={form.extensao_resposta}
                  onChange={(e) => setForm({ ...form, extensao_resposta: e.target.value })} disabled={viewOnly} />
              </div>
              <div className="md:col-span-2">
                <Label>Oportunidade da resposta</Label>
                <Input value={form.oportunidade_resposta}
                  onChange={(e) => setForm({ ...form, oportunidade_resposta: e.target.value })} disabled={viewOnly} />
              </div>
              <div className="md:col-span-2">
                <Label>Evidência esperada</Label>
                <Textarea rows={2} value={form.evidencia_esperada}
                  onChange={(e) => setForm({ ...form, evidencia_esperada: e.target.value })} disabled={viewOnly} />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <Label>Procedimento sugerido</Label>
                <Textarea rows={2} value={form.procedimento_sugerido}
                  onChange={(e) => setForm({ ...form, procedimento_sugerido: e.target.value })} disabled={viewOnly} />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <Label>Observações</Label>
                <Textarea rows={2} value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })} disabled={viewOnly} />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {viewOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!viewOnly && (
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {editingId ? "Salvar alterações" : "Criar risco"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
