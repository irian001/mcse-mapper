import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Boxes,
  PackageCheck,
  PackageX,
  AlertTriangle,
  DollarSign,
  Percent,
  Scale,
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const fmtBRL = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtInt = (v: number) => (Number(v) || 0).toLocaleString("pt-BR");
const fmtPct = (v: number) => `${(Number(v) || 0).toFixed(1)}%`;

const ALL = "__all__";

// =============================================================
// Lógica de classificação de itens (idêntica à da contagem)
// =============================================================
function isNaoContado(item: any): boolean {
  if (item?.status_divergencia === "nao_contado") return true;
  if (item?.contado === false) return true;
  const qtdCnt = item?.quantidade_contada;
  const semContagem = qtdCnt === null || qtdCnt === undefined;
  if (semContagem && item?.origem_item === "importado") return true;
  return false;
}

function isDivergente(item: any): boolean {
  return item?.status_divergencia === "sobra" || item?.status_divergencia === "falta";
}

interface BlocoResumo {
  id: string;
  filial: string;
  setor: string;
  tipo_estoque: string;
  categoria_estoque: string;
  descricao_bloco: string;
  importados: number;
  contados: number;
  naoContados: number;
  pctExecucao: number;
  divergencias: number;
  difLiquida: number;
  difAbsoluta: number;
  status: BlocoStatus;
}

type BlocoStatus =
  | "nao_iniciado"
  | "em_andamento"
  | "concluido_sem_div"
  | "concluido_com_div"
  | "parcial_com_div";

const STATUS_LABEL: Record<BlocoStatus, { label: string; cls: string }> = {
  nao_iniciado: { label: "Não iniciado", cls: "bg-muted/40 text-muted-foreground border-border" },
  em_andamento: { label: "Em andamento", cls: "bg-primary/15 text-primary border-primary/30" },
  concluido_sem_div: {
    label: "Concluído",
    cls: "bg-success/15 text-success border-success/30",
  },
  concluido_com_div: {
    label: "Concluído c/ divergência",
    cls: "bg-warning/15 text-warning-foreground border-warning/30",
  },
  parcial_com_div: {
    label: "Parcial c/ divergência",
    cls: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

function calcStatus(b: { importados: number; contados: number; divergencias: number }): BlocoStatus {
  if (b.contados === 0) return "nao_iniciado";
  if (b.contados < b.importados) {
    return b.divergencias > 0 ? "parcial_com_div" : "em_andamento";
  }
  return b.divergencias > 0 ? "concluido_com_div" : "concluido_sem_div";
}

// =============================================================
// Página
// =============================================================
export default function DashboardEstoquesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlClienteId = searchParams.get("cliente_id") || "";
  const urlTrabalhoId = searchParams.get("trabalho_id") || "";
  const urlProcedimentoId = searchParams.get("procedimento_id") || "";

  const [clienteId, setClienteId] = useState<string>(urlClienteId);
  const [trabalhoId, setTrabalhoId] = useState<string>(urlTrabalhoId);
  const [procedimentoId, setProcedimentoId] = useState<string>(urlProcedimentoId);

  // Filtros secundários (em memória)
  const [filtroFilial, setFiltroFilial] = useState<string>(ALL);
  const [filtroSetor, setFiltroSetor] = useState<string>(ALL);
  const [filtroTipo, setFiltroTipo] = useState<string>(ALL);
  const [filtroStatus, setFiltroStatus] = useState<string>(ALL);

  // Sincroniza estado com URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (clienteId) params.set("cliente_id", clienteId);
    if (trabalhoId) params.set("trabalho_id", trabalhoId);
    if (procedimentoId) params.set("procedimento_id", procedimentoId);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, trabalhoId, procedimentoId]);

  // -------- Queries de filtros --------
  const { data: clientes = [] } = useQuery({
    queryKey: ["dash-est-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, razao_social, nome_fantasia")
        .eq("status", "ativo")
        .order("razao_social");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: trabalhos = [] } = useQuery({
    queryKey: ["dash-est-trabalhos", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabalhos_auditoria")
        .select("id, nome_trabalho, status_trabalho")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: procedimentos = [] } = useQuery({
    queryKey: ["dash-est-procs", trabalhoId],
    enabled: !!trabalhoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimentos_auxiliares")
        .select("id, titulo, descricao, tipo_procedimento, cliente_id, trabalho_id")
        .eq("trabalho_id", trabalhoId)
        .eq("tipo_procedimento", "contagem_estoque")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // -------- Dados do dashboard --------
  const {
    data: blocos = [],
    isLoading: loadingBlocos,
    error: errorBlocos,
    refetch: refetchBlocos,
  } = useQuery({
    queryKey: ["dash-est-blocos", procedimentoId],
    enabled: !!procedimentoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimento_contagem_estoque_blocos")
        .select("*")
        .eq("procedimento_auxiliar_id", procedimentoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const blocoIds = useMemo(() => blocos.map((b: any) => b.id), [blocos]);

  const {
    data: itens = [],
    isLoading: loadingItens,
    error: errorItens,
    refetch: refetchItens,
  } = useQuery({
    queryKey: ["dash-est-itens", blocoIds.join(",")],
    enabled: blocoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimento_contagem_estoque_itens")
        .select(
          "id, contagem_estoque_bloco_id, status_divergencia, quantidade_contada, contado, origem_item, diferenca_valor"
        )
        .in("contagem_estoque_bloco_id", blocoIds);
      if (error) throw error;
      return data || [];
    },
  });

  // -------- Resumo por bloco --------
  const resumoPorBloco = useMemo<BlocoResumo[]>(() => {
    return blocos.map((b: any) => {
      const itensDoBloco = itens.filter((i: any) => i.contagem_estoque_bloco_id === b.id);
      const importados = itensDoBloco.length;
      let contados = 0;
      let divergencias = 0;
      let difLiquida = 0;
      let difAbsoluta = 0;
      for (const it of itensDoBloco) {
        if (isNaoContado(it)) continue;
        contados += 1;
        if (isDivergente(it)) divergencias += 1;
        const dv = Number(it.diferenca_valor) || 0;
        difLiquida += dv;
        difAbsoluta += Math.abs(dv);
      }
      const naoContados = importados - contados;
      const pctExecucao = importados > 0 ? (contados / importados) * 100 : 0;
      return {
        id: b.id,
        filial: b.filial || "—",
        setor: b.setor || "—",
        tipo_estoque: b.tipo_estoque || "—",
        categoria_estoque: b.categoria_estoque || "—",
        descricao_bloco: b.descricao_bloco || "",
        importados,
        contados,
        naoContados,
        pctExecucao,
        divergencias,
        difLiquida,
        difAbsoluta,
        status: calcStatus({ importados, contados, divergencias }),
      };
    });
  }, [blocos, itens]);

  // KPIs gerais (sobre todos os blocos do procedimento)
  const kpis = useMemo(() => {
    const totalImportados = itens.length;
    let totalContados = 0;
    let totalDiv = 0;
    let difLiquida = 0;
    let difAbsoluta = 0;
    for (const it of itens) {
      if (isNaoContado(it)) continue;
      totalContados += 1;
      if (isDivergente(it)) totalDiv += 1;
      const dv = Number(it.diferenca_valor) || 0;
      difLiquida += dv;
      difAbsoluta += Math.abs(dv);
    }
    const naoContados = totalImportados - totalContados;
    const pctExecucao = totalImportados > 0 ? (totalContados / totalImportados) * 100 : 0;
    return { totalImportados, totalContados, naoContados, pctExecucao, totalDiv, difLiquida, difAbsoluta };
  }, [itens]);

  // Opções dos filtros secundários (in-memory)
  const opcoesFilial = useMemo(
    () => Array.from(new Set(resumoPorBloco.map((b) => b.filial).filter((v) => v && v !== "—"))).sort(),
    [resumoPorBloco]
  );
  const opcoesSetor = useMemo(
    () => Array.from(new Set(resumoPorBloco.map((b) => b.setor).filter((v) => v && v !== "—"))).sort(),
    [resumoPorBloco]
  );
  const opcoesTipo = useMemo(
    () => Array.from(new Set(resumoPorBloco.map((b) => b.tipo_estoque).filter((v) => v && v !== "—"))).sort(),
    [resumoPorBloco]
  );

  const blocosFiltrados = useMemo(() => {
    return resumoPorBloco.filter((b) => {
      if (filtroFilial !== ALL && b.filial !== filtroFilial) return false;
      if (filtroSetor !== ALL && b.setor !== filtroSetor) return false;
      if (filtroTipo !== ALL && b.tipo_estoque !== filtroTipo) return false;
      if (filtroStatus !== ALL && b.status !== filtroStatus) return false;
      return true;
    });
  }, [resumoPorBloco, filtroFilial, filtroSetor, filtroTipo, filtroStatus]);

  const isLoadingDash = loadingBlocos || loadingItens;
  const dashError = errorBlocos || errorItens;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Estoques"
        description="Análise consolidada das contagens de estoque por cliente, trabalho, filial, setor e tipo de estoque."
      />

      {/* Filtros principais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <Select
              value={clienteId}
              onValueChange={(v) => {
                setClienteId(v);
                setTrabalhoId("");
                setProcedimentoId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_fantasia || c.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Trabalho de Auditoria</Label>
            <Select
              value={trabalhoId}
              onValueChange={(v) => {
                setTrabalhoId(v);
                setProcedimentoId("");
              }}
              disabled={!clienteId}
            >
              <SelectTrigger>
                <SelectValue placeholder={clienteId ? "Selecione um trabalho" : "Selecione um cliente"} />
              </SelectTrigger>
              <SelectContent>
                {trabalhos.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome_trabalho}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Procedimento de Contagem</Label>
            <Select
              value={procedimentoId}
              onValueChange={setProcedimentoId}
              disabled={!trabalhoId}
            >
              <SelectTrigger>
                <SelectValue placeholder={trabalhoId ? "Selecione um procedimento" : "Selecione um trabalho"} />
              </SelectTrigger>
              <SelectContent>
                {procedimentos.length === 0 && trabalhoId && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhum procedimento de contagem de estoque neste trabalho.
                  </div>
                )}
                {procedimentos.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.titulo || p.descricao || p.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estados / mensagens */}
      {!clienteId && <EmptyState message="Selecione um cliente para iniciar." />}
      {clienteId && !trabalhoId && <EmptyState message="Selecione um trabalho de auditoria." />}
      {trabalhoId && !procedimentoId && (
        <EmptyState message="Selecione um procedimento de contagem de estoque." />
      )}

      {procedimentoId && dashError && (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="mx-auto text-destructive" size={28} />
            <p className="text-sm text-foreground">Erro ao carregar dados do dashboard.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchBlocos();
                refetchItens();
              }}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {procedimentoId && !dashError && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Itens importados"
              value={fmtInt(kpis.totalImportados)}
              icon={Boxes}
              loading={isLoadingDash}
            />
            <KpiCard
              label="Itens contados"
              value={fmtInt(kpis.totalContados)}
              icon={PackageCheck}
              tone="positive"
              loading={isLoadingDash}
            />
            <KpiCard
              label="Não contados"
              value={fmtInt(kpis.naoContados)}
              icon={PackageX}
              tone={kpis.naoContados > 0 ? "warning" : "neutral"}
              loading={isLoadingDash}
            />
            <KpiCard
              label="% execução"
              value={fmtPct(kpis.pctExecucao)}
              icon={Percent}
              tone={kpis.pctExecucao >= 100 ? "positive" : "neutral"}
              loading={isLoadingDash}
            />
            <KpiCard
              label="Com divergência"
              value={fmtInt(kpis.totalDiv)}
              icon={AlertTriangle}
              tone={kpis.totalDiv > 0 ? "negative" : "neutral"}
              loading={isLoadingDash}
            />
            <KpiCard
              label="Dif. financeira líquida"
              value={fmtBRL(kpis.difLiquida)}
              icon={DollarSign}
              tone={
                kpis.difLiquida === 0 ? "neutral" : kpis.difLiquida > 0 ? "positive" : "negative"
              }
              loading={isLoadingDash}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KpiCard
              label="Dif. financeira absoluta"
              value={fmtBRL(kpis.difAbsoluta)}
              icon={Scale}
              hint="Soma de |diferença| dos itens contados"
              loading={isLoadingDash}
            />
          </div>

          {/* Filtros secundários */}
          {resumoPorBloco.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Filtros por bloco</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SecFilter label="Filial" value={filtroFilial} onChange={setFiltroFilial} options={opcoesFilial} />
                <SecFilter label="Setor" value={filtroSetor} onChange={setFiltroSetor} options={opcoesSetor} />
                <SecFilter label="Tipo de estoque" value={filtroTipo} onChange={setFiltroTipo} options={opcoesTipo} />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status do bloco</Label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos</SelectItem>
                      {(Object.keys(STATUS_LABEL) as BlocoStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela por bloco */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumo por bloco</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Importados</TableHead>
                      <TableHead className="text-right">Contados</TableHead>
                      <TableHead className="text-right">Não contados</TableHead>
                      <TableHead className="text-right">% exec.</TableHead>
                      <TableHead className="text-right">Divergências</TableHead>
                      <TableHead className="text-right">Dif. líquida</TableHead>
                      <TableHead className="text-right">Dif. absoluta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDash && (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center text-muted-foreground py-6">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoadingDash && blocosFiltrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                          {resumoPorBloco.length === 0
                            ? "Nenhum bloco de contagem encontrado para este procedimento."
                            : "Nenhum bloco corresponde aos filtros aplicados."}
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoadingDash &&
                      blocosFiltrados.map((b) => {
                        const st = STATUS_LABEL[b.status];
                        return (
                          <TableRow key={b.id}>
                            <TableCell>
                              <Badge variant="outline" className={st.cls}>
                                {st.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{b.filial}</TableCell>
                            <TableCell className="text-sm">{b.setor}</TableCell>
                            <TableCell className="text-sm">{b.tipo_estoque}</TableCell>
                            <TableCell className="text-sm">{b.categoria_estoque}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {b.descricao_bloco || "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {fmtInt(b.importados)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-success">
                              {fmtInt(b.contados)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {b.naoContados > 0 ? (
                                <span className="text-warning-foreground">{fmtInt(b.naoContados)}</span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {fmtPct(b.pctExecucao)}
                            </TableCell>
                            <TableCell className="text-right">
                              {b.divergencias > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-warning/15 text-warning-foreground border-warning/30"
                                >
                                  {b.divergencias}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className={`text-right font-mono text-sm ${diffColor(b.difLiquida)}`}>
                              {fmtBRL(b.difLiquida)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-foreground">
                              {fmtBRL(b.difAbsoluta)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// =============================================================
// Componentes auxiliares
// =============================================================
function diffColor(v: number): string {
  if (v > 0) return "text-success";
  if (v < 0) return "text-destructive";
  return "text-muted-foreground";
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
        <Info size={22} className="opacity-60" />
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "neutral",
  loading,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "neutral" | "positive" | "warning" | "negative";
  loading?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "warning"
      ? "text-warning-foreground"
      : tone === "negative"
      ? "text-destructive"
      : "text-primary";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-foreground leading-none">
            {loading ? "…" : value}
          </p>
          {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
        </div>
        <div className={`shrink-0 ${toneClass}`}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}

function SecFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
