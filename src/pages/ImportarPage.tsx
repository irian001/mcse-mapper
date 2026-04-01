import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchClientes } from "@/lib/supabase-queries";
import { suggestMcseCode, calcNivelClassificacao } from "@/lib/mcse-suggestion";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Check, Download, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

const EXPECTED_HEADERS = [
  "IDEMPRESA", "IDCONTA", "NOME", "ATIVA", "CLASSIFICACAO",
  "ANALITICA", "GRAU", "CLASMASC", "CONTABMP", "DATA_INCLUSAO",
  "TIPO_CONTAB", "GERAR_LANCTOS_CSO", "IDVERSAO",
];

interface ParsedRow {
  idempresa: string;
  idconta: string;
  nome: string;
  ativa: boolean;
  classificacao: string;
  analitica: boolean;
  grau: number | null;
  clasmasc: string;
  contabmp: string;
  data_inclusao: string;
  tipo_contab: string;
  gerar_lanctos_cso: boolean;
  idversao: string;
}

interface RowError {
  line: number;
  field: string;
  message: string;
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: number;
  duplicates: number;
  withSuggestion: number;
}

function parseBool(val: any): boolean {
  if (typeof val === "boolean") return val;
  const s = String(val).trim().toLowerCase();
  return ["s", "sim", "true", "1", "yes"].includes(s);
}

function parseIntSafe(val: any): number | null {
  if (val == null || val === "") return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

function downloadTemplate() {
  const header = EXPECTED_HEADERS.join(",");
  const example = "1,10001,CAIXA GERAL,S,1101.1,S,2,1101.1,D,2024-01-15,A,N,1";
  const csv = "\uFEFF" + header + "\n" + example + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_plano_contas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportarPage() {
  const qc = useQueryClient();
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: async () => { const { data } = await fetchClientes(); return data || []; } });

  const [selectedCliente, setSelectedCliente] = useState("");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [conflictMode, setConflictMode] = useState<"ignore" | "update" | "overwrite">("update");

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false, cellText: true, raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as any[][];

        if (json.length < 2) { toast.error("Arquivo vazio ou sem dados"); return; }

        const fileHeaders = json[0].map(h => String(h).trim().toUpperCase());

        // Map column indices
        const colIdx: Record<string, number> = {};
        EXPECTED_HEADERS.forEach(h => {
          const idx = fileHeaders.indexOf(h);
          if (idx >= 0) colIdx[h] = idx;
        });

        const missing = ["IDCONTA", "NOME", "CLASSIFICACAO"].filter(h => !(h in colIdx));
        if (missing.length) {
          toast.error(`Colunas obrigatórias não encontradas: ${missing.join(", ")}`);
          return;
        }

        const rows: ParsedRow[] = [];
        const rowErrors: RowError[] = [];
        const seenIds = new Set<string>();

        json.slice(1).forEach((row, i) => {
          const lineNum = i + 2;
          if (!row.some(c => c != null && c !== "")) return; // skip empty rows

          const get = (h: string) => (h in colIdx ? String(row[colIdx[h]] ?? "").trim() : "");

          const idconta = get("IDCONTA");
          const nome = get("NOME");
          const classificacao = get("CLASSIFICACAO");

          // Validate required
          if (!idconta) rowErrors.push({ line: lineNum, field: "IDCONTA", message: "Obrigatório" });
          if (!nome) rowErrors.push({ line: lineNum, field: "NOME", message: "Obrigatório" });
          if (!classificacao) rowErrors.push({ line: lineNum, field: "CLASSIFICACAO", message: "Obrigatório" });

          // Check duplicates within file
          if (idconta && seenIds.has(idconta)) {
            rowErrors.push({ line: lineNum, field: "IDCONTA", message: `Duplicado no arquivo (${idconta})` });
          }
          if (idconta) seenIds.add(idconta);

          rows.push({
            idempresa: get("IDEMPRESA"),
            idconta,
            nome,
            ativa: parseBool(get("ATIVA")),
            classificacao,
            analitica: parseBool(get("ANALITICA")),
            grau: parseIntSafe(get("GRAU")),
            clasmasc: get("CLASMASC"),
            contabmp: get("CONTABMP"),
            data_inclusao: get("DATA_INCLUSAO"),
            tipo_contab: get("TIPO_CONTAB"),
            gerar_lanctos_cso: parseBool(get("GERAR_LANCTOS_CSO")),
            idversao: get("IDVERSAO"),
          });
        });

        setParsedData(rows);
        setErrors(rowErrors);
        setStep("preview");
        toast.success(`${rows.length} linhas carregadas, ${rowErrors.length} erro(s)`);
      } catch {
        toast.error("Erro ao ler arquivo");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (errors.length > 0) throw new Error("Corrija os erros antes de importar");

      // Fetch existing accounts for this client
      const { data: existing } = await supabase
        .from("cliente_contas_origem")
        .select("idconta")
        .eq("cliente_id", selectedCliente);
      const existingIds = new Set((existing || []).map((e: any) => e.idconta));

      let created = 0, updated = 0, skipped = 0, withSuggestion = 0;

      const toInsert: any[] = [];
      const toUpdate: any[] = [];

      for (const r of parsedData) {
        const suggestion = suggestMcseCode(r.classificacao, r.nome);
        const nivel = calcNivelClassificacao(r.classificacao);
        if (suggestion) withSuggestion++;

        const row = {
          cliente_id: selectedCliente,
          idempresa: r.idempresa || null,
          idconta: r.idconta,
          nome: r.nome,
          ativa: r.ativa,
          classificacao: r.classificacao || null,
          analitica: r.analitica,
          grau: r.grau,
          clasmasc: r.clasmasc || null,
          contabmp: r.contabmp || null,
          data_inclusao: r.data_inclusao || null,
          tipo_contab: r.tipo_contab || null,
          gerar_lanctos_cso: r.gerar_lanctos_cso,
          idversao: r.idversao || null,
          nivel_classificacao: nivel,
          codigo_mcse_sugerido: suggestion,
          status_mapeamento: "nao_mapeado" as const,
        };

        if (existingIds.has(r.idconta)) {
          if (conflictMode === "ignore") { skipped++; continue; }
          toUpdate.push(row);
        } else {
          toInsert.push(row);
        }
      }

      // Insert new
      if (toInsert.length) {
        for (let i = 0; i < toInsert.length; i += 100) {
          const batch = toInsert.slice(i, i + 100);
          const { error } = await supabase.from("cliente_contas_origem").insert(batch);
          if (error) throw error;
        }
        created = toInsert.length;
      }

      // Update existing
      if (toUpdate.length) {
        for (const row of toUpdate) {
          const { cliente_id, idconta, ...updateData } = row;
          if (conflictMode === "update") {
            // Only update non-mapping fields
            const { status_mapeamento, codigo_mcse_sugerido, ...safeUpdate } = updateData;
            await supabase.from("cliente_contas_origem").update(safeUpdate).eq("cliente_id", selectedCliente).eq("idconta", idconta);
          } else {
            await supabase.from("cliente_contas_origem").update(updateData).eq("cliente_id", selectedCliente).eq("idconta", idconta);
          }
        }
        updated = toUpdate.length;
      }

      return { total: parsedData.length, created, updated, errors: 0, duplicates: skipped, withSuggestion };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["contas_origem"] });
      setImportResult(result);
      setStep("result");
      toast.success("Importação concluída!");
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const resetImport = () => {
    setParsedData([]);
    setErrors([]);
    setStep("upload");
    setImportResult(null);
  };

  return (
    <div>
      <PageHeader title="Importar Plano de Contas" description="Importar CSV ou Excel com o plano de contas de origem do cliente" />

      <div className="flex items-center gap-4 mb-4">
        <div>
          <Label>Cliente</Label>
          <Select value={selectedCliente} onValueChange={v => { setSelectedCliente(v); resetImport(); }}>
            <SelectTrigger className="w-80"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
            <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {selectedCliente && (
          <Button variant="outline" onClick={downloadTemplate} className="mt-5">
            <Download size={14} className="mr-1" /> Baixar Template
          </Button>
        )}
      </div>

      {selectedCliente && step === "upload" && (
        <Card className="max-w-lg">
          <CardContent className="pt-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Arraste um arquivo CSV ou Excel</p>
              <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="max-w-xs mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <div>
          {errors.length > 0 && (
            <Card className="mb-4 border-destructive/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle size={14} /> {errors.length} erro(s) encontrado(s) — importação bloqueada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-auto text-xs space-y-0.5">
                  {errors.map((err, i) => (
                    <div key={i} className="text-destructive">Linha {err.line}: [{err.field}] {err.message}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{parsedData.length} linhas carregadas</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Duplicados:</Label>
                <Select value={conflictMode} onValueChange={(v: any) => setConflictMode(v)}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ignore">Ignorar</SelectItem>
                    <SelectItem value="update">Atualizar</SelectItem>
                    <SelectItem value="overwrite">Sobrescrever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={resetImport}>Cancelar</Button>
              <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending || errors.length > 0}>
                <Check size={14} className="mr-1" /> Importar {parsedData.length} contas
              </Button>
            </div>
          </div>

          <div className="rounded border bg-card max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IDCONTA</TableHead>
                  <TableHead>NOME</TableHead>
                  <TableHead>CLASSIFICACAO</TableHead>
                  <TableHead>GRAU</TableHead>
                  <TableHead>ATIVA</TableHead>
                  <TableHead>ANALITICA</TableHead>
                  <TableHead>TIPO_CONTAB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.slice(0, 200).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{r.idconta}</TableCell>
                    <TableCell className="text-sm">{r.nome}</TableCell>
                    <TableCell className="font-mono text-sm">{r.classificacao}</TableCell>
                    <TableCell>{r.grau ?? "—"}</TableCell>
                    <TableCell>{r.ativa ? "S" : "N"}</TableCell>
                    <TableCell>{r.analitica ? "S" : "N"}</TableCell>
                    <TableCell>{r.tipo_contab || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedData.length > 200 && <p className="text-center text-xs text-muted-foreground py-2">Mostrando 200 de {parsedData.length}</p>}
          </div>
        </div>
      )}

      {step === "result" && importResult && (
        <Card className="max-w-md">
          <CardHeader><CardTitle className="text-base">Resultado da Importação</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Total de linhas:</span>
              <span className="font-medium">{importResult.total}</span>
              <span className="text-muted-foreground">Criadas:</span>
              <Badge variant="outline" className="bg-success/10 text-success w-fit">{importResult.created}</Badge>
              <span className="text-muted-foreground">Atualizadas:</span>
              <Badge variant="outline" className="bg-info/10 text-info w-fit">{importResult.updated}</Badge>
              <span className="text-muted-foreground">Duplicadas (ignoradas):</span>
              <span className="font-medium">{importResult.duplicates}</span>
              <span className="text-muted-foreground">Com erro:</span>
              <span className="font-medium">{importResult.errors}</span>
              <span className="text-muted-foreground">Com sugestão MCSE:</span>
              <Badge variant="outline" className="bg-accent/50 w-fit">{importResult.withSuggestion}</Badge>
            </div>
            <Button className="w-full mt-4" onClick={resetImport}>Nova Importação</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
