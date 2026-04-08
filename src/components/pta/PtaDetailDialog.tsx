import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import logoImg from "@/assets/logo_audiconsult.jpg";
import { supabase } from "@/lib/supabase-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Save, ClipboardList, Trash2, RefreshCw, Plus, FileDown } from "lucide-react";
import PtaVincularLinhasDialog from "./PtaVincularLinhasDialog";

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toFixed(1) + "%";
}

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_analise", label: "Em Análise" },
  { value: "em_revisao", label: "Em Revisão" },
  { value: "concluido", label: "Concluído" },
  { value: "finalizado", label: "Finalizado" },
];

const STATUS_LINHA_MAP: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  em_analise: { label: "Em Análise", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  validado: { label: "Validado", cls: "bg-green-100 text-green-800 border-green-200" },
  divergente: { label: "Divergente", cls: "bg-red-100 text-red-800 border-red-200" },
  revisado: { label: "Revisado", cls: "bg-purple-100 text-purple-800 border-purple-200" },
  concluido: { label: "Concluído", cls: "bg-green-200 text-green-900 border-green-300" },
};

interface Props {
  pta: any;
  onClose: () => void;
}

export default function PtaDetailDialog({ pta, onClose }: Props) {
  const queryClient = useQueryClient();
  const [showVincular, setShowVincular] = useState(false);

  // Form state
  const [tituloPta, setTituloPta] = useState("");
  const [objetivoProcedimento, setObjetivoProcedimento] = useState("");
  const [statusPta, setStatusPta] = useState("pendente");
  const [comentarioAuditor, setComentarioAuditor] = useState("");
  const [comentarioRevisor, setComentarioRevisor] = useState("");
  const [conclusaoPreliminar, setConclusaoPreliminar] = useState("");
  const [conclusaoFinal, setConclusaoFinal] = useState("");
  const [materialidadeAplicavel, setMaterialidadeAplicavel] = useState(false);
  const [limiteMaterialidade, setLimiteMaterialidade] = useState("");
  const [limiteVariacao, setLimiteVariacao] = useState("");

  useEffect(() => {
    if (pta) {
      setTituloPta(pta.titulo_pta || "");
      setObjetivoProcedimento(pta.objetivo_procedimento || "");
      setStatusPta(pta.status_pta || "pendente");
      setComentarioAuditor(pta.comentario_auditor || "");
      setComentarioRevisor(pta.comentario_revisor || "");
      setConclusaoPreliminar(pta.conclusao_preliminar || "");
      setConclusaoFinal(pta.conclusao_final || "");
      setMaterialidadeAplicavel(pta.materialidade_aplicavel || false);
      setLimiteMaterialidade(pta.limite_materialidade != null ? String(pta.limite_materialidade) : "");
      setLimiteVariacao(pta.limite_variacao != null ? String(pta.limite_variacao) : "");
    }
  }, [pta]);

  // Fetch linked lines
  const { data: linkedLines = [], refetch: refetchLines } = useQuery({
    queryKey: ["papel_trabalho_linhas", pta?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("papel_trabalho_linhas")
        .select("*, balancete_linhas(codigo_conta_balancete, descricao_conta_balancete, saldo_atual, valor_validado, diferenca_validacao, status_linha, possui_pendencia, severidade, conta_origem_id, cliente_contas_origem(analitica))")
        .eq("papel_trabalho_id", pta.id)
        .order("created_at");
      return data || [];
    },
    enabled: !!pta?.id,
  });

  // Fetch audit team for this trabalho
  const { data: equipeAuditores = [] } = useQuery({
    queryKey: ["trabalho_auditores_equipe", pta?.trabalho_auditoria_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trabalho_auditores")
        .select("papel_no_trabalho, responsavel_principal, auditores(nome, cargo)")
        .eq("trabalho_auditoria_id", pta.trabalho_auditoria_id)
        .eq("ativo", true)
        .order("responsavel_principal", { ascending: false });
      return data || [];
    },
    enabled: !!pta?.trabalho_auditoria_id,
  });

  // Recalculate consolidation
  const recalcMutation = useMutation({
    mutationFn: async () => {
      // Fetch fresh line data
      const { data: ptaLinhas } = await supabase
        .from("papel_trabalho_linhas")
        .select("balancete_linha_id")
        .eq("papel_trabalho_id", pta.id);

      if (!ptaLinhas || ptaLinhas.length === 0) {
        await supabase.from("papeis_trabalho").update({
          saldo_anterior_total: 0, saldo_atual_total: 0, valor_validado_total: null,
          diferenca_total: null, variacao_absoluta_total: null, variacao_percentual_total: null,
          total_linhas_vinculadas: 0, total_linhas_com_pendencia: 0, total_documentos_referencia: 0,
        }).eq("id", pta.id);
        return;
      }

      const linhaIds = ptaLinhas.map(l => l.balancete_linha_id);
      const { data: linhasRaw } = await supabase
        .from("balancete_linhas")
        .select("id, saldo_anterior, saldo_atual, valor_validado, diferenca_validacao, status_linha, possui_pendencia, conta_origem_id, cliente_contas_origem(analitica)")
        .in("id", linhaIds);

      if (!linhasRaw) return;

      // Only sum synthetic accounts (analitica = false) to avoid double-counting
      const linhasSinteticas = linhasRaw.filter((l: any) => {
        const analitica = l.cliente_contas_origem?.analitica;
        return analitica === false || analitica == null;
      });

      const saldoAnt = linhasSinteticas.reduce((s: number, l: any) => s + (l.saldo_anterior || 0), 0);
      const saldoAtual = linhasSinteticas.reduce((s: number, l: any) => s + (l.saldo_atual || 0), 0);
      const hasValidado = linhasSinteticas.some((l: any) => l.valor_validado != null);
      const valValidado = hasValidado ? linhasSinteticas.reduce((s: number, l: any) => s + (l.valor_validado || 0), 0) : null;
      const diferenca = valValidado != null ? saldoAtual - valValidado : null;
      const varAbs = saldoAtual - saldoAnt;
      const varPct = saldoAnt !== 0 ? ((saldoAtual - saldoAnt) / saldoAnt) * 100 : null;
      const pendencias = linhasSinteticas.filter((l: any) => l.possui_pendencia).length;

      // Count documents
      const { count: docCount } = await supabase
        .from("documentos_referencia_balancete")
        .select("id", { count: "exact", head: true })
        .in("balancete_linha_id", linhaIds)
        .eq("ativo", true);

      // Update snapshots (all lines, not just synthetic)
      const { data: fullLinhas } = await supabase
        .from("balancete_linhas")
        .select("id, saldo_atual, valor_validado, diferenca_validacao, status_linha")
        .in("id", linhaIds);

      if (fullLinhas) {
        for (const fl of fullLinhas) {
          await supabase.from("papel_trabalho_linhas")
            .update({
              saldo_atual_linha: fl.saldo_atual,
              valor_validado_linha: fl.valor_validado,
              diferenca_linha: fl.diferenca_validacao,
              status_linha_snapshot: fl.status_linha,
            })
            .eq("papel_trabalho_id", pta.id)
            .eq("balancete_linha_id", fl.id);
        }
      }

      await supabase.from("papeis_trabalho").update({
        saldo_anterior_total: saldoAnt,
        saldo_atual_total: saldoAtual,
        valor_validado_total: valValidado,
        diferenca_total: diferenca,
        variacao_absoluta_total: varAbs,
        variacao_percentual_total: varPct,
        total_linhas_vinculadas: linhasRaw.length,
        total_linhas_com_pendencia: pendencias,
        total_documentos_referencia: docCount || 0,
      }).eq("id", pta.id);
    },
    onSuccess: () => {
      toast.success("Consolidação recalculada");
      queryClient.invalidateQueries({ queryKey: ["papeis_trabalho"] });
      queryClient.invalidateQueries({ queryKey: ["papel_trabalho_linhas", pta.id] });
      refetchLines();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Save PTA
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("papeis_trabalho")
        .update({
          titulo_pta: tituloPta,
          objetivo_procedimento: objetivoProcedimento.trim() || null,
          status_pta: statusPta as any,
          comentario_auditor: comentarioAuditor.trim() || null,
          comentario_revisor: comentarioRevisor.trim() || null,
          conclusao_preliminar: conclusaoPreliminar.trim() || null,
          conclusao_final: conclusaoFinal.trim() || null,
          materialidade_aplicavel: materialidadeAplicavel,
          limite_materialidade: limiteMaterialidade ? parseFloat(limiteMaterialidade) : null,
          limite_variacao: limiteVariacao ? parseFloat(limiteVariacao) : null,
        })
        .eq("id", pta.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PTA salvo com sucesso");
      queryClient.invalidateQueries({ queryKey: ["papeis_trabalho"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Remove line
  const removeLinhaMutation = useMutation({
    mutationFn: async (linhaId: string) => {
      const { error } = await supabase
        .from("papel_trabalho_linhas")
        .delete()
        .eq("id", linhaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Linha removida do PTA");
      refetchLines();
      recalcMutation.mutate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Sort linked lines by codigo_conta_balancete
  const sortedLinkedLines = useMemo(() => {
    return [...linkedLines].sort((a: any, b: any) => {
      const codeA = a.balancete_linhas?.codigo_conta_balancete || "";
      const codeB = b.balancete_linhas?.codigo_conta_balancete || "";
      return codeA.localeCompare(codeB, "pt-BR", { numeric: true });
    });
  }, [linkedLines]);

  // Generate PDF
  const handleExportPdf = async () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup bloqueado — permita pop-ups para gerar o PDF");
      return;
    }

    // Convert logo to base64 for embedding
    let logoBase64 = "";
    try {
      const response = await fetch(logoImg);
      const blob = await response.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { /* logo won't show if it fails */ }

    const PAPEL_MAP: Record<string, string> = {
      elaborador: "Elaborador",
      revisor_1: "Revisor 1",
      revisor_2: "Revisor 2",
      gerente: "Gerente",
      socio: "Sócio",
    };

    const equipeHtml = equipeAuditores.length > 0
      ? equipeAuditores.map((ea: any) => {
          const nome = ea.auditores?.nome || "—";
          const papel = PAPEL_MAP[ea.papel_no_trabalho] || ea.papel_no_trabalho;
          const resp = ea.responsavel_principal ? " (Responsável)" : "";
          return `<li>${nome} — <em>${papel}${resp}</em></li>`;
        }).join("")
      : "<li style='color:#999'>Nenhum auditor vinculado</li>";

    const linhasHtml = sortedLinkedLines.map((ll: any) => {
      const bl = ll.balancete_linhas;
      const hasDif = bl?.diferenca_validacao != null && bl?.diferenca_validacao !== 0;
      return `<tr>
        <td style="font-family:monospace">${bl?.codigo_conta_balancete || ""}</td>
        <td>${bl?.descricao_conta_balancete || ""}</td>
        <td style="text-align:right;font-family:monospace">${fmt(bl?.saldo_atual)}</td>
        <td style="text-align:right;font-family:monospace">${fmt(bl?.valor_validado)}</td>
        <td style="text-align:right;font-family:monospace;${hasDif ? "color:#b45309;font-weight:600" : ""}">${fmt(bl?.diferenca_validacao)}</td>
        <td>${bl?.status_linha || "pendente"}</td>
        <td>${bl?.possui_pendencia ? "Sim" : "Não"}</td>
      </tr>`;
    }).join("");

    const statusLabel = STATUS_OPTIONS.find(s => s.value === pta.status_pta)?.label || pta.status_pta;
    const dataAtual = new Date().toLocaleDateString("pt-BR");

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>PTA — ${pta.titulo_pta || pta.codigo_mcse || "Sem título"}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .header-left { flex: 1; }
  .header-logo img { max-height: 50px; max-width: 160px; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  h2 { font-size: 13px; margin-top: 16px; margin-bottom: 6px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
  .subtitle { color: #666; font-size: 11px; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: 140px 1fr; gap: 2px 8px; margin-bottom: 8px; }
  .grid .label { color: #666; }
  .stats { display: flex; gap: 16px; margin-bottom: 8px; }
  .stat { text-align: center; flex: 1; background: #f5f5f5; padding: 6px; border-radius: 4px; }
  .stat .val { font-family: monospace; font-weight: 600; font-size: 12px; }
  .stat .lbl { color: #666; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; font-size: 10px; }
  th { background: #f0f0f0; font-weight: 600; }
  .obs { margin-top: 8px; }
  .obs p { white-space: pre-wrap; background: #fafafa; padding: 6px; border-radius: 4px; min-height: 20px; border: 1px solid #eee; }
  .equipe-list { list-style: none; padding: 0; margin: 4px 0; }
  .equipe-list li { padding: 2px 0; font-size: 11px; }
  .footer { margin-top: 20px; color: #999; font-size: 9px; text-align: center; border-top: 1px solid #eee; padding-top: 6px; }
  @media print { body { padding: 12px; } }
</style></head><body>

<div class="header">
  <div class="header-left">
    <h1>Papel de Trabalho de Auditoria</h1>
    <div class="subtitle">${pta.titulo_pta || "Sem título"} — Status: ${statusLabel} — Data: ${dataAtual}</div>
  </div>
  ${logoBase64 ? `<div class="header-logo"><img src="${logoBase64}" alt="Logo" /></div>` : ""}
</div>

<h2>Identificação</h2>
<div class="grid">
  <span class="label">Trabalho:</span><span>${pta.trabalhos_auditoria?.nome_trabalho || "—"}</span>
  <span class="label">Cliente:</span><span>${pta.clientes?.razao_social || "—"}</span>
  <span class="label">Exercício:</span><span>${pta.exercicios?.ano_exercicio || "—"}</span>
  <span class="label">Conta MCSE:</span><span style="font-family:monospace">${pta.codigo_mcse || "—"} ${pta.descricao_mcse ? "— " + pta.descricao_mcse : ""}</span>
  <span class="label">Grupo / Subgrupo:</span><span>${pta.grupo_mcse || "—"} / ${pta.subgrupo_mcse || "—"}</span>
</div>

<h2>Equipe de Auditoria</h2>
<ul class="equipe-list">${equipeHtml}</ul>

${objetivoProcedimento ? `<h2>Objetivo do Procedimento</h2><div class="obs"><p>${objetivoProcedimento}</p></div>` : ""}

<h2>Consolidação</h2>
<div class="stats">
  <div class="stat"><div class="lbl">Saldo Anterior</div><div class="val">${fmt(pta.saldo_anterior_total)}</div></div>
  <div class="stat"><div class="lbl">Saldo Atual</div><div class="val">${fmt(pta.saldo_atual_total)}</div></div>
  <div class="stat"><div class="lbl">Valor Validado</div><div class="val">${fmt(pta.valor_validado_total)}</div></div>
  <div class="stat"><div class="lbl">Diferença</div><div class="val" style="${pta.diferenca_total && pta.diferenca_total !== 0 ? "color:#b45309" : ""}">${fmt(pta.diferenca_total)}</div></div>
  <div class="stat"><div class="lbl">Var. Absoluta</div><div class="val">${fmt(pta.variacao_absoluta_total)}</div></div>
  <div class="stat"><div class="lbl">Var. %</div><div class="val">${fmtPct(pta.variacao_percentual_total)}</div></div>
</div>

<h2>Linhas Vinculadas (${sortedLinkedLines.length})</h2>
<table>
  <thead><tr><th>Código</th><th>Descrição</th><th style="text-align:right">Saldo Atual</th><th style="text-align:right">Val. Validado</th><th style="text-align:right">Diferença</th><th>Status</th><th>Pendência</th></tr></thead>
  <tbody>${linhasHtml || "<tr><td colspan='7' style='text-align:center;color:#999'>Nenhuma linha vinculada</td></tr>"}</tbody>
</table>

${comentarioAuditor ? `<h2>Comentário do Auditor</h2><div class="obs"><p>${comentarioAuditor}</p></div>` : ""}
${comentarioRevisor ? `<h2>Comentário do Revisor</h2><div class="obs"><p>${comentarioRevisor}</p></div>` : ""}
${conclusaoPreliminar ? `<h2>Conclusão Preliminar</h2><div class="obs"><p>${conclusaoPreliminar}</p></div>` : ""}
${conclusaoFinal ? `<h2>Conclusão Final</h2><div class="obs"><p>${conclusaoFinal}</p></div>` : ""}

<div class="footer">Documento gerado em ${dataAtual} — Papel de Trabalho de Auditoria — Uso interno</div>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!pta) return null;

  return (
    <>
      <Dialog open={!!pta} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ClipboardList size={18} />
              Papel de Trabalho — {pta.codigo_mcse || "Manual"}
            </DialogTitle>
          </DialogHeader>

          {/* Block 1 — Identification */}
          <div className="space-y-1">
            <h4 className="font-medium text-sm text-muted-foreground">Identificação</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm bg-muted/30 rounded-md p-3">
              <span className="text-muted-foreground">Trabalho:</span>
              <span>{pta.trabalhos_auditoria?.nome_trabalho}</span>
              <span className="text-muted-foreground">Cliente:</span>
              <span>{pta.clientes?.razao_social}</span>
              <span className="text-muted-foreground">Exercício:</span>
              <span>{pta.exercicios?.ano_exercicio}</span>
              <span className="text-muted-foreground">MCSE:</span>
              <span className="font-mono">{pta.codigo_mcse || "—"} {pta.descricao_mcse ? `— ${pta.descricao_mcse}` : ""}</span>
              <span className="text-muted-foreground">Grupo / Subgrupo:</span>
              <span>{pta.grupo_mcse || "—"} / {pta.subgrupo_mcse || "—"}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Título do PTA</Label>
                <Input value={tituloPta} onChange={e => setTituloPta(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={statusPta} onValueChange={setStatusPta}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Objetivo do Procedimento</Label>
              <Textarea placeholder="Descreva o objetivo..." value={objetivoProcedimento} onChange={e => setObjetivoProcedimento(e.target.value)} className="min-h-[50px]" />
            </div>
          </div>

          <Separator />

          {/* Block 2 — Consolidation */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground">Consolidação</h4>
              <Button variant="outline" size="sm" onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}>
                <RefreshCw size={13} className={`mr-1 ${recalcMutation.isPending ? "animate-spin" : ""}`} />
                Recalcular
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs bg-muted/30 rounded-md p-3">
              <div className="text-center">
                <span className="text-muted-foreground block">Saldo Anterior</span>
                <span className="font-mono font-medium">{fmt(pta.saldo_anterior_total)}</span>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground block">Saldo Atual</span>
                <span className="font-mono font-semibold">{fmt(pta.saldo_atual_total)}</span>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground block">Valor Validado</span>
                <span className="font-mono font-medium">{fmt(pta.valor_validado_total)}</span>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground block">Diferença</span>
                <span className={`font-mono font-semibold ${pta.diferenca_total && pta.diferenca_total !== 0 ? "text-amber-600" : ""}`}>
                  {fmt(pta.diferenca_total)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground block">Var. Absoluta</span>
                <span className="font-mono">{fmt(pta.variacao_absoluta_total)}</span>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground block">Var. %</span>
                <span className="font-mono">{fmtPct(pta.variacao_percentual_total)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Block 3 — Stats */}
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-muted/30 rounded-md p-3">
              <span className="text-muted-foreground text-xs block">Linhas Vinculadas</span>
              <span className="font-semibold text-lg">{pta.total_linhas_vinculadas || 0}</span>
            </div>
            <div className="bg-muted/30 rounded-md p-3">
              <span className="text-muted-foreground text-xs block">Com Pendência</span>
              <span className={`font-semibold text-lg ${(pta.total_linhas_com_pendencia || 0) > 0 ? "text-amber-600" : ""}`}>{pta.total_linhas_com_pendencia || 0}</span>
            </div>
            <div className="bg-muted/30 rounded-md p-3">
              <span className="text-muted-foreground text-xs block">Documentos</span>
              <span className="font-semibold text-lg">{pta.total_documentos_referencia || 0}</span>
            </div>
          </div>

          <Separator />

          {/* Block 4 — Comments */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Comentários e Conclusões</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Comentário do Auditor</Label>
                <Textarea value={comentarioAuditor} onChange={e => setComentarioAuditor(e.target.value)} className="min-h-[60px]" placeholder="Observações da análise..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comentário do Revisor</Label>
                <Textarea value={comentarioRevisor} onChange={e => setComentarioRevisor(e.target.value)} className="min-h-[60px]" placeholder="Observações da revisão..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Conclusão Preliminar</Label>
              <Textarea value={conclusaoPreliminar} onChange={e => setConclusaoPreliminar(e.target.value)} className="min-h-[50px]" placeholder="Conclusão preliminar..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Conclusão Final</Label>
              <Textarea value={conclusaoFinal} onChange={e => setConclusaoFinal(e.target.value)} className="min-h-[50px]" placeholder="Conclusão final..." />
            </div>
          </div>

          <Separator />

          {/* Block 5 — Params */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Parâmetros de Materialidade</h4>
            <div className="flex items-center gap-2">
              <Checkbox id="mat_apl" checked={materialidadeAplicavel} onCheckedChange={(c) => setMaterialidadeAplicavel(c === true)} />
              <Label htmlFor="mat_apl" className="text-xs cursor-pointer">Materialidade aplicável</Label>
            </div>
            {materialidadeAplicavel && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Limite de Materialidade</Label>
                  <Input type="number" step="0.01" value={limiteMaterialidade} onChange={e => setLimiteMaterialidade(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Limite de Variação (%)</Label>
                  <Input type="number" step="0.01" value={limiteVariacao} onChange={e => setLimiteVariacao(e.target.value)} className="h-9" />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Block 6 — Linked lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground">Linhas Vinculadas ({linkedLines.length})</h4>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPdf}>
                  <FileDown size={13} className="mr-1" /> Salvar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowVincular(true)}>
                  <Plus size={13} className="mr-1" /> Vincular Linhas
                </Button>
              </div>
            </div>
            {linkedLines.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma linha vinculada</p>
            ) : (
              <div className="rounded border max-h-[250px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Código</TableHead>
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="text-xs text-right">Saldo</TableHead>
                      <TableHead className="text-xs text-right">Validado</TableHead>
                      <TableHead className="text-xs text-right">Dif.</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLinkedLines.map((ll: any) => {
                      const bl = ll.balancete_linhas;
                      const isAnalitica = bl?.cliente_contas_origem?.analitica === true;
                      const stMap = STATUS_LINHA_MAP[bl?.status_linha || ""] || { label: bl?.status_linha || "—", cls: "" };
                      return (
                        <TableRow key={ll.id}>
                          <TableCell className="font-mono text-xs">{bl?.codigo_conta_balancete}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{bl?.descricao_conta_balancete}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmt(bl?.saldo_atual)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmt(bl?.valor_validado)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmt(bl?.diferenca_validacao)}</TableCell>
                          <TableCell>
                            {isAnalitica ? (
                              <span className="text-xs italic text-muted-foreground">Analítica</span>
                            ) : (
                              <Badge variant="outline" className={`text-xs ${stMap.cls}`}>{stMap.label}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLinhaMutation.mutate(ll.id)}>
                              <Trash2 size={12} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <Separator />

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
            <Save size={14} className="mr-1" />
            {saveMutation.isPending ? "Salvando..." : "Salvar PTA"}
          </Button>
        </DialogContent>
      </Dialog>

      {showVincular && (
        <PtaVincularLinhasDialog
          ptaId={pta.id}
          trabalhoId={pta.trabalho_auditoria_id}
          clienteId={pta.cliente_id}
          exercicioId={pta.exercicio_id}
          contaMcseId={pta.conta_mcse_id}
          linkedLineIds={linkedLines.map((l: any) => l.balancete_linha_id)}
          onClose={() => { setShowVincular(false); refetchLines(); recalcMutation.mutate(); }}
        />
      )}
    </>
  );
}
