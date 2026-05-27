-- =============================================================================
--  FASE 0A.3.1.1 — TABELA: public.modalidades_atuacao
-- =============================================================================
--  Objetivo: criar tabela filha de public.segmentos para representar
--  modalidades específicas dentro de cada segmento.
--
--  Exemplos:
--   - Setor Elétrico → Distribuição Permissionária / Cooperativa
--   - Setor Elétrico → Geração
--   - Setor Elétrico → Transmissão
--   - Cooperativa de Crédito → Cooperativa Singular
--   - Agropecuário → Armazenagem
--
--  NÃO DESTRUTIVO: cria APENAS a tabela modalidades_atuacao.
--  Nenhuma tabela existente é alterada.
--
--  EXECUTAR MANUALMENTE NO SQL EDITOR DO SUPABASE EXTERNO.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASSO 1 — CRIAR TABELA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modalidades_atuacao (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  segmento_id   uuid        NOT NULL REFERENCES public.segmentos(id)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
  codigo        text        NOT NULL,
  nome          text        NOT NULL,
  descricao     text,
  ordem         integer     NOT NULL DEFAULT 0,
  ativo         boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- Constraints de domínio
  CONSTRAINT chk_modalidades_codigo_preenchido CHECK (length(btrim(codigo)) > 0),
  CONSTRAINT chk_modalidades_nome_preenchido   CHECK (length(btrim(nome)) > 0),
  CONSTRAINT chk_modalidades_ordem_nao_negativa  CHECK (ordem >= 0)
);

-- -----------------------------------------------------------------------------
-- PASSO 2 — ÍNDICES
-- -----------------------------------------------------------------------------
-- Índice de FK para JOINs com segmentos
CREATE INDEX IF NOT EXISTS idx_modalidades_atuacao_segmento
  ON public.modalidades_atuacao (segmento_id);

-- Índice para filtros de ativo
CREATE INDEX IF NOT EXISTS idx_modalidades_atuacao_ativo
  ON public.modalidades_atuacao (ativo);

-- Índice para listagem ordenada por segmento, ativo, ordem e nome
CREATE INDEX IF NOT EXISTS idx_modalidades_atuacao_listagem
  ON public.modalidades_atuacao (segmento_id, ativo DESC, ordem, nome);

-- Índice único: código não pode se repetir dentro do mesmo segmento
CREATE UNIQUE INDEX IF NOT EXISTS idx_modalidades_atuacao_segmento_codigo
  ON public.modalidades_atuacao (segmento_id, lower(btrim(codigo)));

-- -----------------------------------------------------------------------------
-- PASSO 3 — TRIGGER updated_at
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_modalidades_atuacao_updated_at ON public.modalidades_atuacao;

CREATE TRIGGER update_modalidades_atuacao_updated_at
  BEFORE UPDATE ON public.modalidades_atuacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- PASSO 4 — PERMISSÕES (GRANT)
-- -----------------------------------------------------------------------------
-- Revogar acesso de anon (segurança padrão)
REVOKE ALL ON public.modalidades_atuacao FROM anon;

-- Conceder operações a authenticated (camada efetiva é o RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modalidades_atuacao TO authenticated;

-- Conceder tudo a service_role (edge functions / admin backend)
GRANT ALL ON public.modalidades_atuacao TO service_role;

-- -----------------------------------------------------------------------------
-- PASSO 5 — RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.modalidades_atuacao ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário autenticado pode ler
DROP POLICY IF EXISTS select_modalidades_atuacao ON public.modalidades_atuacao;
CREATE POLICY select_modalidades_atuacao ON public.modalidades_atuacao
  FOR SELECT TO authenticated USING (true);

-- INSERT: apenas administradores
DROP POLICY IF EXISTS insert_modalidades_atuacao ON public.modalidades_atuacao;
CREATE POLICY insert_modalidades_atuacao ON public.modalidades_atuacao
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- UPDATE: apenas administradores
DROP POLICY IF EXISTS update_modalidades_atuacao ON public.modalidades_atuacao;
CREATE POLICY update_modalidades_atuacao ON public.modalidades_atuacao
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- DELETE: apenas administradores (interface futura não deve expor exclusão)
DROP POLICY IF EXISTS delete_modalidades_atuacao ON public.modalidades_atuacao;
CREATE POLICY delete_modalidades_atuacao ON public.modalidades_atuacao
  FOR DELETE TO authenticated USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- PASSO 6 — RECARREGAR CACHE DO POSTGREST
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
--  FIM DO SCRIPT
-- =============================================================================
-- Pós-execução: descomente e execute os blocos abaixo para validar.
-- =============================================================================

-- 1. Verificar existência da tabela
-- SELECT to_regclass('public.modalidades_atuacao') AS tabela_existe;

-- 2. Verificar colunas
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'modalidades_atuacao'
-- ORDER BY ordinal_position;

-- 3. Verificar constraints
-- SELECT conname AS constraint_name, pg_get_constraintdef(oid) AS def
-- FROM pg_constraint
-- WHERE conrelid = 'public.modalidades_atuacao'::regclass
-- ORDER BY contype, conname;

-- 4. Verificar índices
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public' AND tablename = 'modalidades_atuacao'
-- ORDER BY indexname;

-- 5. Verificar RLS habilitado
-- SELECT relname, relrowsecurity, relforcerowsecurity
-- FROM pg_class
-- WHERE oid = 'public.modalidades_atuacao'::regclass;

-- 6. Verificar policies
-- SELECT policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'modalidades_atuacao'
-- ORDER BY policyname;

-- 7. Verificar trigger updated_at
-- SELECT event_object_table, trigger_name, action_timing,
--        event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND event_object_table = 'modalidades_atuacao'
-- ORDER BY trigger_name;
