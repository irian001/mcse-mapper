import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";

type ExportTarget = "grupos" | "subgrupos" | "contas";

const exampleRows: Record<ExportTarget, Record<string, string>> = {
  grupos: { codigo_grupo: "1", descricao_grupo: "ATIVO", ordem: "1", ativo: "true" },
  subgrupos: { codigo_subgrupo: "1.1", descricao_subgrupo: "ATIVO CIRCULANTE", ordem: "1", grupo_codigo: "1", ativo: "true" },
  contas: {
    codigo_mcse: "1.1.01", descricao_conta: "Caixa e Equivalentes", natureza: "ativo",
    nivel: "3", aceita_lancamento: "true", conta_critica: "false", aceita_reg_soc: "false",
    grupo_codigo: "1", subgrupo_codigo: "1.1", ativo: "true",
  },
};

const headersByTarget: Record<ExportTarget, string[]> = {
  grupos: ["codigo_grupo", "descricao_grupo", "ordem", "ativo"],
  subgrupos: ["codigo_subgrupo", "descricao_subgrupo", "ordem", "grupo_codigo", "ativo"],
  contas: ["codigo_mcse", "descricao_conta", "natureza", "nivel", "aceita_lancamento", "conta_critica", "aceita_reg_soc", "grupo_codigo", "subgrupo_codigo", "ativo"],
};

function toCsvLine(values: string[]): string {
  return values.map((v) => (/[,;\n"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",");
}

async function fetchExportData(target: ExportTarget): Promise<Record<string, string>[]> {
  if (target === "grupos") {
    const { data } = await supabase.from("mcse_grupos").select("codigo_grupo, descricao_grupo, ordem, ativo").order("ordem");
    return (data || []).map((r: any) => ({
      codigo_grupo: r.codigo_grupo, descricao_grupo: r.descricao_grupo,
      ordem: String(r.ordem), ativo: String(r.ativo),
    }));
  }
  if (target === "subgrupos") {
    const { data } = await supabase.from("mcse_subgrupos").select("codigo_subgrupo, descricao_subgrupo, ordem, ativo, mcse_grupos(codigo_grupo)").order("ordem");
    return (data || []).map((r: any) => ({
      codigo_subgrupo: r.codigo_subgrupo, descricao_subgrupo: r.descricao_subgrupo,
      ordem: String(r.ordem), grupo_codigo: r.mcse_grupos?.codigo_grupo || "", ativo: String(r.ativo),
    }));
  }
  // contas
  const { data } = await supabase.from("mcse_contas").select("codigo_mcse, descricao_conta, natureza, nivel, aceita_lancamento, conta_critica, aceita_reg_soc, ativo, mcse_grupos(codigo_grupo), mcse_subgrupos(codigo_subgrupo)").order("codigo_mcse");
  return (data || []).map((c: any) => ({
    codigo_mcse: c.codigo_mcse, descricao_conta: c.descricao_conta, natureza: c.natureza,
    nivel: String(c.nivel), aceita_lancamento: String(c.aceita_lancamento),
    conta_critica: String(c.conta_critica), aceita_reg_soc: String(c.aceita_reg_soc),
    grupo_codigo: c.mcse_grupos?.codigo_grupo || "", subgrupo_codigo: c.mcse_subgrupos?.codigo_subgrupo || "",
    ativo: String(c.ativo),
  }));
}

export async function exportMcseTemplate(target: ExportTarget, withData: boolean) {
  try {
    const headers = headersByTarget[target];
    const lines: string[] = [toCsvLine(headers)];

    if (withData) {
      const rows = await fetchExportData(target);
      for (const row of rows) lines.push(toCsvLine(headers.map((h) => row[h] ?? "")));
    } else {
      // Template com linha de exemplo
      const ex = exampleRows[target];
      lines.push(toCsvLine(headers.map((h) => ex[h] ?? "")));
    }

    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = withData ? `mcse_${target}_export.csv` : `mcse_${target}_template.csv`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Arquivo ${filename} exportado!`);
  } catch (err: any) {
    toast.error(`Erro ao exportar: ${err.message}`);
  }
}
