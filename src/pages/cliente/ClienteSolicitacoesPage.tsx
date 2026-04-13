import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useUserProfile } from "@/hooks/useUserProfile";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, Eye, ChevronDown, BookOpen, Monitor, Clock, CheckCircle2, AlertCircle, RefreshCw, Upload } from "lucide-react";
import ClienteItemDocumentos from "@/components/cliente/ClienteItemDocumentos";

const STATUS_FRIENDLY: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Em preparação", color: "text-muted-foreground bg-muted/50 border-muted" },
  revisada: { label: "Revisada", color: "text-info bg-info/15 border-info/30" },
  enviada: { label: "Aguardando envio", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  parcialmente_respondida: { label: "Parcialmente atendida", color: "text-warning bg-warning/15 border-warning/30" },
  parcialmente_atendida: { label: "Parcialmente atendida", color: "text-warning bg-warning/15 border-warning/30" },
  respondida: { label: "Respondida", color: "text-success bg-success/15 border-success/30" },
  atendida: { label: "Atendida", color: "text-success bg-success/15 border-success/30" },
  concluida: { label: "Concluída", color: "text-success bg-success/15 border-success/30" },
  encerrada: { label: "Encerrada", color: "text-muted-foreground bg-muted/50 border-muted" },
  cancelada: { label: "Cancelada", color: "text-destructive bg-destructive/15 border-destructive/30" },
};

const ITEM_FRIENDLY: Record<string, { label: string; icon: any; color: string }> = {
  pendente: { label: "Aguardando envio", icon: Clock, color: "text-warning" },
  recebido: { label: "Em análise", icon: RefreshCw, color: "text-blue-500" },
  aceito: { label: "Aceito", icon: CheckCircle2, color: "text-success" },
  rejeitado: { label: "Precisa complementar", icon: AlertCircle, color: "text-destructive" },
  dispensado: { label: "Dispensado", icon: CheckCircle2, color: "text-muted-foreground" },
};

export default function ClienteSolicitacoesPage() {
  const { data: profile } = useUserProfile();
  const clienteId = profile?.clienteUsuario?.cliente_id;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ["cliente_solicitacoes", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data } = await supabase
        .from("solicitacoes_documentos")
        .select("*, trabalhos_auditoria(nome_trabalho), exercicios(ano_exercicio)")
        .eq("cliente_id", clienteId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Count items per solicitation
  const solIds = solicitacoes.map((s: any) => s.id);
  const { data: allItens = [] } = useQuery({
    queryKey: ["cliente_sol_itens_count", solIds.join(",")],
    enabled: solIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("solicitacao_itens")
        .select("id, solicitacao_id, status_item")
        .in("solicitacao_id", solIds);
      return data || [];
    },
  });

  const countBySol = (solId: string) => {
    const items = allItens.filter((i: any) => i.solicitacao_id === solId);
    return { total: items.length, pendentes: items.filter((i: any) => i.status_item === "pendente").length };
  };

  const filtered = solicitacoes.filter((s: any) => {
    if (filterStatus !== "all" && s.status_solicitacao !== filterStatus) return false;
    if (search && !s.titulo_solicitacao?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (selectedId) {
    return <SolicitacaoDetalhe solicitacaoId={selectedId} onBack={() => setSelectedId(null)} clienteId={clienteId} />;
  }

  return (
    <div>
      <PageHeader title="Minhas Solicitações" description="Acompanhe as solicitações de documentos da sua empresa" />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Input placeholder="Buscar por título..." className="max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_FRIENDLY).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma solicitação encontrada.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sol: any) => {
            const counts = countBySol(sol.id);
            const sf = STATUS_FRIENDLY[sol.status_solicitacao] || { label: sol.status_solicitacao, color: "" };
            return (
              <Card key={sol.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedId(sol.id)}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={16} className="text-primary shrink-0" />
                      <h3 className="text-sm font-semibold truncate">{sol.titulo_solicitacao}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{sol.trabalhos_auditoria?.nome_trabalho}</span>
                      <span>Exercício {sol.exercicios?.ano_exercicio}</span>
                      <span>Emitida em {new Date(sol.data_solicitacao).toLocaleDateString("pt-BR")}</span>
                      {sol.prazo_resposta && <span className="text-warning">Prazo: {new Date(sol.prazo_resposta).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-xs">
                      <p>{counts.total} item(ns)</p>
                      {counts.pendentes > 0 && <p className="text-warning">{counts.pendentes} pendente(s)</p>}
                    </div>
                    <Badge variant="outline" className={`text-xs ${sf.color}`}>{sf.label}</Badge>
                    <Eye size={16} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


// === DETAIL VIEW ===
function SolicitacaoDetalhe({ solicitacaoId, onBack, clienteId }: { solicitacaoId: string; onBack: () => void; clienteId: string }) {
  const { data: sol } = useQuery({
    queryKey: ["cliente_sol_detail", solicitacaoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("solicitacoes_documentos")
        .select("*, trabalhos_auditoria(nome_trabalho), clientes(razao_social), exercicios(ano_exercicio)")
        .eq("id", solicitacaoId)
        .eq("cliente_id", clienteId)
        .maybeSingle();
      return data;
    },
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["cliente_sol_itens", solicitacaoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("solicitacao_itens")
        .select("*")
        .eq("solicitacao_id", solicitacaoId)
        .order("ordem");
      return data || [];
    },
  });

  const regraIds = [...new Set(itens.map((i: any) => i.regra_mcse_id).filter(Boolean))];

  const { data: instrucoes = [] } = useQuery({
    queryKey: ["cliente_instrucoes", regraIds.join(",")],
    enabled: regraIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("mcse_regras_instrucoes")
        .select("*")
        .in("regra_mcse_id", regraIds)
        .eq("ativo", true)
        .eq("publico_alvo", "cliente")
        .order("ordem");
      return data || [];
    },
  });

  const { data: erps = [] } = useQuery({
    queryKey: ["cliente_erps", regraIds.join(",")],
    enabled: regraIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("mcse_regras_emissao_erp")
        .select("*")
        .in("regra_mcse_id", regraIds)
        .eq("ativo", true)
        .order("ordem");
      return data || [];
    },
  });

  const instrByRegra = new Map<string, any[]>();
  for (const i of instrucoes) {
    if (!instrByRegra.has(i.regra_mcse_id)) instrByRegra.set(i.regra_mcse_id, []);
    instrByRegra.get(i.regra_mcse_id)!.push(i);
  }
  const erpByRegra = new Map<string, any[]>();
  for (const e of erps) {
    if (!erpByRegra.has(e.regra_mcse_id)) erpByRegra.set(e.regra_mcse_id, []);
    erpByRegra.get(e.regra_mcse_id)!.push(e);
  }

  const groups = groupByMcse(itens);

  if (!sol) return <p className="text-muted-foreground text-sm">Carregando...</p>;

  const sf = STATUS_FRIENDLY[sol.status_solicitacao] || { label: sol.status_solicitacao, color: "" };

  return (
    <div>
      <Button variant="outline" className="mb-4" onClick={onBack}>← Voltar</Button>

      <Card className="mb-6">
        <CardContent className="py-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{sol.titulo_solicitacao}</h2>
            <Badge variant="outline" className={`text-xs ${sf.color}`}>{sf.label}</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
            <div><span className="font-medium text-foreground">Cliente:</span> {sol.clientes?.razao_social}</div>
            <div><span className="font-medium text-foreground">Exercício:</span> {sol.exercicios?.ano_exercicio}</div>
            <div><span className="font-medium text-foreground">Emissão:</span> {new Date(sol.data_solicitacao).toLocaleDateString("pt-BR")}</div>
            {sol.prazo_resposta && <div><span className="font-medium text-foreground">Prazo:</span> {new Date(sol.prazo_resposta).toLocaleDateString("pt-BR")}</div>}
          </div>
          {sol.observacoes && <p className="text-sm text-muted-foreground border-t border-border pt-2 mt-2">{sol.observacoes}</p>}
        </CardContent>
      </Card>

      <h3 className="text-sm font-semibold mb-3">Documentos solicitados ({itens.length} itens)</h3>

      <div className="space-y-4">
        {groups.map((group) => {
          const gInstrs = group.regraIds.flatMap((rid: string) => instrByRegra.get(rid) || []);
          const gErps = group.regraIds.flatMap((rid: string) => erpByRegra.get(rid) || []);

          return (
            <Card key={group.codigo || "sem_mcse"}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  {group.codigo && <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{group.codigo}</span>}
                  {group.descricao || "Documentos gerais"}
                  <Badge variant="outline" className="ml-auto text-xs">{group.items.length} doc(s)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Documento solicitado</TableHead>
                      <TableHead className="text-center w-24">Obrigatório</TableHead>
                      <TableHead className="w-40">Situação</TableHead>
                      {group.items.some((i: any) => i.prazo_item) && <TableHead className="w-28">Prazo</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item: any, idx: number) => {
                      const is = ITEM_FRIENDLY[item.status_item] || { label: item.status_item, icon: Clock, color: "text-muted-foreground" };
                      const Icon = is.icon;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{item.descricao_documento}</p>
                            <p className="text-xs text-muted-foreground">{item.tipo_documento}</p>
                            {item.instrucoes_cliente && (
                              <p className="text-xs text-muted-foreground mt-1 italic">💡 {item.instrucoes_cliente}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-xs ${item.obrigatorio ? "text-destructive border-destructive/30" : ""}`}>
                              {item.obrigatorio ? "Sim" : "Não"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Icon size={14} className={is.color} />
                              <span className={`text-xs ${is.color}`}>{is.label}</span>
                            </div>
                          </TableCell>
                          {group.items.some((i: any) => i.prazo_item) && (
                            <TableCell className="text-xs text-muted-foreground">
                              {item.prazo_item ? new Date(item.prazo_item).toLocaleDateString("pt-BR") : "—"}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {(gInstrs.length > 0 || gErps.length > 0) && (
                  <div className="border-t border-border px-4 py-2 space-y-1">
                    {gInstrs.length > 0 && (
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground w-full py-1">
                          <BookOpen size={12} />
                          <span>Como preparar estes documentos ({gInstrs.length})</span>
                          <ChevronDown size={12} className="ml-auto transition-transform [[data-state=open]>&]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 pl-5 py-2">
                            {gInstrs.map((inst: any) => (
                              <div key={inst.id} className="rounded border border-primary/20 bg-primary/5 p-3">
                                <p className="text-xs font-semibold text-foreground">{inst.titulo_instrucao}</p>
                                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{inst.texto_instrucao}</p>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {gErps.length > 0 && (
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground w-full py-1">
                          <Monitor size={12} />
                          <span>Como emitir no sistema ({gErps.length})</span>
                          <ChevronDown size={12} className="ml-auto transition-transform [[data-state=open]>&]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 pl-5 py-2">
                            {gErps.map((erp: any) => (
                              <div key={erp.id} className="rounded border border-success/20 bg-success/5 p-3 text-xs">
                                <p className="font-semibold text-foreground">{erp.erp_nome} — {erp.nome_relatorio}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-muted-foreground">
                                  {erp.modulo_erp && <p><strong>Módulo:</strong> {erp.modulo_erp}</p>}
                                  {erp.caminho_emissao && <p><strong>Caminho:</strong> {erp.caminho_emissao}</p>}
                                  {erp.filtros_obrigatorios && <p><strong>Filtros:</strong> {erp.filtros_obrigatorios}</p>}
                                  {erp.campos_minimos_esperados && <p><strong>Campos mínimos:</strong> {erp.campos_minimos_esperados}</p>}
                                  {erp.formato_preferencial && <p><strong>Formato:</strong> {erp.formato_preferencial}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function groupByMcse(items: any[]) {
  const groups = new Map<string, { codigo: string; descricao: string; regraIds: string[]; items: any[] }>();
  for (const item of items) {
    const key = item.conta_mcse_id || item.codigo_mcse || "sem_mcse";
    if (!groups.has(key)) {
      groups.set(key, { codigo: item.codigo_mcse || "", descricao: item.descricao_mcse || "", regraIds: [], items: [] });
    }
    const g = groups.get(key)!;
    g.items.push(item);
    if (item.regra_mcse_id && !g.regraIds.includes(item.regra_mcse_id)) g.regraIds.push(item.regra_mcse_id);
  }
  return [...groups.values()];
}
