import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ImportTarget = "grupos" | "subgrupos" | "contas";
type ConflictMode = "ignorar" | "atualizar" | "sobrescrever";

interface ValidationError {
  line: number;
  field: string;
  message: string;
}

interface ImportResult {
  processed: number;
  created: number;
  updated: number;
  errors: number;
  errorDetails: ValidationError[];
}

interface ParsedRow {
  [key: string]: string;
}

const requiredFields: Record<ImportTarget, string[]> = {
  grupos: ["codigo_grupo", "descricao_grupo"],
  subgrupos: ["codigo_subgrupo", "descricao_subgrupo"],
  contas: ["codigo_mcse", "descricao_conta"],
};

const codeField: Record<ImportTarget, string> = {
  grupos: "codigo_grupo",
  subgrupos: "codigo_subgrupo",
  contas: "codigo_mcse",
};

const validBooleans = ["true", "false", "1", "0", "sim", "nao", "não", "s", "n", "yes", "no"];

function parseBool(val: string): boolean {
  return ["true", "1", "sim", "s", "yes"].includes(val.toLowerCase().trim());
}

function parseCsv(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, "").replace(/^\uFEFF/, ""));
  const rows = lines.slice(1).map((l) => {
    const cells = l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: ParsedRow = {};
    headers.forEach((h, i) => (row[h] = cells[i] || ""));
    return row;
  });
  return { headers, rows };
}

function validateRows(rows: ParsedRow[], target: ImportTarget): ValidationError[] {
  const errors: ValidationError[] = [];
  const codes = new Set<string>();
  const cf = codeField[target];
  const req = requiredFields[target];

  rows.forEach((row, idx) => {
    const line = idx + 2; // header is line 1

    // Required fields
    for (const field of req) {
      if (!row[field]?.trim()) {
        errors.push({ line, field, message: `"${field}" é obrigatório` });
      }
    }

    // Duplicate code in file
    const code = row[cf]?.trim();
    if (code) {
      if (codes.has(code)) {
        errors.push({ line, field: cf, message: `Código "${code}" duplicado no arquivo` });
      }
      codes.add(code);
    }

    // ordem must be number
    if (row.ordem !== undefined && row.ordem.trim() !== "") {
      if (isNaN(Number(row.ordem))) {
        errors.push({ line, field: "ordem", message: `"ordem" deve ser um número` });
      }
    }

    // nivel must be number
    if (row.nivel !== undefined && row.nivel.trim() !== "") {
      if (isNaN(Number(row.nivel))) {
        errors.push({ line, field: "nivel", message: `"nivel" deve ser um número` });
      }
    }

    // boolean fields
    const boolFields = ["ativo", "aceita_lancamento", "conta_critica", "aceita_reg_soc"];
    for (const bf of boolFields) {
      if (row[bf] !== undefined && row[bf].trim() !== "") {
        if (!validBooleans.includes(row[bf].toLowerCase().trim())) {
          errors.push({ line, field: bf, message: `"${bf}" deve ser booleano (true/false/sim/nao)` });
        }
      }
    }
  });

  return errors;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ImportTarget;
  grupoId?: string;
}

export default function ImportMcseDialog({ open, onOpenChange, target, grupoId }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: ParsedRow[] } | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [conflictMode, setConflictMode] = useState<ConflictMode>("ignorar");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.rows.length === 0) {
        toast.error("Arquivo vazio ou sem dados");
        return;
      }
      const errors = validateRows(parsed.rows, target);
      setCsvData(parsed);
      setValidationErrors(errors);
      setResult(null);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (!csvData || validationErrors.length > 0) return;
    setImporting(true);
    const res: ImportResult = { processed: csvData.rows.length, created: 0, updated: 0, errors: 0, errorDetails: [] };

    try {
      const cf = codeField[target];
      const tableName = target === "grupos" ? "mcse_grupos" : target === "subgrupos" ? "mcse_subgrupos" : "mcse_contas";

      // Fetch existing codes
      const codeColumn = target === "grupos" ? "codigo_grupo" : target === "subgrupos" ? "codigo_subgrupo" : "codigo_mcse";
      const { data: existingData } = await supabase.from(tableName).select(`id, ${codeColumn}`);
      const existingMap = new Map<string, string>();
      (existingData || []).forEach((r: any) => existingMap.set(r[codeColumn], r.id));

      // Also fetch grupo lookup for subgrupos/contas
      let grupoLookup = new Map<string, string>();
      if (target === "subgrupos" || target === "contas") {
        const { data: gData } = await supabase.from("mcse_grupos").select("id, codigo_grupo");
        (gData || []).forEach((g: any) => grupoLookup.set(g.codigo_grupo, g.id));
      }
      let subgrupoLookup = new Map<string, string>();
      if (target === "contas") {
        const { data: sData } = await supabase.from("mcse_subgrupos").select("id, codigo_subgrupo");
        (sData || []).forEach((s: any) => subgrupoLookup.set(s.codigo_subgrupo, s.id));
      }

      const toInsert: any[] = [];
      const toUpdate: { id: string; data: any }[] = [];

      for (let i = 0; i < csvData.rows.length; i++) {
        const row = csvData.rows[i];
        const code = row[cf]?.trim();
        const existingId = existingMap.get(code);

        try {
          let record: any = {};
          if (target === "grupos") {
            record = {
              codigo_grupo: code,
              descricao_grupo: row.descricao_grupo?.trim(),
              ordem: row.ordem?.trim() ? parseInt(row.ordem) : 0,
              ativo: row.ativo?.trim() ? parseBool(row.ativo) : true,
            };
          } else if (target === "subgrupos") {
            const gid = grupoId || (row.grupo_codigo?.trim() ? grupoLookup.get(row.grupo_codigo.trim()) : undefined);
            if (!gid) {
              res.errors++;
              res.errorDetails.push({ line: i + 2, field: "grupo_codigo", message: `Grupo "${row.grupo_codigo}" não encontrado` });
              continue;
            }
            record = {
              codigo_subgrupo: code,
              descricao_subgrupo: row.descricao_subgrupo?.trim(),
              grupo_id: gid,
              ordem: row.ordem?.trim() ? parseInt(row.ordem) : 0,
              ativo: row.ativo?.trim() ? parseBool(row.ativo) : true,
            };
          } else {
            const gid = grupoId || (row.grupo_codigo?.trim() ? grupoLookup.get(row.grupo_codigo.trim()) : undefined);
            if (!gid) {
              res.errors++;
              res.errorDetails.push({ line: i + 2, field: "grupo_codigo", message: `Grupo "${row.grupo_codigo}" não encontrado` });
              continue;
            }
            const sid = row.subgrupo_codigo?.trim() ? subgrupoLookup.get(row.subgrupo_codigo.trim()) : null;
            record = {
              codigo_mcse: code,
              descricao_conta: row.descricao_conta?.trim(),
              grupo_id: gid,
              subgrupo_id: sid || null,
              natureza: row.natureza?.trim() || "ativo",
              nivel: row.nivel?.trim() ? parseInt(row.nivel) : 1,
              aceita_lancamento: row.aceita_lancamento?.trim() ? parseBool(row.aceita_lancamento) : false,
              conta_critica: row.conta_critica?.trim() ? parseBool(row.conta_critica) : false,
              aceita_reg_soc: row.aceita_reg_soc?.trim() ? parseBool(row.aceita_reg_soc) : false,
              ativo: row.ativo?.trim() ? parseBool(row.ativo) : true,
            };
          }

          if (existingId) {
            if (conflictMode === "ignorar") {
              // skip
            } else if (conflictMode === "atualizar" || conflictMode === "sobrescrever") {
              toUpdate.push({ id: existingId, data: record });
            }
          } else {
            toInsert.push(record);
          }
        } catch (err: any) {
          res.errors++;
          res.errorDetails.push({ line: i + 2, field: "-", message: err.message });
        }
      }

      // Batch insert
      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += 100) {
          const batch = toInsert.slice(i, i + 100);
          const { error } = await supabase.from(tableName).insert(batch);
          if (error) throw error;
        }
        res.created = toInsert.length;
      }

      // Batch update
      for (const item of toUpdate) {
        const { error } = await supabase.from(tableName).update(item.data).eq("id", item.id);
        if (error) {
          res.errors++;
          res.errorDetails.push({ line: 0, field: "-", message: error.message });
        } else {
          res.updated++;
        }
      }

      setResult(res);
      qc.invalidateQueries({ queryKey: [`mcse_${target}`] });
      if (res.errors === 0) {
        toast.success(`Importação concluída: ${res.created} criados, ${res.updated} atualizados`);
      } else {
        toast.warning(`Importação com erros: ${res.created} criados, ${res.updated} atualizados, ${res.errors} erros`);
      }
    } catch (err: any) {
      toast.error(`Erro na importação: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setCsvData(null);
    setValidationErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const hasErrors = validationErrors.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={18} />
            Importar {target === "grupos" ? "Grupos" : target === "subgrupos" ? "Subgrupos" : "Contas"} via CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {!csvData && !result && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center w-full">
              <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Selecione um arquivo CSV (separado por vírgula ou ponto-e-vírgula)</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>Escolher arquivo</Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview + Validation */}
        {csvData && !result && (
          <div className="space-y-4">
            {/* Validation errors */}
            {hasErrors && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                  <AlertTriangle size={16} />
                  {validationErrors.length} erro(s) encontrado(s) — corrija o arquivo antes de importar
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {validationErrors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive">
                      Linha {e.line}: {e.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Conflict mode */}
            {!hasErrors && (
              <div className="rounded border p-3">
                <Label className="text-sm font-medium mb-2 block">Se o código já existir no sistema:</Label>
                <RadioGroup value={conflictMode} onValueChange={(v) => setConflictMode(v as ConflictMode)} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ignorar" id="ignorar" />
                    <Label htmlFor="ignorar" className="text-sm cursor-pointer">Ignorar</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="atualizar" id="atualizar" />
                    <Label htmlFor="atualizar" className="text-sm cursor-pointer">Atualizar</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="sobrescrever" id="sobrescrever" />
                    <Label htmlFor="sobrescrever" className="text-sm cursor-pointer">Sobrescrever</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Preview table */}
            <div>
              <Label className="text-sm font-medium">Preview ({Math.min(csvData.rows.length, 10)} de {csvData.rows.length} linhas)</Label>
              <div className="rounded border overflow-x-auto mt-1 max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-12">#</TableHead>
                      {csvData.headers.map((h) => (
                        <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.rows.slice(0, 10).map((row, i) => {
                      const lineErrors = validationErrors.filter((e) => e.line === i + 2);
                      return (
                        <TableRow key={i} className={lineErrors.length > 0 ? "bg-destructive/5" : ""}>
                          <TableCell className="text-xs text-muted-foreground">{i + 2}</TableCell>
                          {csvData.headers.map((h) => (
                            <TableCell key={h} className="text-xs py-1">{row[h] || ""}</TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {csvData.rows.length > 10 && (
                <p className="text-xs text-muted-foreground mt-1">... e mais {csvData.rows.length - 10} linhas</p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImport} disabled={importing || hasErrors}>
                {importing ? "Importando..." : `Importar ${csvData.rows.length} registros`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {result && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <CheckCircle2 size={20} className="text-green-600" />
              Importação concluída
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border p-3 text-center">
                <p className="text-2xl font-bold">{result.processed}</p>
                <p className="text-xs text-muted-foreground">Linhas processadas</p>
              </div>
              <div className="rounded border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.created}</p>
                <p className="text-xs text-muted-foreground">Criadas</p>
              </div>
              <div className="rounded border p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                <p className="text-xs text-muted-foreground">Atualizadas</p>
              </div>
              <div className="rounded border p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                <p className="text-xs text-muted-foreground">Com erro</p>
              </div>
            </div>
            {result.errorDetails.length > 0 && (
              <div className="rounded border border-destructive/30 p-3 max-h-40 overflow-y-auto">
                {result.errorDetails.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {e.line > 0 ? `Linha ${e.line}: ` : ""}{e.message}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
