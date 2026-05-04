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
  Filter,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const fmtBRL = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtInt = (v: number) => (Number(v) || 0).toLocaleString("pt-BR");
const fmtPct = (v: number) => `${(Number(v) || 0).toFixed(1)}%`;

const ALL = "__all__";

// Cores semânticas via HSL tokens (compatível light/dark)
const COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
  accent: "hsl(var(--accent-foreground))",
};

// ============================================================
// Helpers de classificação (idêntico à contagem de estoque)
// ============================================================
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
  qtdSobra: number;
  valorSobra: number;
  qtdFalta: number;
  valorFalta: number;
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

function fmtDateBR(d: any): string {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

function buildProcedimentoLabel(p: any): string {
  const titulo = (p?.titulo || "").trim();
  const dataRef = fmtDateBR(p?.data_base_referencia) || fmtDateBR(p?.data_procedimento);
  const status = (p?.status_procedimento || "").trim();
  const parts: string[] = [];
  if (titulo) parts.push(titulo);
  else parts.push(dataRef ? `Procedimento de Estoque - ${dataRef}` : "Procedimento de Estoque - sem data");
  if (titulo && dataRef) parts.push(dataRef);
  if (status) parts.push(status.replace(/_/g, " "));
  return parts.join(" - ");
}

// ============================================================
// Página
// ============================================================
export default function DashboardEstoquesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlClienteId = searchParams.get("cliente_id") || "";
  const urlTrabalhoId = searchParams.get("trabalho_id") || "";
  const urlProcedimentoId = searchParams.get("procedimento_id") || "";

  const [clienteId, setClienteId] = useState<string>(urlClienteId);
  const [trabalhoId, setTrabalhoId] = useState<string>(urlTrabalhoId);
  const [procedimentoId, setProcedimentoId] = useState<string>(urlProcedimentoId);
  const [warnInvalid, setWarnInvalid] = useState<string | null>(null);

  const [filtroFilial, setFiltroFilial] = useState<string>(ALL);
  const [filtroSetor, setFiltroSetor] = useState<string>(ALL);
  const [filtroTipo, setFiltroTipo] = useState<string>(ALL);
  const [filtroStatus, setFiltroStatus] = useState<string>(ALL);

  // Sincroniza estado <-> URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (clienteId) params.set("cliente_id", clienteId);
    if (trabalhoId) params.set("trabalho_id", trabalhoId);
    if (procedimentoId) params.set("procedimento_id", procedimentoId);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, trabalhoId, procedimentoId]);

  // -------- Filtros (queries) --------
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

  const { data: trabalhos = [], isLoading: loadingTrabalhos } = useQuery({
    queryKey: ["dash-est-trabalhos", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trabalhos_auditoria")
        .select("id, nome_trabalho, status_trabalho, data_inicio_programada, exercicio_id, exercicios(ano_exercicio)")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const {
    data: procedimentos = [],
    isLoading: loadingProcedimentos,
  } = useQuery({
    queryKey: ["dash-est-procs", trabalhoId],
    enabled: !!trabalhoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimentos_auxiliares")
        .select(
          "id, titulo, descricao, tipo_procedimento, data_procedimento, data_base_referencia, status_procedimento, trabalho_auditoria_id"
        )
        .eq("trabalho_auditoria_id", trabalhoId)
        .eq("tipo_procedimento", "contagem_estoque")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Validação: cliente da URL existe?
  useEffect(() => {
    if (!urlClienteId || clientes.length === 0) return;
    if (!clientes.find((c: any) => c.id === urlClienteId)) {
      setClienteId("");
      setTrabalhoId("");
      setProcedimentoId("");
      setWarnInvalid("Cliente da URL não encontrado.");
    }
  }, [clientes, urlClienteId]);

  // Validação: trabalho pertence ao cliente?
  useEffect(() => {
    if (!trabalhoId || trabalhos.length === 0) return;
    if (!trabalhos.find((t: any) => t.id === trabalhoId)) {
      setTrabalhoId("");
      setProcedimentoId("");
      setWarnInvalid("Trabalho da URL não pertence ao cliente.");
    }
  }, [trabalhos, trabalhoId]);

  // Validação: procedimento pertence ao trabalho?
  // Auto-seleção: se houver apenas 1 procedimento e não tiver selecionado.
  useEffect(() => {
    if (!trabalhoId) return;
    if (loadingProcedimentos) return;
    if (procedimentoId) {
      if (procedimentos.length > 0 && !procedimentos.find((p: any) => p.id === procedimentoId)) {
        setProcedimentoId("");
        setWarnInvalid("Procedimento da URL não pertence ao trabalho.");
      }
      return;
    }
    if (procedimentos.length === 1) {
      setProcedimentoId(procedimentos[0].id);
    }
  }, [procedimentos, loadingProcedimentos, trabalhoId, procedimentoId]);

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
          "id, contagem_estoque_bloco_id, codigo_item, descricao_item, unidade_medida, status_divergencia, quantidade_sistema, quantidade_contada, valor_unitario, contado, origem_item, diferenca_valor"
        )
        .in("contagem_estoque_bloco_id", blocoIds);
      if (error) throw error;
      return data || [];
    },
  });

  // Mapa bloco -> meta (filial/setor/tipo)
  const blocoMeta = useMemo(() => {
    const m = new Map<string, any>();
    for (const b of blocos as any[]) m.set(b.id, b);
    return m;
  }, [blocos]);

  // ===== Resumo por bloco (todos blocos do procedimento) =====
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

  // ===== KPIs principais (procedimento inteiro – sem filtros secundários) =====
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

  // ===== Opções dos filtros secundários =====
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

  const filtrosAtivos =
    filtroFilial !== ALL || filtroSetor !== ALL || filtroTipo !== ALL || filtroStatus !== ALL;

  const blocosFiltrados = useMemo(() => {
    return resumoPorBloco.filter((b) => {
      if (filtroFilial !== ALL && b.filial !== filtroFilial) return false;
      if (filtroSetor !== ALL && b.setor !== filtroSetor) return false;
      if (filtroTipo !== ALL && b.tipo_estoque !== filtroTipo) return false;
      if (filtroStatus !== ALL && b.status !== filtroStatus) return false;
      return true;
    });
  }, [resumoPorBloco, filtroFilial, filtroSetor, filtroTipo, filtroStatus]);

  // Itens dos blocos filtrados (para gráficos e tabela top10)
  const itensFiltrados = useMemo(() => {
    if (!filtrosAtivos) return itens;
    const ids = new Set(blocosFiltrados.map((b) => b.id));
    return itens.filter((i: any) => ids.has(i.contagem_estoque_bloco_id));
  }, [itens, blocosFiltrados, filtrosAtivos]);

  // ===== Dados dos gráficos =====
  // 1) Execução: contados x não contados
  const dataExecucao = useMemo(() => {
    let contados = 0;
    let nao = 0;
    for (const i of itensFiltrados) {
      if (isNaoContado(i)) nao += 1;
      else contados += 1;
    }
    return [
      { name: "Contados", value: contados, color: COLORS.success },
      { name: "Não contados", value: nao, color: COLORS.muted },
    ];
  }, [itensFiltrados]);

  // 2) Status dos itens
  const dataStatus = useMemo(() => {
    let nao = 0,
      sem = 0,
      sobra = 0,
      falta = 0;
    for (const i of itensFiltrados) {
      if (isNaoContado(i)) {
        nao += 1;
        continue;
      }
      const s = i.status_divergencia;
      if (s === "sobra") sobra += 1;
      else if (s === "falta") falta += 1;
      else sem += 1;
    }
    return [
      { name: "Não contado", value: nao, color: COLORS.muted },
      { name: "Sem diferença", value: sem, color: COLORS.success },
      { name: "Sobra", value: sobra, color: COLORS.primary },
      { name: "Falta", value: falta, color: COLORS.destructive },
    ];
  }, [itensFiltrados]);

  // 3) Divergências por filial
  const dataDivFilial = useMemo(() => {
    const map = new Map<string, { divergencias: number; difAbs: number; difLiq: number }>();
    for (const i of itensFiltrados) {
      if (isNaoContado(i)) continue;
      if (!isDivergente(i)) continue;
      const meta = blocoMeta.get(i.contagem_estoque_bloco_id);
      const filial = (meta?.filial || "Sem filial") as string;
      const cur = map.get(filial) || { divergencias: 0, difAbs: 0, difLiq: 0 };
      const dv = Number(i.diferenca_valor) || 0;
      cur.divergencias += 1;
      cur.difAbs += Math.abs(dv);
      cur.difLiq += dv;
      map.set(filial, cur);
    }
    return Array.from(map.entries())
      .map(([filial, v]) => ({ filial, ...v }))
      .sort((a, b) => b.divergencias - a.divergencias)
      .slice(0, 12);
  }, [itensFiltrados, blocoMeta]);

  // 4) Divergências por tipo de estoque
  const dataDivTipo = useMemo(() => {
    const map = new Map<string, { divergencias: number; difAbs: number }>();
    for (const i of itensFiltrados) {
      if (isNaoContado(i)) continue;
      if (!isDivergente(i)) continue;
      const meta = blocoMeta.get(i.contagem_estoque_bloco_id);
      const tipo = (meta?.tipo_estoque || "Sem tipo") as string;
      const cur = map.get(tipo) || { divergencias: 0, difAbs: 0 };
      cur.divergencias += 1;
      cur.difAbs += Math.abs(Number(i.diferenca_valor) || 0);
      map.set(tipo, cur);
    }
    return Array.from(map.entries())
      .map(([tipo, v]) => ({ tipo, ...v }))
      .sort((a, b) => b.divergencias - a.divergencias)
      .slice(0, 12);
  }, [itensFiltrados, blocoMeta]);

  // 5) Diferença financeira por bloco (top 10 por absoluta)
  const dataDifBloco = useMemo(() => {
    return [...blocosFiltrados]
      .sort((a, b) => b.difAbsoluta - a.difAbsoluta)
      .slice(0, 10)
      .map((b) => ({
        bloco: `${b.filial} / ${b.setor} / ${b.tipo_estoque}`.slice(0, 60),
        difLiq: b.difLiquida,
        difAbs: b.difAbsoluta,
      }));
  }, [blocosFiltrados]);

  // 6) Top 10 maiores divergências (itens)
  const top10Itens = useMemo(() => {
    return [...itensFiltrados]
      .filter((i: any) => !isNaoContado(i))
      .map((i: any) => {
        const meta = blocoMeta.get(i.contagem_estoque_bloco_id) || {};
        return {
          id: i.id,
          codigo: i.codigo_item || "—",
          descricao: i.descricao_item || "—",
          filial: meta.filial || "—",
          setor: meta.setor || "—",
          tipo: meta.tipo_estoque || "—",
          status: i.status_divergencia || "—",
          diff: Number(i.diferenca_valor) || 0,
          diffAbs: Math.abs(Number(i.diferenca_valor) || 0),
        };
      })
      .sort((a, b) => b.diffAbs - a.diffAbs)
      .slice(0, 10);
  }, [itensFiltrados, blocoMeta]);

  const isLoadingDash = loadingBlocos || loadingItens;
  const dashError = errorBlocos || errorItens;

  const procedimentoSelecionado = procedimentos.find((p: any) => p.id === procedimentoId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Estoques"
        description="Análise consolidada das contagens de estoque por cliente, trabalho, filial, setor e tipo de estoque."
      />

      {warnInvalid && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground flex items-center gap-2">
          <AlertTriangle size={14} /> {warnInvalid}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 text-xs"
            onClick={() => setWarnInvalid(null)}
          >
            OK
          </Button>
        </div>
      )}

      {/* Filtros principais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter size={14} /> Filtros principais
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Cliente */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <Select
              value={clienteId}
              onValueChange={(v) => {
                setClienteId(v);
                setTrabalhoId("");
                setProcedimentoId("");
                setWarnInvalid(null);
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

          {/* Trabalho */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Trabalho de Auditoria</Label>
            <Select
              value={trabalhoId}
              onValueChange={(v) => {
                setTrabalhoId(v);
                setProcedimentoId("");
                setWarnInvalid(null);
              }}
              disabled={!clienteId || loadingTrabalhos}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !clienteId
                      ? "Selecione um cliente primeiro"
                      : loadingTrabalhos
                      ? "Carregando trabalhos..."
                      : trabalhos.length === 0
                      ? "Nenhum trabalho para este cliente"
                      : "Selecione um trabalho"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {trabalhos.map((t: any) => {
                  const ano = t?.exercicios?.ano_exercicio;
                  const status = t.status_trabalho ? ` · ${t.status_trabalho}` : "";
                  const label = `${t.nome_trabalho}${ano ? ` (${ano})` : ""}${status}`;
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Procedimento */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Procedimento de Contagem</Label>
            <Select
              value={procedimentoId}
              onValueChange={setProcedimentoId}
              disabled={!trabalhoId || loadingProcedimentos}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !trabalhoId
                      ? "Selecione um trabalho primeiro"
                      : loadingProcedimentos
                      ? "Carregando procedimentos..."
                      : procedimentos.length === 0
                      ? "Nenhum procedimento de contagem encontrado"
                      : "Selecione um procedimento"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {procedimentos.length === 0 && trabalhoId && !loadingProcedimentos && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhum procedimento de contagem de estoque para este trabalho.
                  </div>
                )}
                {procedimentos.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {buildProcedimentoLabel(p)}
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
          {/* Banner do procedimento */}
          {procedimentoSelecionado && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-3 px-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-primary" />
                  <span className="font-medium text-foreground">
                    {procedimentoSelecionado.titulo || "Procedimento de Estoque"}
                  </span>
                </div>
                {procedimentoSelecionado.data_base_referencia && (
                  <span className="text-muted-foreground">
                    Data base: <span className="text-foreground">{fmtDateBR(procedimentoSelecionado.data_base_referencia)}</span>
                  </span>
                )}
                {procedimentoSelecionado.status_procedimento && (
                  <span className="text-muted-foreground">
                    Status: <span className="text-foreground">{procedimentoSelecionado.status_procedimento}</span>
                  </span>
                )}
                <span className="text-muted-foreground">
                  Blocos: <span className="text-foreground">{blocos.length}</span>
                </span>
                <span className="text-muted-foreground">
                  Itens: <span className="text-foreground">{fmtInt(itens.length)}</span>
                </span>
              </CardContent>
            </Card>
          )}

          {/* KPIs (procedimento inteiro) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Itens importados" value={fmtInt(kpis.totalImportados)} icon={Boxes} loading={isLoadingDash} />
            <KpiCard label="Itens contados" value={fmtInt(kpis.totalContados)} icon={PackageCheck} tone="positive" loading={isLoadingDash} />
            <KpiCard label="Não contados" value={fmtInt(kpis.naoContados)} icon={PackageX} tone={kpis.naoContados > 0 ? "warning" : "neutral"} loading={isLoadingDash} />
            <KpiCard label="% execução" value={fmtPct(kpis.pctExecucao)} icon={Percent} tone={kpis.pctExecucao >= 100 ? "positive" : "neutral"} loading={isLoadingDash} />
            <KpiCard label="Com divergência" value={fmtInt(kpis.totalDiv)} icon={AlertTriangle} tone={kpis.totalDiv > 0 ? "negative" : "neutral"} loading={isLoadingDash} />
            <KpiCard
              label="Dif. financeira líquida"
              value={fmtBRL(kpis.difLiquida)}
              icon={DollarSign}
              tone={kpis.difLiquida === 0 ? "neutral" : kpis.difLiquida > 0 ? "positive" : "negative"}
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
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter size={12} /> Filtros por bloco
                </CardTitle>
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
              {filtrosAtivos && (
                <div className="px-6 pb-3 -mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info size={11} />
                  Gráficos e tabela considerando filtros aplicados. KPIs principais representam o procedimento completo.
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 ml-2 text-[11px]"
                    onClick={() => {
                      setFiltroFilial(ALL);
                      setFiltroSetor(ALL);
                      setFiltroTipo(ALL);
                      setFiltroStatus(ALL);
                    }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Execução da contagem">
              {dataExecucao.every((d) => d.value === 0) ? (
                <ChartEmpty message="Nenhum item encontrado" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dataExecucao}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {dataExecucao.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v: any) => fmtInt(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Status dos itens">
              {dataStatus.every((d) => d.value === 0) ? (
                <ChartEmpty message="Nenhum item encontrado" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dataStatus.filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {dataStatus
                        .filter((d) => d.value > 0)
                        .map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                    </Pie>
                    <RTooltip formatter={(v: any) => fmtInt(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Divergências por filial">
              {dataDivFilial.length === 0 ? (
                <ChartEmpty message="Nenhuma divergência encontrada" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dataDivFilial} margin={{ top: 5, right: 12, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="filial" angle={-25} textAnchor="end" height={50} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <RTooltip
                      formatter={(v: any, name: string) =>
                        name === "Diferença abs." ? fmtBRL(Number(v)) : fmtInt(Number(v))
                      }
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="divergencias" name="Itens divergentes" fill={COLORS.destructive} />
                    <Bar dataKey="difAbs" name="Diferença abs." fill={COLORS.warning} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Divergências por tipo de estoque">
              {dataDivTipo.length === 0 ? (
                <ChartEmpty message="Nenhuma divergência encontrada" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dataDivTipo} margin={{ top: 5, right: 12, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="tipo" angle={-25} textAnchor="end" height={50} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <RTooltip
                      formatter={(v: any, name: string) =>
                        name === "Diferença abs." ? fmtBRL(Number(v)) : fmtInt(Number(v))
                      }
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="divergencias" name="Itens divergentes" fill={COLORS.primary} />
                    <Bar dataKey="difAbs" name="Diferença abs." fill={COLORS.warning} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Diferença financeira por bloco (top 10)" full>
              {dataDifBloco.length === 0 ? (
                <ChartEmpty message="Nenhum dado financeiro disponível" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, dataDifBloco.length * 32 + 40)}>
                  <BarChart data={dataDifBloco} layout="vertical" margin={{ top: 5, right: 16, left: 16, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fmtBRL(Number(v))} />
                    <YAxis type="category" dataKey="bloco" width={220} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <RTooltip
                      formatter={(v: any) => fmtBRL(Number(v))}
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="difLiq" name="Diferença líquida" fill={COLORS.primary} />
                    <Bar dataKey="difAbs" name="Diferença absoluta" fill={COLORS.warning} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Top 10 maiores divergências */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top 10 maiores divergências</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top10Itens.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-sm">
                          Nenhuma divergência encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                    {top10Itens.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-mono text-xs">{it.codigo}</TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate">{it.descricao}</TableCell>
                        <TableCell className="text-sm">{it.filial}</TableCell>
                        <TableCell className="text-sm">{it.setor}</TableCell>
                        <TableCell className="text-sm">{it.tipo}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px]">
                            {it.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${diffColor(it.diff)}`}>
                          {fmtBRL(it.diff)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

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
                            <TableCell className="text-right font-mono text-sm">{fmtInt(b.importados)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-success">{fmtInt(b.contados)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {b.naoContados > 0 ? (
                                <span className="text-warning-foreground">{fmtInt(b.naoContados)}</span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtPct(b.pctExecucao)}</TableCell>
                            <TableCell className="text-right">
                              {b.divergencias > 0 ? (
                                <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/30">
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

// ============================================================
// Componentes auxiliares
// ============================================================
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

function ChartCard({
  title,
  children,
  full,
}: {
  title: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <Card className={full ? "lg:col-span-2" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
      {message}
    </div>
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
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold text-foreground leading-none">{loading ? "…" : value}</p>
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
