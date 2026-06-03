-- =============================================================================
--  FASE 0A.3.4.1 - TABELA: public.modelos_matriz_riscos
-- =============================================================================
--  Objetivo: criar o cabecalho dos modelos padrao de matriz de riscos por
--  Segmento + Modalidade de Atuacao + Produto de Auditoria.
--
--  Esta fase NAO cria itens/riscos do modelo, vinculos com regras ou
--  procedimentos, nem importa riscos para trabalhos.
--
--  Pre-condicoes ja existentes no banco:
--    - public.segmentos
--    - public.modalidades_atuacao
--    - public.produtos_auditoria
--    - public.estruturas_auditoria
--    - public.auditores
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
CREATE TABLE IF NOT EXISTS public.modelos_matriz_riscos (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  segmento_id                 uuid        NOT NULL,
  modalidade_atuacao_id       uuid        NOT NULL,
  produto_auditoria_id        uuid        NOT NULL,
  estrutura_auditoria_id      uuid,

  codigo_modelo               text        NOT NULL,
  nome_modelo                 text        NOT NULL,
  descricao                   text,
  objetivo_modelo             text,
  escopo_padrao               text,

  versao                      text        NOT NULL DEFAULT '1.0',
  status_modelo               text        NOT NULL DEFAULT 'rascunho',
  vigente                     boolean     NOT NULL DEFAULT false,
  ativo                       boolean     NOT NULL DEFAULT true,

  observacoes                 text,

  criado_por                  uuid,
  publicado_por               uuid,
  data_publicacao             timestamptz,
  substituido_por_modelo_id   uuid,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Colunas mantidas idempotentes para ambientes parcialmente criados.
ALTER TABLE public.modelos_matriz_riscos
  ADD COLUMN IF NOT EXISTS segmento_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS modalidade_atuacao_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS produto_auditoria_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS estrutura_auditoria_id uuid,
  ADD COLUMN IF NOT EXISTS codigo_modelo text NOT NULL,
  ADD COLUMN IF NOT EXISTS nome_modelo text NOT NULL,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS objetivo_modelo text,
  ADD COLUMN IF NOT EXISTS escopo_padrao text,
  ADD COLUMN IF NOT EXISTS versao text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS status_modelo text NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS vigente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS criado_por uuid,
  ADD COLUMN IF NOT EXISTS publicado_por uuid,
  ADD COLUMN IF NOT EXISTS data_publicacao timestamptz,
  ADD COLUMN IF NOT EXISTS substituido_por_modelo_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON TABLE public.modelos_matriz_riscos IS
  'Cabecalho dos modelos padrao de matriz de riscos por segmento, modalidade de atuacao e produto de auditoria.';

COMMENT ON COLUMN public.modelos_matriz_riscos.vigente IS
  'Indica o modelo publicado vigente para a combinacao segmento + modalidade + produto.';

COMMENT ON COLUMN public.modelos_matriz_riscos.substituido_por_modelo_id IS
  'Referencia opcional ao modelo que substituiu este modelo.';

-- -----------------------------------------------------------------------------
-- PASSO 2 - FOREIGN KEYS E CONSTRAINTS
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmr_segmento'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT fk_mmr_segmento
      FOREIGN KEY (segmento_id)
      REFERENCES public.segmentos(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmr_modalidade'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT fk_mmr_modalidade
      FOREIGN KEY (modalidade_atuacao_id)
      REFERENCES public.modalidades_atuacao(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmr_produto'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT fk_mmr_produto
      FOREIGN KEY (produto_auditoria_id)
      REFERENCES public.produtos_auditoria(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmr_estrutura'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT fk_mmr_estrutura
      FOREIGN KEY (estrutura_auditoria_id)
      REFERENCES public.estruturas_auditoria(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmr_criado_por'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT fk_mmr_criado_por
      FOREIGN KEY (criado_por)
      REFERENCES public.auditores(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmr_publicado_por'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT fk_mmr_publicado_por
      FOREIGN KEY (publicado_por)
      REFERENCES public.auditores(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_mmr_substituido_por_modelo'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT fk_mmr_substituido_por_modelo
      FOREIGN KEY (substituido_por_modelo_id)
      REFERENCES public.modelos_matriz_riscos(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmr_codigo_preenchido'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT chk_mmr_codigo_preenchido
      CHECK (length(btrim(codigo_modelo)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmr_nome_preenchido'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT chk_mmr_nome_preenchido
      CHECK (length(btrim(nome_modelo)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmr_versao_preenchida'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT chk_mmr_versao_preenchida
      CHECK (length(btrim(versao)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmr_status'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT chk_mmr_status
      CHECK (status_modelo IN ('rascunho', 'publicado', 'substituido', 'arquivado'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmr_vigente_requer_publicado_ativo'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT chk_mmr_vigente_requer_publicado_ativo
      CHECK (vigente = false OR (status_modelo = 'publicado' AND ativo = true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mmr_publicacao_completa'
      AND conrelid = 'public.modelos_matriz_riscos'::regclass
  ) THEN
    ALTER TABLE public.modelos_matriz_riscos
      ADD CONSTRAINT chk_mmr_publicacao_completa
      CHECK (
        status_modelo <> 'publicado'
        OR (data_publicacao IS NOT NULL AND publicado_por IS NOT NULL)
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mmr_codigo_versao
  ON public.modelos_matriz_riscos (codigo_modelo, versao);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mmr_vigente_por_combinacao
  ON public.modelos_matriz_riscos (
    segmento_id,
    modalidade_atuacao_id,
    produto_auditoria_id
  )
  WHERE status_modelo = 'publicado'
    AND vigente = true
    AND ativo = true;

CREATE INDEX IF NOT EXISTS idx_mmr_segmento
  ON public.modelos_matriz_riscos (segmento_id);

CREATE INDEX IF NOT EXISTS idx_mmr_modalidade
  ON public.modelos_matriz_riscos (modalidade_atuacao_id);

CREATE INDEX IF NOT EXISTS idx_mmr_produto
  ON public.modelos_matriz_riscos (produto_auditoria_id);

CREATE INDEX IF NOT EXISTS idx_mmr_estrutura
  ON public.modelos_matriz_riscos (estrutura_auditoria_id);

CREATE INDEX IF NOT EXISTS idx_mmr_status
  ON public.modelos_matriz_riscos (status_modelo);

CREATE INDEX IF NOT EXISTS idx_mmr_vigente
  ON public.modelos_matriz_riscos (vigente);

CREATE INDEX IF NOT EXISTS idx_mmr_ativo
  ON public.modelos_matriz_riscos (ativo);

CREATE INDEX IF NOT EXISTS idx_mmr_combinacao_principal
  ON public.modelos_matriz_riscos (
    segmento_id,
    modalidade_atuacao_id,
    produto_auditoria_id
  );

CREATE INDEX IF NOT EXISTS idx_mmr_status_vigente_ativo
  ON public.modelos_matriz_riscos (status_modelo, vigente, ativo);

CREATE INDEX IF NOT EXISTS idx_mmr_codigo_normalizado
  ON public.modelos_matriz_riscos (lower(btrim(codigo_modelo)));

-- -----------------------------------------------------------------------------
-- PASSO 3 - TRIGGER updated_at
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_upd_modelos_matriz_riscos
  ON public.modelos_matriz_riscos;

CREATE TRIGGER trg_upd_modelos_matriz_riscos
  BEFORE UPDATE ON public.modelos_matriz_riscos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- PASSO 4 - FUNCOES DE PERMISSAO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_modelos_matriz_riscos()
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

  RETURN v_perfil_acesso IN ('socio', 'gerente');
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_modelos_matriz_riscos()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_modelos_matriz_riscos()
  TO authenticated;

CREATE OR REPLACE FUNCTION public.can_publish_modelos_matriz_riscos()
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

  RETURN v_perfil_acesso = 'socio';
END;
$$;

REVOKE ALL ON FUNCTION public.can_publish_modelos_matriz_riscos()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_publish_modelos_matriz_riscos()
  TO authenticated;

-- -----------------------------------------------------------------------------
-- PASSO 5 - FUNCAO/TRIGGER DE COERENCIA DO MODELO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_modelo_matriz_riscos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auditor_id uuid;
  v_modalidade_segmento_id uuid;
  v_modalidade_ativa boolean;
  v_produto_ativo boolean;
  v_produto_segmento_id uuid;
  v_estrutura_segmento_id uuid;
  v_estrutura_ativa boolean;
  v_produto_tem_segmento boolean;
  v_campos_metodologicos_alterados boolean := false;
  v_status_alterado boolean := false;
  v_controle_publicacao_alterado boolean := false;
BEGIN
  v_auditor_id := public.get_my_auditor_id();

  SELECT m.segmento_id, m.ativo
    INTO v_modalidade_segmento_id, v_modalidade_ativa
  FROM public.modalidades_atuacao m
  WHERE m.id = NEW.modalidade_atuacao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modalidade de atuacao nao localizada.';
  END IF;

  IF v_modalidade_segmento_id IS DISTINCT FROM NEW.segmento_id THEN
    RAISE EXCEPTION 'A modalidade de atuacao nao pertence ao segmento informado para o modelo.';
  END IF;

  IF v_modalidade_ativa IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'A modalidade de atuacao esta inativa e nao pode ser usada no modelo.';
  END IF;

  SELECT p.ativo
    INTO v_produto_ativo
  FROM public.produtos_auditoria p
  WHERE p.id = NEW.produto_auditoria_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto de auditoria nao localizado.';
  END IF;

  IF v_produto_ativo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'O produto de auditoria esta inativo e nao pode ser usado no modelo.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'produtos_auditoria'
      AND c.column_name = 'segmento_id'
  ) INTO v_produto_tem_segmento;

  IF v_produto_tem_segmento THEN
    EXECUTE
      'SELECT p.segmento_id FROM public.produtos_auditoria p WHERE p.id = $1'
      INTO v_produto_segmento_id
      USING NEW.produto_auditoria_id;

    IF v_produto_segmento_id IS DISTINCT FROM NEW.segmento_id THEN
      RAISE EXCEPTION 'O produto de auditoria nao pertence ao segmento informado para o modelo.';
    END IF;
  END IF;

  IF NEW.estrutura_auditoria_id IS NOT NULL THEN
    SELECT e.segmento_id, e.ativo
      INTO v_estrutura_segmento_id, v_estrutura_ativa
    FROM public.estruturas_auditoria e
    WHERE e.id = NEW.estrutura_auditoria_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Estrutura de auditoria nao localizada.';
    END IF;

    IF v_estrutura_segmento_id IS DISTINCT FROM NEW.segmento_id THEN
      RAISE EXCEPTION 'A estrutura de auditoria nao pertence ao segmento informado para o modelo.';
    END IF;

    IF v_estrutura_ativa IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'A estrutura de auditoria esta inativa e nao pode ser usada no modelo.';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.criado_por IS NULL THEN
      NEW.criado_por := v_auditor_id;
    END IF;

    IF NEW.status_modelo = 'rascunho' THEN
      IF NOT public.can_manage_modelos_matriz_riscos() THEN
        RAISE EXCEPTION 'Usuario sem permissao para criar modelos de matriz de riscos em rascunho.';
      END IF;
    ELSE
      IF NOT public.can_publish_modelos_matriz_riscos() THEN
        RAISE EXCEPTION 'Usuario sem permissao para criar modelos diretamente em status diferente de rascunho.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_campos_metodologicos_alterados :=
      NEW.segmento_id IS DISTINCT FROM OLD.segmento_id
      OR NEW.modalidade_atuacao_id IS DISTINCT FROM OLD.modalidade_atuacao_id
      OR NEW.produto_auditoria_id IS DISTINCT FROM OLD.produto_auditoria_id
      OR NEW.estrutura_auditoria_id IS DISTINCT FROM OLD.estrutura_auditoria_id
      OR NEW.codigo_modelo IS DISTINCT FROM OLD.codigo_modelo
      OR NEW.versao IS DISTINCT FROM OLD.versao
      OR NEW.nome_modelo IS DISTINCT FROM OLD.nome_modelo
      OR NEW.descricao IS DISTINCT FROM OLD.descricao
      OR NEW.objetivo_modelo IS DISTINCT FROM OLD.objetivo_modelo
      OR NEW.escopo_padrao IS DISTINCT FROM OLD.escopo_padrao;

    v_status_alterado := NEW.status_modelo IS DISTINCT FROM OLD.status_modelo;

    v_controle_publicacao_alterado :=
      v_status_alterado
      OR NEW.vigente IS DISTINCT FROM OLD.vigente
      OR NEW.ativo IS DISTINCT FROM OLD.ativo
      OR NEW.publicado_por IS DISTINCT FROM OLD.publicado_por
      OR NEW.data_publicacao IS DISTINCT FROM OLD.data_publicacao
      OR NEW.substituido_por_modelo_id IS DISTINCT FROM OLD.substituido_por_modelo_id;

    IF OLD.status_modelo IN ('publicado', 'substituido', 'arquivado')
       AND v_campos_metodologicos_alterados THEN
      RAISE EXCEPTION 'Modelos publicados, substituidos ou arquivados nao permitem edicao livre de campos metodologicos.';
    END IF;

    IF OLD.status_modelo = 'rascunho'
       AND NEW.status_modelo = 'rascunho'
       AND NOT public.can_manage_modelos_matriz_riscos() THEN
      RAISE EXCEPTION 'Usuario sem permissao para editar modelos de matriz de riscos em rascunho.';
    END IF;

    IF v_controle_publicacao_alterado
       AND NOT public.can_publish_modelos_matriz_riscos() THEN
      RAISE EXCEPTION 'Usuario sem permissao para publicar, arquivar ou substituir modelos de matriz de riscos.';
    END IF;
  END IF;

  IF NEW.status_modelo = 'publicado' THEN
    IF TG_OP = 'INSERT'
       OR (TG_OP = 'UPDATE' AND OLD.status_modelo IS DISTINCT FROM 'publicado') THEN
      IF NOT public.can_publish_modelos_matriz_riscos() THEN
        RAISE EXCEPTION 'Usuario sem permissao para publicar modelos de matriz de riscos.';
      END IF;
    END IF;

    IF NEW.ativo IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Modelo publicado deve permanecer ativo.';
    END IF;

    IF NEW.publicado_por IS NULL THEN
      NEW.publicado_por := v_auditor_id;
    END IF;

    IF NEW.data_publicacao IS NULL THEN
      NEW.data_publicacao := now();
    END IF;
  END IF;

  IF NEW.status_modelo IN ('arquivado', 'substituido') THEN
    IF TG_OP = 'INSERT'
       OR (TG_OP = 'UPDATE' AND OLD.status_modelo IS DISTINCT FROM NEW.status_modelo) THEN
      IF NOT public.can_publish_modelos_matriz_riscos() THEN
        RAISE EXCEPTION 'Usuario sem permissao para arquivar ou substituir modelos de matriz de riscos.';
      END IF;
    END IF;

    NEW.vigente := false;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_modelo_matriz_riscos()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validar_modelo_matriz_riscos
  ON public.modelos_matriz_riscos;

CREATE TRIGGER trg_validar_modelo_matriz_riscos
  BEFORE INSERT OR UPDATE ON public.modelos_matriz_riscos
  FOR EACH ROW EXECUTE FUNCTION public.validar_modelo_matriz_riscos();

-- -----------------------------------------------------------------------------
-- PASSO 6 - PUBLICACAO ATOMICA
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publicar_modelo_matriz_riscos(
  p_modelo_id uuid,
  p_vigente boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_modelo public.modelos_matriz_riscos%ROWTYPE;
  v_auditor_id uuid;
BEGIN
  IF NOT public.can_publish_modelos_matriz_riscos() THEN
    RAISE EXCEPTION 'Usuario sem permissao para publicar modelos de matriz de riscos.';
  END IF;

  v_auditor_id := public.get_my_auditor_id();

  SELECT *
    INTO v_modelo
  FROM public.modelos_matriz_riscos mmr
  WHERE mmr.id = p_modelo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modelo de matriz de riscos nao localizado.';
  END IF;

  IF v_modelo.status_modelo <> 'rascunho' THEN
    RAISE EXCEPTION 'Somente modelos em rascunho podem ser publicados.';
  END IF;

  IF p_vigente = true THEN
    UPDATE public.modelos_matriz_riscos mmr
    SET vigente = false
    WHERE mmr.id <> p_modelo_id
      AND mmr.segmento_id = v_modelo.segmento_id
      AND mmr.modalidade_atuacao_id = v_modelo.modalidade_atuacao_id
      AND mmr.produto_auditoria_id = v_modelo.produto_auditoria_id
      AND mmr.status_modelo = 'publicado'
      AND mmr.vigente = true
      AND mmr.ativo = true;
  END IF;

  UPDATE public.modelos_matriz_riscos mmr
  SET
    status_modelo = 'publicado',
    vigente = COALESCE(p_vigente, true),
    publicado_por = v_auditor_id,
    data_publicacao = now(),
    ativo = true
  WHERE mmr.id = p_modelo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publicar_modelo_matriz_riscos(uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publicar_modelo_matriz_riscos(uuid, boolean)
  TO authenticated;

-- -----------------------------------------------------------------------------
-- PASSO 7 - ARQUIVAMENTO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arquivar_modelo_matriz_riscos(
  p_modelo_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status_modelo text;
BEGIN
  IF NOT public.can_publish_modelos_matriz_riscos() THEN
    RAISE EXCEPTION 'Usuario sem permissao para arquivar modelos de matriz de riscos.';
  END IF;

  SELECT mmr.status_modelo
    INTO v_status_modelo
  FROM public.modelos_matriz_riscos mmr
  WHERE mmr.id = p_modelo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modelo de matriz de riscos nao localizado.';
  END IF;

  IF v_status_modelo = 'rascunho' THEN
    RAISE EXCEPTION 'Modelo em rascunho nao deve ser arquivado nesta fase. Mantenha o rascunho inativo ou trate em fase futura.';
  END IF;

  UPDATE public.modelos_matriz_riscos mmr
  SET
    status_modelo = 'arquivado',
    vigente = false,
    ativo = false
  WHERE mmr.id = p_modelo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.arquivar_modelo_matriz_riscos(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arquivar_modelo_matriz_riscos(uuid)
  TO authenticated;

-- -----------------------------------------------------------------------------
-- PASSO 8 - BLOQUEIO DE DELETE FISICO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bloquear_delete_modelos_matriz_riscos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Nao e permitido excluir fisicamente um modelo de matriz de riscos. Utilize arquivamento ou inativacao logica.';
END;
$$;

REVOKE ALL ON FUNCTION public.bloquear_delete_modelos_matriz_riscos()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bloquear_delete_modelos_matriz_riscos
  ON public.modelos_matriz_riscos;

CREATE TRIGGER trg_bloquear_delete_modelos_matriz_riscos
  BEFORE DELETE ON public.modelos_matriz_riscos
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_delete_modelos_matriz_riscos();

-- -----------------------------------------------------------------------------
-- PASSO 9 - RLS, POLICIES E GRANTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.modelos_matriz_riscos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_modelos_matriz_riscos
  ON public.modelos_matriz_riscos;
DROP POLICY IF EXISTS insert_modelos_matriz_riscos
  ON public.modelos_matriz_riscos;
DROP POLICY IF EXISTS update_modelos_matriz_riscos
  ON public.modelos_matriz_riscos;
DROP POLICY IF EXISTS delete_modelos_matriz_riscos
  ON public.modelos_matriz_riscos;

CREATE POLICY select_modelos_matriz_riscos
  ON public.modelos_matriz_riscos
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.get_my_auditor_id() IS NOT NULL
      AND NOT public.is_cliente_usuario()
    )
  );

CREATE POLICY insert_modelos_matriz_riscos
  ON public.modelos_matriz_riscos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_modelos_matriz_riscos());

CREATE POLICY update_modelos_matriz_riscos
  ON public.modelos_matriz_riscos
  FOR UPDATE TO authenticated
  USING (
    public.can_manage_modelos_matriz_riscos()
    OR public.can_publish_modelos_matriz_riscos()
  )
  WITH CHECK (
    public.can_manage_modelos_matriz_riscos()
    OR public.can_publish_modelos_matriz_riscos()
  );

CREATE POLICY delete_modelos_matriz_riscos
  ON public.modelos_matriz_riscos
  FOR DELETE TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.modelos_matriz_riscos
  FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modelos_matriz_riscos
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
--   AND table_name = 'modelos_matriz_riscos';

-- 2) Colunas
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'modelos_matriz_riscos'
-- ORDER BY ordinal_position;

-- 3) Constraints e FKs
-- SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS definition
-- FROM pg_constraint con
-- WHERE con.conrelid = 'public.modelos_matriz_riscos'::regclass
-- ORDER BY con.conname;

-- 4) Indices
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'modelos_matriz_riscos'
-- ORDER BY indexname;

-- 5) Trigger updated_at
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'modelos_matriz_riscos'
--   AND trigger_name = 'trg_upd_modelos_matriz_riscos';

-- 6) Trigger de validacao
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'modelos_matriz_riscos'
--   AND trigger_name = 'trg_validar_modelo_matriz_riscos';

-- 7) Trigger de bloqueio de delete
-- SELECT trigger_name, event_manipulation, action_timing, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table = 'modelos_matriz_riscos'
--   AND trigger_name = 'trg_bloquear_delete_modelos_matriz_riscos';

-- 8) Funcoes criadas
-- SELECT n.nspname AS schema_name, p.proname, pg_get_function_arguments(p.oid) AS arguments
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'can_manage_modelos_matriz_riscos',
--     'can_publish_modelos_matriz_riscos',
--     'validar_modelo_matriz_riscos',
--     'publicar_modelo_matriz_riscos',
--     'arquivar_modelo_matriz_riscos',
--     'bloquear_delete_modelos_matriz_riscos'
--   )
-- ORDER BY p.proname;

-- 9) SECURITY DEFINER e search_path das funcoes
-- SELECT n.nspname AS schema_name, p.proname, p.prosecdef AS security_definer, p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'can_manage_modelos_matriz_riscos',
--     'can_publish_modelos_matriz_riscos',
--     'validar_modelo_matriz_riscos',
--     'publicar_modelo_matriz_riscos',
--     'arquivar_modelo_matriz_riscos',
--     'bloquear_delete_modelos_matriz_riscos'
--   )
-- ORDER BY p.proname;

-- 10) Grants/revokes das funcoes
-- SELECT routine_schema, routine_name, grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name IN (
--     'can_manage_modelos_matriz_riscos',
--     'can_publish_modelos_matriz_riscos',
--     'validar_modelo_matriz_riscos',
--     'publicar_modelo_matriz_riscos',
--     'arquivar_modelo_matriz_riscos',
--     'bloquear_delete_modelos_matriz_riscos'
--   )
-- ORDER BY routine_name, grantee, privilege_type;

-- 11) RLS habilitada
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename = 'modelos_matriz_riscos';

-- 12) Policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'modelos_matriz_riscos'
-- ORDER BY policyname;

-- 13) Grants da tabela
-- SELECT table_schema, table_name, grantee, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'public'
--   AND table_name = 'modelos_matriz_riscos'
-- ORDER BY grantee, privilege_type;

-- 14) Funcoes dependentes
-- SELECT n.nspname AS schema_name, p.proname, pg_get_function_arguments(p.oid) AS arguments
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'is_admin',
--     'is_cliente_usuario',
--     'get_my_auditor_id',
--     'update_updated_at_column'
--   )
-- ORDER BY p.proname;

-- 15) Modelos por segmento/modalidade/produto
-- SELECT
--   mmr.id,
--   s.codigo AS segmento_codigo,
--   s.nome AS segmento_nome,
--   ma.codigo AS modalidade_codigo,
--   ma.nome AS modalidade_nome,
--   pa.codigo_produto,
--   pa.nome_produto,
--   ea.codigo AS estrutura_codigo,
--   ea.nome AS estrutura_nome,
--   mmr.codigo_modelo,
--   mmr.nome_modelo,
--   mmr.versao,
--   mmr.status_modelo,
--   mmr.vigente,
--   mmr.ativo
-- FROM public.modelos_matriz_riscos mmr
-- JOIN public.segmentos s ON s.id = mmr.segmento_id
-- JOIN public.modalidades_atuacao ma ON ma.id = mmr.modalidade_atuacao_id
-- JOIN public.produtos_auditoria pa ON pa.id = mmr.produto_auditoria_id
-- LEFT JOIN public.estruturas_auditoria ea ON ea.id = mmr.estrutura_auditoria_id
-- ORDER BY s.nome, ma.nome, pa.nome_produto, mmr.codigo_modelo, mmr.versao;

-- =============================================================================
-- TESTE OPCIONAL APENAS EM STAGING - NAO EXECUTAR EM PRODUCAO
-- =============================================================================
-- Esta fase nao inclui testes de escrita no bloco normal de validacoes.
-- Caso seja necessario testar criacao, publicacao, arquivamento ou bloqueio de
-- delete, preparar um roteiro separado em ambiente controlado com registros
-- descartaveis.
