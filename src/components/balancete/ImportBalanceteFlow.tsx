import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { localizarConta, resolverMcse, calcVariacao, calcStatusValidacao, parseNumericValue } from "@/lib/balancete-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Check, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";

interface ColumnMapping {
  codigo_conta: number;
  descricao_conta: number;
  saldo_anterior: number;
  debitos: number;
  creditos: number;
  saldo_atual: number;
  classificacao_origem: number | null;
}

interface ParsedLine {
  codigo_conta: string;
  descricao_conta: string;
  saldo_anterior: number;
  debitos: number;
  creditos: number;
  saldo_atual: number;
  classificacao_origem: string;
}

interface RowError {
  line: number;
  field: string;
  message: string;
}

interface Props {
  onComplete: () => void;
}

export default function ImportBalanceteFlow({ onComplete }: Props) {
  const qc = useQueryClient();

  // Step state
  const [step, setStep] = useState<"select" | "columns" | "preview" | "result">("select");
  const [selectedTrabalho, setSelectedTrabalho] = useState("");
  const [tipoBalancete, setTipoBalancete] = useState("mensal");

  // File data
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [fileName, setFileName] = useState("");

  // Column mapping
  const [mapping, setMapping] = useState<ColumnMapping>({
    codigo_conta: -1, descricao_conta: -1, saldo_anterior: -1,
    debitos: -1, creditos: -1, saldo_atual: -1, classificacao_origem: null,
  });

  // Parsed
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  // Queries
  const { data: trabalhos = [] } = useQuery({
    queryKey: ["trabalhos_auditoria_all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trabalhos_auditoria")
        .select("*, clientes(razao_social), exercicios(ano_exercicio)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const trabalhoSel = trabalhos.find((t: any) => t.id === selectedTrabalho);

  // File handler
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false, cellText: true, raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as any[][];

        if (json.length < 2) { toast.error("Arquivo vazio"); return; }

        const headers = json[0].map(h => String(h).trim());
        setFileHeaders(headers);
        setRawRows(json.slice(1));

        // Auto-detect columns
        const autoMap = { ...mapping };
        const hl = headers.map(h => h.toLowerCase());
        const detect = (keys: string[]) => hl.findIndex(h => keys.some(k => h.includes(k)));
        autoMap.codigo_conta = detect(["codigo", "código", "idconta", "conta"]);
        autoMap.descricao_conta = detect(["descricao", "descrição", "nome"]);
        autoMap.saldo_anterior = detect(["saldo_anterior", "anterior", "saldo ant"]);
        autoMap.debitos = detect(["debito", "débito"]);
        autoMap.creditos = detect(["credito", "crédito"]);
        autoMap.saldo_atual = detect(["saldo_atual", "atual", "saldo atu"]);
        const clsIdx = detect(["classificacao", "classificação"]);
        autoMap.classificacao_origem = clsIdx >= 0 ? clsIdx : null;
        setMapping(autoMap);
        setStep("columns");
        toast.success(`${json.length - 1} linhas carregadas`);
      } catch {
        toast.error("Erro ao ler arquivo");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [mapping]);

  // Parse with mapping
  const applyMapping = () => {
    const required = ["codigo_conta", "descricao_conta", "saldo_anterior", "debitos", "creditos", "saldo_atual"] as const;
    for (const k of required) {
      if (mapping[k] < 0) { toast.error(`Mapear coluna: ${k}`); return; }
    }

    const lines: ParsedLine[] = [];
    const errs: RowError[] = [];

    rawRows.forEach((row, i) => {
      const lineNum = i + 2;
      if (!row.some(c => c != null && c !== "")) return;

      const codigo = String(row[mapping.codigo_conta] ?? "").trim();
      const descricao = String(row[mapping.descricao_conta] ?? "").trim();

      if (!codigo) { errs.push({ line: lineNum, field: "codigo_conta", message: "Obrigatório" }); }

      lines.push({
        codigo_conta: codigo,
        descricao_conta: descricao,
        saldo_anterior: parseNumericValue(row[mapping.saldo_anterior]),
        debitos: parseNumericValue(row[mapping.debitos]),
        creditos: parseNumericValue(row[mapping.creditos]),
        saldo_atual: parseNumericValue(row[mapping.saldo_atual]),
        classificacao_origem: mapping.classificacao_origem != null ? String(row[mapping.classificacao_origem] ?? "").trim() : "",
      });
    });

    setParsedLines(lines);
    setErrors(errs);
    setStep("preview");
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!trabalhoSel) throw new Error("Selecione um trabalho");
      if (errors.length > 0) throw new Error("Corrija os erros antes de importar");

      const clienteId = trabalhoSel.cliente_id;
      const exercicioId = trabalhoSel.exercicio_id;

      // Fetch contas origem
      const { data: contasOrigem } = await supabase
        .from("cliente_contas_origem")
        .select("id, idconta, nome, classificacao, status_mapeamento, codigo_mcse_sugerido")
        .eq("cliente_id", clienteId);

      // Fetch mapeamentos
      const { data: mapeamentos } = await supabase
        .from("cliente_mapeamento_mcse")
        .select("conta_origem_id, conta_mcse_id, mcse_contas(codigo_mcse, descricao_conta, mcse_grupos(descricao_grupo), mcse_subgrupos(descricao_subgrupo))")
        .eq("cliente_id", clienteId);

      // Create balancete header
      const { data: balancete, error: hErr } = await supabase
        .from("balancetes")
        .insert({
          trabalho_auditoria_id: selectedTrabalho,
          cliente_id: clienteId,
          exercicio_id: exercicioId,
          nome_arquivo: fileName,
          tipo_balancete: tipoBalancete as any,
          total_linhas: parsedLines.length,
          status_importacao: "processando" as any,
        })
        .select()
        .single();
      if (hErr) throw hErr;

      let comMapeamento = 0;
      let semMapeamento = 0;
      const linhasToInsert: any[] = [];

      for (const line of parsedLines) {
        const loc = localizarConta(line.codigo_conta, line.descricao_conta, contasOrigem || []);
        const contaOrig = (contasOrigem || []).find(c => c.id === loc.conta_origem_id);
        const mcse = resolverMcse(contaOrig, mapeamentos || [], new Map());
        const variacao = calcVariacao(line.saldo_anterior, line.saldo_atual);
        const statusVal = calcStatusValidacao(loc.status_localizacao, mcse.status_mapeamento);

        if (mcse.status_mapeamento === "mapeado") comMapeamento++;
        else semMapeamento++;

        linhasToInsert.push({
          balancete_id: balancete.id,
          trabalho_auditoria_id: selectedTrabalho,
          cliente_id: clienteId,
          exercicio_id: exercicioId,
          codigo_conta_balancete: line.codigo_conta,
          descricao_conta_balancete: line.descricao_conta,
          conta_origem_id: loc.conta_origem_id,
          conta_mcse_id: mcse.conta_mcse_id,
          classificacao_origem: loc.classificacao_origem || line.classificacao_origem || null,
          codigo_mcse: mcse.codigo_mcse,
          descricao_mcse: mcse.descricao_mcse,
          grupo_mcse: mcse.grupo_mcse,
          subgrupo_mcse: mcse.subgrupo_mcse,
          saldo_anterior: line.saldo_anterior,
          debitos: line.debitos,
          creditos: line.creditos,
          saldo_atual: line.saldo_atual,
          variacao_absoluta: variacao.absoluta,
          variacao_percentual: variacao.percentual,
          status_localizacao_conta: loc.status_localizacao,
          status_mapeamento_mcse: mcse.status_mapeamento,
          status_validacao: statusVal,
        });
      }

      // Batch insert
      for (let i = 0; i < linhasToInsert.length; i += 100) {
        const batch = linhasToInsert.slice(i, i + 100);
        const { error } = await supabase.from("balancete_linhas").insert(batch);
        if (error) throw error;
      }

      // Update header totals
      await supabase.from("balancetes").update({
        total_linhas_com_mapeamento: comMapeamento,
        total_linhas_sem_mapeamento: semMapeamento,
        status_importacao: "finalizado" as any,
      }).eq("id", balancete.id);

      return { total: parsedLines.length, comMapeamento, semMapeamento, localizadas: linhasToInsert.filter(l => l.status_localizacao_conta !== "nao_localizada").length };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["balancetes"] });
      setImportResult(result);
      setStep("result");
      toast.success("Balancete importado!");
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const columnFields = [
    { key: "codigo_conta", label: "Código da Conta *", required: true },
    { key: "descricao_conta", label: "Descrição *", required: true },
    { key: "saldo_anterior", label: "Saldo Anterior *", required: true },
    { key: "debitos", label: "Débitos *", required: true },
    { key: "creditos", label: "Créditos *", required: true },
    { key: "saldo_atual", label: "Saldo Atual *", required: true },
    { key: "classificacao_origem", label: "Classificação (opcional)", required: false },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Step 1: Select trabalho */}
      {step === "select" && (
        <Card className="max-w-xl">
          <CardHeader><CardTitle className="text-base">1. Selecionar Trabalho de Auditoria</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Trabalho de Auditoria</Label>
              <Select value={selectedTrabalho} onValueChange={setSelectedTrabalho}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o trabalho" /></SelectTrigger>
                <SelectContent>
                  {trabalhos.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome_trabalho} — {t.clientes?.razao_social} ({t.exercicios?.ano_exercicio})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {trabalhoSel && (
              <div className="text-sm space-y-1 bg-muted p-3 rounded">
                <p><span className="text-muted-foreground">Cliente:</span> {(trabalhoSel as any).clientes?.razao_social}</p>
                <p><span className="text-muted-foreground">Exercício:</span> {(trabalhoSel as any).exercicios?.ano_exercicio}</p>
                <p><span className="text-muted-foreground">Status:</span> {trabalhoSel.status_trabalho}</p>
              </div>
            )}
            <div>
              <Label>Tipo de Balancete</Label>
              <Select value={tipoBalancete} onValueChange={setTipoBalancete}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedTrabalho && (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Selecione um arquivo CSV ou Excel</p>
                <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="max-w-xs mx-auto" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column mapping */}
      {step === "columns" && (
        <Card className="max-w-2xl">
          <CardHeader><CardTitle className="text-base">2. Mapear Colunas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Arquivo: <strong>{fileName}</strong> — {rawRows.length} linhas</p>
            {columnFields.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <Label className="w-44 text-sm">{label}</Label>
                <Select
                  value={String(key === "classificacao_origem" ? (mapping[key] ?? -1) : mapping[key as keyof ColumnMapping])}
                  onValueChange={v => setMapping(m => ({ ...m, [key]: v === "-1" ? (key === "classificacao_origem" ? null : -1) : parseInt(v) }))}
                >
                  <SelectTrigger className="w-64"><SelectValue placeholder="Selecione coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">— Não mapeada —</SelectItem>
                    {fileHeaders.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("select")}><ArrowLeft size={14} className="mr-1" />Voltar</Button>
              <Button onClick={applyMapping}><ArrowRight size={14} className="mr-1" />Validar e Pré-visualizar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div>
          {errors.length > 0 && (
            <Card className="mb-4 border-destructive/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle size={14} /> {errors.length} erro(s) — importação bloqueada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-32 overflow-auto text-xs space-y-0.5">
                  {errors.map((e, i) => <div key={i} className="text-destructive">Linha {e.line}: [{e.field}] {e.message}</div>)}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{parsedLines.length} linhas validadas — Trabalho: <strong>{trabalhoSel?.nome_trabalho}</strong></p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("columns")}><ArrowLeft size={14} className="mr-1" />Voltar</Button>
              <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending || errors.length > 0}>
                <Check size={14} className="mr-1" /> Importar Balancete
              </Button>
            </div>
          </div>

          <div className="rounded border bg-card max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Saldo Anterior</TableHead>
                  <TableHead className="text-right">Débitos</TableHead>
                  <TableHead className="text-right">Créditos</TableHead>
                  <TableHead className="text-right">Saldo Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedLines.slice(0, 150).map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{l.codigo_conta}</TableCell>
                    <TableCell className="text-sm">{l.descricao_conta}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{l.saldo_anterior.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{l.debitos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{l.creditos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{l.saldo_atual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedLines.length > 150 && <p className="text-center text-xs text-muted-foreground py-2">Mostrando 150 de {parsedLines.length}</p>}
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === "result" && importResult && (
        <Card className="max-w-md">
          <CardHeader><CardTitle className="text-base">Resultado da Importação</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Total de linhas:</span>
              <span className="font-medium">{importResult.total}</span>
              <span className="text-muted-foreground">Contas localizadas:</span>
              <Badge variant="outline" className="bg-accent/50 w-fit">{importResult.localizadas}</Badge>
              <span className="text-muted-foreground">Com mapeamento MCSE:</span>
              <Badge variant="outline" className="w-fit text-green-700 bg-green-50">{importResult.comMapeamento}</Badge>
              <span className="text-muted-foreground">Sem mapeamento:</span>
              <Badge variant="outline" className="w-fit text-orange-700 bg-orange-50">{importResult.semMapeamento}</Badge>
            </div>
            <Button className="w-full mt-4" onClick={onComplete}>Ver Balancete</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
