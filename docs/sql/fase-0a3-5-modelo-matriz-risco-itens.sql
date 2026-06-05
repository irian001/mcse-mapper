-- =============================================================================
--  FASE 0A.3.5.1 - TABELA: public.modelo_matriz_risco_itens
-- =============================================================================
--  Objetivo: criar os itens/riscos padrao vinculados aos cabecalhos de modelos
--  de matriz de riscos em public.modelos_matriz_riscos.
--
--  Esta fase NAO cria vinculos formais com regras, procedimentos, documentos,
--  solicitacoes ou evidencias; tambem NAO importa riscos para
--  public.trabalho_riscos_auditoria.
--
--  Pre-condicoes ja existentes no banco:
--    - public.modelos_matriz_riscos
--    - public.mcse_contas
--    - public.mcse_grupos
--    - public.auditores
--    - public.can_manage_modelos_matriz_riscos()
--    - public.is_admin()
--    - public.is_cliente_usuario()
--    - public.get_my_auditor_id()
--    - public.update_updated_at_column()
--
--  EXECUTAR MANUALMENTE NO SQL EDITOR DO SUPABASE EXTERNO.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASSO 1 - TABELA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modelo_matriz_risco_itens (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_matriz_risco_id     uuid        NOT NULL,
  codigo_item_modelo         text,
  ordem                      integer     NOT NULL DEFAULT 0,
  area_ciclo                 text,
  conta_mcse_id              uuid,
  codigo_conta_snapshot      text,
  descricao_conta_snapshot   text,
  grupo_contabil             text,
  assertiva                  text,
  risco_identificado         text        NOT NULL,
  tipo_risco                 text,
  causa                      text,
  impacto_potencial          text,
  probabilidade              text,
  impacto                    text,
  nivel_risco                text,
  risco_significativo        boolean     NOT NULL DEFAULT false,
  risco_fraude               boolean     NOT NULL DEFAULT false,
  controle_relevante         boolean     NOT NULL DEFAULT false,
  risco_controle             boolean     NOT NULL DEFAULT false,
  resposta_planejada         text,
  natureza_resposta          text,
  extensao_resposta          text,
  oportunidade_resposta      text,
  evidencia_esperada         text,
  procedimento_sugerido      text,
  obrigatorio                boolean     NOT NULL DEFAULT false,
  ativo                      boolean     NOT NULL DEFAULT true,
  observacoes                text,
  criado_por                 uuid,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

-- Colunas mantidas idempotentes para ambientes parcialmente criados.
ALTER TABLE public.modelo_matriz_risco_itens
  ADD COLUMN IF NOT EXISTS modelo_matriz_risco_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS codigo_item_modelo text,
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_ciclo text,
  ADD COLUMN IF NOT EXISTS conta_mcse_id uuid,
  ADD COLUMN IF NOT EXISTS codigo_conta_snapshot text,
  ADD COLUMN IF NOT EXISTS descricao_conta_snapshot text,
  ADD COLUMN IF NOT EXISTS grupo_contabil text,
  ADD COLUMN IF NOT EXISTS assertiva text,
  ADD COLUMN IF NOT EXISTS risco_identificado text NOT NULL,
  ADD COLUMN IF NOT EXISTS tipo_risco text,
  ADD COLUMN IF NOT EXISTS causa text,
  ADD COLUMN IF NOT EXISTS impacto_potencial text,
  ADD COLUMN IF NOT EXISTS probabilidade text,
  ADD COLUMN IF NOT EXISTS impacto text,
  ADD COLUMN IF NOT EXISTS nivel_risco text,
  ADD COLUMN IF NOT EXISTS risco_significativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS risco_fraude boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS controle_relevante boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS risco_controle boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resposta_planejada text,
  ADD COLUMN IF NOT EXISTS natureza_resposta text,
  ADD COLUMN IF NOT EXISTS extensao_resposta text,
  ADD COLUMN IF NOT EXISTS oportunidade_resposta text,
  ADD COLUMN IF NOT EXISTS evidencia_esperada text,
  ADD COLUMN IF NOT EXISTS procedimento_sugerido text,
  ADD COLUMN IF NOT EXISTS obrigatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS criado_por uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON TABLE public.modelo_matriz_risco_itens IS
  'Itens/riscos padrao dos modelos de matriz de riscos. Compatibilizados com public.trabalho_riscos_auditoria para importacao futura.';

COMMENT ON COLUMN public.modelo_matriz_risco_itens.modelo_matriz_risco_id IS
  'Cabecalho do modelo de matriz de riscos ao qual o item pertence.';

COMMENT ON COLUMN public.modelo_matriz_risco_itens.codigo_item_modelo IS
  'Codigo opcional e estavel do item dentro do modelo.';

COMMENT ON COLUMN public.modelo_matriz_risco_itens.conta_mcse_id IS
  'Conta MCSE opcional. Riscos padrao podem ser cadastrados sem conta.';

COMMENT ON COLUMN public.modelo_matriz_risco_itens.procedimento_sugerido IS
  'Texto livre para procedimento sugerido, sem vinculo formal nesta fase.';

-- -----------------------------------------------------------------------------
-- PASSO 2 - FOREIGN KEYS E CONSTRAINTS
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmri_modelo'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT fk_mmri_modelo
      FOREIGN KEY (modelo_matriz_risco_id)
      REFERENCES public.modelos_matriz_riscos(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmri_conta_mcse'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT fk_mmri_conta_mcse
      FOREIGN KEY (conta_mcse_id)
      REFERENCES public.mcse_contas(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmri_criado_por'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT fk_mmri_criado_por
      FOREIGN KEY (criado_por)
      REFERENCES public.auditores(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmri_risco_identificado_preenchido'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT chk_mmri_risco_identificado_preenchido
      CHECK (length(btrim(risco_identificado)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmri_ordem_nao_negativa'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT chk_mmri_ordem_nao_negativa
      CHECK (ordem >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmri_codigo_item_preenchido'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT chk_mmri_codigo_item_preenchido
      CHECK (
        codigo_item_modelo IS NULL
        OR length(btrim(codigo_item_modelo)) > 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmri_assertiva'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT chk_mmri_assertiva
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
    WHERE conname = 'chk_mmri_tipo_risco'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT chk_mmri_tipo_risco
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
    WHERE conname = 'chk_mmri_probabilidade'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT chk_mmri_probabilidade
      CHECK (probabilidade IS NULL OR probabilidade IN ('baixa', 'media', 'alta'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmri_impacto'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT chk_mmri_impacto
      CHECK (impacto IS NULL OR impacto IN ('baixo', 'medio', 'alto'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmri_nivel_risco'
      AND conrelid = 'public.modelo_matriz_risco_itens'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_itens
      ADD CONSTRAINT chk_mmri_nivel_risco
      CHECK (nivel_risco IS NULL OR nivel_risco IN ('baixo', 'medio', 'alto', 'critico'));
  END IF;
END $$;

-- Codigo opcional unico por modelo, normalizado por caixa e espacos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mmri_modelo_codigo_item_norm
  ON public.modelo_matriz_risco_itens (
    modelo_matriz_risco_id,
    lower(btrim(codigo_item_modelo))
  )
  WHERE codigo_item_modelo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mmri_modelo
  ON public.modelo_matriz_risco_itens (modelo_matriz_risco_id);

CREATE INDEX IF NOT EXISTS idx_mmri_conta_mcse
  ON public.modelo_matriz_risco_itens (conta_mcse_id);

CREATE INDEX IF NOT EXISTS idx_mmri_ativo
  ON public.modelo_matriz_risco_itens (ativo);

CREATE INDEX IF NOT EXISTS idx_mmri_obrigatorio
  ON public.modelo_matriz_risco_itens (obrigatorio);

CREATE INDEX IF NOT EXISTS idx_mmri_risco_significativo
  ON public.modelo_matriz_risco_itens (risco_significativo);

CREATE INDEX IF NOT EXISTS idx_mmri_risco_fraude
  ON public.modelo_matriz_risco_itens (risco_fraude);

CREATE INDEX IF NOT EXISTS idx_mmri_nivel_risco
  ON public.modelo_matriz_risco_itens (nivel_risco);

CREATE INDEX IF NOT EXISTS idx_mmri_area_ciclo
  ON public.modelo_matriz_risco_itens (area_ciclo);

CREATE INDEX IF NOT EXISTS idx_mmri_modelo_ativo_ordem
  ON public.modelo_matriz_risco_itens (modelo_matriz_risco_id, ativo, ordem);

CREATE INDEX IF NOT EXISTS idx_mmri_modelo_ordem
  ON public.modelo_matriz_risco_itens (modelo_matriz_risco_id, ordem);

CREATE INDEX IF NOT EXISTS idx_mmri_modelo_nivel_risco
  ON public.modelo_matriz_risco_itens (modelo_matriz_risco_id, nivel_risco);

CREATE INDEX IF NOT EXISTS idx_mmri_modelo_risco_significativo
  ON public.modelo_matriz_risco_itens (modelo_matriz_risco_id, risco_significativo);

CREATE INDEX IF NOT EXISTS idx_mmri_modelo_risco_fraude
  ON public.modelo_matriz_risco_itens (modelo_matriz_risco_id, risco_fraude);

CREATE INDEX IF NOT EXISTS idx_mmri_codigo_item_norm
  ON public.modelo_matriz_risco_itens (lower(btrim(codigo_item_modelo)))
  WHERE codigo_item_modelo IS NOT NULL;

-- -----------------------------------------------------------------------------
-- PASSO 3 - TRIGGER updated_at
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_upd_modelo_matriz_risco_itens
  ON public.modelo_matriz_risco_itens;

CREATE TRIGGER trg_upd_modelo_matriz_risco_itens
  BEFORE UPDATE ON public.modelo_matriz_risco_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- PASSO 4 - VALIDACAO DE ITEM
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_modelo_matriz_risco_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status_modelo text;
  v_auditor_id uuid;
  v_conta_ativa boolean;
  v_codigo_conta text;
  v_descricao_conta text;
  v_grupo_contabil text;
  v_conta_alterada boolean := false;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.modelo_matriz_risco_id IS DISTINCT FROM OLD.modelo_matriz_risco_id THEN
    RAISE EXCEPTION 'Nao e permitido alterar o modelo de um item existente. Inative o item anterior e crie outro no modelo correto.';
  END IF;

  SELECT mmr.status_modelo
    INTO v_status_modelo
  FROM public.modelos_matriz_riscos mmr
  WHERE mmr.id = NEW.modelo_matriz_risco_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modelo de matriz de riscos nao localizado.';
  END IF;

  IF v_status_modelo <> 'rascunho' THEN
    RAISE EXCEPTION 'Itens do modelo so podem ser alterados enquanto o modelo estiver em rascunho.';
  END IF;

  IF NOT public.can_manage_modelos_matriz_riscos() THEN
    RAISE EXCEPTION 'Usuario sem permissao para criar ou editar itens de modelo de matriz de riscos.';
  END IF;

  v_auditor_id := public.get_my_auditor_id();

  IF TG_OP = 'INSERT' AND NEW.criado_por IS NULL THEN
    NEW.criado_por := v_auditor_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_conta_alterada := true;
  ELSE
    v_conta_alterada := NEW.conta_mcse_id IS DISTINCT FROM OLD.conta_mcse_id;
  END IF;

  IF NEW.conta_mcse_id IS NULL THEN
    IF v_conta_alterada THEN
      NEW.codigo_conta_snapshot := NULL;
      NEW.descricao_conta_snapshot := NULL;
      NEW.grupo_contabil := NULL;
    END IF;

    RETURN NEW;
  END IF;

  SELECT
    c.ativo,
    c.codigo_mcse,
    c.descricao_conta,
    g.descricao_grupo
  INTO
    v_conta_ativa,
    v_codigo_conta,
    v_descricao_conta,
    v_grupo_contabil
  FROM public.mcse_contas c
  LEFT JOIN public.mcse_grupos g
    ON g.id = c.grupo_id
  WHERE c.id = NEW.conta_mcse_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta MCSE nao localizada.';
  END IF;

  IF NEW.ativo = true AND v_conta_ativa IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'A conta MCSE esta inativa e nao pode permanecer em item ativo do modelo.';
  END IF;

  IF v_conta_alterada THEN
    NEW.codigo_conta_snapshot := v_codigo_conta;
    NEW.descricao_conta_snapshot := v_descricao_conta;
    NEW.grupo_contabil := v_grupo_contabil;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_modelo_matriz_risco_item()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validar_modelo_matriz_risco_item
  ON public.modelo_matriz_risco_itens;

CREATE TRIGGER trg_validar_modelo_matriz_risco_item
  BEFORE INSERT OR UPDATE ON public.modelo_matriz_risco_itens
  FOR EACH ROW EXECUTE FUNCTION public.validar_modelo_matriz_risco_item();

-- -----------------------------------------------------------------------------
-- PASSO 5 - BLOQUEIO DE DELETE FISICO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bloquear_delete_modelo_matriz_risco_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Nao e permitido excluir fisicamente um item do modelo de matriz de riscos. Utilize inativacao logica.';
END;
$$;

REVOKE ALL ON FUNCTION public.bloquear_delete_modelo_matriz_risco_item()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bloquear_delete_modelo_matriz_risco_item
  ON public.modelo_matriz_risco_itens;

CREATE TRIGGER trg_bloquear_delete_modelo_matriz_risco_item
  BEFORE DELETE ON public.modelo_matriz_risco_itens
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_delete_modelo_matriz_risco_item();

-- -----------------------------------------------------------------------------
-- PASSO 6 - RLS, POLICIES E GRANTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.modelo_matriz_risco_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_modelo_matriz_risco_itens
  ON public.modelo_matriz_risco_itens;
DROP POLICY IF EXISTS insert_modelo_matriz_risco_itens
  ON public.modelo_matriz_risco_itens;
DROP POLICY IF EXISTS update_modelo_matriz_risco_itens
  ON public.modelo_matriz_risco_itens;
DROP POLICY IF EXISTS delete_modelo_matriz_risco_itens
  ON public.modelo_matriz_risco_itens;

CREATE POLICY select_modelo_matriz_risco_itens
  ON public.modelo_matriz_risco_itens
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.get_my_auditor_id() IS NOT NULL
      AND NOT public.is_cliente_usuario()
    )
  );

CREATE POLICY insert_modelo_matriz_risco_itens
  ON public.modelo_matriz_risco_itens
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_modelos_matriz_riscos());

CREATE POLICY update_modelo_matriz_risco_itens
  ON public.modelo_matriz_risco_itens
  FOR UPDATE TO authenticated
  USING (public.can_manage_modelos_matriz_riscos())
  WITH CHECK (public.can_manage_modelos_matriz_riscos());

CREATE POLICY delete_modelo_matriz_risco_itens
  ON public.modelo_matriz_risco_itens
  FOR DELETE TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.modelo_matriz_risco_itens
  FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modelo_matriz_risco_itens
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- VALIDACOES POS-EXECUCAO - SOMENTE SELECT
-- Rodar manualmente, fora do bloco transacional acima.
-- =============================================================================

-- 1) Existencia da tabela
-- SELECT table_schema, table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name = 'modelo_matriz_risco_itens';

-- 2) Colunas
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'modelo_matriz_risco_itens'
-- ORDER BY ordinal_position;

-- 3) Constraints e FKs
-- SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS definition
-- FROM pg_constraint con
-- WHERE con.conrelid = 'public.modelo_matriz_risco_itens'::regclass
-- ORDER BY con.conname;

-- 4) Indices
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'modelo_matriz_risco_itens'
-- ORDER BY indexname;

-- 5) Trigger updated_at
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'modelo_matriz_risco_itens'
--   AND trigger_name = 'trg_upd_modelo_matriz_risco_itens';

-- 6) Trigger de validacao
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'modelo_matriz_risco_itens'
--   AND trigger_name = 'trg_validar_modelo_matriz_risco_item';

-- 7) Trigger de bloqueio de delete
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'modelo_matriz_risco_itens'
--   AND trigger_name = 'trg_bloquear_delete_modelo_matriz_risco_item';

-- 8) Funcoes criadas
-- SELECT n.nspname AS schema_name, p.proname, pg_get_function_arguments(p.oid) AS arguments
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'validar_modelo_matriz_risco_item',
--     'bloquear_delete_modelo_matriz_risco_item'
--   )
-- ORDER BY p.proname;

-- 9) SECURITY DEFINER e search_path das funcoes
-- SELECT n.nspname AS schema_name, p.proname, p.prosecdef AS security_definer, p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'validar_modelo_matriz_risco_item',
--     'bloquear_delete_modelo_matriz_risco_item'
--   )
-- ORDER BY p.proname;

-- 10) Grants/revokes das funcoes
-- SELECT routine_schema, routine_name, grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name IN (
--     'validar_modelo_matriz_risco_item',
--     'bloquear_delete_modelo_matriz_risco_item'
--   )
-- ORDER BY routine_name, grantee, privilege_type;

-- 11) RLS habilitada
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename = 'modelo_matriz_risco_itens';

-- 12) Policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'modelo_matriz_risco_itens'
-- ORDER BY policyname;

-- 13) Grants da tabela
-- SELECT table_schema, table_name, grantee, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'public'
--   AND table_name = 'modelo_matriz_risco_itens'
-- ORDER BY grantee, privilege_type;

-- 14) Funcoes dependentes
-- SELECT n.nspname AS schema_name, p.proname, pg_get_function_arguments(p.oid) AS arguments
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'can_manage_modelos_matriz_riscos',
--     'is_admin',
--     'is_cliente_usuario',
--     'get_my_auditor_id',
--     'update_updated_at_column'
--   )
-- ORDER BY p.proname;

-- 15) Itens por modelo
-- SELECT
--   mmri.id,
--   mmr.codigo_modelo,
--   mmr.nome_modelo,
--   mmr.versao,
--   mmr.status_modelo,
--   mmri.codigo_item_modelo,
--   mmri.ordem,
--   mmri.area_ciclo,
--   mmri.codigo_conta_snapshot,
--   mmri.descricao_conta_snapshot,
--   mmri.grupo_contabil,
--   mmri.assertiva,
--   mmri.risco_identificado,
--   mmri.tipo_risco,
--   mmri.probabilidade,
--   mmri.impacto,
--   mmri.nivel_risco,
--   mmri.risco_significativo,
--   mmri.risco_fraude,
--   mmri.obrigatorio,
--   mmri.ativo
-- FROM public.modelo_matriz_risco_itens mmri
-- JOIN public.modelos_matriz_riscos mmr ON mmr.id = mmri.modelo_matriz_risco_id
-- ORDER BY mmr.codigo_modelo, mmr.versao, mmri.ordem, mmri.risco_identificado;

-- 16) Comparacao dos campos principais com trabalho_riscos_auditoria
-- SELECT table_name, column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('modelo_matriz_risco_itens', 'trabalho_riscos_auditoria')
--   AND column_name IN (
--     'area_ciclo',
--     'conta_mcse_id',
--     'codigo_conta_snapshot',
--     'descricao_conta_snapshot',
--     'grupo_contabil',
--     'assertiva',
--     'risco_identificado',
--     'tipo_risco',
--     'causa',
--     'impacto_potencial',
--     'probabilidade',
--     'impacto',
--     'nivel_risco',
--     'risco_significativo',
--     'risco_fraude',
--     'resposta_planejada',
--     'natureza_resposta',
--     'extensao_resposta',
--     'oportunidade_resposta',
--     'evidencia_esperada',
--     'ativo',
--     'observacoes'
--   )
-- ORDER BY column_name, table_name;

-- =============================================================================
-- TESTE OPCIONAL APENAS EM STAGING - NAO EXECUTAR EM PRODUCAO
-- =============================================================================
-- Esta fase nao inclui testes de escrita no bloco normal de validacoes.
-- Caso seja necessario testar criacao, edicao, inativacao ou bloqueio de delete,
-- preparar um roteiro separado em ambiente controlado com registros descartaveis.
