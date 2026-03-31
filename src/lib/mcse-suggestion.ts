/**
 * Suggests an MCSE code based on the client account classification and name.
 */
export function suggestMcseCode(classificacao: string | null, nome: string | null): string | null {
  if (!classificacao) return null;

  const cls = classificacao.replace(/\D/g, "");
  const nomeLower = (nome || "").toLowerCase();

  // Direct prefix mapping
  const prefixMap: [string, string][] = [
    ["1101", "1.1.01"],
    ["1102", "1.1.02"],
    ["1103", "1.1.03"],
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

  // Try keyword match first
  for (const [keywords, suggestion] of keywordMap) {
    if (keywords.some(k => nomeLower.includes(k))) return suggestion;
  }

  // Try prefix match
  for (const [prefix, code] of prefixMap) {
    if (cls.startsWith(prefix)) return code;
  }

  return null;
}

/**
 * Calculates the classification level from a dotted/numeric classification string.
 */
export function calcNivelClassificacao(classificacao: string | null): number {
  if (!classificacao) return 0;
  const parts = classificacao.split(".").filter(Boolean);
  return Math.max(0, parts.length - 1);
}
