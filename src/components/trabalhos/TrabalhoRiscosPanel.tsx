/**
 * TrabalhoRiscosPanel — Fase 0A.2.2
 *
 * Matriz de Riscos do Trabalho (UI básica).
 * Tabela: public.trabalho_riscos_auditoria
 *
 * Dívida técnica temporária: os types do Supabase ainda não reconhecem
 * `trabalho_riscos_auditoria`, por isso usamos `as any` apenas nos pontos de
 * chamada e uma interface local `TrabalhoRiscoAuditoria`. Quando os types
 * forem regenerados, basta remover os `as any`.
 *
 * Esta etapa NÃO implementa: vínculo risco → PTA / regra / procedimento /
 * solicitação / evidência / base de materialidade; review_events; review_notes;
 * gates; dashboard QA; nenhuma alteração de status_trabalho ou status_pta.
 *
 * Nota técnica (Fase 0A.2.3):
 * - valores persistidos no banco seguem formato técnico (snake_case, sem acento);
 * - labels amigáveis são somente apresentação na UI;
 * - nível de risco pode ser sugerido por Probabilidade × Impacto, mas permanece editável.
 */
import { useEffect, useMemo, useState } from "react";
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
import { AlertCircle, Download, Pencil, Plus, Power, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";
import TrabalhoRiscosImportDialog from "./TrabalhoRiscosImportDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ============ Tipagem local (dívida técnica até regenerar types) ============
interface TrabalhoRiscoAuditoria {
  id: string;
  trabalho_auditoria_id: string;
  cliente_id: string | null;
  exercicio_id: string | null;
  area_ciclo: string | null;
  conta_mcse_id: string | null;
  codigo_conta_snapshot: string | null;
  descricao_conta_snapshot: string | null;
  grupo_contabil: string | null;
  assertiva: string | null;
  risco_identificado: string | null;
  tipo_risco: string | null;
  causa: string | null;
  impacto_potencial: string | null;
  probabilidade: string | null;
  impacto: string | null;
  nivel_risco: string | null;
  risco_significativo: boolean | null;
  risco_fraude: boolean | null;
  controle_relevante: string | null;
  risco_controle: string | null;
  resposta_planejada: string | null;
  natureza_resposta: string | null;
  extensao_resposta: string | null;
  oportunidade_resposta: string | null;
  evidencia_esperada: string | null;
  responsavel_id: string | null;
  status_risco: string | null;
  conclusao: string | null;
  risco_residual: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  importado_de_modelo?: boolean | null;
  origem_modelo_nome_snapshot?: string | null;
  origem_modelo_versao_snapshot?: string | null;
  origem_modelo_item_codigo_snapshot?: string | null;
}

// ============ Domínios (alinhados aos CHECKs do banco) ============
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
const STATUS_RISCO = [
  "identificado", "resposta_planejada", "em_execucao",
  "respondido", "revisado", "encerrado",
] as const;

const NONE = "__none__";
const LABELS: Record<string, string> = {
  existencia: "Existência",
  integridade: "Integridade",
  direitos_obrigacoes: "Direitos e Obrigações",
  avaliacao: "Avaliação",
  apresentacao_divulgacao: "Apresentação e Divulgação",
  corte: "Corte",
  ocorrencia: "Ocorrência",
  exatidao: "Exatidão",
  outro: "Outro",
  risco_inerente: "Risco inerente",
  risco_controle: "Risco de controle",
  risco_distorcao_relevante: "Risco de distorção relevante",
  risco_fraude: "Risco de fraude",
  risco_divulgacao: "Risco de divulgação",
  risco_estimativa: "Risco de estimativa",
  risco_ti: "Risco de TI",
  risco_operacional: "Risco operacional",
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
  identificado: "Identificado",
  resposta_planejada: "Resposta planejada",
  em_execucao: "Em execução",
  respondido: "Respondido",
  revisado: "Revisado",
  encerrado: "Encerrado",
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

const badgeStatusClass = (s: string | null | undefined) => {
  switch (s) {
    case "encerrado":         return "bg-slate-600 text-white";
    case "revisado":          return "bg-emerald-700 text-white";
    case "respondido":        return "bg-emerald-500 text-white";
    case "em_execucao":       return "bg-blue-600 text-white";
    case "resposta_planejada":return "bg-indigo-500 text-white";
    case "identificado":      return "bg-amber-500 text-black";
    default:                  return "bg-muted text-muted-foreground";
  }
};

// ============ Formulário ============
type FormState = {
  area_ciclo: string;
  conta_mcse_id: string;
  codigo_conta_snapshot: string;
  descricao_conta_snapshot: string;
  grupo_contabil: string;
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
  controle_relevante: string;
  risco_controle: string;
  resposta_planejada: string;
  natureza_resposta: string;
  extensao_resposta: string;
  oportunidade_resposta: string;
  evidencia_esperada: string;
  responsavel_id: string;
  status_risco: string;
  conclusao: string;
  risco_residual: string;
  observacoes: string;
};
const emptyForm: FormState = {
  area_ciclo: "", conta_mcse_id: "", codigo_conta_snapshot: "", descricao_conta_snapshot: "",
  grupo_contabil: "", assertiva: "", risco_identificado: "", tipo_risco: "", causa: "",
  impacto_potencial: "", probabilidade: "", impacto: "", nivel_risco: "",
  risco_significativo: false, risco_fraude: false, controle_relevante: "", risco_controle: "",
  resposta_planejada: "", natureza_resposta: "", extensao_resposta: "", oportunidade_resposta: "",
  evidencia_esperada: "", responsavel_id: "", status_risco: "identificado",
  conclusao: "", risco_residual: "", observacoes: "",
};

interface Props {
  trabalho: any | null;
}

export default function TrabalhoRiscosPanel({ trabalho }: Props) {
  const qc = useQueryClient();
  const { data: userProfile } = useUserProfile();
  const isInterno = userProfile?.role === "auditor";
  const trabalhoId = trabalho?.id as string | undefined;

  // ---------- Queries ----------
  const riscosQ = useQuery({
    queryKey: ["trabalho-riscos", trabalhoId],
    enabled: !!trabalhoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("trabalho_riscos_auditoria")
        .select("*")
        .eq("trabalho_auditoria_id", trabalhoId!)
        .order("ativo", { ascending: false })
        .order("nivel_risco", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TrabalhoRiscoAuditoria[];
    },
  });

  const equipeQ = useQuery({
    queryKey: ["trabalho-equipe-riscos", trabalhoId],
    enabled: !!trabalhoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabalho_auditores")
        .select("auditor_id, papel_no_trabalho, responsavel_principal, auditores(id, nome, email, cargo)")
        .eq("trabalho_auditoria_id", trabalhoId!)
        .eq("ativo", true)
        .order("responsavel_principal", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const equipeOptions = (equipeQ.data || []).map((row: any) => {
    const a = row.auditores || {};
    const nome = a.nome || a.email || "(sem nome)";
    const papel = row.papel_no_trabalho ? String(row.papel_no_trabalho).replace(/_/g, " ") : null;
    return { id: row.auditor_id as string, label: papel ? `${nome} — ${papel}` : nome };
  });
  const labelResponsavel = (id: string | null | undefined) => {
    if (!id) return "—";
    return equipeOptions.find((o) => o.id === id)?.label || `(fora da equipe) ${id.slice(0, 8)}…`;
  };

  // ---------- Filtros ----------
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroNivel, setFiltroNivel] = useState<string>("");
  const [filtroSignificativo, setFiltroSignificativo] = useState<string>("");
  const [filtroFraude, setFiltroFraude] = useState<string>("");
  const [filtroAtivo, setFiltroAtivo] = useState<string>("ativos");

  const riscosFiltrados = useMemo(() => {
    const arr = riscosQ.data || [];
    const term = filtroBusca.trim().toLowerCase();
    return arr.filter((r) => {
      if (filtroAtivo === "ativos" && !r.ativo) return false;
      if (filtroAtivo === "inativos" && r.ativo) return false;
      if (filtroStatus && r.status_risco !== filtroStatus) return false;
      if (filtroNivel && r.nivel_risco !== filtroNivel) return false;
      if (filtroSignificativo === "sim" && !r.risco_significativo) return false;
      if (filtroSignificativo === "nao" && r.risco_significativo) return false;
      if (filtroFraude === "sim" && !r.risco_fraude) return false;
      if (filtroFraude === "nao" && r.risco_fraude) return false;
      if (term) {
        const bag = [
          r.risco_identificado, r.area_ciclo, r.codigo_conta_snapshot,
          r.descricao_conta_snapshot, r.resposta_planejada,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!bag.includes(term)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      const nivelDiff = (nivelOrder[b.nivel_risco || ""] || 0) - (nivelOrder[a.nivel_risco || ""] || 0);
      if (nivelDiff !== 0) return nivelDiff;
      if (!!a.risco_significativo !== !!b.risco_significativo) return a.risco_significativo ? -1 : 1;
      if (!!a.risco_fraude !== !!b.risco_fraude) return a.risco_fraude ? -1 : 1;
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta;
    });
  }, [riscosQ.data, filtroBusca, filtroStatus, filtroNivel, filtroSignificativo, filtroFraude, filtroAtivo]);

  // ---------- Indicadores ----------
  const indicadores = useMemo(() => {
    const arr = (riscosQ.data || []).filter((r) => r.ativo);
    return {
      total: arr.length,
      criticos: arr.filter((r) => r.nivel_risco === "critico").length,
      significativos: arr.filter((r) => r.risco_significativo).length,
      fraude: arr.filter((r) => r.risco_fraude).length,
      altosCriticos: arr.filter((r) => r.nivel_risco === "alto" || r.nivel_risco === "critico").length,
      semResposta: arr.filter((r) => !r.resposta_planejada || !r.resposta_planejada.trim()).length,
      pctComResposta: arr.length === 0
        ? 0
        : Math.round(((arr.length - arr.filter((r) => !r.resposta_planejada || !r.resposta_planejada.trim()).length) / arr.length) * 100),
    };
  }, [riscosQ.data]);

  // ---------- Form & dialog ----------
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [nivelManual, setNivelManual] = useState(false);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setNivelManual(false);
    setDialogOpen(true);
  };
  const openEdit = (r: TrabalhoRiscoAuditoria) => {
    setForm({
      area_ciclo: r.area_ciclo || "",
      conta_mcse_id: r.conta_mcse_id || "",
      codigo_conta_snapshot: r.codigo_conta_snapshot || "",
      descricao_conta_snapshot: r.descricao_conta_snapshot || "",
      grupo_contabil: r.grupo_contabil || "",
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
      controle_relevante: r.controle_relevante || "",
      risco_controle: r.risco_controle || "",
      resposta_planejada: r.resposta_planejada || "",
      natureza_resposta: r.natureza_resposta || "",
      extensao_resposta: r.extensao_resposta || "",
      oportunidade_resposta: r.oportunidade_resposta || "",
      evidencia_esperada: r.evidencia_esperada || "",
      responsavel_id: r.responsavel_id || "",
      status_risco: r.status_risco || "identificado",
      conclusao: r.conclusao || "",
      risco_residual: r.risco_residual || "",
      observacoes: r.observacoes || "",
    });
    setEditingId(r.id);
    setNivelManual(!!r.nivel_risco);
    setDialogOpen(true);
  };

  // ---------- Busca de Conta MCSE ----------
  const [contaSearch, setContaSearch] = useState("");
  const contasQ = useQuery({
    queryKey: ["mcse-contas-riscos", contaSearch],
    enabled: dialogOpen && contaSearch.trim().length >= 2,
    queryFn: async () => {
      const term = contaSearch.trim();
      const { data, error } = await supabase
        .from("mcse_contas")
        .select("id, codigo_mcse, descricao_conta, aceita_lancamento, mcse_grupos(descricao_grupo)")
        .or(`codigo_mcse.ilike.%${term}%,descricao_conta.ilike.%${term}%`)
        .eq("ativo", true)
        .order("aceita_lancamento", { ascending: false })
        .order("codigo_mcse")
        .limit(30);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const selecionarConta = (c: any) => {
    setForm((f) => ({
      ...f,
      conta_mcse_id: c.id,
      codigo_conta_snapshot: c.codigo_mcse || "",
      descricao_conta_snapshot: c.descricao_conta || "",
      grupo_contabil: c?.mcse_grupos?.descricao_grupo || f.grupo_contabil,
    }));
    setContaSearch("");
  };
  const limparConta = () => {
    setForm((f) => ({
      ...f,
      conta_mcse_id: "", codigo_conta_snapshot: "", descricao_conta_snapshot: "", grupo_contabil: "",
    }));
  };


  const scoreSugerido = useMemo(() => {
    const p = probabilidadePeso[form.probabilidade];
    const i = impactoPeso[form.impacto];
    if (!p || !i) return null;
    return p * i;
  }, [form.probabilidade, form.impacto]);
  const nivelSugerido = scoreSugerido ? nivelByScore(scoreSugerido) : "";

  useEffect(() => {
    if (!dialogOpen || !nivelSugerido) return;
    if (!form.nivel_risco && !nivelManual) {
      setForm((prev) => ({ ...prev, nivel_risco: nivelSugerido }));
    }
  }, [dialogOpen, form.nivel_risco, nivelManual, nivelSugerido]);

  // ---------- Save / Toggle ativo ----------
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!trabalhoId) throw new Error("Trabalho inválido");
      if (!form.risco_identificado.trim()) throw new Error("Informe a descrição do risco identificado.");
      const base: any = {
        area_ciclo: form.area_ciclo.trim() || null,
        conta_mcse_id: form.conta_mcse_id || null,
        codigo_conta_snapshot: form.codigo_conta_snapshot.trim() || null,
        descricao_conta_snapshot: form.descricao_conta_snapshot.trim() || null,
        grupo_contabil: form.grupo_contabil.trim() || null,
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
        controle_relevante: form.controle_relevante.trim() || null,
        risco_controle: form.risco_controle.trim() || null,
        resposta_planejada: form.resposta_planejada.trim() || null,
        natureza_resposta: form.natureza_resposta.trim() || null,
        extensao_resposta: form.extensao_resposta.trim() || null,
        oportunidade_resposta: form.oportunidade_resposta.trim() || null,
        evidencia_esperada: form.evidencia_esperada.trim() || null,
        responsavel_id: form.responsavel_id || null,
        status_risco: form.status_risco || "identificado",
        conclusao: form.conclusao.trim() || null,
        risco_residual: form.risco_residual.trim() || null,
        observacoes: form.observacoes.trim() || null,
      };
      if (editingId) {
        const { error } = await (supabase as any)
          .from("trabalho_riscos_auditoria")
          .update(base)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const payload = {
          ...base,
          trabalho_auditoria_id: trabalhoId,
          cliente_id: trabalho?.cliente_id ?? null,
          exercicio_id: trabalho?.exercicio_id ?? null,
          ativo: true,
        };
        const { error } = await (supabase as any)
          .from("trabalho_riscos_auditoria")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Risco atualizado." : "Risco criado.");
      setDialogOpen(false);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["trabalho-riscos", trabalhoId] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar risco."),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async (r: TrabalhoRiscoAuditoria) => {
      const { error } = await (supabase as any)
        .from("trabalho_riscos_auditoria")
        .update({ ativo: !r.ativo })
        .eq("id", r.id);
      if (error) throw error;
      return !r.ativo;
    },
    onSuccess: (novoAtivo) => {
      toast.success(novoAtivo ? "Risco reativado." : "Risco inativado.");
      qc.invalidateQueries({ queryKey: ["trabalho-riscos", trabalhoId] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao alterar status."),
  });

  // ---------- Alertas de campos recomendados ----------
  const recomendadosVazios = useMemo(() => {
    const f = form;
    const faltam: string[] = [];
    if (!f.area_ciclo.trim()) faltam.push("Área/Ciclo");
    if (!f.assertiva) faltam.push("Assertiva");
    if (!f.tipo_risco) faltam.push("Tipo de risco");
    if (!f.probabilidade) faltam.push("Probabilidade");
    if (!f.impacto) faltam.push("Impacto");
    if (!f.nivel_risco) faltam.push("Nível de risco");
    if (!f.resposta_planejada.trim()) faltam.push("Resposta planejada");
    if (!f.responsavel_id) faltam.push("Responsável");
    return faltam;
  }, [form]);

  useEffect(() => {
    if (!dialogOpen) setContaSearch("");
  }, [dialogOpen]);

  if (!isInterno) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Visualização restrita a usuários internos.
      </div>
    );
  }

  if (!trabalhoId) return null;

  return (
    <div className="space-y-4">
      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        <IndCard label="Riscos ativos" value={indicadores.total} />
        <IndCard label="Críticos" value={indicadores.criticos} tone="danger" />
        <IndCard label="Alto / Crítico" value={indicadores.altosCriticos} tone="danger" />
        <IndCard label="Significativos" value={indicadores.significativos} tone="warning" />
        <IndCard label="Fraude" value={indicadores.fraude} tone="danger" />
        <IndCard label="Sem resposta" value={indicadores.semResposta} tone="warning" />
        <IndCard label="% com resposta" value={`${indicadores.pctComResposta}%`} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Busca</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="risco, área, conta ou resposta..."
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
            />
          </div>
        </div>
        <FiltroSelect label="Status" value={filtroStatus} onChange={setFiltroStatus}
          options={STATUS_RISCO.map((v) => ({ value: v, label: niceLabel(v) }))} />
        <FiltroSelect label="Nível" value={filtroNivel} onChange={setFiltroNivel}
          options={NIVEIS_RISCO.map((v) => ({ value: v, label: niceLabel(v) }))} />
        <FiltroSelect label="Significativo" value={filtroSignificativo} onChange={setFiltroSignificativo}
          options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]} />
        <FiltroSelect label="Fraude" value={filtroFraude} onChange={setFiltroFraude}
          options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]} />
        <FiltroSelect label="Visibilidade" value={filtroAtivo} onChange={setFiltroAtivo}
          options={[
            { value: "ativos", label: "Apenas ativos" },
            { value: "inativos", label: "Apenas inativos" },
            { value: "todos", label: "Todos" },
          ]} allowEmpty={false} />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setFiltroBusca("");
            setFiltroStatus("");
            setFiltroNivel("");
            setFiltroSignificativo("");
            setFiltroFraude("");
            setFiltroAtivo("ativos");
          }}
        >
          Limpar filtros
        </Button>
        <Button onClick={openCreate} size="sm" className="ml-auto">
          <Plus className="h-4 w-4 mr-1" /> Novo risco
        </Button>
      </div>

      {/* Tabela */}
      <div className="rounded-md border overflow-hidden">
        <Table className="min-w-[1280px]">
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Área/Ciclo</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Assertiva</TableHead>
              <TableHead>Risco identificado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Prob.</TableHead>
              <TableHead>Impacto</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Sig.</TableHead>
              <TableHead>Fraude</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {riscosQ.isLoading ? (
              <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>
            ) : riscosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-6">
                Nenhum risco encontrado para os filtros aplicados.
              </TableCell></TableRow>
            ) : riscosFiltrados.map((r) => (
              <TableRow key={r.id} className={!r.ativo ? "opacity-60" : ""}>
                <TableCell className="text-xs">{r.area_ciclo || "—"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {r.codigo_conta_snapshot ? (
                    <div>
                      <div className="font-mono">{r.codigo_conta_snapshot}</div>
                      {r.descricao_conta_snapshot && (
                        <div className="text-muted-foreground truncate max-w-[180px]">{r.descricao_conta_snapshot}</div>
                      )}
                    </div>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs">{niceLabel(r.assertiva)}</TableCell>
                <TableCell className="text-xs max-w-[280px]">
                  <div className="line-clamp-2" title={r.risco_identificado || "—"}>{r.risco_identificado || "—"}</div>
                </TableCell>
                <TableCell className="text-xs">{niceLabel(r.tipo_risco)}</TableCell>
                <TableCell className="text-xs">{niceLabel(r.probabilidade)}</TableCell>
                <TableCell className="text-xs">{niceLabel(r.impacto)}</TableCell>
                <TableCell>
                  {r.nivel_risco ? (
                    <Badge className={badgeNivelClass(r.nivel_risco)}>{niceLabel(r.nivel_risco)}</Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>{r.risco_significativo ? <Badge variant="secondary">Sim</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell>{r.risco_fraude ? <Badge className="bg-red-600 text-white">Sim</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  {r.status_risco ? <Badge className={badgeStatusClass(r.status_risco)}>{niceLabel(r.status_risco)}</Badge> : "—"}
                </TableCell>
                <TableCell className="text-xs">{labelResponsavel(r.responsavel_id)}</TableCell>
                <TableCell>
                  {r.ativo
                    ? <Badge variant="outline">Ativo</Badge>
                    : <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {r.ativo ? (
                    <Button size="sm" variant="ghost" onClick={() => toggleAtivoMutation.mutate(r)} title="Inativar">
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => toggleAtivoMutation.mutate(r)} title="Reativar">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[96vw] max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar risco" : "Novo risco"}</DialogTitle>
            <DialogDescription>
              Matriz de Riscos do Trabalho. Campos obrigatórios: descrição do risco identificado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Classificação */}
            <Section title="Classificação">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldInput label="Área / Ciclo" value={form.area_ciclo}
                  onChange={(v) => setForm({ ...form, area_ciclo: v })} placeholder="Ex.: Receitas, Estoques..." />
                <FieldSelect label="Assertiva" value={form.assertiva} onChange={(v) => setForm({ ...form, assertiva: v })}
                  options={ASSERTIVAS.map((v) => ({ value: v, label: niceLabel(v) }))} />
              </div>

              {/* Conta MCSE */}
              <div className="space-y-1">
                <Label className="text-xs">Conta MCSE (opcional)</Label>
                {form.conta_mcse_id ? (
                  <div className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
                    <span className="font-mono">{form.codigo_conta_snapshot}</span>
                    <span className="text-muted-foreground truncate flex-1">{form.descricao_conta_snapshot}</span>
                    <Button size="sm" variant="ghost" onClick={limparConta}>Remover</Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Input placeholder="Buscar por código ou descrição (mín. 2 caracteres)..."
                      value={contaSearch} onChange={(e) => setContaSearch(e.target.value)} />
                    {contaSearch.trim().length >= 2 && (
                      <div className="border rounded max-h-44 overflow-y-auto text-xs">
                        {contasQ.isLoading && <div className="p-2 text-muted-foreground">Buscando...</div>}
                        {!contasQ.isLoading && (contasQ.data || []).length === 0 && (
                          <div className="p-2 text-muted-foreground">Nenhuma conta encontrada.</div>
                        )}
                        {(contasQ.data || []).map((c: any) => (
                          <button key={c.id} type="button"
                            onClick={() => selecionarConta(c)}
                            className="w-full text-left px-2 py-1.5 hover:bg-accent flex gap-2 items-center">
                            <span className="font-mono">{c.codigo_mcse}</span>
                            <span className="truncate flex-1">{c.descricao_conta}</span>
                            {c.aceita_lancamento && <Badge variant="outline" className="text-[10px]">analítica</Badge>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <FieldInput label="Grupo contábil" value={form.grupo_contabil}
                onChange={(v) => setForm({ ...form, grupo_contabil: v })} />

              <FieldTextarea label="Risco identificado *" value={form.risco_identificado}
                onChange={(v) => setForm({ ...form, risco_identificado: v })} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldSelect label="Tipo de risco" value={form.tipo_risco} onChange={(v) => setForm({ ...form, tipo_risco: v })}
                  options={TIPOS_RISCO.map((v) => ({ value: v, label: niceLabel(v) }))} />
                <FieldInput label="Causa" value={form.causa} onChange={(v) => setForm({ ...form, causa: v })} />
              </div>
              <FieldTextarea label="Impacto potencial" value={form.impacto_potencial}
                onChange={(v) => setForm({ ...form, impacto_potencial: v })} />
            </Section>

            {/* Avaliação */}
            <Section title="Avaliação">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FieldSelect label="Probabilidade" value={form.probabilidade}
                  onChange={(v) => setForm({ ...form, probabilidade: v })}
                  options={PROBABILIDADES.map((v) => ({ value: v, label: niceLabel(v) }))} />
                <FieldSelect label="Impacto" value={form.impacto}
                  onChange={(v) => setForm({ ...form, impacto: v })}
                  options={IMPACTOS.map((v) => ({ value: v, label: niceLabel(v) }))} />
                <FieldSelect label="Nível de risco" value={form.nivel_risco}
                  onChange={(v) => { setNivelManual(true); setForm({ ...form, nivel_risco: v }); }}
                  options={NIVEIS_RISCO.map((v) => ({ value: v, label: niceLabel(v) }))} />
              </div>
              {nivelSugerido && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{`Nível sugerido: ${niceLabel(nivelSugerido)}, com base em Probabilidade × Impacto.`}</span>
                  {form.nivel_risco !== nivelSugerido && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => setForm((f) => ({ ...f, nivel_risco: nivelSugerido }))}
                    >
                      Aplicar nível sugerido
                    </Button>
                  )}
                </div>
              )}
              <div className="flex gap-6">
                <SwitchField label="Risco significativo" checked={form.risco_significativo}
                  onChange={(v) => setForm({ ...form, risco_significativo: v })} />
                <SwitchField label="Risco de fraude" checked={form.risco_fraude}
                  onChange={(v) => setForm({ ...form, risco_fraude: v })} />
              </div>
              <FieldInput label="Controle relevante" value={form.controle_relevante}
                onChange={(v) => setForm({ ...form, controle_relevante: v })} />
              <FieldInput label="Risco de controle" value={form.risco_controle}
                onChange={(v) => setForm({ ...form, risco_controle: v })} />
            </Section>

            {/* Resposta */}
            <Section title="Resposta">
              <FieldTextarea label="Resposta planejada" value={form.resposta_planejada}
                onChange={(v) => setForm({ ...form, resposta_planejada: v })} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FieldInput label="Natureza" value={form.natureza_resposta}
                  onChange={(v) => setForm({ ...form, natureza_resposta: v })} />
                <FieldInput label="Extensão" value={form.extensao_resposta}
                  onChange={(v) => setForm({ ...form, extensao_resposta: v })} />
                <FieldInput label="Oportunidade" value={form.oportunidade_resposta}
                  onChange={(v) => setForm({ ...form, oportunidade_resposta: v })} />
              </div>
              <FieldTextarea label="Evidência esperada" value={form.evidencia_esperada}
                onChange={(v) => setForm({ ...form, evidencia_esperada: v })} />
            </Section>

            {/* Responsabilidade */}
            <Section title="Responsabilidade & Conclusão">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Responsável</Label>
                  <Select
                    value={form.responsavel_id || NONE}
                    onValueChange={(v) => setForm({ ...form, responsavel_id: v === NONE ? "" : v })}
                    disabled={equipeQ.isLoading || equipeOptions.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar auditor..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Sem responsável —</SelectItem>
                      {form.responsavel_id && !equipeOptions.some((o) => o.id === form.responsavel_id) && (
                        <SelectItem value={form.responsavel_id}>{`(fora da equipe) ${form.responsavel_id.slice(0, 8)}…`}</SelectItem>
                      )}
                      {equipeOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {equipeOptions.length === 0 && !equipeQ.isLoading && (
                    <div className="text-[11px] text-muted-foreground">Nenhum auditor vinculado ao trabalho.</div>
                  )}
                </div>
                <FieldSelect label="Status do risco" value={form.status_risco}
                  onChange={(v) => setForm({ ...form, status_risco: v })}
                  options={STATUS_RISCO.map((v) => ({ value: v, label: niceLabel(v) }))} allowEmpty={false} />
              </div>
              <FieldTextarea label="Conclusão" value={form.conclusao}
                onChange={(v) => setForm({ ...form, conclusao: v })} />
              <FieldInput label="Risco residual" value={form.risco_residual}
                onChange={(v) => setForm({ ...form, risco_residual: v })} />
              <FieldTextarea label="Observações" value={form.observacoes}
                onChange={(v) => setForm({ ...form, observacoes: v })} />
            </Section>

            {recomendadosVazios.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-50/10 p-2 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <div className="font-medium">Campos recomendados ainda não preenchidos:</div>
                  <div className="text-muted-foreground">{recomendadosVazios.join(", ")}.</div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : (editingId ? "Salvar alterações" : "Criar risco")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Helpers de UI ============
function IndCard({ label, value, tone }: { label: string; value: number | string; tone?: "warning" | "danger" }) {
  const cls = tone === "danger" ? "border-red-500/40" : tone === "warning" ? "border-amber-500/40" : "";
  return (
    <div className={`rounded-md border p-2 ${cls}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function FiltroSelect({
  label, value, onChange, options, allowEmpty = true,
}: { label: string; value: string; onChange: (v: string) => void;
     options: { value: string; label: string }[]; allowEmpty?: boolean }) {
  const ALL = "__all__";
  return (
    <div className="space-y-1 min-w-[140px]">
      <Label className="text-xs">{label}</Label>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value={ALL}>Todos</SelectItem>}
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground border-b pb-1">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function FieldTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function FieldSelect({
  label, value, onChange, options, allowEmpty = true,
}: { label: string; value: string; onChange: (v: string) => void;
     options: { value: string; label: string }[]; allowEmpty?: boolean }) {
  const NONE_V = "__none__";
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value || NONE_V} onValueChange={(v) => onChange(v === NONE_V ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value={NONE_V}>—</SelectItem>}
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
