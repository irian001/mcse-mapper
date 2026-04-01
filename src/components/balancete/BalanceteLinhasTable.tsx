import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";

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

interface Props {
  balanceteId: string;
}

export default function BalanceteLinhasTable({ balanceteId }: Props) {
  const [search, setSearch] = useState("");
  const [filterLoc, setFilterLoc] = useState("all");
  const [filterMap, setFilterMap] = useState("all");
  const [filterVal, setFilterVal] = useState("all");
  const [filterVariacao, setFilterVariacao] = useState(false);
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
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={filterVariacao} onChange={e => setFilterVariacao(e.target.checked)} className="rounded" />
          Variação &gt; 10%
        </label>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} de {linhas.length} linhas</span>
      </div>

      {/* Table */}
      <div className="rounded border bg-card max-h-[520px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>MCSE</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead className="text-right">Saldo Ant.</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="text-right">Var. %</TableHead>
              <TableHead>Localiz.</TableHead>
              <TableHead>MCSE</TableHead>
              <TableHead>Valid.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 300).map((l: any) => {
              const highVar = l.variacao_percentual != null && Math.abs(l.variacao_percentual) > 10;
              return (
                <TableRow
                  key={l.id}
                  className={`cursor-pointer ${l.status_localizacao_conta === "nao_localizada" ? "bg-red-50/50" : l.status_mapeamento_mcse === "sem_mapeamento" ? "bg-orange-50/30" : ""}`}
                  onClick={() => setSelectedLinha(l)}
                >
                  <TableCell className="font-mono text-xs">{l.codigo_conta_balancete}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{l.descricao_conta_balancete}</TableCell>
                  <TableCell className="font-mono text-xs">{l.codigo_mcse || "—"}</TableCell>
                  <TableCell className="text-xs">{l.grupo_mcse || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(l.saldo_anterior)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(l.saldo_atual)}</TableCell>
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
      <Dialog open={!!selectedLinha} onOpenChange={() => setSelectedLinha(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-base">Detalhe da Linha</DialogTitle></DialogHeader>
          {selectedLinha && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Código:</span>
              <span className="font-mono">{selectedLinha.codigo_conta_balancete}</span>
              <span className="text-muted-foreground">Descrição:</span>
              <span>{selectedLinha.descricao_conta_balancete}</span>
              <span className="text-muted-foreground">Classificação:</span>
              <span className="font-mono">{selectedLinha.classificacao_origem || "—"}</span>
              <span className="text-muted-foreground col-span-2 font-medium pt-2 border-t">Conta MCSE</span>
              <span className="text-muted-foreground">Código MCSE:</span>
              <span className="font-mono">{selectedLinha.codigo_mcse || "—"}</span>
              <span className="text-muted-foreground">Descrição MCSE:</span>
              <span>{selectedLinha.descricao_mcse || "—"}</span>
              <span className="text-muted-foreground">Grupo:</span>
              <span>{selectedLinha.grupo_mcse || "—"}</span>
              <span className="text-muted-foreground">Subgrupo:</span>
              <span>{selectedLinha.subgrupo_mcse || "—"}</span>
              <span className="text-muted-foreground col-span-2 font-medium pt-2 border-t">Valores</span>
              <span className="text-muted-foreground">Saldo Anterior:</span>
              <span className="font-mono">{fmt(selectedLinha.saldo_anterior)}</span>
              <span className="text-muted-foreground">Débitos:</span>
              <span className="font-mono">{fmt(selectedLinha.debitos)}</span>
              <span className="text-muted-foreground">Créditos:</span>
              <span className="font-mono">{fmt(selectedLinha.creditos)}</span>
              <span className="text-muted-foreground">Saldo Atual:</span>
              <span className="font-mono">{fmt(selectedLinha.saldo_atual)}</span>
              <span className="text-muted-foreground">Variação Abs.:</span>
              <span className="font-mono">{fmt(selectedLinha.variacao_absoluta)}</span>
              <span className="text-muted-foreground">Variação %:</span>
              <span className="font-mono">{fmtPct(selectedLinha.variacao_percentual)}</span>
              <span className="text-muted-foreground col-span-2 font-medium pt-2 border-t">Status</span>
              <span className="text-muted-foreground">Localização:</span>
              {statusLocBadge(selectedLinha.status_localizacao_conta)}
              <span className="text-muted-foreground">MCSE:</span>
              {statusMapBadge(selectedLinha.status_mapeamento_mcse)}
              <span className="text-muted-foreground">Validação:</span>
              {statusValBadge(selectedLinha.status_validacao)}
              {selectedLinha.observacao_importacao && (
                <>
                  <span className="text-muted-foreground">Observação:</span>
                  <span>{selectedLinha.observacao_importacao}</span>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
