import { supabase } from "@/integrations/supabase/client";

// MCSE Grupos
export const fetchGrupos = () =>
  supabase.from("mcse_grupos").select("*").order("ordem");

export const fetchSubgrupos = (grupoId?: string) => {
  let q = supabase.from("mcse_subgrupos").select("*, mcse_grupos(descricao_grupo)").order("ordem");
  if (grupoId && grupoId !== "all") q = q.eq("grupo_id", grupoId);
  return q;
};

export const fetchContas = (grupoId?: string, subgrupoId?: string) => {
  let q = supabase.from("mcse_contas").select("*, mcse_grupos(descricao_grupo), mcse_subgrupos(descricao_subgrupo)").order("codigo_mcse");
  if (grupoId && grupoId !== "all") q = q.eq("grupo_id", grupoId);
  if (subgrupoId && subgrupoId !== "all") q = q.eq("subgrupo_id", subgrupoId);
  return q;
};

export const fetchRegras = (contaId: string) =>
  supabase.from("mcse_regras_conta").select("*").eq("conta_id", contaId);

// Clientes
export const fetchClientes = () =>
  supabase.from("clientes").select("*").order("razao_social");

export const fetchExercicios = (clienteId: string) =>
  supabase.from("exercicios").select("*").eq("cliente_id", clienteId).order("ano_exercicio", { ascending: false });

export const fetchParametros = (clienteId: string) =>
  supabase.from("cliente_parametros").select("*").eq("cliente_id", clienteId).maybeSingle();

// Contas Origem
export const fetchContasOrigem = (clienteId: string) =>
  supabase.from("cliente_contas_origem").select("*").eq("cliente_id", clienteId).order("codigo_origem");

// Mapeamento
export const fetchMapeamentos = (clienteId: string) =>
  supabase.from("cliente_mapeamento_mcse")
    .select("*, cliente_contas_origem(codigo_origem, descricao_origem, natureza_origem), mcse_contas(codigo_mcse, descricao_conta, mcse_grupos(descricao_grupo), mcse_subgrupos(descricao_subgrupo))")
    .eq("cliente_id", clienteId);
