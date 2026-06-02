import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus, Lock, Pencil, RotateCcw, X, Star } from "lucide-react";
import { toast } from "sonner";

interface Props {
  trabalho: any | null;
  planData: any | null;
  canEdit: boolean;
  canEditReason?: string;
}

interface VinculoPlan {
  id: string;
  trabalho_planejamento_id: string;
  trabalho_auditoria_id: string;
  cliente_id: string;
  exercicio_id: string | null;
  cliente_modalidade_atuacao_id: string;
  modalidade_atuacao_id: string;
  segmento_codigo_snapshot: string;
  segmento_nome_snapshot: string;
  modalidade_codigo_snapshot: string;
  modalidade_nome_snapshot: string;
  principal_cliente_snapshot: boolean;
  observacoes_escopo: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

function mapErr(e: any): string {
  const msg = String(e?.message || e || "");
  const code = e?.code || "";
  if (code === "42501" || /row-level security|row level security/i.test(msg)) {
    return "Você não possui alçada para alterar as modalidades deste planejamento.";
  }
  if (/inativ/i.test(msg) && /modalidade/i.test(msg)) {
    return "Não foi possível reativar a modalidade. Verifique se ela ainda está ativa no cadastro do cliente e compatível com o segmento.";
  }
  if (/segmento/i.test(msg)) {
    return "Modalidade incompatível com o segmento atual do cliente.";
  }
  if (/duplicate key|unique/i.test(msg)) {
    return "Esta modalidade já está vinculada ao planejamento.";
  }
  return msg || "Erro ao processar operação.";
}

export default function TrabalhoPlanejamentoModalidadesPanel({
  trabalho, planData, canEdit, canEditReason,
}: Props) {
  const qc = useQueryClient();
  const trabalhoId = trabalho?.id as string | undefined;
  const planId = planData?.id as string | undefined;
  const clienteId = trabalho?.cliente_id as string | undefined;
  const isAprovado = planData?.status_planejamento === "aprovado";
  const readOnly = !canEdit || isAprovado || !planId;

  const [addOpen, setAddOpen] = useState(false);
  const [addModalidadeId, setAddModalidadeId] = useState<string>("");
  const [addObs, setAddObs] = useState("");
  const [editObsId, setEditObsId] = useState<string | null>(null);
  const [editObsValue, setEditObsValue] = useState("");

  // 1) Vínculos no planejamento
  const vinculosQ = useQuery({
    queryKey: ["trabalho-planejamento-modalidades", planId, trabalhoId],
    enabled: !!planId && !!trabalhoId,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("trabalho_planejamento_modalidades")
        .select("*")
        .eq("trabalho_planejamento_id", planId!)
        .eq("trabalho_auditoria_id", trabalhoId!)
        .order("ativo", { ascending: false })
        .order("principal_cliente_snapshot", { ascending: false })
        .order("modalidade_nome_snapshot", { ascending: true });
      if (error) throw error;
      return (data || []) as VinculoPlan[];
    },
  });

  // 2) Modalidades ativas do cliente (com modalidade + segmento)
  const clienteModsQ = useQuery({
    queryKey: ["cliente-modalidades-disponiveis", clienteId],
    enabled: !!clienteId && !readOnly,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("cliente_modalidades_atuacao")
        .select("id, modalidade_atuacao_id, principal, ativo, modalidades_atuacao(id, codigo, nome, ativo, segmento_id, segmentos(id, codigo, nome))")
        .eq("cliente_id", clienteId!)
        .eq("ativo", true);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const vinculos = vinculosQ.data || [];
  const modalidadesVinculadasIds = new Set(vinculos.map((v) => v.modalidade_atuacao_id));

  const opcoesParaAdicionar = useMemo(() => {
    const lista = clienteModsQ.data || [];
    return lista.filter((cm: any) => {
      const mod = cm.modalidades_atuacao;
      if (!mod || mod.ativo === false) return false;
      // exclui já vinculadas (mesmo inativas — para reativar, usar botão Reativar)
      if (modalidadesVinculadasIds.has(mod.id)) return false;
      return true;
    });
  }, [clienteModsQ.data, vinculos]);

  // Inconsistências
  const clienteModsById = useMemo(() => {
    const map = new Map<string, any>();
    (clienteModsQ.data || []).forEach((cm: any) => map.set(cm.id, cm));
    return map;
  }, [clienteModsQ.data]);

  const inconsistenciaDe = (v: VinculoPlan): string | null => {
    if (!v.ativo) return null;
    const cm = clienteModsById.get(v.cliente_modalidade_atuacao_id);
    if (!cm) return "Vínculo do cliente não está mais ativo ou foi removido.";
    if (cm.ativo === false) return "Vínculo do cliente está inativo.";
    const mod = cm.modalidades_atuacao;
    if (!mod || mod.ativo === false) return "Modalidade está inativa no cadastro.";
    return null;
  };

  // Mutations
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!planId || !trabalhoId || !clienteId) throw new Error("Planejamento incompleto.");
      const cm = (clienteModsQ.data || []).find((x: any) => x.modalidades_atuacao?.id === addModalidadeId);
      if (!cm) throw new Error("Modalidade selecionada não encontrada.");
      const payload: any = {
        trabalho_planejamento_id: planId,
        trabalho_auditoria_id: trabalhoId,
        cliente_id: clienteId,
        exercicio_id: trabalho?.exercicio_id ?? null,
        cliente_modalidade_atuacao_id: cm.id,
        modalidade_atuacao_id: addModalidadeId,
        observacoes_escopo: addObs.trim() || null,
        ativo: true,
      };
      const { error } = await (supabase.from as any)("trabalho_planejamento_modalidades").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modalidade adicionada ao escopo");
      setAddOpen(false);
      setAddModalidadeId("");
      setAddObs("");
      qc.invalidateQueries({ queryKey: ["trabalho-planejamento-modalidades", planId, trabalhoId] });
    },
    onError: (e: any) => toast.error(mapErr(e)),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await (supabase.from as any)("trabalho_planejamento_modalidades")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.ativo ? "Modalidade reativada" : "Modalidade removida do escopo");
      qc.invalidateQueries({ queryKey: ["trabalho-planejamento-modalidades", planId, trabalhoId] });
    },
    onError: (e: any) => toast.error(mapErr(e)),
  });

  const saveObsMutation = useMutation({
    mutationFn: async ({ id, obs }: { id: string; obs: string }) => {
      const { error } = await (supabase.from as any)("trabalho_planejamento_modalidades")
        .update({ observacoes_escopo: obs.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Observação atualizada");
      setEditObsId(null);
      setEditObsValue("");
      qc.invalidateQueries({ queryKey: ["trabalho-planejamento-modalidades", planId, trabalhoId] });
    },
    onError: (e: any) => toast.error(mapErr(e)),
  });

  // Render
  return (
    <div className="rounded-md border bg-card p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">Modalidades Aplicáveis ao Escopo</div>
          <p className="text-[11px] text-muted-foreground max-w-2xl">
            Selecione quais modalidades de atuação do cliente fazem parte do escopo deste planejamento.
            Essas informações serão usadas futuramente para sugerir modelos de matriz de riscos.
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" /> Adicionar modalidade ao escopo
          </Button>
        )}
        {isAprovado && (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Lock size={12} /> Somente leitura
          </span>
        )}
      </div>

      {isAprovado && (
        <div className="rounded-md border border-success/30 bg-success/5 p-2 text-[11px]">
          Planejamento aprovado. As modalidades aplicáveis ao escopo permanecem bloqueadas para edição.
        </div>
      )}

      {!planId && (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          Salve o planejamento em rascunho antes de selecionar modalidades aplicáveis ao escopo.
        </div>
      )}

      {planId && canEdit === false && !isAprovado && (
        <div className="rounded-md border border-warning/30 bg-warning/5 p-2 text-[11px]">
          {canEditReason || "Você não possui alçada para alterar as modalidades deste planejamento."}
        </div>
      )}

      {planId && vinculosQ.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : vinculosQ.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs flex items-start gap-2">
          <AlertCircle size={14} className="text-destructive mt-0.5" />
          <div className="flex-1">Erro ao carregar modalidades do planejamento.</div>
          <Button size="sm" variant="outline" onClick={() => vinculosQ.refetch()}>Tentar novamente</Button>
        </div>
      ) : planId && vinculos.length === 0 ? (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          Nenhuma modalidade foi selecionada para este planejamento. A seleção não é obrigatória nesta fase,
          mas ajudará na futura sugestão de matriz de riscos.
        </div>
      ) : planId ? (
        <div className="space-y-2">
          {vinculos.map((v) => {
            const inc = inconsistenciaDe(v);
            const editingObs = editObsId === v.id;
            return (
              <div
                key={v.id}
                className={`rounded-md border p-2 text-xs ${v.ativo ? "" : "opacity-60 bg-muted/30"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">
                        {v.modalidade_codigo_snapshot} — {v.modalidade_nome_snapshot}
                      </span>
                      {v.principal_cliente_snapshot && (
                        <Badge variant="outline" className="text-[10px]">
                          <Star size={10} className="mr-1" /> Principal do cliente
                        </Badge>
                      )}
                      {!v.ativo && <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Segmento: {v.segmento_codigo_snapshot} — {v.segmento_nome_snapshot}
                    </div>
                    {!editingObs && v.observacoes_escopo && (
                      <div className="text-[11px] mt-1 whitespace-pre-wrap">
                        <span className="text-muted-foreground">Observações: </span>{v.observacoes_escopo}
                      </div>
                    )}
                    {editingObs && (
                      <div className="mt-2 space-y-1">
                        <Textarea
                          rows={2}
                          maxLength={2000}
                          value={editObsValue}
                          onChange={(e) => setEditObsValue(e.target.value)}
                          placeholder="Observações de escopo..."
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditObsId(null); setEditObsValue(""); }}
                            disabled={saveObsMutation.isPending}
                          >Cancelar</Button>
                          <Button
                            size="sm"
                            onClick={() => saveObsMutation.mutate({ id: v.id, obs: editObsValue })}
                            disabled={saveObsMutation.isPending}
                          >Salvar</Button>
                        </div>
                      </div>
                    )}
                    {inc && (
                      <div className="mt-1 rounded border border-warning/30 bg-warning/5 p-1.5 text-[11px] flex items-start gap-1">
                        <AlertCircle size={12} className="text-warning-foreground mt-0.5" />
                        <span>{inc} Esta modalidade pode estar inconsistente com o cadastro atual do cliente. Ajuste antes de aprovar o planejamento.</span>
                      </div>
                    )}
                  </div>

                  {!readOnly && !editingObs && (
                    <div className="flex flex-col gap-1 shrink-0">
                      {v.ativo ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditObsId(v.id); setEditObsValue(v.observacoes_escopo || ""); }}
                          >
                            <Pencil size={12} className="mr-1" /> Observações
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleAtivoMutation.mutate({ id: v.id, ativo: false })}
                            disabled={toggleAtivoMutation.isPending}
                          >
                            <X size={12} className="mr-1" /> Remover do escopo
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAtivoMutation.mutate({ id: v.id, ativo: true })}
                          disabled={toggleAtivoMutation.isPending}
                        >
                          <RotateCcw size={12} className="mr-1" /> Reativar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Dialog adicionar */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setAddModalidadeId(""); setAddObs(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar modalidade ao escopo</DialogTitle>
            <DialogDescription className="text-xs">
              Apenas modalidades ativas do cliente e ainda não vinculadas ao planejamento são exibidas.
            </DialogDescription>
          </DialogHeader>
          {clienteModsQ.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : opcoesParaAdicionar.length === 0 ? (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Nenhuma modalidade disponível para adicionar. Verifique o cadastro de modalidades do cliente.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Modalidade</Label>
                <Select value={addModalidadeId} onValueChange={setAddModalidadeId}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma modalidade..." /></SelectTrigger>
                  <SelectContent>
                    {opcoesParaAdicionar.map((cm: any) => {
                      const mod = cm.modalidades_atuacao;
                      const seg = mod?.segmentos;
                      return (
                        <SelectItem key={mod.id} value={mod.id}>
                          {mod.codigo} — {mod.nome}
                          {seg ? ` (${seg.codigo})` : ""}
                          {cm.principal ? " ★" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Observações de escopo (opcional)</Label>
                <Textarea rows={3} maxLength={2000} value={addObs} onChange={(e) => setAddObs(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)} disabled={addMutation.isPending}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!addModalidadeId || addMutation.isPending}
            >
              {addMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
