import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchClientes, fetchContasOrigem } from "@/lib/supabase-queries";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check } from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedRow {
  codigo: string;
  descricao: string;
  natureza: string;
  nivel?: number;
}

export default function ImportarPage() {
  const qc = useQueryClient();
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: async () => { const { data } = await fetchClientes(); return data || []; } });

  const [selectedCliente, setSelectedCliente] = useState("");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [colMap, setColMap] = useState({ codigo: "", descricao: "", natureza: "" });
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (json.length < 2) { toast.error("Arquivo vazio ou sem dados"); return; }

        const h = json[0].map(String);
        setHeaders(h);
        setRawRows(json.slice(1).filter(r => r.some(c => c != null && c !== "")));

        // Auto-map columns
        const autoMap = { codigo: "", descricao: "", natureza: "" };
        h.forEach((col, i) => {
          const lower = col.toLowerCase();
          if (lower.includes("codigo") || lower.includes("código") || lower.includes("conta") || lower === "code") autoMap.codigo = String(i);
          if (lower.includes("descri") || lower.includes("nome") || lower === "description") autoMap.descricao = String(i);
          if (lower.includes("natureza") || lower.includes("tipo") || lower.includes("nature")) autoMap.natureza = String(i);
        });
        setColMap(autoMap);
        setStep("map");
        toast.success(`${json.length - 1} linhas carregadas`);
      } catch {
        toast.error("Erro ao ler arquivo");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const applyMapping = () => {
    if (!colMap.codigo || !colMap.descricao) { toast.error("Mapeie pelo menos código e descrição"); return; }
    const ci = parseInt(colMap.codigo);
    const di = parseInt(colMap.descricao);
    const ni = colMap.natureza ? parseInt(colMap.natureza) : -1;

    const mapped = rawRows.map(row => ({
      codigo: String(row[ci] || "").trim(),
      descricao: String(row[di] || "").trim(),
      natureza: ni >= 0 ? String(row[ni] || "").trim() : "",
      nivel: String(row[ci] || "").split(".").length,
    })).filter(r => r.codigo);

    setParsedData(mapped);
    setStep("preview");
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const rows = parsedData.map(r => ({
        cliente_id: selectedCliente,
        codigo_origem: r.codigo,
        descricao_origem: r.descricao,
        natureza_origem: r.natureza || null,
        nivel_origem: r.nivel || null,
      }));

      // Insert in batches of 100
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await supabase.from("cliente_contas_origem").upsert(batch, { onConflict: "cliente_id,codigo_origem" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas_origem"] });
      toast.success(`${parsedData.length} contas importadas com sucesso!`);
      setParsedData([]);
      setStep("upload");
    },
    onError: (err: any) => toast.error("Erro na importação: " + err.message),
  });

  return (
    <div>
      <PageHeader title="Importar Plano de Contas" description="Importar CSV ou Excel com o plano de contas do cliente" />

      <div className="mb-4">
        <Label>Cliente</Label>
        <Select value={selectedCliente} onValueChange={setSelectedCliente}>
          <SelectTrigger className="w-80"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
          <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {selectedCliente && step === "upload" && (
        <Card className="max-w-lg">
          <CardContent className="pt-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Arraste um arquivo CSV ou Excel, ou clique para selecionar</p>
              <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="max-w-xs mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "map" && (
        <Card className="max-w-lg">
          <CardHeader><CardTitle className="text-base">Mapear Colunas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "codigo" as const, label: "Código da conta" },
              { key: "descricao" as const, label: "Descrição" },
              { key: "natureza" as const, label: "Natureza (opcional)" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Select value={colMap[key]} onValueChange={v => setColMap(f => ({ ...f, [key]: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Não mapear —</SelectItem>
                    {headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button className="w-full" onClick={applyMapping}>Aplicar Mapeamento</Button>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{parsedData.length} contas identificadas</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("map")}>Voltar</Button>
              <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                <Check size={14} className="mr-1" /> Importar {parsedData.length} contas
              </Button>
            </div>
          </div>
          <div className="rounded border bg-card max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-28">Natureza</TableHead>
                  <TableHead className="w-16">Nível</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.slice(0, 200).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{r.codigo}</TableCell>
                    <TableCell>{r.descricao}</TableCell>
                    <TableCell className="text-sm">{r.natureza || "—"}</TableCell>
                    <TableCell>{r.nivel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedData.length > 200 && <p className="text-center text-xs text-muted-foreground py-2">Mostrando 200 de {parsedData.length} linhas</p>}
          </div>
        </div>
      )}
    </div>
  );
}
