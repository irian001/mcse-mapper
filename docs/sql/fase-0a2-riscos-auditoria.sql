-- ============================================================
-- FASE 0A.2.1 — TABELA DE RISCOS DE AUDITORIA DO TRABALHO
-- Execute MANUALMENTE no Supabase externo (SQL Editor).
-- NÃO executar via Lovable Cloud.
--
-- Idempotente sempre que possível. Não altera tabelas existentes.
-- Não cria vínculo com PTA, regra ou procedimento nesta etapa.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.trabalho_riscos_auditoria (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  trabalho_auditoria_id uuid NOT NULL REFERENCES public.trabalhos_auditoria(id) ON DELETE CASCADE,

  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,

  exercicio_id uuid REFERENCES public.exercicios(id) ON DELETE SET NULL,

  area_ciclo text,

  conta_mcse_id uuid REFERENCES public.mcse_contas(id) ON DELETE SET NULL,

  codigo_conta_snapshot text,

  descricao_conta_snapshot text,

  grupo_contabil text,

  assertiva text,

  risco_identificado text NOT NULL,

  tipo_risco text,

  causa text,

  impacto_potencial text,

  probabilidade text,

  impacto text,

  nivel_risco text,

  risco_significativo boolean NOT NULL DEFAULT false,

  risco_fraude boolean NOT NULL DEFAULT false,

  controle_relevante text,

  risco_controle text,

  resposta_planejada text,

  natureza_resposta text,

  extensao_resposta text,

  oportunidade_resposta text,

  evidencia_esperada text,

  responsavel_id uuid REFERENCES public.auditores(id) ON DELETE SET NULL,

  status_risco text NOT NULL DEFAULT 'identificado',

  conclusao text,

  risco_residual text,

  revisado_por uuid REFERENCES public.auditores(id) ON DELETE SET NULL,

  data_revisao timestamptz,

  ativo boolean NOT NULL DEFAULT true,

  observacoes text,

  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now()

);

COMMENT ON TABLE public.trabalho_riscos_auditoria IS

'Matriz inicial de riscos de auditoria do trabalho. A coerência entre trabalho_auditoria_id, cliente_id e exercicio_id será garantida inicialmente pela aplicação e poderá ser reforçada por trigger/RPC em fase posterior.';

DO $$

BEGIN

  IF NOT EXISTS (

    SELECT 1 FROM pg_constraint

    WHERE conname = 'chk_tra_assertiva'

      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass

  ) THEN

    ALTER TABLE public.trabalho_riscos_auditoria

      ADD CONSTRAINT chk_tra_assertiva

      CHECK (

        assertiva IS NULL OR assertiva IN (

          'existencia',

          'integridade',

          'direitos_obrigacoes',

          'avaliacao',

          'apresentacao_divulgacao',

          'corte',

          'ocorrencia',

          'exatidao',

          'outro'

        )

      );

  END IF;

  IF NOT EXISTS (

    SELECT 1 FROM pg_constraint

    WHERE conname = 'chk_tra_tipo_risco'

      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass

  ) THEN

    ALTER TABLE public.trabalho_riscos_auditoria

      ADD CONSTRAINT chk_tra_tipo_risco

      CHECK (

        tipo_risco IS NULL OR tipo_risco IN (

          'risco_inerente',

          'risco_controle',

          'risco_distorcao_relevante',

          'risco_fraude',

          'risco_divulgacao',

          'risco_estimativa',

          'risco_ti',

          'risco_operacional',

          'outro'

        )

      );

  END IF;

  IF NOT EXISTS (

    SELECT 1 FROM pg_constraint

    WHERE conname = 'chk_tra_probabilidade'

      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass

  ) THEN

    ALTER TABLE public.trabalho_riscos_auditoria

      ADD CONSTRAINT chk_tra_probabilidade

      CHECK (

        probabilidade IS NULL OR probabilidade IN (

          'baixa',

          'media',

          'alta'

        )

      );

  END IF;

  IF NOT EXISTS (

    SELECT 1 FROM pg_constraint

    WHERE conname = 'chk_tra_impacto'

      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass

  ) THEN

    ALTER TABLE public.trabalho_riscos_auditoria

      ADD CONSTRAINT chk_tra_impacto

      CHECK (

        impacto IS NULL OR impacto IN (

          'baixo',

          'medio',

          'alto'

        )

      );

  END IF;

  IF NOT EXISTS (

    SELECT 1 FROM pg_constraint

    WHERE conname = 'chk_tra_nivel_risco'

      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass

  ) THEN

    ALTER TABLE public.trabalho_riscos_auditoria

      ADD CONSTRAINT chk_tra_nivel_risco

      CHECK (

        nivel_risco IS NULL OR nivel_risco IN (

          'baixo',

          'medio',

          'alto',

          'critico'

        )

      );

  END IF;

  IF NOT EXISTS (

    SELECT 1 FROM pg_constraint

    WHERE conname = 'chk_tra_status_risco'

      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass

  ) THEN

    ALTER TABLE public.trabalho_riscos_auditoria

      ADD CONSTRAINT chk_tra_status_risco

      CHECK (

        status_risco IN (

          'identificado',

          'resposta_planejada',

          'em_execucao',

          'respondido',

          'revisado',

          'encerrado'

        )

      );

  END IF;

END $$;

CREATE INDEX IF NOT EXISTS idx_tra_trabalho

  ON public.trabalho_riscos_auditoria (trabalho_auditoria_id);

CREATE INDEX IF NOT EXISTS idx_tra_cliente

  ON public.trabalho_riscos_auditoria (cliente_id);

CREATE INDEX IF NOT EXISTS idx_tra_exercicio

  ON public.trabalho_riscos_auditoria (exercicio_id);

CREATE INDEX IF NOT EXISTS idx_tra_conta_mcse

  ON public.trabalho_riscos_auditoria (conta_mcse_id);

CREATE INDEX IF NOT EXISTS idx_tra_assertiva

  ON public.trabalho_riscos_auditoria (assertiva);

CREATE INDEX IF NOT EXISTS idx_tra_tipo_risco

  ON public.trabalho_riscos_auditoria (tipo_risco);

CREATE INDEX IF NOT EXISTS idx_tra_nivel_risco

  ON public.trabalho_riscos_auditoria (nivel_risco);

CREATE INDEX IF NOT EXISTS idx_tra_risco_significativo

  ON public.trabalho_riscos_auditoria (risco_significativo);

CREATE INDEX IF NOT EXISTS idx_tra_risco_fraude

  ON public.trabalho_riscos_auditoria (risco_fraude);

CREATE INDEX IF NOT EXISTS idx_tra_responsavel

  ON public.trabalho_riscos_auditoria (responsavel_id);

CREATE INDEX IF NOT EXISTS idx_tra_status

  ON public.trabalho_riscos_auditoria (status_risco);

CREATE INDEX IF NOT EXISTS idx_tra_ativo

  ON public.trabalho_riscos_auditoria (ativo);

ALTER TABLE public.trabalho_riscos_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_trabalho_riscos_auditoria

  ON public.trabalho_riscos_auditoria;

CREATE POLICY select_trabalho_riscos_auditoria

  ON public.trabalho_riscos_auditoria

  FOR SELECT

  USING (

    public.is_admin()

    OR (

      NOT public.is_cliente_usuario()

      AND trabalho_auditoria_id IN (

        SELECT * FROM public.get_accessible_trabalho_ids()

      )

    )

  );

DROP POLICY IF EXISTS insert_trabalho_riscos_auditoria

  ON public.trabalho_riscos_auditoria;

CREATE POLICY insert_trabalho_riscos_auditoria

  ON public.trabalho_riscos_auditoria

  FOR INSERT

  WITH CHECK (

    public.is_admin()

    OR (

      NOT public.is_cliente_usuario()

      AND trabalho_auditoria_id IN (

        SELECT * FROM public.get_accessible_trabalho_ids()

      )

    )

  );

DROP POLICY IF EXISTS update_trabalho_riscos_auditoria

  ON public.trabalho_riscos_auditoria;

CREATE POLICY update_trabalho_riscos_auditoria

  ON public.trabalho_riscos_auditoria

  FOR UPDATE

  USING (

    public.is_admin()

    OR (

      NOT public.is_cliente_usuario()

      AND trabalho_auditoria_id IN (

        SELECT * FROM public.get_accessible_trabalho_ids()

      )

    )

  )

  WITH CHECK (

    public.is_admin()

    OR (

      NOT public.is_cliente_usuario()

      AND trabalho_auditoria_id IN (

        SELECT * FROM public.get_accessible_trabalho_ids()

      )

    )

  );

DROP POLICY IF EXISTS delete_trabalho_riscos_auditoria

  ON public.trabalho_riscos_auditoria;

CREATE POLICY delete_trabalho_riscos_auditoria

  ON public.trabalho_riscos_auditoria

  FOR DELETE

  USING (

    public.is_admin()

  );

DROP TRIGGER IF EXISTS trg_upd_trabalho_riscos_auditoria

  ON public.trabalho_riscos_auditoria;

CREATE TRIGGER trg_upd_trabalho_riscos_auditoria

  BEFORE UPDATE ON public.trabalho_riscos_auditoria

  FOR EACH ROW

  EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================

-- Validações pós-execução

-- ============================================================

-- 1. Existência da tabela

-- select to_regclass('public.trabalho_riscos_auditoria');

-- 2. Colunas

-- select

--   column_name,

--   data_type,

--   is_nullable,

--   column_default

-- from information_schema.columns

-- where table_schema = 'public'

--   and table_name = 'trabalho_riscos_auditoria'

-- order by ordinal_position;

-- 3. Constraints

-- select

--   conname,

--   pg_get_constraintdef(oid) as definicao

-- from pg_constraint

-- where conrelid = 'public.trabalho_riscos_auditoria'::regclass

-- order by conname;

-- 4. Índices

-- select

--   indexname,

--   indexdef

-- from pg_indexes

-- where schemaname = 'public'

--   and tablename = 'trabalho_riscos_auditoria'

-- order by indexname;

-- 5. Policies RLS

-- select

--   tablename,

--   policyname,

--   cmd,

--   roles,

--   qual,

--   with_check

-- from pg_policies

-- where schemaname = 'public'

--   and tablename = 'trabalho_riscos_auditoria'

-- order by policyname;

-- 6. Trigger updated_at

-- select

--   event_object_table,

--   trigger_name,

--   action_timing,

--   event_manipulation,

--   action_statement

-- from information_schema.triggers

-- where trigger_schema = 'public'

--   and event_object_table = 'trabalho_riscos_auditoria'

-- order by trigger_name;
