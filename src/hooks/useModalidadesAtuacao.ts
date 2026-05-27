import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export interface ModalidadeAtuacao {
  id: string;
  segmento_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Hook resiliente para listar modalidades de atuação de um segmento.
 * Se a tabela `modalidades_atuacao` ainda não existir, retorna lista vazia.
 */
export function useModalidadesAtuacao(segmentoId?: string | null) {
  return useQuery({
    queryKey: ["modalidades-atuacao", segmentoId || "none"],
    enabled: !!segmentoId,
    queryFn: async (): Promise<ModalidadeAtuacao[]> => {
      if (!segmentoId) return [];
      const { data, error } = await (supabase.from as any)("modalidades_atuacao")
        .select("*")
        .eq("segmento_id", segmentoId)
        .order("ativo", { ascending: false })
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (error) {
        if (error.code === "42P01" || error.message?.includes("not find")) return [];
        throw error;
      }
      return (data || []) as ModalidadeAtuacao[];
    },
    staleTime: 60 * 1000,
  });
}
