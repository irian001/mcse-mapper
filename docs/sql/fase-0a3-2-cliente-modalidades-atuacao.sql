-- =============================================================================
--  FASE 0A.3.2.1 — TABELA: public.cliente_modalidades_atuacao
-- =============================================================================
--  Objetivo: vincular um cliente a uma ou mais modalidades de atuação dentro
--  do segmento atual do cliente, com suporte a modalidade principal e
--  rastreabilidade (inativação lógica em vez de exclusão).
--
--  Pré-condições já existentes no banco:
--    - public.segmentos
--    - public.modalidades_atuacao (FK -> segmentos)
--    - public.clientes (com coluna segmento_id preenchida e referenciada)
--    - public.is_admin()
--    - public.is_cliente_usuario()
--    - public.update_updated_at_column()
--
--  NÃO DESTRUTIVO: cria apenas a nova tabela, função RPC e triggers
--  associadas. Nenhuma tabela existente é alterada estruturalmente;
--  apenas um trigger de proteção é adicionado em public.clientes para
--  bloquear mudanças incoerentes de segmento_id.
--
--  EXECUTAR MANUALMENTE NO SQL EDITOR DO SUPABASE EXTERNO.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PASSO 1 — CRIAR TABELA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cliente_modalidades_atuacao (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id              uuid        NOT NULL,
  modalidade_atuacao_id   uuid        NOT NULL,
  principal               boolean     NOT NULL DEFAULT false,
  ativo                   boolean     NOT NULL DEFAULT true,
  observacoes             text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- PASSO 2 — FOREIGN KEYS (idempotentes)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_cli_modalidades_cliente'
      AND conrelid = 'public.cliente_modalidades_atuacao'::regclass
  ) THEN
    ALTER TABLE public.cliente_modalidades_atuacao
      ADD CONSTRAINT fk_cli_modalidades_cliente
      FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_cli_modalidades_modalidade'
      AND conrelid = 'public.cliente_modalidades_atuacao'::regclass
  ) THEN
    ALTER TABLE public.cliente_modalidades_atuacao
      ADD CONSTRAINT fk_cli_modalidades_modalidade
      FOREIGN KEY (modalidade_atuacao_id) REFERENCES public.modalidades_atuacao(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  -- CHECK: principal só pode ser true se ativo for true
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_cli_modalidades_principal_ativo'
      AND conrelid = 'public.cliente_modalidades_atuacao'::regclass
  ) THEN
    ALTER TABLE public.cliente_modalidades_atuacao
      ADD CONSTRAINT chk_cli_modalidades_principal_ativo
      CHECK (principal = false OR ativo = true);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PASSO 3 — ÍNDICES
-- -----------------------------------------------------------------------------
-- Unicidade do vínculo cliente x modalidade (independente de ativo).
-- Reativação deve ser via UPDATE, não novo INSERT.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cli_modalidades_cliente_modalidade
  ON public.cliente_modalidades_atuacao (cliente_id, modalidade_atuacao_id);

-- Apenas uma modalidade principal ativa por cliente
CREATE UNIQUE INDEX IF NOT EXISTS uq_cli_modalidades_principal_ativa
  ON public.cliente_modalidades_atuacao (cliente_id)
  WHERE principal = true AND ativo = true;

CREATE INDEX IF NOT EXISTS idx_cli_modalidades_cliente
  ON public.cliente_modalidades_atuacao (cliente_id);

CREATE INDEX IF NOT EXISTS idx_cli_modalidades_modalidade
  ON public.cliente_modalidades_atuacao (modalidade_atuacao_id);

CREATE INDEX IF NOT EXISTS idx_cli_modalidades_cliente_ativo
  ON public.cliente_modalidades_atuacao (cliente_id, ativo);

CREATE INDEX IF NOT EXISTS idx_cli_modalidades_cliente_principal_ativo
  ON public.cliente_modalidades_atuacao (cliente_id, principal, ativo);

-- -----------------------------------------------------------------------------
-- PASSO 4 — TRIGGER updated_at
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_cliente_modalidades_atuacao_updated_at
  ON public.cliente_modalidades_atuacao;

CREATE TRIGGER update_cliente_modalidades_atuacao_updated_at
  BEFORE UPDATE ON public.cliente_modalidades_atuacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- PASSO 5 — VALIDAÇÃO DE COERÊNCIA cliente.segmento_id × modalidade.segmento_id
-- -----------------------------------------------------------------------------
-- Observação de segurança: SECURITY DEFINER com SET search_path = ''.
-- Toda referência a objetos é qualificada com o schema public para evitar
-- captura de search_path por schemas hostis.
CREATE OR REPLACE FUNCTION public.validar_coerencia_cliente_modalidade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cliente_segmento_id    uuid;
  v_modalidade_segmento_id uuid;
  v_modalidade_ativa       boolean;
BEGIN
  -- Permite inativação mesmo em caso de inconsistência preexistente
  IF NEW.ativo = false THEN
    RETURN NEW;
  END IF;

  SELECT c.segmento_id INTO v_cliente_segmento_id
  FROM public.clientes c
  WHERE c.id = NEW.cliente_id;

  IF v_cliente_segmento_id IS NULL THEN
    RAISE EXCEPTION 'O cliente não possui segmento definido. Defina o segmento antes de vincular modalidades.';
  END IF;

  SELECT m.segmento_id, m.ativo
    INTO v_modalidade_segmento_id, v_modalidade_ativa
  FROM public.modalidades_atuacao m
  WHERE m.id = NEW.modalidade_atuacao_id;

  IF v_modalidade_segmento_id IS NULL THEN
    RAISE EXCEPTION 'Modalidade de atuação inválida ou sem segmento associado.';
  END IF;

  IF v_cliente_segmento_id <> v_modalidade_segmento_id THEN
    RAISE EXCEPTION 'A modalidade selecionada não pertence ao segmento atual do cliente.';
  END IF;

  -- Bloqueia INSERT ou reativação quando a modalidade está inativa
  IF v_modalidade_ativa IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'A modalidade selecionada está inativa e não pode ser vinculada ao cliente.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_coerencia_cliente_modalidade
  ON public.cliente_modalidades_atuacao;

CREATE TRIGGER trg_validar_coerencia_cliente_modalidade
  BEFORE INSERT OR UPDATE ON public.cliente_modalidades_atuacao
  FOR EACH ROW EXECUTE FUNCTION public.validar_coerencia_cliente_modalidade();

-- -----------------------------------------------------------------------------
-- PASSO 6 — PROTEÇÃO NA ALTERAÇÃO DE clientes.segmento_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_alteracao_segmento_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_qtde_ativas        integer;
  v_qtde_incompativeis integer;
BEGIN
  IF NEW.segmento_id IS NOT DISTINCT FROM OLD.segmento_id THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_qtde_ativas
  FROM public.cliente_modalidades_atuacao cma
  WHERE cma.cliente_id = NEW.id AND cma.ativo = true;

  IF v_qtde_ativas = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.segmento_id IS NULL THEN
    RAISE EXCEPTION 'O segmento do cliente não pode ser removido enquanto existirem modalidades ativas vinculadas. Inative as modalidades primeiro.';
  END IF;

  SELECT count(*) INTO v_qtde_incompativeis
  FROM public.cliente_modalidades_atuacao cma
  JOIN public.modalidades_atuacao m ON m.id = cma.modalidade_atuacao_id
  WHERE cma.cliente_id = NEW.id
    AND cma.ativo = true
    AND m.segmento_id <> NEW.segmento_id;

  IF v_qtde_incompativeis > 0 THEN
    RAISE EXCEPTION 'O segmento do cliente não pode ser alterado enquanto existirem modalidades ativas incompatíveis. Inative ou ajuste as modalidades primeiro.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_alteracao_segmento_cliente
  ON public.clientes;

CREATE TRIGGER trg_proteger_alteracao_segmento_cliente
  BEFORE UPDATE OF segmento_id ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.proteger_alteracao_segmento_cliente();

-- -----------------------------------------------------------------------------
-- PASSO 7 — FUNÇÃO RPC: definir modalidade principal de forma atômica
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_cliente_modalidade_principal(
  p_cliente_modalidade_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cliente_id uuid;
  v_ativo      boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente administradores podem definir a modalidade principal.';
  END IF;

  SELECT cma.cliente_id, cma.ativo
    INTO v_cliente_id, v_ativo
  FROM public.cliente_modalidades_atuacao cma
  WHERE cma.id = p_cliente_modalidade_id;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Vínculo de modalidade não encontrado.';
  END IF;

  IF v_ativo = false THEN
    RAISE EXCEPTION 'Não é possível tornar principal um vínculo inativo.';
  END IF;

  UPDATE public.cliente_modalidades_atuacao
     SET principal = false
   WHERE cliente_id = v_cliente_id
     AND id <> p_cliente_modalidade_id
     AND principal = true;

  UPDATE public.cliente_modalidades_atuacao
     SET principal = true
   WHERE id = p_cliente_modalidade_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- PASSO 8 — PERMISSÕES (GRANT)
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.cliente_modalidades_atuacao FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_modalidades_atuacao TO authenticated;
GRANT ALL ON public.cliente_modalidades_atuacao TO service_role;

REVOKE ALL ON FUNCTION public.set_cliente_modalidade_principal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_cliente_modalidade_principal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_cliente_modalidade_principal(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- PASSO 9 — RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.cliente_modalidades_atuacao ENABLE ROW LEVEL SECURITY;

-- SELECT: admin OU usuário interno (NÃO cliente externo)
DROP POLICY IF EXISTS select_cliente_modalidades ON public.cliente_modalidades_atuacao;
CREATE POLICY select_cliente_modalidades ON public.cliente_modalidades_atuacao
  FOR SELECT TO authenticated
  USING (public.is_admin() OR NOT public.is_cliente_usuario());

-- INSERT/UPDATE/DELETE: apenas admin
DROP POLICY IF EXISTS insert_cliente_modalidades ON public.cliente_modalidades_atuacao;
CREATE POLICY insert_cliente_modalidades ON public.cliente_modalidades_atuacao
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS update_cliente_modalidades ON public.cliente_modalidades_atuacao;
CREATE POLICY update_cliente_modalidades ON public.cliente_modalidades_atuacao
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS delete_cliente_modalidades ON public.cliente_modalidades_atuacao;
CREATE POLICY delete_cliente_modalidades ON public.cliente_modalidades_atuacao
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- PASSO 10 — RECARREGAR CACHE DO POSTGREST
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
--  FIM DO SCRIPT — VALIDAÇÕES PÓS-EXECUÇÃO (descomente conforme necessário)
-- =============================================================================

-- 1. Existência da tabela
-- SELECT to_regclass('public.cliente_modalidades_atuacao') AS tabela_existe;

-- 2. Colunas
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'cliente_modalidades_atuacao'
-- ORDER BY ordinal_position;

-- 3. Foreign keys
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.cliente_modalidades_atuacao'::regclass AND contype = 'f';

-- 4. Constraints (todas)
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.cliente_modalidades_atuacao'::regclass
-- ORDER BY contype, conname;

-- 5. Índices
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public' AND tablename = 'cliente_modalidades_atuacao'
-- ORDER BY indexname;

-- 6/7. Triggers da tabela (updated_at e coerência)
-- SELECT trigger_name, action_timing, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND event_object_table = 'cliente_modalidades_atuacao'
-- ORDER BY trigger_name;

-- 8. Trigger de proteção em clientes.segmento_id
-- SELECT trigger_name, action_timing, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND event_object_table = 'clientes'
--   AND trigger_name = 'trg_proteger_alteracao_segmento_cliente';

-- 9. RLS habilitada
-- SELECT relname, relrowsecurity, relforcerowsecurity
-- FROM pg_class WHERE oid = 'public.cliente_modalidades_atuacao'::regclass;

-- 10. Policies
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'cliente_modalidades_atuacao'
-- ORDER BY policyname;

-- 11. Função set_cliente_modalidade_principal
-- SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
--        pg_get_function_result(p.oid) AS result
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'set_cliente_modalidade_principal';

-- 12. Grants da tabela e da função
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND table_name = 'cliente_modalidades_atuacao'
-- ORDER BY grantee, privilege_type;
--
-- SELECT grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name = 'set_cliente_modalidade_principal';
