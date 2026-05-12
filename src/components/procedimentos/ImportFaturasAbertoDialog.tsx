import { useState, useCallback, useMemo } from "react";
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

interface Props {
  open: boolean;
  onClose: () => void;
  procedimento: any;
}

// Mapeamento amplo. Todos campos opcionais exceto os obrigatórios.
const FIELDS = [
  // obrigatórios
  { key: "uc", label: "UC *", required: true, hints: ["uc", "un. cons", "unidade cons"] },
  { key: "data_vencimento", label: "Data de Vencimento *", required: true, hints: ["vencimento", "venc."] },
  { key: "valor_em_aberto", label: "Valor em Aberto *", required: true, hints: ["em aberto", "saldo aberto", "valor_aberto", "vlr aberto"] },
  // pelo menos um:
  { key: "numero_fatura", label: "Número Fatura (fatura OU documento)", hints: ["fatura", "nf-e", "nfe"] },
  { key: "numero_documento", label: "Número Documento (fatura OU documento)", hints: ["documento", "doc."] },
  // recomendados
  { key: "nome_consumidor", label: "Nome Consumidor", hints: ["consumidor", "cliente", "nome"] },
  { key: "cpf_cnpj", label: "CPF/CNPJ", hints: ["cpf", "cnpj"] },
  { key: "ano_mes_faturamento", label: "Ano/Mês Faturamento", hints: ["referenc", "ano/mes", "anomes", "competen"] },
  { key: "data_emissao", label: "Data Emissão (opcional — se ausente, usa Data padrão)", hints: ["emiss"] },
  { key: "situacao_fornecimento", label: "Situação Fornecimento", hints: ["fornec"] },
  { key: "classe_codigo", label: "Classe (código)", hints: ["classe"] },
  { key: "subclasse_codigo", label: "Subclasse (código)", hints: ["subclasse"] },
  { key: "municipio_codigo", label: "Município (código)", hints: ["municip", "cod mun"] },
  { key: "codigo_consumidor", label: "Código Consumidor", hints: ["cod consumidor", "código consumidor"] },
] as const;

type Mapping = Record<string, number>; // -1 = não mapeado

const REQUIRED = ["uc", "data_vencimento", "valor_em_aberto"];
const RECOMMENDED = [
  "nome_consumidor", "ano_mes_faturamento",
  "situacao_fornecimento", "classe_codigo",
  "municipio_codigo", "data_emissao",
];

const parseNum = (v: any): number | null => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(/[^\d,.\-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};
const parseDate = (v: any): string | null => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const d = m[1].padStart(2, "0"), mo = m[2].padStart(2, "0");
    let y = m[3]; if (y.length === 2) y = (parseInt(y) > 50 ? "19" : "20") + y;
    return `${y}-${mo}-${d}`;
  }
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // serial excel
  if (/^\d+(\.\d+)?$/.test(s)) {
    const num = parseFloat(s);
    if (num > 20000 && num < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + num * 86400000);
      return d.toISOString().slice(0, 10);
    }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

export default function ImportFaturasAbertoDialog({ open, onClose, procedimento }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [dataEmissaoPadrao, setDataEmissaoPadrao] = useState<string>("");
  const [parsed, setParsed] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [warnings, setWarnings] = useState<{ line: number; message: string }[]>([]);
  const [result, setResult] = useState<any>(null);

  const reset = () => {
    setStep("upload"); setFileName(""); setFileSize(0); setHeaders([]); setRawRows([]);
    setMapping({}); setDataEmissaoPadrao(""); setParsed([]); setErrors([]); setWarnings([]); setResult(null);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) return toast.error("Use CSV ou XLSX");
    setFileName(file.name); setFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false, raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as any[][];
        if (json.length < 2) return toast.error("Arquivo vazio");
        const hs = (json[0] as any[]).map((h) => String(h ?? "").trim());
        setHeaders(hs); setRawRows(json.slice(1));
        const lower = hs.map((h) => h.toLowerCase());
        const auto: Mapping = {};
        FIELDS.forEach((f) => {
          const idx = lower.findIndex((h) => f.hints.some((k) => h.includes(k)));
          auto[f.key] = idx;
        });
        setMapping(auto);
        setStep("mapping");
        toast.success(`${json.length - 1} linha(s) carregadas`);
      } catch {
        toast.error("Erro ao ler o arquivo");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const applyMapping = async () => {
    for (const r of REQUIRED) if ((mapping[r] ?? -1) < 0) return toast.error(`Mapeie a coluna obrigatória: ${r}`);
    if ((mapping.numero_fatura ?? -1) < 0 && (mapping.numero_documento ?? -1) < 0) {
      return toast.error("Mapeie ao menos número da fatura ou número do documento");
    }

    // Carrega cadastros auxiliares para enriquecimento
    const clienteId = procedimento.cliente_id;
    const [classesRes, munRes] = await Promise.all([
      (supabase as any).from("cliente_classes_faturamento").select("*").eq("cliente_id", clienteId).eq("ativo", true),
      (supabase as any).from("cliente_municipios_faturamento").select("*").eq("cliente_id", clienteId).eq("ativo", true),
    ]);
    const classMap = new Map((classesRes.data || []).map((c: any) => [String(c.codigo_classe), c]));
    const munMap = new Map((munRes.data || []).map((m: any) => [String(m.codigo_municipio), m]));

    // Data de referência para dias_em_atraso
    const dataRef = procedimento.data_base_referencia
      ? new Date(procedimento.data_base_referencia)
      : new Date(); // fallback: data atual

    const items: any[] = [];
    const errs: { line: number; message: string }[] = [];
    const warns: { line: number; message: string }[] = [];
    const seenDup = new Set<string>();

    rawRows.forEach((row, idx) => {
      const lineNum = idx + 2;
      if (!row.some((c) => c != null && c !== "")) return;

      const get = (k: string) => {
        const i = mapping[k] ?? -1;
        return i >= 0 ? row[i] : undefined;
      };

      const uc = String(get("uc") ?? "").trim();
      const numFatura = String(get("numero_fatura") ?? "").trim();
      const numDoc = String(get("numero_documento") ?? "").trim();
      const dVenc = parseDate(get("data_vencimento"));
      const vAberto = parseNum(get("valor_em_aberto"));

      if (!uc) errs.push({ line: lineNum, message: "UC vazia" });
      if (!numFatura && !numDoc) errs.push({ line: lineNum, message: "Sem número de fatura/documento" });
      if (!dVenc) errs.push({ line: lineNum, message: "Data de vencimento inválida" });
      if (vAberto == null) errs.push({ line: lineNum, message: "Valor em aberto inválido" });
      if (vAberto != null && vAberto < 0) warns.push({ line: lineNum, message: "Valor em aberto negativo" });

      // Duplicidade dentro do arquivo
      const dupKey = `${uc}|${numFatura || numDoc}|${dVenc}|${vAberto}`;
      if (seenDup.has(dupKey)) warns.push({ line: lineNum, message: "Possível duplicidade no arquivo" });
      seenDup.add(dupKey);

      const dEmissaoArquivo = parseDate(get("data_emissao"));
      const dEmissao = dEmissaoArquivo || (dataEmissaoPadrao || null);
      const classeCod = String(get("classe_codigo") ?? "").trim();
      const munCod = String(get("municipio_codigo") ?? "").trim();
      const classeReg: any = classeCod ? classMap.get(classeCod) : null;
      const munReg: any = munCod ? munMap.get(munCod) : null;
      if (classeCod && !classeReg) warns.push({ line: lineNum, message: `Classe ${classeCod} não cadastrada` });
      if (munCod && !munReg) warns.push({ line: lineNum, message: `Município ${munCod} não cadastrado` });

      // Cálculos
      let anoFat: number | null = null, mesFat: number | null = null;
      const anoMes = String(get("ano_mes_faturamento") ?? "").trim();
      const am = anoMes.match(/(\d{4})[\-\/]?(\d{1,2})|(\d{1,2})[\-\/](\d{4})/);
      if (am) {
        if (am[1]) { anoFat = +am[1]; mesFat = +am[2]; }
        else { mesFat = +am[3]; anoFat = +am[4]; }
      }
      const anoVenc = dVenc ? new Date(dVenc).getUTCFullYear() : null;
      const diasAtraso = dVenc ? Math.floor((dataRef.getTime() - new Date(dVenc).getTime()) / 86400000) : null;

      items.push({
        procedimento_auxiliar_id: procedimento.id,
        cliente_id: procedimento.cliente_id,
        trabalho_auditoria_id: procedimento.trabalho_auditoria_id,
        uc, numero_fatura: numFatura || null, numero_documento: numDoc || null,
        data_vencimento: dVenc, data_emissao: dEmissao,
        valor_em_aberto: vAberto,
        nome_consumidor: String(get("nome_consumidor") ?? "").trim() || null,
        cpf_cnpj: String(get("cpf_cnpj") ?? "").trim() || null,
        codigo_consumidor: String(get("codigo_consumidor") ?? "").trim() || null,
        ano_mes_faturamento: anoMes || null, ano_faturamento: anoFat, mes_faturamento: mesFat,
        ano_vencimento: anoVenc, dias_em_atraso: diasAtraso,
        situacao_uc_codigo: String(get("situacao_uc_codigo") ?? "").trim() || null,
        situacao_uc_descricao_snapshot: String(get("situacao_uc_descricao_snapshot") ?? "").trim() || null,
        situacao_fornecimento: String(get("situacao_fornecimento") ?? "").trim() || null,
        classe_codigo: classeCod || null,
        classe_descricao_snapshot: classeReg?.descricao_classe || null,
        grupo_classe_snapshot: classeReg?.grupo_classe || null,
        subclasse_codigo: String(get("subclasse_codigo") ?? "").trim() || null,
        municipio_codigo: munCod || null,
        municipio_nome_snapshot: munReg?.nome_municipio || null,
        uf: munReg?.uf || null,
        codigo_ibge: munReg?.codigo_ibge || null,
        regional_codigo: munReg?.regional_codigo || null,
        regional_nome_snapshot: munReg?.regional_nome || null,
        conta_contabil_codigo: String(get("conta_contabil_codigo") ?? "").trim() || null,
        linha_arquivo: lineNum,
        linha_original: row,
      });
    });

    // Recomendados não mapeados → alerta global
    const missingRec = RECOMMENDED.filter((k) => (mapping[k] ?? -1) < 0);
    if (missingRec.length) {
      warns.push({ line: 0, message: `Campos recomendados não mapeados: ${missingRec.join(", ")}` });
    }

    setParsed(items); setErrors(errs); setWarnings(warns); setStep("preview");
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (errors.length > 0) throw new Error("Corrija os erros antes de importar");
      const validItems = parsed; // já filtrados durante parsing futuro

      // Cria lote
      const totalAberto = validItems.reduce((s, i) => s + (Number(i.valor_em_aberto) || 0), 0);
      const { data: lote, error: lErr } = await (supabase as any)
        .from("procedimento_faturas_aberto_lotes")
        .insert([{
          procedimento_auxiliar_id: procedimento.id,
          cliente_id: procedimento.cliente_id,
          trabalho_auditoria_id: procedimento.trabalho_auditoria_id,
          nome_arquivo: fileName, tipo_arquivo: fileName.split(".").pop()?.toLowerCase(),
          tamanho_arquivo: fileSize,
          data_emissao_padrao: dataEmissaoPadrao || null,
          quantidade_linhas_lidas: rawRows.length,
          quantidade_linhas_importadas: validItems.length,
          quantidade_linhas_com_erro: errors.length,
          quantidade_alertas: warnings.length,
          valor_total_importado: totalAberto,
          status_importacao: "concluido",
          mapeamento_colunas: mapping,
          metadata_arquivo: { headers, total_linhas: rawRows.length },
        }])
        .select()
        .single();
      if (lErr) throw lErr;

      // Verifica duplicidades já existentes no procedimento
      const dupKeys = new Set<string>();
      const { data: existentes } = await (supabase as any)
        .from("procedimento_faturas_aberto_itens")
        .select("uc, numero_fatura, numero_documento, data_vencimento, valor_em_aberto")
        .eq("procedimento_auxiliar_id", procedimento.id);
      (existentes || []).forEach((e: any) => {
        dupKeys.add(`${e.uc}|${e.numero_fatura || e.numero_documento}|${e.data_vencimento}|${e.valor_em_aberto}`);
      });
      const itemsToInsert: any[] = [];
      let dupsSkipped = 0;
      for (const it of validItems) {
        const k = `${it.uc}|${it.numero_fatura || it.numero_documento}|${it.data_vencimento}|${it.valor_em_aberto}`;
        if (dupKeys.has(k)) { dupsSkipped++; continue; }
        dupKeys.add(k);
        itemsToInsert.push({ ...it, lote_importacao_id: lote.id });
      }

      // Insert em batches
      const BATCH = 500;
      for (let i = 0; i < itemsToInsert.length; i += BATCH) {
        const slice = itemsToInsert.slice(i, i + BATCH);
        const { error: insErr } = await (supabase as any)
          .from("procedimento_faturas_aberto_itens")
          .insert(slice);
        if (insErr) throw insErr;
      }

      return { inserted: itemsToInsert.length, dupsSkipped, loteId: lote.id };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["fab-lotes", procedimento.id] });
      qc.invalidateQueries({ queryKey: ["fab-itens", procedimento.id] });
      qc.invalidateQueries({ queryKey: ["fab-resumo", procedimento.id] });
      setResult(res);
      setStep("result");
      toast.success(`${res.inserted} faturas importadas`);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao importar"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={18} /> Importar Faturas em Aberto
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <Label>Arquivo CSV ou XLSX</Label>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
            <p className="text-xs text-muted-foreground">
              A primeira linha deve conter os cabeçalhos das colunas.
            </p>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Arquivo: <strong>{fileName}</strong> — {rawRows.length} linha(s).
              Mapeie as colunas (* = obrigatórias).
            </p>
            <div className="border rounded p-3 bg-muted/30 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data de emissão padrão</Label>
                <Input type="date" value={dataEmissaoPadrao} onChange={(e) => setDataEmissaoPadrao(e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Usada quando a coluna "Data Emissão" não estiver mapeada ou estiver vazia. Pode ficar em branco.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Select
                    value={String(mapping[f.key] ?? -1)}
                    onValueChange={(v) => setMapping({ ...mapping, [f.key]: parseInt(v) })}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">— não mapeado —</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>{h || `(coluna ${i + 1})`}</SelectItem>
                      ))}
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
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{parsed.length} linhas</Badge>
              <Badge variant="destructive">{errors.length} erros</Badge>
              <Badge className="bg-warning text-warning-foreground">{warnings.length} alertas</Badge>
            </div>
            {(errors.length > 0 || warnings.length > 0) && (
              <div className="border rounded p-3 max-h-40 overflow-y-auto text-xs space-y-1">
                {errors.slice(0, 50).map((e, i) => (
                  <div key={`e-${i}`} className="text-destructive flex gap-2"><AlertTriangle size={12} /> Linha {e.line}: {e.message}</div>
                ))}
                {warnings.slice(0, 50).map((w, i) => (
                  <div key={`w-${i}`} className="text-warning flex gap-2"><AlertTriangle size={12} /> Linha {w.line}: {w.message}</div>
                ))}
              </div>
            )}
            <div className="border rounded overflow-x-auto max-h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UC</TableHead><TableHead>Fatura</TableHead><TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor Aberto</TableHead><TableHead>Classe</TableHead><TableHead>Município</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.slice(0, 30).map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{p.uc}</TableCell>
                      <TableCell>{p.numero_fatura || p.numero_documento}</TableCell>
                      <TableCell>{p.data_vencimento}</TableCell>
                      <TableCell className="text-right">{p.valor_em_aberto?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                      <TableCell>{p.classe_descricao_snapshot || p.classe_codigo || "-"}</TableCell>
                      <TableCell>{p.municipio_nome_snapshot || p.municipio_codigo || "-"}</TableCell>
                    </TableRow>
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
            <div>{result.inserted} faturas inseridas{result.dupsSkipped > 0 && ` (${result.dupsSkipped} duplicidades ignoradas)`}.</div>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
