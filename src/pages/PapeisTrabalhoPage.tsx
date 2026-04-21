import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Search, Plus, ClipboardList, Trash2, Lock, Unlock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import PtaDetailDialog from "@/components/pta/PtaDetailDialog";
import GerarPtaDialog from "@/components/pta/GerarPtaDialog";

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-warning/15 text-warning-foreground border-warning/30" },
  em_analise: { label: "Em Análise", cls: "bg-info/15 text-info border-info/30" },
  em_revisao: { label: "Em Revisão", cls: "bg-[hsl(270,60%,55%)]/15 text-[hsl(270,60%,70%)] border-[hsl(270,60%,55%)]/30" },
  concluido: { label: "Concluído", cls: "bg-success/15 text-success border-success/30" },
  finalizado: { label: "Finalizado", cls: "bg-success/25 text-success border-success/50" },
};

export default function PapeisTrabalhoPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTrabalho, setFilterTrabalho] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGrupo, setFilterGrupo] = useState("all");
  const [filterPendencia, setFilterPendencia] = useState("all");
  const [filterDiferenca, setFilterDiferenca] = useState(false);
  const [selectedPta, setSelectedPta] = useState<any>(null);
  const [showGerar, setShowGerar] = useState(false);

  const { data: ptas = [], isLoading } = useQuery({
    queryKey: ["papeis_trabalho"],
    queryFn: async () => {
      const { data } = await supabase
        .from("papeis_trabalho")
        .select("*, trabalhos_auditoria(nome_trabalho), clientes(razao_social), exercicios(ano_exercicio)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: trabalhos = [] } = useQuery({
    queryKey: ["trabalhos_for_pta_filter"],
    queryFn: async () => {
      const { data } = await supabase.from("trabalhos_auditoria").select("id, nome_trabalho").order("nome_trabalho");
      return data || [];
    },
  });

  const deletePtaMutation = useMutation({
    mutationFn: async (ptaId: string) => {
      // 1. Get linked balancete_linha IDs before deleting
      const { data: ptaLinhas } = await supabase
        .from("papel_trabalho_linhas")
        .select("balancete_linha_id")
        .eq("papel_trabalho_id", ptaId);
      const balLinhaIds = (ptaLinhas || []).map((l: any) => l.balancete_linha_id);

      // 2. Delete linked lines
      const { error: linhasError } = await supabase
        .from("papel_trabalho_linhas")
        .delete()
        .eq("papel_trabalho_id", ptaId);
      if (linhasError) throw linhasError;

      // 3. Reset validation on balancete lines so they can be re-validated
      if (balLinhaIds.length > 0) {
        const { error: resetError } = await supabase
          .from("balancete_linhas")
          .update({
            status_linha: "pendente",
            valor_validado: null,
            diferenca_validacao: null,
            diferenca_aceita: null,
            justificativa_diferenca: null,
            data_validacao: null,
            data_revisao: null,
          })
          .in("id", balLinhaIds);
        if (resetError) throw resetError;
      }

      // 4. Delete the PTA itself
      const { error } = await supabase
        .from("papeis_trabalho")
        .delete()
        .eq("id", ptaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel de trabalho excluído — validação das linhas do balancete reabilitada");
      queryClient.invalidateQueries({ queryKey: ["papeis_trabalho"] });
      queryClient.invalidateQueries({ queryKey: ["balancete_linhas"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir: " + (err.message || "Erro desconhecido"));
    },
  });

  const toggleFechadoMutation = useMutation({
    mutationFn: async ({ ptaId, fechado }: { ptaId: string; fechado: boolean }) => {
      const { error } = await supabase
        .from("papeis_trabalho")
        .update({ fechado } as any)
        .eq("id", ptaId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.fechado ? "PTA fechado — validação das linhas bloqueada" : "PTA reaberto — validação das linhas liberada");
      queryClient.invalidateQueries({ queryKey: ["papeis_trabalho"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const atualizarPtaMutation = useMutation({
    mutationFn: async (ptaId: string) => {
      const { data: ptaLinhas } = await supabase
        .from("papel_trabalho_linhas")
        .select("balancete_linha_id")
        .eq("papel_trabalho_id", ptaId);

      if (!ptaLinhas || ptaLinhas.length === 0) return;

      const linhaIds = ptaLinhas.map(l => l.balancete_linha_id);
      const { data: linhasRaw } = await supabase
        .from("balancete_linhas")
        .select("id, saldo_anterior, saldo_atual, valor_validado, diferenca_validacao, status_linha, possui_pendencia, conta_origem_id, cliente_contas_origem(analitica)")
        .in("id", linhaIds);

      if (!linhasRaw) return;

      // Only sum synthetic accounts (analitica = false)
      const linhasSinteticas = linhasRaw.filter((l: any) => {
        const analitica = l.cliente_contas_origem?.analitica;
        return analitica === false || analitica == null;
      });
      const linhas = linhasRaw; // keep all for snapshot updates

      const saldoAnt = linhasSinteticas.reduce((s: number, l: any) => s + (l.saldo_anterior || 0), 0);
      const saldoAtual = linhasSinteticas.reduce((s: number, l: any) => s + (l.saldo_atual || 0), 0);
      const hasValidado = linhasSinteticas.some((l: any) => l.valor_validado != null);
      const valValidado = hasValidado ? linhasSinteticas.reduce((s: number, l: any) => s + (l.valor_validado || 0), 0) : null;
      const diferenca = valValidado != null ? saldoAtual - valValidado : null;
      const varAbs = saldoAtual - saldoAnt;
      const varPct = saldoAnt !== 0 ? ((saldoAtual - saldoAnt) / saldoAnt) * 100 : null;
      const pendencias = linhasSinteticas.filter((l: any) => l.possui_pendencia).length;

      const { count: docCount } = await supabase
        .from("documentos_referencia_balancete")
        .select("id", { count: "exact", head: true })
        .in("balancete_linha_id", linhaIds)
        .eq("ativo", true);

      for (const fl of linhas) {
        await supabase.from("papel_trabalho_linhas")
          .update({
            saldo_atual_linha: fl.saldo_atual,
            valor_validado_linha: fl.valor_validado,
            diferenca_linha: fl.diferenca_validacao,
            status_linha_snapshot: fl.status_linha,
          })
          .eq("papel_trabalho_id", ptaId)
          .eq("balancete_linha_id", fl.id);
      }

      await supabase.from("papeis_trabalho").update({
        saldo_anterior_total: saldoAnt,
        saldo_atual_total: saldoAtual,
        valor_validado_total: valValidado,
        diferenca_total: diferenca,
        variacao_absoluta_total: varAbs,
        variacao_percentual_total: varPct,
        total_linhas_vinculadas: linhas.length,
        total_linhas_com_pendencia: pendencias,
        total_documentos_referencia: docCount || 0,
      }).eq("id", ptaId);
    },
    onSuccess: () => {
      toast.success("PTA atualizado com os dados mais recentes do balancete");
      queryClient.invalidateQueries({ queryKey: ["papeis_trabalho"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const grupos = [...new Set(ptas.map((p: any) => p.grupo_mcse).filter(Boolean))].sort();

  const filtered = ptas.filter((p: any) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !(p.titulo_pta || "").toLowerCase().includes(s) &&
        !(p.codigo_mcse || "").toLowerCase().includes(s) &&
        !(p.descricao_mcse || "").toLowerCase().includes(s)
      ) return false;
    }
    if (filterTrabalho !== "all" && p.trabalho_auditoria_id !== filterTrabalho) return false;
    if (filterStatus !== "all" && p.status_pta !== filterStatus) return false;
    if (filterGrupo !== "all" && p.grupo_mcse !== filterGrupo) return false;
    if (filterPendencia === "com" && (p.total_linhas_com_pendencia || 0) === 0) return false;
    if (filterPendencia === "sem" && (p.total_linhas_com_pendencia || 0) > 0) return false;
    if (filterDiferenca && (p.diferenca_total == null || p.diferenca_total === 0)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Papéis de Trabalho de Auditoria" description="Consolidação analítica por grupo contábil dentro dos trabalhos de auditoria" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Buscar PTA..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-56" />
          </div>
          <Select value={filterTrabalho} onValueChange={setFilterTrabalho}>
            <SelectTrigger className="h-9 w-52 text-xs"><SelectValue placeholder="Trabalho" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os trabalhos</SelectItem>
              {trabalhos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_trabalho}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {grupos.length > 0 && (
            <Select value={filterGrupo} onValueChange={setFilterGrupo}>
              <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Grupo contábil" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos grupos</SelectItem>
                {grupos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={filterPendencia} onValueChange={setFilterPendencia}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Pendência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="com">Com pendência</SelectItem>
              <SelectItem value="sem">Sem pendência</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={filterDiferenca} onChange={e => setFilterDiferenca(e.target.checked)} className="rounded" />
            Dif. ≠ 0
          </label>
        </div>
        <Button onClick={() => setShowGerar(true)}>
          <Plus size={14} className="mr-1" /> Gerar PTA
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList size={36} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum papel de trabalho encontrado</p>
            <Button className="mt-4" onClick={() => setShowGerar(true)}>Gerar Primeiro PTA</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded border bg-card overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Trabalho</TableHead>
                <TableHead>MCSE</TableHead>
                <TableHead className="text-right">Saldo Atual</TableHead>
                <TableHead className="text-right">Val. Valid.</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead className="text-center">Linhas</TableHead>
                <TableHead className="text-center">Pend.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => {
                const hasDif = p.diferenca_total != null && p.diferenca_total !== 0;
                const hasPend = (p.total_linhas_com_pendencia || 0) > 0;
                const st = STATUS_MAP[p.status_pta] || { label: p.status_pta, cls: "" };
                const isFechado = (p as any).fechado === true;

                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="font-medium text-xs max-w-[200px] truncate" onClick={() => setSelectedPta(p)}>
                      {isFechado && <Lock size={12} className="inline mr-1 text-muted-foreground" />}
                      {p.titulo_pta || "Sem título"}
                    </TableCell>
                    <TableCell className="text-xs" onClick={() => setSelectedPta(p)}>{p.trabalhos_auditoria?.nome_trabalho}</TableCell>
                    <TableCell className="font-mono text-xs" onClick={() => setSelectedPta(p)}>{p.codigo_mcse || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs" onClick={() => setSelectedPta(p)}>{fmt(p.saldo_atual_total)}</TableCell>
                    <TableCell className="text-right font-mono text-xs" onClick={() => setSelectedPta(p)}>{fmt(p.valor_validado_total)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${hasDif ? "text-warning font-semibold" : ""}`} onClick={() => setSelectedPta(p)}>{fmt(p.diferenca_total)}</TableCell>
                    <TableCell className="text-center text-xs" onClick={() => setSelectedPta(p)}>{p.total_linhas_vinculadas || 0}</TableCell>
                    <TableCell className="text-center text-xs" onClick={() => setSelectedPta(p)}>{hasPend ? <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/30 text-xs">{p.total_linhas_com_pendencia}</Badge> : "—"}</TableCell>
                    <TableCell onClick={() => setSelectedPta(p)}><Badge variant="outline" className={`text-xs ${st.cls}`}>{st.label}</Badge></TableCell>
                    <TableCell>
                      <TooltipProvider>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={e => { e.stopPropagation(); atualizarPtaMutation.mutate(p.id); }}
                              disabled={atualizarPtaMutation.isPending}
                            >
                              <RefreshCw size={14} className={atualizarPtaMutation.isPending ? "animate-spin" : ""} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Atualizar PTA com dados do balancete</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${isFechado ? "text-warning" : "text-muted-foreground"}`}
                              onClick={e => { e.stopPropagation(); toggleFechadoMutation.mutate({ ptaId: p.id, fechado: !isFechado }); }}
                            >
                              {isFechado ? <Unlock size={14} /> : <Lock size={14} />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{isFechado ? "Reabrir PTA" : "Fechar PTA"}</TooltipContent>
                        </Tooltip>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir papel de trabalho?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá excluir o PTA "{p.titulo_pta}" e todas as suas linhas vinculadas. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePtaMutation.mutate(p.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <span className="text-xs text-muted-foreground p-2 block">{filtered.length} de {ptas.length} PTAs</span>
        </div>
      )}

      {selectedPta && (
        <PtaDetailDialog
          pta={selectedPta}
          onClose={() => setSelectedPta(null)}
        />
      )}

      {showGerar && (
        <GerarPtaDialog onClose={() => setShowGerar(false)} />
      )}
    </div>
  );
}