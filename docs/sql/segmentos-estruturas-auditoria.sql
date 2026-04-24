-- =============================================================================
--  EVOLUÇÃO ARQUITETURAL: SEGMENTOS + ESTRUTURAS DE AUDITORIA
-- =============================================================================
--  Objetivo: criar uma camada de abstração ACIMA do MCSE para suportar
--  múltiplos segmentos (setor elétrico, cooperativas, agro etc.) e múltiplas
--  estruturas de referência (MCSE, COSIF, PLANO_AGRO, ...).
--
--  Princípios:
--   - 100% não destrutivo: nada é apagado, renomeado ou bloqueado
--   - MCSE continua funcionando exatamente como hoje
--   - Apenas adiciona NOVAS tabelas e NOVAS colunas opcionais (nullable)
--   - Vínculos legados são preenchidos via backfill automático
--
--  EXECUTAR MANUALMENTE NO SQL EDITOR DO SUPABASE.
--  Recomenda-se rodar dentro de uma transação para revisão prévia.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASSO 1 — TABELA: segmentos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.segmentos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      text        NOT NULL UNIQUE,
  nome        text        NOT NULL,
  descricao   text,
  ativo       boolean     NOT NULL DEFAULT true,
  ordem       integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_segmentos_codigo ON public.segmentos (codigo);
CREATE INDEX IF NOT EXISTS idx_segmentos_ativo  ON public.segmentos (ativo);

-- Trigger updated_at (reaproveita função já existente no projeto)
DROP TRIGGER IF EXISTS update_segmentos_updated_at ON public.segmentos;
CREATE TRIGGER update_segmentos_updated_at
  BEFORE UPDATE ON public.segmentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS no padrão do sistema (leitura aberta a autenticados, escrita só admin)
ALTER TABLE public.segmentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_segmentos ON public.segmentos;
DROP POLICY IF EXISTS insert_segmentos ON public.segmentos;
DROP POLICY IF EXISTS update_segmentos ON public.segmentos;
DROP POLICY IF EXISTS delete_segmentos ON public.segmentos;

CREATE POLICY select_segmentos ON public.segmentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_segmentos ON public.segmentos
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY update_segmentos ON public.segmentos
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY delete_segmentos ON public.segmentos
  FOR DELETE TO authenticated USING (public.is_admin());

-- Seed inicial
INSERT INTO public.segmentos (codigo, nome, descricao, ordem) VALUES
  ('setor_eletrico',      'Setor Elétrico',         'Concessionárias, geradoras, transmissoras e distribuidoras de energia (MCSE).', 1),
  ('cooperativa_credito', 'Cooperativa de Crédito', 'Cooperativas singulares e centrais (COSIF / BACEN).',                            2),
  ('agropecuario',        'Agropecuário',           'Empresas e cooperativas do agronegócio.',                                        3)
ON CONFLICT (codigo) DO NOTHING;


-- -----------------------------------------------------------------------------
-- PASSO 2 — TABELA: estruturas_auditoria
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estruturas_auditoria (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  segmento_id       uuid        NOT NULL REFERENCES public.segmentos(id) ON DELETE RESTRICT,
  codigo            text        NOT NULL UNIQUE,
  nome              text        NOT NULL,
  descricao         text,
  estrutura_origem  text,        -- ex.: MCSE, COSIF, PLANO_AGRO
  ativo             boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estruturas_segmento ON public.estruturas_auditoria (segmento_id);
CREATE INDEX IF NOT EXISTS idx_estruturas_codigo   ON public.estruturas_auditoria (codigo);
CREATE INDEX IF NOT EXISTS idx_estruturas_ativo    ON public.estruturas_auditoria (ativo);

DROP TRIGGER IF EXISTS update_estruturas_auditoria_updated_at ON public.estruturas_auditoria;
CREATE TRIGGER update_estruturas_auditoria_updated_at
  BEFORE UPDATE ON public.estruturas_auditoria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.estruturas_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_estruturas_auditoria ON public.estruturas_auditoria;
DROP POLICY IF EXISTS insert_estruturas_auditoria ON public.estruturas_auditoria;
DROP POLICY IF EXISTS update_estruturas_auditoria ON public.estruturas_auditoria;
DROP POLICY IF EXISTS delete_estruturas_auditoria ON public.estruturas_auditoria;

CREATE POLICY select_estruturas_auditoria ON public.estruturas_auditoria
  FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_estruturas_auditoria ON public.estruturas_auditoria
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY update_estruturas_auditoria ON public.estruturas_auditoria
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY delete_estruturas_auditoria ON public.estruturas_auditoria
  FOR DELETE TO authenticated USING (public.is_admin());

-- Seed: MCSE como primeira estrutura, vinculada ao setor elétrico
INSERT INTO public.estruturas_auditoria (segmento_id, codigo, nome, descricao, estrutura_origem)
SELECT s.id, 'MCSE', 'Manual de Contabilidade do Setor Elétrico',
       'Estrutura de referência para auditoria de empresas reguladas pela ANEEL.',
       'MCSE'
FROM public.segmentos s
WHERE s.codigo = 'setor_eletrico'
ON CONFLICT (codigo) DO NOTHING;


-- -----------------------------------------------------------------------------
-- PASSO 4 — VÍNCULO: clientes -> segmentos
-- -----------------------------------------------------------------------------
-- Adiciona coluna NULLABLE para permitir convivência com registros antigos.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS segmento_id uuid REFERENCES public.segmentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_segmento_id ON public.clientes (segmento_id);

-- Backfill seguro: clientes existentes com segmento legado 'setor_eletrico'
-- recebem o vínculo correspondente. Demais permanecem NULL para revisão manual.
UPDATE public.clientes c
SET segmento_id = s.id
FROM public.segmentos s
WHERE c.segmento_id IS NULL
  AND s.codigo = 'setor_eletrico'
  AND c.segmento::text = 'setor_eletrico';


-- -----------------------------------------------------------------------------
-- PASSO 5 — VÍNCULO: produtos_auditoria -> segmentos
-- -----------------------------------------------------------------------------
ALTER TABLE public.produtos_auditoria
  ADD COLUMN IF NOT EXISTS segmento_id uuid REFERENCES public.segmentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_segmento_id ON public.produtos_auditoria (segmento_id);

-- Backfill: mapeia o ENUM atual `segmento` para a nova FK
UPDATE public.produtos_auditoria p
SET segmento_id = s.id
FROM public.segmentos s
WHERE p.segmento_id IS NULL
  AND (
    (p.segmento::text = 'setor_eletrico'      AND s.codigo = 'setor_eletrico')
    OR (p.segmento::text = 'cooperativas_credito' AND s.codigo = 'cooperativa_credito')
    -- demais valores do ENUM antigo permanecem NULL e podem ser revisados manualmente
  );


-- -----------------------------------------------------------------------------
-- PASSO 6 — ABSTRAÇÃO INCREMENTAL DAS TABELAS MCSE
-- -----------------------------------------------------------------------------
-- Estratégia escolhida (NÃO destrutiva):
--   1. Adiciona coluna `estrutura_id` (nullable) nas tabelas-mãe MCSE.
--   2. Faz backfill apontando todos os registros atuais para a estrutura 'MCSE'.
--   3. NÃO adiciona NOT NULL — permite convivência com novas estruturas
--      sendo cadastradas progressivamente.
--   4. Tabelas filhas (regras_documentos, regras_instrucoes, regras_emissao_erp)
--      NÃO recebem a coluna agora — herdam a estrutura via JOIN com a tabela-mãe.
--      Isso evita propagação desnecessária de FKs.
-- -----------------------------------------------------------------------------

-- mcse_grupos
ALTER TABLE public.mcse_grupos
  ADD COLUMN IF NOT EXISTS estrutura_id uuid REFERENCES public.estruturas_auditoria(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mcse_grupos_estrutura ON public.mcse_grupos (estrutura_id);

-- mcse_subgrupos
ALTER TABLE public.mcse_subgrupos
  ADD COLUMN IF NOT EXISTS estrutura_id uuid REFERENCES public.estruturas_auditoria(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mcse_subgrupos_estrutura ON public.mcse_subgrupos (estrutura_id);

-- mcse_contas
ALTER TABLE public.mcse_contas
  ADD COLUMN IF NOT EXISTS estrutura_id uuid REFERENCES public.estruturas_auditoria(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mcse_contas_estrutura ON public.mcse_contas (estrutura_id);

-- mcse_regras_conta
ALTER TABLE public.mcse_regras_conta
  ADD COLUMN IF NOT EXISTS estrutura_id uuid REFERENCES public.estruturas_auditoria(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mcse_regras_estrutura ON public.mcse_regras_conta (estrutura_id);

-- Backfill: toda base atual passa a apontar para a estrutura MCSE
WITH mcse AS (
  SELECT id FROM public.estruturas_auditoria WHERE codigo = 'MCSE' LIMIT 1
)
UPDATE public.mcse_grupos       SET estrutura_id = (SELECT id FROM mcse) WHERE estrutura_id IS NULL;

WITH mcse AS (
  SELECT id FROM public.estruturas_auditoria WHERE codigo = 'MCSE' LIMIT 1
)
UPDATE public.mcse_subgrupos    SET estrutura_id = (SELECT id FROM mcse) WHERE estrutura_id IS NULL;

WITH mcse AS (
  SELECT id FROM public.estruturas_auditoria WHERE codigo = 'MCSE' LIMIT 1
)
UPDATE public.mcse_contas       SET estrutura_id = (SELECT id FROM mcse) WHERE estrutura_id IS NULL;

WITH mcse AS (
  SELECT id FROM public.estruturas_auditoria WHERE codigo = 'MCSE' LIMIT 1
)
UPDATE public.mcse_regras_conta SET estrutura_id = (SELECT id FROM mcse) WHERE estrutura_id IS NULL;


-- -----------------------------------------------------------------------------
-- Recarrega cache do PostgREST (necessário no Supabase para reconhecer schema)
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- FIM DA MIGRAÇÃO
-- =============================================================================
-- Pós-execução recomendada:
--   1. Verificar contagem de registros em segmentos e estruturas_auditoria.
--   2. Conferir que TODOS os mcse_* têm estrutura_id preenchida.
--   3. Revisar manualmente clientes/produtos com segmento_id NULL
--      (segmentos legados que não tinham equivalente direto).
--   4. Em fases futuras: tornar estrutura_id NOT NULL após validação completa.
-- =============================================================================
