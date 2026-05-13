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
import { AlertCircle, Info, Pencil, Plus, Lock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";

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

  const qc = useQueryClient();
  const { data: userProfile } = useUserProfile();
  const isInterno = userProfile?.role === "auditor";

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
            ) : !planejamentoQ.data ? (
              <div className="space-y-2">
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum planejamento cadastrado para este trabalho.
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info size={12} /> O cadastro e edição do planejamento serão implementados na próxima etapa.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Status do Planejamento"><Badge variant="outline">{orDash(planejamentoQ.data.status_planejamento)}</Badge></Field>
                  <Field label="Equipe Responsável (ID)">{orDash(planejamentoQ.data.equipe_responsavel_id)}</Field>
                  <Field label="Aprovado por">{orDash(planejamentoQ.data.aprovado_por)}</Field>
                  <Field label="Data de Aprovação">{fmtDate(planejamentoQ.data.data_aprovacao)}</Field>
                </div>
                <Field label="Objetivo Geral da Auditoria"><div className="whitespace-pre-wrap">{orDash(planejamentoQ.data.objetivo_geral_auditoria)}</div></Field>
                <Field label="Escopo Resumido"><div className="whitespace-pre-wrap">{orDash(planejamentoQ.data.escopo_resumido)}</div></Field>
                <Field label="Estratégia Resumida"><div className="whitespace-pre-wrap">{orDash(planejamentoQ.data.estrategia_resumida)}</div></Field>
                <Field label="Premissas Relevantes"><div className="whitespace-pre-wrap">{orDash(planejamentoQ.data.premissas_relevantes)}</div></Field>
                <Field label="Limitações de Escopo"><div className="whitespace-pre-wrap">{orDash(planejamentoQ.data.limitacoes_escopo)}</div></Field>
                <Field label="Observações"><div className="whitespace-pre-wrap">{orDash(planejamentoQ.data.observacoes)}</div></Field>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info size={12} /> Edição do planejamento será implementada na próxima etapa.
                </div>
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
            ) : (materialidadeQ.data?.length ?? 0) === 0 ? (
              <div className="space-y-2">
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhuma materialidade cadastrada para este trabalho.
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info size={12} /> O cadastro, aprovação e versionamento de materialidade serão implementados na próxima etapa.
                </div>
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
                      <Field label="Responsável Definição (ID)">{orDash(vigente.responsavel_definicao_id)}</Field>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Field label="Justificativa Técnica"><div className="whitespace-pre-wrap text-sm">{orDash(vigente.justificativa_tecnica)}</div></Field>
                      <Field label="Motivo Nova Versão"><div className="whitespace-pre-wrap text-sm">{orDash(vigente.motivo_nova_versao)}</div></Field>
                      <Field label="Observações"><div className="whitespace-pre-wrap text-sm">{orDash(vigente.observacoes)}</div></Field>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Histórico de Versões</div>
                  <div className="border rounded-md divide-y">
                    {materialidadeQ.data!.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">v{orDash(m.versao)}</Badge>
                          {m.vigente && <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">vigente</Badge>}
                          <span className="text-xs text-muted-foreground">{orDash(m.status_materialidade)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Global: {fmtBRL(m.materialidade_global)} · Aprovação: {fmtDate(m.data_aprovacao)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info size={12} /> Cadastro, aprovação e versionamento serão implementados na próxima etapa.
                </div>
              </div>
            )}
          </TabsContent>

          {/* RISCOS */}
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
    </Dialog>
  );
}
