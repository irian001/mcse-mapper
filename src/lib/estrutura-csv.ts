import { supabase } from "@/lib/supabase-client";

/**
 * Esquema unificado para Template / Exportação / Importação de Estruturas de Referência.
 *
 * Uma única planilha hierárquica representa Grupo → Subgrupo → Conta.
 * O escopo é SEMPRE a Estrutura de Auditoria atualmente selecionada
 * (MCSE, COSIF ou outras futuras). Os dados nunca se misturam entre estruturas.
 *
 * Compatibilidade:
 * - As tabelas físicas continuam mcse_grupos / mcse_subgrupos / mcse_contas.
 * - Se a coluna `estrutura_id` ainda não existir (modo legado), a rotina
 *   funciona sem o filtro, mas avisa o caller.
 * - Campos `observacao` não existem fisicamente: são lidos mas ignorados.
 */

export const UNIFIED_HEADERS = [
  "codigo_grupo",
  "nome_grupo",
  "codigo_subgrupo",
  "nome_subgrupo",
  "codigo_conta",
  "descricao_conta",
  "ativo",
  "observacao",
] as const;

export type UnifiedRow = Record<(typeof UNIFIED_HEADERS)[number], string>;

function csvEscape(v: string | number | boolean | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[,;\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, any>[]): string {
  const headers = UNIFIED_HEADERS as readonly string[];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  }
  return "\uFEFF" + lines.join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Template vazio com cabeçalho + 1 linha de exemplo opcional. */
export function downloadTemplateUnificado(estruturaCodigo?: string | null) {
  const example: Record<string, string> = {
    codigo_grupo: "1",
    nome_grupo: "ATIVO",
    codigo_subgrupo: "1.1",
    nome_subgrupo: "ATIVO CIRCULANTE",
    codigo_conta: "1.1.01",
    descricao_conta: "Caixa e Equivalentes",
    ativo: "true",
    observacao: "",
  };
  const csv = toCsv([example]);
  const sufix = estruturaCodigo ? `_${estruturaCodigo}` : "";
  downloadCsv(`template_estrutura${sufix}.csv`, csv);
}

/**
 * Exporta a estrutura selecionada como CSV unificado hierárquico.
 * Cada conta gera uma linha com seu grupo/subgrupo. Grupos sem subgrupos e
 * subgrupos sem contas também aparecem (linhas com colunas inferiores vazias)
 * para preservar a estrutura completa.
 */
export async function exportarEstruturaUnificada(estruturaId: string | null, estruturaCodigo?: string | null) {
  const applyEstrutura = (q: any) => (estruturaId ? q.eq("estrutura_id", estruturaId) : q);

  const [gRes, sRes, cRes] = await Promise.all([
    applyEstrutura(supabase.from("mcse_grupos").select("id, codigo_grupo, descricao_grupo, ativo").order("ordem")),
    applyEstrutura(
      supabase
        .from("mcse_subgrupos")
        .select("id, grupo_id, codigo_subgrupo, descricao_subgrupo, ativo")
        .order("ordem"),
    ),
    applyEstrutura(
      supabase
        .from("mcse_contas")
        .select("id, grupo_id, subgrupo_id, codigo_mcse, descricao_conta, ativo")
        .order("codigo_mcse"),
    ),
  ]);

  if (gRes.error) throw gRes.error;
  if (sRes.error) throw sRes.error;
  if (cRes.error) throw cRes.error;

  const grupos = (gRes.data || []) as any[];
  const subgrupos = (sRes.data || []) as any[];
  const contas = (cRes.data || []) as any[];

  const grupoById = new Map(grupos.map((g) => [g.id, g]));
  const subById = new Map(subgrupos.map((s) => [s.id, s]));

  const subgruposByGrupo = new Map<string, any[]>();
  for (const s of subgrupos) {
    if (!subgruposByGrupo.has(s.grupo_id)) subgruposByGrupo.set(s.grupo_id, []);
    subgruposByGrupo.get(s.grupo_id)!.push(s);
  }
  const usadosSubgrupo = new Set<string>();
  const usadosGrupo = new Set<string>();
  const rows: Record<string, string>[] = [];

  // Linhas para cada conta (com grupo/subgrupo associados)
  for (const c of contas) {
    const g = grupoById.get(c.grupo_id);
    const s = c.subgrupo_id ? subById.get(c.subgrupo_id) : null;
    if (g) usadosGrupo.add(g.id);
    if (s) usadosSubgrupo.add(s.id);
    rows.push({
      codigo_grupo: g?.codigo_grupo ?? "",
      nome_grupo: g?.descricao_grupo ?? "",
      codigo_subgrupo: s?.codigo_subgrupo ?? "",
      nome_subgrupo: s?.descricao_subgrupo ?? "",
      codigo_conta: c.codigo_mcse,
      descricao_conta: c.descricao_conta,
      ativo: String(c.ativo),
      observacao: "",
    });
  }
  // Subgrupos sem contas
  for (const s of subgrupos) {
    if (usadosSubgrupo.has(s.id)) continue;
    const g = grupoById.get(s.grupo_id);
    if (g) usadosGrupo.add(g.id);
    rows.push({
      codigo_grupo: g?.codigo_grupo ?? "",
      nome_grupo: g?.descricao_grupo ?? "",
      codigo_subgrupo: s.codigo_subgrupo,
      nome_subgrupo: s.descricao_subgrupo,
      codigo_conta: "",
      descricao_conta: "",
      ativo: String(s.ativo),
      observacao: "",
    });
  }
  // Grupos sem subgrupos
  for (const g of grupos) {
    if (usadosGrupo.has(g.id)) continue;
    rows.push({
      codigo_grupo: g.codigo_grupo,
      nome_grupo: g.descricao_grupo,
      codigo_subgrupo: "",
      nome_subgrupo: "",
      codigo_conta: "",
      descricao_conta: "",
      ativo: String(g.ativo),
      observacao: "",
    });
  }

  const csv = toCsv(rows);
  const sufix = estruturaCodigo ? `_${estruturaCodigo}` : "";
  downloadCsv(`estrutura${sufix}.csv`, csv);
  return rows.length;
}

/** Parse de CSV unificado (vírgula ou ponto-e-vírgula). */
export function parseUnifiedCsv(text: string): { headers: string[]; rows: UnifiedRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else cur += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === sep) {
          out.push(cur);
          cur = "";
        } else cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = splitLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
  const rows: UnifiedRow[] = lines.slice(1).map((l) => {
    const cells = splitLine(l);
    const row = {} as UnifiedRow;
    headers.forEach((h, i) => {
      (row as any)[h] = cells[i] ?? "";
    });
    return row;
  });
  return { headers, rows };
}

export function parseBoolFlexible(v: string | undefined, defaultValue = true): boolean {
  if (v == null || String(v).trim() === "") return defaultValue;
  const s = String(v).trim().toLowerCase();
  if (["false", "0", "n", "nao", "não", "no"].includes(s)) return false;
  if (["true", "1", "s", "sim", "yes"].includes(s)) return true;
  return defaultValue;
}
