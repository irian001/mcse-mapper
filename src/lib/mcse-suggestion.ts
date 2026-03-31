/**
 * Result of MCSE suggestion with confidence and risk.
 */
export interface McseSuggestionResult {
  codigo_mcse_sugerido: string | null;
  confianca_mapeamento: number; // 0 to 1
  risco_mapeamento: "alta" | "media" | "baixa" | "sem_sugestao";
}

/**
 * Suggests an MCSE code based on the client account classification and name.
 * Returns code, confidence score, and risk level.
 */
export function suggestMcseWithConfidence(classificacao: string | null, nome: string | null): McseSuggestionResult {
  if (!classificacao && !nome) {
    return { codigo_mcse_sugerido: null, confianca_mapeamento: 0, risco_mapeamento: "sem_sugestao" };
  }

  const cls = (classificacao || "").replace(/\D/g, "");
  const nomeLower = (nome || "").toLowerCase();

  let prefixMatch: string | null = null;
  let keywordMatch: string | null = null;

  // Direct prefix mapping
  const prefixMap: [string, string][] = [
    ["1101", "1.1.01"],
    ["1102", "1.1.02"],
    ["1103", "1.1.03"],
    ["1104", "1.1.04"],
    ["1201", "1.2.01"],
    ["1202", "1.2.02"],
    ["2101", "2.1.01"],
    ["2102", "2.1.02"],
    ["2201", "2.2.01"],
    ["3", "3"],
    ["4", "4"],
    ["5", "5"],
  ];

  // Keyword-based suggestions
  const keywordMap: [string[], string][] = [
    [["caixa", "banco", "equivalente"], "1.1.01 — Caixa e Equivalentes"],
    [["fornecedor"], "2.1.01 — Fornecedores"],
    [["consumidor", "fatura", "cliente"], "1.1.03 — Consumidores/Clientes"],
    [["almoxarifado", "estoque", "material"], "1.1.04 — Almoxarifado Operacional"],
    [["imobilizado", "ativo fixo"], "1.2.01 — Ativo Imobilizado"],
    [["intangivel", "intangível"], "1.2.02 — Ativo Intangível"],
    [["emprestimo", "empréstimo", "financiamento"], "2.1.02 — Empréstimos e Financiamentos"],
    [["receita", "revenue"], "4 — Receitas"],
    [["despesa", "custo"], "5 — Despesas/Custos"],
    [["patrimonio", "patrimônio", "capital"], "3 — Patrimônio Líquido"],
  ];

  // Try prefix match
  for (const [prefix, code] of prefixMap) {
    if (cls && cls.startsWith(prefix)) { prefixMatch = code; break; }
  }

  // Try keyword match
  for (const [keywords, suggestion] of keywordMap) {
    if (keywords.some(k => nomeLower.includes(k))) { keywordMatch = suggestion; break; }
  }

  // Determine confidence and risk
  if (prefixMatch && keywordMatch) {
    // Both match — high confidence
    return {
      codigo_mcse_sugerido: keywordMatch,
      confianca_mapeamento: 0.95,
      risco_mapeamento: "alta",
    };
  }

  if (prefixMatch && !keywordMatch) {
    // Only classification matches — medium confidence
    return {
      codigo_mcse_sugerido: prefixMatch,
      confianca_mapeamento: 0.6,
      risco_mapeamento: "media",
    };
  }

  if (!prefixMatch && keywordMatch) {
    // Only keyword matches — low confidence
    return {
      codigo_mcse_sugerido: keywordMatch,
      confianca_mapeamento: 0.35,
      risco_mapeamento: "baixa",
    };
  }

  return { codigo_mcse_sugerido: null, confianca_mapeamento: 0, risco_mapeamento: "sem_sugestao" };
}

/**
 * Legacy wrapper — returns just the code string.
 */
export function suggestMcseCode(classificacao: string | null, nome: string | null): string | null {
  return suggestMcseWithConfidence(classificacao, nome).codigo_mcse_sugerido;
}

/**
 * Calculates the classification level from a dotted/numeric classification string.
 */
export function calcNivelClassificacao(classificacao: string | null): number {
  if (!classificacao) return 0;
  const parts = classificacao.split(".").filter(Boolean);
  return Math.max(0, parts.length - 1);
}
