import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { fetchClientes, fetchContas, fetchContasOrigem, fetchMapeamentos } from "@/lib/supabase-queries";
import { suggestMcseWithConfidence } from "@/lib/mcse-suggestion";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import RiskBadge from "@/components/RiskBadge";
import SelectMcseModal from "@/components/mapeamento/SelectMcseModal";
import ContextoClienteEstrutura from "@/components/ContextoClienteEstrutura";
import { useEstruturaPorCliente } from "@/hooks/useEstruturaPorCliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CheckCircle2, Search, Layers } from "lucide-react";

type RiskFilter = "todos" | "alta" | "media" | "baixa" | "sem_sugestao";
type StatusFilter = "todos" | "nao_mapeados" | "nao_homologados" | "com_sugestao" | "mapeados_auto";
type TipoContaFilter = "analitica" | "sintetica" | "todas";

export default function MapeamentoPage() {
  const qc = useQueryClient();
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: async () => { const { data } = await fetchClientes(); return data || []; } });

  const [selectedCliente, setSelectedCliente] = useState("");

  // FASE 3B.1 — Estrutura derivada do cliente (em vez do seletor administrativo).
  // Fluxo: cliente → segmento → estrutura aplicável (com fallback automático para MCSE).
  const { data: contextoEstrutura } = useEstruturaPorCliente(selectedCliente || null);
  const estruturaOperacionalId = contextoEstrutura?.estrutura?.id ?? null;
  const estruturaOperacionalLabel = contextoEstrutura?.estrutura
    ? `${contextoEstrutura.estrutura.codigo} — ${contextoEstrutura.estrutura.nome}`
    : null;

  const { data: mcseContas = [] } = useQuery({
    queryKey: ["mcse_contas_all", "operacional", estruturaOperacionalId || "legacy"],
    queryFn: async () => { const { data } = await fetchContas(undefined, undefined, estruturaOperacionalId); return data || []; },
  });

  // selectedCliente declarado acima (necessário para useEstruturaPorCliente)
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("todos");
  const [filterGrupo, setFilterGrupo] = useState("all");
  const [filterTipoConta, setFilterTipoConta] = useState<TipoContaFilter>("todas");
  const [filterRisco, setFilterRisco] = useState<RiskFilter>("todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showMcseModal, setShowMcseModal] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingMcse, setPendingMcse] = useState<any>(null);

  const { data: contasOrigem = [] } = useQuery({
    queryKey: ["contas_origem", selectedCliente],
    queryFn: async () => { if (!selectedCliente) return []; const { data } = await fetchContasOrigem(selectedCliente); return data || []; },
    enabled: !!selectedCliente,
  });

  const { data: mapeamentos = [] } = useQuery({
    queryKey: ["mapeamentos", selectedCliente],
    queryFn: async () => { if (!selectedCliente) return []; const { data } = await fetchMapeamentos(selectedCliente); return data || []; },
    enabled: !!selectedCliente,
  });

  const mapByOrigem = useMemo(() => {
    const m: Record<string, any> = {};
    mapeamentos.forEach((mp: any) => { m[mp.conta_origem_id] = mp; });
    return m;
  }, [mapeamentos]);

  const riskByOrigem = useMemo(() => {
    const m: Record<string, ReturnType<typeof suggestMcseWithConfidence>> = {};
    contasOrigem.forEach((c: any) => {
      m[c.id] = suggestMcseWithConfidence(c.classificacao, c.nome);
    });
    return m;
  }, [contasOrigem]);

  const grupos = useMemo(() => {
    const set = new Map<string, string>();
    mcseContas.forEach((c: any) => {
      if (c.mcse_grupos) set.set(c.grupo_id, c.mcse_grupos.descricao_grupo);
    });
    return Array.from(set.entries());
  }, [mcseContas]);

  const filteredContas = useMemo(() => {
    let list = contasOrigem.filter((c: any) => {
      if (filterTipoConta === "analitica") return c.analitica;
      if (filterTipoConta === "sintetica") return !c.analitica;
      return true;
    });
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((c: any) =>
        (c.classificacao || "").toLowerCase().includes(s)
      );
    }
    if (filter === "nao_mapeados") list = list.filter((c: any) => !mapByOrigem[c.id]?.conta_mcse_id);
    if (filter === "nao_homologados") list = list.filter((c: any) => mapByOrigem[c.id]?.conta_mcse_id && !mapByOrigem[c.id]?.homologado);
    if (filter === "com_sugestao") list = list.filter((c: any) => !!c.codigo_mcse_sugerido);
    if (filter === "mapeados_auto") list = list.filter((c: any) => mapByOrigem[c.id]?.tipo_mapeamento === "automatico");

    if (filterRisco !== "todos") {
      list = list.filter((c: any) => riskByOrigem[c.id]?.risco_mapeamento === filterRisco);
    }

    if (filterGrupo !== "all") {
      list = list.filter((c: any) => {
        const mp = mapByOrigem[c.id];
        if (!mp?.conta_mcse_id) return false;
        const mc = mcseContas.find((m: any) => m.id === mp.conta_mcse_id);
        return mc?.grupo_id === filterGrupo;
      });
    }
    return list;
  }, [contasOrigem, search, filter, filterRisco, filterTipoConta, filterGrupo, mapByOrigem, mcseContas, riskByOrigem]);

  // --- Single mapping ---
  const saveMapeamento = useMutation({
    mutationFn: async ({ contaOrigemId, contaMcseId }: { contaOrigemId: string; contaMcseId: string }) => {
      const existing = mapByOrigem[contaOrigemId];
      if (existing) {
        await supabase.from("cliente_mapeamento_mcse").update({ conta_mcse_id: contaMcseId, tipo_mapeamento: "manual" as const }).eq("id", existing.id);
      } else {
        await supabase.from("cliente_mapeamento_mcse").insert({
          cliente_id: selectedCliente, conta_origem_id: contaOrigemId, conta_mcse_id: contaMcseId, tipo_mapeamento: "manual" as const,
        });
      }
      await supabase.from("cliente_contas_origem").update({ status_mapeamento: "mapeado_manual" as any }).eq("id", contaOrigemId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mapeamentos"] }); qc.invalidateQueries({ queryKey: ["contas_origem"] }); },
  });

  // --- Homologation ---
  const homologar = useMutation({
    mutationFn: async ({ mapeamentoId, contaOrigemId }: { mapeamentoId: string; contaOrigemId: string }) => {
      await supabase.from("cliente_mapeamento_mcse").update({ homologado: true, data_homologacao: new Date().toISOString(), homologado_por: "auditor" }).eq("id", mapeamentoId);
      await supabase.from("cliente_contas_origem").update({ status_mapeamento: "homologado" as any }).eq("id", contaOrigemId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mapeamentos"] }); qc.invalidateQueries({ queryKey: ["contas_origem"] }); toast.success("Homologado!"); },
  });

  const homologarLote = useMutation({
    mutationFn: async (ids: string[]) => {
      let count = 0;
      for (const contaOrigemId of ids) {
        const mp = mapByOrigem[contaOrigemId];
        if (!mp?.conta_mcse_id || mp.homologado) continue;
        await supabase.from("cliente_mapeamento_mcse").update({ homologado: true, data_homologacao: new Date().toISOString(), homologado_por: "auditor" }).eq("id", mp.id);
        await supabase.from("cliente_contas_origem").update({ status_mapeamento: "homologado" as any }).eq("id", contaOrigemId);
        count++;
      }
      return count;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["mapeamentos"] }); qc.invalidateQueries({ queryKey: ["contas_origem"] });
      setSelectedIds(new Set());
      toast.success(`${count} conta(s) homologada(s)!`);
    },
  });

  // --- Batch mapping ---
  const mapearLote = useMutation({
    mutationFn: async ({ ids, contaMcse }: { ids: string[]; contaMcse: any }) => {
      let count = 0;
      for (const contaOrigemId of ids) {
        const existing = mapByOrigem[contaOrigemId];
        if (existing) {
          await supabase.from("cliente_mapeamento_mcse").update({
            conta_mcse_id: contaMcse.id,
            tipo_mapeamento: "manual" as const,
            confianca_mapeamento: 1.0,
            observacao: "mapeamento em lote",
          }).eq("id", existing.id);
        } else {
          await supabase.from("cliente_mapeamento_mcse").insert({
            cliente_id: selectedCliente,
            conta_origem_id: contaOrigemId,
            conta_mcse_id: contaMcse.id,
            tipo_mapeamento: "manual" as const,
            confianca_mapeamento: 1.0,
            observacao: "mapeamento em lote",
          });
        }
        await supabase.from("cliente_contas_origem").update({
          status_mapeamento: "mapeado_manual" as any,
          codigo_mcse_sugerido: contaMcse.codigo_mcse,
        }).eq("id", contaOrigemId);
        count++;
      }
      return { count, codigo: contaMcse.codigo_mcse, descricao: contaMcse.descricao_conta };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["mapeamentos"] });
      qc.invalidateQueries({ queryKey: ["contas_origem"] });
      setSelectedIds(new Set());
      toast.success(`${result.count} conta(s) mapeada(s) para ${result.codigo} — ${result.descricao}`);
    },
  });

  const handleMcseSelected = useCallback((contaMcse: any) => {
    const ids = Array.from(selectedIds);
    const hasExisting = ids.some(id => !!mapByOrigem[id]?.conta_mcse_id);
    if (hasExisting) {
      setPendingMcse(contaMcse);
      setShowMcseModal(false);
      setShowOverwriteConfirm(true);
    } else {
      mapearLote.mutate({ ids, contaMcse });
      setShowMcseModal(false);
    }
  }, [selectedIds, mapByOrigem, mapearLote]);

  const confirmOverwrite = useCallback(() => {
    if (pendingMcse) {
      mapearLote.mutate({ ids: Array.from(selectedIds), contaMcse: pendingMcse });
    }
    setShowOverwriteConfirm(false);
    setPendingMcse(null);
  }, [pendingMcse, selectedIds, mapearLote]);

  // --- Selection helpers ---
  const selectedForHomologation = useMemo(() => {
    return Array.from(selectedIds).filter(id => {
      const mp = mapByOrigem[id];
      return mp?.conta_mcse_id && !mp.homologado;
    });
  }, [selectedIds, mapByOrigem]);

  const selectedMappingInfo = useMemo(() => {
    const ids = Array.from(selectedIds);
    const mapped = ids.filter(id => mapByOrigem[id]?.conta_mcse_id);
    if (mapped.length === 0) return { allSameMcse: false, hasDifferentMappings: false, mappedCount: 0 };

    const mcseIds = new Set(mapped.map(id => mapByOrigem[id].conta_mcse_id));
    if (mcseIds.size === 1 && mapped.length === ids.length) {
      const mp = mapByOrigem[mapped[0]];
      return {
        allSameMcse: true,
        commonMcseCode: mp.mcse_contas?.codigo_mcse,
        commonMcseDesc: mp.mcse_contas?.descricao_conta,
        hasDifferentMappings: false,
        mappedCount: mapped.length,
      };
    }
    return {
      allSameMcse: false,
      hasDifferentMappings: mcseIds.size > 1,
      mappedCount: mapped.length,
    };
  }, [selectedIds, mapByOrigem]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const visibleIds = filteredContas.filter((c: any) => !mapByOrigem[c.id]?.homologado).map((c: any) => c.id);
    if (selectedIds.size === visibleIds.length && visibleIds.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  }, [filteredContas, selectedIds, mapByOrigem]);

  const stats = useMemo(() => {
    const total = contasOrigem.length;
    const mapeadas = contasOrigem.filter((c: any) => mapByOrigem[c.id]?.conta_mcse_id).length;
    const homologadas = contasOrigem.filter((c: any) => mapByOrigem[c.id]?.homologado).length;
    return { total, mapeadas, homologadas };
  }, [contasOrigem, mapByOrigem]);

  return (
    <div>
      <PageHeader
        title="Mapeamento para Estrutura de Auditoria"
        description={
          estruturaOperacionalLabel
            ? `Vincular contas do cliente à estrutura ${estruturaOperacionalLabel}`
            : "Vincular contas do cliente à estrutura de referência derivada do segmento"
        }
      />

      {/* Contexto operacional do cliente (segmento + estrutura derivada) */}
      {selectedCliente && (
        <div className="mb-4">
          <ContextoClienteEstrutura clienteId={selectedCliente} variant="block" />
        </div>
      )}
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={selectedCliente} onValueChange={v => { setSelectedCliente(v); setSelectedIds(new Set()); }}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
          <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
        </Select>
        {selectedCliente && (
          <>
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Buscar conta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="nao_mapeados">Não mapeados</SelectItem>
                <SelectItem value="nao_homologados">Não homologados</SelectItem>
                <SelectItem value="com_sugestao">Com sugestão automática</SelectItem>
                <SelectItem value="mapeados_auto">Mapeados automaticamente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTipoConta} onValueChange={(v: any) => setFilterTipoConta(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="analitica">Analíticas</SelectItem>
                <SelectItem value="sintetica">Sintéticas</SelectItem>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRisco} onValueChange={(v: any) => setFilterRisco(v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os riscos</SelectItem>
                <SelectItem value="alta">Alta confiança</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="sem_sugestao">Sem sugestão</SelectItem>
              </SelectContent>
            </Select>
            {grupos.length > 0 && (
              <Select value={filterGrupo} onValueChange={setFilterGrupo}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {grupos.map(([id, desc]) => <SelectItem key={id} value={id}>{desc}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </>
        )}
      </div>

      {selectedCliente && contasOrigem.length > 0 && (
        <>
          {/* Stats + batch actions */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-4">
              {[
                { val: stats.total, label: "Total", color: "text-foreground" },
                { val: stats.mapeadas, label: "Mapeadas", color: "text-info" },
                { val: stats.homologadas, label: "Homologadas", color: "text-success" },
                { val: stats.total - stats.mapeadas, label: "Pendentes", color: "text-warning" },
              ].map(s => (
                <div key={s.label} className="bg-card border rounded px-4 py-2 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">{selectedIds.size} conta(s) selecionada(s)</span>
                <Button size="sm" variant="outline" onClick={() => setShowMcseModal(true)} disabled={mapearLote.isPending}>
                  <Layers size={14} className="mr-1" /> Mapear selecionadas para Estrutura
                </Button>
                {selectedForHomologation.length > 0 && (
                  <Button size="sm" onClick={() => setShowConfirmDialog(true)} disabled={homologarLote.isPending}>
                    <CheckCircle2 size={14} className="mr-1" /> Homologar selecionados ({selectedForHomologation.length})
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded border bg-card overflow-auto max-h-[calc(100vh-360px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredContas.length > 0 && selectedIds.size > 0 && filteredContas.filter((c: any) => !mapByOrigem[c.id]?.homologado).every((c: any) => selectedIds.has(c.id))}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-24">IDCONTA</TableHead>
                  <TableHead className="w-56">NOME</TableHead>
                  <TableHead className="w-28">CLASSIFICACAO</TableHead>
                  <TableHead className="w-14">GRAU</TableHead>
                  <TableHead className="w-24">Risco</TableHead>
                  <TableHead className="w-36">Sugestão</TableHead>
                  <TableHead className="w-72">Conta da Estrutura</TableHead>
                  <TableHead className="w-36">Grupo</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContas.slice(0, 300).map((conta: any) => {
                  const mp = mapByOrigem[conta.id];
                  const isMapped = !!mp?.conta_mcse_id;
                  const isHomologado = !!mp?.homologado;
                  const risk = riskByOrigem[conta.id];
                  const isSelected = selectedIds.has(conta.id);

                  return (
                    <TableRow
                      key={conta.id}
                      className={`${isSelected ? "bg-primary/10" : !isMapped ? "bg-warning/5" : isHomologado ? "" : "bg-info/5"}`}
                    >
                      <TableCell>
                        {isHomologado ? (
                          <Checkbox disabled checked />
                        ) : (
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(conta.id)} />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{conta.idconta}</TableCell>
                      <TableCell className="text-sm">{conta.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{conta.classificacao}</TableCell>
                      <TableCell>{conta.grau ?? "—"}</TableCell>
                      <TableCell>
                        <RiskBadge risk={risk?.risco_mapeamento || "sem_sugestao"} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{conta.codigo_mcse_sugerido || "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={mp?.conta_mcse_id || ""}
                          onValueChange={v => saveMapeamento.mutate({ contaOrigemId: conta.id, contaMcseId: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecionar conta da Estrutura..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mcseContas.map((mc: any) => (
                              <SelectItem key={mc.id} value={mc.id}>
                                <span className="font-mono">{mc.codigo_mcse}</span> — {mc.descricao_conta}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {mp?.mcse_contas?.mcse_grupos?.descricao_grupo || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={isHomologado ? "homologado" : isMapped ? "mapeado" : "nao_mapeado"} />
                      </TableCell>
                      <TableCell>
                        {isMapped && !isHomologado && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => homologar.mutate({ mapeamentoId: mp.id, contaOrigemId: conta.id })}>
                            <CheckCircle2 size={14} className="mr-1" /> Homologar
                          </Button>
                        )}
                        {isHomologado && <span className="text-success text-xs">✓</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredContas.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    {contasOrigem.length === 0 ? "Importe o plano de contas primeiro" : "Nenhuma conta encontrada"}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            {filteredContas.length > 300 && <p className="text-center text-xs text-muted-foreground py-2">Mostrando 300 de {filteredContas.length}</p>}
          </div>
        </>
      )}

      {selectedCliente && contasOrigem.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <p>Nenhuma conta importada para este cliente</p>
          <p className="text-sm mt-1">Vá para "Importar Contas" para carregar o plano de contas</p>
        </div>
      )}

      {/* Modal de mapeamento em lote — usa estrutura derivada do cliente */}
      <SelectMcseModal
        open={showMcseModal}
        onOpenChange={setShowMcseModal}
        selectedCount={selectedIds.size}
        onConfirm={handleMcseSelected}
        mappingInfo={selectedMappingInfo}
        estruturaId={estruturaOperacionalId}
        estruturaLabel={estruturaOperacionalLabel}
      />
      {/* Overwrite confirmation */}
      <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sobrescrever mapeamentos existentes?</AlertDialogTitle>
            <AlertDialogDescription>
              Algumas das contas selecionadas já possuem mapeamento MCSE. Deseja sobrescrever com <strong>{pendingMcse?.codigo_mcse}</strong> — {pendingMcse?.descricao_conta}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingMcse(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOverwrite}>Sobrescrever</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Homologation confirmation */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar homologação em lote</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja homologar <strong>{selectedForHomologation.length}</strong> conta(s) selecionada(s)? Esta ação registrará a homologação com data e usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { homologarLote.mutate(selectedForHomologation); setShowConfirmDialog(false); }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
