import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useUserProfile } from "@/hooks/useUserProfile";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, RefreshCw, XCircle } from "lucide-react";
import ClienteItemDocumentos from "@/components/cliente/ClienteItemDocumentos";


export default function ClientePendenciasPage() {
  const { data: profile } = useUserProfile();
  const clienteId = profile?.clienteUsuario?.cliente_id;

  // Buscar todas as solicitações do cliente
  const { data: solicitacoes = [] } = useQuery({
    queryKey: ["cliente_pendencias_sols", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data } = await supabase
        .from("solicitacoes_documentos")
        .select("id, titulo_solicitacao, prazo_resposta, trabalhos_auditoria(nome_trabalho), exercicios(ano_exercicio)")
        .eq("cliente_id", clienteId!)
        .in("status_solicitacao", ["enviada", "parcialmente_atendida", "parcialmente_respondida"]);
      return data || [];
    },
  });

  const solIds = solicitacoes.map((s: any) => s.id);

  // Buscar itens pendentes ou rejeitados
  const { data: itensPendentes = [], isLoading } = useQuery({
    queryKey: ["cliente_pendencias_itens", solIds.join(",")],
    enabled: solIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("solicitacao_itens")
        .select("*")
        .in("solicitacao_id", solIds)
        .in("status_item", ["pendente", "rejeitado"])
        .order("prazo_item", { ascending: true, nullsFirst: false });
      return data || [];
    },
  });

  // Buscar documentos com status complementar para detectar itens que precisam complementação
  const { data: docsComplementar = [] } = useQuery({
    queryKey: ["cliente_pendencias_docs_complementar", solIds.join(",")],
    enabled: solIds.length > 0,
    queryFn: async () => {
      // Buscar itens recebidos que podem ter docs complementar
      const { data: itensRecebidos } = await supabase
        .from("solicitacao_itens")
        .select("id, solicitacao_id, descricao_documento, tipo_documento, prazo_item, codigo_mcse, descricao_mcse, obrigatorio")
        .in("solicitacao_id", solIds)
        .eq("status_item", "recebido");

      if (!itensRecebidos || itensRecebidos.length === 0) return [];

      const itemIds = itensRecebidos.map((i: any) => i.id);
      const { data: docs } = await supabase
        .from("solicitacao_item_documentos")
        .select("*")
        .in("solicitacao_item_id", itemIds)
        .eq("status_documento", "complementar")
        .order("versao", { ascending: false });

      if (!docs || docs.length === 0) return [];

      // Agrupar por item, pegar só o mais recente
      const latestByItem = new Map<string, any>();
      for (const d of docs) {
        if (!latestByItem.has(d.solicitacao_item_id)) {
          latestByItem.set(d.solicitacao_item_id, d);
        }
      }

      // Retornar itens com complementação pendente
      return itensRecebidos
        .filter((i: any) => latestByItem.has(i.id))
        .map((i: any) => ({
          ...i,
          status_item: "complementar" as string,
          _lastDoc: latestByItem.get(i.id),
        }));
    },
  });

  const solMap = new Map(solicitacoes.map((s: any) => [s.id, s]));

  // Combinar itens pendentes/rejeitados + itens com complementação
  const allPendencias = [
    ...itensPendentes.map((i: any) => ({ ...i, _type: i.status_item })),
    ...docsComplementar.map((i: any) => ({ ...i, _type: "complementar" })),
  ];

  // Ordenar por prazo (urgentes primeiro)
  allPendencias.sort((a, b) => {
    if (!a.prazo_item && !b.prazo_item) return 0;
    if (!a.prazo_item) return 1;
    if (!b.prazo_item) return -1;
    return new Date(a.prazo_item).getTime() - new Date(b.prazo_item).getTime();
  });

  return (
    <div>
      <PageHeader
        title="Pendências"
        description="Documentos que precisam de atenção: recusados, com complementação solicitada ou não enviados"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : allPendencias.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <AlertTriangle size={32} className="text-success" />
              <p className="font-medium">Nenhuma pendência!</p>
              <p className="text-xs">Todos os documentos estão em dia.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <AlertTriangle size={16} className="text-warning" />
            <span>{allPendencias.length} item(ns) necessitam atenção</span>
          </div>

          {allPendencias.map((item: any) => {
            const sol = solMap.get(item.solicitacao_id);
            const isRecusado = item._type === "rejeitado";
            const isComplementar = item._type === "complementar";
            

            const statusConfig = isRecusado
              ? { label: "Recusado", icon: XCircle, color: "text-destructive", borderColor: "border-destructive/30" }
              : isComplementar
              ? { label: "Complementar", icon: RefreshCw, color: "text-orange-600", borderColor: "border-orange-500/30" }
              : { label: "Aguardando envio", icon: Clock, color: "text-warning", borderColor: "border-warning/30" };

            const StatusIcon = statusConfig.icon;

            return (
              <Card key={`${item.id}-${item._type}`} className={`${statusConfig.borderColor}`}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon size={16} className={statusConfig.color} />
                        <h3 className="text-sm font-semibold truncate">{item.descricao_documento}</h3>
                        <Badge variant="outline" className={`text-[10px] ${statusConfig.color} shrink-0`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {sol && <span>{sol.titulo_solicitacao}</span>}
                        {sol?.trabalhos_auditoria?.nome_trabalho && <span>• {sol.trabalhos_auditoria.nome_trabalho}</span>}
                        {item.codigo_mcse && (
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{item.codigo_mcse}</span>
                        )}
                        {item.prazo_item && (
                          <span className={`font-medium ${new Date(item.prazo_item) < new Date() ? "text-destructive" : "text-warning"}`}>
                            Prazo: {new Date(item.prazo_item).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      {item._lastDoc?.observacao_auditor && (
                        <p className="text-xs text-muted-foreground mt-1 italic border-l-2 border-orange-500/30 pl-2">
                          Auditor: {item._lastDoc.observacao_auditor}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Upload inline para reenvio */}
                  <ClienteItemDocumentos
                    itemId={item.id}
                    solicitacaoId={item.solicitacao_id}
                    statusItem={item._type}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
