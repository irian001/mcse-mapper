import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export type EmpresaAuditoria = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email_contato: string | null;
  website: string | null;
  crc_numero: string | null;
  crc_uf: string | null;
  registro_cvm: string | null;
  registro_bacen: string | null;
  registro_aneel: string | null;
  auditor_responsavel_id: string | null;
  logo_url: string | null;
  observacoes: string | null;
};

export function useEmpresaAuditoria() {
  return useQuery({
    queryKey: ["empresa-auditoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresa_auditoria" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as EmpresaAuditoria | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
