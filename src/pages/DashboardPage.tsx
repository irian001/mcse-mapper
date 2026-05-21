import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import PageHeader from "@/components/PageHeader";
import QuickActions from "@/components/dashboard/QuickActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Briefcase, FileText, AlertTriangle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";
import { useCurrentAuditor } from "@/hooks/useCurrentAuditor";

/**
 * Filtro de escopo do dashboard:
 * - Admin e Sócio: veem TUDO (bypass = true, accessibleTrabalhoIds = null).
 * - Demais auditores: veem apenas trabalhos onde estão vinculados ativos em trabalho_auditores.
 * Cards de "Clientes" e "Auditores" permanecem com contagem global (não filtrados),
 * conforme solicitado.
 */
function useDashboardScope() {
  const { data: auditor, isLoading: loadingAuditor } = useCurrentAuditor();
  const bypass = auditor?.perfil_acesso === "admin" || auditor?.perfil_acesso === "socio";

  const query = useQuery({
    queryKey: ["dashboard-scope", auditor?.id, bypass],
    enabled: !!auditor && !bypass,
    queryFn: async () => {
      const { data } = await supabase
        .from("trabalho_auditores")
        .select("trabalho_auditoria_id")
        .eq("auditor_id", auditor!.id)
        .eq("ativo", true);
      return (data ?? []).map((r: any) => r.trabalho_auditoria_id as string);
    },
  });

  return {
    loading: loadingAuditor || (!bypass && query.isLoading),
    bypass,
    auditorId: auditor?.id ?? null,
    accessibleTrabalhoIds: bypass ? null : (query.data ?? []),
  };
}

const STATUS_TRABALHO_LABELS: Record<string, string> = {
  planejado: "Planejado",
  iniciado: "Iniciado",
  em_execucao: "Em Execução",
  revisao_1: "Revisão 1",
  revisao_2: "Revisão 2",
  finalizado_para_parecer: "Parecer",
  encerrado: "Encerrado",
};

const STATUS_SOLICITACAO_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  revisada: "Revisada",
  enviada: "Enviada",
  parcialmente_atendida: "Parcial",
  atendida: "Atendida",
  encerrada: "Encerrada",
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210, 60%, 55%)",
  "hsl(150, 50%, 45%)",
];

type Scope = ReturnType<typeof useDashboardScope>;

function useKpis(scope: Scope) {
  return useQuery({
    queryKey: ["dashboard-kpis", scope.bypass, scope.accessibleTrabalhoIds],
    enabled: !scope.loading,
    queryFn: async () => {
      const ids = scope.accessibleTrabalhoIds;
      // Clientes e Auditores sempre globais (não filtrados por vínculo).
      const [clientes, auditoresCount] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("auditores").select("id", { count: "exact", head: true }),
      ]);

      const baseEmpty = {
        totalClientes: clientes.count || 0,
        totalAuditores: auditoresCount.count || 0,
        totalTrabalhos: 0,
        trabalhosAbertos: 0,
        totalSolicitacoes: 0,
        solicitacoesPendentes: 0,
        itensPendentes: 0,
        trabChartData: [] as { name: string; value: number }[],
        solChartData: [] as { name: string; value: number }[],
      };

      let trabQ = supabase.from("trabalhos_auditoria").select("id, status_trabalho");
      let solQ = supabase.from("solicitacoes_documentos").select("id, status_solicitacao");
      if (!scope.bypass) {
        if (!ids || ids.length === 0) return baseEmpty;
        trabQ = trabQ.in("id", ids);
        solQ = solQ.in("trabalho_auditoria_id", ids);
      }
      const [trabalhos, solicitacoes] = await Promise.all([trabQ, solQ]);
      const trabalhosData = trabalhos.data || [];
      const solicitacoesData = solicitacoes.data || [];

      let itensData: { id: string; status_item: string }[] = [];
      const solIds = solicitacoesData.map((s: any) => s.id);
      if (scope.bypass) {
        const { data } = await supabase.from("solicitacao_itens").select("id, status_item");
        itensData = (data as any) || [];
      } else if (solIds.length > 0) {
        const { data } = await supabase
          .from("solicitacao_itens")
          .select("id, status_item")
          .in("solicitacao_id", solIds);
        itensData = (data as any) || [];
      }

      const trabalhosAbertos = trabalhosData.filter(t => t.status_trabalho !== "encerrado").length;
      const solicitacoesPendentes = solicitacoesData.filter(s =>
        !["atendida", "encerrada"].includes(s.status_solicitacao)
      ).length;
      const itensPendentes = itensData.filter(i =>
        !["aceito", "atendido"].includes(i.status_item)
      ).length;

      const trabStatusMap: Record<string, number> = {};
      trabalhosData.forEach(t => {
        trabStatusMap[t.status_trabalho] = (trabStatusMap[t.status_trabalho] || 0) + 1;
      });
      const trabChartData = Object.entries(trabStatusMap).map(([status, count]) => ({
        name: STATUS_TRABALHO_LABELS[status] || status,
        value: count,
      }));

      const solStatusMap: Record<string, number> = {};
      solicitacoesData.forEach(s => {
        solStatusMap[s.status_solicitacao] = (solStatusMap[s.status_solicitacao] || 0) + 1;
      });
      const solChartData = Object.entries(solStatusMap).map(([status, count]) => ({
        name: STATUS_SOLICITACAO_LABELS[status] || status,
        value: count,
      }));

      return {
        totalClientes: clientes.count || 0,
        totalAuditores: auditoresCount.count || 0,
        totalTrabalhos: trabalhosData.length,
        trabalhosAbertos,
        totalSolicitacoes: solicitacoesData.length,
        solicitacoesPendentes,
        itensPendentes,
        trabChartData,
        solChartData,
      };
    },
  });
}

function useRecentTrabalhos(scope: Scope) {
  return useQuery({
    queryKey: ["dashboard-trabalhos-recentes", scope.bypass, scope.accessibleTrabalhoIds],
    enabled: !scope.loading,
    queryFn: async () => {
      const ids = scope.accessibleTrabalhoIds;
      if (!scope.bypass && (!ids || ids.length === 0)) return [];
      let q = supabase
        .from("trabalhos_auditoria")
        .select("id, nome_trabalho, status_trabalho, data_inicio_programada, data_fim_programada, clientes(razao_social), exercicios(ano_exercicio)")
        .neq("status_trabalho", "encerrado")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!scope.bypass && ids) q = q.in("id", ids);
      const { data } = await q;
      return data || [];
    },
  });
}

function useSolicitacoesPendentes(scope: Scope) {
  return useQuery({
    queryKey: ["dashboard-solicitacoes-pendentes", scope.bypass, scope.accessibleTrabalhoIds],
    enabled: !scope.loading,
    queryFn: async () => {
      const ids = scope.accessibleTrabalhoIds;
      if (!scope.bypass && (!ids || ids.length === 0)) return [];
      let q = supabase
        .from("solicitacoes_documentos")
        .select("id, titulo_solicitacao, status_solicitacao, prazo_resposta, clientes(razao_social), trabalhos_auditoria(nome_trabalho)")
        .not("status_solicitacao", "in", '("atendida","encerrada")')
        .order("prazo_resposta", { ascending: true, nullsFirst: false })
        .limit(8);
      if (!scope.bypass && ids) q = q.in("trabalho_auditoria_id", ids);
      const { data } = await q;
      return data || [];
    },
  });
}
}

const statusColors: Record<string, string> = {
  planejado: "bg-muted text-muted-foreground",
  iniciado: "bg-info/15 text-info border-info/30",
  em_execucao: "bg-warning/15 text-warning-foreground border-warning/30",
  revisao_1: "bg-primary/15 text-primary border-primary/30",
  revisao_2: "bg-primary/15 text-primary border-primary/30",
  finalizado_para_parecer: "bg-success/15 text-success border-success/30",
  encerrado: "bg-muted text-muted-foreground",
  rascunho: "bg-muted text-muted-foreground",
  revisada: "bg-info/15 text-info border-info/30",
  enviada: "bg-warning/15 text-warning-foreground border-warning/30",
  parcialmente_atendida: "bg-warning/15 text-warning-foreground border-warning/30",
  atendida: "bg-success/15 text-success border-success/30",
  encerrada: "bg-muted text-muted-foreground",
};

export default function DashboardPage() {
  const { data: kpis, isLoading } = useKpis();
  const { data: trabalhos } = useRecentTrabalhos();
  const { data: solicitacoes } = useSolicitacoesPendentes();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Visão geral da operação de auditoria" />
        <div className="text-sm text-muted-foreground">Carregando indicadores...</div>
      </div>
    );
  }

  const cards = [
    { label: "Clientes", value: kpis?.totalClientes ?? 0, icon: Users, color: "text-primary" },
    { label: "Auditores", value: kpis?.totalAuditores ?? 0, icon: UserCheck, color: "text-info" },
    { label: "Trabalhos", value: kpis?.totalTrabalhos ?? 0, icon: Briefcase, color: "text-chart-3" },
    { label: "Trabalhos Abertos", value: kpis?.trabalhosAbertos ?? 0, icon: Clock, color: "text-warning-foreground" },
    { label: "Solicitações", value: kpis?.totalSolicitacoes ?? 0, icon: FileText, color: "text-chart-5" },
    { label: "Itens Pendentes", value: kpis?.itensPendentes ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral da operação de auditoria" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <c.icon size={22} className={c.color} />
              <span className="text-2xl font-bold">{c.value}</span>
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trabalhos by status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trabalhos por Status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {(kpis?.trabChartData?.length ?? 0) === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis!.trabChartData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Qtd" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Solicitações by status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Solicitações por Status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {(kpis?.solChartData?.length ?? 0) === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kpis!.solChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {kpis!.solChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trabalhos recentes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trabalhos em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            {!trabalhos?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum trabalho em aberto.</p>
            ) : (
              <div className="space-y-2">
                {trabalhos.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.nome_trabalho}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(t as any).clientes?.razao_social} — {(t as any).exercicios?.ano_exercicio}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {t.data_fim_programada && (
                        <span className="text-[10px] text-muted-foreground">até {format(new Date(t.data_fim_programada), "dd/MM/yy")}</span>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${statusColors[t.status_trabalho] || ""}`}>
                        {STATUS_TRABALHO_LABELS[t.status_trabalho] || t.status_trabalho}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Solicitações pendentes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Solicitações com Pendências</CardTitle>
          </CardHeader>
          <CardContent>
            {!solicitacoes?.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
            ) : (
              <div className="space-y-2">
                {solicitacoes.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.titulo_solicitacao}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.clientes?.razao_social} — {s.trabalhos_auditoria?.nome_trabalho}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {s.prazo_resposta && (
                        <span className="text-[10px] text-muted-foreground">{format(new Date(s.prazo_resposta), "dd/MM/yy")}</span>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${statusColors[s.status_solicitacao] || ""}`}>
                        {STATUS_SOLICITACAO_LABELS[s.status_solicitacao] || s.status_solicitacao}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
