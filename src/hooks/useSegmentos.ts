import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export interface Segmento {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
}

export interface EstruturaAuditoria {
  id: string;
  segmento_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  estrutura_origem: string | null;
  ativo: boolean;
}

/**
 * Hook resiliente: se a tabela `segmentos` ainda não existir no banco
 * (SQL pendente de execução), retorna lista vazia em vez de quebrar a UI.
 */
export function useSegmentos() {
  return useQuery({
    queryKey: ["segmentos"],
    queryFn: async (): Promise<Segmento[]> => {
      const { data, error } = await (supabase.from as any)("segmentos")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) {
        // Tabela ainda não criada — silenciar para não quebrar telas
        if (error.code === "42P01" || error.message?.includes("not find")) return [];
        throw error;
      }
      return (data || []) as Segmento[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useEstruturasAuditoria(segmentoId?: string | null) {
  return useQuery({
    queryKey: ["estruturas-auditoria", segmentoId || "all"],
    queryFn: async (): Promise<EstruturaAuditoria[]> => {
      let q: any = (supabase.from as any)("estruturas_auditoria").select("*").eq("ativo", true).order("nome");
      if (segmentoId) q = q.eq("segmento_id", segmentoId);
      const { data, error } = await q;
      if (error) {
        if (error.code === "42P01" || error.message?.includes("not find")) return [];
        throw error;
      }
      return (data || []) as EstruturaAuditoria[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
