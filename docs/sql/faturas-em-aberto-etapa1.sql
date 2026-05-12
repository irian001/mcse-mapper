-- ============================================================
-- ETAPA 1 — FATURAS EM ABERTO (Procedimento Auxiliar)
-- Execute manualmente no Supabase externo (SQL Editor).
-- NÃO executar via Lovable Cloud.
--
-- Cria estrutura inicial para importar faturas em aberto do ERP,
-- com cadastros auxiliares por cliente para tradução de classes
-- e municípios. Não cria constraints rígidas de duplicidade nesta
-- etapa — a validação de duplicidade é feita no importador.
-- ============================================================

-- ------------------------------------------------------------
-- 0) ENUM do tipo de procedimento (se a coluna usar enum)
-- ------------------------------------------------------------
-- A coluna procedimentos_auxiliares.tipo_procedimento pode ser
-- TEXT ou um ENUM. Detectamos dinamicamente o tipo real da coluna
-- e, se for enum, adicionamos 'faturas_em_aberto'. Se for TEXT, o
-- bloco apenas não faz nada. Não falha se o valor já existir.
DO $$
DECLARE
  v_udt_name text;
  v_udt_schema text;
BEGIN
  SELECT udt_schema, udt_name
    INTO v_udt_schema, v_udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'procedimentos_auxiliares'
    AND column_name = 'tipo_procedimento';

  IF v_udt_name IS NULL THEN
    RAISE NOTICE 'Coluna procedimentos_auxiliares.tipo_procedimento não encontrada. Pulando ajuste de enum.';
  ELSIF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = v_udt_name AND n.nspname = v_udt_schema AND t.typtype = 'e'
  ) THEN
    BEGIN
      EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L',
                     v_udt_schema, v_udt_name, 'faturas_em_aberto');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  ELSE
    RAISE NOTICE 'Coluna tipo_procedimento não é enum (tipo=%). Nenhuma ação necessária.', v_udt_name;
  END IF;
END$$;

-- ------------------------------------------------------------
-- 1) CADASTRO AUXILIAR — CLASSES DE FATURAMENTO POR CLIENTE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cliente_classes_faturamento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  codigo_classe   text NOT NULL,
  descricao_classe text NOT NULL,
  grupo_classe    text,
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccf_cliente  ON public.cliente_classes_faturamento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ccf_codigo   ON public.cliente_classes_faturamento(codigo_classe);
CREATE INDEX IF NOT EXISTS idx_ccf_ativo    ON public.cliente_classes_faturamento(ativo);

DROP TRIGGER IF EXISTS trg_upd_ccf ON public.cliente_classes_faturamento;
CREATE TRIGGER trg_upd_ccf BEFORE UPDATE ON public.cliente_classes_faturamento
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 2) CADASTRO AUXILIAR — MUNICÍPIOS DE FATURAMENTO POR CLIENTE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cliente_municipios_faturamento (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id       uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  codigo_municipio text NOT NULL,
  nome_municipio   text NOT NULL,
  uf               text,
  codigo_ibge      text,
  regional_codigo  text,
  regional_nome    text,
  ativo            boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cmf_cliente ON public.cliente_municipios_faturamento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cmf_codigo  ON public.cliente_municipios_faturamento(codigo_municipio);
CREATE INDEX IF NOT EXISTS idx_cmf_uf      ON public.cliente_municipios_faturamento(uf);
CREATE INDEX IF NOT EXISTS idx_cmf_ativo   ON public.cliente_municipios_faturamento(ativo);

DROP TRIGGER IF EXISTS trg_upd_cmf ON public.cliente_municipios_faturamento;
CREATE TRIGGER trg_upd_cmf BEFORE UPDATE ON public.cliente_municipios_faturamento
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 3) LOTES DE IMPORTAÇÃO DE FATURAS EM ABERTO
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procedimento_faturas_aberto_lotes (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedimento_auxiliar_id    uuid NOT NULL REFERENCES public.procedimentos_auxiliares(id) ON DELETE CASCADE,
  cliente_id                  uuid REFERENCES public.clientes(id),
  trabalho_auditoria_id       uuid REFERENCES public.trabalhos_auditoria(id),

  nome_arquivo                text,
  tipo_arquivo                text,
  tamanho_arquivo             bigint,

  data_importacao             timestamptz NOT NULL DEFAULT now(),
  data_emissao_padrao         date,
  usuario_importacao_id       uuid,

  quantidade_linhas_lidas     integer NOT NULL DEFAULT 0,
  quantidade_linhas_importadas integer NOT NULL DEFAULT 0,
  quantidade_linhas_com_erro  integer NOT NULL DEFAULT 0,
  quantidade_alertas          integer NOT NULL DEFAULT 0,
  valor_total_importado       numeric(18,2) NOT NULL DEFAULT 0,

  status_importacao           text,
  mensagem_erro               text,
  mapeamento_colunas          jsonb,
  metadata_arquivo            jsonb,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pfal_proc      ON public.procedimento_faturas_aberto_lotes(procedimento_auxiliar_id);
CREATE INDEX IF NOT EXISTS idx_pfal_cliente   ON public.procedimento_faturas_aberto_lotes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pfal_trabalho  ON public.procedimento_faturas_aberto_lotes(trabalho_auditoria_id);
CREATE INDEX IF NOT EXISTS idx_pfal_data      ON public.procedimento_faturas_aberto_lotes(data_importacao);
CREATE INDEX IF NOT EXISTS idx_pfal_status    ON public.procedimento_faturas_aberto_lotes(status_importacao);

DROP TRIGGER IF EXISTS trg_upd_pfal ON public.procedimento_faturas_aberto_lotes;
CREATE TRIGGER trg_upd_pfal BEFORE UPDATE ON public.procedimento_faturas_aberto_lotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 4) ITENS DE FATURAS EM ABERTO
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procedimento_faturas_aberto_itens (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedimento_auxiliar_id uuid NOT NULL REFERENCES public.procedimentos_auxiliares(id) ON DELETE CASCADE,
  lote_importacao_id       uuid REFERENCES public.procedimento_faturas_aberto_lotes(id) ON DELETE CASCADE,
  cliente_id               uuid REFERENCES public.clientes(id),
  trabalho_auditoria_id    uuid REFERENCES public.trabalhos_auditoria(id),

  -- Identificação UC
  uc                  text,
  codigo_consumidor   text,
  nome_consumidor     text,
  cpf_cnpj            text,

  -- Identificação fatura
  numero_fatura       text,
  numero_documento    text,
  serie_documento     text,
  nosso_numero        text,
  codigo_barras       text,

  -- Datas
  data_emissao        date,
  data_vencimento     date,
  data_referencia     date,
  ano_mes_faturamento text,
  ano_faturamento     integer,
  mes_faturamento     integer,
  ano_vencimento      integer,
  dias_em_atraso      integer,

  -- Valores (etapa 1: foco em valor_em_aberto)
  valor_em_aberto    numeric(18,2),
  valor_correcao     numeric(18,2),
  valor_desconto     numeric(18,2),
  valor_pago         numeric(18,2),
  saldo_remanescente numeric(18,2),

  -- Situação fatura
  status_fatura      text,
  status_cobranca    text,
  tipo_debito        text,
  parcelamento       boolean,
  numero_parcela     integer,
  quantidade_parcelas integer,

  -- Situação UC
  situacao_uc_codigo             text,
  situacao_uc_descricao_snapshot text,
  situacao_fornecimento          text,
  data_situacao_uc               date,

  -- Classe
  classe_codigo                  text,
  classe_descricao_snapshot      text,
  grupo_classe_snapshot          text,
  subclasse_codigo               text,
  subclasse_descricao_snapshot   text,

  -- Município/localidade
  municipio_codigo               text,
  municipio_nome_snapshot        text,
  uf                             text,
  codigo_ibge                    text,
  regional_codigo                text,
  regional_nome_snapshot         text,
  localidade_codigo              text,
  localidade_nome_snapshot       text,

  -- Conta contábil
  conta_contabil_codigo            text,
  conta_contabil_descricao_snapshot text,
  grupo_contabil                   text,

  -- Rastreabilidade
  linha_arquivo  integer,
  linha_original jsonb,
  hash_linha     text,
  observacao     text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pfai_proc        ON public.procedimento_faturas_aberto_itens(procedimento_auxiliar_id);
CREATE INDEX IF NOT EXISTS idx_pfai_lote        ON public.procedimento_faturas_aberto_itens(lote_importacao_id);
CREATE INDEX IF NOT EXISTS idx_pfai_cliente     ON public.procedimento_faturas_aberto_itens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pfai_trabalho    ON public.procedimento_faturas_aberto_itens(trabalho_auditoria_id);
CREATE INDEX IF NOT EXISTS idx_pfai_uc          ON public.procedimento_faturas_aberto_itens(uc);
CREATE INDEX IF NOT EXISTS idx_pfai_fatura      ON public.procedimento_faturas_aberto_itens(numero_fatura);
CREATE INDEX IF NOT EXISTS idx_pfai_documento   ON public.procedimento_faturas_aberto_itens(numero_documento);
CREATE INDEX IF NOT EXISTS idx_pfai_venc        ON public.procedimento_faturas_aberto_itens(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_pfai_anomes      ON public.procedimento_faturas_aberto_itens(ano_mes_faturamento);
CREATE INDEX IF NOT EXISTS idx_pfai_classe      ON public.procedimento_faturas_aberto_itens(classe_codigo);
CREATE INDEX IF NOT EXISTS idx_pfai_municipio   ON public.procedimento_faturas_aberto_itens(municipio_codigo);
CREATE INDEX IF NOT EXISTS idx_pfai_situacao    ON public.procedimento_faturas_aberto_itens(situacao_fornecimento);
CREATE INDEX IF NOT EXISTS idx_pfai_contacont   ON public.procedimento_faturas_aberto_itens(conta_contabil_codigo);

DROP TRIGGER IF EXISTS trg_upd_pfai ON public.procedimento_faturas_aberto_itens;
CREATE TRIGGER trg_upd_pfai BEFORE UPDATE ON public.procedimento_faturas_aberto_itens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 5) RLS — alinhado ao padrão do projeto
-- ------------------------------------------------------------
ALTER TABLE public.cliente_classes_faturamento        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_municipios_faturamento     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimento_faturas_aberto_lotes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimento_faturas_aberto_itens  ENABLE ROW LEVEL SECURITY;

-- Classes (cadastro auxiliar do cliente — auditores internos)
CREATE POLICY select_ccf ON public.cliente_classes_faturamento
  FOR SELECT TO authenticated
  USING ( (NOT public.is_cliente_usuario())
          OR cliente_id = public.get_cliente_usuario_cliente_id() );
CREATE POLICY insert_ccf ON public.cliente_classes_faturamento
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_admin() OR ((NOT public.is_cliente_usuario())
                                     AND cliente_id IN (SELECT public.get_accessible_cliente_ids())) );
CREATE POLICY update_ccf ON public.cliente_classes_faturamento
  FOR UPDATE TO authenticated
  USING ( public.is_admin() OR ((NOT public.is_cliente_usuario())
                                AND cliente_id IN (SELECT public.get_accessible_cliente_ids())) )
  WITH CHECK ( public.is_admin() OR ((NOT public.is_cliente_usuario())
                                     AND cliente_id IN (SELECT public.get_accessible_cliente_ids())) );
CREATE POLICY delete_ccf ON public.cliente_classes_faturamento
  FOR DELETE TO authenticated USING ( public.is_admin() );

-- Municípios
CREATE POLICY select_cmf ON public.cliente_municipios_faturamento
  FOR SELECT TO authenticated
  USING ( (NOT public.is_cliente_usuario())
          OR cliente_id = public.get_cliente_usuario_cliente_id() );
CREATE POLICY insert_cmf ON public.cliente_municipios_faturamento
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_admin() OR ((NOT public.is_cliente_usuario())
                                     AND cliente_id IN (SELECT public.get_accessible_cliente_ids())) );
CREATE POLICY update_cmf ON public.cliente_municipios_faturamento
  FOR UPDATE TO authenticated
  USING ( public.is_admin() OR ((NOT public.is_cliente_usuario())
                                AND cliente_id IN (SELECT public.get_accessible_cliente_ids())) )
  WITH CHECK ( public.is_admin() OR ((NOT public.is_cliente_usuario())
                                     AND cliente_id IN (SELECT public.get_accessible_cliente_ids())) );
CREATE POLICY delete_cmf ON public.cliente_municipios_faturamento
  FOR DELETE TO authenticated USING ( public.is_admin() );

-- Lotes
CREATE POLICY select_pfal ON public.procedimento_faturas_aberto_lotes
  FOR SELECT TO authenticated
  USING ( (NOT public.is_cliente_usuario()) OR cliente_id = public.get_cliente_usuario_cliente_id() );
CREATE POLICY insert_pfal ON public.procedimento_faturas_aberto_lotes
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_admin() OR ((NOT public.is_cliente_usuario())
               AND (trabalho_auditoria_id IS NULL
                    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))) );
CREATE POLICY update_pfal ON public.procedimento_faturas_aberto_lotes
  FOR UPDATE TO authenticated
  USING ( public.is_admin() OR ((NOT public.is_cliente_usuario())
           AND (trabalho_auditoria_id IS NULL
                OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))) )
  WITH CHECK ( public.is_admin() OR ((NOT public.is_cliente_usuario())
                AND (trabalho_auditoria_id IS NULL
                     OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))) );
CREATE POLICY delete_pfal ON public.procedimento_faturas_aberto_lotes
  FOR DELETE TO authenticated USING ( public.is_admin() );

-- Itens
CREATE POLICY select_pfai ON public.procedimento_faturas_aberto_itens
  FOR SELECT TO authenticated
  USING ( (NOT public.is_cliente_usuario()) OR cliente_id = public.get_cliente_usuario_cliente_id() );
CREATE POLICY insert_pfai ON public.procedimento_faturas_aberto_itens
  FOR INSERT TO authenticated
  WITH CHECK ( public.is_admin() OR ((NOT public.is_cliente_usuario())
               AND (trabalho_auditoria_id IS NULL
                    OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))) );
CREATE POLICY update_pfai ON public.procedimento_faturas_aberto_itens
  FOR UPDATE TO authenticated
  USING ( public.is_admin() OR ((NOT public.is_cliente_usuario())
           AND (trabalho_auditoria_id IS NULL
                OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))) )
  WITH CHECK ( public.is_admin() OR ((NOT public.is_cliente_usuario())
                AND (trabalho_auditoria_id IS NULL
                     OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))) );
CREATE POLICY delete_pfai ON public.procedimento_faturas_aberto_itens
  FOR DELETE TO authenticated USING ( public.is_admin() );

-- ------------------------------------------------------------
-- FIM
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
