
-- Enums
CREATE TYPE public.status_linha_balancete AS ENUM ('pendente', 'em_analise', 'validado', 'divergente', 'revisado', 'concluido');
CREATE TYPE public.severidade_pendencia AS ENUM ('baixa', 'media', 'alta', 'critica');

-- Add columns to balancete_linhas
ALTER TABLE public.balancete_linhas
  ADD COLUMN IF NOT EXISTS comentario_auditor text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS comentario_revisor text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status_linha public.status_linha_balancete DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS possui_pendencia boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS descricao_pendencia text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS severidade public.severidade_pendencia DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_validacao timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS usuario_validacao text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_revisao timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS usuario_revisao text DEFAULT NULL;

-- Documentos de referência
CREATE TABLE public.documentos_referencia_balancete (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balancete_linha_id uuid NOT NULL REFERENCES public.balancete_linhas(id) ON DELETE CASCADE,
  trabalho_auditoria_id uuid NOT NULL REFERENCES public.trabalhos_auditoria(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  exercicio_id uuid NOT NULL REFERENCES public.exercicios(id),
  nome_arquivo text NOT NULL,
  tipo_arquivo text NOT NULL DEFAULT 'application/pdf',
  caminho_arquivo_ou_url text NOT NULL,
  observacao_documento text DEFAULT NULL,
  uploaded_by text DEFAULT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_referencia_balancete ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access on documentos_referencia_balancete"
  ON public.documentos_referencia_balancete
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-balancete', 'documentos-balancete', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated upload on documentos-balancete"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documentos-balancete');

CREATE POLICY "Authenticated read on documentos-balancete"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documentos-balancete');

CREATE POLICY "Authenticated delete on documentos-balancete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'documentos-balancete');
