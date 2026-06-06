-- ============================================================================
--  FASE 0A.3.7.1 - IMPORTACAO DE RISCOS DO MODELO PARA O TRABALHO
-- ============================================================================
-- Objetivo:
--   Permitir importar riscos padrao de public.modelo_matriz_risco_itens para
--   public.trabalho_riscos_auditoria, preservando origem do modelo e evitando
--   duplicidade por trabalho + item de modelo.
--
-- Escopo desta fase:
--   - Adiciona colunas opcionais de origem em public.trabalho_riscos_auditoria.
--   - Cria funcao de alcada especifica para importacao.
--   - Cria RPC com modo preview e modo execucao.
--
-- Fora do escopo:
--   - Nao importa vinculos 0A.3.6.
--   - Nao cria solicitacoes documentais.
--   - Nao cria PTA, evidencias ou vinculos formais com regras/documentos.
--   - Nao altera modelos, itens do modelo, planejamento ou frontend.
--
-- Dependencias:
--   - public.trabalho_riscos_auditoria
--   - public.trabalhos_auditoria.contrato_produto_id
--   - public.contrato_produtos.produto_auditoria_id
--   - public.trabalho_planejamento
--   - public.trabalho_planejamento_modalidades
--   - public.modelos_matriz_riscos
--   - public.modelo_matriz_risco_itens
--   - public.modalidades_atuacao
--   - public.auditores
--   - public.is_admin()
--   - public.is_cliente_usuario()
--   - public.get_my_auditor_id()
--   - public.update_updated_at_column()
--
-- Observacao importante:
--   No schema local, public.trabalho_riscos_auditoria.controle_relevante e
--   public.trabalho_riscos_auditoria.risco_controle sao text. Ja os campos
--   equivalentes em public.modelo_matriz_risco_itens sao boolean. Esta RPC
--   converte true -> 'sim' e false -> 'nao'.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) Colunas de origem em public.trabalho_riscos_auditoria
-- ============================================================================

ALTER TABLE public.trabalho_riscos_auditoria
  ADD COLUMN IF NOT EXISTS origem_modelo_matriz_risco_id uuid NULL,
  ADD COLUMN IF NOT EXISTS origem_modelo_matriz_risco_item_id uuid NULL,
  ADD COLUMN IF NOT EXISTS origem_modelo_codigo_snapshot text NULL,
  ADD COLUMN IF NOT EXISTS origem_modelo_nome_snapshot text NULL,
  ADD COLUMN IF NOT EXISTS origem_modelo_versao_snapshot text NULL,
  ADD COLUMN IF NOT EXISTS origem_modelo_item_codigo_snapshot text NULL,
  ADD COLUMN IF NOT EXISTS origem_modelo_item_ordem_snapshot integer NULL,
  ADD COLUMN IF NOT EXISTS origem_modelo_item_obrigatorio_snapshot boolean NULL,
  ADD COLUMN IF NOT EXISTS origem_modalidade_atuacao_id uuid NULL,
  ADD COLUMN IF NOT EXISTS origem_trabalho_planejamento_modalidade_id uuid NULL,
  ADD COLUMN IF NOT EXISTS importado_de_modelo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS importado_em timestamptz NULL,
  ADD COLUMN IF NOT EXISTS importado_por uuid NULL;

COMMENT ON COLUMN public.trabalho_riscos_auditoria.origem_modelo_matriz_risco_id IS
  'Modelo de matriz de riscos que originou o risco importado, quando aplicavel.';
COMMENT ON COLUMN public.trabalho_riscos_auditoria.origem_modelo_matriz_risco_item_id IS
  'Item/risco padrao do modelo que originou o risco importado. Usado para evitar duplicidade por trabalho.';
COMMENT ON COLUMN public.trabalho_riscos_auditoria.importado_de_modelo IS
  'Indica que o risco foi criado por importacao de modelo padrao de matriz de riscos.';
COMMENT ON COLUMN public.trabalho_riscos_auditoria.importado_em IS
  'Data/hora em que o risco foi importado do modelo.';
COMMENT ON COLUMN public.trabalho_riscos_auditoria.importado_por IS
  'Auditor responsavel pela importacao do risco a partir do modelo.';

-- ============================================================================
-- 2) FKs opcionais
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tra_origem_modelo_matriz_risco'
      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass
  ) THEN
    ALTER TABLE public.trabalho_riscos_auditoria
      ADD CONSTRAINT fk_tra_origem_modelo_matriz_risco
      FOREIGN KEY (origem_modelo_matriz_risco_id)
      REFERENCES public.modelos_matriz_riscos(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tra_origem_modelo_matriz_risco_item'
      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass
  ) THEN
    ALTER TABLE public.trabalho_riscos_auditoria
      ADD CONSTRAINT fk_tra_origem_modelo_matriz_risco_item
      FOREIGN KEY (origem_modelo_matriz_risco_item_id)
      REFERENCES public.modelo_matriz_risco_itens(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tra_origem_modalidade_atuacao'
      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass
  ) THEN
    ALTER TABLE public.trabalho_riscos_auditoria
      ADD CONSTRAINT fk_tra_origem_modalidade_atuacao
      FOREIGN KEY (origem_modalidade_atuacao_id)
      REFERENCES public.modalidades_atuacao(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tra_origem_trabalho_planejamento_modalidade'
      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass
  ) THEN
    ALTER TABLE public.trabalho_riscos_auditoria
      ADD CONSTRAINT fk_tra_origem_trabalho_planejamento_modalidade
      FOREIGN KEY (origem_trabalho_planejamento_modalidade_id)
      REFERENCES public.trabalho_planejamento_modalidades(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tra_importado_por'
      AND conrelid = 'public.trabalho_riscos_auditoria'::regclass
  ) THEN
    ALTER TABLE public.trabalho_riscos_auditoria
      ADD CONSTRAINT fk_tra_importado_por
      FOREIGN KEY (importado_por)
      REFERENCES public.auditores(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END;
$$;

-- ============================================================================
-- 3) Indices
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_tra_origem_modelo_item_por_trabalho
  ON public.trabalho_riscos_auditoria (
    trabalho_auditoria_id,
    origem_modelo_matriz_risco_item_id
  )
  WHERE origem_modelo_matriz_risco_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tra_origem_modelo_matriz_risco
  ON public.trabalho_riscos_auditoria (origem_modelo_matriz_risco_id);

CREATE INDEX IF NOT EXISTS idx_tra_origem_modelo_matriz_risco_item
  ON public.trabalho_riscos_auditoria (origem_modelo_matriz_risco_item_id);

CREATE INDEX IF NOT EXISTS idx_tra_origem_modalidade_atuacao
  ON public.trabalho_riscos_auditoria (origem_modalidade_atuacao_id);

CREATE INDEX IF NOT EXISTS idx_tra_origem_trabalho_planejamento_modalidade
  ON public.trabalho_riscos_auditoria (origem_trabalho_planejamento_modalidade_id);

CREATE INDEX IF NOT EXISTS idx_tra_importado_de_modelo
  ON public.trabalho_riscos_auditoria (importado_de_modelo);

CREATE INDEX IF NOT EXISTS idx_tra_importado_em
  ON public.trabalho_riscos_auditoria (importado_em);

-- ============================================================================
-- 4) Funcao de permissao para importacao
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_importar_riscos_modelo_trabalho(
  p_trabalho_auditoria_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auditor_id uuid;
  v_perfil text;
  v_responsavel_principal boolean := false;
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

  SELECT a.perfil_acesso
    INTO v_perfil
  FROM public.auditores a
  WHERE a.id = v_auditor_id;

  IF v_perfil IN ('socio', 'gerente') THEN
    RETURN true;
  END IF;

  IF v_perfil = 'senior' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.trabalho_auditores ta
      WHERE ta.trabalho_auditoria_id = p_trabalho_auditoria_id
        AND ta.auditor_id = v_auditor_id
        AND ta.responsavel_principal = true
    )
      INTO v_responsavel_principal;

    RETURN v_responsavel_principal;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_importar_riscos_modelo_trabalho(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_importar_riscos_modelo_trabalho(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.can_importar_riscos_modelo_trabalho(uuid) IS
  'Valida a alcada para importar riscos de modelos padrao para um trabalho.';

-- ============================================================================
-- 5) RPC principal
-- ============================================================================

CREATE OR REPLACE FUNCTION public.importar_riscos_modelo_para_trabalho(
  p_trabalho_auditoria_id uuid,
  p_preview boolean DEFAULT true,
  p_modo_estrito boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trabalho record;
  v_produto_auditoria_id uuid;
  v_planejamento_id uuid;
  v_auditor_id uuid;
  v_modalidades_consideradas integer := 0;
  v_modelos_encontrados integer := 0;
  v_itens_elegiveis integer := 0;
  v_itens_ja_importados integer := 0;
  v_itens_importados integer := 0;
  v_modalidades_sem_modelo jsonb := '[]'::jsonb;
  v_avisos jsonb := '[]'::jsonb;
  v_erros jsonb := '[]'::jsonb;
BEGIN
  IF p_trabalho_auditoria_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'preview', p_preview,
      'trabalho_auditoria_id', p_trabalho_auditoria_id,
      'produto_auditoria_id', null,
      'modalidades_consideradas', 0,
      'modelos_encontrados', 0,
      'modalidades_sem_modelo', '[]'::jsonb,
      'itens_elegiveis', 0,
      'itens_ja_importados', 0,
      'itens_importados', 0,
      'avisos', '[]'::jsonb,
      'erros', jsonb_build_array('Informe o trabalho de auditoria.')
    );
  END IF;

  IF NOT public.can_importar_riscos_modelo_trabalho(p_trabalho_auditoria_id) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'preview', p_preview,
      'trabalho_auditoria_id', p_trabalho_auditoria_id,
      'produto_auditoria_id', null,
      'modalidades_consideradas', 0,
      'modelos_encontrados', 0,
      'modalidades_sem_modelo', '[]'::jsonb,
      'itens_elegiveis', 0,
      'itens_ja_importados', 0,
      'itens_importados', 0,
      'avisos', '[]'::jsonb,
      'erros', jsonb_build_array('Usuario sem alcada para importar riscos do modelo neste trabalho.')
    );
  END IF;

  SELECT t.id,
         t.cliente_id,
         t.exercicio_id,
         t.contrato_produto_id,
         t.status_trabalho
    INTO v_trabalho
  FROM public.trabalhos_auditoria t
  WHERE t.id = p_trabalho_auditoria_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'preview', p_preview,
      'trabalho_auditoria_id', p_trabalho_auditoria_id,
      'produto_auditoria_id', null,
      'modalidades_consideradas', 0,
      'modelos_encontrados', 0,
      'modalidades_sem_modelo', '[]'::jsonb,
      'itens_elegiveis', 0,
      'itens_ja_importados', 0,
      'itens_importados', 0,
      'avisos', '[]'::jsonb,
      'erros', jsonb_build_array('Trabalho de auditoria nao encontrado.')
    );
  END IF;

  IF v_trabalho.contrato_produto_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'preview', p_preview,
      'trabalho_auditoria_id', p_trabalho_auditoria_id,
      'produto_auditoria_id', null,
      'modalidades_consideradas', 0,
      'modelos_encontrados', 0,
      'modalidades_sem_modelo', '[]'::jsonb,
      'itens_elegiveis', 0,
      'itens_ja_importados', 0,
      'itens_importados', 0,
      'avisos', '[]'::jsonb,
      'erros', jsonb_build_array('O trabalho nao possui produto de contrato definido.')
    );
  END IF;

  SELECT cp.produto_auditoria_id
    INTO v_produto_auditoria_id
  FROM public.contrato_produtos cp
  WHERE cp.id = v_trabalho.contrato_produto_id;

  IF v_produto_auditoria_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'preview', p_preview,
      'trabalho_auditoria_id', p_trabalho_auditoria_id,
      'produto_auditoria_id', null,
      'modalidades_consideradas', 0,
      'modelos_encontrados', 0,
      'modalidades_sem_modelo', '[]'::jsonb,
      'itens_elegiveis', 0,
      'itens_ja_importados', 0,
      'itens_importados', 0,
      'avisos', '[]'::jsonb,
      'erros', jsonb_build_array('Nao foi possivel identificar o produto de auditoria do trabalho.')
    );
  END IF;

  SELECT tp.id
    INTO v_planejamento_id
  FROM public.trabalho_planejamento tp
  WHERE tp.trabalho_auditoria_id = p_trabalho_auditoria_id
  LIMIT 1;

  IF v_planejamento_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'preview', p_preview,
      'trabalho_auditoria_id', p_trabalho_auditoria_id,
      'produto_auditoria_id', v_produto_auditoria_id,
      'modalidades_consideradas', 0,
      'modelos_encontrados', 0,
      'modalidades_sem_modelo', '[]'::jsonb,
      'itens_elegiveis', 0,
      'itens_ja_importados', 0,
      'itens_importados', 0,
      'avisos', '[]'::jsonb,
      'erros', jsonb_build_array('O trabalho nao possui planejamento cadastrado.')
    );
  END IF;

  SELECT count(*)
    INTO v_modalidades_consideradas
  FROM public.trabalho_planejamento_modalidades tpm
  WHERE tpm.trabalho_planejamento_id = v_planejamento_id
    AND tpm.trabalho_auditoria_id = p_trabalho_auditoria_id
    AND tpm.ativo = true;

  IF v_modalidades_consideradas = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'preview', p_preview,
      'trabalho_auditoria_id', p_trabalho_auditoria_id,
      'produto_auditoria_id', v_produto_auditoria_id,
      'modalidades_consideradas', 0,
      'modelos_encontrados', 0,
      'modalidades_sem_modelo', '[]'::jsonb,
      'itens_elegiveis', 0,
      'itens_ja_importados', 0,
      'itens_importados', 0,
      'avisos', '[]'::jsonb,
      'erros', jsonb_build_array('Defina modalidades ativas no planejamento antes de importar riscos do modelo.')
    );
  END IF;

  WITH modalidades AS (
    SELECT tpm.id AS trabalho_planejamento_modalidade_id,
           tpm.modalidade_atuacao_id,
           tpm.segmento_id_snapshot,
           tpm.segmento_codigo_snapshot,
           tpm.segmento_nome_snapshot,
           tpm.modalidade_codigo_snapshot,
           tpm.modalidade_nome_snapshot,
           ma.segmento_id AS segmento_id_atual
    FROM public.trabalho_planejamento_modalidades tpm
    JOIN public.modalidades_atuacao ma
      ON ma.id = tpm.modalidade_atuacao_id
    WHERE tpm.trabalho_planejamento_id = v_planejamento_id
      AND tpm.trabalho_auditoria_id = p_trabalho_auditoria_id
      AND tpm.ativo = true
  ),
  sem_modelo AS (
    SELECT m.*
    FROM modalidades m
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.modelos_matriz_riscos mmr
      WHERE mmr.modalidade_atuacao_id = m.modalidade_atuacao_id
        AND mmr.produto_auditoria_id = v_produto_auditoria_id
        AND mmr.status_modelo = 'publicado'
        AND mmr.vigente = true
        AND mmr.ativo = true
        AND (
          mmr.segmento_id = m.segmento_id_atual
          OR (
            m.segmento_id_snapshot IS NOT NULL
            AND mmr.segmento_id = m.segmento_id_snapshot
          )
        )
    )
  )
  SELECT coalesce(
           jsonb_agg(
             jsonb_build_object(
               'trabalho_planejamento_modalidade_id', sm.trabalho_planejamento_modalidade_id,
               'modalidade_atuacao_id', sm.modalidade_atuacao_id,
               'modalidade_codigo_snapshot', sm.modalidade_codigo_snapshot,
               'modalidade_nome_snapshot', sm.modalidade_nome_snapshot,
               'segmento_codigo_snapshot', sm.segmento_codigo_snapshot,
               'segmento_nome_snapshot', sm.segmento_nome_snapshot
             )
             ORDER BY sm.modalidade_nome_snapshot
           ),
           '[]'::jsonb
         )
    INTO v_modalidades_sem_modelo
  FROM sem_modelo sm;

  IF jsonb_array_length(v_modalidades_sem_modelo) > 0 THEN
    v_avisos := v_avisos || jsonb_build_array(
      'Uma ou mais modalidades ativas do planejamento nao possuem modelo publicado e vigente para o produto do trabalho.'
    );

    IF p_modo_estrito THEN
      RETURN jsonb_build_object(
        'ok', false,
        'preview', p_preview,
        'trabalho_auditoria_id', p_trabalho_auditoria_id,
        'produto_auditoria_id', v_produto_auditoria_id,
        'modalidades_consideradas', v_modalidades_consideradas,
        'modelos_encontrados', 0,
        'modalidades_sem_modelo', v_modalidades_sem_modelo,
        'itens_elegiveis', 0,
        'itens_ja_importados', 0,
        'itens_importados', 0,
        'avisos', v_avisos,
        'erros', jsonb_build_array('Modo estrito ativo: todas as modalidades precisam ter modelo vigente.')
      );
    END IF;
  END IF;

  WITH modalidades AS (
    SELECT tpm.id AS trabalho_planejamento_modalidade_id,
           tpm.modalidade_atuacao_id,
           tpm.segmento_id_snapshot,
           ma.segmento_id AS segmento_id_atual
    FROM public.trabalho_planejamento_modalidades tpm
    JOIN public.modalidades_atuacao ma
      ON ma.id = tpm.modalidade_atuacao_id
    WHERE tpm.trabalho_planejamento_id = v_planejamento_id
      AND tpm.trabalho_auditoria_id = p_trabalho_auditoria_id
      AND tpm.ativo = true
  ),
  modelos AS (
    SELECT DISTINCT ON (m.trabalho_planejamento_modalidade_id)
           m.trabalho_planejamento_modalidade_id,
           m.modalidade_atuacao_id,
           mmr.id AS modelo_matriz_risco_id
    FROM modalidades m
    JOIN public.modelos_matriz_riscos mmr
      ON mmr.modalidade_atuacao_id = m.modalidade_atuacao_id
     AND mmr.produto_auditoria_id = v_produto_auditoria_id
     AND mmr.status_modelo = 'publicado'
     AND mmr.vigente = true
     AND mmr.ativo = true
     AND (
       mmr.segmento_id = m.segmento_id_atual
       OR (
         m.segmento_id_snapshot IS NOT NULL
         AND mmr.segmento_id = m.segmento_id_snapshot
       )
     )
    ORDER BY m.trabalho_planejamento_modalidade_id, mmr.data_publicacao DESC NULLS LAST, mmr.created_at DESC
  )
  SELECT count(*)
    INTO v_modelos_encontrados
  FROM modelos;

  WITH modalidades AS (
    SELECT tpm.id AS trabalho_planejamento_modalidade_id,
           tpm.modalidade_atuacao_id,
           tpm.segmento_id_snapshot,
           ma.segmento_id AS segmento_id_atual
    FROM public.trabalho_planejamento_modalidades tpm
    JOIN public.modalidades_atuacao ma
      ON ma.id = tpm.modalidade_atuacao_id
    WHERE tpm.trabalho_planejamento_id = v_planejamento_id
      AND tpm.trabalho_auditoria_id = p_trabalho_auditoria_id
      AND tpm.ativo = true
  ),
  modelos AS (
    SELECT DISTINCT ON (m.trabalho_planejamento_modalidade_id)
           m.trabalho_planejamento_modalidade_id,
           m.modalidade_atuacao_id,
           mmr.id AS modelo_matriz_risco_id
    FROM modalidades m
    JOIN public.modelos_matriz_riscos mmr
      ON mmr.modalidade_atuacao_id = m.modalidade_atuacao_id
     AND mmr.produto_auditoria_id = v_produto_auditoria_id
     AND mmr.status_modelo = 'publicado'
     AND mmr.vigente = true
     AND mmr.ativo = true
     AND (
       mmr.segmento_id = m.segmento_id_atual
       OR (
         m.segmento_id_snapshot IS NOT NULL
         AND mmr.segmento_id = m.segmento_id_snapshot
       )
     )
    ORDER BY m.trabalho_planejamento_modalidade_id, mmr.data_publicacao DESC NULLS LAST, mmr.created_at DESC
  ),
  itens_modelo AS (
    SELECT m.modelo_matriz_risco_id,
           m.trabalho_planejamento_modalidade_id,
           m.modalidade_atuacao_id,
           i.id AS item_id
    FROM modelos m
    JOIN public.modelo_matriz_risco_itens i
      ON i.modelo_matriz_risco_id = m.modelo_matriz_risco_id
     AND i.ativo = true
  )
  SELECT count(*) FILTER (WHERE tra.id IS NULL),
         count(*) FILTER (WHERE tra.id IS NOT NULL)
    INTO v_itens_elegiveis,
         v_itens_ja_importados
  FROM itens_modelo im
  LEFT JOIN public.trabalho_riscos_auditoria tra
    ON tra.trabalho_auditoria_id = p_trabalho_auditoria_id
   AND tra.origem_modelo_matriz_risco_item_id = im.item_id;

  IF v_modelos_encontrados = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'preview', p_preview,
      'trabalho_auditoria_id', p_trabalho_auditoria_id,
      'produto_auditoria_id', v_produto_auditoria_id,
      'modalidades_consideradas', v_modalidades_consideradas,
      'modelos_encontrados', 0,
      'modalidades_sem_modelo', v_modalidades_sem_modelo,
      'itens_elegiveis', 0,
      'itens_ja_importados', 0,
      'itens_importados', 0,
      'avisos', v_avisos,
      'erros', jsonb_build_array('Nenhum modelo publicado e vigente foi encontrado para as modalidades e o produto do trabalho.')
    );
  END IF;

  IF coalesce(v_itens_elegiveis, 0) = 0 THEN
    v_avisos := v_avisos || jsonb_build_array(
      'Nenhum novo item elegivel para importacao. Os itens podem ja ter sido importados ou os modelos nao possuem itens ativos.'
    );
  END IF;

  IF NOT p_preview AND coalesce(v_itens_elegiveis, 0) > 0 THEN
    v_auditor_id := public.get_my_auditor_id();

    WITH modalidades AS (
      SELECT tpm.id AS trabalho_planejamento_modalidade_id,
             tpm.modalidade_atuacao_id,
             tpm.segmento_id_snapshot,
             ma.segmento_id AS segmento_id_atual
      FROM public.trabalho_planejamento_modalidades tpm
      JOIN public.modalidades_atuacao ma
        ON ma.id = tpm.modalidade_atuacao_id
      WHERE tpm.trabalho_planejamento_id = v_planejamento_id
        AND tpm.trabalho_auditoria_id = p_trabalho_auditoria_id
        AND tpm.ativo = true
    ),
    modelos AS (
      SELECT DISTINCT ON (m.trabalho_planejamento_modalidade_id)
             m.trabalho_planejamento_modalidade_id,
             m.modalidade_atuacao_id,
             mmr.*
      FROM modalidades m
      JOIN public.modelos_matriz_riscos mmr
        ON mmr.modalidade_atuacao_id = m.modalidade_atuacao_id
       AND mmr.produto_auditoria_id = v_produto_auditoria_id
       AND mmr.status_modelo = 'publicado'
       AND mmr.vigente = true
       AND mmr.ativo = true
       AND (
         mmr.segmento_id = m.segmento_id_atual
         OR (
           m.segmento_id_snapshot IS NOT NULL
           AND mmr.segmento_id = m.segmento_id_snapshot
         )
       )
      ORDER BY m.trabalho_planejamento_modalidade_id, mmr.data_publicacao DESC NULLS LAST, mmr.created_at DESC
    ),
    itens_elegiveis AS (
      SELECT m.id AS modelo_matriz_risco_id,
             m.codigo_modelo,
             m.nome_modelo,
             m.versao,
             m.trabalho_planejamento_modalidade_id,
             m.modalidade_atuacao_id,
             i.*
      FROM modelos m
      JOIN public.modelo_matriz_risco_itens i
        ON i.modelo_matriz_risco_id = m.id
       AND i.ativo = true
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.trabalho_riscos_auditoria tra
        WHERE tra.trabalho_auditoria_id = p_trabalho_auditoria_id
          AND tra.origem_modelo_matriz_risco_item_id = i.id
      )
    ),
    inseridos AS (
      INSERT INTO public.trabalho_riscos_auditoria (
        trabalho_auditoria_id,
        cliente_id,
        exercicio_id,
        area_ciclo,
        conta_mcse_id,
        codigo_conta_snapshot,
        descricao_conta_snapshot,
        grupo_contabil,
        assertiva,
        risco_identificado,
        tipo_risco,
        causa,
        impacto_potencial,
        probabilidade,
        impacto,
        nivel_risco,
        risco_significativo,
        risco_fraude,
        controle_relevante,
        risco_controle,
        resposta_planejada,
        natureza_resposta,
        extensao_resposta,
        oportunidade_resposta,
        evidencia_esperada,
        responsavel_id,
        status_risco,
        conclusao,
        risco_residual,
        ativo,
        observacoes,
        origem_modelo_matriz_risco_id,
        origem_modelo_matriz_risco_item_id,
        origem_modelo_codigo_snapshot,
        origem_modelo_nome_snapshot,
        origem_modelo_versao_snapshot,
        origem_modelo_item_codigo_snapshot,
        origem_modelo_item_ordem_snapshot,
        origem_modelo_item_obrigatorio_snapshot,
        origem_modalidade_atuacao_id,
        origem_trabalho_planejamento_modalidade_id,
        importado_de_modelo,
        importado_em,
        importado_por
      )
      SELECT p_trabalho_auditoria_id,
             v_trabalho.cliente_id,
             v_trabalho.exercicio_id,
             ie.area_ciclo,
             ie.conta_mcse_id,
             ie.codigo_conta_snapshot,
             ie.descricao_conta_snapshot,
             ie.grupo_contabil,
             ie.assertiva,
             ie.risco_identificado,
             ie.tipo_risco,
             ie.causa,
             ie.impacto_potencial,
             ie.probabilidade,
             ie.impacto,
             ie.nivel_risco,
             ie.risco_significativo,
             ie.risco_fraude,
             CASE WHEN ie.controle_relevante THEN 'sim' ELSE 'nao' END,
             CASE WHEN ie.risco_controle THEN 'sim' ELSE 'nao' END,
             ie.resposta_planejada,
             ie.natureza_resposta,
             ie.extensao_resposta,
             ie.oportunidade_resposta,
             ie.evidencia_esperada,
             NULL::uuid,
             'identificado',
             NULL::text,
             NULL::text,
             true,
             NULLIF(
               concat_ws(
                 E'\n\n',
                 NULLIF(btrim(coalesce(ie.observacoes, '')), ''),
                 CASE
                   WHEN NULLIF(btrim(coalesce(ie.procedimento_sugerido, '')), '') IS NOT NULL
                     THEN 'Procedimento sugerido do modelo: ' || btrim(ie.procedimento_sugerido)
                   ELSE NULL
                 END
               ),
               ''
             ),
             ie.modelo_matriz_risco_id,
             ie.id,
             ie.codigo_modelo,
             ie.nome_modelo,
             ie.versao,
             ie.codigo_item_modelo,
             ie.ordem,
             ie.obrigatorio,
             ie.modalidade_atuacao_id,
             ie.trabalho_planejamento_modalidade_id,
             true,
             now(),
             v_auditor_id
      FROM itens_elegiveis ie
      ON CONFLICT (
        trabalho_auditoria_id,
        origem_modelo_matriz_risco_item_id
      )
      WHERE origem_modelo_matriz_risco_item_id IS NOT NULL
      DO NOTHING
      RETURNING id
    )
    SELECT count(*)
      INTO v_itens_importados
    FROM inseridos;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'preview', p_preview,
    'trabalho_auditoria_id', p_trabalho_auditoria_id,
    'produto_auditoria_id', v_produto_auditoria_id,
    'modalidades_consideradas', v_modalidades_consideradas,
    'modelos_encontrados', v_modelos_encontrados,
    'modalidades_sem_modelo', v_modalidades_sem_modelo,
    'itens_elegiveis', coalesce(v_itens_elegiveis, 0),
    'itens_ja_importados', coalesce(v_itens_ja_importados, 0),
    'itens_importados', coalesce(v_itens_importados, 0),
    'avisos', v_avisos,
    'erros', v_erros
  );
END;
$$;

REVOKE ALL ON FUNCTION public.importar_riscos_modelo_para_trabalho(uuid, boolean, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.importar_riscos_modelo_para_trabalho(uuid, boolean, boolean)
  TO authenticated;

COMMENT ON FUNCTION public.importar_riscos_modelo_para_trabalho(uuid, boolean, boolean) IS
  'Importa, ou simula a importacao, de riscos padrao dos modelos vigentes para a matriz de riscos de um trabalho.';

-- ============================================================================
-- 6) Reload PostgREST
-- ============================================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- VALIDACOES POS-EXECUCAO - APENAS SELECTS
-- ============================================================================

-- 1) Colunas novas em public.trabalho_riscos_auditoria
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'trabalho_riscos_auditoria'
--   AND column_name IN (
--     'origem_modelo_matriz_risco_id',
--     'origem_modelo_matriz_risco_item_id',
--     'origem_modelo_codigo_snapshot',
--     'origem_modelo_nome_snapshot',
--     'origem_modelo_versao_snapshot',
--     'origem_modelo_item_codigo_snapshot',
--     'origem_modelo_item_ordem_snapshot',
--     'origem_modelo_item_obrigatorio_snapshot',
--     'origem_modalidade_atuacao_id',
--     'origem_trabalho_planejamento_modalidade_id',
--     'importado_de_modelo',
--     'importado_em',
--     'importado_por'
--   )
-- ORDER BY ordinal_position;

-- 2) FKs novas
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.trabalho_riscos_auditoria'::regclass
--   AND conname IN (
--     'fk_tra_origem_modelo_matriz_risco',
--     'fk_tra_origem_modelo_matriz_risco_item',
--     'fk_tra_origem_modalidade_atuacao',
--     'fk_tra_origem_trabalho_planejamento_modalidade',
--     'fk_tra_importado_por'
--   )
-- ORDER BY conname;

-- 3) Indice unico parcial e indices novos
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'trabalho_riscos_auditoria'
--   AND indexname IN (
--     'uq_tra_origem_modelo_item_por_trabalho',
--     'idx_tra_origem_modelo_matriz_risco',
--     'idx_tra_origem_modelo_matriz_risco_item',
--     'idx_tra_origem_modalidade_atuacao',
--     'idx_tra_origem_trabalho_planejamento_modalidade',
--     'idx_tra_importado_de_modelo',
--     'idx_tra_importado_em'
--   )
-- ORDER BY indexname;

-- 4) Funcoes criadas
-- SELECT n.nspname AS schema_name,
--        p.proname AS function_name,
--        pg_get_function_identity_arguments(p.oid) AS args,
--        p.prosecdef AS security_definer,
--        p.proconfig AS config
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'can_importar_riscos_modelo_trabalho',
--     'importar_riscos_modelo_para_trabalho'
--   )
-- ORDER BY p.proname, args;

-- 5) Grants/revokes das funcoes
-- SELECT n.nspname AS schema_name,
--        p.proname AS function_name,
--        pg_get_function_identity_arguments(p.oid) AS args,
--        p.proacl
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'can_importar_riscos_modelo_trabalho',
--     'importar_riscos_modelo_para_trabalho'
--   )
-- ORDER BY p.proname, args;

-- 6) Funcoes dependentes
-- SELECT n.nspname AS schema_name,
--        p.proname AS function_name,
--        pg_get_function_identity_arguments(p.oid) AS args,
--        p.prosecdef AS security_definer,
--        p.proconfig AS config
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'is_admin',
--     'is_cliente_usuario',
--     'get_my_auditor_id',
--     'update_updated_at_column'
--   )
-- ORDER BY p.proname, args;

-- 7) Exemplo de SELECT para identificar modelos aplicaveis por trabalho
-- Substituir '<trabalho_id>' por um UUID real.
-- WITH trabalho AS (
--   SELECT t.id,
--          t.cliente_id,
--          t.exercicio_id,
--          t.contrato_produto_id,
--          cp.produto_auditoria_id
--   FROM public.trabalhos_auditoria t
--   JOIN public.contrato_produtos cp ON cp.id = t.contrato_produto_id
--   WHERE t.id = '<trabalho_id>'::uuid
-- ),
-- planejamento AS (
--   SELECT tp.id AS trabalho_planejamento_id, t.*
--   FROM trabalho t
--   JOIN public.trabalho_planejamento tp ON tp.trabalho_auditoria_id = t.id
-- ),
-- modalidades AS (
--   SELECT p.*,
--          tpm.id AS trabalho_planejamento_modalidade_id,
--          tpm.modalidade_atuacao_id,
--          tpm.segmento_id_snapshot,
--          ma.segmento_id AS segmento_id_atual
--   FROM planejamento p
--   JOIN public.trabalho_planejamento_modalidades tpm
--     ON tpm.trabalho_planejamento_id = p.trabalho_planejamento_id
--    AND tpm.ativo = true
--   JOIN public.modalidades_atuacao ma ON ma.id = tpm.modalidade_atuacao_id
-- )
-- SELECT m.id AS trabalho_auditoria_id,
--        m.produto_auditoria_id,
--        m.trabalho_planejamento_modalidade_id,
--        mmr.id AS modelo_matriz_risco_id,
--        mmr.codigo_modelo,
--        mmr.nome_modelo,
--        mmr.versao
-- FROM modalidades m
-- JOIN public.modelos_matriz_riscos mmr
--   ON mmr.modalidade_atuacao_id = m.modalidade_atuacao_id
--  AND mmr.produto_auditoria_id = m.produto_auditoria_id
--  AND mmr.status_modelo = 'publicado'
--  AND mmr.vigente = true
--  AND mmr.ativo = true
--  AND (
--    mmr.segmento_id = m.segmento_id_atual
--    OR (
--      m.segmento_id_snapshot IS NOT NULL
--      AND mmr.segmento_id = m.segmento_id_snapshot
--    )
--  );

-- 8) Exemplo de SELECT para identificar itens ja importados por trabalho
-- Substituir '<trabalho_id>' por um UUID real.
-- SELECT tra.id,
--        tra.trabalho_auditoria_id,
--        tra.risco_identificado,
--        tra.origem_modelo_matriz_risco_id,
--        tra.origem_modelo_matriz_risco_item_id,
--        tra.origem_modelo_codigo_snapshot,
--        tra.origem_modelo_nome_snapshot,
--        tra.origem_modelo_versao_snapshot,
--        tra.importado_de_modelo,
--        tra.importado_em
-- FROM public.trabalho_riscos_auditoria tra
-- WHERE tra.trabalho_auditoria_id = '<trabalho_id>'::uuid
--   AND tra.origem_modelo_matriz_risco_item_id IS NOT NULL
-- ORDER BY tra.importado_em DESC NULLS LAST, tra.created_at DESC;

-- ============================================================================
-- TESTE OPCIONAL EM STAGING - CHAMAR RPC EM PREVIEW
-- NAO EXECUTAR IMPORTACAO EM PRODUCAO SEM CONFERENCIA
-- ============================================================================

-- SELECT public.importar_riscos_modelo_para_trabalho(
--   '<trabalho_id>'::uuid,
--   true,
--   false
-- );
