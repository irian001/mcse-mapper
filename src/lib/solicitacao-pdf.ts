import { supabase } from "@/lib/supabase-client";

interface PdfSolicitacaoData {
  solicitacao: any;
  itens: any[];
  instrucoes: any[];
  emissaoErp: any[];
}

export async function fetchSolicitacaoPdfData(solicitacaoId: string): Promise<PdfSolicitacaoData> {
  const { data: solicitacao } = await supabase
    .from("solicitacoes_documentos")
    .select("*, trabalhos_auditoria(nome_trabalho), clientes(razao_social), exercicios(ano_exercicio)")
    .eq("id", solicitacaoId)
    .single();

  if (!solicitacao) throw new Error("Solicitação não encontrada");

  const { data: itens } = await supabase
    .from("solicitacao_itens")
    .select("*")
    .eq("solicitacao_id", solicitacaoId)
    .order("ordem");

  const contaMcseIds = [...new Set((itens || []).map((i) => i.conta_mcse_id).filter(Boolean))];
  const regraIds = [...new Set((itens || []).map((i) => i.regra_mcse_id).filter(Boolean))];

  let instrucoes: any[] = [];
  let emissaoErp: any[] = [];

  if (regraIds.length > 0) {
    const { data: instr } = await supabase
      .from("mcse_regras_instrucoes")
      .select("*")
      .in("regra_mcse_id", regraIds)
      .eq("ativo", true)
      .order("ordem");
    instrucoes = instr || [];

    const { data: erp } = await supabase
      .from("mcse_regras_emissao_erp")
      .select("*")
      .in("regra_mcse_id", regraIds)
      .eq("ativo", true)
      .order("ordem");
    emissaoErp = erp || [];
  }

  return { solicitacao, itens: itens || [], instrucoes, emissaoErp };
}

const STATUS_PT: Record<string, string> = {
  rascunho: "Rascunho",
  revisada: "Revisada",
  enviada: "Enviada",
  parcialmente_respondida: "Parcialmente Respondida",
  parcialmente_atendida: "Parcialmente Atendida",
  respondida: "Respondida",
  atendida: "Atendida",
  concluida: "Concluída",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
  pendente: "Pendente",
  recebido: "Recebido",
  aceito: "Aceito",
  rejeitado: "Rejeitado",
  dispensado: "Dispensado",
};

function groupByMcse(items: any[]) {
  const groups = new Map<string, { codigo: string; descricao: string; contaMcseId: string; regraIds: string[]; items: any[] }>();
  for (const item of items) {
    const key = item.conta_mcse_id || item.codigo_mcse || "sem_mcse";
    if (!groups.has(key)) {
      groups.set(key, { codigo: item.codigo_mcse || "", descricao: item.descricao_mcse || "", contaMcseId: item.conta_mcse_id || "", regraIds: [], items: [] });
    }
    const g = groups.get(key)!;
    g.items.push(item);
    if (item.regra_mcse_id && !g.regraIds.includes(item.regra_mcse_id)) g.regraIds.push(item.regra_mcse_id);
  }
  return [...groups.values()];
}

export function gerarSolicitacaoPdfHtml(data: PdfSolicitacaoData, usuario: string): string {
  const { solicitacao: sol, itens, instrucoes, emissaoErp } = data;
  const groups = groupByMcse(itens);
  const now = new Date().toLocaleString("pt-BR");

  const instrByRegra = new Map<string, any[]>();
  for (const i of instrucoes) {
    if (!instrByRegra.has(i.regra_mcse_id)) instrByRegra.set(i.regra_mcse_id, []);
    instrByRegra.get(i.regra_mcse_id)!.push(i);
  }
  const erpByRegra = new Map<string, any[]>();
  for (const e of emissaoErp) {
    if (!erpByRegra.has(e.regra_mcse_id)) erpByRegra.set(e.regra_mcse_id, []);
    erpByRegra.get(e.regra_mcse_id)!.push(e);
  }

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  @page { margin: 20mm 15mm; size: A4; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #222; line-height: 1.5; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  h2 { font-size: 13px; background: #1e293b; color: #fff; padding: 5px 10px; margin: 16px 0 8px; border-radius: 3px; }
  h3 { font-size: 11px; color: #334155; margin: 8px 0 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 8px; text-align: left; font-size: 10px; }
  th { background: #f1f5f9; font-weight: 600; }
  .header-block { border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 12px; }
  .meta { font-size: 10px; color: #64748b; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 600; }
  .badge-obrig { background: #fee2e2; color: #dc2626; }
  .badge-opc { background: #e0f2fe; color: #0369a1; }
  .instr-box { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 4px 8px; margin: 4px 0; font-size: 10px; }
  .erp-box { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 4px 8px; margin: 4px 0; font-size: 10px; }
  .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 9px; color: #94a3b8; }
  </style></head><body>`;

  // Header
  html += `<div class="header-block">`;
  html += `<h1>${esc(sol.titulo_solicitacao)}</h1>`;
  html += `<table style="border:none; margin:0;"><tbody>`;
  html += `<tr><td style="border:none;width:120px" class="meta"><strong>Cliente:</strong></td><td style="border:none">${esc(sol.clientes?.razao_social)}</td>
    <td style="border:none;width:120px" class="meta"><strong>Exercício:</strong></td><td style="border:none">${sol.exercicios?.ano_exercicio}</td></tr>`;
  html += `<tr><td style="border:none" class="meta"><strong>Trabalho:</strong></td><td style="border:none">${esc(sol.trabalhos_auditoria?.nome_trabalho)}</td>
    <td style="border:none" class="meta"><strong>Status:</strong></td><td style="border:none">${STATUS_PT[sol.status_solicitacao] || sol.status_solicitacao}</td></tr>`;
  html += `<tr><td style="border:none" class="meta"><strong>Emissão:</strong></td><td style="border:none">${now}</td>
    <td style="border:none" class="meta"><strong>Prazo:</strong></td><td style="border:none">${sol.prazo_resposta ? new Date(sol.prazo_resposta).toLocaleDateString("pt-BR") : "Não definido"}</td></tr>`;
  html += `</tbody></table>`;
  if (sol.observacoes) html += `<p class="meta" style="margin-top:6px"><strong>Observações:</strong> ${esc(sol.observacoes)}</p>`;
  html += `</div>`;

  // Groups
  for (const group of groups) {
    html += `<h2>${esc(group.codigo)} — ${esc(group.descricao)}</h2>`;

    // Items table
    html += `<table><thead><tr><th style="width:30px">#</th><th>Tipo</th><th>Descrição do Documento</th><th style="width:60px">Obrig.</th><th style="width:70px">Status</th></tr></thead><tbody>`;
    for (const item of group.items) {
      html += `<tr>
        <td>${item.ordem}</td>
        <td>${esc(item.tipo_documento)}</td>
        <td>${esc(item.descricao_documento)}</td>
        <td><span class="badge ${item.obrigatorio ? "badge-obrig" : "badge-opc"}">${item.obrigatorio ? "Sim" : "Não"}</span></td>
        <td>${STATUS_PT[item.status_item] || item.status_item}</td>
      </tr>`;
    }
    html += `</tbody></table>`;

    // Instructions for this group
    const groupInstrs = group.regraIds.flatMap((rid) => instrByRegra.get(rid) || []);
    if (groupInstrs.length > 0) {
      html += `<h3>📋 Instruções ao Cliente</h3>`;
      for (const inst of groupInstrs) {
        html += `<div class="instr-box"><strong>${esc(inst.titulo_instrucao)}</strong><br/>${esc(inst.texto_instrucao)}</div>`;
      }
    }

    // ERP trail for this group
    const groupErps = group.regraIds.flatMap((rid) => erpByRegra.get(rid) || []);
    if (groupErps.length > 0) {
      html += `<h3>🖥️ Trilha de Emissão ERP</h3>`;
      for (const erp of groupErps) {
        html += `<div class="erp-box">`;
        html += `<strong>${esc(erp.erp_nome)}</strong> — ${esc(erp.nome_relatorio)}`;
        if (erp.modulo_erp) html += ` | Módulo: ${esc(erp.modulo_erp)}`;
        if (erp.caminho_emissao) html += `<br/>Caminho: ${esc(erp.caminho_emissao)}`;
        if (erp.filtros_obrigatorios) html += `<br/>Filtros: ${esc(erp.filtros_obrigatorios)}`;
        if (erp.campos_minimos_esperados) html += `<br/>Campos mínimos: ${esc(erp.campos_minimos_esperados)}`;
        if (erp.formato_preferencial) html += `<br/>Formato: ${esc(erp.formato_preferencial)}`;
        html += `</div>`;
      }
    }
  }

  // Footer
  html += `<div class="footer">
    Documento gerado em ${now} por ${esc(usuario)}<br/>
    Solicitação gerada automaticamente pelo sistema de auditoria.
  </div>`;

  html += `</body></html>`;
  return html;
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function downloadPdfViaHtml(htmlContent: string, filename: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    // Fallback: download as HTML
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(".pdf", ".html");
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  // Add print trigger
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 300);
  };
}
