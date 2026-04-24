import { supabase } from "@/lib/supabase-client";

/**
 * Filtros por Estrutura de Auditoria (Fase 2 multi-estruturas).
 *
 * As tabelas `mcse_*` agora possuem `estrutura_id` (FK para
 * `estruturas_auditoria`). Quando o caller informar `estruturaId`, a query
 * filtra por esse vínculo. Se o argumento for omitido (modo legado), o filtro
 * é desligado e o comportamento permanece idêntico ao anterior.
 *
 * Caso a coluna `estrutura_id` ainda não exista no banco (SQL Fase 1 pendente),
 * o filtro é silenciosamente ignorado pelo PostgREST somente se enviado;
 * por isso, os helpers que filtram por estrutura aplicam o `.eq` apenas quando
 * recebem um id real.
 */

// MCSE Grupos
export const fetchGrupos = (estruturaId?: string | null) => {
  let q = supabase.from("mcse_grupos").select("*").order("ordem");
  if (estruturaId) q = (q as any).eq("estrutura_id", estruturaId);
  return q;
};

export const fetchSubgrupos = (grupoId?: string, estruturaId?: string | null) => {
  let q = supabase.from("mcse_subgrupos").select("*, mcse_grupos(descricao_grupo)").order("ordem");
  if (grupoId && grupoId !== "all") q = q.eq("grupo_id", grupoId);
  if (estruturaId) q = (q as any).eq("estrutura_id", estruturaId);
  return q;
};

export const fetchContas = (grupoId?: string, subgrupoId?: string, estruturaId?: string | null) => {
  let q = supabase
    .from("mcse_contas")
    .select("*, mcse_grupos(descricao_grupo), mcse_subgrupos(descricao_subgrupo)")
    .order("codigo_mcse");
  if (grupoId && grupoId !== "all") q = q.eq("grupo_id", grupoId);
  if (subgrupoId && subgrupoId !== "all") q = q.eq("subgrupo_id", subgrupoId);
  if (estruturaId) q = (q as any).eq("estrutura_id", estruturaId);
  return q;
};

export const fetchRegras = (contaId?: string, estruturaId?: string | null) => {
  let q = supabase.from("mcse_regras_conta").select("*").order("codigo_mcse");
  if (contaId) q = q.eq("conta_mcse_id", contaId);
  if (estruturaId) q = (q as any).eq("estrutura_id", estruturaId);
  return q;
};

export const fetchRegrasDocumentos = (regraId?: string) => {
  let q = supabase.from("mcse_regras_documentos").select("*").order("ordem_solicitacao");
  if (regraId) q = q.eq("regra_mcse_id", regraId);
  return q;
};

export const fetchRegrasInstrucoes = (regraId?: string) => {
  let q = supabase.from("mcse_regras_instrucoes").select("*").order("ordem");
  if (regraId) q = q.eq("regra_mcse_id", regraId);
  return q;
};

export const fetchRegrasEmissaoErp = (regraId?: string) => {
  let q = supabase.from("mcse_regras_emissao_erp").select("*").order("ordem");
  if (regraId) q = q.eq("regra_mcse_id", regraId);
  return q;
};

// Clientes
export const fetchClientes = () =>
  supabase.from("clientes").select("*").order("razao_social");

export const fetchExercicios = (clienteId: string) =>
  supabase.from("exercicios").select("*").eq("cliente_id", clienteId).order("ano_exercicio", { ascending: false });

export const fetchParametros = (clienteId: string) =>
  supabase.from("cliente_parametros").select("*").eq("cliente_id", clienteId).maybeSingle();

// Contas Origem - fetch all rows (bypasses default 1000-row limit)
export const fetchContasOrigem = async (clienteId: string) => {
  const allData: any[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("cliente_contas_origem")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("classificacao")
      .range(from, from + pageSize - 1);

    if (error) return { data: null, error };
    if (data) allData.push(...data);
    hasMore = data?.length === pageSize;
    from += pageSize;
  }

  return { data: allData, error: null };
};

// Mapeamento - fetch all rows (bypasses default 1000-row limit)
export const fetchMapeamentos = async (clienteId: string) => {
  const allData: any[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("cliente_mapeamento_mcse")
      .select("*, cliente_contas_origem(idconta, nome, classificacao, grau), mcse_contas(codigo_mcse, descricao_conta, mcse_grupos(descricao_grupo), mcse_subgrupos(descricao_subgrupo))")
      .eq("cliente_id", clienteId)
      .range(from, from + pageSize - 1);

    if (error) return { data: null, error };
    if (data) allData.push(...data);
    hasMore = data?.length === pageSize;
    from += pageSize;
  }

  return { data: allData, error: null };
};
