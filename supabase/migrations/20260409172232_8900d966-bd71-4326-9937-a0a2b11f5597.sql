
-- Tabela filha: documentos solicitáveis por regra MCSE
CREATE TABLE public.mcse_regras_documentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  regra_mcse_id uuid NOT NULL REFERENCES public.mcse_regras_conta(id) ON DELETE CASCADE,
  conta_mcse_id uuid NOT NULL REFERENCES public.mcse_contas(id),
  codigo_mcse text,
  descricao_mcse text,
  tipo_documento text NOT NULL DEFAULT '',
  descricao_documento text NOT NULL DEFAULT '',
  obrigatorio boolean NOT NULL DEFAULT true,
  ordem_solicitacao integer NOT NULL DEFAULT 1,
  formato_aceito text DEFAULT 'pdf',
  permite_pdf boolean NOT NULL DEFAULT true,
  permite_excel boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_mcse_regras_documentos_regra ON public.mcse_regras_documentos(regra_mcse_id);
CREATE INDEX idx_mcse_regras_documentos_conta ON public.mcse_regras_documentos(conta_mcse_id);

-- RLS
ALTER TABLE public.mcse_regras_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_mcse_regras_docs" ON public.mcse_regras_documentos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_mcse_regras_docs" ON public.mcse_regras_documentos
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "update_mcse_regras_docs" ON public.mcse_regras_documentos
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "delete_mcse_regras_docs" ON public.mcse_regras_documentos
  FOR DELETE TO authenticated USING (is_admin());

-- Trigger updated_at
CREATE TRIGGER update_mcse_regras_documentos_updated_at
  BEFORE UPDATE ON public.mcse_regras_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
