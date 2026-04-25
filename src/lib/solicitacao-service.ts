import { supabase } from "@/lib/supabase-client";

export interface GeracaoFiltros {
  apenasContasCriticas: boolean;
  apenasComSaldo: boolean;
  todasComRegraAtiva: boolean;
}

export interface ItemGerado {
  regra_mcse_id: string;
  conta_mcse_id: string;
  codigo_mcse: string;
  descricao_mcse: string;
  tipo_documento: string;
  descricao_documento: string;
  instrucoes_cliente: string;
  obrigatorio: boolean;
  ordem: number;
}

/**
 * Resolve a estrutura de auditoria aplicável ao cliente do trabalho.
 *
 * FASE 3B.2 — fluxo Trabalho → Cliente → Segmento → Estrutura. Quando não há
 * segmento ou nenhuma estrutura específica, faz fallback para MCSE. Em modo
 * legado (tabela `estruturas_auditoria` ausente) retorna `null` e o caller
 * deve operar sem filtro de estrutura.
 */
async function resolverEstruturaPorCliente(clienteId: string): Promise<{
  estruturaId: string | null;
  isFallback: boolean;
  modoLegado: boolean;
}> {
  // Cliente
  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .maybeSingle();
  const segmentoId: string | null = (cliente as any)?.segmento_id ?? null;

  // Estruturas (pode falhar se SQL Fase 1 pendente)
  const { data: ests, error } = await (supabase.from as any)("estruturas_auditoria")
    .select("id, codigo, segmento_id, ativo")
    .eq("ativo", true);
  if (error && (error.code === "42P01" || (error.message || "").includes("not find"))) {
    return { estruturaId: null, isFallback: true, modoLegado: true };
  }
  const estruturas = (ests || []) as Array<{ id: string; codigo: string; segmento_id: string }>;
  const mcse = estruturas.find((e) => (e.codigo || "").toUpperCase() === "MCSE") || null;

  if (segmentoId) {
    const doSeg = estruturas.filter((e) => e.segmento_id === segmentoId);
    if (doSeg.length > 0) {
      const escolhida = doSeg.find((e) => (e.codigo || "").toUpperCase() === "MCSE") || doSeg[0];
      return { estruturaId: escolhida.id, isFallback: false, modoLegado: false };
    }
  }
  return { estruturaId: mcse?.id ?? null, isFallback: true, modoLegado: false };
}

export async function gerarSolicitacao(
  trabalhoId: string,
  filtros: GeracaoFiltros
): Promise<{ clienteId: string; exercicioId: string; itens: ItemGerado[]; estruturaId: string | null; isFallback: boolean }> {
  // 1. Get trabalho info
  const { data: trabalho, error: tErr } = await supabase
    .from("trabalhos_auditoria")
    .select("cliente_id, exercicio_id")
    .eq("id", trabalhoId)
    .single();
  if (tErr || !trabalho) throw new Error("Trabalho não encontrado");

  // 1b. Resolve estrutura aplicável (cliente → segmento → estrutura, fallback MCSE)
  const { estruturaId, isFallback } = await resolverEstruturaPorCliente(trabalho.cliente_id);

  // 2. Get balancete lines with MCSE mapping
  const allLinhas: any[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from("balancete_linhas")
      .select("conta_mcse_id, codigo_mcse, descricao_mcse, saldo_atual, saldo_anterior")
      .eq("trabalho_auditoria_id", trabalhoId)
      .not("conta_mcse_id", "is", null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (data) allLinhas.push(...data);
    hasMore = data?.length === pageSize;
    from += pageSize;
  }

  // 3. Get unique conta_mcse_ids from balancete
  const contaMcseIds = [...new Set(allLinhas.map((l) => l.conta_mcse_id))];
  if (contaMcseIds.length === 0) throw new Error("Nenhuma conta MCSE encontrada no balancete");

  // 4. Fetch regras for these contas — restritas à estrutura derivada
  let regrasQuery: any = supabase
    .from("mcse_regras_conta")
    .select("*")
    .in("conta_mcse_id", contaMcseIds)
    .eq("ativo", true);
  if (estruturaId) {
    // Filtro tolerante: se a coluna não existir (modo legado), o catch abaixo
    // dispara fallback sem filtro.
    regrasQuery = regrasQuery.eq("estrutura_id", estruturaId);
  }
  let { data: regras, error: rErr } = await regrasQuery;
  if (rErr) {
    const isMissingCol = rErr.code === "42703" || (rErr.message || "").includes("estrutura_id");
    if (isMissingCol) {
      // Modo legado: coluna estrutura_id ausente — refaz sem o filtro
      const fallback = await supabase
        .from("mcse_regras_conta")
        .select("*")
        .in("conta_mcse_id", contaMcseIds)
        .eq("ativo", true);
      if (fallback.error) throw fallback.error;
      regras = fallback.data;
    } else {
      throw rErr;
    }
  }

  // 5. Apply filters
  let regrasFiltradas = regras || [];
  
  if (filtros.apenasContasCriticas) {
    regrasFiltradas = regrasFiltradas.filter((r) => r.conta_critica);
  }

  if (filtros.apenasComSaldo) {
    const contasComSaldo = new Set(
      allLinhas
        .filter((l) => (l.saldo_atual ?? 0) !== 0 || (l.saldo_anterior ?? 0) !== 0)
        .map((l) => l.conta_mcse_id)
    );
    regrasFiltradas = regrasFiltradas.filter((r) => contasComSaldo.has(r.conta_mcse_id));
  }

  if (!filtros.todasComRegraAtiva) {
    // Only include those with gera_solicitacao_automatica or conta_critica
    regrasFiltradas = regrasFiltradas.filter(
      (r) => r.gera_solicitacao_automatica || r.conta_critica
    );
  }

  if (regrasFiltradas.length === 0) throw new Error("Nenhuma regra aplicável com os filtros selecionados");

  const regraIds = regrasFiltradas.map((r) => r.id);

  // 6. Fetch documentos for these regras
  const { data: docs, error: dErr } = await supabase
    .from("mcse_regras_documentos")
    .select("*")
    .in("regra_mcse_id", regraIds)
    .eq("ativo", true)
    .order("ordem_solicitacao");
  if (dErr) throw dErr;

  // 7. Fetch instrucoes for these regras
  const { data: instrucoes } = await supabase
    .from("mcse_regras_instrucoes")
    .select("*")
    .in("regra_mcse_id", regraIds)
    .eq("ativo", true)
    .order("ordem");

  // Build instrucoes map by regra_mcse_id
  const instrMap = new Map<string, string>();
  for (const inst of instrucoes || []) {
    const existing = instrMap.get(inst.regra_mcse_id) || "";
    const line = `• ${inst.titulo_instrucao}: ${inst.texto_instrucao}`;
    instrMap.set(inst.regra_mcse_id, existing ? `${existing}\n${line}` : line);
  }

  // 8. Build items
  const itens: ItemGerado[] = [];
  let ordem = 1;

  for (const doc of docs || []) {
    const regra = regrasFiltradas.find((r) => r.id === doc.regra_mcse_id);
    if (!regra) continue;

    itens.push({
      regra_mcse_id: doc.regra_mcse_id,
      conta_mcse_id: doc.conta_mcse_id,
      codigo_mcse: doc.codigo_mcse || regra.codigo_mcse || "",
      descricao_mcse: doc.descricao_mcse || regra.descricao_mcse || "",
      tipo_documento: doc.tipo_documento,
      descricao_documento: doc.descricao_documento,
      instrucoes_cliente: instrMap.get(doc.regra_mcse_id) || "",
      obrigatorio: doc.obrigatorio,
      ordem: ordem++,
    });
  }

  if (itens.length === 0) throw new Error("Nenhum documento configurado para as regras aplicáveis");

  return {
    clienteId: trabalho.cliente_id,
    exercicioId: trabalho.exercicio_id,
    itens,
    estruturaId,
    isFallback,
  };
}

export async function salvarSolicitacaoRascunho(
  trabalhoId: string,
  clienteId: string,
  exercicioId: string,
  titulo: string,
  prazo: string | null,
  observacoes: string,
  itens: ItemGerado[]
) {
  const { data: solicitacao, error: sErr } = await supabase
    .from("solicitacoes_documentos")
    .insert({
      trabalho_auditoria_id: trabalhoId,
      cliente_id: clienteId,
      exercicio_id: exercicioId,
      titulo_solicitacao: titulo,
      origem_solicitacao: "balancete",
      prazo_resposta: prazo || null,
      status_solicitacao: "rascunho",
      observacoes: observacoes || null,
    })
    .select("id")
    .single();

  if (sErr || !solicitacao) throw sErr || new Error("Erro ao criar solicitação");

  const rows = itens.map((item) => ({
    solicitacao_id: solicitacao.id,
    regra_mcse_id: item.regra_mcse_id,
    conta_mcse_id: item.conta_mcse_id,
    codigo_mcse: item.codigo_mcse,
    descricao_mcse: item.descricao_mcse,
    tipo_documento: item.tipo_documento,
    descricao_documento: item.descricao_documento,
    instrucoes_cliente: item.instrucoes_cliente || null,
    prazo_item: prazo || null,
    obrigatorio: item.obrigatorio,
    status_item: "pendente" as const,
    ordem: item.ordem,
  }));

  // Insert in batches of 500
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from("solicitacao_itens").insert(batch);
    if (error) throw error;
  }

  return solicitacao.id;
}
