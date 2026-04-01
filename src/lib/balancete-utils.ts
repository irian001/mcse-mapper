import type { Database } from "@/integrations/supabase/types";

type StatusLocalizacao = Database["public"]["Enums"]["status_localizacao_conta"];
type StatusMapeamento = Database["public"]["Enums"]["status_mapeamento_mcse"];
type StatusValidacao = Database["public"]["Enums"]["status_validacao_linha"];

export interface ContaOrigem {
  id: string;
  idconta: string;
  nome: string;
  classificacao: string | null;
  status_mapeamento: string;
  codigo_mcse_sugerido: string | null;
}

export interface ContaMcse {
  id: string;
  codigo_mcse: string;
  descricao_conta: string;
  grupo_id: string;
  subgrupo_id: string | null;
}

export interface LocalizacaoResult {
  conta_origem_id: string | null;
  status_localizacao: StatusLocalizacao;
  classificacao_origem: string | null;
}

export function localizarConta(
  codigoConta: string,
  descricaoConta: string,
  contasOrigem: ContaOrigem[]
): LocalizacaoResult {
  // 1. By IDCONTA exact match
  const byId = contasOrigem.find(c => c.idconta === codigoConta);
  if (byId) {
    return { conta_origem_id: byId.id, status_localizacao: "localizada_por_codigo", classificacao_origem: byId.classificacao };
  }

  // 2. By CLASSIFICACAO
  const byCls = contasOrigem.find(c => c.classificacao === codigoConta);
  if (byCls) {
    return { conta_origem_id: byCls.id, status_localizacao: "localizada_por_classificacao", classificacao_origem: byCls.classificacao };
  }

  // 3. By description (normalized)
  const descNorm = descricaoConta.toLowerCase().trim();
  if (descNorm) {
    const byDesc = contasOrigem.find(c => c.nome.toLowerCase().trim() === descNorm);
    if (byDesc) {
      return { conta_origem_id: byDesc.id, status_localizacao: "localizada_por_descricao", classificacao_origem: byDesc.classificacao };
    }
  }

  return { conta_origem_id: null, status_localizacao: "nao_localizada", classificacao_origem: null };
}

export function resolverMcse(
  contaOrigem: ContaOrigem | undefined,
  mapeamentos: Array<{ conta_origem_id: string; conta_mcse_id: string | null; mcse_contas: any }>,
  contasMcse: Map<string, { codigo_mcse: string; descricao_conta: string; grupo: string; subgrupo: string }>
): { conta_mcse_id: string | null; codigo_mcse: string | null; descricao_mcse: string | null; grupo_mcse: string | null; subgrupo_mcse: string | null; status_mapeamento: StatusMapeamento } {
  if (!contaOrigem) {
    return { conta_mcse_id: null, codigo_mcse: null, descricao_mcse: null, grupo_mcse: null, subgrupo_mcse: null, status_mapeamento: "conta_nao_localizada" };
  }

  const map = mapeamentos.find(m => m.conta_origem_id === contaOrigem.id);
  if (map?.conta_mcse_id && map.mcse_contas) {
    const mc = map.mcse_contas;
    return {
      conta_mcse_id: map.conta_mcse_id,
      codigo_mcse: mc.codigo_mcse,
      descricao_mcse: mc.descricao_conta,
      grupo_mcse: mc.mcse_grupos?.descricao_grupo || null,
      subgrupo_mcse: mc.mcse_subgrupos?.descricao_subgrupo || null,
      status_mapeamento: "mapeado",
    };
  }

  return { conta_mcse_id: null, codigo_mcse: null, descricao_mcse: null, grupo_mcse: null, subgrupo_mcse: null, status_mapeamento: "sem_mapeamento" };
}

export function calcVariacao(saldoAnterior: number, saldoAtual: number) {
  const absoluta = saldoAtual - saldoAnterior;
  const percentual = saldoAnterior !== 0 ? ((saldoAtual - saldoAnterior) / saldoAnterior) * 100 : null;
  return { absoluta, percentual };
}

export function calcStatusValidacao(statusLoc: StatusLocalizacao, statusMap: StatusMapeamento): StatusValidacao {
  if (statusLoc !== "nao_localizada" && statusMap === "mapeado") return "pronto_para_analise";
  return "revisar_mapeamento";
}

export function parseNumericValue(val: any): number {
  if (val == null || val === "") return 0;
  const s = String(val).trim().replace(/\s/g, "");
  // Handle Brazilian format: 1.234.567,89 → 1234567.89
  if (s.includes(",") && s.includes(".")) {
    const last = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
    const sep = s[last];
    if (sep === ",") {
      return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(s.replace(/,/g, "")) || 0;
  }
  if (s.includes(",") && !s.includes(".")) {
    return parseFloat(s.replace(",", ".")) || 0;
  }
  return parseFloat(s.replace(/,/g, "")) || 0;
}
