
-- Enums
CREATE TYPE public.categoria_produto AS ENUM ('auditoria_contabil', 'auditoria_regulatoria', 'revisao_limitada', 'ppa', 'outros');
CREATE TYPE public.segmento_produto AS ENUM ('setor_eletrico', 'cooperativas_credito', 'industria', 'outros');
CREATE TYPE public.subtipo_produto AS ENUM ('societaria', 'regulatoria', 'consolidada', 'individual');
CREATE TYPE public.complexidade AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE public.nivel_risco AS ENUM ('baixo', 'medio', 'alto');

-- Table
CREATE TABLE public.produtos_auditoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_produto TEXT NOT NULL UNIQUE,
  nome_produto TEXT NOT NULL,
  descricao TEXT,
  categoria public.categoria_produto NOT NULL DEFAULT 'auditoria_contabil',
  segmento public.segmento_produto NOT NULL DEFAULT 'setor_eletrico',
  subtipo public.subtipo_produto NOT NULL DEFAULT 'societaria',
  complexidade_padrao public.complexidade NOT NULL DEFAULT 'media',
  risco_padrao public.nivel_risco NOT NULL DEFAULT 'medio',
  horas_base_estimadas NUMERIC,
  valor_base_referencia NUMERIC,
  exige_balancete BOOLEAN NOT NULL DEFAULT true,
  exige_documentacao BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.produtos_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_produtos" ON public.produtos_auditoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_produtos" ON public.produtos_auditoria FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "update_produtos" ON public.produtos_auditoria FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "delete_produtos" ON public.produtos_auditoria FOR DELETE TO authenticated USING (public.is_admin());

-- Trigger updated_at
CREATE TRIGGER update_produtos_auditoria_updated_at
  BEFORE UPDATE ON public.produtos_auditoria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
