import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export interface ModeloMatrizRiscos {
  id: string;
  segmento_id: string;
  modalidade_atuacao_id: string;
  produto_auditoria_id: string;
  estrutura_auditoria_id: string | null;
  codigo_modelo: string;
  nome_modelo: string;
  descricao: string | null;
  objetivo_modelo: string | null;
  escopo_padrao: string | null;
  observacoes: string | null;
  versao: string;
  status_modelo: "rascunho" | "publicado" | "substituido" | "arquivado";
  vigente: boolean;
  ativo: boolean;
  data_publicacao: string | null;
  publicado_por: string | null;
  criado_por: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ModelosFiltros {
  busca?: string;
  segmentoId?: string | null;
  modalidadeId?: string | null;
  produtoId?: string | null;
  estruturaId?: string | null;
  status?: string | null;
  vigente?: "todos" | "sim" | "nao";
  ativo?: "todos" | "sim" | "nao";
}

export function useModelosMatrizRiscos(f: ModelosFiltros = {}) {
  return useQuery({
    queryKey: ["modelos-matriz-riscos", f],
    queryFn: async (): Promise<ModeloMatrizRiscos[]> => {
      let q: any = (supabase.from as any)("modelos_matriz_riscos").select("*");
      if (f.segmentoId) q = q.eq("segmento_id", f.segmentoId);
      if (f.modalidadeId) q = q.eq("modalidade_atuacao_id", f.modalidadeId);
      if (f.produtoId) q = q.eq("produto_auditoria_id", f.produtoId);
      if (f.estruturaId) q = q.eq("estrutura_auditoria_id", f.estruturaId);
      if (f.status) q = q.eq("status_modelo", f.status);
      if (f.vigente === "sim") q = q.eq("vigente", true);
      if (f.vigente === "nao") q = q.eq("vigente", false);
      if (f.ativo === "sim") q = q.eq("ativo", true);
      if (f.ativo === "nao") q = q.eq("ativo", false);
      if (f.busca && f.busca.trim()) {
        const b = `%${f.busca.trim()}%`;
        q = q.or(`codigo_modelo.ilike.${b},nome_modelo.ilike.${b},descricao.ilike.${b}`);
      }
      q = q
        .order("ativo", { ascending: false })
        .order("vigente", { ascending: false })
        .order("status_modelo", { ascending: true })
        .order("nome_modelo", { ascending: true })
        .order("versao", { ascending: false });
      const { data, error } = await q;
      if (error) {
        if (error.code === "42P01" || error.message?.includes("not find")) return [];
        throw error;
      }
      return (data || []) as ModeloMatrizRiscos[];
    },
    staleTime: 30 * 1000,
  });
}
