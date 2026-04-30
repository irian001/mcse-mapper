-- ============================================================
-- AJUSTE INCREMENTAL — Datas de execução em Procedimentos Auxiliares
-- e em blocos de Contagem de Estoque.
-- Execute MANUALMENTE no Supabase externo (SQL Editor).
-- NÃO executado automaticamente pelo Lovable.
-- ============================================================

-- 1) Procedimentos Auxiliares: período de execução
ALTER TABLE public.procedimentos_auxiliares
  ADD COLUMN IF NOT EXISTS data_inicio_execucao date,
  ADD COLUMN IF NOT EXISTS data_fim_execucao    date;

CREATE INDEX IF NOT EXISTS idx_proc_aux_data_inicio_execucao
  ON public.procedimentos_auxiliares(data_inicio_execucao);
CREATE INDEX IF NOT EXISTS idx_proc_aux_data_fim_execucao
  ON public.procedimentos_auxiliares(data_fim_execucao);

-- 2) Blocos de contagem de estoque: data de referência e execução
ALTER TABLE public.procedimento_contagem_estoque_blocos
  ADD COLUMN IF NOT EXISTS data_referencia date,
  ADD COLUMN IF NOT EXISTS data_execucao   date;

CREATE INDEX IF NOT EXISTS idx_ce_blocos_data_referencia
  ON public.procedimento_contagem_estoque_blocos(data_referencia);
CREATE INDEX IF NOT EXISTS idx_ce_blocos_data_execucao
  ON public.procedimento_contagem_estoque_blocos(data_execucao);

-- ------------------------------------------------------------
-- (Opcional) Política de DELETE para procedimentos_auxiliares
-- Habilite caso queira permitir exclusão durante a fase de testes.
-- Mantém a regra padrão do projeto: somente admin pode apagar.
-- ------------------------------------------------------------
-- ALTER TABLE public.procedimentos_auxiliares ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS delete_procedimentos_auxiliares ON public.procedimentos_auxiliares;
-- CREATE POLICY delete_procedimentos_auxiliares
--   ON public.procedimentos_auxiliares
--   FOR DELETE TO authenticated
--   USING (public.is_admin());

-- Recarrega o schema do PostgREST
NOTIFY pgrst, 'reload schema';
