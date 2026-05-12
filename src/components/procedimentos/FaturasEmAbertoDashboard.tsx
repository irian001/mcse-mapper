import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RotateCcw } from "lucide-react";

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

export default function FaturasEmAbertoDashboard({ procedimento }: Props) {
  const procedimentoId = procedimento.id;
  const dataBase = procedimento.data_base_referencia;

  const [filterLote, setFilterLote] = useState("all");
  const [filterSit, setFilterSit] = useState("all");
  const [filterClasse, setFilterClasse] = useState("all");
  const [filterAnoVenc, setFilterAnoVenc] = useState("all");
  const [filterAnoMes, setFilterAnoMes] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
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
    // Sempre recalcula a partir da data-base do procedimento (AME) vs data de vencimento,
    // para garantir consistência quando dias_em_atraso importado estiver desatualizado.
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

  const filtered = useMemo(() => {
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

  const limparFiltros = () => {
    setFilterLote("all"); setFilterSit("all"); setFilterClasse("all");
    setFilterAnoVenc("all"); setFilterAnoMes("all"); setFilterStatus("all"); setSearch("");
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
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Atraso</TableHead>
                  <TableHead className="text-right">Valor em aberto</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Ano/mês fat.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((i: any) => {
                  const d = getDiasAtraso(i);
                  return (
                    <TableRow key={i.id}>
                      <TableCell>{i.uc || "—"}</TableCell>
                      <TableCell>{i.nome_consumidor || "—"}</TableCell>
                      <TableCell>{i.numero_fatura || i.numero_documento || "—"}</TableCell>
                      <TableCell>{fmtDate(i.data_emissao)}</TableCell>
                      <TableCell>{fmtDate(i.data_vencimento)}</TableCell>
                      <TableCell className="text-right">{d ?? "—"}</TableCell>
                      <TableCell className="text-right">{fmtBRL(i.valor_em_aberto)}</TableCell>
                      <TableCell>{i.situacao_fornecimento || "—"}</TableCell>
                      <TableCell>{i.classe_descricao_snapshot || i.classe_codigo || "—"}</TableCell>
                      <TableCell>{i.ano_mes_faturamento || "—"}</TableCell>
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
