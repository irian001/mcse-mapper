-- ============================================================
-- FASE 0A.1.6 — BASES DE MATERIALIDADE (filha de trabalho_materialidade)
-- Execute MANUALMENTE no Supabase externo (SQL Editor).
-- NÃO executar via Lovable Cloud.
--
-- Idempotente sempre que possível. Não altera tabelas existentes.
-- Não cria vínculo com PTA nesta etapa.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) TABELA: trabalho_materialidade_bases
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trabalho_materialidade_bases (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  trabalho_materialidade_id   uuid NOT NULL REFERENCES public.trabalho_materialidade(id) ON DELETE CASCADE,
  trabalho_auditoria_id       uuid NOT NULL REFERENCES public.trabalhos_auditoria(id)    ON DELETE CASCADE,
  cliente_id                  uuid NOT NULL REFERENCES public.clientes(id)               ON DELETE RESTRICT,
  exercicio_id                uuid REFERENCES public.exercicios(id)                      ON DELETE SET NULL,

  nome_base                   text NOT NULL,
  descricao_base              text,

  -- Vínculo opcional ao balancete do trabalho (snapshot preservado mesmo se balancete mudar)
  balancete_id                uuid REFERENCES public.balancetes(id)        ON DELETE SET NULL,
  balancete_linha_id          uuid REFERENCES public.balancete_linhas(id)  ON DELETE SET NULL,

  codigo_conta_snapshot       text,
  descricao_conta_snapshot    text,
  saldo_base_snapshot         numeric(18,2),

  criterio_saldo_base         text NOT NULL DEFAULT 'saldo_final_absoluto',

  percentual_aplicado         numeric(10,4),
  valor_materialidade         numeric(18,2),

  observacoes                 text,
  ordem                       integer DEFAULT 1,
  ativo                       boolean NOT NULL DEFAULT true,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_tmb_criterio
    CHECK (criterio_saldo_base IN (
      'saldo_final',
      'saldo_final_absoluto',
      'saldo_devedor',
      'saldo_credor',
      'valor_manual'
    )),

  CONSTRAINT chk_tmb_percentual_nn
    CHECK (percentual_aplicado IS NULL OR percentual_aplicado >= 0),

  CONSTRAINT chk_tmb_valor_nn
    CHECK (valor_materialidade IS NULL OR valor_materialidade >= 0)
);

-- ------------------------------------------------------------
-- 2) ÍNDICES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tmb_materialidade   ON public.trabalho_materialidade_bases(trabalho_materialidade_id);
CREATE INDEX IF NOT EXISTS idx_tmb_trabalho        ON public.trabalho_materialidade_bases(trabalho_auditoria_id);
CREATE INDEX IF NOT EXISTS idx_tmb_cliente         ON public.trabalho_materialidade_bases(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tmb_exercicio       ON public.trabalho_materialidade_bases(exercicio_id);
CREATE INDEX IF NOT EXISTS idx_tmb_balancete       ON public.trabalho_materialidade_bases(balancete_id);
CREATE INDEX IF NOT EXISTS idx_tmb_balancete_linha ON public.trabalho_materialidade_bases(balancete_linha_id);
CREATE INDEX IF NOT EXISTS idx_tmb_ativo           ON public.trabalho_materialidade_bases(ativo);
CREATE INDEX IF NOT EXISTS idx_tmb_ordem           ON public.trabalho_materialidade_bases(ordem);

-- ------------------------------------------------------------
-- 3) TRIGGER updated_at
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_upd_trabalho_materialidade_bases ON public.trabalho_materialidade_bases;
CREATE TRIGGER trg_upd_trabalho_materialidade_bases
  BEFORE UPDATE ON public.trabalho_materialidade_bases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 4) RLS
-- Padrão do projeto:
--   SELECT/INSERT/UPDATE: admin OU (não cliente_usuario E trabalho acessível)
--   DELETE: somente admin
-- ------------------------------------------------------------
ALTER TABLE public.trabalho_materialidade_bases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_trabalho_materialidade_bases ON public.trabalho_materialidade_bases;
DROP POLICY IF EXISTS insert_trabalho_materialidade_bases ON public.trabalho_materialidade_bases;
DROP POLICY IF EXISTS update_trabalho_materialidade_bases ON public.trabalho_materialidade_bases;
DROP POLICY IF EXISTS delete_trabalho_materialidade_bases ON public.trabalho_materialidade_bases;

CREATE POLICY select_trabalho_materialidade_bases ON public.trabalho_materialidade_bases
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (
      NOT is_cliente_usuario()
      AND trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
    )
  );

CREATE POLICY insert_trabalho_materialidade_bases ON public.trabalho_materialidade_bases
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (
      NOT is_cliente_usuario()
      AND trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
    )
  );

CREATE POLICY update_trabalho_materialidade_bases ON public.trabalho_materialidade_bases
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR (
      NOT is_cliente_usuario()
      AND trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
    )
  )
  WITH CHECK (
    is_admin()
    OR (
      NOT is_cliente_usuario()
      AND trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
    )
  );

CREATE POLICY delete_trabalho_materialidade_bases ON public.trabalho_materialidade_bases
  FOR DELETE TO authenticated
  USING (is_admin());

-- ------------------------------------------------------------
-- 5) Recarrega cache do PostgREST
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- VALIDAÇÕES PÓS-EXECUÇÃO (rodar separadamente, fora do BEGIN)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name='trabalho_materialidade_bases';
--
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='trabalho_materialidade_bases'
--   ORDER BY ordinal_position;
--
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.trabalho_materialidade_bases'::regclass;
--
-- SELECT indexname, indexdef FROM pg_indexes
--   WHERE schemaname='public' AND tablename='trabalho_materialidade_bases';
--
-- SELECT polname, polcmd FROM pg_policies
--   WHERE schemaname='public' AND tablename='trabalho_materialidade_bases';
-- ============================================================
