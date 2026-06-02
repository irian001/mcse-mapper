-- =============================================================================
--  FASE 0A.3.3.1 - TABELA: public.trabalho_planejamento_modalidades
-- =============================================================================
--  Objetivo: registrar quais modalidades de atuacao do cliente fazem parte do
--  escopo do planejamento do trabalho, com snapshots para preservacao historica
--  e bloqueio de alteracao apos aprovacao do planejamento.
--
--  Pre-condicoes ja existentes no banco:
--    - public.trabalho_planejamento
--    - public.trabalhos_auditoria
--    - public.clientes, com segmento_id
--    - public.exercicios
--    - public.segmentos
--    - public.modalidades_atuacao
--    - public.cliente_modalidades_atuacao
--    - public.auditores
--    - public.trabalho_auditores
--    - public.is_admin()
--    - public.is_cliente_usuario()
--    - public.get_my_auditor_id()
--    - public.get_accessible_trabalho_ids()
--    - public.update_updated_at_column()
--
--  NAO cria riscos, modelos de matriz, PTA, importacoes ou dados iniciais.
--  EXECUTAR MANUALMENTE NO SQL EDITOR DO SUPABASE EXTERNO.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASSO 1 - TABELA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trabalho_planejamento_modalidades (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trabalho_planejamento_id        uuid        NOT NULL,
  trabalho_auditoria_id           uuid        NOT NULL,
  cliente_id                      uuid        NOT NULL,
  exercicio_id                    uuid,
  cliente_modalidade_atuacao_id   uuid        NOT NULL,
  modalidade_atuacao_id           uuid        NOT NULL,
  segmento_id_snapshot            uuid,
  segmento_codigo_snapshot        text        NOT NULL,
  segmento_nome_snapshot          text        NOT NULL,
  modalidade_codigo_snapshot      text        NOT NULL,
  modalidade_nome_snapshot        text        NOT NULL,
  principal_cliente_snapshot      boolean     NOT NULL DEFAULT false,
  observacoes_escopo              text,
  ativo                           boolean     NOT NULL DEFAULT true,
  incluido_por                    uuid,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

-- Colunas mantidas idempotentes para execucoes em ambientes parcialmente criados.
ALTER TABLE public.trabalho_planejamento_modalidades
  ADD COLUMN IF NOT EXISTS trabalho_planejamento_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS trabalho_auditoria_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS cliente_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS exercicio_id uuid,
  ADD COLUMN IF NOT EXISTS cliente_modalidade_atuacao_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS modalidade_atuacao_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS segmento_id_snapshot uuid,
  ADD COLUMN IF NOT EXISTS segmento_codigo_snapshot text NOT NULL,
  ADD COLUMN IF NOT EXISTS segmento_nome_snapshot text NOT NULL,
  ADD COLUMN IF NOT EXISTS modalidade_codigo_snapshot text NOT NULL,
  ADD COLUMN IF NOT EXISTS modalidade_nome_snapshot text NOT NULL,
  ADD COLUMN IF NOT EXISTS principal_cliente_snapshot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacoes_escopo text,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS incluido_por uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON TABLE public.trabalho_planejamento_modalidades IS
  'Modalidades de atuacao do cliente incluidas no escopo do planejamento do trabalho.';

COMMENT ON COLUMN public.trabalho_planejamento_modalidades.segmento_id_snapshot IS
  'Snapshot do segmento da modalidade no momento da inclusao ou reativacao.';

COMMENT ON COLUMN public.trabalho_planejamento_modalidades.principal_cliente_snapshot IS
  'Snapshot da indicacao de modalidade principal no cadastro do cliente no momento da inclusao ou reativacao.';

-- -----------------------------------------------------------------------------
-- PASSO 2 - FOREIGN KEYS E CONSTRAINTS
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tpm_planejamento'
      AND conrelid = 'public.trabalho_planejamento_modalidades'::regclass
  ) THEN
    ALTER TABLE public.trabalho_planejamento_modalidades
      ADD CONSTRAINT fk_tpm_planejamento
      FOREIGN KEY (trabalho_planejamento_id)
      REFERENCES public.trabalho_planejamento(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tpm_trabalho'
      AND conrelid = 'public.trabalho_planejamento_modalidades'::regclass
  ) THEN
    ALTER TABLE public.trabalho_planejamento_modalidades
      ADD CONSTRAINT fk_tpm_trabalho
      FOREIGN KEY (trabalho_auditoria_id)
      REFERENCES public.trabalhos_auditoria(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tpm_cliente'
      AND conrelid = 'public.trabalho_planejamento_modalidades'::regclass
  ) THEN
    ALTER TABLE public.trabalho_planejamento_modalidades
      ADD CONSTRAINT fk_tpm_cliente
      FOREIGN KEY (cliente_id)
      REFERENCES public.clientes(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tpm_exercicio'
      AND conrelid = 'public.trabalho_planejamento_modalidades'::regclass
  ) THEN
    ALTER TABLE public.trabalho_planejamento_modalidades
      ADD CONSTRAINT fk_tpm_exercicio
      FOREIGN KEY (exercicio_id)
      REFERENCES public.exercicios(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tpm_cliente_modalidade'
      AND conrelid = 'public.trabalho_planejamento_modalidades'::regclass
  ) THEN
    ALTER TABLE public.trabalho_planejamento_modalidades
      ADD CONSTRAINT fk_tpm_cliente_modalidade
      FOREIGN KEY (cliente_modalidade_atuacao_id)
      REFERENCES public.cliente_modalidades_atuacao(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tpm_modalidade'
      AND conrelid = 'public.trabalho_planejamento_modalidades'::regclass
  ) THEN
    ALTER TABLE public.trabalho_planejamento_modalidades
      ADD CONSTRAINT fk_tpm_modalidade
      FOREIGN KEY (modalidade_atuacao_id)
      REFERENCES public.modalidades_atuacao(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tpm_incluido_por'
      AND conrelid = 'public.trabalho_planejamento_modalidades'::regclass
  ) THEN
    ALTER TABLE public.trabalho_planejamento_modalidades
      ADD CONSTRAINT fk_tpm_incluido_por
      FOREIGN KEY (incluido_por)
      REFERENCES public.auditores(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_tpm_snapshots_preenchidos'
      AND conrelid = 'public.trabalho_planejamento_modalidades'::regclass
  ) THEN
    ALTER TABLE public.trabalho_planejamento_modalidades
      ADD CONSTRAINT chk_tpm_snapshots_preenchidos
      CHECK (
        length(btrim(segmento_codigo_snapshot)) > 0
        AND length(btrim(segmento_nome_snapshot)) > 0
        AND length(btrim(modalidade_codigo_snapshot)) > 0
        AND length(btrim(modalidade_nome_snapshot)) > 0
      );
  END IF;
END $$;

-- Unicidade do vinculo no planejamento. Reativacao deve ocorrer por UPDATE.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tpm_planejamento_cliente_modalidade
  ON public.trabalho_planejamento_modalidades
  (trabalho_planejamento_id, cliente_modalidade_atuacao_id);

CREATE INDEX IF NOT EXISTS idx_tpm_planejamento
  ON public.trabalho_planejamento_modalidades (trabalho_planejamento_id);

CREATE INDEX IF NOT EXISTS idx_tpm_trabalho
  ON public.trabalho_planejamento_modalidades (trabalho_auditoria_id);

CREATE INDEX IF NOT EXISTS idx_tpm_cliente
  ON public.trabalho_planejamento_modalidades (cliente_id);

CREATE INDEX IF NOT EXISTS idx_tpm_exercicio
  ON public.trabalho_planejamento_modalidades (exercicio_id);

CREATE INDEX IF NOT EXISTS idx_tpm_cliente_modalidade
  ON public.trabalho_planejamento_modalidades (cliente_modalidade_atuacao_id);

CREATE INDEX IF NOT EXISTS idx_tpm_modalidade
  ON public.trabalho_planejamento_modalidades (modalidade_atuacao_id);

CREATE INDEX IF NOT EXISTS idx_tpm_ativo
  ON public.trabalho_planejamento_modalidades (ativo);

CREATE INDEX IF NOT EXISTS idx_tpm_planejamento_ativo
  ON public.trabalho_planejamento_modalidades (trabalho_planejamento_id, ativo);

CREATE INDEX IF NOT EXISTS idx_tpm_trabalho_ativo
  ON public.trabalho_planejamento_modalidades (trabalho_auditoria_id, ativo);

CREATE INDEX IF NOT EXISTS idx_tpm_planejamento_modalidade
  ON public.trabalho_planejamento_modalidades (trabalho_planejamento_id, modalidade_atuacao_id);

-- -----------------------------------------------------------------------------
-- PASSO 3 - TRIGGER updated_at
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_upd_trabalho_planejamento_modalidades
  ON public.trabalho_planejamento_modalidades;

CREATE TRIGGER trg_upd_trabalho_planejamento_modalidades
  BEFORE UPDATE ON public.trabalho_planejamento_modalidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- PASSO 4 - FUNCAO DE ALCADA PARA ESCRITA
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_trabalho_planejamento_modalidades(
  p_trabalho_auditoria_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auditor_id uuid;
  v_perfil_acesso text;
BEGIN
  IF p_trabalho_auditoria_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_admin() THEN
    RETURN true;
  END IF;

  IF public.is_cliente_usuario() THEN
    RETURN false;
  END IF;

  v_auditor_id := public.get_my_auditor_id();

  IF v_auditor_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT a.perfil_acesso::text
    INTO v_perfil_acesso
  FROM public.auditores a
  WHERE a.id = v_auditor_id
    AND a.ativo = true;

  IF v_perfil_acesso IN ('socio', 'gerente') THEN
    RETURN true;
  END IF;

  IF v_perfil_acesso = 'senior' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.trabalho_auditores ta
      WHERE ta.trabalho_auditoria_id = p_trabalho_auditoria_id
        AND ta.auditor_id = v_auditor_id
        AND ta.responsavel_principal = true
        AND ta.ativo = true
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_trabalho_planejamento_modalidades(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_trabalho_planejamento_modalidades(uuid)
  TO authenticated;

-- -----------------------------------------------------------------------------
-- PASSO 5 - TRIGGER DE COERENCIA DA TABELA
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_trabalho_planejamento_modalidade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tp_status text;
  v_tp_trabalho_id uuid;
  v_tp_cliente_id uuid;
  v_tp_exercicio_id uuid;
  v_trabalho_cliente_id uuid;
  v_trabalho_exercicio_id uuid;
  v_cliente_segmento_id uuid;
  v_cma_cliente_id uuid;
  v_cma_modalidade_id uuid;
  v_cma_principal boolean;
  v_cma_ativo boolean;
  v_modalidade_segmento_id uuid;
  v_modalidade_ativo boolean;
  v_modalidade_codigo text;
  v_modalidade_nome text;
  v_segmento_codigo text;
  v_segmento_nome text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       NEW.trabalho_planejamento_id IS DISTINCT FROM OLD.trabalho_planejamento_id
       OR NEW.trabalho_auditoria_id IS DISTINCT FROM OLD.trabalho_auditoria_id
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.cliente_modalidade_atuacao_id IS DISTINCT FROM OLD.cliente_modalidade_atuacao_id
       OR NEW.modalidade_atuacao_id IS DISTINCT FROM OLD.modalidade_atuacao_id
     ) THEN
    RAISE EXCEPTION 'Nao e permitido alterar a identidade da modalidade do planejamento. Inative o vinculo anterior e crie ou reative o vinculo correto.';
  END IF;

  SELECT
    tp.status_planejamento,
    tp.trabalho_auditoria_id,
    tp.cliente_id,
    tp.exercicio_id,
    t.cliente_id,
    t.exercicio_id
  INTO
    v_tp_status,
    v_tp_trabalho_id,
    v_tp_cliente_id,
    v_tp_exercicio_id,
    v_trabalho_cliente_id,
    v_trabalho_exercicio_id
  FROM public.trabalho_planejamento tp
  LEFT JOIN public.trabalhos_auditoria t
    ON t.id = tp.trabalho_auditoria_id
  WHERE tp.id = NEW.trabalho_planejamento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Planejamento do trabalho nao localizado.';
  END IF;

  IF v_tp_status <> 'rascunho' THEN
    RAISE EXCEPTION 'Modalidades do planejamento so podem ser alteradas enquanto o planejamento estiver em rascunho.';
  END IF;

  IF v_tp_trabalho_id IS DISTINCT FROM NEW.trabalho_auditoria_id THEN
    RAISE EXCEPTION 'O planejamento informado nao pertence ao trabalho de auditoria informado.';
  END IF;

  IF v_tp_cliente_id IS DISTINCT FROM NEW.cliente_id THEN
    RAISE EXCEPTION 'O cliente informado nao pertence ao planejamento.';
  END IF;

  IF v_trabalho_cliente_id IS NOT NULL
     AND v_trabalho_cliente_id IS DISTINCT FROM NEW.cliente_id THEN
    RAISE EXCEPTION 'O cliente informado nao pertence ao trabalho de auditoria.';
  END IF;

  IF NEW.exercicio_id IS NULL THEN
    NEW.exercicio_id := COALESCE(v_tp_exercicio_id, v_trabalho_exercicio_id);
  ELSIF v_tp_exercicio_id IS NOT NULL
        AND NEW.exercicio_id IS DISTINCT FROM v_tp_exercicio_id THEN
    RAISE EXCEPTION 'O exercicio informado nao pertence ao planejamento.';
  ELSIF v_tp_exercicio_id IS NULL
        AND v_trabalho_exercicio_id IS NOT NULL
        AND NEW.exercicio_id IS DISTINCT FROM v_trabalho_exercicio_id THEN
    RAISE EXCEPTION 'O exercicio informado nao pertence ao trabalho de auditoria.';
  END IF;

  SELECT c.segmento_id
    INTO v_cliente_segmento_id
  FROM public.clientes c
  WHERE c.id = NEW.cliente_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente informado nao localizado.';
  END IF;

  IF v_cliente_segmento_id IS NULL THEN
    RAISE EXCEPTION 'O cliente nao possui segmento definido.';
  END IF;

  SELECT
    cma.cliente_id,
    cma.modalidade_atuacao_id,
    cma.principal,
    cma.ativo
  INTO
    v_cma_cliente_id,
    v_cma_modalidade_id,
    v_cma_principal,
    v_cma_ativo
  FROM public.cliente_modalidades_atuacao cma
  WHERE cma.id = NEW.cliente_modalidade_atuacao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vinculo cliente-modalidade nao localizado.';
  END IF;

  IF v_cma_cliente_id IS DISTINCT FROM NEW.cliente_id THEN
    RAISE EXCEPTION 'A modalidade selecionada nao pertence ao cliente do planejamento.';
  END IF;

  IF v_cma_modalidade_id IS DISTINCT FROM NEW.modalidade_atuacao_id THEN
    RAISE EXCEPTION 'A modalidade informada nao corresponde ao vinculo cliente-modalidade selecionado.';
  END IF;

  IF NEW.ativo = true AND v_cma_ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'O vinculo cliente-modalidade esta inativo e nao pode ser incluído como modalidade ativa do planejamento.';
  END IF;

  SELECT
    m.segmento_id,
    m.ativo,
    m.codigo,
    m.nome
  INTO
    v_modalidade_segmento_id,
    v_modalidade_ativo,
    v_modalidade_codigo,
    v_modalidade_nome
  FROM public.modalidades_atuacao m
  WHERE m.id = NEW.modalidade_atuacao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modalidade de atuacao nao localizada.';
  END IF;

  IF NEW.ativo = true AND v_modalidade_ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'A modalidade de atuacao esta inativa e nao pode ser incluída como modalidade ativa do planejamento.';
  END IF;

  IF v_modalidade_segmento_id IS DISTINCT FROM v_cliente_segmento_id THEN
    RAISE EXCEPTION 'A modalidade de atuacao nao pertence ao segmento atual do cliente.';
  END IF;

  SELECT s.codigo, s.nome
    INTO v_segmento_codigo, v_segmento_nome
  FROM public.segmentos s
  WHERE s.id = v_modalidade_segmento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Segmento da modalidade nao localizado.';
  END IF;

  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND OLD.ativo = false AND NEW.ativo = true) THEN
    NEW.segmento_id_snapshot := v_modalidade_segmento_id;
    NEW.segmento_codigo_snapshot := v_segmento_codigo;
    NEW.segmento_nome_snapshot := v_segmento_nome;
    NEW.modalidade_codigo_snapshot := v_modalidade_codigo;
    NEW.modalidade_nome_snapshot := v_modalidade_nome;
    NEW.principal_cliente_snapshot := COALESCE(v_cma_principal, false);
  END IF;

  IF TG_OP = 'INSERT' AND NEW.incluido_por IS NULL THEN
    NEW.incluido_por := public.get_my_auditor_id();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_trabalho_planejamento_modalidade()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validar_trabalho_planejamento_modalidade
  ON public.trabalho_planejamento_modalidades;

CREATE TRIGGER trg_validar_trabalho_planejamento_modalidade
  BEFORE INSERT OR UPDATE ON public.trabalho_planejamento_modalidades
  FOR EACH ROW EXECUTE FUNCTION public.validar_trabalho_planejamento_modalidade();

-- -----------------------------------------------------------------------------
-- PASSO 6 - TRIGGER DE BLOQUEIO DE DELETE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bloquear_delete_trabalho_planejamento_modalidade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status_planejamento text;
BEGIN
  SELECT tp.status_planejamento
    INTO v_status_planejamento
  FROM public.trabalho_planejamento tp
  WHERE tp.id = OLD.trabalho_planejamento_id;

  IF v_status_planejamento = 'aprovado' THEN
    RAISE EXCEPTION 'Modalidades do planejamento aprovado nao podem ser excluidas. Use inativacao logica quando aplicavel em planejamento em rascunho.';
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.bloquear_delete_trabalho_planejamento_modalidade()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bloquear_delete_trabalho_planejamento_modalidade
  ON public.trabalho_planejamento_modalidades;

CREATE TRIGGER trg_bloquear_delete_trabalho_planejamento_modalidade
  BEFORE DELETE ON public.trabalho_planejamento_modalidades
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_delete_trabalho_planejamento_modalidade();

-- -----------------------------------------------------------------------------
-- PASSO 7 - VALIDACAO ANTES DE APROVAR PLANEJAMENTO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_modalidades_antes_aprovar_planejamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status_planejamento = 'rascunho'
     AND NEW.status_planejamento = 'aprovado' THEN
    IF EXISTS (
      SELECT 1
      FROM public.trabalho_planejamento_modalidades tpm
      LEFT JOIN public.cliente_modalidades_atuacao cma
        ON cma.id = tpm.cliente_modalidade_atuacao_id
      LEFT JOIN public.modalidades_atuacao m
        ON m.id = tpm.modalidade_atuacao_id
      LEFT JOIN public.clientes c
        ON c.id = NEW.cliente_id
      WHERE tpm.trabalho_planejamento_id = NEW.id
        AND tpm.ativo = true
        AND (
          tpm.trabalho_auditoria_id IS DISTINCT FROM NEW.trabalho_auditoria_id
          OR tpm.cliente_id IS DISTINCT FROM NEW.cliente_id
          OR cma.id IS NULL
          OR cma.ativo IS DISTINCT FROM true
          OR cma.cliente_id IS DISTINCT FROM NEW.cliente_id
          OR cma.modalidade_atuacao_id IS DISTINCT FROM tpm.modalidade_atuacao_id
          OR m.id IS NULL
          OR m.ativo IS DISTINCT FROM true
          OR m.segmento_id IS DISTINCT FROM c.segmento_id
        )
    ) THEN
      RAISE EXCEPTION 'O planejamento possui modalidades de atuacao invalidas ou inativas. Ajuste as modalidades antes de aprovar.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_modalidades_antes_aprovar_planejamento()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validar_modalidades_antes_aprovar_planejamento
  ON public.trabalho_planejamento;

CREATE TRIGGER trg_validar_modalidades_antes_aprovar_planejamento
  BEFORE UPDATE OF status_planejamento ON public.trabalho_planejamento
  FOR EACH ROW EXECUTE FUNCTION public.validar_modalidades_antes_aprovar_planejamento();

-- -----------------------------------------------------------------------------
-- PASSO 8 - RLS, POLICIES E GRANTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.trabalho_planejamento_modalidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_trabalho_planejamento_modalidades
  ON public.trabalho_planejamento_modalidades;
DROP POLICY IF EXISTS insert_trabalho_planejamento_modalidades
  ON public.trabalho_planejamento_modalidades;
DROP POLICY IF EXISTS update_trabalho_planejamento_modalidades
  ON public.trabalho_planejamento_modalidades;
DROP POLICY IF EXISTS delete_trabalho_planejamento_modalidades
  ON public.trabalho_planejamento_modalidades;

CREATE POLICY select_trabalho_planejamento_modalidades
  ON public.trabalho_planejamento_modalidades
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      NOT public.is_cliente_usuario()
      AND trabalho_auditoria_id IN (
        SELECT public.get_accessible_trabalho_ids()
      )
    )
  );

CREATE POLICY insert_trabalho_planejamento_modalidades
  ON public.trabalho_planejamento_modalidades
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_trabalho_planejamento_modalidades(trabalho_auditoria_id)
    AND EXISTS (
      SELECT 1
      FROM public.trabalho_planejamento tp
      WHERE tp.id = trabalho_planejamento_id
        AND tp.trabalho_auditoria_id = trabalho_auditoria_id
        AND tp.status_planejamento = 'rascunho'
    )
  );

CREATE POLICY update_trabalho_planejamento_modalidades
  ON public.trabalho_planejamento_modalidades
  FOR UPDATE TO authenticated
  USING (
    public.can_manage_trabalho_planejamento_modalidades(trabalho_auditoria_id)
    AND EXISTS (
      SELECT 1
      FROM public.trabalho_planejamento tp
      WHERE tp.id = trabalho_planejamento_id
        AND tp.trabalho_auditoria_id = trabalho_auditoria_id
        AND tp.status_planejamento = 'rascunho'
    )
  )
  WITH CHECK (
    public.can_manage_trabalho_planejamento_modalidades(trabalho_auditoria_id)
    AND EXISTS (
      SELECT 1
      FROM public.trabalho_planejamento tp
      WHERE tp.id = trabalho_planejamento_id
        AND tp.trabalho_auditoria_id = trabalho_auditoria_id
        AND tp.status_planejamento = 'rascunho'
    )
  );

CREATE POLICY delete_trabalho_planejamento_modalidades
  ON public.trabalho_planejamento_modalidades
  FOR DELETE TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.trabalho_planejamento_modalidades
  FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trabalho_planejamento_modalidades
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
--   AND table_name = 'trabalho_planejamento_modalidades';

-- 2) Colunas
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'trabalho_planejamento_modalidades'
-- ORDER BY ordinal_position;

-- 3) Constraints e FKs
-- SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS definition
-- FROM pg_constraint con
-- WHERE con.conrelid = 'public.trabalho_planejamento_modalidades'::regclass
-- ORDER BY con.conname;

-- 4) Indices
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'trabalho_planejamento_modalidades'
-- ORDER BY indexname;

-- 5) Triggers na nova tabela
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'trabalho_planejamento_modalidades'
-- ORDER BY trigger_name, event_manipulation;

-- 6) Trigger em trabalho_planejamento para validar aprovacao
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'trabalho_planejamento'
--   AND trigger_name = 'trg_validar_modalidades_antes_aprovar_planejamento';

-- 7) Funcoes criadas
-- SELECT n.nspname AS schema_name, p.proname, pg_get_function_arguments(p.oid) AS arguments
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'can_manage_trabalho_planejamento_modalidades',
--     'validar_trabalho_planejamento_modalidade',
--     'bloquear_delete_trabalho_planejamento_modalidade',
--     'validar_modalidades_antes_aprovar_planejamento'
--   )
-- ORDER BY p.proname;

-- 8) SECURITY DEFINER e search_path das funcoes
-- SELECT n.nspname AS schema_name, p.proname, p.prosecdef AS security_definer, p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'can_manage_trabalho_planejamento_modalidades',
--     'validar_trabalho_planejamento_modalidade',
--     'bloquear_delete_trabalho_planejamento_modalidade',
--     'validar_modalidades_antes_aprovar_planejamento'
--   )
-- ORDER BY p.proname;

-- 9) Grants/revokes das funcoes
-- SELECT routine_schema, routine_name, grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name IN (
--     'can_manage_trabalho_planejamento_modalidades',
--     'validar_trabalho_planejamento_modalidade',
--     'bloquear_delete_trabalho_planejamento_modalidade',
--     'validar_modalidades_antes_aprovar_planejamento'
--   )
-- ORDER BY routine_name, grantee, privilege_type;

-- 10) RLS habilitada
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename = 'trabalho_planejamento_modalidades';

-- 11) Policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'trabalho_planejamento_modalidades'
-- ORDER BY policyname;

-- 12) Grants da tabela
-- SELECT table_schema, table_name, grantee, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'public'
--   AND table_name = 'trabalho_planejamento_modalidades'
-- ORDER BY grantee, privilege_type;

-- 13) Existencia de funcoes dependentes
-- SELECT n.nspname AS schema_name, p.proname, pg_get_function_arguments(p.oid) AS arguments
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'is_admin',
--     'is_cliente_usuario',
--     'get_my_auditor_id',
--     'get_accessible_trabalho_ids'
--   )
-- ORDER BY p.proname;

-- 14) Modalidades ativas por planejamento
-- SELECT
--   tpm.trabalho_planejamento_id,
--   tpm.trabalho_auditoria_id,
--   tpm.cliente_id,
--   tpm.modalidade_codigo_snapshot,
--   tpm.modalidade_nome_snapshot,
--   tpm.segmento_codigo_snapshot,
--   tpm.segmento_nome_snapshot,
--   tpm.principal_cliente_snapshot,
--   tpm.ativo,
--   tpm.created_at
-- FROM public.trabalho_planejamento_modalidades tpm
-- WHERE tpm.ativo = true
-- ORDER BY tpm.trabalho_planejamento_id, tpm.modalidade_nome_snapshot;

-- =============================================================================
-- TESTE OPCIONAL APENAS EM STAGING - NAO EXECUTAR EM PRODUCAO
-- =============================================================================
-- Esta fase nao inclui testes de escrita no bloco normal de validacoes.
-- Caso seja necessario testar INSERT/UPDATE/DELETE, preparar um roteiro separado
-- em ambiente controlado com registros descartaveis.
