import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileSpreadsheet } from "lucide-react";

type ImportTarget = "grupos" | "subgrupos" | "contas";

interface ColumnMapping {
  [csvCol: string]: string;
}

const targetFields: Record<ImportTarget, { value: string; label: string; required?: boolean }[]> = {
  grupos: [
    { value: "codigo_grupo", label: "Código", required: true },
    { value: "descricao_grupo", label: "Descrição", required: true },
    { value: "ordem", label: "Ordem" },
  ],
  subgrupos: [
    { value: "codigo_subgrupo", label: "Código", required: true },
    { value: "descricao_subgrupo", label: "Descrição", required: true },
    { value: "ordem", label: "Ordem" },
  ],
  contas: [
    { value: "codigo_mcse", label: "Código MCSE", required: true },
    { value: "descricao_conta", label: "Descrição", required: true },
    { value: "natureza", label: "Natureza" },
    { value: "nivel", label: "Nível" },
    { value: "aceita_lancamento", label: "Aceita Lançamento" },
    { value: "conta_critica", label: "Conta Crítica" },
    { value: "aceita_reg_soc", label: "Reg. Societário" },
  ],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ImportTarget;
  grupoId?: string;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
  return { headers, rows };
}

function autoMap(csvHeaders: string[], target: ImportTarget): ColumnMapping {
  const mapping: ColumnMapping = {};
  const fields = targetFields[target];

  for (const h of csvHeaders) {
    const lower = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const f of fields) {
      const fLower = f.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(fLower) || lower.includes(f.value.replace(/_/g, ""))) {
        mapping[h] = f.value;
        break;
      }
    }
    // fallback: codigo
    if (!mapping[h] && lower.includes("codigo")) {
      const codeField = fields.find((f) => f.value.startsWith("codigo"));
      if (codeField) mapping[h] = codeField.value;
    }
    if (!mapping[h] && lower.includes("descri")) {
      const descField = fields.find((f) => f.value.startsWith("descri"));
      if (descField) mapping[h] = descField.value;
    }
  }
  return mapping;
}

export default function ImportMcseDialog({ open, onOpenChange, target, grupoId }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      setCsvData(parsed);
      setMapping(autoMap(parsed.headers, target));
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (!csvData) return;

    const fields = targetFields[target];
    const requiredFields = fields.filter((f) => f.required).map((f) => f.value);
    const mappedFields = Object.values(mapping);
    const missing = requiredFields.filter((r) => !mappedFields.includes(r));
    if (missing.length > 0) {
      toast.error(`Campos obrigatórios não mapeados: ${missing.join(", ")}`);
      return;
    }

    setImporting(true);
    try {
      const reverseMap: Record<string, string> = {};
      for (const [csv, db] of Object.entries(mapping)) {
        if (db && db !== "ignorar") reverseMap[db] = csv;
      }

      const records = csvData.rows.map((row) => {
        const record: Record<string, any> = {};
        for (const [dbField, csvCol] of Object.entries(reverseMap)) {
          const idx = csvData.headers.indexOf(csvCol);
          if (idx >= 0) {
            let val: any = row[idx];
            if (["ordem", "nivel", "nivel_origem"].includes(dbField)) val = parseInt(val) || 0;
            if (["aceita_lancamento", "conta_critica", "aceita_reg_soc"].includes(dbField))
              val = ["true", "1", "sim", "s", "yes"].includes((val || "").toLowerCase());
            record[dbField] = val;
          }
        }
        if (target === "subgrupos" && grupoId) record.grupo_id = grupoId;
        if (target === "contas" && grupoId) record.grupo_id = grupoId;
        if (target === "contas" && !record.natureza) record.natureza = "ativo";
        return record;
      }).filter((r) => Object.keys(r).length > 0);

      if (records.length === 0) {
        toast.error("Nenhum registro válido para importar");
        return;
      }

      const tableName = target === "grupos" ? "mcse_grupos" : target === "subgrupos" ? "mcse_subgrupos" : "mcse_contas";
      const { error } = await supabase.from(tableName).insert(records as any);
      if (error) throw error;

      toast.success(`${records.length} registros importados com sucesso!`);
      qc.invalidateQueries({ queryKey: [`mcse_${target}`] });
      setCsvData(null);
      setMapping({});
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro na importação: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setCsvData(null);
    setMapping({});
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={18} />
            Importar {target === "grupos" ? "Grupos" : target === "subgrupos" ? "Subgrupos" : "Contas"} via CSV
          </DialogTitle>
        </DialogHeader>

        {!csvData ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center w-full">
              <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Selecione um arquivo CSV (separado por vírgula ou ponto-e-vírgula)</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>Escolher arquivo</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Mapeamento de colunas</Label>
              <p className="text-xs text-muted-foreground mb-2">Associe cada coluna do CSV ao campo correspondente</p>
              <div className="grid grid-cols-2 gap-2">
                {csvData.headers.map((h) => (
                  <div key={h} className="flex items-center gap-2">
                    <span className="text-sm font-mono truncate w-32 shrink-0">{h}</span>
                    <Select value={mapping[h] || "ignorar"} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignorar">— Ignorar —</SelectItem>
                        {targetFields[target].map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label} {f.required ? "*" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Preview ({Math.min(csvData.rows.length, 5)} de {csvData.rows.length} linhas)</Label>
              <div className="rounded border overflow-x-auto mt-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvData.headers.map((h) => (
                        <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-xs py-1">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importando..." : `Importar ${csvData.rows.length} registros`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
