-- ============================================================
-- AJUSTE INCREMENTAL — FATURAS EM ABERTO
-- Remove campos não utilizados nesta etapa.
-- Execute manualmente no Supabase externo (SQL Editor).
-- NÃO executar via Lovable Cloud.
--
-- ATENÇÃO: estamos em fase de testes. Caso essas colunas já
-- contenham dados, eles SERÃO DESCARTADOS ao serem removidas.
--
-- Mantidos:
--   - situacao_fornecimento  (continua sendo usado para análises)
--   - classe_codigo, municipio_codigo, uc, data_vencimento, ano_mes_faturamento
-- ============================================================

-- 1) Remover índices dependentes (se existirem)
DROP INDEX IF EXISTS public.idx_pfai_contacont;
-- (não havia índice de situacao_uc_codigo, mas mantemos por segurança)
DROP INDEX IF EXISTS public.idx_pfai_situacao_uc;

-- 2) Remover colunas não utilizadas da tabela de itens
ALTER TABLE public.procedimento_faturas_aberto_itens
  DROP COLUMN IF EXISTS conta_contabil_codigo,
  DROP COLUMN IF EXISTS conta_contabil_descricao_snapshot,
  DROP COLUMN IF EXISTS grupo_contabil,
  DROP COLUMN IF EXISTS situacao_uc_codigo,
  DROP COLUMN IF EXISTS situacao_uc_descricao_snapshot;

-- 3) Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
