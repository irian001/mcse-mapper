import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { EstruturaAuditoria } from "@/hooks/useSegmentos";

/**
 * Contexto de Estrutura de Auditoria ativa.
 *
 * - Lista todas as estruturas ativas a partir de `estruturas_auditoria`.
 * - Persistência da seleção em localStorage (chave: `estrutura-ativa-id`).
 * - Tolerante à ausência da tabela (Fase 1 SQL pendente): retorna lista vazia
 *   e o consumidor opera no modo legado (MCSE puro).
 * - Quando MCSE está cadastrado, ele é o padrão automático.
 */

const STORAGE_KEY = "estrutura-ativa-id";

export function useEstruturasDisponiveis() {
  return useQuery({
    queryKey: ["estruturas-auditoria-ativas"],
    queryFn: async (): Promise<EstruturaAuditoria[]> => {
      const { data, error } = await (supabase.from as any)("estruturas_auditoria")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) {
        if (error.code === "42P01" || error.message?.includes("not find")) return [];
        throw error;
      }
      return (data || []) as EstruturaAuditoria[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useEstruturaAtiva() {
  const { data: estruturas = [], isLoading } = useEstruturasDisponiveis();
  const [estruturaId, setEstruturaIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  // Auto-selecionar MCSE (ou primeira disponível) quando lista carregar e
  // não houver seleção válida persistida.
  useEffect(() => {
    if (estruturas.length === 0) return;
    const ids = new Set(estruturas.map((e) => e.id));
    if (estruturaId && ids.has(estruturaId)) return;
    const mcse = estruturas.find((e) => (e.codigo || "").toUpperCase() === "MCSE");
    const fallback = mcse?.id || estruturas[0].id;
    setEstruturaIdState(fallback);
    try { localStorage.setItem(STORAGE_KEY, fallback); } catch {}
  }, [estruturas, estruturaId]);

  const setEstruturaId = useCallback((id: string | null) => {
    setEstruturaIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const estruturaAtiva = useMemo(
    () => estruturas.find((e) => e.id === estruturaId) || null,
    [estruturas, estruturaId]
  );

  return {
    estruturas,
    estruturaId,
    estruturaAtiva,
    setEstruturaId,
    isLoading,
    /** true quando a tabela existe e há ao menos uma estrutura */
    hasEstruturas: estruturas.length > 0,
  };
}
