import { useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, AlertTriangle, ArrowLeft, ArrowRight, Check, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface Mapping {
  codigo_item: number;
  descricao_item: number;
  unidade_medida: number | null;
  quantidade_sistema: number | null;
  valor_unitario: number | null;
  observacao: number | null;
}

interface ParsedItem {
  codigo_item: string;
  descricao_item: string;
  unidade_medida: string;
  quantidade_sistema: number;
  valor_unitario: number;
  observacao: string;
}

interface RowError {
  line: number;
  message: string;
}

type Strategy = "replace" | "append";

interface Props {
  open: boolean;
  onClose: () => void;
  blocoId: string | null;
  blocoLabel: string;
}

const parseNum = (v: any): number => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

export default function ImportItensEstoqueDialog({ open, onClose, blocoId, blocoLabel }: Props) {
  const qc = useQueryClient();

  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "strategy" | "result">("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({
    codigo_item: -1,
    descricao_item: -1,
    unidade_medida: null,
    quantidade_sistema: null,
    valor_unitario: null,
    observacao: null,
  });
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<Strategy>("append");
  const [importResult, setImportResult] = useState<{ inserted: number; replaced: number } | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({
      codigo_item: -1,
      descricao_item: -1,
      unidade_medida: null,
      quantidade_sistema: null,
      valor_unitario: null,
      observacao: null,
    });
    setParsed([]);
    setErrors([]);
    setDuplicates([]);
    setStrategy("append");
    setImportResult(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isCsv = /\.csv$/i.test(file.name);
    const isXlsx = /\.(xlsx|xls)$/i.test(file.name);
    if (!isCsv && !isXlsx) {
      toast.error("Formato não suportado. Use CSV ou XLSX.");
      return;
    }
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false, raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as any[][];
        if (json.length < 2) {
          toast.error("Arquivo vazio ou sem dados.");
          return;
        }
        const hs = (json[0] as any[]).map((h) => String(h ?? "").trim());
        setHeaders(hs);
        setRawRows(json.slice(1));

        // Auto-detectar
        const lower = hs.map((h) => h.toLowerCase());
        const find = (keys: string[]) => lower.findIndex((h) => keys.some((k) => h.includes(k)));
        const auto: Mapping = {
          codigo_item: find(["codigo", "código", "cod.", "cod ", "sku", "item"]),
          descricao_item: find(["descric", "descrição", "produto", "nome"]),
          unidade_medida: (() => {
            const i = find(["unidade", "un ", "u.m", "und"]);
            return i >= 0 ? i : null;
          })(),
          quantidade_sistema: (() => {
            const i = find(["qtd sistema", "quantidade sistema", "saldo sistema", "estoque sistema", "qtd_sistema"]);
            return i >= 0 ? i : (() => {
              const j = find(["quantidade", "qtd", "saldo"]);
              return j >= 0 ? j : null;
            })();
          })(),
          valor_unitario: (() => {
            const i = find(["valor unit", "preco unit", "preço unit", "vlr unit", "custo"]);
            return i >= 0 ? i : null;
          })(),
          observacao: (() => {
            const i = find(["observa", "obs", "nota"]);
            return i >= 0 ? i : null;
          })(),
        };
        if (auto.codigo_item < 0) auto.codigo_item = -1;
        if (auto.descricao_item < 0) auto.descricao_item = -1;
        setMapping(auto);
        setStep("mapping");
        toast.success(`${json.length - 1} linha(s) carregadas`);
      } catch (err) {
        toast.error("Erro ao ler arquivo");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const applyMapping = () => {
    if (mapping.codigo_item < 0) return toast.error("Mapeie a coluna: Código do item");
    if (mapping.descricao_item < 0) return toast.error("Mapeie a coluna: Descrição do item");

    const items: ParsedItem[] = [];
    const errs: RowError[] = [];
    const seen = new Map<string, number>();
    const dupes = new Set<string>();

    rawRows.forEach((row, idx) => {
      const lineNum = idx + 2;
      if (!row.some((c) => c != null && c !== "")) return;

      const codigo = String(row[mapping.codigo_item] ?? "").trim();
      const descricao = String(row[mapping.descricao_item] ?? "").trim();

      if (!codigo) errs.push({ line: lineNum, message: "Código do item vazio" });
      if (!descricao) errs.push({ line: lineNum, message: "Descrição vazia" });

      if (codigo) {
        if (seen.has(codigo)) {
          dupes.add(codigo);
        } else {
          seen.set(codigo, lineNum);
        }
      }

      items.push({
        codigo_item: codigo,
        descricao_item: descricao,
        unidade_medida: mapping.unidade_medida != null ? String(row[mapping.unidade_medida] ?? "").trim() : "",
        quantidade_sistema: mapping.quantidade_sistema != null ? parseNum(row[mapping.quantidade_sistema]) : 0,
        valor_unitario: mapping.valor_unitario != null ? parseNum(row[mapping.valor_unitario]) : 0,
        observacao: mapping.observacao != null ? String(row[mapping.observacao] ?? "").trim() : "",
      });
    });

    setParsed(items);
    setErrors(errs);
    setDuplicates(Array.from(dupes));
    setStep("preview");
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!blocoId) throw new Error("Bloco inválido");
      if (errors.length > 0) throw new Error("Corrija os erros antes de importar");
      if (duplicates.length > 0) throw new Error("Resolva os códigos duplicados antes de importar");

      let replaced = 0;

      if (strategy === "replace") {
        const { error: delErr, count } = await (supabase as any)
          .from("procedimento_contagem_estoque_itens")
          .delete({ count: "exact" })
          .eq("contagem_estoque_bloco_id", blocoId);
        if (delErr) throw delErr;
        replaced = count || 0;
      } else {
        // Append: pular códigos já existentes no bloco
        const { data: existentes, error: exErr } = await (supabase as any)
          .from("procedimento_contagem_estoque_itens")
          .select("codigo_item")
          .eq("contagem_estoque_bloco_id", blocoId);
        if (exErr) throw exErr;
        const existSet = new Set((existentes || []).map((r: any) => r.codigo_item).filter(Boolean));
        const before = parsed.length;
        const filtered = parsed.filter((p) => !existSet.has(p.codigo_item));
        if (filtered.length < before) {
          replaced = before - filtered.length; // reaproveitando contador
        }
        // Substituir parsed por filtered no payload abaixo
        await insertBatches(filtered);
        return { inserted: filtered.length, replaced };
      }

      await insertBatches(parsed);
      return { inserted: parsed.length, replaced };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["ce-itens", blocoId] });
      qc.invalidateQueries({ queryKey: ["ce-itens-resumo"] });
      setImportResult(res);
      setStep("result");
      toast.success("Importação concluída");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao importar"),
  });

  const insertBatches = async (items: ParsedItem[]) => {
    if (items.length === 0) return;
    const payload = items.map((p) => ({
      contagem_estoque_bloco_id: blocoId,
      codigo_item: p.codigo_item,
      descricao_item: p.descricao_item,
      unidade_medida: p.unidade_medida || null,
      quantidade_sistema: p.quantidade_sistema,
      quantidade_contada: null,    // importado nasce como NÃO contado
      valor_unitario: p.valor_unitario,
      observacao: p.observacao || null,
      origem_item: "importado",
      contado: false,              // explícito: ainda não passou pela contagem física
    }));
    for (let i = 0; i < payload.length; i += 200) {
      const batch = payload.slice(i, i + 200);
      const { error } = await (supabase as any)
        .from("procedimento_contagem_estoque_itens")
        .insert(batch);
      if (error) throw error;
    }
  };

  const fields = useMemo(
    () => [
      { key: "codigo_item", label: "Código do item *", required: true },
      { key: "descricao_item", label: "Descrição do item *", required: true },
      { key: "unidade_medida", label: "Unidade de medida", required: false },
      { key: "quantidade_sistema", label: "Quantidade sistema", required: false },
      { key: "valor_unitario", label: "Valor unitário", required: false },
      { key: "observacao", label: "Observação", required: false },
    ],
    []
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet size={16} /> Importar Itens — {blocoLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === "upload" && (
            <Card>
              <CardContent className="p-6">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Selecione um arquivo <strong>CSV</strong> ou <strong>XLSX</strong> com a lista de itens do estoque.
                  </p>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFile}
                    className="max-w-sm mx-auto"
                  />
                  <p className="text-xs text-muted-foreground mt-4">
                    Mínimo: colunas de <strong>código</strong> e <strong>descrição</strong>. Outras colunas são opcionais.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "mapping" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Arquivo: <strong>{fileName}</strong> — {rawRows.length} linha(s)
              </p>
              {fields.map(({ key, label }) => {
                const k = key as keyof Mapping;
                const v = mapping[k];
                const current = v == null ? "-1" : String(v);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <Label className="w-52 text-sm">{label}</Label>
                    <Select
                      value={current}
                      onValueChange={(val) =>
                        setMapping((m) => {
                          const num = val === "-1" ? (key === "codigo_item" || key === "descricao_item" ? -1 : null) : parseInt(val);
                          return { ...m, [key]: num };
                        })
                      }
                    >
                      <SelectTrigger className="w-72">
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">— Não mapeada —</SelectItem>
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {h || `Coluna ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-3">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  <ArrowLeft size={14} className="mr-1" /> Voltar
                </Button>
                <Button onClick={applyMapping}>
                  <ArrowRight size={14} className="mr-1" /> Validar e Pré-visualizar
                </Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-3">
              {errors.length > 0 && (
                <Card className="border-destructive/50">
                  <CardContent className="p-3">
                    <div className="text-sm text-destructive flex items-center gap-1 mb-2">
                      <AlertTriangle size={14} /> {errors.length} erro(s) — importação bloqueada
                    </div>
                    <div className="max-h-32 overflow-auto text-xs space-y-0.5">
                      {errors.slice(0, 50).map((e, i) => (
                        <div key={i} className="text-destructive">Linha {e.line}: {e.message}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {duplicates.length > 0 && (
                <Card className="border-warning/50">
                  <CardContent className="p-3">
                    <div className="text-sm text-warning-foreground flex items-center gap-1 mb-2">
                      <AlertTriangle size={14} /> {duplicates.length} código(s) duplicado(s) no arquivo
                    </div>
                    <div className="max-h-24 overflow-auto text-xs">
                      {duplicates.slice(0, 30).map((c) => (
                        <Badge key={c} variant="outline" className="mr-1 mb-1">{c}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {parsed.length} linha(s) válidas · mostrando primeiras 20
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("mapping")}>
                    <ArrowLeft size={14} className="mr-1" /> Voltar
                  </Button>
                  <Button
                    onClick={() => setStep("strategy")}
                    disabled={errors.length > 0 || duplicates.length > 0 || parsed.length === 0}
                  >
                    Prosseguir <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              </div>

              <div className="border border-border rounded-lg max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>UN</TableHead>
                      <TableHead className="text-right">Qtd. Sistema</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.slice(0, 20).map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{p.codigo_item}</TableCell>
                        <TableCell className="text-sm">{p.descricao_item}</TableCell>
                        <TableCell className="text-xs">{p.unidade_medida || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {p.quantidade_sistema.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {p.valor_unitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === "strategy" && (
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Estratégia de importação</h3>
                  <p className="text-xs text-muted-foreground">
                    Como deseja tratar os {parsed.length} item(ns) deste arquivo em relação aos itens já existentes no bloco?
                  </p>
                </div>
                <RadioGroup value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
                  <div className="flex items-start gap-3 border border-border rounded-lg p-3">
                    <RadioGroupItem value="append" id="op-append" className="mt-1" />
                    <Label htmlFor="op-append" className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm">Adicionar apenas novos itens</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Itens com código já existente no bloco serão ignorados. Recomendado para complementar uma contagem em andamento.
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-start gap-3 border border-border rounded-lg p-3">
                    <RadioGroupItem value="replace" id="op-replace" className="mt-1" />
                    <Label htmlFor="op-replace" className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm text-destructive">Substituir itens existentes no bloco</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <strong>Atenção:</strong> remove TODOS os itens atuais do bloco antes de importar. Use somente em recargas iniciais.
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep("preview")}>
                    <ArrowLeft size={14} className="mr-1" /> Voltar
                  </Button>
                  <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                    <Check size={14} className="mr-1" />
                    {importMutation.isPending ? "Importando..." : "Confirmar Importação"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "result" && importResult && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-success">
                  <Check size={18} />
                  <span className="font-semibold">Importação concluída</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="border border-border rounded p-3">
                    <div className="text-xs text-muted-foreground">Itens inseridos</div>
                    <div className="text-2xl font-mono font-semibold">{importResult.inserted}</div>
                  </div>
                  <div className="border border-border rounded p-3">
                    <div className="text-xs text-muted-foreground">
                      {strategy === "replace" ? "Itens removidos" : "Itens ignorados (já existiam)"}
                    </div>
                    <div className="text-2xl font-mono font-semibold">{importResult.replaced}</div>
                  </div>
                </div>
                <Button className="w-full" onClick={handleClose}>
                  Fechar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
