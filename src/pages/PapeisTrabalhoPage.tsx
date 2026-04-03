import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, ClipboardList } from "lucide-react";
import PtaDetailDialog from "@/components/pta/PtaDetailDialog";
import GerarPtaDialog from "@/components/pta/GerarPtaDialog";

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  em_analise: { label: "Em Análise", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  em_revisao: { label: "Em Revisão", cls: "bg-purple-100 text-purple-800 border-purple-200" },
  concluido: { label: "Concluído", cls: "bg-green-100 text-green-800 border-green-200" },
  finalizado: { label: "Finalizado", cls: "bg-green-200 text-green-900 border-green-300" },
};

export default function PapeisTrabalhoPage() {
  const [search, setSearch] = useState("");
  const [filterTrabalho, setFilterTrabalho] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGrupo, setFilterGrupo] = useState("all");
  const [filterPendencia, setFilterPendencia] = useState("all");
  const [filterDiferenca, setFilterDiferenca] = useState(false);
  const [selectedPta, setSelectedPta] = useState<any>(null);
  const [showGerar, setShowGerar] = useState(false);

  const { data: ptas = [], isLoading } = useQuery({
    queryKey: ["papeis_trabalho"],
    queryFn: async () => {
      const { data } = await supabase
        .from("papeis_trabalho")
        .select("*, trabalhos_auditoria(nome_trabalho), clientes(razao_social), exercicios(ano_exercicio)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: trabalhos = [] } = useQuery({
    queryKey: ["trabalhos_for_pta_filter"],
    queryFn: async () => {
      const { data } = await supabase.from("trabalhos_auditoria").select("id, nome_trabalho").order("nome_trabalho");
      return data || [];
    },
  });

  const grupos = [...new Set(ptas.map((p: any) => p.grupo_mcse).filter(Boolean))].sort();

  const filtered = ptas.filter((p: any) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !(p.titulo_pta || "").toLowerCase().includes(s) &&
        !(p.codigo_mcse || "").toLowerCase().includes(s) &&
        !(p.descricao_mcse || "").toLowerCase().includes(s)
      ) return false;
    }
    if (filterTrabalho !== "all" && p.trabalho_auditoria_id !== filterTrabalho) return false;
    if (filterStatus !== "all" && p.status_pta !== filterStatus) return false;
    if (filterGrupo !== "all" && p.grupo_mcse !== filterGrupo) return false;
    if (filterPendencia === "com" && (p.total_linhas_com_pendencia || 0) === 0) return false;
    if (filterPendencia === "sem" && (p.total_linhas_com_pendencia || 0) > 0) return false;
    if (filterDiferenca && (p.diferenca_total == null || p.diferenca_total === 0)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Papéis de Trabalho" description="Consolidação analítica por conta MCSE dentro de trabalhos de auditoria" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Buscar PTA..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-56" />
          </div>
          <Select value={filterTrabalho} onValueChange={setFilterTrabalho}>
            <SelectTrigger className="h-9 w-52 text-xs"><SelectValue placeholder="Trabalho" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os trabalhos</SelectItem>
              {trabalhos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_trabalho}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
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
          <Select value={filterPendencia} onValueChange={setFilterPendencia}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Pendência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="com">Com pendência</SelectItem>
              <SelectItem value="sem">Sem pendência</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={filterDiferenca} onChange={e => setFilterDiferenca(e.target.checked)} className="rounded" />
            Dif. ≠ 0
          </label>
        </div>
        <Button onClick={() => setShowGerar(true)}>
          <Plus size={14} className="mr-1" /> Gerar PTA
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList size={36} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum papel de trabalho encontrado</p>
            <Button className="mt-4" onClick={() => setShowGerar(true)}>Gerar Primeiro PTA</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded border bg-card overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Trabalho</TableHead>
                <TableHead>MCSE</TableHead>
                <TableHead className="text-right">Saldo Atual</TableHead>
                <TableHead className="text-right">Val. Valid.</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead className="text-center">Linhas</TableHead>
                <TableHead className="text-center">Pend.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => {
                const hasDif = p.diferenca_total != null && p.diferenca_total !== 0;
                const hasPend = (p.total_linhas_com_pendencia || 0) > 0;
                const st = STATUS_MAP[p.status_pta] || { label: p.status_pta, cls: "" };
                const rowCls =
                  p.status_pta === "finalizado" ? "bg-green-50/30" :
                  p.status_pta === "em_revisao" ? "bg-purple-50/30" :
                  hasPend ? "bg-yellow-50/30" :
                  hasDif ? "bg-amber-50/30" : "";

                return (
                  <TableRow
                    key={p.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/30 ${rowCls}`}
                    onClick={() => setSelectedPta(p)}
                  >
                    <TableCell className="font-medium text-xs max-w-[200px] truncate">{p.titulo_pta || "Sem título"}</TableCell>
                    <TableCell className="text-xs">{p.trabalhos_auditoria?.nome_trabalho}</TableCell>
                    <TableCell className="font-mono text-xs">{p.codigo_mcse || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(p.saldo_atual_total)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(p.valor_validado_total)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${hasDif ? "text-amber-600 font-semibold" : ""}`}>{fmt(p.diferenca_total)}</TableCell>
                    <TableCell className="text-center text-xs">{p.total_linhas_vinculadas || 0}</TableCell>
                    <TableCell className="text-center text-xs">{hasPend ? <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">{p.total_linhas_com_pendencia}</Badge> : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${st.cls}`}>{st.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <span className="text-xs text-muted-foreground p-2 block">{filtered.length} de {ptas.length} PTAs</span>
        </div>
      )}

      {selectedPta && (
        <PtaDetailDialog
          pta={selectedPta}
          onClose={() => setSelectedPta(null)}
        />
      )}

      {showGerar && (
        <GerarPtaDialog onClose={() => setShowGerar(false)} />
      )}
    </div>
  );
}
