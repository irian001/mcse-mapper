import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, AlertTriangle, ArrowLeft, ArrowRight, Check, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

export interface FieldDef { key: string; label: string; required?: boolean; hints: string[]; }

interface Props {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  table: string;            // ex: "cliente_classes_faturamento"
  uniqueKey: string;        // ex: "codigo_classe"
  title: string;            // ex: "Importar Classes"
  fields: FieldDef[];
  invalidateKey: any[];     // react-query key to invalidate
}

const parseBool = (v: any): boolean => {
  if (v == null || v === "") return true;
  const s = String(v).trim().toLowerCase();
  return !["nao", "não", "false", "0", "n", "inativo"].includes(s);
};

export default function ImportCadastroAuxiliarDialog({
  open, onClose, clienteId, table, uniqueKey, title, fields, invalidateKey,
}: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [parsed, setParsed] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [result, setResult] = useState<any>(null);

  const reset = () => {
    setStep("upload"); setFileName(""); setHeaders([]); setRawRows([]);
    setMapping({}); setParsed([]); setErrors([]); setResult(null);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) return toast.error("Use CSV ou XLSX");
    setFileName(f.name);
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as any[][];
        if (json.length < 2) return toast.error("Arquivo vazio");
        const hs = (json[0] as any[]).map((h) => String(h ?? "").trim());
        setHeaders(hs); setRawRows(json.slice(1));
        const lower = hs.map((h) => h.toLowerCase());
        const auto: Record<string, number> = {};
        fields.forEach((f) => {
          const idx = lower.findIndex((h) => f.hints.some((k) => h.includes(k)));
          auto[f.key] = idx;
        });
        setMapping(auto); setStep("mapping");
      } catch { toast.error("Erro ao ler o arquivo"); }
    };
    r.readAsArrayBuffer(f);
  };

  const applyMapping = () => {
    for (const f of fields) {
      if (f.required && (mapping[f.key] ?? -1) < 0) return toast.error(`Mapeie a coluna obrigatória: ${f.label}`);
    }
    const items: any[] = [];
    const errs: { line: number; message: string }[] = [];
    rawRows.forEach((row, idx) => {
      const lineNum = idx + 2;
      if (!row.some((c) => c != null && c !== "")) return;
      const get = (k: string) => { const i = mapping[k] ?? -1; return i >= 0 ? row[i] : undefined; };
      const obj: any = { cliente_id: clienteId };
      let valid = true;
      fields.forEach((f) => {
        const raw = get(f.key);
        let val: any = raw == null ? null : (typeof raw === "string" ? raw.trim() : raw);
        if (f.key === "ativo") val = parseBool(raw);
        if (val === "") val = null;
        if (f.required && (val == null || val === "")) {
          errs.push({ line: lineNum, message: `${f.label} obrigatório` });
          valid = false;
        }
        if (val != null && val !== "") obj[f.key] = typeof val === "string" ? val : val;
      });
      if (valid) items.push(obj);
    });
    setParsed(items); setErrors(errs); setStep("preview");
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (errors.length > 0) throw new Error("Corrija os erros antes de importar");
      // Carrega existentes para este cliente (chave única = cliente_id + uniqueKey)
      const { data: existentes } = await (supabase as any)
        .from(table).select(`id, ${uniqueKey}`).eq("cliente_id", clienteId);
      const exMap = new Map<string, string>();
      (existentes || []).forEach((e: any) => exMap.set(String(e[uniqueKey]), e.id));

      let created = 0, updated = 0, failed = 0;
      for (const it of parsed) {
        const k = String(it[uniqueKey] ?? "");
        const existingId = exMap.get(k);
        if (existingId) {
          const { error } = await (supabase as any).from(table).update(it).eq("id", existingId);
          if (error) failed++; else updated++;
        } else {
          const { error } = await (supabase as any).from(table).insert([it]);
          if (error) failed++; else created++;
        }
      }
      return { created, updated, failed };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: invalidateKey });
      setResult(res); setStep("result");
      toast.success(`${res.created} criado(s), ${res.updated} atualizado(s)`);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao importar"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet size={18} /> {title}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <Label>Arquivo CSV ou XLSX</Label>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
            <p className="text-xs text-muted-foreground">A primeira linha deve conter os cabeçalhos.</p>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Arquivo: <strong>{fileName}</strong> — {rawRows.length} linha(s).</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}{f.required ? " *" : ""}</Label>
                  <Select value={String(mapping[f.key] ?? -1)} onValueChange={(v) => setMapping({ ...mapping, [f.key]: parseInt(v) })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">— não mapeado —</SelectItem>
                      {headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `(coluna ${i + 1})`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}><ArrowLeft size={14} /> Voltar</Button>
              <Button onClick={applyMapping}>Continuar <ArrowRight size={14} /></Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{parsed.length} válid(os)</Badge>
              <Badge variant="destructive">{errors.length} erro(s)</Badge>
            </div>
            {errors.length > 0 && (
              <div className="border rounded p-2 max-h-40 overflow-y-auto text-xs space-y-1">
                {errors.slice(0, 50).map((e, i) => (
                  <div key={i} className="text-destructive flex gap-2"><AlertTriangle size={12} /> Linha {e.line}: {e.message}</div>
                ))}
              </div>
            )}
            <div className="border rounded overflow-x-auto max-h-60">
              <Table>
                <TableHeader><TableRow>{fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {parsed.slice(0, 30).map((p, i) => (
                    <TableRow key={i}>{fields.map((f) => <TableCell key={f.key}>{String(p[f.key] ?? "-")}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}><ArrowLeft size={14} /> Voltar</Button>
              <Button onClick={() => importMutation.mutate()} disabled={errors.length > 0 || importMutation.isPending}>
                <Upload size={14} /> Importar
              </Button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success"><Check /> Importação concluída</div>
            <ul className="text-sm list-disc pl-5">
              <li>{result.created} criado(s)</li>
              <li>{result.updated} atualizado(s)</li>
              <li>{result.failed} com erro</li>
            </ul>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
