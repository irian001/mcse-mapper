-- ============================================================
-- FASE 0A.1.8.1 — VÍNCULO DE BASE DE MATERIALIDADE NO PTA
-- Execute MANUALMENTE no Supabase externo (SQL Editor).
-- NÃO executar via Lovable Cloud.
--
-- Incremental e idempotente. Não altera campos atuais de
-- materialidade do PTA (materialidade_aplicavel, limite_materialidade,
-- limite_variacao). Não altera RLS de papeis_trabalho.
-- Não altera papel_trabalho_linhas. Não altera status_pta.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) NOVAS COLUNAS em public.papeis_trabalho
--    Todas opcionais (NULLABLE), sem default não-nulo, para
--    não impactar PTAs existentes.
-- ------------------------------------------------------------
ALTER TABLE public.papeis_trabalho
  ADD COLUMN IF NOT EXISTS materialidade_base_id uuid
    REFERENCES public.trabalho_materialidade_bases(id) ON DELETE SET NULL;

ALTER TABLE public.papeis_trabalho
  ADD COLUMN IF NOT EXISTS materialidade_base_nome_snapshot text;

ALTER TABLE public.papeis_trabalho
  ADD COLUMN IF NOT EXISTS materialidade_base_valor_snapshot numeric(18,2);

ALTER TABLE public.papeis_trabalho
  ADD COLUMN IF NOT EXISTS materialidade_base_percentual_snapshot numeric(10,4);

ALTER TABLE public.papeis_trabalho
  ADD COLUMN IF NOT EXISTS materialidade_base_saldo_snapshot numeric(18,2);

ALTER TABLE public.papeis_trabalho
  ADD COLUMN IF NOT EXISTS materialidade_base_codigo_conta_snapshot text;

ALTER TABLE public.papeis_trabalho
  ADD COLUMN IF NOT EXISTS materialidade_base_descricao_conta_snapshot text;

ALTER TABLE public.papeis_trabalho
  ADD COLUMN IF NOT EXISTS materialidade_base_criterio_snapshot text;

-- ------------------------------------------------------------
-- 2) ÍNDICE para a FK
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_papeis_trabalho_materialidade_base_id
  ON public.papeis_trabalho(materialidade_base_id);

-- ------------------------------------------------------------
-- 3) CONSTRAINTS tolerantes a NULL
--    Adicionadas apenas se ainda não existirem.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_pt_materialidade_base_valor_nn'
      AND conrelid = 'public.papeis_trabalho'::regclass
  ) THEN
    ALTER TABLE public.papeis_trabalho
      ADD CONSTRAINT chk_pt_materialidade_base_valor_nn
      CHECK (materialidade_base_valor_snapshot IS NULL
             OR materialidade_base_valor_snapshot >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_pt_materialidade_base_percentual_nn'
      AND conrelid = 'public.papeis_trabalho'::regclass
  ) THEN
    ALTER TABLE public.papeis_trabalho
      ADD CONSTRAINT chk_pt_materialidade_base_percentual_nn
      CHECK (materialidade_base_percentual_snapshot IS NULL
             OR materialidade_base_percentual_snapshot >= 0);
  END IF;

  -- NOTA: NÃO existe constraint para materialidade_base_saldo_snapshot,
  -- pois quando o critério é 'saldo_final' o saldo pode ser negativo.

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_pt_materialidade_base_criterio'
      AND conrelid = 'public.papeis_trabalho'::regclass
  ) THEN
    ALTER TABLE public.papeis_trabalho
      ADD CONSTRAINT chk_pt_materialidade_base_criterio
      CHECK (materialidade_base_criterio_snapshot IS NULL
             OR materialidade_base_criterio_snapshot IN (
               'saldo_final',
               'saldo_final_absoluto',
               'saldo_devedor',
               'saldo_credor',
               'valor_manual'
             ));
  END IF;
END$$;

-- ------------------------------------------------------------
-- 4) RLS
-- As policies existentes em public.papeis_trabalho permanecem
-- válidas e cobrem automaticamente as novas colunas.
-- Nenhuma alteração de policy é feita nesta etapa.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 5) Recarrega cache do PostgREST
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- VALIDAÇÕES PÓS-EXECUÇÃO (rodar separadamente, fora do BEGIN)
-- ============================================================
-- 1) Colunas adicionadas
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema='public'
--     AND table_name='papeis_trabalho'
--     AND column_name LIKE 'materialidade_base%'
--   ORDER BY column_name;
--
-- 2) Índice criado
-- SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE schemaname='public'
--     AND tablename='papeis_trabalho'
--     AND indexname LIKE '%materialidade_base%';
--
-- 3) Constraints esperadas:
--    - chk_pt_materialidade_base_valor_nn        (valor       >= 0 ou NULL)
--    - chk_pt_materialidade_base_percentual_nn   (percentual  >= 0 ou NULL)
--    - chk_pt_materialidade_base_criterio        (critério IN (...) ou NULL)
--    NÃO deve existir chk_pt_materialidade_base_saldo_nn (saldo pode ser negativo).
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.papeis_trabalho'::regclass
--     AND conname LIKE '%materialidade_base%'
--   ORDER BY conname;
-- ============================================================
