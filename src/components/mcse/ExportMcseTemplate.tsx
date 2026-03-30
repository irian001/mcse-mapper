import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ExportTarget = "grupos" | "subgrupos" | "contas";

const templateConfig: Record<ExportTarget, { headers: string[]; dbFields: string[]; tableName: string; queryFn: () => Promise<any[]> }> = {
  grupos: {
    headers: ["codigo_grupo", "descricao_grupo", "ordem"],
    dbFields: ["codigo_grupo", "descricao_grupo", "ordem"],
    tableName: "mcse_grupos",
    queryFn: async () => {
      const { data } = await supabase.from("mcse_grupos").select("codigo_grupo, descricao_grupo, ordem").order("ordem");
      return data || [];
    },
  },
  subgrupos: {
    headers: ["codigo_subgrupo", "descricao_subgrupo", "ordem", "grupo_codigo"],
    dbFields: ["codigo_subgrupo", "descricao_subgrupo", "ordem"],
    tableName: "mcse_subgrupos",
    queryFn: async () => {
      const { data } = await supabase.from("mcse_subgrupos").select("codigo_subgrupo, descricao_subgrupo, ordem, mcse_grupos(codigo_grupo)").order("ordem");
      return (data || []).map((s: any) => ({ ...s, grupo_codigo: s.mcse_grupos?.codigo_grupo || "" }));
    },
  },
  contas: {
    headers: ["codigo_mcse", "descricao_conta", "natureza", "nivel", "aceita_lancamento", "conta_critica", "aceita_reg_soc", "grupo_codigo", "subgrupo_codigo"],
    dbFields: ["codigo_mcse", "descricao_conta", "natureza", "nivel", "aceita_lancamento", "conta_critica", "aceita_reg_soc"],
    tableName: "mcse_contas",
    queryFn: async () => {
      const { data } = await supabase.from("mcse_contas").select("codigo_mcse, descricao_conta, natureza, nivel, aceita_lancamento, conta_critica, aceita_reg_soc, mcse_grupos(codigo_grupo), mcse_subgrupos(codigo_subgrupo)").order("codigo_mcse");
      return (data || []).map((c: any) => ({
        ...c,
        grupo_codigo: c.mcse_grupos?.codigo_grupo || "",
        subgrupo_codigo: c.mcse_subgrupos?.codigo_subgrupo || "",
      }));
    },
  },
};

export async function exportMcseTemplate(target: ExportTarget, withData: boolean) {
  try {
    const config = templateConfig[target];
    let rows: Record<string, any>[];

    if (withData) {
      rows = await config.queryFn();
    } else {
      rows = [Object.fromEntries(config.headers.map((h) => [h, ""]))];
    }

    const ws = XLSX.utils.json_to_sheet(rows, { header: config.headers });

    // Auto-size columns
    ws["!cols"] = config.headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, target);
    const filename = withData ? `mcse_${target}_export.xlsx` : `mcse_${target}_template.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Arquivo ${filename} exportado!`);
  } catch (err: any) {
    toast.error(`Erro ao exportar: ${err.message}`);
  }
}
