import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import BalanceteLinhaDetailDialog from "./BalanceteLinhaDetailDialog";

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return v.toFixed(1) + "%";
}

function statusLinhaBadge(s: string | null) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: "Pendente", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    em_analise: { label: "Em Análise", cls: "bg-blue-100 text-blue-800 border-blue-200" },
    validado: { label: "Validado", cls: "bg-green-100 text-green-800 border-green-200" },
    divergente: { label: "Divergente", cls: "bg-red-100 text-red-800 border-red-200" },
    revisado: { label: "Revisado", cls: "bg-purple-100 text-purple-800 border-purple-200" },
    concluido: { label: "Concluído", cls: "bg-green-200 text-green-900 border-green-300" },
  };
  const m = map[s || ""] || { label: s || "—", cls: "" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

function severidadeBadge(s: string | null) {
  if (!s) return null;
  const map: Record<string, { label: string; cls: string }> = {
    baixa: { label: "Baixa", cls: "bg-green-100 text-green-800 border-green-200" },
    media: { label: "Média", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    alta: { label: "Alta", cls: "bg-orange-100 text-orange-800 border-orange-200" },
    critica: { label: "Crítica", cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const m = map[s] || { label: s, cls: "" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

function DiferencaAceitaIcon({ linha }: { linha: any }) {
  if (linha.diferenca_aceita === true) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger><CheckCircle2 size={15} className="text-green-600" /></TooltipTrigger>
          <TooltipContent className="max-w-[250px]">
            <p className="text-xs font-medium">Diferença aceita</p>
            {linha.justificativa_diferenca && <p className="text-xs mt-1">{linha.justificativa_diferenca}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (linha.diferenca_aceita === false) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger><XCircle size={15} className="text-destructive" /></TooltipTrigger>
          <TooltipContent><p className="text-xs">Diferença não aceita</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return null;
}

function PendenciaIcon({ linha }: { linha: any }) {
  if (!linha.possui_pendencia) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <AlertTriangle size={15} className={
            linha.severidade === "critica" ? "text-red-600" :
            linha.severidade === "alta" ? "text-orange-600" :
            linha.severidade === "media" ? "text-yellow-600" : "text-muted-foreground"
          } />
        </TooltipTrigger>
        <TooltipContent className="max-w-[250px]">
          <p className="text-xs font-medium">Pendência{linha.severidade ? ` (${linha.severidade})` : ""}</p>
          {linha.descricao_pendencia && <p className="text-xs mt-1">{linha.descricao_pendencia}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface Props {
  balanceteId: string;
}

export default function BalanceteLinhasTable({ balanceteId }: Props) {
  const [search, setSearch] = useState("");
  const [filterStatusLinha, setFilterStatusLinha] = useState("all");
  const [filterPendencia, setFilterPendencia] = useState("all");
  const [filterSeveridade, setFilterSeveridade] = useState("all");
  const [filterValValidado, setFilterValValidado] = useState("all");
  const [filterDifNaoZero, setFilterDifNaoZero] = useState(false);
  const [filterVariacao, setFilterVariacao] = useState(false);
  const [filterGrupo, setFilterGrupo] = useState("all");
  const [selectedLinha, setSelectedLinha] = useState<any>(null);

  const { data: linhas = [], isLoading } = useQuery({
    queryKey: ["balancete_linhas", balanceteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("balancete_linhas")
        .select("*, cliente_contas_origem(analitica)")
        .eq("balancete_id", balanceteId)
        .order("codigo_conta_balancete");
      return (data || []).map((l: any) => ({
        ...l,
        is_analitica: l.cliente_contas_origem?.analitica ?? true,
      }));
    },
    enabled: !!balanceteId,
  });

  // Extract unique groups for filter
  const grupos = [...new Set(linhas.map((l: any) => l.grupo_mcse).filter(Boolean))].sort();

  const filtered = linhas.filter((l: any) => {
    if (search) {
      const s = search.toLowerCase();
      if (!l.codigo_conta_balancete.toLowerCase().includes(s) &&
          !l.descricao_conta_balancete.toLowerCase().includes(s) &&
          !(l.codigo_mcse || "").toLowerCase().includes(s)) return false;
    }
    if (filterStatusLinha !== "all" && l.status_linha !== filterStatusLinha) return false;
    if (filterPendencia === "com" && !l.possui_pendencia) return false;
    if (filterPendencia === "sem" && l.possui_pendencia) return false;
    if (filterSeveridade !== "all" && l.severidade !== filterSeveridade) return false;
    if (filterValValidado === "com" && l.valor_validado == null) return false;
    if (filterValValidado === "sem" && l.valor_validado != null) return false;
    if (filterDifNaoZero && (l.diferenca_validacao == null || l.diferenca_validacao === 0)) return false;
    if (filterVariacao && Math.abs(l.variacao_percentual || 0) < 10) return false;
    if (filterGrupo !== "all" && l.grupo_mcse !== filterGrupo) return false;
    return true;
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando linhas...</p>;

  return (
    <div className="space-y-3">
      {/* Filters — Row 1 */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Buscar conta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-56" />
        </div>
        <Select value={filterStatusLinha} onValueChange={setFilterStatusLinha}>
          <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_analise">Em Análise</SelectItem>
            <SelectItem value="validado">Validado</SelectItem>
            <SelectItem value="divergente">Divergente</SelectItem>
            <SelectItem value="revisado">Revisado</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPendencia} onValueChange={setFilterPendencia}>
          <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Pendência" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="com">Com pendência</SelectItem>
            <SelectItem value="sem">Sem pendência</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeveridade} onValueChange={setFilterSeveridade}>
          <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Severidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterValValidado} onValueChange={setFilterValValidado}>
          <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Val. Validado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="com">Com valor validado</SelectItem>
            <SelectItem value="sem">Sem valor validado</SelectItem>
          </SelectContent>
        </Select>
        {grupos.length > 0 && (
          <Select value={filterGrupo} onValueChange={setFilterGrupo}>
            <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Grupo MCSE" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos grupos</SelectItem>
              {grupos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      {/* Filters — Row 2 */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={filterVariacao} onChange={e => setFilterVariacao(e.target.checked)} className="rounded" />
          Var. &gt; 10%
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={filterDifNaoZero} onChange={e => setFilterDifNaoZero(e.target.checked)} className="rounded" />
          Dif. ≠ 0
        </label>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} de {linhas.length} linhas</span>
      </div>

      {/* Table */}
      <div className="rounded border bg-card max-h-[520px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-[100px]">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>MCSE</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="text-right">Val. Valid.</TableHead>
              <TableHead className="text-right">Dif.</TableHead>
              <TableHead className="text-center w-[50px]">Ac.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center w-[50px]">Pend.</TableHead>
              <TableHead className="text-right">Var. %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 300).map((l: any) => {
              const highVar = l.variacao_percentual != null && Math.abs(l.variacao_percentual) > 10;
              const hasDif = l.diferenca_validacao != null && l.diferenca_validacao !== 0;
              const rowCls =
                l.status_linha === "divergente" ? "bg-red-50/40" :
                l.status_linha === "validado" || l.status_linha === "concluido" ? "bg-green-50/30" :
                l.possui_pendencia ? "bg-yellow-50/30" : "";

              return (
                <TableRow
                  key={l.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/30 ${rowCls}`}
                  onClick={() => setSelectedLinha(l)}
                >
                  <TableCell className="font-mono text-xs">{l.codigo_conta_balancete}</TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate">{l.descricao_conta_balancete}</TableCell>
                  <TableCell className="font-mono text-xs">{l.codigo_mcse || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(l.saldo_atual)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(l.valor_validado)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs ${hasDif ? "text-amber-600 font-semibold" : ""}`}>
                    {fmt(l.diferenca_validacao)}
                  </TableCell>
                  <TableCell className="text-center">
                    <DiferencaAceitaIcon linha={l} />
                  </TableCell>
                  <TableCell>{statusLinhaBadge(l.status_linha)}</TableCell>
                  <TableCell className="text-center">
                    <PendenciaIcon linha={l} />
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs ${highVar ? "text-amber-600 font-semibold" : ""}`}>
                    {fmtPct(l.variacao_percentual)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length > 300 && <p className="text-center text-xs text-muted-foreground py-2">Mostrando 300 de {filtered.length}</p>}
      </div>

      {/* Detail dialog */}
      <BalanceteLinhaDetailDialog
        linha={selectedLinha}
        balanceteId={balanceteId}
        onClose={() => setSelectedLinha(null)}
      />
    </div>
  );
}
