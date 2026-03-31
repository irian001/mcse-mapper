import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchClientes, fetchContasOrigem } from "@/lib/supabase-queries";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const statusLabels: Record<string, { label: string; className: string }> = {
  nao_mapeado: { label: "Não Mapeado", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  mapeado_automatico: { label: "Auto", className: "bg-info/15 text-info border-info/30" },
  mapeado_manual: { label: "Manual", className: "bg-info/15 text-info border-info/30" },
  homologado: { label: "Homologado", className: "bg-success/15 text-success border-success/30" },
};

export default function PlanoContasPage() {
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: async () => { const { data } = await fetchClientes(); return data || []; } });
  const [selectedCliente, setSelectedCliente] = useState("");
  const [search, setSearch] = useState("");
  const [filterAnalitica, setFilterAnalitica] = useState<"all" | "S" | "N">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "nao_mapeado">("all");
  const [filterGrau, setFilterGrau] = useState<"all" | string>("all");

  const { data: contas = [] } = useQuery({
    queryKey: ["contas_origem", selectedCliente],
    queryFn: async () => { if (!selectedCliente) return []; const { data } = await fetchContasOrigem(selectedCliente); return data || []; },
    enabled: !!selectedCliente,
  });

  const graus = useMemo(() => {
    const set = new Set<number>();
    contas.forEach((c: any) => { if (c.grau != null) set.add(c.grau); });
    return Array.from(set).sort((a, b) => a - b);
  }, [contas]);

  const filtered = useMemo(() => {
    let list = contas;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((c: any) =>
        (c.idconta || "").toLowerCase().includes(s) ||
        (c.nome || "").toLowerCase().includes(s) ||
        (c.classificacao || "").toLowerCase().includes(s)
      );
    }
    if (filterAnalitica !== "all") list = list.filter((c: any) => c.analitica === (filterAnalitica === "S"));
    if (filterStatus === "nao_mapeado") list = list.filter((c: any) => c.status_mapeamento === "nao_mapeado");
    if (filterGrau !== "all") list = list.filter((c: any) => c.grau === parseInt(filterGrau));
    return list;
  }, [contas, search, filterAnalitica, filterStatus, filterGrau]);

  return (
    <div>
      <PageHeader title="Plano de Contas do Cliente" description="Visualizar o plano de contas importado" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={selectedCliente} onValueChange={setSelectedCliente}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
          <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
        </Select>
        {selectedCliente && (
          <>
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filterAnalitica} onValueChange={(v: any) => setFilterAnalitica(v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="S">Analíticas</SelectItem>
                <SelectItem value="N">Sintéticas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="nao_mapeado">Não mapeados</SelectItem>
              </SelectContent>
            </Select>
            {graus.length > 0 && (
              <Select value={filterGrau} onValueChange={setFilterGrau}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Grau</SelectItem>
                  {graus.map(g => <SelectItem key={g} value={String(g)}>Grau {g}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </>
        )}
      </div>

      {selectedCliente && filtered.length > 0 && (
        <div className="rounded border bg-card overflow-auto max-h-[calc(100vh-240px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>IDCONTA</TableHead>
                <TableHead>NOME</TableHead>
                <TableHead>CLASSIFICACAO</TableHead>
                <TableHead>GRAU</TableHead>
                <TableHead>ATIVA</TableHead>
                <TableHead>ANALITICA</TableHead>
                <TableHead>TIPO</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Sugestão MCSE</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 500).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.idconta}</TableCell>
                  <TableCell className="text-sm">{c.nome}</TableCell>
                  <TableCell className="font-mono text-sm">{c.classificacao}</TableCell>
                  <TableCell>{c.grau ?? "—"}</TableCell>
                  <TableCell>{c.ativa ? "S" : "N"}</TableCell>
                  <TableCell>{c.analitica ? "S" : "N"}</TableCell>
                  <TableCell className="text-xs">{c.tipo_contab || "—"}</TableCell>
                  <TableCell>{c.nivel_classificacao}</TableCell>
                  <TableCell className="text-xs">{c.codigo_mcse_sugerido || "—"}</TableCell>
                  <TableCell>
                    {statusLabels[c.status_mapeamento] ? (
                      <Badge variant="outline" className={`text-xs ${statusLabels[c.status_mapeamento].className}`}>
                        {statusLabels[c.status_mapeamento].label}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length > 500 && <p className="text-center text-xs text-muted-foreground py-2">Mostrando 500 de {filtered.length}</p>}
        </div>
      )}

      {selectedCliente && contas.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <p>Nenhuma conta importada para este cliente</p>
          <p className="text-sm mt-1">Vá para "Importar Contas" para carregar o plano de contas</p>
        </div>
      )}
    </div>
  );
}
