import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Save, Filter, Eye, ChevronDown, FileDown, CheckCircle2, BookOpen, Monitor, Paperclip } from "lucide-react";
import { gerarSolicitacao, salvarSolicitacaoRascunho, type ItemGerado, type GeracaoFiltros } from "@/lib/solicitacao-service";
import { fetchSolicitacaoPdfData, gerarSolicitacaoPdfHtml, downloadPdfViaHtml } from "@/lib/solicitacao-pdf";
import ItemDocumentosPanel from "@/components/solicitacao/ItemDocumentosPanel";
import ContextoClienteEstrutura from "@/components/ContextoClienteEstrutura";

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  revisada: "Revisada",
  enviada: "Enviada",
  parcialmente_respondida: "Parcial",
  parcialmente_atendida: "Parc. Atendida",
  respondida: "Respondida",
  atendida: "Atendida",
  concluida: "Concluída",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "text-muted-foreground bg-muted/50 border-muted",
  revisada: "text-info bg-info/15 border-info/30",
  enviada: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  parcialmente_respondida: "text-warning bg-warning/15 border-warning/30",
  parcialmente_atendida: "text-warning bg-warning/15 border-warning/30",
  respondida: "text-success bg-success/15 border-success/30",
  atendida: "text-success bg-success/15 border-success/30",
  concluida: "text-success bg-success/15 border-success/30",
  encerrada: "text-muted-foreground bg-muted/50 border-muted",
  cancelada: "text-destructive bg-destructive/15 border-destructive/30",
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  recebido: "Recebido",
  aceito: "Aceito",
  rejeitado: "Rejeitado",
  dispensado: "Dispensado",
};

export default function SolicitacoesPage() {
  const qc = useQueryClient();
  const [showGerarDialog, setShowGerarDialog] = useState(false);
  const [showRevisao, setShowRevisao] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<string | null>(null);
  const [filterTrabalho, setFilterTrabalho] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFinalizarDialog, setShowFinalizarDialog] = useState(false);

  // Generation state
  const [genTrabalhoId, setGenTrabalhoId] = useState("");
  const [genFiltros, setGenFiltros] = useState<GeracaoFiltros>({
    apenasContasCriticas: false,
    apenasComSaldo: true,
    todasComRegraAtiva: true,
  });
  const [itensGerados, setItensGerados] = useState<ItemGerado[]>([]);
  const [genContexto, setGenContexto] = useState<{ clienteId: string; exercicioId: string } | null>(null);
  const [titulo, setTitulo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const { data: trabalhos = [] } = useQuery({
    queryKey: ["trabalhos_sol"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trabalhos_auditoria")
        .select("id, nome_trabalho, clientes(razao_social), exercicios(ano_exercicio)")
        .order("nome_trabalho");
      return data || [];
    },
  });

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ["solicitacoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("solicitacoes_documentos")
        .select("*, trabalhos_auditoria(nome_trabalho), clientes(razao_social), exercicios(ano_exercicio)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: solItens = [] } = useQuery({
    queryKey: ["solicitacao_itens", selectedSolicitacao],
    enabled: !!selectedSolicitacao,
    queryFn: async () => {
      const { data } = await supabase
        .from("solicitacao_itens")
        .select("*")
        .eq("solicitacao_id", selectedSolicitacao!)
        .order("ordem");
      return data || [];
    },
  });

  // Fetch instructions & ERP trails for the selected solicitation's regras
  const regraIds = [...new Set(solItens.map((i: any) => i.regra_mcse_id).filter(Boolean))];

  const { data: instrucoesMcse = [] } = useQuery({
    queryKey: ["sol_instrucoes", regraIds.join(",")],
    enabled: regraIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("mcse_regras_instrucoes")
        .select("*")
        .in("regra_mcse_id", regraIds)
        .eq("ativo", true)
        .order("ordem");
      return data || [];
    },
  });

  const { data: emissaoErpMcse = [] } = useQuery({
    queryKey: ["sol_emissao_erp", regraIds.join(",")],
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
  for (const i of instrucoesMcse) {
    if (!instrByRegra.has(i.regra_mcse_id)) instrByRegra.set(i.regra_mcse_id, []);
    instrByRegra.get(i.regra_mcse_id)!.push(i);
  }
  const erpByRegra = new Map<string, any[]>();
  for (const e of emissaoErpMcse) {
    if (!erpByRegra.has(e.regra_mcse_id)) erpByRegra.set(e.regra_mcse_id, []);
    erpByRegra.get(e.regra_mcse_id)!.push(e);
  }

  const gerarMutation = useMutation({
    mutationFn: async () => {
      if (!genTrabalhoId) throw new Error("Selecione um trabalho");
      return gerarSolicitacao(genTrabalhoId, genFiltros);
    },
    onSuccess: (result) => {
      setItensGerados(result.itens);
      setGenContexto({ clienteId: result.clienteId, exercicioId: result.exercicioId });
      const trab = trabalhos.find((t: any) => t.id === genTrabalhoId) as any;
      setTitulo(`Solicitação Documental — ${trab?.clientes?.razao_social || ""} — ${trab?.exercicios?.ano_exercicio || ""}`);
      setShowGerarDialog(false);
      setShowRevisao(true);
      toast.success(`${result.itens.length} itens gerados para revisão`);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao gerar solicitação"),
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (!genContexto) throw new Error("Contexto inválido");
      return salvarSolicitacaoRascunho(genTrabalhoId, genContexto.clienteId, genContexto.exercicioId, titulo, prazo || null, observacoes, itensGerados);
    },
    onSuccess: () => {
      toast.success("Solicitação salva como rascunho!");
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      setShowRevisao(false);
      setItensGerados([]);
      setGenContexto(null);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("solicitacao_itens").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacao_itens", selectedSolicitacao] });
      toast.success("Item removido");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover item"),
  });

  const finalizarRevisaoMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSolicitacao) throw new Error("Nenhuma solicitação selecionada");
      const { error } = await supabase
        .from("solicitacoes_documentos")
        .update({ status_solicitacao: "revisada" })
        .eq("id", selectedSolicitacao);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação marcada como revisada!");
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      setShowFinalizarDialog(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao finalizar revisão"),
  });

  const handleGerarPdf = async () => {
    if (!selectedSolicitacao) return;
    try {
      const data = await fetchSolicitacaoPdfData(selectedSolicitacao);
      const { data: { user } } = await supabase.auth.getUser();
      const html = gerarSolicitacaoPdfHtml(data, user?.email || "Sistema");
      downloadPdfViaHtml(html, `solicitacao_${data.solicitacao.titulo_solicitacao?.replace(/\s+/g, "_").substring(0, 40)}.pdf`);
      toast.success("PDF gerado — use Ctrl+P / Cmd+P para salvar");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar PDF");
    }
  };

  const removeItemGerado = (index: number) => {
    setItensGerados((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemGerado = (index: number, field: keyof ItemGerado, value: any) => {
    setItensGerados((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const groupByMcse = (items: any[]) => {
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
  };

  const filteredSolicitacoes = solicitacoes.filter((s: any) => {
    if (filterTrabalho !== "all" && s.trabalho_auditoria_id !== filterTrabalho) return false;
    if (filterStatus !== "all" && s.status_solicitacao !== filterStatus) return false;
    return true;
  });

  // === REVISÃO DE ITENS GERADOS ===
  if (showRevisao) {
    const groups = groupByMcse(itensGerados.map((item, i) => ({ ...item, _index: i })));
    return (
      <div>
        <PageHeader title="Revisão da Solicitação" description="Revise e ajuste os itens antes de salvar" />
        <Button variant="outline" className="mb-4" onClick={() => { setShowRevisao(false); setItensGerados([]); }}>
          ← Cancelar
        </Button>

        <Card className="mb-4">
          <CardContent className="pt-4 space-y-3">
            {genContexto?.clienteId && (
              <ContextoClienteEstrutura clienteId={genContexto.clienteId} />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
              <div><Label>Prazo de Resposta</Label><Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} /></div>
          </CardContent>
        </Card>

        <div className="space-y-4 mb-4">
          {groups.map((group) => (
            <Card key={group.codigo}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{group.codigo}</span>
                  {group.descricao}
                  <Badge variant="outline" className="ml-auto text-xs">{group.items.length} doc(s)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Ord.</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Obrig.</TableHead>
                      <TableHead className="w-20">Instruções</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item: any) => (
                      <TableRow key={item._index}>
                        <TableCell>
                          <Input type="number" className="w-14 h-7 text-xs" value={item.ordem} onChange={(e) => updateItemGerado(item._index, "ordem", parseInt(e.target.value) || 1)} />
                        </TableCell>
                        <TableCell className="text-sm">{item.tipo_documento}</TableCell>
                        <TableCell className="text-sm max-w-[250px]">
                          <Input className="h-7 text-xs" value={item.descricao_documento} onChange={(e) => updateItemGerado(item._index, "descricao_documento", e.target.value)} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox checked={item.obrigatorio} onCheckedChange={(v) => updateItemGerado(item._index, "obrigatorio", !!v)} />
                        </TableCell>
                        <TableCell>
                          {item.instrucoes_cliente ? <Badge variant="outline" className="text-xs cursor-help" title={item.instrucoes_cliente}>✓</Badge> : "—"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItemGerado(item._index)}>
                            <Trash2 size={13} className="text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{itensGerados.length} item(ns) no total</p>
          <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending || itensGerados.length === 0}>
            <Save size={14} className="mr-1" /> {salvarMutation.isPending ? "Salvando..." : "Salvar como Rascunho"}
          </Button>
        </div>
      </div>
    );
  }

  // === DETALHE DE UMA SOLICITAÇÃO EXISTENTE ===
  if (selectedSolicitacao) {
    const sol = solicitacoes.find((s: any) => s.id === selectedSolicitacao) as any;
    const groups = groupByMcse(solItens);
    const isRascunho = sol?.status_solicitacao === "rascunho";
    const canEdit = isRascunho;

    return (
      <div>
        <PageHeader
          title={sol?.titulo_solicitacao || "Solicitação"}
          description={`${sol?.trabalhos_auditoria?.nome_trabalho} — ${sol?.clientes?.razao_social}`}
        />

        {/* Action bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Button variant="outline" onClick={() => setSelectedSolicitacao(null)}>← Voltar</Button>
          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[sol?.status_solicitacao] || ""}`}>
            {STATUS_LABELS[sol?.status_solicitacao] || sol?.status_solicitacao}
          </Badge>
          <Badge variant="outline">{solItens.length} item(ns)</Badge>
          {sol?.prazo_resposta && (
            <span className="text-xs text-muted-foreground">Prazo: {new Date(sol.prazo_resposta).toLocaleDateString("pt-BR")}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGerarPdf}>
              <FileDown size={14} className="mr-1" /> Gerar PDF
            </Button>
            {isRascunho && solItens.length > 0 && (
              <Button size="sm" onClick={() => setShowFinalizarDialog(true)}>
                <CheckCircle2 size={14} className="mr-1" /> Finalizar Revisão
              </Button>
            )}
          </div>
        </div>

        {sol?.cliente_id && (
          <div className="mb-3">
            <ContextoClienteEstrutura clienteId={sol.cliente_id} />
          </div>
        )}

        {sol?.observacoes && (
          <Card className="mb-4">
            <CardContent className="py-3 text-sm text-muted-foreground">
              <strong>Observações:</strong> {sol.observacoes}
            </CardContent>
          </Card>
        )}

        {/* Groups */}
        <div className="space-y-4">
          {groups.map((group) => {
            const groupInstrs = group.regraIds.flatMap((rid) => instrByRegra.get(rid) || []);
            const groupErps = group.regraIds.flatMap((rid) => erpByRegra.get(rid) || []);

            return (
              <Card key={group.codigo}>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{group.codigo}</span>
                    {group.descricao}
                    <Badge variant="outline" className="ml-auto text-xs">{group.items.length} doc(s)</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Ord.</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-center">Obrig.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10">Docs</TableHead>
                        {canEdit && <TableHead className="w-10"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item: any) => (
                        <Collapsible key={item.id} asChild>
                          <>
                            <CollapsibleTrigger asChild>
                              <TableRow className="cursor-pointer hover:bg-muted/30">
                                <TableCell className="text-xs">{item.ordem}</TableCell>
                                <TableCell className="text-sm">{item.tipo_documento}</TableCell>
                                <TableCell className="text-sm max-w-[300px] truncate">{item.descricao_documento}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className={`text-xs ${item.obrigatorio ? "text-destructive border-destructive/30" : ""}`}>
                                    {item.obrigatorio ? "Sim" : "Não"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{ITEM_STATUS_LABELS[item.status_item] || item.status_item}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Paperclip size={13} className="text-muted-foreground" />
                                </TableCell>
                                {canEdit && (
                                  <TableCell>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteItemMutation.mutate(item.id); }}>
                                      <Trash2 size={13} className="text-destructive" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            </CollapsibleTrigger>
                            <CollapsibleContent asChild>
                              <tr>
                                <td colSpan={canEdit ? 7 : 6} className="p-0">
                                  <ItemDocumentosPanel
                                    itemId={item.id}
                                    itemDescricao={item.descricao_documento}
                                    solicitacaoId={selectedSolicitacao!}
                                    trabalhoAuditoriaId={sol?.trabalho_auditoria_id}
                                    clienteId={sol?.cliente_id}
                                    exercicioId={sol?.exercicio_id}
                                  />
                                </td>
                              </tr>
                            </CollapsibleContent>
                          </>
                        </Collapsible>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Collapsible: Instructions & ERP */}
                  {(groupInstrs.length > 0 || groupErps.length > 0) && (
                    <div className="border-t border-border px-4 py-2 space-y-1">
                      {groupInstrs.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground w-full py-1">
                            <BookOpen size={12} />
                            <span>Instruções ao Cliente ({groupInstrs.length})</span>
                            <ChevronDown size={12} className="ml-auto transition-transform [[data-state=open]>&]:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-2 pl-5 py-2">
                              {groupInstrs.map((inst: any) => (
                                <div key={inst.id} className="rounded border border-warning/20 bg-warning/5 p-2">
                                  <p className="text-xs font-semibold text-foreground">{inst.titulo_instrucao}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{inst.texto_instrucao}</p>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {groupErps.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground w-full py-1">
                            <Monitor size={12} />
                            <span>Trilha de Emissão ERP ({groupErps.length})</span>
                            <ChevronDown size={12} className="ml-auto transition-transform [[data-state=open]>&]:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-2 pl-5 py-2">
                              {groupErps.map((erp: any) => (
                                <div key={erp.id} className="rounded border border-success/20 bg-success/5 p-2 text-xs">
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

        {/* Finalizar Revisão Dialog */}
        <Dialog open={showFinalizarDialog} onOpenChange={setShowFinalizarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalizar Revisão</DialogTitle>
              <DialogDescription>
                Ao finalizar a revisão, a solicitação será marcada como <strong>revisada</strong> e estará pronta para envio ao cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 text-sm text-muted-foreground">
              <p>A solicitação contém <strong>{solItens.length}</strong> item(ns) documental(is).</p>
              <p className="mt-2">Deseja confirmar a finalização da revisão?</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFinalizarDialog(false)}>Cancelar</Button>
              <Button onClick={() => finalizarRevisaoMutation.mutate()} disabled={finalizarRevisaoMutation.isPending}>
                <CheckCircle2 size={14} className="mr-1" />
                {finalizarRevisaoMutation.isPending ? "Finalizando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === LISTA DE SOLICITAÇÕES ===
  return (
    <div>
      <PageHeader title="Solicitações Documentais" description="Solicitações de documentos geradas a partir dos balancetes" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Select value={filterTrabalho} onValueChange={setFilterTrabalho}>
            <SelectTrigger className="h-9 w-64 text-xs"><Filter size={12} className="mr-1" /><SelectValue placeholder="Trabalho" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os trabalhos</SelectItem>
              {trabalhos.map((t: any) => <SelectItem key={t.id} value={t.id}>{(t as any).nome_trabalho}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-44 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setGenTrabalhoId(""); setShowGerarDialog(true); }}>
          <Plus size={14} className="mr-1" /> Gerar Solicitação
        </Button>
      </div>

      {filteredSolicitacoes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText size={36} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{isLoading ? "Carregando..." : "Nenhuma solicitação encontrada"}</p>
            <Button className="mt-4" onClick={() => { setGenTrabalhoId(""); setShowGerarDialog(true); }}>Gerar Primeira Solicitação</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Trabalho</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSolicitacoes.map((s: any) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedSolicitacao(s.id)}>
                  <TableCell className="font-medium text-sm max-w-[250px] truncate">{s.titulo_solicitacao}</TableCell>
                  <TableCell className="text-sm">{s.trabalhos_auditoria?.nome_trabalho}</TableCell>
                  <TableCell className="text-sm">{s.clientes?.razao_social}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[s.status_solicitacao] || ""}`}>
                      {STATUS_LABELS[s.status_solicitacao] || s.status_solicitacao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{s.prazo_resposta ? new Date(s.prazo_resposta).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Eye size={14} className="text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de geração */}
      <Dialog open={showGerarDialog} onOpenChange={setShowGerarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Solicitação Documental</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Trabalho de Auditoria *</Label>
              <Select value={genTrabalhoId} onValueChange={setGenTrabalhoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o trabalho..." /></SelectTrigger>
                <SelectContent>
                  {trabalhos.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome_trabalho} — {t.clientes?.razao_social} ({t.exercicios?.ano_exercicio})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filtros de Geração</Label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={genFiltros.apenasComSaldo} onCheckedChange={(v) => setGenFiltros((f) => ({ ...f, apenasComSaldo: !!v }))} />
                Apenas contas com saldo ≠ 0
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={genFiltros.apenasContasCriticas} onCheckedChange={(v) => setGenFiltros((f) => ({ ...f, apenasContasCriticas: !!v }))} />
                Apenas contas críticas
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={genFiltros.todasComRegraAtiva} onCheckedChange={(v) => setGenFiltros((f) => ({ ...f, todasComRegraAtiva: !!v }))} />
                Incluir todas com regra ativa
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGerarDialog(false)}>Cancelar</Button>
            <Button onClick={() => gerarMutation.mutate()} disabled={gerarMutation.isPending || !genTrabalhoId}>
              {gerarMutation.isPending ? "Gerando..." : "Gerar Itens"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
