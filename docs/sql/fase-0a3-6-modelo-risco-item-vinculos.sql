-- =============================================================================
--  FASE 0A.3.6.1 - TABELA: public.modelo_matriz_risco_item_vinculos
-- =============================================================================
--  Objetivo: criar os vinculos entre itens/riscos padrao do modelo e regras
--  MCSE maduras existentes.
--
--  Esta fase NAO cria vinculos com procedimentos auxiliares, PTA, solicitacoes,
--  evidencias, riscos do trabalho ou importacao para public.trabalho_riscos_auditoria.
--
--  Pre-condicoes ja existentes no banco:
--    - public.modelos_matriz_riscos
--    - public.modelo_matriz_risco_itens
--    - public.mcse_regras_conta
--    - public.mcse_regras_documentos
--    - public.mcse_regras_instrucoes
--    - public.mcse_regras_emissao_erp
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
CREATE TABLE IF NOT EXISTS public.modelo_matriz_risco_item_vinculos (
  id                            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_matriz_risco_id        uuid        NOT NULL,
  modelo_matriz_risco_item_id   uuid        NOT NULL,
  tipo_vinculo                  text        NOT NULL,
  regra_conta_id                uuid,
  regra_documento_id            uuid,
  regra_instrucao_id            uuid,
  regra_emissao_erp_id          uuid,
  ordem                         integer     NOT NULL DEFAULT 0,
  obrigatorio                   boolean     NOT NULL DEFAULT false,
  ativo                         boolean     NOT NULL DEFAULT true,
  observacoes                   text,
  conta_mcse_id_snapshot        uuid,
  codigo_mcse_snapshot          text,
  descricao_mcse_snapshot       text,
  titulo_vinculo_snapshot       text,
  descricao_vinculo_snapshot    text,
  tipo_documento_snapshot       text,
  erp_nome_snapshot             text,
  modulo_erp_snapshot           text,
  caminho_emissao_snapshot      text,
  nome_relatorio_snapshot       text,
  criado_por                    uuid,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.modelo_matriz_risco_item_vinculos
  ADD COLUMN IF NOT EXISTS modelo_matriz_risco_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS modelo_matriz_risco_item_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS tipo_vinculo text NOT NULL,
  ADD COLUMN IF NOT EXISTS regra_conta_id uuid,
  ADD COLUMN IF NOT EXISTS regra_documento_id uuid,
  ADD COLUMN IF NOT EXISTS regra_instrucao_id uuid,
  ADD COLUMN IF NOT EXISTS regra_emissao_erp_id uuid,
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS obrigatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS conta_mcse_id_snapshot uuid,
  ADD COLUMN IF NOT EXISTS codigo_mcse_snapshot text,
  ADD COLUMN IF NOT EXISTS descricao_mcse_snapshot text,
  ADD COLUMN IF NOT EXISTS titulo_vinculo_snapshot text,
  ADD COLUMN IF NOT EXISTS descricao_vinculo_snapshot text,
  ADD COLUMN IF NOT EXISTS tipo_documento_snapshot text,
  ADD COLUMN IF NOT EXISTS erp_nome_snapshot text,
  ADD COLUMN IF NOT EXISTS modulo_erp_snapshot text,
  ADD COLUMN IF NOT EXISTS caminho_emissao_snapshot text,
  ADD COLUMN IF NOT EXISTS nome_relatorio_snapshot text,
  ADD COLUMN IF NOT EXISTS criado_por uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON TABLE public.modelo_matriz_risco_item_vinculos IS
  'Vinculos metodologicos entre itens de modelo de matriz de riscos e regras MCSE maduras.';

COMMENT ON COLUMN public.modelo_matriz_risco_item_vinculos.tipo_vinculo IS
  'Tipo de artefato MCSE vinculado: regra_conta, documento, instrucao ou emissao_erp.';

COMMENT ON COLUMN public.modelo_matriz_risco_item_vinculos.ativo IS
  'Controle de inativacao logica. DELETE fisico e bloqueado por trigger.';

COMMENT ON COLUMN public.modelo_matriz_risco_item_vinculos.conta_mcse_id_snapshot IS
  'Snapshot da conta MCSE associada ao vinculo no momento da criacao/atualizacao.';

-- -----------------------------------------------------------------------------
-- PASSO 2 - FOREIGN KEYS E CONSTRAINTS
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmrv_modelo'
      AND conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_item_vinculos
      ADD CONSTRAINT fk_mmrv_modelo
      FOREIGN KEY (modelo_matriz_risco_id)
      REFERENCES public.modelos_matriz_riscos(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmrv_item'
      AND conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_item_vinculos
      ADD CONSTRAINT fk_mmrv_item
      FOREIGN KEY (modelo_matriz_risco_item_id)
      REFERENCES public.modelo_matriz_risco_itens(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmrv_regra_conta'
      AND conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_item_vinculos
      ADD CONSTRAINT fk_mmrv_regra_conta
      FOREIGN KEY (regra_conta_id)
      REFERENCES public.mcse_regras_conta(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmrv_regra_documento'
      AND conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_item_vinculos
      ADD CONSTRAINT fk_mmrv_regra_documento
      FOREIGN KEY (regra_documento_id)
      REFERENCES public.mcse_regras_documentos(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmrv_regra_instrucao'
      AND conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_item_vinculos
      ADD CONSTRAINT fk_mmrv_regra_instrucao
      FOREIGN KEY (regra_instrucao_id)
      REFERENCES public.mcse_regras_instrucoes(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmrv_regra_emissao_erp'
      AND conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_item_vinculos
      ADD CONSTRAINT fk_mmrv_regra_emissao_erp
      FOREIGN KEY (regra_emissao_erp_id)
      REFERENCES public.mcse_regras_emissao_erp(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmrv_criado_por'
      AND conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_item_vinculos
      ADD CONSTRAINT fk_mmrv_criado_por
      FOREIGN KEY (criado_por)
      REFERENCES public.auditores(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmrv_tipo_vinculo'
      AND conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_item_vinculos
      ADD CONSTRAINT chk_mmrv_tipo_vinculo
      CHECK (tipo_vinculo IN ('regra_conta', 'documento', 'instrucao', 'emissao_erp'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmrv_tipo_vinculo_alvo_unico'
      AND conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_item_vinculos
      ADD CONSTRAINT chk_mmrv_tipo_vinculo_alvo_unico
      CHECK (
        (
          tipo_vinculo = 'regra_conta'
          AND regra_conta_id IS NOT NULL
          AND regra_documento_id IS NULL
          AND regra_instrucao_id IS NULL
          AND regra_emissao_erp_id IS NULL
        )
        OR (
          tipo_vinculo = 'documento'
          AND regra_conta_id IS NULL
          AND regra_documento_id IS NOT NULL
          AND regra_instrucao_id IS NULL
          AND regra_emissao_erp_id IS NULL
        )
        OR (
          tipo_vinculo = 'instrucao'
          AND regra_conta_id IS NULL
          AND regra_documento_id IS NULL
          AND regra_instrucao_id IS NOT NULL
          AND regra_emissao_erp_id IS NULL
        )
        OR (
          tipo_vinculo = 'emissao_erp'
          AND regra_conta_id IS NULL
          AND regra_documento_id IS NULL
          AND regra_instrucao_id IS NULL
          AND regra_emissao_erp_id IS NOT NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmrv_ordem_nao_negativa'
      AND conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
  ) THEN
    ALTER TABLE public.modelo_matriz_risco_item_vinculos
      ADD CONSTRAINT chk_mmrv_ordem_nao_negativa
      CHECK (ordem >= 0);
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- PASSO 3 - INDICES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mmrv_modelo
  ON public.modelo_matriz_risco_item_vinculos (modelo_matriz_risco_id);

CREATE INDEX IF NOT EXISTS idx_mmrv_item
  ON public.modelo_matriz_risco_item_vinculos (modelo_matriz_risco_item_id);

CREATE INDEX IF NOT EXISTS idx_mmrv_tipo
  ON public.modelo_matriz_risco_item_vinculos (tipo_vinculo);

CREATE INDEX IF NOT EXISTS idx_mmrv_ativo
  ON public.modelo_matriz_risco_item_vinculos (ativo);

CREATE INDEX IF NOT EXISTS idx_mmrv_obrigatorio
  ON public.modelo_matriz_risco_item_vinculos (obrigatorio);

CREATE INDEX IF NOT EXISTS idx_mmrv_regra_conta
  ON public.modelo_matriz_risco_item_vinculos (regra_conta_id);

CREATE INDEX IF NOT EXISTS idx_mmrv_regra_documento
  ON public.modelo_matriz_risco_item_vinculos (regra_documento_id);

CREATE INDEX IF NOT EXISTS idx_mmrv_regra_instrucao
  ON public.modelo_matriz_risco_item_vinculos (regra_instrucao_id);

CREATE INDEX IF NOT EXISTS idx_mmrv_regra_emissao_erp
  ON public.modelo_matriz_risco_item_vinculos (regra_emissao_erp_id);

CREATE INDEX IF NOT EXISTS idx_mmrv_item_ativo_ordem
  ON public.modelo_matriz_risco_item_vinculos (modelo_matriz_risco_item_id, ativo, ordem);

CREATE INDEX IF NOT EXISTS idx_mmrv_modelo_tipo_ativo
  ON public.modelo_matriz_risco_item_vinculos (modelo_matriz_risco_id, tipo_vinculo, ativo);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mmrv_item_regra_conta
  ON public.modelo_matriz_risco_item_vinculos (modelo_matriz_risco_item_id, regra_conta_id)
  WHERE regra_conta_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mmrv_item_regra_documento
  ON public.modelo_matriz_risco_item_vinculos (modelo_matriz_risco_item_id, regra_documento_id)
  WHERE regra_documento_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mmrv_item_regra_instrucao
  ON public.modelo_matriz_risco_item_vinculos (modelo_matriz_risco_item_id, regra_instrucao_id)
  WHERE regra_instrucao_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mmrv_item_regra_emissao_erp
  ON public.modelo_matriz_risco_item_vinculos (modelo_matriz_risco_item_id, regra_emissao_erp_id)
  WHERE regra_emissao_erp_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- PASSO 4 - TRIGGER updated_at
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_upd_modelo_matriz_risco_item_vinculos
  ON public.modelo_matriz_risco_item_vinculos;

CREATE TRIGGER trg_upd_modelo_matriz_risco_item_vinculos
  BEFORE UPDATE ON public.modelo_matriz_risco_item_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- PASSO 5 - VALIDACAO DO VINCULO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_modelo_risco_item_vinculo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item_modelo_id uuid;
  v_item_ativo boolean;
  v_status_modelo text;
  v_alvo_ativo boolean;
  v_regra_pai_ativa boolean;
  v_conta_mcse_id uuid;
  v_codigo_mcse text;
  v_descricao_mcse text;
  v_titulo text;
  v_descricao text;
  v_tipo_documento text;
  v_erp_nome text;
  v_modulo_erp text;
  v_caminho_emissao text;
  v_nome_relatorio text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       NEW.modelo_matriz_risco_id IS DISTINCT FROM OLD.modelo_matriz_risco_id
       OR NEW.modelo_matriz_risco_item_id IS DISTINCT FROM OLD.modelo_matriz_risco_item_id
       OR NEW.tipo_vinculo IS DISTINCT FROM OLD.tipo_vinculo
       OR NEW.regra_conta_id IS DISTINCT FROM OLD.regra_conta_id
       OR NEW.regra_documento_id IS DISTINCT FROM OLD.regra_documento_id
       OR NEW.regra_instrucao_id IS DISTINCT FROM OLD.regra_instrucao_id
       OR NEW.regra_emissao_erp_id IS DISTINCT FROM OLD.regra_emissao_erp_id
     ) THEN
    RAISE EXCEPTION 'Nao e permitido alterar a identidade do vinculo. Inative o vinculo anterior e crie ou reative o vinculo correto.';
  END IF;

  SELECT
    i.modelo_matriz_risco_id,
    i.ativo,
    m.status_modelo
  INTO
    v_item_modelo_id,
    v_item_ativo,
    v_status_modelo
  FROM public.modelo_matriz_risco_itens i
  JOIN public.modelos_matriz_riscos m
    ON m.id = i.modelo_matriz_risco_id
  WHERE i.id = NEW.modelo_matriz_risco_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item do modelo de matriz de riscos nao localizado.';
  END IF;

  IF NEW.modelo_matriz_risco_id IS NULL THEN
    NEW.modelo_matriz_risco_id := v_item_modelo_id;
  ELSIF NEW.modelo_matriz_risco_id IS DISTINCT FROM v_item_modelo_id THEN
    RAISE EXCEPTION 'O modelo informado no vinculo nao corresponde ao modelo do item.';
  END IF;

  IF v_status_modelo <> 'rascunho' THEN
    RAISE EXCEPTION 'Vinculos dos riscos do modelo so podem ser alterados enquanto o modelo estiver em rascunho.';
  END IF;

  IF NOT public.can_manage_modelos_matriz_riscos() THEN
    RAISE EXCEPTION 'Usuario sem permissao para criar ou editar vinculos dos riscos do modelo.';
  END IF;

  IF NEW.ativo = true AND v_item_ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Nao e permitido manter vinculo ativo para item de modelo inativo.';
  END IF;

  IF NEW.tipo_vinculo = 'regra_conta' THEN
    SELECT
      r.ativo,
      r.conta_mcse_id,
      r.codigo_mcse,
      r.descricao_mcse,
      r.codigo_mcse,
      r.observacao_regra,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::boolean
    INTO
      v_alvo_ativo,
      v_conta_mcse_id,
      v_codigo_mcse,
      v_descricao_mcse,
      v_titulo,
      v_descricao,
      v_tipo_documento,
      v_erp_nome,
      v_modulo_erp,
      v_caminho_emissao,
      v_regra_pai_ativa
    FROM public.mcse_regras_conta r
    WHERE r.id = NEW.regra_conta_id;

    v_nome_relatorio := NULL;

  ELSIF NEW.tipo_vinculo = 'documento' THEN
    SELECT
      d.ativo,
      d.conta_mcse_id,
      d.codigo_mcse,
      d.descricao_mcse,
      d.tipo_documento,
      d.descricao_documento,
      d.tipo_documento,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      r.ativo
    INTO
      v_alvo_ativo,
      v_conta_mcse_id,
      v_codigo_mcse,
      v_descricao_mcse,
      v_titulo,
      v_descricao,
      v_tipo_documento,
      v_erp_nome,
      v_modulo_erp,
      v_caminho_emissao,
      v_nome_relatorio,
      v_regra_pai_ativa
    FROM public.mcse_regras_documentos d
    LEFT JOIN public.mcse_regras_conta r
      ON r.id = d.regra_mcse_id
    WHERE d.id = NEW.regra_documento_id;

  ELSIF NEW.tipo_vinculo = 'instrucao' THEN
    SELECT
      i.ativo,
      i.conta_mcse_id,
      i.codigo_mcse,
      i.descricao_mcse,
      i.titulo_instrucao,
      i.texto_instrucao,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      r.ativo
    INTO
      v_alvo_ativo,
      v_conta_mcse_id,
      v_codigo_mcse,
      v_descricao_mcse,
      v_titulo,
      v_descricao,
      v_tipo_documento,
      v_erp_nome,
      v_modulo_erp,
      v_caminho_emissao,
      v_nome_relatorio,
      v_regra_pai_ativa
    FROM public.mcse_regras_instrucoes i
    LEFT JOIN public.mcse_regras_conta r
      ON r.id = i.regra_mcse_id
    WHERE i.id = NEW.regra_instrucao_id;

  ELSIF NEW.tipo_vinculo = 'emissao_erp' THEN
    SELECT
      e.ativo,
      e.conta_mcse_id,
      e.codigo_mcse,
      e.descricao_mcse,
      e.nome_relatorio,
      e.caminho_emissao,
      NULL::text,
      e.erp_nome,
      e.modulo_erp,
      e.caminho_emissao,
      e.nome_relatorio,
      r.ativo
    INTO
      v_alvo_ativo,
      v_conta_mcse_id,
      v_codigo_mcse,
      v_descricao_mcse,
      v_titulo,
      v_descricao,
      v_tipo_documento,
      v_erp_nome,
      v_modulo_erp,
      v_caminho_emissao,
      v_nome_relatorio,
      v_regra_pai_ativa
    FROM public.mcse_regras_emissao_erp e
    LEFT JOIN public.mcse_regras_conta r
      ON r.id = e.regra_mcse_id
    WHERE e.id = NEW.regra_emissao_erp_id;
  ELSE
    RAISE EXCEPTION 'Tipo de vinculo invalido.';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Artefato MCSE vinculado nao localizado.';
  END IF;

  IF NEW.ativo = true
     AND (
       v_alvo_ativo IS DISTINCT FROM true
       OR COALESCE(v_regra_pai_ativa, true) IS DISTINCT FROM true
     ) THEN
    RAISE EXCEPTION 'O artefato MCSE vinculado esta inativo e nao pode permanecer em vinculo ativo.';
  END IF;

  NEW.conta_mcse_id_snapshot := v_conta_mcse_id;
  NEW.codigo_mcse_snapshot := v_codigo_mcse;
  NEW.descricao_mcse_snapshot := v_descricao_mcse;
  NEW.titulo_vinculo_snapshot := v_titulo;
  NEW.descricao_vinculo_snapshot := v_descricao;
  NEW.tipo_documento_snapshot := v_tipo_documento;
  NEW.erp_nome_snapshot := v_erp_nome;
  NEW.modulo_erp_snapshot := v_modulo_erp;
  NEW.caminho_emissao_snapshot := v_caminho_emissao;
  NEW.nome_relatorio_snapshot := v_nome_relatorio;

  IF TG_OP = 'INSERT' AND NEW.criado_por IS NULL THEN
    NEW.criado_por := public.get_my_auditor_id();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_modelo_risco_item_vinculo()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validar_modelo_risco_item_vinculo
  ON public.modelo_matriz_risco_item_vinculos;

CREATE TRIGGER trg_validar_modelo_risco_item_vinculo
  BEFORE INSERT OR UPDATE ON public.modelo_matriz_risco_item_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.validar_modelo_risco_item_vinculo();

-- -----------------------------------------------------------------------------
-- PASSO 6 - BLOQUEIO DE DELETE FISICO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bloquear_delete_modelo_risco_item_vinculo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Nao e permitido excluir fisicamente um vinculo do risco do modelo. Utilize inativacao logica.';
END;
$$;

REVOKE ALL ON FUNCTION public.bloquear_delete_modelo_risco_item_vinculo()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bloquear_delete_modelo_risco_item_vinculo
  ON public.modelo_matriz_risco_item_vinculos;

CREATE TRIGGER trg_bloquear_delete_modelo_risco_item_vinculo
  BEFORE DELETE ON public.modelo_matriz_risco_item_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_delete_modelo_risco_item_vinculo();

-- -----------------------------------------------------------------------------
-- PASSO 7 - RLS, POLICIES E GRANTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.modelo_matriz_risco_item_vinculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_modelo_matriz_risco_item_vinculos
  ON public.modelo_matriz_risco_item_vinculos;
DROP POLICY IF EXISTS insert_modelo_matriz_risco_item_vinculos
  ON public.modelo_matriz_risco_item_vinculos;
DROP POLICY IF EXISTS update_modelo_matriz_risco_item_vinculos
  ON public.modelo_matriz_risco_item_vinculos;
DROP POLICY IF EXISTS delete_modelo_matriz_risco_item_vinculos
  ON public.modelo_matriz_risco_item_vinculos;

CREATE POLICY select_modelo_matriz_risco_item_vinculos
  ON public.modelo_matriz_risco_item_vinculos
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.get_my_auditor_id() IS NOT NULL
      AND NOT public.is_cliente_usuario()
    )
  );

CREATE POLICY insert_modelo_matriz_risco_item_vinculos
  ON public.modelo_matriz_risco_item_vinculos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_modelos_matriz_riscos());

CREATE POLICY update_modelo_matriz_risco_item_vinculos
  ON public.modelo_matriz_risco_item_vinculos
  FOR UPDATE TO authenticated
  USING (public.can_manage_modelos_matriz_riscos())
  WITH CHECK (public.can_manage_modelos_matriz_riscos());

CREATE POLICY delete_modelo_matriz_risco_item_vinculos
  ON public.modelo_matriz_risco_item_vinculos
  FOR DELETE TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.modelo_matriz_risco_item_vinculos
  FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modelo_matriz_risco_item_vinculos
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
--   AND table_name = 'modelo_matriz_risco_item_vinculos';

-- 2) Colunas
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'modelo_matriz_risco_item_vinculos'
-- ORDER BY ordinal_position;

-- 3) Constraints e FKs
-- SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS definition
-- FROM pg_constraint con
-- WHERE con.conrelid = 'public.modelo_matriz_risco_item_vinculos'::regclass
-- ORDER BY con.conname;

-- 4) Indices
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'modelo_matriz_risco_item_vinculos'
-- ORDER BY indexname;

-- 5) Trigger updated_at
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'modelo_matriz_risco_item_vinculos'
--   AND trigger_name = 'trg_upd_modelo_matriz_risco_item_vinculos';

-- 6) Trigger de validacao
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'modelo_matriz_risco_item_vinculos'
--   AND trigger_name = 'trg_validar_modelo_risco_item_vinculo';

-- 7) Trigger de bloqueio de delete
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'modelo_matriz_risco_item_vinculos'
--   AND trigger_name = 'trg_bloquear_delete_modelo_risco_item_vinculo';

-- 8) Funcoes criadas
-- SELECT n.nspname AS schema_name, p.proname, pg_get_function_arguments(p.oid) AS arguments
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'validar_modelo_risco_item_vinculo',
--     'bloquear_delete_modelo_risco_item_vinculo'
--   )
-- ORDER BY p.proname;

-- 9) SECURITY DEFINER e search_path das funcoes
-- SELECT n.nspname AS schema_name, p.proname, p.prosecdef AS security_definer, p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'validar_modelo_risco_item_vinculo',
--     'bloquear_delete_modelo_risco_item_vinculo'
--   )
-- ORDER BY p.proname;

-- 10) Grants/revokes das funcoes
-- SELECT routine_schema, routine_name, grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name IN (
--     'validar_modelo_risco_item_vinculo',
--     'bloquear_delete_modelo_risco_item_vinculo'
--   )
-- ORDER BY routine_name, grantee, privilege_type;

-- 11) RLS habilitada
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename = 'modelo_matriz_risco_item_vinculos';

-- 12) Policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'modelo_matriz_risco_item_vinculos'
-- ORDER BY policyname;

-- 13) Grants da tabela
-- SELECT table_schema, table_name, grantee, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'public'
--   AND table_name = 'modelo_matriz_risco_item_vinculos'
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

-- 15) Vinculos por item de modelo
-- SELECT
--   v.id,
--   v.modelo_matriz_risco_id,
--   v.modelo_matriz_risco_item_id,
--   i.codigo_item_modelo,
--   i.risco_identificado,
--   v.tipo_vinculo,
--   v.ordem,
--   v.obrigatorio,
--   v.ativo,
--   v.codigo_mcse_snapshot,
--   v.descricao_mcse_snapshot,
--   v.titulo_vinculo_snapshot,
--   v.descricao_vinculo_snapshot
-- FROM public.modelo_matriz_risco_item_vinculos v
-- JOIN public.modelo_matriz_risco_itens i ON i.id = v.modelo_matriz_risco_item_id
-- ORDER BY i.codigo_item_modelo, i.risco_identificado, v.ordem, v.tipo_vinculo;

-- 16) Vinculos por tipo_vinculo
-- SELECT
--   tipo_vinculo,
--   ativo,
--   count(*) AS quantidade
-- FROM public.modelo_matriz_risco_item_vinculos
-- GROUP BY tipo_vinculo, ativo
-- ORDER BY tipo_vinculo, ativo DESC;

-- 17) Regras MCSE maduras disponiveis para vinculo
-- SELECT 'regra_conta' AS tipo_vinculo, count(*) AS quantidade
-- FROM public.mcse_regras_conta
-- UNION ALL
-- SELECT 'documento', count(*)
-- FROM public.mcse_regras_documentos
-- UNION ALL
-- SELECT 'instrucao', count(*)
-- FROM public.mcse_regras_instrucoes
-- UNION ALL
-- SELECT 'emissao_erp', count(*)
-- FROM public.mcse_regras_emissao_erp;
