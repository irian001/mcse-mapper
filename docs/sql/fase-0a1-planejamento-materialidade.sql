-- ============================================================
-- FASE 0A.1 — ESTRUTURA BASE DE PLANEJAMENTO E MATERIALIDADE
-- Execute MANUALMENTE no Supabase externo (SQL Editor).
-- NÃO executar via Lovable Cloud.
--
-- Este script é incremental e idempotente sempre que possível.
-- Não altera tabelas existentes (trabalhos_auditoria, PTAs,
-- procedimentos auxiliares, solicitações, portal do cliente).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) TABELA: trabalho_planejamento
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trabalho_planejamento (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabalho_auditoria_id       uuid NOT NULL REFERENCES public.trabalhos_auditoria(id) ON DELETE CASCADE,
  cliente_id                  uuid NOT NULL REFERENCES public.clientes(id)            ON DELETE RESTRICT,
  exercicio_id                uuid REFERENCES public.exercicios(id)                   ON DELETE SET NULL,

  objetivo_geral_auditoria    text,
  escopo_resumido             text,
  estrategia_resumida         text,

  equipe_responsavel_id       uuid REFERENCES public.auditores(id) ON DELETE SET NULL,

  status_planejamento         text NOT NULL DEFAULT 'rascunho',

  aprovado_por                uuid REFERENCES public.auditores(id) ON DELETE SET NULL,
  data_aprovacao              timestamptz,

  premissas_relevantes        text,
  limitacoes_escopo           text,
  observacoes                 text,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_tp_status
    CHECK (status_planejamento IN ('rascunho','aprovado'))
);

-- Apenas um planejamento por trabalho nesta fase
CREATE UNIQUE INDEX IF NOT EXISTS uq_trabalho_planejamento_trabalho
  ON public.trabalho_planejamento(trabalho_auditoria_id);

CREATE INDEX IF NOT EXISTS idx_tp_trabalho   ON public.trabalho_planejamento(trabalho_auditoria_id);
CREATE INDEX IF NOT EXISTS idx_tp_cliente    ON public.trabalho_planejamento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tp_exercicio  ON public.trabalho_planejamento(exercicio_id);
CREATE INDEX IF NOT EXISTS idx_tp_status     ON public.trabalho_planejamento(status_planejamento);


-- ------------------------------------------------------------
-- 2) TABELA: trabalho_materialidade
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trabalho_materialidade (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabalho_auditoria_id         uuid NOT NULL REFERENCES public.trabalhos_auditoria(id) ON DELETE CASCADE,
  cliente_id                    uuid NOT NULL REFERENCES public.clientes(id)            ON DELETE RESTRICT,
  exercicio_id                  uuid REFERENCES public.exercicios(id)                   ON DELETE SET NULL,

  base_calculo                  text NOT NULL,
  percentual_aplicado           numeric(10,4),
  materialidade_global          numeric(18,2),
  materialidade_desempenho      numeric(18,2),
  limite_trivialidade           numeric(18,2),

  justificativa_tecnica         text,
  responsavel_definicao_id      uuid REFERENCES public.auditores(id) ON DELETE SET NULL,

  status_materialidade          text NOT NULL DEFAULT 'rascunho',

  aprovado_por                  uuid REFERENCES public.auditores(id) ON DELETE SET NULL,
  data_aprovacao                timestamptz,

  versao                        integer NOT NULL DEFAULT 1,
  -- vigente nasce false; vira true apenas quando a versão é aprovada
  vigente                       boolean NOT NULL DEFAULT false,

  materialidade_especifica_json jsonb,
  observacoes                   text,
  motivo_nova_versao            text,

  -- Auto-referência (declarada após criação para suportar IF NOT EXISTS)
  materialidade_anterior_id     uuid,

  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_tm_status
    CHECK (status_materialidade IN ('rascunho','aprovada','substituida')),

  -- Constraints tolerantes a NULL: rascunhos podem não ter valores.
  CONSTRAINT chk_tm_global_pos
    CHECK (materialidade_global IS NULL OR materialidade_global > 0),
  CONSTRAINT chk_tm_desempenho_pos
    CHECK (materialidade_desempenho IS NULL OR materialidade_desempenho > 0),
  CONSTRAINT chk_tm_trivialidade_nn
    CHECK (limite_trivialidade IS NULL OR limite_trivialidade >= 0),
  CONSTRAINT chk_tm_desempenho_le_global
    CHECK (
      materialidade_global IS NULL
      OR materialidade_desempenho IS NULL
      OR materialidade_desempenho <= materialidade_global
    ),

  -- Coerência vigente x status: só pode estar vigente se aprovada
  CONSTRAINT chk_tm_vigente_requer_aprovada
    CHECK (vigente = false OR status_materialidade = 'aprovada')
);

-- Auto-referência adicionada via ALTER (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tm_materialidade_anterior'
  ) THEN
    ALTER TABLE public.trabalho_materialidade
      ADD CONSTRAINT fk_tm_materialidade_anterior
      FOREIGN KEY (materialidade_anterior_id)
      REFERENCES public.trabalho_materialidade(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Apenas UMA materialidade APROVADA e VIGENTE por trabalho.
-- Permite múltiplas versões em rascunho ou substituidas em paralelo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tm_aprovada_vigente_por_trabalho
  ON public.trabalho_materialidade(trabalho_auditoria_id)
  WHERE vigente = true AND status_materialidade = 'aprovada';

-- NOTA: o índice antigo uq_tm_vigente_por_trabalho (WHERE vigente = true)
-- foi intencionalmente removido para suportar o fluxo de versionamento:
--   rascunho (vigente=false) -> aprovada/vigente=true ->
--   nova versão rascunho (vigente=false) -> ao aprovar, anterior vira
--   substituida/vigente=false e nova vira aprovada/vigente=true.

-- COERÊNCIA cliente_id / exercicio_id / trabalho_auditoria_id:
-- Nesta fase, a consistência entre esses três campos é responsabilidade
-- da APLICAÇÃO (camada de serviço/UI ao criar/atualizar registros).
-- Uma trigger de validação cruzada poderá ser adicionada em fase futura,
-- caso necessário, sem impacto neste DDL.

CREATE INDEX IF NOT EXISTS idx_tm_trabalho   ON public.trabalho_materialidade(trabalho_auditoria_id);
CREATE INDEX IF NOT EXISTS idx_tm_cliente    ON public.trabalho_materialidade(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tm_exercicio  ON public.trabalho_materialidade(exercicio_id);
CREATE INDEX IF NOT EXISTS idx_tm_status     ON public.trabalho_materialidade(status_materialidade);
CREATE INDEX IF NOT EXISTS idx_tm_vigente    ON public.trabalho_materialidade(vigente);
CREATE INDEX IF NOT EXISTS idx_tm_versao     ON public.trabalho_materialidade(versao);


-- ------------------------------------------------------------
-- 3) TRIGGERS updated_at
-- Reaproveita public.update_updated_at_column() (já existente no projeto)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_upd_trabalho_planejamento  ON public.trabalho_planejamento;
CREATE TRIGGER trg_upd_trabalho_planejamento
  BEFORE UPDATE ON public.trabalho_planejamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_upd_trabalho_materialidade ON public.trabalho_materialidade;
CREATE TRIGGER trg_upd_trabalho_materialidade
  BEFORE UPDATE ON public.trabalho_materialidade
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ------------------------------------------------------------
-- 4) RLS
-- Padrão do projeto:
--   - SELECT/INSERT/UPDATE: admin OU (não cliente_usuario E trabalho acessível)
--   - DELETE: somente admin
--   - cliente_usuario NÃO tem acesso nesta fase
-- Funções presumidas (já existentes neste projeto):
--   public.is_admin()
--   public.is_cliente_usuario()
--   public.get_accessible_trabalho_ids()
-- ------------------------------------------------------------

ALTER TABLE public.trabalho_planejamento  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabalho_materialidade ENABLE ROW LEVEL SECURITY;

-- ----- trabalho_planejamento -----
DROP POLICY IF EXISTS select_trabalho_planejamento ON public.trabalho_planejamento;
DROP POLICY IF EXISTS insert_trabalho_planejamento ON public.trabalho_planejamento;
DROP POLICY IF EXISTS update_trabalho_planejamento ON public.trabalho_planejamento;
DROP POLICY IF EXISTS delete_trabalho_planejamento ON public.trabalho_planejamento;

CREATE POLICY select_trabalho_planejamento ON public.trabalho_planejamento
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (
      NOT is_cliente_usuario()
      AND trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
    )
  );

CREATE POLICY insert_trabalho_planejamento ON public.trabalho_planejamento
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (
      NOT is_cliente_usuario()
      AND trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
    )
  );

CREATE POLICY update_trabalho_planejamento ON public.trabalho_planejamento
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

CREATE POLICY delete_trabalho_planejamento ON public.trabalho_planejamento
  FOR DELETE TO authenticated
  USING (is_admin());

-- ----- trabalho_materialidade -----
DROP POLICY IF EXISTS select_trabalho_materialidade ON public.trabalho_materialidade;
DROP POLICY IF EXISTS insert_trabalho_materialidade ON public.trabalho_materialidade;
DROP POLICY IF EXISTS update_trabalho_materialidade ON public.trabalho_materialidade;
DROP POLICY IF EXISTS delete_trabalho_materialidade ON public.trabalho_materialidade;

CREATE POLICY select_trabalho_materialidade ON public.trabalho_materialidade
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (
      NOT is_cliente_usuario()
      AND trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
    )
  );

CREATE POLICY insert_trabalho_materialidade ON public.trabalho_materialidade
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (
      NOT is_cliente_usuario()
      AND trabalho_auditoria_id IN (SELECT get_accessible_trabalho_ids())
    )
  );

CREATE POLICY update_trabalho_materialidade ON public.trabalho_materialidade
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

CREATE POLICY delete_trabalho_materialidade ON public.trabalho_materialidade
  FOR DELETE TO authenticated
  USING (is_admin());


-- ------------------------------------------------------------
-- 5) Recarrega cache do PostgREST
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- FIM
-- ============================================================
