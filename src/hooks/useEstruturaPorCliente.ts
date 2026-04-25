import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { EstruturaAuditoria, Segmento } from "@/hooks/useSegmentos";

/**
 * FASE 3A — Resolução de estrutura operacional por cliente.
 *
 * Fluxo:
 *   cliente → segmento_id → estrutura ativa do segmento → estrutura aplicável.
 *
 * Regras:
 *  - Se o cliente possui `segmento_id` e existe ao menos uma estrutura ativa
 *    naquele segmento, usa a primeira (preferencialmente MCSE quando aplicável).
 *  - Caso contrário, faz fallback para a estrutura MCSE global, se cadastrada.
 *  - Se nem MCSE existir (Fase 1 SQL pendente), retorna estrutura = null e
 *    mantém `isFallback = true` em modo legado puro.
 *
 * Tolerante à ausência das tabelas `segmentos` / `estruturas_auditoria`.
 */

export interface EstruturaPorClienteResult {
  cliente: any | null;
  segmento: Segmento | null;
  estrutura: EstruturaAuditoria | null;
  isFallback: boolean;
  /** true quando o cliente não tem segmento_id (campo opcional / legado). */
  semSegmento: boolean;
  /** true se a Fase 1 SQL ainda não foi executada (sem tabelas novas). */
  modoLegado: boolean;
}

const isMissingTable = (err: any) =>
  err?.code === "42P01" || (err?.message || "").includes("not find");

export function useEstruturaPorCliente(clienteId?: string | null) {
  return useQuery({
    queryKey: ["estrutura-por-cliente", clienteId || "none"],
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<EstruturaPorClienteResult> => {
      // 1. Cliente
      const { data: cliente, error: clienteErr } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", clienteId!)
        .maybeSingle();
      if (clienteErr) throw clienteErr;

      const segmentoId: string | null = (cliente as any)?.segmento_id ?? null;

      // 2. Tenta buscar estruturas (pode falhar se Fase 1 pendente)
      let modoLegado = false;
      let estruturas: EstruturaAuditoria[] = [];
      {
        const { data, error } = await (supabase.from as any)("estruturas_auditoria")
          .select("*")
          .eq("ativo", true);
        if (error) {
          if (isMissingTable(error)) modoLegado = true;
          else throw error;
        } else {
          estruturas = (data || []) as EstruturaAuditoria[];
        }
      }

      // 3. Segmento (se houver id e tabela existir)
      let segmento: Segmento | null = null;
      if (segmentoId && !modoLegado) {
        const { data, error } = await (supabase.from as any)("segmentos")
          .select("*")
          .eq("id", segmentoId)
          .maybeSingle();
        if (error && !isMissingTable(error)) throw error;
        segmento = (data as Segmento) || null;
      }

      // 4. Estrutura aplicável
      const mcse = estruturas.find((e) => (e.codigo || "").toUpperCase() === "MCSE") || null;
      let estrutura: EstruturaAuditoria | null = null;
      let isFallback = false;

      if (segmentoId) {
        const doSegmento = estruturas.filter((e) => e.segmento_id === segmentoId);
        if (doSegmento.length > 0) {
          // Preferir MCSE se ele estiver no segmento, senão a primeira
          estrutura = doSegmento.find((e) => (e.codigo || "").toUpperCase() === "MCSE") || doSegmento[0];
        } else {
          estrutura = mcse;
          isFallback = !!mcse;
        }
      } else {
        estrutura = mcse;
        isFallback = !!mcse;
      }

      // Sem MCSE cadastrado e sem nada vinculado: ainda fallback (modo legado)
      if (!estrutura) isFallback = true;

      return {
        cliente: cliente || null,
        segmento,
        estrutura,
        isFallback,
        semSegmento: !segmentoId,
        modoLegado,
      };
    },
  });
}
