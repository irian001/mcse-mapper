
-- 1. Enum for document status
CREATE TYPE public.status_documento_item AS ENUM (
  'enviado', 'em_analise', 'aceito', 'recusado', 'complementar'
);

-- 2. Table
CREATE TABLE public.solicitacao_item_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_item_id UUID NOT NULL REFERENCES public.solicitacao_itens(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL DEFAULT 'application/pdf',
  url_arquivo TEXT NOT NULL,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status_documento public.status_documento_item NOT NULL DEFAULT 'enviado',
  observacao_auditor TEXT,
  observacao_cliente TEXT,
  versao INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacao_item_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_sol_item_docs"
  ON public.solicitacao_item_documentos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_sol_item_docs"
  ON public.solicitacao_item_documentos FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_sol_item_docs"
  ON public.solicitacao_item_documentos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_sol_item_docs"
  ON public.solicitacao_item_documentos FOR DELETE
  TO authenticated USING (is_admin());

CREATE INDEX idx_sol_item_docs_item ON public.solicitacao_item_documentos(solicitacao_item_id);

CREATE TRIGGER update_sol_item_docs_updated_at
  BEFORE UPDATE ON public.solicitacao_item_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('solicitacao-documentos', 'solicitacao-documentos', false);

CREATE POLICY "auth_select_sol_docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'solicitacao-documentos');

CREATE POLICY "auth_insert_sol_docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'solicitacao-documentos');

CREATE POLICY "auth_update_sol_docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'solicitacao-documentos');
