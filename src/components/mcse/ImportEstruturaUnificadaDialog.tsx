import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { parseUnifiedCsv, parseBoolFlexible, type UnifiedRow } from "@/lib/estrutura-csv";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estruturaId: string | null;
  estruturaCodigo?: string | null;
  estruturaNome?: string | null;
}

interface PlanItem {
  action: "create" | "update" | "skip";
  reason?: string;
}
interface ImportPlan {
  grupos: Map<string, { row: UnifiedRow; line: number; action: "create" | "update"; existingId?: string }>;
  subgrupos: Map<
    string,
    { row: UnifiedRow; line: number; grupoCodigo: string; action: "create" | "update"; existingId?: string }
  >;
  contas: Array<{
    row: UnifiedRow;
    line: number;
    grupoCodigo: string;
    subgrupoCodigo?: string;
    action: "create" | "update";
    existingId?: string;
  }>;
  errors: { line: number; field: string; message: string }[];
  warnings: { line: number; field: string; message: string }[];
}

interface ImportResult {
  gruposCriados: number;
  gruposAtualizados: number;
  subgruposCriados: number;
  subgruposAtualizados: number;
  contasCriadas: number;
  contasAtualizadas: number;
  ignoradas: number;
  erros: { line: number; message: string }[];
}

export default function ImportEstruturaUnificadaDialog({
  open,
  onOpenChange,
  estruturaId,
  estruturaCodigo,
  estruturaNome,
}: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<{ headers: string[]; rows: UnifiedRow[] } | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setCsv(null);
    setPlan(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseUnifiedCsv(text);
    if (parsed.rows.length === 0) {
      toast.error("Arquivo vazio ou sem dados.");
      return;
    }
    setCsv(parsed);
    setResult(null);
    await buildPlan(parsed.rows);
  };

  /** Constrói o plano de importação consultando o que já existe na estrutura selecionada. */
  const buildPlan = async (rows: UnifiedRow[]) => {
    const errors: ImportPlan["errors"] = [];
    const warnings: ImportPlan["warnings"] = [];

    // Carrega o que já existe na estrutura ativa para diferenciar create/update.
    const applyEstrutura = (q: any) => (estruturaId ? q.eq("estrutura_id", estruturaId) : q);
    const [gRes, sRes, cRes] = await Promise.all([
      applyEstrutura(supabase.from("mcse_grupos").select("id, codigo_grupo")),
      applyEstrutura(supabase.from("mcse_subgrupos").select("id, codigo_subgrupo, grupo_id")),
      applyEstrutura(supabase.from("mcse_contas").select("id, codigo_mcse")),
    ]);
    if (gRes.error || sRes.error || cRes.error) {
      toast.error("Falha ao carregar dados existentes da estrutura.");
      return;
    }
    const existingGrupos = new Map<string, string>();
    (gRes.data || []).forEach((g: any) => existingGrupos.set(String(g.codigo_grupo), g.id));
    const existingSubgrupos = new Map<string, string>();
    (sRes.data || []).forEach((s: any) => existingSubgrupos.set(String(s.codigo_subgrupo), s.id));
    const existingContas = new Map<string, string>();
    (cRes.data || []).forEach((c: any) => existingContas.set(String(c.codigo_mcse), c.id));

    const grupos: ImportPlan["grupos"] = new Map();
    const subgrupos: ImportPlan["subgrupos"] = new Map();
    const contas: ImportPlan["contas"] = [];

    const grupoNomesPorCodigo = new Map<string, Set<string>>();
    const subgrupoNomesPorCodigo = new Map<string, Set<string>>();
    const contasNoArquivo = new Set<string>();

    rows.forEach((row, idx) => {
      const line = idx + 2;
      const codGrupo = row.codigo_grupo?.trim();
      const nomeGrupo = row.nome_grupo?.trim();
      const codSub = row.codigo_subgrupo?.trim();
      const nomeSub = row.nome_subgrupo?.trim();
      const codConta = row.codigo_conta?.trim();
      const descConta = row.descricao_conta?.trim();

      // Toda linha precisa de grupo
      if (!codGrupo) {
        errors.push({ line, field: "codigo_grupo", message: "codigo_grupo é obrigatório em toda linha" });
        return;
      }
      if (!nomeGrupo && !existingGrupos.has(codGrupo) && !grupos.has(codGrupo)) {
        errors.push({ line, field: "nome_grupo", message: "nome_grupo é obrigatório ao criar grupo novo" });
        return;
      }

      // Acumula nomes de grupo para detectar conflito
      if (nomeGrupo) {
        if (!grupoNomesPorCodigo.has(codGrupo)) grupoNomesPorCodigo.set(codGrupo, new Set());
        grupoNomesPorCodigo.get(codGrupo)!.add(nomeGrupo);
      }

      // Registra grupo (primeiro a aparecer prevalece; demais reforçam nome)
      if (!grupos.has(codGrupo)) {
        grupos.set(codGrupo, {
          row,
          line,
          action: existingGrupos.has(codGrupo) ? "update" : "create",
          existingId: existingGrupos.get(codGrupo),
        });
      }

      // Subgrupo
      if (codSub) {
        if (!nomeSub && !existingSubgrupos.has(codSub) && !subgrupos.has(codSub)) {
          errors.push({ line, field: "nome_subgrupo", message: "nome_subgrupo é obrigatório ao criar subgrupo novo" });
          return;
        }
        if (nomeSub) {
          if (!subgrupoNomesPorCodigo.has(codSub)) subgrupoNomesPorCodigo.set(codSub, new Set());
          subgrupoNomesPorCodigo.get(codSub)!.add(nomeSub);
        }
        if (!subgrupos.has(codSub)) {
          subgrupos.set(codSub, {
            row,
            line,
            grupoCodigo: codGrupo,
            action: existingSubgrupos.has(codSub) ? "update" : "create",
            existingId: existingSubgrupos.get(codSub),
          });
        }
      }

      // Conta
      if (codConta) {
        if (!descConta) {
          errors.push({ line, field: "descricao_conta", message: "descricao_conta é obrigatória" });
          return;
        }
        if (!codSub) {
          errors.push({ line, field: "codigo_subgrupo", message: "Conta exige um subgrupo (codigo_subgrupo)" });
          return;
        }
        if (contasNoArquivo.has(codConta)) {
          warnings.push({ line, field: "codigo_conta", message: `codigo_conta "${codConta}" repetida no arquivo` });
        }
        contasNoArquivo.add(codConta);
        contas.push({
          row,
          line,
          grupoCodigo: codGrupo,
          subgrupoCodigo: codSub,
          action: existingContas.has(codConta) ? "update" : "create",
          existingId: existingContas.get(codConta),
        });
      }
    });

    // Conflitos de nomes
    grupoNomesPorCodigo.forEach((nomes, cod) => {
      if (nomes.size > 1) {
        warnings.push({ line: 0, field: "nome_grupo", message: `Grupo "${cod}" com nomes diferentes: ${[...nomes].join(" / ")}` });
      }
    });
    subgrupoNomesPorCodigo.forEach((nomes, cod) => {
      if (nomes.size > 1) {
        warnings.push({ line: 0, field: "nome_subgrupo", message: `Subgrupo "${cod}" com nomes diferentes: ${[...nomes].join(" / ")}` });
      }
    });

    setPlan({ grupos, subgrupos, contas, errors, warnings });
  };

  const summary = useMemo(() => {
    if (!plan) return null;
    const gC = [...plan.grupos.values()].filter((x) => x.action === "create").length;
    const gU = [...plan.grupos.values()].filter((x) => x.action === "update").length;
    const sC = [...plan.subgrupos.values()].filter((x) => x.action === "create").length;
    const sU = [...plan.subgrupos.values()].filter((x) => x.action === "update").length;
    const cC = plan.contas.filter((x) => x.action === "create").length;
    const cU = plan.contas.filter((x) => x.action === "update").length;
    return { gC, gU, sC, sU, cC, cU };
  }, [plan]);

  const hasErrors = (plan?.errors.length ?? 0) > 0;

  const executeImport = async () => {
    if (!plan || hasErrors) return;
    setImporting(true);
    const res: ImportResult = {
      gruposCriados: 0,
      gruposAtualizados: 0,
      subgruposCriados: 0,
      subgruposAtualizados: 0,
      contasCriadas: 0,
      contasAtualizadas: 0,
      ignoradas: 0,
      erros: [],
    };
    const withEstrutura = <T extends Record<string, any>>(payload: T): T =>
      estruturaId ? ({ ...payload, estrutura_id: estruturaId } as T) : payload;

    try {
      // 1) Grupos
      const grupoIdByCodigo = new Map<string, string>();
      for (const [cod, item] of plan.grupos) {
        const ativo = parseBoolFlexible(item.row.ativo);
        const payload: any = {
          codigo_grupo: cod,
          descricao_grupo: item.row.nome_grupo?.trim() || cod,
          ativo,
        };
        try {
          if (item.action === "update" && item.existingId) {
            const { error } = await supabase
              .from("mcse_grupos")
              .update({ descricao_grupo: payload.descricao_grupo, ativo: payload.ativo })
              .eq("id", item.existingId);
            if (error) throw error;
            grupoIdByCodigo.set(cod, item.existingId);
            res.gruposAtualizados++;
          } else {
            const { data, error } = await supabase
              .from("mcse_grupos")
              .insert(withEstrutura(payload))
              .select("id")
              .single();
            if (error) throw error;
            grupoIdByCodigo.set(cod, data!.id);
            res.gruposCriados++;
          }
        } catch (err: any) {
          res.erros.push({ line: item.line, message: `Grupo "${cod}": ${err.message}` });
        }
      }

      // 2) Subgrupos
      const subgrupoIdByCodigo = new Map<string, string>();
      for (const [cod, item] of plan.subgrupos) {
        const grupoId = grupoIdByCodigo.get(item.grupoCodigo);
        if (!grupoId) {
          res.erros.push({ line: item.line, message: `Subgrupo "${cod}" sem grupo válido` });
          continue;
        }
        const payload: any = {
          codigo_subgrupo: cod,
          descricao_subgrupo: item.row.nome_subgrupo?.trim() || cod,
          grupo_id: grupoId,
          ativo: parseBoolFlexible(item.row.ativo),
        };
        try {
          if (item.action === "update" && item.existingId) {
            const { error } = await supabase
              .from("mcse_subgrupos")
              .update({
                descricao_subgrupo: payload.descricao_subgrupo,
                grupo_id: payload.grupo_id,
                ativo: payload.ativo,
              })
              .eq("id", item.existingId);
            if (error) throw error;
            subgrupoIdByCodigo.set(cod, item.existingId);
            res.subgruposAtualizados++;
          } else {
            const { data, error } = await supabase
              .from("mcse_subgrupos")
              .insert(withEstrutura(payload))
              .select("id")
              .single();
            if (error) throw error;
            subgrupoIdByCodigo.set(cod, data!.id);
            res.subgruposCriados++;
          }
        } catch (err: any) {
          res.erros.push({ line: item.line, message: `Subgrupo "${cod}": ${err.message}` });
        }
      }

      // 3) Contas
      for (const item of plan.contas) {
        const grupoId = grupoIdByCodigo.get(item.grupoCodigo);
        const subgrupoId = item.subgrupoCodigo ? subgrupoIdByCodigo.get(item.subgrupoCodigo) : null;
        if (!grupoId || !subgrupoId) {
          res.erros.push({
            line: item.line,
            message: `Conta "${item.row.codigo_conta}" sem hierarquia válida (grupo/subgrupo)`,
          });
          continue;
        }
        const payload: any = {
          codigo_mcse: item.row.codigo_conta?.trim(),
          descricao_conta: item.row.descricao_conta?.trim(),
          grupo_id: grupoId,
          subgrupo_id: subgrupoId,
          ativo: parseBoolFlexible(item.row.ativo),
        };
        try {
          if (item.action === "update" && item.existingId) {
            const { error } = await supabase
              .from("mcse_contas")
              .update({
                descricao_conta: payload.descricao_conta,
                grupo_id: payload.grupo_id,
                subgrupo_id: payload.subgrupo_id,
                ativo: payload.ativo,
              })
              .eq("id", item.existingId);
            if (error) throw error;
            res.contasAtualizadas++;
          } else {
            const { error } = await supabase
              .from("mcse_contas")
              .insert(withEstrutura({ ...payload, natureza: "ativo", nivel: 1 }));
            if (error) throw error;
            res.contasCriadas++;
          }
        } catch (err: any) {
          res.erros.push({ line: item.line, message: `Conta "${item.row.codigo_conta}": ${err.message}` });
        }
      }

      setResult(res);
      qc.invalidateQueries({ queryKey: ["mcse_grupos"] });
      qc.invalidateQueries({ queryKey: ["mcse_subgrupos"] });
      qc.invalidateQueries({ queryKey: ["mcse_contas"] });
      if (res.erros.length === 0) toast.success("Importação concluída com sucesso.");
      else toast.warning(`Importação concluída com ${res.erros.length} erro(s).`);
    } catch (err: any) {
      toast.error(`Erro fatal: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={18} />
            Importar Estrutura de Referência
            {estruturaCodigo && (
              <Badge variant="outline" className="ml-2 font-mono">
                {estruturaCodigo}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded border bg-muted/40 p-3 text-sm flex items-start gap-2">
          <Info size={16} className="mt-0.5 text-muted-foreground" />
          <div>
            Os dados serão importados <strong>somente</strong> para a estrutura{" "}
            <strong>{estruturaCodigo || "(legado)"}</strong>
            {estruturaNome ? ` — ${estruturaNome}` : ""}. Outras estruturas não são afetadas.
          </div>
        </div>

        {/* Step 1: Upload */}
        {!csv && !result && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center w-full">
              <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Selecione um arquivo CSV (separado por vírgula ou ponto-e-vírgula).
                <br />
                Colunas esperadas: codigo_grupo, nome_grupo, codigo_subgrupo, nome_subgrupo, codigo_conta,
                descricao_conta, ativo, observacao.
              </p>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                Escolher arquivo
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview / plano */}
        {csv && plan && !result && (
          <div className="space-y-4">
            {/* Errors */}
            {plan.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                  <AlertTriangle size={16} />
                  {plan.errors.length} erro(s) — corrija o arquivo antes de importar
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {plan.errors.slice(0, 50).map((e, i) => (
                    <p key={i} className="text-xs text-destructive">
                      Linha {e.line}: [{e.field}] {e.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {plan.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 text-amber-600 font-medium mb-2">
                  <AlertTriangle size={16} />
                  {plan.warnings.length} alerta(s)
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {plan.warnings.slice(0, 50).map((w, i) => (
                    <p key={i} className="text-xs text-amber-700 dark:text-amber-500">
                      {w.line ? `Linha ${w.line}: ` : ""}[{w.field}] {w.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Grupos a criar", v: summary.gC, color: "text-green-600" },
                  { label: "Grupos a atualizar", v: summary.gU, color: "text-blue-600" },
                  { label: "Total linhas", v: csv.rows.length, color: "" },
                  { label: "Subgrupos a criar", v: summary.sC, color: "text-green-600" },
                  { label: "Subgrupos a atualizar", v: summary.sU, color: "text-blue-600" },
                  { label: "Erros", v: plan.errors.length, color: "text-destructive" },
                  { label: "Contas a criar", v: summary.cC, color: "text-green-600" },
                  { label: "Contas a atualizar", v: summary.cU, color: "text-blue-600" },
                  { label: "Alertas", v: plan.warnings.length, color: "text-amber-600" },
                ].map((c, i) => (
                  <div key={i} className="rounded border p-2 text-center">
                    <p className={`text-xl font-bold ${c.color}`}>{c.v}</p>
                    <p className="text-[11px] text-muted-foreground">{c.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Preview rows */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Preview ({Math.min(csv.rows.length, 10)} de {csv.rows.length} linhas)
              </p>
              <div className="rounded border overflow-x-auto max-h-56">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-10">#</TableHead>
                      {csv.headers.map((h) => (
                        <TableHead key={h} className="text-xs whitespace-nowrap">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csv.rows.slice(0, 10).map((row, i) => {
                      const lineErrs = plan.errors.filter((e) => e.line === i + 2);
                      return (
                        <TableRow key={i} className={lineErrs.length > 0 ? "bg-destructive/5" : ""}>
                          <TableCell className="text-xs text-muted-foreground">{i + 2}</TableCell>
                          {csv.headers.map((h) => (
                            <TableCell key={h} className="text-xs py-1">
                              {(row as any)[h] ?? ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={reset} disabled={importing}>
                Cancelar
              </Button>
              <Button onClick={executeImport} disabled={importing || hasErrors}>
                {importing ? "Importando..." : "Confirmar importação"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {result && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-lg font-medium">
              <CheckCircle2 size={20} className="text-green-600" />
              Importação concluída
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Grupos criados", v: result.gruposCriados, color: "text-green-600" },
                { label: "Grupos atualizados", v: result.gruposAtualizados, color: "text-blue-600" },
                { label: "Erros", v: result.erros.length, color: "text-destructive" },
                { label: "Subgrupos criados", v: result.subgruposCriados, color: "text-green-600" },
                { label: "Subgrupos atualizados", v: result.subgruposAtualizados, color: "text-blue-600" },
                { label: "Ignoradas", v: result.ignoradas, color: "" },
                { label: "Contas criadas", v: result.contasCriadas, color: "text-green-600" },
                { label: "Contas atualizadas", v: result.contasAtualizadas, color: "text-blue-600" },
                { label: "", v: "", color: "" },
              ].map((c, i) => (
                <div key={i} className="rounded border p-2 text-center">
                  <p className={`text-xl font-bold ${c.color}`}>{c.v}</p>
                  <p className="text-[11px] text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>
            {result.erros.length > 0 && (
              <div className="rounded border border-destructive/30 p-3 max-h-40 overflow-y-auto">
                {result.erros.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">
                    Linha {e.line}: {e.message}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                Nova importação
              </Button>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
