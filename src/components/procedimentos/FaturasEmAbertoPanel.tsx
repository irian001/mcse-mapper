import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Search } from "lucide-react";
import ImportFaturasAbertoDialog from "./ImportFaturasAbertoDialog";
import CadastroClassesFaturamento from "./CadastroClassesFaturamento";
import CadastroMunicipiosFaturamento from "./CadastroMunicipiosFaturamento";
import FaturasEmAbertoDashboard from "./FaturasEmAbertoDashboard";

interface Props { procedimento: any; }

const fmtBRL = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FaturasEmAbertoPanel({ procedimento }: Props) {
  const procedimentoId = procedimento.id;
  const clienteId = procedimento.cliente_id;
  const [openImport, setOpenImport] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLote, setFilterLote] = useState("all");
  const [filterClasse, setFilterClasse] = useState("all");
  const [filterMun, setFilterMun] = useState("all");
  const [filterSit, setFilterSit] = useState("all");

  const { data: lotes = [] } = useQuery({
    queryKey: ["fab-lotes", procedimentoId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimento_faturas_aberto_lotes")
        .select("*").eq("procedimento_auxiliar_id", procedimentoId)
        .order("data_importacao", { ascending: false });
      if (error) throw error; return data || [];
    },
  });

  // Itens — paginação manual
  const { data: itens = [] } = useQuery({
    queryKey: ["fab-itens", procedimentoId],
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

  const resumo = useMemo(() => {
    const ucs = new Set<string>();
    let total = 0, classesNaoCadastradas = 0, munNaoCadastrados = 0;
    itens.forEach((i: any) => {
      if (i.uc) ucs.add(i.uc);
      total += Number(i.valor_em_aberto) || 0;
      if (i.classe_codigo && !i.classe_descricao_snapshot) classesNaoCadastradas++;
      if (i.municipio_codigo && !i.municipio_nome_snapshot) munNaoCadastrados++;
    });
    return {
      totalAberto: total, qtdFaturas: itens.length, qtdUcs: ucs.size,
      qtdLotes: lotes.length, classesNaoCadastradas, munNaoCadastrados,
      linhasComErro: lotes.reduce((s: number, l: any) => s + (l.quantidade_linhas_com_erro || 0), 0),
    };
  }, [itens, lotes]);

  const classesOpts = useMemo(
    () => Array.from(new Set(itens.map((i: any) => i.classe_codigo).filter(Boolean))).sort(),
    [itens]
  );
  const munOpts = useMemo(
    () => Array.from(new Set(itens.map((i: any) => i.municipio_codigo).filter(Boolean))).sort(),
    [itens]
  );
  const sitOpts = useMemo(
    () => Array.from(new Set(itens.map((i: any) => i.situacao_fornecimento).filter(Boolean))).sort(),
    [itens]
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return itens.filter((i: any) => {
      if (filterLote !== "all" && i.lote_importacao_id !== filterLote) return false;
      if (filterClasse !== "all" && i.classe_codigo !== filterClasse) return false;
      if (filterMun !== "all" && i.municipio_codigo !== filterMun) return false;
      if (filterSit !== "all" && i.situacao_fornecimento !== filterSit) return false;
      if (s) {
        const blob = `${i.uc} ${i.nome_consumidor || ""} ${i.numero_fatura || ""} ${i.numero_documento || ""}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [itens, search, filterLote, filterClasse, filterMun, filterSit]);

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <Kpi label="Valor em aberto" value={fmtBRL(resumo.totalAberto)} />
        <Kpi label="Faturas" value={String(resumo.qtdFaturas)} />
        <Kpi label="UCs" value={String(resumo.qtdUcs)} />
        <Kpi label="Lotes" value={String(resumo.qtdLotes)} />
        <Kpi label="Classes ñ cadast." value={String(resumo.classesNaoCadastradas)} warn={resumo.classesNaoCadastradas > 0} />
        <Kpi label="Munic. ñ cadast." value={String(resumo.munNaoCadastrados)} warn={resumo.munNaoCadastrados > 0} />
        <Kpi label="Linhas c/ erro" value={String(resumo.linhasComErro)} warn={resumo.linhasComErro > 0} />
      </div>

      <Tabs defaultValue="itens">
        <TabsList>
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="municipios">Municípios</TabsTrigger>
        </TabsList>

        <TabsContent value="itens" className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-2.5 text-muted-foreground" />
                <Input className="pl-7" placeholder="UC, consumidor, fatura/documento..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <FilterSel value={filterLote} onChange={setFilterLote} label="Lote" options={[
              { v: "all", l: "Todos lotes" },
              ...lotes.map((l: any) => ({ v: l.id, l: l.nome_arquivo || l.id.slice(0, 8) })),
            ]} />
            <FilterSel value={filterClasse} onChange={setFilterClasse} label="Classe" options={[{ v: "all", l: "Todas classes" }, ...classesOpts.map((c) => ({ v: c, l: c }))]} />
            <FilterSel value={filterMun} onChange={setFilterMun} label="Município" options={[{ v: "all", l: "Todos municípios" }, ...munOpts.map((c) => ({ v: c, l: c }))]} />
            <FilterSel value={filterSit} onChange={setFilterSit} label="Situação" options={[{ v: "all", l: "Todas situações" }, ...sitOpts.map((c) => ({ v: c, l: c }))]} />
            <Button onClick={() => setOpenImport(true)}><Upload size={14} /> Importar</Button>
          </div>

          <div className="border rounded overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow>
                  <TableHead>UC</TableHead><TableHead>Consumidor</TableHead><TableHead>Fatura/Doc</TableHead>
                  <TableHead>Emissão</TableHead><TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Atraso</TableHead>
                  <TableHead className="text-right">Valor Aberto</TableHead>
                  <TableHead>Situação</TableHead><TableHead>Classe</TableHead>
                  <TableHead>Município</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.uc}</TableCell>
                    <TableCell>{i.nome_consumidor || "-"}</TableCell>
                    <TableCell>{i.numero_fatura || i.numero_documento || "-"}</TableCell>
                    <TableCell>{i.data_emissao || "-"}</TableCell>
                    <TableCell>{i.data_vencimento || "-"}</TableCell>
                    <TableCell className="text-right">{i.dias_em_atraso ?? "-"}</TableCell>
                    <TableCell className="text-right">{fmtBRL(i.valor_em_aberto)}</TableCell>
                    <TableCell>{i.situacao_fornecimento || "-"}</TableCell>
                    <TableCell>{i.classe_descricao_snapshot || i.classe_codigo || "-"}</TableCell>
                    <TableCell>{i.municipio_nome_snapshot || i.municipio_codigo || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 500 && (
            <p className="text-xs text-muted-foreground">Exibindo 500 de {filtered.length} itens. Refine os filtros para ver mais.</p>
          )}
        </TabsContent>

        <TabsContent value="lotes">
          <div className="border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead><TableHead>Data</TableHead>
                  <TableHead className="text-right">Lidas</TableHead><TableHead className="text-right">Importadas</TableHead>
                  <TableHead className="text-right">Erros</TableHead><TableHead className="text-right">Alertas</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="flex items-center gap-2"><FileSpreadsheet size={14} /> {l.nome_arquivo}</TableCell>
                    <TableCell>{new Date(l.data_importacao).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{l.quantidade_linhas_lidas}</TableCell>
                    <TableCell className="text-right">{l.quantidade_linhas_importadas}</TableCell>
                    <TableCell className="text-right">{l.quantidade_linhas_com_erro}</TableCell>
                    <TableCell className="text-right">{l.quantidade_alertas}</TableCell>
                    <TableCell className="text-right">{fmtBRL(l.valor_total_importado)}</TableCell>
                    <TableCell><Badge variant="outline">{l.status_importacao || "-"}</Badge></TableCell>
                  </TableRow>
                ))}
                {lotes.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Nenhum lote importado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="classes"><CadastroClassesFaturamento clienteId={clienteId} /></TabsContent>
        <TabsContent value="municipios"><CadastroMunicipiosFaturamento clienteId={clienteId} /></TabsContent>
      </Tabs>

      <ImportFaturasAbertoDialog open={openImport} onClose={() => setOpenImport(false)} procedimento={procedimento} />
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${warn ? "text-warning" : ""}`}>{value}</div>
    </CardContent></Card>
  );
}

function FilterSel({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: { v: string; l: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
    </Select>
  );
}
