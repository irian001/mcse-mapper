/**
 * ModeloRiscoItensImportDialog — Fase 0A.3.6.4
 *
 * Importação CSV de Riscos do Modelo (somente frontend).
 * - Lê arquivo localmente, detecta separador (; , \t).
 * - Valida campos obrigatórios e duplicidades.
 * - Resolve conta MCSE por codigo_mcse contra public.mcse_contas.
 * - Insere em public.modelo_matriz_risco_itens; snapshots são preenchidos por triggers.
 *
 * Não altera SQL, types, banco, vínculos ou trabalho_riscos_auditoria.
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Check, Upload, FileSpreadsheet, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  modeloId: string;
  canImport: boolean;
}

const COLUMNS = [
  "codigo_item_modelo", "ordem", "area_ciclo", "codigo_mcse", "assertiva",
  "risco_identificado", "tipo_risco", "causa", "impacto_potencial",
  "probabilidade", "impacto", "nivel_risco",
  "risco_significativo", "risco_fraude", "controle_relevante", "risco_controle",
  "resposta_planejada", "natureza_resposta", "extensao_resposta", "oportunidade_resposta",
  "evidencia_esperada", "procedimento_sugerido",
  "obrigatorio", "ativo", "observacoes",
] as const;

const ASSERTIVAS_OK = new Set([
  "existencia","integridade","direitos_obrigacoes","avaliacao",
  "apresentacao_divulgacao","corte","ocorrencia","exatidao","outro",
]);
const TIPOS_RISCO_OK = new Set([
  "risco_inerente","risco_controle","risco_distorcao_relevante","risco_fraude",
  "risco_divulgacao","risco_estimativa","risco_ti","risco_operacional","outro",
]);
const PROB_OK = new Set(["baixa","media","alta"]);
const IMP_OK = new Set(["baixo","medio","alto"]);
const NIVEL_OK = new Set(["baixo","medio","alto","critico"]);

function parseBool(v: any): boolean | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "") return null;
  if (["true","1","s","sim","yes","y","verdadeiro"].includes(s)) return true;
  if (["false","0","n","nao","não","no","falso"].includes(s)) return false;
  return null;
}

function detectSep(headerLine: string): string {
  const counts: Record<string, number> = {
    ";": (headerLine.match(/;/g) || []).length,
    ",": (headerLine.match(/,/g) || []).length,
    "\t": (headerLine.match(/\t/g) || []).length,
  };
  let best = ";"; let bestN = -1;
  for (const k of Object.keys(counts)) {
    if (counts[k] > bestN) { best = k; bestN = counts[k]; }
  }
  return bestN > 0 ? best : ";";
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const sep = detectSep(lines[0]);
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === sep) { out.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).filter((l) => l.trim().length > 0).map(splitLine);
  return { headers, rows };
}

interface ParsedRow {
  line: number;
  raw: Record<string, string>;
  payload: any;
  codigo_mcse?: string;
  errors: string[];
}

export function downloadRiscosTemplate() {
  const header = COLUMNS.join(";");
  const example = [
    "R001","10","Receitas","","integridade",
    "Risco de receitas não registradas no período","risco_distorcao_relevante",
    "Falhas no fechamento mensal","Receitas subavaliadas",
    "media","alto","alto",
    "sim","nao","sim","nao",
    "Aplicar testes substantivos de corte","substantiva","extensiva","tempestiva",
    "Relatório de faturamento conciliado","Inspeção de documentos e recálculo",
    "sim","sim","Exemplo — apague esta linha antes de importar",
  ].join(";");
  const csv = "\uFEFF" + header + "\n" + example + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "template-riscos-modelo.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ModeloRiscoItensImportDialog({ open, onClose, modeloId, canImport }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [headerErrors, setHeaderErrors] = useState<string[]>([]);
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);

  const valid = useMemo(() => parsed.filter((p) => p.errors.length === 0), [parsed]);
  const invalid = useMemo(() => parsed.filter((p) => p.errors.length > 0), [parsed]);

  const reset = () => {
    setStep("upload"); setFileName(""); setParsed([]); setHeaderErrors([]); setResult(null);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) { toast.error("Selecione um arquivo .csv"); return; }
    setFileName(f.name);
    const text = await f.text();
    const { headers, rows } = parseCsv(text);
    if (headers.length === 0) { toast.error("Arquivo vazio"); return; }
    const missing = ["risco_identificado"].filter((c) => !headers.includes(c));
    setHeaderErrors(missing.length ? [`Coluna obrigatória ausente: ${missing.join(", ")}`] : []);

    // Resolve contas MCSE
    const codigos = Array.from(new Set(rows
      .map((r) => (r[headers.indexOf("codigo_mcse")] || "").trim())
      .filter((c) => c.length > 0)));
    const contasMap = new Map<string, { id: string; ativo: boolean }>();
    if (codigos.length > 0) {
      const { data } = await (supabase as any)
        .from("mcse_contas")
        .select("id, codigo_mcse, ativo")
        .in("codigo_mcse", codigos);
      (data || []).forEach((c: any) => contasMap.set(String(c.codigo_mcse), { id: c.id, ativo: !!c.ativo }));
    }

    // Carrega códigos já existentes no modelo
    const { data: existentes } = await (supabase as any)
      .from("modelo_matriz_risco_itens")
      .select("codigo_item_modelo")
      .eq("modelo_matriz_risco_id", modeloId);
    const existentesSet = new Set<string>(
      (existentes || []).map((e: any) => String(e.codigo_item_modelo || "").trim()).filter(Boolean),
    );

    const seenCodigos = new Set<string>();
    const out: ParsedRow[] = [];

    rows.forEach((cells, idx) => {
      const raw: Record<string, string> = {};
      headers.forEach((h, i) => { raw[h] = (cells[i] ?? "").trim(); });
      const errors: string[] = [];

      const risco = (raw["risco_identificado"] || "").trim();
      if (!risco) errors.push("risco_identificado é obrigatório");

      let ordemNum = 0;
      if (raw["ordem"]) {
        const n = parseInt(raw["ordem"], 10);
        if (Number.isNaN(n) || n < 0) errors.push("ordem inválida");
        else ordemNum = n;
      }

      const codItem = (raw["codigo_item_modelo"] || "").trim();
      if (codItem) {
        if (seenCodigos.has(codItem)) errors.push(`codigo_item_modelo duplicado no arquivo: ${codItem}`);
        else seenCodigos.add(codItem);
        if (existentesSet.has(codItem)) errors.push(`codigo_item_modelo já existe no modelo: ${codItem}`);
      }

      const codMcse = (raw["codigo_mcse"] || "").trim();
      let contaId: string | null = null;
      if (codMcse) {
        const c = contasMap.get(codMcse);
        if (!c) errors.push(`Conta MCSE não encontrada: ${codMcse}`);
        else if (!c.ativo) errors.push(`Conta MCSE inativa: ${codMcse}`);
        else contaId = c.id;
      }

      const checkEnum = (k: string, set: Set<string>) => {
        const v = (raw[k] || "").trim().toLowerCase();
        if (v && !set.has(v)) errors.push(`${k} inválido: ${v}`);
        return v || null;
      };
      const assertiva = checkEnum("assertiva", ASSERTIVAS_OK);
      const tipo_risco = checkEnum("tipo_risco", TIPOS_RISCO_OK);
      const probabilidade = checkEnum("probabilidade", PROB_OK);
      const impacto = checkEnum("impacto", IMP_OK);
      const nivel_risco = checkEnum("nivel_risco", NIVEL_OK);

      const bool = (k: string, def = false) => {
        const v = parseBool(raw[k]);
        return v == null ? def : v;
      };

      const payload: any = {
        modelo_matriz_risco_id: modeloId,
        codigo_item_modelo: codItem || null,
        ordem: ordemNum,
        area_ciclo: raw["area_ciclo"] || null,
        conta_mcse_id: contaId,
        assertiva,
        risco_identificado: risco,
        tipo_risco,
        causa: raw["causa"] || null,
        impacto_potencial: raw["impacto_potencial"] || null,
        probabilidade,
        impacto,
        nivel_risco,
        risco_significativo: bool("risco_significativo"),
        risco_fraude: bool("risco_fraude"),
        controle_relevante: bool("controle_relevante"),
        risco_controle: bool("risco_controle"),
        resposta_planejada: raw["resposta_planejada"] || null,
        natureza_resposta: raw["natureza_resposta"] || null,
        extensao_resposta: raw["extensao_resposta"] || null,
        oportunidade_resposta: raw["oportunidade_resposta"] || null,
        evidencia_esperada: raw["evidencia_esperada"] || null,
        procedimento_sugerido: raw["procedimento_sugerido"] || null,
        obrigatorio: bool("obrigatorio"),
        ativo: bool("ativo", true),
        observacoes: raw["observacoes"] || null,
      };

      out.push({ line: idx + 2, raw, payload, codigo_mcse: codMcse || undefined, errors });
    });

    setParsed(out);
    setStep("preview");
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!canImport) throw new Error("Sem permissão para importar.");
      if (headerErrors.length > 0) throw new Error(headerErrors.join("; "));
      if (invalid.length > 0) throw new Error("Corrija as linhas inválidas antes de importar.");
      if (valid.length === 0) throw new Error("Nenhuma linha válida para importar.");
      let inserted = 0, failed = 0;
      const errs: string[] = [];
      for (const p of valid) {
        const { error } = await (supabase as any)
          .from("modelo_matriz_risco_itens")
          .insert(p.payload);
        if (error) { failed++; errs.push(`Linha ${p.line}: ${error.message}`); }
        else inserted++;
      }
      if (errs.length > 0) console.warn("Importação - erros:", errs);
      return { inserted, failed };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["modelo-matriz-risco-itens", modeloId] });
      setResult(r);
      setStep("result");
      if (r.failed === 0) toast.success(`${r.inserted} risco(s) importado(s)`);
      else toast.warning(`${r.inserted} importado(s), ${r.failed} com erro`);
    },
    onError: (err: any) => {
      const msg = String(err?.message || "");
      if (err?.code === "42501" || msg.includes("row-level security") || msg.includes("permission")) {
        toast.error("Acesso negado: você não tem permissão para importar.");
      } else if (msg.includes("rascunho")) {
        toast.error("Importação permitida apenas em modelos em rascunho.");
      } else {
        toast.error(msg || "Erro ao importar");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={18} /> Importar Riscos do Modelo (CSV)
          </DialogTitle>
          <DialogDescription>
            Apenas modelos em rascunho. Use o template para garantir as colunas.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <p>• Separador suportado: <code>;</code> <code>,</code> ou tab.</p>
              <p>• <strong>risco_identificado</strong> é obrigatório.</p>
              <p>• <code>codigo_mcse</code> é opcional; quando informado deve existir em MCSE.</p>
              <p>• Booleanos aceitam: sim/não, true/false, 1/0, s/n.</p>
              <p>• Snapshots de conta são preenchidos pelo banco — não inclua no CSV.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={downloadRiscosTemplate}>
                Baixar template
              </Button>
              <Input type="file" accept=".csv,.txt" onChange={handleFile} />
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-sm text-muted-foreground">Arquivo: <strong>{fileName}</strong></span>
              <Badge variant="outline">{parsed.length} linha(s)</Badge>
              <Badge className="bg-emerald-600 text-white">{valid.length} válida(s)</Badge>
              <Badge variant="destructive">{invalid.length} inválida(s)</Badge>
            </div>

            {headerErrors.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>{headerErrors.join("; ")}</div>
              </div>
            )}

            {invalid.length > 0 && (
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto text-xs space-y-1 bg-destructive/5">
                {invalid.slice(0, 100).map((p, i) => (
                  <div key={i} className="text-destructive flex gap-2">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    <span>Linha {p.line}: {p.errors.join("; ")}</span>
                  </div>
                ))}
                {invalid.length > 100 && (
                  <div className="text-muted-foreground">…{invalid.length - 100} adicional(is)</div>
                )}
              </div>
            )}

            <div className="border rounded-md overflow-x-auto max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Linha</TableHead>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Risco</TableHead>
                    <TableHead className="w-[120px]">Conta MCSE</TableHead>
                    <TableHead className="w-[90px]">Nível</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.slice(0, 50).map((p, i) => (
                    <TableRow key={i} className={p.errors.length ? "bg-destructive/5" : ""}>
                      <TableCell>{p.line}</TableCell>
                      <TableCell>{p.payload.codigo_item_modelo || "—"}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{p.payload.risco_identificado}</TableCell>
                      <TableCell>{p.codigo_mcse || "—"}</TableCell>
                      <TableCell>{p.payload.nivel_risco || "—"}</TableCell>
                      <TableCell>
                        {p.errors.length === 0
                          ? <Badge className="bg-emerald-600 text-white">OK</Badge>
                          : <Badge variant="destructive">Erro</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft size={14} className="mr-1" /> Voltar
              </Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={
                  importMutation.isPending ||
                  !canImport ||
                  headerErrors.length > 0 ||
                  invalid.length > 0 ||
                  valid.length === 0
                }
              >
                <Upload size={14} className="mr-1" />
                Importar {valid.length} risco(s)
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <Check /> Importação concluída
            </div>
            <ul className="text-sm list-disc pl-5">
              <li>{result.inserted} risco(s) inserido(s)</li>
              <li>{result.failed} com erro</li>
            </ul>
            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
