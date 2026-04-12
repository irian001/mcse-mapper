
-- 1. Enum for link type
CREATE TYPE public.tipo_vinculo_documento AS ENUM (
  'principal', 'complementar', 'parcial', 'analitico'
);

-- 2. Table
CREATE TABLE public.balancete_linha_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  balancete_linha_id UUID NOT NULL REFERENCES public.balancete_linhas(id) ON DELETE CASCADE,
  solicitacao_item_documento_id UUID NOT NULL REFERENCES public.solicitacao_item_documentos(id) ON DELETE CASCADE,
  trabalho_auditoria_id UUID NOT NULL REFERENCES public.trabalhos_auditoria(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  exercicio_id UUID NOT NULL REFERENCES public.exercicios(id),
  valor_documento NUMERIC,
  valor_considerado_validacao NUMERIC,
  tipo_vinculo public.tipo_vinculo_documento NOT NULL DEFAULT 'principal',
  aceito_para_validacao BOOLEAN NOT NULL DEFAULT true,
  observacao_vinculo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.balancete_linha_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_bal_linha_docs" ON public.balancete_linha_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_bal_linha_docs" ON public.balancete_linha_documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_bal_linha_docs" ON public.balancete_linha_documentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_bal_linha_docs" ON public.balancete_linha_documentos FOR DELETE TO authenticated USING (is_admin());

CREATE INDEX idx_bal_linha_docs_linha ON public.balancete_linha_documentos(balancete_linha_id);
CREATE INDEX idx_bal_linha_docs_doc ON public.balancete_linha_documentos(solicitacao_item_documento_id);
CREATE INDEX idx_bal_linha_docs_trabalho ON public.balancete_linha_documentos(trabalho_auditoria_id);

CREATE TRIGGER update_bal_linha_docs_updated_at
  BEFORE UPDATE ON public.balancete_linha_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
