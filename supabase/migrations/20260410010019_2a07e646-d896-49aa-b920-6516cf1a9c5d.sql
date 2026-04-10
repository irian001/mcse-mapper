
-- =============================================
-- TABELA 1: mcse_regras_instrucoes
-- =============================================
CREATE TABLE public.mcse_regras_instrucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  regra_mcse_id UUID NOT NULL REFERENCES public.mcse_regras_conta(id) ON DELETE CASCADE,
  conta_mcse_id UUID NOT NULL REFERENCES public.mcse_contas(id),
  codigo_mcse TEXT,
  descricao_mcse TEXT,
  titulo_instrucao TEXT NOT NULL DEFAULT '',
  texto_instrucao TEXT NOT NULL DEFAULT '',
  publico_alvo TEXT NOT NULL DEFAULT 'cliente',
  ordem INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mcse_regras_instrucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_mcse_regras_instrucoes" ON public.mcse_regras_instrucoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_mcse_regras_instrucoes" ON public.mcse_regras_instrucoes FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_mcse_regras_instrucoes" ON public.mcse_regras_instrucoes FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_mcse_regras_instrucoes" ON public.mcse_regras_instrucoes FOR DELETE TO authenticated USING (is_admin());

CREATE INDEX idx_mcse_regras_instrucoes_regra ON public.mcse_regras_instrucoes(regra_mcse_id);
CREATE INDEX idx_mcse_regras_instrucoes_conta ON public.mcse_regras_instrucoes(conta_mcse_id);

CREATE TRIGGER update_mcse_regras_instrucoes_updated_at
  BEFORE UPDATE ON public.mcse_regras_instrucoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABELA 2: mcse_regras_emissao_erp
-- =============================================
CREATE TABLE public.mcse_regras_emissao_erp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  regra_mcse_id UUID NOT NULL REFERENCES public.mcse_regras_conta(id) ON DELETE CASCADE,
  conta_mcse_id UUID NOT NULL REFERENCES public.mcse_contas(id),
  codigo_mcse TEXT,
  descricao_mcse TEXT,
  erp_nome TEXT NOT NULL DEFAULT '',
  nome_relatorio TEXT NOT NULL DEFAULT '',
  modulo_erp TEXT,
  caminho_emissao TEXT,
  filtros_obrigatorios TEXT,
  campos_minimos_esperados TEXT,
  formato_preferencial TEXT DEFAULT 'pdf',
  ordem INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mcse_regras_emissao_erp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_mcse_regras_emissao_erp" ON public.mcse_regras_emissao_erp FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_mcse_regras_emissao_erp" ON public.mcse_regras_emissao_erp FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_mcse_regras_emissao_erp" ON public.mcse_regras_emissao_erp FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_mcse_regras_emissao_erp" ON public.mcse_regras_emissao_erp FOR DELETE TO authenticated USING (is_admin());

CREATE INDEX idx_mcse_regras_emissao_erp_regra ON public.mcse_regras_emissao_erp(regra_mcse_id);
CREATE INDEX idx_mcse_regras_emissao_erp_conta ON public.mcse_regras_emissao_erp(conta_mcse_id);

CREATE TRIGGER update_mcse_regras_emissao_erp_updated_at
  BEFORE UPDATE ON public.mcse_regras_emissao_erp
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
