import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Info, Pencil, Plus, Lock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";
import MaterialidadeBasesPanel from "./MaterialidadeBasesPanel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trabalho: any | null;
}

const fmtBRL = (v: any) =>
  v === null || v === undefined || v === ""
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

const fmtPct = (v: any) =>
  v === null || v === undefined || v === ""
    ? "—"
    : `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;

const fmtDate = (v: any) => {
  if (!v) return "—";
  try {
    return format(new Date(v), "dd/MM/yyyy");
  } catch {
    return "—";
  }
};

const orDash = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function TrabalhoPlanejamentoDialog({ open, onOpenChange, trabalho }: Props) {
  const trabalhoId = trabalho?.id as string | undefined;

  const planejamentoQ = useQuery({
    queryKey: ["trabalho-planejamento", trabalhoId],
    enabled: !!trabalhoId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabalho_planejamento" as any)
        .select("*")
        .eq("trabalho_auditoria_id", trabalhoId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const materialidadeQ = useQuery({
    queryKey: ["trabalho-materialidade", trabalhoId],
    enabled: !!trabalhoId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabalho_materialidade" as any)
        .select("*")
        .eq("trabalho_auditoria_id", trabalhoId!)
        .order("versao", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const vigente = (materialidadeQ.data || []).find((m: any) => m.vigente) || null;

  // Equipe vinculada ao trabalho — usada como fonte de Responsáveis (Planejamento e Materialidade)
  const equipeQ = useQuery({
    queryKey: ["trabalho-equipe-responsaveis", trabalhoId],
    enabled: !!trabalhoId && open,
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
    const label = papel ? `${nome} — ${papel}` : nome;
    return { id: row.auditor_id as string, label };
  });

  const labelDoResponsavel = (id: string | null | undefined): string => {
    if (!id) return "—";
    const found = equipeOptions.find((o) => o.id === id);
    if (found) return found.label;
    return "Responsável salvo não encontrado na equipe atual";
  };

  const ResponsavelSelect = ({
    value,
    onChange,
    placeholder = "Selecionar auditor...",
  }: { value: string; onChange: (v: string) => void; placeholder?: string }) => {
    const semEquipe = !equipeQ.isLoading && equipeOptions.length === 0;
    const valorForaDaEquipe = !!value && !equipeOptions.some((o) => o.id === value);
    const NONE = "__none__";
    return (
      <div className="space-y-1">
        <Select
          value={value || NONE}
          onValueChange={(v) => onChange(v === NONE ? "" : v)}
          disabled={equipeQ.isLoading || semEquipe}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Sem responsável —</SelectItem>
            {valorForaDaEquipe && (
              <SelectItem value={value}>
                {`(fora da equipe) ${value.slice(0, 8)}…`}
              </SelectItem>
            )}
            {equipeOptions.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {semEquipe && (
          <div className="text-[11px] text-muted-foreground">Nenhum auditor vinculado a este trabalho.</div>
        )}
        {valorForaDaEquipe && (
          <div className="text-[11px] text-warning-foreground">Responsável salvo não encontrado na equipe atual.</div>
        )}
      </div>
    );
  };

  const qc = useQueryClient();
  const { data: userProfile } = useUserProfile();
  const isInterno = userProfile?.role === "auditor";

  // ===== Matriz de alçada inicial (Fase 0A.1.5) =====
  // Mapeada via auditores.perfil_acesso (admin/socio/gerente/senior/assistente).
  // Senior só aprova planejamento se for responsável principal do trabalho.
  const auditorAtual = (userProfile as any)?.auditor || null;
  const auditorIdAtual: string | null = auditorAtual?.id ?? null;
  const perfilAcesso: string = String(auditorAtual?.perfil_acesso || "").toLowerCase();
  const ehResponsavelPrincipal = !!(equipeQ.data || []).find(
    (r: any) => r.auditor_id === auditorIdAtual && r.responsavel_principal === true
  );
  const podeAprovarPlanejamento =
    isInterno && (
      perfilAcesso === "admin" ||
      perfilAcesso === "socio" ||
      perfilAcesso === "gerente" ||
      (perfilAcesso === "senior" && ehResponsavelPrincipal)
    );
  const podeAprovarMaterialidade =
    isInterno && (
      perfilAcesso === "admin" ||
      perfilAcesso === "socio" ||
      perfilAcesso === "gerente"
    );
  const motivoSemAlcadaPlan = !podeAprovarPlanejamento
    ? (perfilAcesso === "senior"
        ? "Senior só pode aprovar quando for responsável principal do trabalho."
        : "Você não possui alçada para aprovar o planejamento.")
    : "";
  const motivoSemAlcadaMat = !podeAprovarMaterialidade
    ? "Você não possui alçada para aprovar a materialidade."
    : "";

  const [confirmAprovarPlan, setConfirmAprovarPlan] = useState(false);
  const [confirmAprovarMat, setConfirmAprovarMat] = useState<{ id: string } | null>(null);


  type FormState = {
    objetivo_geral_auditoria: string;
    escopo_resumido: string;
    estrategia_resumida: string;
    equipe_responsavel_id: string;
    premissas_relevantes: string;
    limitacoes_escopo: string;
    observacoes: string;
  };
  const emptyForm: FormState = {
    objetivo_geral_auditoria: "", escopo_resumido: "", estrategia_resumida: "",
    equipe_responsavel_id: "", premissas_relevantes: "", limitacoes_escopo: "", observacoes: "",
  };
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const planData = planejamentoQ.data;
  const isAprovado = planData?.status_planejamento === "aprovado";

  useEffect(() => {
    if (!open) { setEditMode(false); setForm(emptyForm); }
  }, [open, trabalhoId]);

  const startEdit = () => {
    setForm({
      objetivo_geral_auditoria: planData?.objetivo_geral_auditoria || "",
      escopo_resumido: planData?.escopo_resumido || "",
      estrategia_resumida: planData?.estrategia_resumida || "",
      equipe_responsavel_id: planData?.equipe_responsavel_id || "",
      premissas_relevantes: planData?.premissas_relevantes || "",
      limitacoes_escopo: planData?.limitacoes_escopo || "",
      observacoes: planData?.observacoes || "",
    });
    setEditMode(true);
  };
  const startCreate = () => { setForm(emptyForm); setEditMode(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!trabalhoId) throw new Error("Trabalho inválido");
      const payload: any = {
        objetivo_geral_auditoria: form.objetivo_geral_auditoria.trim() || null,
        escopo_resumido: form.escopo_resumido.trim() || null,
        estrategia_resumida: form.estrategia_resumida.trim() || null,
        equipe_responsavel_id: form.equipe_responsavel_id.trim() || null,
        premissas_relevantes: form.premissas_relevantes.trim() || null,
        limitacoes_escopo: form.limitacoes_escopo.trim() || null,
        observacoes: form.observacoes.trim() || null,
      };
      if (planData?.id) {
        const { error } = await supabase
          .from("trabalho_planejamento" as any)
          .update(payload)
          .eq("id", planData.id);
        if (error) throw error;
      } else {
        const insertPayload = {
          ...payload,
          trabalho_auditoria_id: trabalhoId,
          cliente_id: trabalho?.cliente_id ?? null,
          exercicio_id: trabalho?.exercicio_id ?? null,
          status_planejamento: "rascunho",
        };
        const { error } = await supabase
          .from("trabalho_planejamento" as any)
          .insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(planData?.id ? "Planejamento atualizado" : "Planejamento criado");
      setEditMode(false);
      qc.invalidateQueries({ queryKey: ["trabalho-planejamento", trabalhoId] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar planejamento"),
  });

  const camposPrincipaisVazios = !form.objetivo_geral_auditoria.trim()
    || !form.escopo_resumido.trim()
    || !form.estrategia_resumida.trim();

  // ===== MATERIALIDADE =====
  // Aprovação, alçada e nova versão de materialidade aprovada serão tratadas em fase posterior.
  type MatForm = {
    base_calculo: string;
    percentual_aplicado: string;
    materialidade_global: string;
    materialidade_desempenho: string;
    limite_trivialidade: string;
    justificativa_tecnica: string;
    responsavel_definicao_id: string;
    observacoes: string;
  };
  const emptyMat: MatForm = {
    base_calculo: "", percentual_aplicado: "", materialidade_global: "",
    materialidade_desempenho: "", limite_trivialidade: "",
    justificativa_tecnica: "", responsavel_definicao_id: "", observacoes: "",
  };
  const [matEditMode, setMatEditMode] = useState<null | "create" | "edit">(null);
  const [matForm, setMatForm] = useState<MatForm>(emptyMat);
  const [editingMatId, setEditingMatId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setMatEditMode(null); setMatForm(emptyMat); setEditingMatId(null); }
  }, [open, trabalhoId]);

  const rascunhoExistente = (materialidadeQ.data || []).find(
    (m: any) => m.status_materialidade === "rascunho"
  ) || null;

  const startCreateMat = () => {
    // Bloqueia múltiplos rascunhos na UI: se já existe rascunho, abre o existente.
    if (rascunhoExistente) {
      toast.info("Já existe uma materialidade em rascunho para este trabalho. Edite o rascunho existente.");
      startEditMat(rascunhoExistente);
      return;
    }
    // Nova versão a partir de materialidade aprovada/vigente será tratada em etapa futura.
    if (vigente) {
      toast.info("A criação de nova versão de materialidade aprovada será implementada em etapa futura.");
      return;
    }
    setMatForm(emptyMat);
    setEditingMatId(null);
    setMatEditMode("create");
  };
  const startEditMat = (m: any) => {
    setMatForm({
      base_calculo: m.base_calculo ?? "",
      percentual_aplicado: m.percentual_aplicado != null ? String(m.percentual_aplicado) : "",
      materialidade_global: m.materialidade_global != null ? String(m.materialidade_global) : "",
      materialidade_desempenho: m.materialidade_desempenho != null ? String(m.materialidade_desempenho) : "",
      limite_trivialidade: m.limite_trivialidade != null ? String(m.limite_trivialidade) : "",
      justificativa_tecnica: m.justificativa_tecnica ?? "",
      responsavel_definicao_id: m.responsavel_definicao_id ?? "",
      observacoes: m.observacoes ?? "",
    });
    setEditingMatId(m.id);
    setMatEditMode("edit");
  };

  const parseNum = (v: string): number | null => {
    const t = v.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return isNaN(n) ? null : n;
  };

  const validateMat = (): string | null => {
    if (!matForm.base_calculo.trim()) return "Informe a base de cálculo da materialidade.";
    const g = parseNum(matForm.materialidade_global);
    const d = parseNum(matForm.materialidade_desempenho);
    const lt = parseNum(matForm.limite_trivialidade);
    if (g !== null && g <= 0) return "Materialidade Global deve ser maior que zero.";
    if (d !== null && d <= 0) return "Materialidade Desempenho deve ser maior que zero.";
    if (lt !== null && lt < 0) return "Limite Trivialidade deve ser maior ou igual a zero.";
    if (g !== null && d !== null && d > g) return "Materialidade Desempenho não pode ser maior que a Global.";
    return null;
  };

  const proximaVersao = () => {
    const arr = materialidadeQ.data || [];
    if (!arr.length) return 1;
    return Math.max(...arr.map((m: any) => Number(m.versao) || 0)) + 1;
  };

  const saveMatMutation = useMutation({
    mutationFn: async () => {
      if (!trabalhoId) throw new Error("Trabalho inválido");
      const err = validateMat();
      if (err) throw new Error(err);
      const payload: any = {
        base_calculo: matForm.base_calculo.trim(),
        percentual_aplicado: parseNum(matForm.percentual_aplicado),
        materialidade_global: parseNum(matForm.materialidade_global),
        materialidade_desempenho: parseNum(matForm.materialidade_desempenho),
        limite_trivialidade: parseNum(matForm.limite_trivialidade),
        justificativa_tecnica: matForm.justificativa_tecnica.trim() || null,
        responsavel_definicao_id: matForm.responsavel_definicao_id.trim() || null,
        observacoes: matForm.observacoes.trim() || null,
      };
      if (matEditMode === "edit" && editingMatId) {
        const { error } = await supabase
          .from("trabalho_materialidade" as any)
          .update(payload)
          .eq("id", editingMatId)
          .eq("status_materialidade", "rascunho");
        if (error) throw error;
      } else {
        const insertPayload = {
          ...payload,
          trabalho_auditoria_id: trabalhoId,
          cliente_id: trabalho?.cliente_id ?? null,
          exercicio_id: trabalho?.exercicio_id ?? null,
          status_materialidade: "rascunho",
          versao: proximaVersao(),
          vigente: false,
        };
        const { error } = await supabase
          .from("trabalho_materialidade" as any)
          .insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(matEditMode === "edit" ? "Materialidade atualizada" : "Materialidade criada");
      setMatEditMode(null);
      setEditingMatId(null);
      qc.invalidateQueries({ queryKey: ["trabalho-materialidade", trabalhoId] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar materialidade"),
  });

  // ===== Aprovação de Planejamento (Fase 0A.1.5) =====
  const validarAprovacaoPlan = (): string | null => {
    if (!planData) return "Planejamento não encontrado.";
    if (planData.status_planejamento !== "rascunho") return "Apenas planejamento em rascunho pode ser aprovado.";
    if (!String(planData.objetivo_geral_auditoria || "").trim()) return "Preencha o Objetivo Geral antes de aprovar.";
    if (!String(planData.escopo_resumido || "").trim()) return "Preencha o Escopo Resumido antes de aprovar.";
    if (!String(planData.estrategia_resumida || "").trim()) return "Preencha a Estratégia Resumida antes de aprovar.";
    if (!String(planData.equipe_responsavel_id || "").trim()) return "Informe o Responsável pelo planejamento antes de aprovar.";
    return null;
  };

  const aprovarPlanMutation = useMutation({
    mutationFn: async () => {
      if (!podeAprovarPlanejamento) throw new Error(motivoSemAlcadaPlan || "Sem alçada para aprovar.");
      const err = validarAprovacaoPlan();
      if (err) throw new Error(err);
      const { error } = await supabase
        .from("trabalho_planejamento" as any)
        .update({
          status_planejamento: "aprovado",
          aprovado_por: auditorIdAtual,
          data_aprovacao: new Date().toISOString(),
        })
        .eq("id", planData!.id)
        .eq("status_planejamento", "rascunho");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Planejamento aprovado");
      setConfirmAprovarPlan(false);
      qc.invalidateQueries({ queryKey: ["trabalho-planejamento", trabalhoId] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao aprovar planejamento"),
  });

  // ===== Aprovação de Materialidade (Fase 0A.1.5) =====
  const validarAprovacaoMat = (m: any): string | null => {
    if (!m) return "Materialidade não encontrada.";
    if (m.status_materialidade !== "rascunho") return "Apenas materialidade em rascunho pode ser aprovada.";
    if (vigente && vigente.id !== m.id) {
      return "Já existe materialidade aprovada e vigente para este trabalho. A substituição por nova versão será implementada em etapa futura.";
    }
    if (!String(m.base_calculo || "").trim()) return "Preencha a Base de Cálculo antes de aprovar.";
    const g = Number(m.materialidade_global);
    const d = Number(m.materialidade_desempenho);
    const lt = Number(m.limite_trivialidade);
    if (!(g > 0)) return "Materialidade Global deve ser maior que zero.";
    if (!(d > 0)) return "Materialidade Desempenho deve ser maior que zero.";
    if (!(lt >= 0)) return "Limite Trivialidade deve ser maior ou igual a zero.";
    if (d > g) return "Materialidade Desempenho não pode ser maior que a Global.";
    if (!String(m.justificativa_tecnica || "").trim()) return "Preencha a Justificativa Técnica antes de aprovar.";
    if (!String(m.responsavel_definicao_id || "").trim()) return "Informe o Responsável pela definição da materialidade antes de aprovar.";
    return null;
  };

  const aprovarMatMutation = useMutation({
    mutationFn: async (matId: string) => {
      if (!podeAprovarMaterialidade) throw new Error(motivoSemAlcadaMat || "Sem alçada para aprovar.");
      const m = (materialidadeQ.data || []).find((x: any) => x.id === matId);
      const err = validarAprovacaoMat(m);
      if (err) throw new Error(err);
      const { error } = await supabase
        .from("trabalho_materialidade" as any)
        .update({
          status_materialidade: "aprovada",
          vigente: true,
          aprovado_por: auditorIdAtual,
          data_aprovacao: new Date().toISOString(),
        })
        .eq("id", matId)
        .eq("status_materialidade", "rascunho");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Materialidade aprovada");
      setConfirmAprovarMat(null);
      qc.invalidateQueries({ queryKey: ["trabalho-materialidade", trabalhoId] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao aprovar materialidade"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planejamento do Trabalho</DialogTitle>
          <DialogDescription className="space-y-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span><strong>Trabalho:</strong> {trabalho?.nome_trabalho || "—"}</span>
              <span><strong>Cliente:</strong> {trabalho?.clientes?.razao_social || "—"}</span>
              <span><strong>Exercício:</strong> {trabalho?.exercicios?.ano_exercicio || "—"}</span>
              {trabalho?.status_trabalho && (
                <span><strong>Status:</strong> <Badge variant="outline" className="text-[10px] ml-1">{trabalho.status_trabalho}</Badge></span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="planejamento" className="mt-2">
          <TabsList>
            <TabsTrigger value="planejamento">Planejamento</TabsTrigger>
            <TabsTrigger value="materialidade">Materialidade</TabsTrigger>
            <TabsTrigger value="riscos">Riscos</TabsTrigger>
          </TabsList>

          {/* PLANEJAMENTO */}
          <TabsContent value="planejamento" className="space-y-3 pt-3">
            {planejamentoQ.isLoading ? (
              <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
            ) : planejamentoQ.isError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                  <AlertCircle size={14} /> Erro ao carregar planejamento
                </div>
                <Button size="sm" variant="outline" onClick={() => planejamentoQ.refetch()}>Tentar novamente</Button>
              </div>
            ) : editMode ? (
              <div className="space-y-4">
                {camposPrincipaisVazios && (
                  <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs flex items-start gap-2">
                    <AlertCircle size={14} className="text-warning-foreground mt-0.5" />
                    <span>Recomendado preencher Objetivo, Escopo e Estratégia. O salvamento é permitido mesmo em branco.</span>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Objetivo Geral da Auditoria</Label>
                  <Textarea rows={3} maxLength={4000} value={form.objetivo_geral_auditoria}
                    onChange={(e) => setForm({ ...form, objetivo_geral_auditoria: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Escopo Resumido</Label>
                  <Textarea rows={3} maxLength={4000} value={form.escopo_resumido}
                    onChange={(e) => setForm({ ...form, escopo_resumido: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Estratégia Resumida</Label>
                  <Textarea rows={3} maxLength={4000} value={form.estrategia_resumida}
                    onChange={(e) => setForm({ ...form, estrategia_resumida: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Responsável pelo planejamento</Label>
                  <ResponsavelSelect
                    value={form.equipe_responsavel_id}
                    onChange={(v) => setForm({ ...form, equipe_responsavel_id: v })}
                  />
                  {!form.equipe_responsavel_id && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Recomendado informar um responsável (não obrigatório).
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Premissas Relevantes</Label>
                  <Textarea rows={2} maxLength={4000} value={form.premissas_relevantes}
                    onChange={(e) => setForm({ ...form, premissas_relevantes: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Limitações de Escopo</Label>
                  <Textarea rows={2} maxLength={4000} value={form.limitacoes_escopo}
                    onChange={(e) => setForm({ ...form, limitacoes_escopo: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Textarea rows={2} maxLength={4000} value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)} disabled={saveMutation.isPending}>Cancelar</Button>
                  <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            ) : !planData ? (
              <div className="space-y-3">
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum planejamento cadastrado para este trabalho.
                </div>
                {isInterno && (
                  <div className="flex justify-center">
                    <Button size="sm" onClick={startCreate}><Plus size={14} className="mr-1" />Criar planejamento</Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{orDash(planData.status_planejamento)}</Badge>
                    {isAprovado && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock size={12} /> Bloqueado para edição
                      </span>
                    )}
                  </div>
                  {isInterno && !isAprovado && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={startEdit}><Pencil size={14} className="mr-1" />Editar</Button>
                      {podeAprovarPlanejamento ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            const err = validarAprovacaoPlan();
                            if (err) { toast.error(err); return; }
                            setConfirmAprovarPlan(true);
                          }}
                        >
                          <CheckCircle2 size={14} className="mr-1" />Aprovar planejamento
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">{motivoSemAlcadaPlan}</span>
                      )}
                    </div>
                  )}
                </div>
                {isAprovado && (
                  <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
                    Planejamento aprovado. Alterações serão tratadas em etapa futura.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Responsável pelo planejamento">{labelDoResponsavel(planData.equipe_responsavel_id)}</Field>
                  <Field label="Aprovado por">{orDash(planData.aprovado_por)}</Field>
                  <Field label="Data de Aprovação">{fmtDate(planData.data_aprovacao)}</Field>
                </div>
                <Field label="Objetivo Geral da Auditoria"><div className="whitespace-pre-wrap">{orDash(planData.objetivo_geral_auditoria)}</div></Field>
                <Field label="Escopo Resumido"><div className="whitespace-pre-wrap">{orDash(planData.escopo_resumido)}</div></Field>
                <Field label="Estratégia Resumida"><div className="whitespace-pre-wrap">{orDash(planData.estrategia_resumida)}</div></Field>
                <Field label="Premissas Relevantes"><div className="whitespace-pre-wrap">{orDash(planData.premissas_relevantes)}</div></Field>
                <Field label="Limitações de Escopo"><div className="whitespace-pre-wrap">{orDash(planData.limitacoes_escopo)}</div></Field>
                <Field label="Observações"><div className="whitespace-pre-wrap">{orDash(planData.observacoes)}</div></Field>
              </div>
            )}
          </TabsContent>

          {/* MATERIALIDADE */}
          <TabsContent value="materialidade" className="space-y-3 pt-3">
            {materialidadeQ.isLoading ? (
              <div className="space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : materialidadeQ.isError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                  <AlertCircle size={14} /> Erro ao carregar materialidade
                </div>
                <Button size="sm" variant="outline" onClick={() => materialidadeQ.refetch()}>Tentar novamente</Button>
              </div>
            ) : matEditMode ? (
              <div className="space-y-3">
                <div className="text-sm font-medium">
                  {matEditMode === "create" ? "Nova materialidade (rascunho)" : `Editar rascunho — v${(materialidadeQ.data || []).find((m: any) => m.id === editingMatId)?.versao ?? "—"}`}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Base de Cálculo <span className="text-destructive">*</span></Label>
                    <Input maxLength={200} value={matForm.base_calculo}
                      onChange={(e) => setMatForm({ ...matForm, base_calculo: e.target.value })}
                      placeholder="Ex.: Lucro antes de IR, Receita Líquida..." required />
                    {!matForm.base_calculo.trim() && (
                      <div className="text-[11px] text-warning-foreground mt-1">Informe a base de cálculo da materialidade.</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Percentual Aplicado (%)</Label>
                    <Input inputMode="decimal" value={matForm.percentual_aplicado}
                      onChange={(e) => setMatForm({ ...matForm, percentual_aplicado: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Materialidade Global (R$)</Label>
                    <Input inputMode="decimal" value={matForm.materialidade_global}
                      onChange={(e) => setMatForm({ ...matForm, materialidade_global: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Materialidade Desempenho (R$)</Label>
                    <Input inputMode="decimal" value={matForm.materialidade_desempenho}
                      onChange={(e) => setMatForm({ ...matForm, materialidade_desempenho: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Limite Trivialidade (R$)</Label>
                    <Input inputMode="decimal" value={matForm.limite_trivialidade}
                      onChange={(e) => setMatForm({ ...matForm, limite_trivialidade: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Responsável pela definição da materialidade</Label>
                    <ResponsavelSelect
                      value={matForm.responsavel_definicao_id}
                      onChange={(v) => setMatForm({ ...matForm, responsavel_definicao_id: v })}
                    />
                    {!matForm.responsavel_definicao_id && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Recomendado informar um responsável (não obrigatório).
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Justificativa Técnica</Label>
                  <Textarea rows={3} maxLength={4000} value={matForm.justificativa_tecnica}
                    onChange={(e) => setMatForm({ ...matForm, justificativa_tecnica: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Textarea rows={2} maxLength={4000} value={matForm.observacoes}
                    onChange={(e) => setMatForm({ ...matForm, observacoes: e.target.value })} />
                </div>
                <div className="text-[11px] text-muted-foreground flex items-start gap-1">
                  <Info size={12} className="mt-0.5" /> Materialidade específica (JSON) e aprovação serão tratadas em etapa futura.
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setMatEditMode(null)} disabled={saveMatMutation.isPending}>Cancelar</Button>
                  <Button size="sm" onClick={() => saveMatMutation.mutate()} disabled={saveMatMutation.isPending}>
                    {saveMatMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            ) : (materialidadeQ.data?.length ?? 0) === 0 ? (
              <div className="space-y-3">
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhuma materialidade cadastrada para este trabalho.
                </div>
                {isInterno && (
                  <div className="flex justify-center">
                    <Button size="sm" onClick={startCreateMat}><Plus size={14} className="mr-1" />Criar materialidade</Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {vigente && (
                  <div className="rounded-md border border-success/30 bg-success/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-success/15 text-success border-success/30" variant="outline">Vigente</Badge>
                      <span className="text-sm font-medium">Versão {orDash(vigente.versao)}</span>
                      <Badge variant="outline" className="text-xs">{orDash(vigente.status_materialidade)}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Base de Cálculo">{orDash(vigente.base_calculo)}</Field>
                      <Field label="Percentual Aplicado">{fmtPct(vigente.percentual_aplicado)}</Field>
                      <Field label="Materialidade Global">{fmtBRL(vigente.materialidade_global)}</Field>
                      <Field label="Materialidade Desempenho">{fmtBRL(vigente.materialidade_desempenho)}</Field>
                      <Field label="Limite Trivialidade">{fmtBRL(vigente.limite_trivialidade)}</Field>
                      <Field label="Aprovado por">{orDash(vigente.aprovado_por)}</Field>
                      <Field label="Data de Aprovação">{fmtDate(vigente.data_aprovacao)}</Field>
                      <Field label="Responsável pela materialidade">{labelDoResponsavel(vigente.responsavel_definicao_id)}</Field>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Field label="Justificativa Técnica"><div className="whitespace-pre-wrap text-sm">{orDash(vigente.justificativa_tecnica)}</div></Field>
                      <Field label="Motivo Nova Versão"><div className="whitespace-pre-wrap text-sm">{orDash(vigente.motivo_nova_versao)}</div></Field>
                      <Field label="Observações"><div className="whitespace-pre-wrap text-sm">{orDash(vigente.observacoes)}</div></Field>
                    </div>
                    <MaterialidadeBasesPanel materialidade={vigente} trabalho={trabalho} readOnly={true} />
                  </div>
                )}

                {rascunhoExistente && (
                  <div className="rounded-md border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">v{orDash(rascunhoExistente.versao)}</Badge>
                        <Badge variant="outline" className="text-xs">rascunho</Badge>
                      </div>
                      {isInterno && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEditMat(rascunhoExistente)}>
                            <Pencil size={14} className="mr-1" />Editar rascunho
                          </Button>
                          {podeAprovarMaterialidade ? (
                            <Button
                              size="sm"
                              disabled={!!vigente}
                              onClick={() => {
                                if (vigente) {
                                  toast.error("Já existe materialidade aprovada e vigente. Substituição será implementada em etapa futura.");
                                  return;
                                }
                                const err = validarAprovacaoMat(rascunhoExistente);
                                if (err) { toast.error(err); return; }
                                setConfirmAprovarMat({ id: rascunhoExistente.id });
                              }}
                            >
                              <CheckCircle2 size={14} className="mr-1" />Aprovar materialidade
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">{motivoSemAlcadaMat}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Base de Cálculo">{orDash(rascunhoExistente.base_calculo)}</Field>
                      <Field label="Percentual Aplicado">{fmtPct(rascunhoExistente.percentual_aplicado)}</Field>
                      <Field label="Materialidade Global">{fmtBRL(rascunhoExistente.materialidade_global)}</Field>
                      <Field label="Materialidade Desempenho">{fmtBRL(rascunhoExistente.materialidade_desempenho)}</Field>
                      <Field label="Limite Trivialidade">{fmtBRL(rascunhoExistente.limite_trivialidade)}</Field>
                      <Field label="Responsável pela materialidade">{labelDoResponsavel(rascunhoExistente.responsavel_definicao_id)}</Field>
                    </div>
                    <MaterialidadeBasesPanel materialidade={rascunhoExistente} trabalho={trabalho} readOnly={false} />
                  </div>
                )}

                {isInterno && !rascunhoExistente && !vigente && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={startCreateMat}>
                      <Plus size={14} className="mr-1" />Nova materialidade (rascunho)
                    </Button>
                  </div>
                )}

                {isInterno && !rascunhoExistente && vigente && (
                  <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
                    A criação de nova versão de materialidade aprovada será implementada em etapa futura.
                  </div>
                )}

                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Histórico de Versões</div>
                  <div className="border rounded-md divide-y">
                    {materialidadeQ.data!.map((m: any) => {
                      const bloqueada = m.status_materialidade === "aprovada" || m.status_materialidade === "substituida";
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">v{orDash(m.versao)}</Badge>
                            {m.vigente && <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">vigente</Badge>}
                            <span className="text-xs text-muted-foreground">{orDash(m.status_materialidade)}</span>
                            {bloqueada && <Lock size={12} className="text-muted-foreground" />}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Global: {fmtBRL(m.materialidade_global)} · Aprovação: {fmtDate(m.data_aprovacao)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {(materialidadeQ.data || []).some((m: any) => m.status_materialidade === "aprovada") && (
                  <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
                    Materialidade aprovada não pode ser editada diretamente.
                  </div>
                )}
                {(materialidadeQ.data || []).some((m: any) => m.status_materialidade === "substituida") && (
                  <div className="rounded-md border border-muted-foreground/20 bg-muted/30 p-3 text-xs">
                    Materialidade substituída permanece apenas para histórico.
                  </div>
                )}

                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info size={12} /> Aprovação, alçada e nova versão serão implementadas na próxima etapa.
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="riscos" className="pt-3">
            <div className="rounded-md border border-dashed p-6 space-y-3">
              <div className="text-sm font-medium">A matriz de riscos será implementada em fase posterior.</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Esta etapa futura irá contemplar:</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>Matriz de aceitação/continuidade</li>
                  <li>Matriz de riscos de auditoria</li>
                  <li>Matriz de risco de qualidade</li>
                  <li>Vínculos risco → regra de auditoria</li>
                  <li>Vínculos risco → PTA/procedimento</li>
                  <li>Vínculos risco → solicitação/evidência</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      <AlertDialog open={confirmAprovarPlan} onOpenChange={(v) => !v && setConfirmAprovarPlan(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar planejamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Após aprovado, o planejamento não poderá ser editado diretamente nesta fase.
              Reabertura e nova versão serão tratadas em etapa futura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aprovarPlanMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={aprovarPlanMutation.isPending}
              onClick={(e) => { e.preventDefault(); aprovarPlanMutation.mutate(); }}
            >
              {aprovarPlanMutation.isPending ? "Aprovando..." : "Confirmar aprovação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmAprovarMat} onOpenChange={(v) => !v && setConfirmAprovarMat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar materialidade?</AlertDialogTitle>
            <AlertDialogDescription>
              A materialidade aprovada será marcada como <strong>vigente</strong> e não poderá ser editada diretamente.
              Alterações futuras serão tratadas por nova versão em etapa posterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aprovarMatMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={aprovarMatMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (confirmAprovarMat) aprovarMatMutation.mutate(confirmAprovarMat.id);
              }}
            >
              {aprovarMatMutation.isPending ? "Aprovando..." : "Confirmar aprovação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
