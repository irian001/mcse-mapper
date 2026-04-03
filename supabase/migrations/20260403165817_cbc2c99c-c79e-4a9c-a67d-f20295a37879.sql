
-- 1. Create perfil_acesso enum
DO $$ BEGIN
  CREATE TYPE public.perfil_acesso AS ENUM ('assistente', 'senior', 'gerente', 'socio', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add columns to auditores
ALTER TABLE public.auditores 
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS perfil_acesso public.perfil_acesso NOT NULL DEFAULT 'assistente';

-- 3. Security definer functions

CREATE OR REPLACE FUNCTION public.has_any_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.auditores WHERE perfil_acesso = 'admin' AND auth_user_id IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.auditores WHERE auth_user_id = auth.uid() AND perfil_acesso = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_auditor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.auditores WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_accessible_trabalho_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ta.trabalho_auditoria_id 
  FROM public.trabalho_auditores ta
  JOIN public.auditores a ON a.id = ta.auditor_id
  WHERE a.auth_user_id = auth.uid() AND ta.ativo = true
  UNION
  SELECT t.id
  FROM public.trabalhos_auditoria t
  WHERE EXISTS (
    SELECT 1 FROM public.auditores a
    WHERE a.auth_user_id = auth.uid() AND a.perfil_acesso = 'socio'
  )
  AND t.cliente_id IN (
    SELECT DISTINCT t2.cliente_id
    FROM public.trabalho_auditores ta2
    JOIN public.trabalhos_auditoria t2 ON t2.id = ta2.trabalho_auditoria_id
    JOIN public.auditores a2 ON a2.id = ta2.auditor_id
    WHERE a2.auth_user_id = auth.uid() AND ta2.ativo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_accessible_cliente_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT t.cliente_id
  FROM public.trabalhos_auditoria t
  WHERE t.id IN (SELECT public.get_accessible_trabalho_ids());
$$;

CREATE OR REPLACE FUNCTION public.link_auditor_account(p_auditor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auditores WHERE auth_user_id = auth.uid())
     AND EXISTS (SELECT 1 FROM auditores WHERE id = p_auditor_id AND auth_user_id IS NULL) THEN
    UPDATE auditores SET auth_user_id = auth.uid() WHERE id = p_auditor_id;
  ELSE
    RAISE EXCEPTION 'Não é possível vincular: usuário já vinculado ou auditor já possui vínculo';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_doc(p_object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    NOT public.has_any_admin()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.documentos_referencia_balancete d
      WHERE d.caminho_arquivo_ou_url = p_object_name
      AND d.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())
    );
$$;

-- 4. Drop all old permissive policies
DROP POLICY IF EXISTS "Authenticated full access on auditores" ON public.auditores;
DROP POLICY IF EXISTS "Authenticated full access on trabalhos_auditoria" ON public.trabalhos_auditoria;
DROP POLICY IF EXISTS "Authenticated full access on trabalho_auditores" ON public.trabalho_auditores;
DROP POLICY IF EXISTS "Authenticated full access on balancetes" ON public.balancetes;
DROP POLICY IF EXISTS "Authenticated full access on balancete_linhas" ON public.balancete_linhas;
DROP POLICY IF EXISTS "Authenticated full access on papeis_trabalho" ON public.papeis_trabalho;
DROP POLICY IF EXISTS "Authenticated full access on papel_trabalho_linhas" ON public.papel_trabalho_linhas;
DROP POLICY IF EXISTS "Authenticated full access on documentos_referencia_balancete" ON public.documentos_referencia_balancete;
DROP POLICY IF EXISTS "Authenticated full access on clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated full access on exercicios" ON public.exercicios;
DROP POLICY IF EXISTS "Authenticated full access on cliente_contas_origem" ON public.cliente_contas_origem;
DROP POLICY IF EXISTS "Authenticated full access on cliente_mapeamento_mcse" ON public.cliente_mapeamento_mcse;
DROP POLICY IF EXISTS "Authenticated full access on cliente_parametros" ON public.cliente_parametros;
DROP POLICY IF EXISTS "Authenticated full access on mcse_grupos" ON public.mcse_grupos;
DROP POLICY IF EXISTS "Authenticated full access on mcse_subgrupos" ON public.mcse_subgrupos;
DROP POLICY IF EXISTS "Authenticated full access on mcse_contas" ON public.mcse_contas;
DROP POLICY IF EXISTS "Authenticated full access on mcse_regras_conta" ON public.mcse_regras_conta;

-- 5. AUDITORES: read by all auth, write by admin/bootstrap, self-update
CREATE POLICY "select_auditores" ON public.auditores FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_auditores" ON public.auditores FOR INSERT TO authenticated WITH CHECK (NOT public.has_any_admin() OR public.is_admin());
CREATE POLICY "update_auditores" ON public.auditores FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR auth_user_id = auth.uid())
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR auth_user_id = auth.uid());
CREATE POLICY "delete_auditores" ON public.auditores FOR DELETE TO authenticated USING (NOT public.has_any_admin() OR public.is_admin());

-- TRABALHOS_AUDITORIA
CREATE POLICY "select_trabalhos" ON public.trabalhos_auditoria FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "insert_trabalhos" ON public.trabalhos_auditoria FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin());
CREATE POLICY "update_trabalhos" ON public.trabalhos_auditoria FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "delete_trabalhos" ON public.trabalhos_auditoria FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- TRABALHO_AUDITORES
CREATE POLICY "select_trabalho_auditores" ON public.trabalho_auditores FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "insert_trabalho_auditores" ON public.trabalho_auditores FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin());
CREATE POLICY "update_trabalho_auditores" ON public.trabalho_auditores FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin())
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin());
CREATE POLICY "delete_trabalho_auditores" ON public.trabalho_auditores FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- BALANCETES
CREATE POLICY "select_balancetes" ON public.balancetes FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "insert_balancetes" ON public.balancetes FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "update_balancetes" ON public.balancetes FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "delete_balancetes" ON public.balancetes FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- BALANCETE_LINHAS
CREATE POLICY "select_bal_linhas" ON public.balancete_linhas FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "insert_bal_linhas" ON public.balancete_linhas FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "update_bal_linhas" ON public.balancete_linhas FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "delete_bal_linhas" ON public.balancete_linhas FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- PAPEIS_TRABALHO
CREATE POLICY "select_papeis" ON public.papeis_trabalho FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "insert_papeis" ON public.papeis_trabalho FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "update_papeis" ON public.papeis_trabalho FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "delete_papeis" ON public.papeis_trabalho FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- PAPEL_TRABALHO_LINHAS
CREATE POLICY "select_papel_linhas" ON public.papel_trabalho_linhas FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "insert_papel_linhas" ON public.papel_trabalho_linhas FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "update_papel_linhas" ON public.papel_trabalho_linhas FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "delete_papel_linhas" ON public.papel_trabalho_linhas FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- DOCUMENTOS_REFERENCIA_BALANCETE
CREATE POLICY "select_docs" ON public.documentos_referencia_balancete FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "insert_docs" ON public.documentos_referencia_balancete FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "update_docs" ON public.documentos_referencia_balancete FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()));
CREATE POLICY "delete_docs" ON public.documentos_referencia_balancete FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- CLIENTES
CREATE POLICY "select_clientes" ON public.clientes FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "insert_clientes" ON public.clientes FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin());
CREATE POLICY "update_clientes" ON public.clientes FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR id IN (SELECT public.get_accessible_cliente_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "delete_clientes" ON public.clientes FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- EXERCICIOS
CREATE POLICY "select_exercicios" ON public.exercicios FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "insert_exercicios" ON public.exercicios FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "update_exercicios" ON public.exercicios FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "delete_exercicios" ON public.exercicios FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- CLIENTE_CONTAS_ORIGEM
CREATE POLICY "select_contas_origem" ON public.cliente_contas_origem FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "insert_contas_origem" ON public.cliente_contas_origem FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "update_contas_origem" ON public.cliente_contas_origem FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "delete_contas_origem" ON public.cliente_contas_origem FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- CLIENTE_MAPEAMENTO_MCSE
CREATE POLICY "select_mapeamento" ON public.cliente_mapeamento_mcse FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "insert_mapeamento" ON public.cliente_mapeamento_mcse FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "update_mapeamento" ON public.cliente_mapeamento_mcse FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "delete_mapeamento" ON public.cliente_mapeamento_mcse FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- CLIENTE_PARAMETROS
CREATE POLICY "select_parametros" ON public.cliente_parametros FOR SELECT TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "insert_parametros" ON public.cliente_parametros FOR INSERT TO authenticated 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "update_parametros" ON public.cliente_parametros FOR UPDATE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()))
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin() OR cliente_id IN (SELECT public.get_accessible_cliente_ids()));
CREATE POLICY "delete_parametros" ON public.cliente_parametros FOR DELETE TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin());

-- MCSE reference tables: read by all, write by admin/bootstrap
CREATE POLICY "select_mcse_grupos" ON public.mcse_grupos FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage_mcse_grupos" ON public.mcse_grupos FOR ALL TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin()) 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin());

CREATE POLICY "select_mcse_subgrupos" ON public.mcse_subgrupos FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage_mcse_subgrupos" ON public.mcse_subgrupos FOR ALL TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin()) 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin());

CREATE POLICY "select_mcse_contas" ON public.mcse_contas FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage_mcse_contas" ON public.mcse_contas FOR ALL TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin()) 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin());

CREATE POLICY "select_mcse_regras" ON public.mcse_regras_conta FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage_mcse_regras" ON public.mcse_regras_conta FOR ALL TO authenticated 
  USING (NOT public.has_any_admin() OR public.is_admin()) 
  WITH CHECK (NOT public.has_any_admin() OR public.is_admin());

-- 6. Storage policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "upload_docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-balancete');

CREATE POLICY "read_docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-balancete' AND public.can_access_storage_doc(name));

CREATE POLICY "delete_docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos-balancete' AND (public.is_admin() OR public.can_access_storage_doc(name)));
