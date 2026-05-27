import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Pencil, Plus, Power, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-client";
import type { ModalidadeAtuacao } from "@/hooks/useModalidadesAtuacao";
import type { Segmento } from "@/hooks/useSegmentos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface ClienteModalidadeVinculo {
  id: string;
  cliente_id: string;
  modalidade_atuacao_id: string;
  principal: boolean;
  ativo: boolean;
  observacoes: string | null;
  modalidades_atuacao?: (ModalidadeAtuacao & { segmentos?: Pick<Segmento, "id" | "codigo" | "nome"> | null }) | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: any | null;
  segmento: Segmento | null;
  isAdmin: boolean;
}

const friendlyError = (err: any, fallback: string) => {
  const msg = String(err?.message || "");
  if (err?.code === "42501" || msg.includes("row-level security") || msg.includes("permission")) {
    return "Acesso negado para alterar modalidades do cliente.";
  }
  if (msg.includes("modalidade selecionada está inativa")) {
    return "A modalidade selecionada está inativa e não pode ser vinculada ao cliente.";
  }
  if (msg.includes("não pertence ao segmento atual do cliente") || msg.includes("incompat")) {
    return "A modalidade não pertence ao segmento atual do cliente.";
  }
  if (err?.code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
    return "Esta modalidade já está vinculada ao cliente. Reative o vínculo existente, se necessário.";
  }
  return msg || fallback;
};

export default function ClienteModalidadesDialog({ open, onOpenChange, cliente, segmento, isAdmin }: Props) {
  const qc = useQueryClient();
  const clienteId = cliente?.id as string | undefined;
  const segmentoId = (cliente?.segmento_id || null) as string | null;
  const [addOpen, setAddOpen] = useState(false);
  const [selectedModalidadeId, setSelectedModalidadeId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [editingObs, setEditingObs] = useState<ClienteModalidadeVinculo | null>(null);
  const [obsDraft, setObsDraft] = useState("");

  const vinculosQ = useQuery({
    queryKey: ["cliente-modalidades-atuacao", clienteId],
    enabled: open && !!clienteId,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("cliente_modalidades_atuacao")
        .select("*, modalidades_atuacao(id, segmento_id, codigo, nome, descricao, ordem, ativo, segmentos(id, codigo, nome))")
        .eq("cliente_id", clienteId);
      if (error) throw error;
      return (data || []) as ClienteModalidadeVinculo[];
    },
  });

  const modalidadesQ = useQuery({
    queryKey: ["modalidades-atuacao-ativas-cliente", segmentoId],
    enabled: open && addOpen && !!segmentoId,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("modalidades_atuacao")
        .select("*")
        .eq("segmento_id", segmentoId)
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data || []) as ModalidadeAtuacao[];
    },
  });

  const vinculos = useMemo(() => {
    return [...(vinculosQ.data || [])].sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      if (a.principal !== b.principal) return a.principal ? -1 : 1;
      return (a.modalidades_atuacao?.nome || "").localeCompare(b.modalidades_atuacao?.nome || "");
    });
  }, [vinculosQ.data]);

  const idsVinculados = useMemo(() => new Set(vinculos.map((v) => v.modalidade_atuacao_id)), [vinculos]);
  const modalidadesDisponiveis = (modalidadesQ.data || []).filter((m) => !idsVinculados.has(m.id));
  const principalAtiva = vinculos.find((v) => v.ativo && v.principal);
  const hasInconsistencia = vinculos.some((v) => v.modalidades_atuacao?.segmento_id && segmentoId && v.modalidades_atuacao.segmento_id !== segmentoId);
  const hasVinculoInativo = vinculos.some((v) => !v.ativo);

  const closeAdd = () => {
    setAddOpen(false);
    setSelectedModalidadeId("");
    setObservacoes("");
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Cliente inválido.");
      if (!segmentoId) throw new Error("Defina primeiro o segmento do cliente para vincular modalidades de atuação.");
      if (!selectedModalidadeId) throw new Error("Selecione uma modalidade.");

      const { error } = await (supabase.from as any)("cliente_modalidades_atuacao").insert({
        cliente_id: clienteId,
        modalidade_atuacao_id: selectedModalidadeId,
        principal: false,
        ativo: true,
        observacoes: observacoes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente-modalidades-atuacao", clienteId] });
      toast.success("Modalidade vinculada ao cliente.");
      closeAdd();
    },
    onError: (err) => toast.error(friendlyError(err, "Erro ao vincular modalidade.")),
  });

  const principalMutation = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await (supabase as any).rpc("set_cliente_modalidade_principal", {
        p_cliente_modalidade_id: vinculoId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente-modalidades-atuacao", clienteId] });
      toast.success("Modalidade principal atualizada.");
    },
    onError: (err) => toast.error(friendlyError(err, "Erro ao definir modalidade principal.")),
  });

  const toggleMutation = useMutation({
    mutationFn: async (v: ClienteModalidadeVinculo) => {
      const payload = v.ativo
        ? { ativo: false, principal: false }
        : { ativo: true, principal: false };
      const { error } = await (supabase.from as any)("cliente_modalidades_atuacao")
        .update(payload)
        .eq("id", v.id);
      if (error) throw error;
      return v;
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["cliente-modalidades-atuacao", clienteId] });
      toast.success(v.ativo ? "Vínculo inativado. Defina outra modalidade principal, se necessário." : "Vínculo reativado.");
    },
    onError: (err) => toast.error(friendlyError(err, "Erro ao alterar status do vínculo.")),
  });

  const obsMutation = useMutation({
    mutationFn: async () => {
      if (!editingObs) throw new Error("Vínculo inválido.");
      const { error } = await (supabase.from as any)("cliente_modalidades_atuacao")
        .update({ observacoes: obsDraft.trim() || null })
        .eq("id", editingObs.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente-modalidades-atuacao", clienteId] });
      toast.success("Observações atualizadas.");
      setEditingObs(null);
      setObsDraft("");
    },
    onError: (err) => toast.error(friendlyError(err, "Erro ao salvar observações.")),
  });

  const openObs = (v: ClienteModalidadeVinculo) => {
    setEditingObs(v);
    setObsDraft(v.observacoes || "");
  };

  if (!cliente) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modalidades de Atuação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium text-foreground">{cliente.razao_social}</div>
              <div className="text-muted-foreground">
                Segmento: <span className="text-foreground">{segmento?.nome || "Não definido"}</span>
              </div>
            </div>

            {!segmentoId && (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground flex gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>Defina primeiro o segmento do cliente para vincular modalidades de atuação.</span>
              </div>
            )}

            {hasInconsistencia && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>Há modalidade vinculada fora do segmento atual do cliente. Ajuste os vínculos antes de alterar o segmento.</span>
              </div>
            )}

            {!principalAtiva && vinculos.some((v) => v.ativo) && (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
                Nenhuma modalidade principal foi definida para este cliente.
              </div>
            )}

            <div className="flex justify-end">
              {isAdmin && (
                <Button size="sm" onClick={() => setAddOpen(true)} disabled={!segmentoId}>
                  <Plus size={14} className="mr-1" /> Adicionar modalidade
                </Button>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modalidade</TableHead>
                    <TableHead className="w-28">Código</TableHead>
                    <TableHead className="w-32">Principal</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead>Observações</TableHead>
                    {isAdmin && <TableHead className="w-48 text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vinculosQ.isLoading ? (
                    <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                  ) : vinculosQ.isError ? (
                    <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-destructive py-8">Erro ao carregar modalidades do cliente.</TableCell></TableRow>
                  ) : vinculos.length === 0 ? (
                    <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">Cliente sem modalidades vinculadas.</TableCell></TableRow>
                  ) : (
                    vinculos.map((v) => {
                      const modalidade = v.modalidades_atuacao;
                      const inconsistente = !!modalidade?.segmento_id && !!segmentoId && modalidade.segmento_id !== segmentoId;
                      return (
                        <TableRow key={v.id} className={!v.ativo ? "opacity-60" : ""}>
                          <TableCell>
                            <div className="font-medium">{modalidade?.nome || "Modalidade não encontrada"}</div>
                            {inconsistente && <div className="text-xs text-destructive">Segmento incompatível</div>}
                            {modalidade?.segmentos?.nome && (
                              <div className="text-xs text-muted-foreground">{modalidade.segmentos.nome}</div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{modalidade?.codigo || "—"}</TableCell>
                          <TableCell>
                            {v.principal ? (
                              <Badge className="gap-1"><Star size={11} /> Principal</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Não principal</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={v.ativo ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}>
                              {v.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[220px]">
                            <div className="line-clamp-2">{v.observacoes || "—"}</div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                {v.ativo && !v.principal && (
                                  <Button size="sm" variant="ghost" title="Definir como principal" onClick={() => principalMutation.mutate(v.id)}>
                                    <CheckCircle2 size={14} />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" title="Editar observações" onClick={() => openObs(v)}>
                                  <Pencil size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={v.ativo ? "Inativar vínculo" : "Reativar vínculo"}
                                  onClick={() => toggleMutation.mutate(v)}
                                >
                                  {v.ativo ? <Power size={14} /> : <RotateCcw size={14} />}
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) closeAdd(); else setAddOpen(v); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar modalidade</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Modalidade</Label>
              <Select value={selectedModalidadeId} onValueChange={setSelectedModalidadeId} disabled={!segmentoId || modalidadesQ.isLoading}>
                <SelectTrigger><SelectValue placeholder={modalidadesQ.isLoading ? "Carregando..." : "Selecione"} /></SelectTrigger>
                <SelectContent>
                  {modalidadesDisponiveis.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.codigo} — {m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!modalidadesQ.isLoading && modalidadesDisponiveis.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nenhuma modalidade ativa disponível para novo vínculo neste segmento.
                  {hasVinculoInativo ? " Há vínculos inativos que podem ser reativados na listagem." : ""}
                </p>
              )}
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAdd}>Cancelar</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!selectedModalidadeId || addMutation.isPending}>
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingObs} onOpenChange={(v) => { if (!v) setEditingObs(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar observações</DialogTitle></DialogHeader>
          <Textarea value={obsDraft} onChange={(e) => setObsDraft(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingObs(null)}>Cancelar</Button>
            <Button onClick={() => obsMutation.mutate()} disabled={obsMutation.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
