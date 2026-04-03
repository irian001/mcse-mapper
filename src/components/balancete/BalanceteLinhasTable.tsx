import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import BalanceteLinhaDetailDialog from "./BalanceteLinhaDetailDialog";

function statusLocBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    localizada: { label: "Localizada", cls: "bg-green-100 text-green-800 border-green-200" },
    localizada_por_codigo: { label: "Por Código", cls: "bg-green-50 text-green-700 border-green-200" },
    localizada_por_classificacao: { label: "Por Classif.", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    localizada_por_descricao: { label: "Por Desc.", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    nao_localizada: { label: "Não Localizada", cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const m = map[s] || { label: s, cls: "" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

function statusMapBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    mapeado: { label: "Mapeado", cls: "bg-green-100 text-green-800 border-green-200" },
    sem_mapeamento: { label: "Sem MCSE", cls: "bg-orange-100 text-orange-800 border-orange-200" },
    conta_nao_localizada: { label: "Conta N/L", cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const m = map[s] || { label: s, cls: "" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

function statusValBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pronto_para_analise: { label: "Pronto", cls: "bg-green-100 text-green-800 border-green-200" },
    revisar_mapeamento: { label: "Revisar", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    pendente: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[s] || { label: s, cls: "" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return v.toFixed(1) + "%";
}

function DiferencaAceitaIcon({ linha }: { linha: any }) {
  if (linha.diferenca_aceita === true) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <CheckCircle2 size={16} className="text-green-600" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[250px]">
            <p className="text-xs font-medium">Diferença aceita</p>
            {linha.justificativa_diferenca && (
              <p className="text-xs mt-1">{linha.justificativa_diferenca}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (linha.diferenca_aceita === false) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <XCircle size={16} className="text-destructive" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Diferença não aceita</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

interface Props {
  balanceteId: string;
}

export default function BalanceteLinhasTable({ balanceteId }: Props) {
  const [search, setSearch] = useState("");
  const [filterLoc, setFilterLoc] = useState("all");
  const [filterMap, setFilterMap] = useState("all");
  const [filterVal, setFilterVal] = useState("all");
  const [filterVariacao, setFilterVariacao] = useState(false);
  const [filterDifAceita, setFilterDifAceita] = useState("all");
  const [filterDifNaoZero, setFilterDifNaoZero] = useState(false);
  const [selectedLinha, setSelectedLinha] = useState<any>(null);

  const { data: linhas = [], isLoading } = useQuery({
    queryKey: ["balancete_linhas", balanceteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("balancete_linhas")
        .select("*")
        .eq("balancete_id", balanceteId)
        .order("codigo_conta_balancete");
      return data || [];
    },
    enabled: !!balanceteId,
  });

  const filtered = linhas.filter((l: any) => {
    if (search) {
      const s = search.toLowerCase();
      if (!l.codigo_conta_balancete.toLowerCase().includes(s) &&
          !l.descricao_conta_balancete.toLowerCase().includes(s) &&
          !(l.codigo_mcse || "").toLowerCase().includes(s)) return false;
    }
    if (filterLoc !== "all" && l.status_localizacao_conta !== filterLoc) return false;
    if (filterMap !== "all" && l.status_mapeamento_mcse !== filterMap) return false;
    if (filterVal !== "all" && l.status_validacao !== filterVal) return false;
    if (filterVariacao && Math.abs(l.variacao_percentual || 0) < 10) return false;

    // New filters
    if (filterDifAceita === "aceita" && l.diferenca_aceita !== true) return false;
    if (filterDifAceita === "nao_aceita" && l.diferenca_aceita !== false) return false;
    if (filterDifAceita === "com_justificativa" && !l.justificativa_diferenca) return false;
    if (filterDifAceita === "sem_justificativa" && (l.justificativa_diferenca || l.diferenca_validacao == null || l.diferenca_validacao === 0)) return false;
    if (filterDifNaoZero && (l.diferenca_validacao == null || l.diferenca_validacao === 0)) return false;

    return true;
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando linhas...</p>;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Buscar conta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-64" />
        </div>
        <Select value={filterLoc} onValueChange={setFilterLoc}>
          <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Localização" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="nao_localizada">Não localizada</SelectItem>
            <SelectItem value="localizada_por_codigo">Por código</SelectItem>
            <SelectItem value="localizada_por_classificacao">Por classif.</SelectItem>
            <SelectItem value="localizada_por_descricao">Por descrição</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMap} onValueChange={setFilterMap}>
          <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="MCSE" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="mapeado">Mapeado</SelectItem>
            <SelectItem value="sem_mapeamento">Sem MCSE</SelectItem>
            <SelectItem value="conta_nao_localizada">N/Localizada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterVal} onValueChange={setFilterVal}>
          <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Validação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pronto_para_analise">Pronto</SelectItem>
            <SelectItem value="revisar_mapeamento">Revisar</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDifAceita} onValueChange={setFilterDifAceita}>
          <SelectTrigger className="h-9 w-44 text-xs"><SelectValue placeholder="Diferença" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas diferenças</SelectItem>
            <SelectItem value="aceita">Diferença aceita</SelectItem>
            <SelectItem value="nao_aceita">Diferença não aceita</SelectItem>
            <SelectItem value="com_justificativa">Com justificativa</SelectItem>
            <SelectItem value="sem_justificativa">Sem justificativa</SelectItem>
          </SelectContent>
        </Select>
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
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>MCSE</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="text-right">Val. Validado</TableHead>
              <TableHead className="text-right">Dif. Valid.</TableHead>
              <TableHead className="text-center">Aceita</TableHead>
              <TableHead className="text-right">Var. %</TableHead>
              <TableHead>Localiz.</TableHead>
              <TableHead>MCSE</TableHead>
              <TableHead>Valid.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 300).map((l: any) => {
              const highVar = l.variacao_percentual != null && Math.abs(l.variacao_percentual) > 10;
              const hasDif = l.diferenca_validacao != null && l.diferenca_validacao !== 0;
              return (
                <TableRow
                  key={l.id}
                  className={`cursor-pointer ${l.status_localizacao_conta === "nao_localizada" ? "bg-red-50/50" : l.status_mapeamento_mcse === "sem_mapeamento" ? "bg-orange-50/30" : ""}`}
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
                  <TableCell className={`text-right font-mono text-xs ${highVar ? "text-amber-600 font-semibold" : ""}`}>{fmtPct(l.variacao_percentual)}</TableCell>
                  <TableCell>{statusLocBadge(l.status_localizacao_conta)}</TableCell>
                  <TableCell>{statusMapBadge(l.status_mapeamento_mcse)}</TableCell>
                  <TableCell>{statusValBadge(l.status_validacao)}</TableCell>
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
