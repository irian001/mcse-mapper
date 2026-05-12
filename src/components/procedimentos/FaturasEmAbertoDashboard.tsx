import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RotateCcw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--warning, 38 92% 50%))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(217 91% 60%)",
  "hsl(142 71% 45%)",
  "hsl(280 65% 60%)",
  "hsl(24 95% 53%)",
  "hsl(190 80% 50%)",
];

function ChartTooltip({ active, payload, totalGeral }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded border bg-background p-2 text-xs shadow-md space-y-0.5 min-w-[180px]">
      <div className="font-semibold">{p.label}</div>
      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Valor</span><span className="tabular-nums">{(Number(p.valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Faturas</span><span className="tabular-nums">{(Number(p.qtd) || 0).toLocaleString("pt-BR")}</span></div>
      <div className="flex justify-between gap-4"><span className="text-muted-foreground">UCs</span><span className="tabular-nums">{(Number(p.qtdUcs) || 0).toLocaleString("pt-BR")}</span></div>
      {totalGeral > 0 && (
        <div className="flex justify-between gap-4"><span className="text-muted-foreground">% do total</span><span className="tabular-nums">{((p.valor / totalGeral) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%</span></div>
      )}
    </div>
  );
}

const fmtBRLCompact = (v: number) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};

interface Props { procedimento: any; }

const fmtBRL = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtInt = (v: number) => (Number(v) || 0).toLocaleString("pt-BR");
const fmtPct = (v: number) =>
  `${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-BR");
};

// ===== Aging =====
type AgingCode = "A_VENCER" | "VENCIDO_0_90" | "VENCIDO_91_180" | "VENCIDO_181_360" | "VENCIDO_ACIMA_360" | "SEM_INFORMACAO";
interface AgingFaixa { codigo: AgingCode; label: string; ordem: number; }
const AGING_FAIXAS: AgingFaixa[] = [
  { codigo: "A_VENCER",          label: "A vencer",          ordem: 1 },
  { codigo: "VENCIDO_0_90",      label: "0 a 90 dias",       ordem: 2 },
  { codigo: "VENCIDO_91_180",    label: "91 a 180 dias",     ordem: 3 },
  { codigo: "VENCIDO_181_360",   label: "181 a 360 dias",    ordem: 4 },
  { codigo: "VENCIDO_ACIMA_360", label: "Acima de 360 dias", ordem: 5 },
  { codigo: "SEM_INFORMACAO",    label: "Sem informação",    ordem: 6 },
];
const classificarAging = (dias: number | null): AgingFaixa => {
  if (dias === null || dias === undefined || isNaN(dias)) return AGING_FAIXAS[5];
  if (dias <= 0) return AGING_FAIXAS[0];
  if (dias <= 90) return AGING_FAIXAS[1];
  if (dias <= 180) return AGING_FAIXAS[2];
  if (dias <= 360) return AGING_FAIXAS[3];
  return AGING_FAIXAS[4];
};

export default function FaturasEmAbertoDashboard({ procedimento }: Props) {
  const procedimentoId = procedimento.id;
  const dataBase = procedimento.data_base_referencia;

  const [filterLote, setFilterLote] = useState("all");
  const [filterSit, setFilterSit] = useState("all");
  const [filterClasse, setFilterClasse] = useState("all");
  const [filterAnoVenc, setFilterAnoVenc] = useState("all");
  const [filterAnoMes, setFilterAnoMes] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAging, setFilterAging] = useState<string>("all");
  const [search, setSearch] = useState("");

  const lotesQ = useQuery({
    queryKey: ["fab-dash-lotes", procedimentoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimento_faturas_aberto_lotes")
        .select("*").eq("procedimento_auxiliar_id", procedimentoId)
        .order("data_importacao", { ascending: false });
      if (error) throw error; return data || [];
    },
  });

  const itensQ = useQuery({
    queryKey: ["fab-dash-itens", procedimentoId],
    queryFn: async () => {
      const all: any[] = []; const PAGE = 1000; let from = 0;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("procedimento_faturas_aberto_itens")
          .select("*").eq("procedimento_auxiliar_id", procedimentoId)
          .range(from, from + PAGE - 1).order("data_vencimento");
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });

  const lotes = lotesQ.data || [];
  const itens = itensQ.data || [];

  const getDiasAtraso = (i: any): number | null => {
    if (dataBase && i.data_vencimento) {
      const a = new Date(dataBase).getTime();
      const b = new Date(i.data_vencimento).getTime();
      if (!isNaN(a) && !isNaN(b)) return Math.floor((a - b) / 86400000);
    }
    if (i.dias_em_atraso !== null && i.dias_em_atraso !== undefined) return Number(i.dias_em_atraso);
    return null;
  };

  const getAnoVenc = (i: any): string => {
    if (i.ano_vencimento) return String(i.ano_vencimento);
    if (i.data_vencimento) {
      const d = new Date(i.data_vencimento);
      if (!isNaN(d.getTime())) return String(d.getFullYear());
    }
    return "";
  };

  const sitOpts = useMemo(
    () => Array.from(new Set(itens.map((i: any) => i.situacao_fornecimento || "Sem informação"))).sort(),
    [itens]
  );
  const classeOpts = useMemo(() => {
    const s = new Set<string>();
    itens.forEach((i: any) => {
      s.add(i.classe_descricao_snapshot || i.classe_codigo || "Classe não informada");
    });
    return Array.from(s).sort();
  }, [itens]);
  const anoVencOpts = useMemo(
    () => Array.from(new Set(itens.map(getAnoVenc).filter(Boolean))).sort(),
    [itens]
  );
  const anoMesOpts = useMemo(
    () => Array.from(new Set(itens.map((i: any) => i.ano_mes_faturamento).filter(Boolean))).sort(),
    [itens]
  );

  // Filtros base (sem aging) — usado pelo Resumo por Aging
  const filteredBase = useMemo(() => {
    const s = search.trim().toLowerCase();
    return itens.filter((i: any) => {
      if (filterLote !== "all" && i.lote_importacao_id !== filterLote) return false;
      if (filterSit !== "all" && (i.situacao_fornecimento || "Sem informação") !== filterSit) return false;
      if (filterClasse !== "all" && (i.classe_descricao_snapshot || i.classe_codigo || "Classe não informada") !== filterClasse) return false;
      if (filterAnoVenc !== "all" && getAnoVenc(i) !== filterAnoVenc) return false;
      if (filterAnoMes !== "all" && i.ano_mes_faturamento !== filterAnoMes) return false;
      if (filterStatus !== "all") {
        const d = getDiasAtraso(i);
        if (filterStatus === "vencido" && !(d !== null && d > 0)) return false;
        if (filterStatus === "a_vencer" && !(d !== null && d <= 0)) return false;
        if (filterStatus === "sem_data" && d !== null) return false;
      }
      if (s) {
        const blob = `${i.uc || ""} ${i.nome_consumidor || ""} ${i.numero_fatura || ""} ${i.numero_documento || ""}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [itens, filterLote, filterSit, filterClasse, filterAnoVenc, filterAnoMes, filterStatus, search, dataBase]);

  // Filtrado completo (inclui aging) — usado pelos KPIs e tabela de itens
  const filtered = useMemo(() => {
    if (filterAging === "all") return filteredBase;
    return filteredBase.filter((i: any) => classificarAging(getDiasAtraso(i)).codigo === filterAging);
  }, [filteredBase, filterAging, dataBase]);

  const kpis = useMemo(() => {
    const ucs = new Set<string>();
    let total = 0, vencido = 0, aVencer = 0;
    filtered.forEach((i: any) => {
      const v = Number(i.valor_em_aberto) || 0;
      total += v;
      if (i.uc) ucs.add(i.uc);
      const d = getDiasAtraso(i);
      if (d !== null && d > 0) vencido += v;
      else if (d !== null && d <= 0) aVencer += v;
    });
    const qtdUcs = ucs.size;
    return {
      total, qtd: filtered.length, qtdUcs,
      ticket: qtdUcs > 0 ? total / qtdUcs : 0,
      vencido, aVencer,
      pctVencido: total > 0 ? (vencido / total) * 100 : 0,
      pctAVencer: total > 0 ? (aVencer / total) * 100 : 0,
    };
  }, [filtered, dataBase]);

  // Resumo por aging — sempre sobre filteredBase (ignora filtro de aging)
  const resumoAging = useMemo(() => {
    const acc: Record<AgingCode, { qtd: number; ucs: Set<string>; valor: number }> = {
      A_VENCER:          { qtd: 0, ucs: new Set(), valor: 0 },
      VENCIDO_0_90:      { qtd: 0, ucs: new Set(), valor: 0 },
      VENCIDO_91_180:    { qtd: 0, ucs: new Set(), valor: 0 },
      VENCIDO_181_360:   { qtd: 0, ucs: new Set(), valor: 0 },
      VENCIDO_ACIMA_360: { qtd: 0, ucs: new Set(), valor: 0 },
      SEM_INFORMACAO:    { qtd: 0, ucs: new Set(), valor: 0 },
    };
    let totalGeral = 0;
    filteredBase.forEach((i: any) => {
      const f = classificarAging(getDiasAtraso(i));
      const v = Number(i.valor_em_aberto) || 0;
      acc[f.codigo].qtd += 1;
      acc[f.codigo].valor += v;
      if (i.uc) acc[f.codigo].ucs.add(i.uc);
      totalGeral += v;
    });
    return AGING_FAIXAS.map((f) => ({
      ...f,
      qtd: acc[f.codigo].qtd,
      qtdUcs: acc[f.codigo].ucs.size,
      valor: acc[f.codigo].valor,
      pct: totalGeral > 0 ? (acc[f.codigo].valor / totalGeral) * 100 : 0,
    }));
  }, [filteredBase, dataBase]);

  // ===== Agregações para gráficos (respeitam TODOS os filtros, inclusive aging) =====
  type Agg = { label: string; valor: number; qtd: number; ucs: Set<string> };
  const aggToArr = (m: Map<string, Agg>) =>
    Array.from(m.values()).map((a) => ({ label: a.label, valor: a.valor, qtd: a.qtd, qtdUcs: a.ucs.size }));

  const totalFiltrado = useMemo(
    () => filtered.reduce((s: number, i: any) => s + (Number(i.valor_em_aberto) || 0), 0),
    [filtered]
  );

  const chartAging = useMemo(() => {
    const m = new Map<string, Agg>();
    AGING_FAIXAS.forEach((f) => m.set(f.label, { label: f.label, valor: 0, qtd: 0, ucs: new Set() }));
    filtered.forEach((i: any) => {
      const f = classificarAging(getDiasAtraso(i));
      const a = m.get(f.label)!;
      a.valor += Number(i.valor_em_aberto) || 0;
      a.qtd += 1;
      if (i.uc) a.ucs.add(i.uc);
    });
    return aggToArr(m);
  }, [filtered, dataBase]);

  const aggBy = (keyFn: (i: any) => string) => {
    const m = new Map<string, Agg>();
    filtered.forEach((i: any) => {
      const k = keyFn(i);
      let a = m.get(k);
      if (!a) { a = { label: k, valor: 0, qtd: 0, ucs: new Set() }; m.set(k, a); }
      a.valor += Number(i.valor_em_aberto) || 0;
      a.qtd += 1;
      if (i.uc) a.ucs.add(i.uc);
    });
    return m;
  };

  const chartSituacao = useMemo(
    () => aggToArr(aggBy((i) => i.situacao_fornecimento || "Sem informação"))
      .sort((a, b) => b.valor - a.valor),
    [filtered]
  );

  const chartClasse = useMemo(() => {
    const arr = aggToArr(aggBy((i) =>
      i.classe_descricao_snapshot || i.classe_codigo || "Classe não informada"
    )).sort((a, b) => b.valor - a.valor);
    if (arr.length <= 10) return arr;
    const top = arr.slice(0, 10);
    const outras = arr.slice(10).reduce(
      (acc, x) => ({ label: "Outras", valor: acc.valor + x.valor, qtd: acc.qtd + x.qtd, qtdUcs: acc.qtdUcs + x.qtdUcs }),
      { label: "Outras", valor: 0, qtd: 0, qtdUcs: 0 }
    );
    return [...top, outras];
  }, [filtered]);

  const chartVencidoXAVencer = useMemo(() => {
    const m = new Map<string, Agg>([
      ["A vencer",       { label: "A vencer", valor: 0, qtd: 0, ucs: new Set() }],
      ["Vencido",        { label: "Vencido",  valor: 0, qtd: 0, ucs: new Set() }],
      ["Sem informação", { label: "Sem informação", valor: 0, qtd: 0, ucs: new Set() }],
    ]);
    filtered.forEach((i: any) => {
      const d = getDiasAtraso(i);
      const k = d === null ? "Sem informação" : d > 0 ? "Vencido" : "A vencer";
      const a = m.get(k)!;
      a.valor += Number(i.valor_em_aberto) || 0;
      a.qtd += 1;
      if (i.uc) a.ucs.add(i.uc);
    });
    return aggToArr(m).filter((x) => x.qtd > 0);
  }, [filtered, dataBase]);

  const chartAnoMes = useMemo(() => {
    const arr = aggToArr(aggBy((i) => {
      if (i.ano_mes_faturamento) return String(i.ano_mes_faturamento);
      if (i.data_vencimento) {
        const d = new Date(i.data_vencimento);
        if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
      return "Sem informação";
    }));
    return arr.sort((a, b) => {
      if (a.label === "Sem informação") return 1;
      if (b.label === "Sem informação") return -1;
      return a.label.localeCompare(b.label);
    });
  }, [filtered]);

  const limparFiltros = () => {
    setFilterLote("all"); setFilterSit("all"); setFilterClasse("all");
    setFilterAnoVenc("all"); setFilterAnoMes("all"); setFilterStatus("all");
    setFilterAging("all"); setSearch("");
  };

  const isLoading = lotesQ.isLoading || itensQ.isLoading;
  const isError = lotesQ.isError || itensQ.isError;

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando faturas em aberto...</div>;
  }
  if (isError) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-destructive">Erro ao carregar faturas em aberto.</p>
        <Button onClick={() => { lotesQ.refetch(); itensQ.refetch(); }}>Tentar novamente</Button>
      </div>
    );
  }
  if (itens.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">Nenhuma fatura em aberto importada para este procedimento.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Dashboard de Faturas em Aberto</h2>
        <p className="text-xs text-muted-foreground">Visão inicial da carteira importada para análise de auditoria.</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-2.5 text-muted-foreground" />
            <Input className="pl-7 h-9" placeholder="UC, consumidor, fatura/documento..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <FilterSel value={filterLote} onChange={setFilterLote} options={[
          { v: "all", l: "Todos lotes" },
          ...lotes.map((l: any) => ({
            v: l.id,
            l: `${l.nome_arquivo || l.id.slice(0, 8)} — ${new Date(l.data_importacao).toLocaleDateString("pt-BR")}`,
          })),
        ]} />
        <FilterSel value={filterSit} onChange={setFilterSit} options={[{ v: "all", l: "Todas situações" }, ...sitOpts.map((c) => ({ v: c, l: c }))]} />
        <FilterSel value={filterClasse} onChange={setFilterClasse} options={[{ v: "all", l: "Todas classes" }, ...classeOpts.map((c) => ({ v: c, l: c }))]} />
        <FilterSel value={filterAnoVenc} onChange={setFilterAnoVenc} options={[{ v: "all", l: "Todos anos venc." }, ...anoVencOpts.map((c) => ({ v: c, l: c }))]} />
        <FilterSel value={filterAnoMes} onChange={setFilterAnoMes} options={[{ v: "all", l: "Todos ano/mês fat." }, ...anoMesOpts.map((c) => ({ v: c, l: c }))]} />
        <FilterSel value={filterStatus} onChange={setFilterStatus} options={[
          { v: "all", l: "Todos status" },
          { v: "vencido", l: "Vencidos" },
          { v: "a_vencer", l: "A vencer" },
          { v: "sem_data", l: "Sem data venc." },
        ]} />
        <FilterSel value={filterAging} onChange={setFilterAging} options={[
          { v: "all", l: "Todas faixas aging" },
          ...AGING_FAIXAS.map((f) => ({ v: f.codigo, l: f.label })),
        ]} />
        <Button variant="outline" size="sm" onClick={limparFiltros}><RotateCcw size={14} /> Limpar</Button>
      </div>

      {dataBase && (
        <p className="text-xs text-muted-foreground">
          Data-base de referência (AME): <strong>{fmtDate(dataBase)}</strong>. Vencimento calculado em relação a esta data.
        </p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        <Kpi label="Valor total em aberto" value={fmtBRL(kpis.total)} align="right" />
        <Kpi label="Faturas" value={fmtInt(kpis.qtd)} align="right" />
        <Kpi label="UCs devedoras" value={fmtInt(kpis.qtdUcs)} align="right" />
        <Kpi label="Ticket médio / UC" value={fmtBRL(kpis.ticket)} align="right" />
        <Kpi label="Valor vencido" value={fmtBRL(kpis.vencido)} align="right" />
        <Kpi label="Valor a vencer" value={fmtBRL(kpis.aVencer)} align="right" />
        <Kpi label="% Vencido" value={fmtPct(kpis.pctVencido)} align="center" />
        <Kpi label="% A vencer" value={fmtPct(kpis.pctAVencer)} align="center" />
      </div>

      {/* Resumo por Aging */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Resumo por Aging</h3>
          <p className="text-[11px] text-muted-foreground">
            Considera os filtros aplicados, exceto o próprio filtro de faixa de aging.
          </p>
        </div>
        <div className="border rounded overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>
                <TableHead>Faixa</TableHead>
                <TableHead className="text-right">Qtd. faturas</TableHead>
                <TableHead className="text-right">Qtd. UCs</TableHead>
                <TableHead className="text-right">Valor em aberto</TableHead>
                <TableHead className="text-center">% do total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumoAging.map((r) => (
                <TableRow key={r.codigo} className={filterAging === r.codigo ? "bg-accent/40" : ""}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtInt(r.qtd)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtInt(r.qtdUcs)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(r.valor)}</TableCell>
                  <TableCell className="text-center tabular-nums">{fmtPct(r.pct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground border rounded">
          Nenhuma fatura encontrada para os filtros selecionados.
        </div>
      ) : (
        <>
          <div className="border rounded overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow>
                  <TableHead>UC</TableHead>
                  <TableHead>Consumidor</TableHead>
                  <TableHead>Fatura/Doc</TableHead>
                  <TableHead className="text-center">Emissão</TableHead>
                  <TableHead className="text-center">Vencimento</TableHead>
                  <TableHead className="text-right">Atraso</TableHead>
                  <TableHead className="text-right">Valor em aberto</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead className="text-center">Ano/mês fat.</TableHead>
                  <TableHead>Faixa aging</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((i: any) => {
                  const d = getDiasAtraso(i);
                  const faixa = classificarAging(d);
                  return (
                    <TableRow key={i.id}>
                      <TableCell>{i.uc || "—"}</TableCell>
                      <TableCell>{i.nome_consumidor || "—"}</TableCell>
                      <TableCell>{i.numero_fatura || i.numero_documento || "—"}</TableCell>
                      <TableCell className="text-center">{fmtDate(i.data_emissao)}</TableCell>
                      <TableCell className="text-center">{fmtDate(i.data_vencimento)}</TableCell>
                      <TableCell className="text-right tabular-nums">{d ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(i.valor_em_aberto)}</TableCell>
                      <TableCell>{i.situacao_fornecimento || "—"}</TableCell>
                      <TableCell>{i.classe_descricao_snapshot || i.classe_codigo || "—"}</TableCell>
                      <TableCell className="text-center">{i.ano_mes_faturamento || "—"}</TableCell>
                      <TableCell>{faixa.label}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 500 && (
            <p className="text-xs text-muted-foreground">
              Exibindo as primeiras 500 linhas dos itens filtrados. Total filtrado: {fmtInt(filtered.length)}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, align = "left" }: { label: string; value: string; align?: "left" | "right" | "center" }) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <Card><CardContent className="p-2">
      <div className={`text-[10px] uppercase tracking-wide text-muted-foreground leading-tight ${alignCls}`}>{label}</div>
      <div className={`text-base font-semibold tabular-nums leading-tight mt-1 truncate ${alignCls}`} title={value}>{value}</div>
    </CardContent></Card>
  );
}

function FilterSel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
    </Select>
  );
}
