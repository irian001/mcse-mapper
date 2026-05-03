-- 1. Lock down get_auth_users_for_linking
REVOKE EXECUTE ON FUNCTION public.get_auth_users_for_linking() FROM anon, public;

CREATE OR REPLACE FUNCTION public.get_auth_users_for_linking()
 RETURNS TABLE(user_id uuid, user_email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  RETURN QUERY
    SELECT au.id AS user_id, au.email::text AS user_email
    FROM auth.users au
    WHERE au.id NOT IN (
      SELECT a.auth_user_id FROM public.auditores a WHERE a.auth_user_id IS NOT NULL
    )
    ORDER BY au.email;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_auth_users_for_linking() TO authenticated;

-- 2. Storage bucket scoping for solicitacao-documentos
CREATE OR REPLACE FUNCTION public.can_access_sol_storage_doc(p_object_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_solicitacao_id uuid;
  v_cliente_id uuid;
  v_trabalho_id uuid;
BEGIN
  IF public.is_admin() THEN RETURN true; END IF;

  BEGIN
    v_solicitacao_id := (split_part(p_object_name, '/', 1))::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  SELECT cliente_id, trabalho_auditoria_id
    INTO v_cliente_id, v_trabalho_id
  FROM public.solicitacoes_documentos
  WHERE id = v_solicitacao_id;

  IF v_cliente_id IS NULL THEN RETURN false; END IF;

  -- Auditor assigned to the trabalho
  IF v_trabalho_id IN (SELECT public.get_accessible_trabalho_ids()) THEN
    RETURN true;
  END IF;

  -- Client user owning the cliente
  IF v_cliente_id = public.get_cliente_usuario_cliente_id() THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

DROP POLICY IF EXISTS "auth_select_sol_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_insert_sol_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_sol_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_sol_docs" ON storage.objects;
DROP POLICY IF EXISTS "select_sol_docs" ON storage.objects;
DROP POLICY IF EXISTS "insert_sol_docs" ON storage.objects;
DROP POLICY IF EXISTS "update_sol_docs" ON storage.objects;
DROP POLICY IF EXISTS "delete_sol_docs" ON storage.objects;

CREATE POLICY "select_sol_docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'solicitacao-documentos' AND public.can_access_sol_storage_doc(name));

CREATE POLICY "insert_sol_docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'solicitacao-documentos' AND public.can_access_sol_storage_doc(name));

CREATE POLICY "update_sol_docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'solicitacao-documentos' AND public.can_access_sol_storage_doc(name))
  WITH CHECK (bucket_id = 'solicitacao-documentos' AND public.can_access_sol_storage_doc(name));

CREATE POLICY "delete_sol_docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'solicitacao-documentos' AND (public.is_admin() OR public.can_access_sol_storage_doc(name)));

-- 3. Tighten SELECT policies on sensitive audit tables.
-- Rule: auditors (not cliente_usuario) keep full read; cliente_usuario only sees their own cliente_id rows.

-- trabalhos_auditoria
DROP POLICY IF EXISTS "select_trabalhos" ON public.trabalhos_auditoria;
CREATE POLICY "select_trabalhos" ON public.trabalhos_auditoria FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- balancetes
DROP POLICY IF EXISTS "select_balancetes" ON public.balancetes;
CREATE POLICY "select_balancetes" ON public.balancetes FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- balancete_linhas
DROP POLICY IF EXISTS "select_balancete_linhas" ON public.balancete_linhas;
CREATE POLICY "select_balancete_linhas" ON public.balancete_linhas FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- balancete_linha_documentos
DROP POLICY IF EXISTS "select_bal_linha_docs" ON public.balancete_linha_documentos;
CREATE POLICY "select_bal_linha_docs" ON public.balancete_linha_documentos FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- documentos_referencia_balancete
DROP POLICY IF EXISTS "select_docs_ref" ON public.documentos_referencia_balancete;
CREATE POLICY "select_docs_ref" ON public.documentos_referencia_balancete FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- papeis_trabalho
DROP POLICY IF EXISTS "select_papeis" ON public.papeis_trabalho;
CREATE POLICY "select_papeis" ON public.papeis_trabalho FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- papel_trabalho_linhas (no cliente_id directly, derive via trabalho)
DROP POLICY IF EXISTS "select_papel_linhas" ON public.papel_trabalho_linhas;
CREATE POLICY "select_papel_linhas" ON public.papel_trabalho_linhas FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR trabalho_auditoria_id IN (
      SELECT t.id FROM public.trabalhos_auditoria t
      WHERE t.cliente_id = public.get_cliente_usuario_cliente_id()
    )
  );

-- solicitacoes_documentos
DROP POLICY IF EXISTS "select_solicitacoes" ON public.solicitacoes_documentos;
CREATE POLICY "select_solicitacoes" ON public.solicitacoes_documentos FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- solicitacao_itens (via parent solicitacao)
DROP POLICY IF EXISTS "select_sol_itens" ON public.solicitacao_itens;
CREATE POLICY "select_sol_itens" ON public.solicitacao_itens FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR solicitacao_id IN (
      SELECT s.id FROM public.solicitacoes_documentos s
      WHERE s.cliente_id = public.get_cliente_usuario_cliente_id()
    )
  );

-- solicitacao_item_documentos (via parent item -> solicitacao)
DROP POLICY IF EXISTS "select_sol_item_docs" ON public.solicitacao_item_documentos;
CREATE POLICY "select_sol_item_docs" ON public.solicitacao_item_documentos FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR solicitacao_item_id IN (
      SELECT i.id FROM public.solicitacao_itens i
      JOIN public.solicitacoes_documentos s ON s.id = i.solicitacao_id
      WHERE s.cliente_id = public.get_cliente_usuario_cliente_id()
    )
  );

-- exercicios
DROP POLICY IF EXISTS "select_exercicios" ON public.exercicios;
CREATE POLICY "select_exercicios" ON public.exercicios FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- cliente_parametros
DROP POLICY IF EXISTS "select_parametros" ON public.cliente_parametros;
CREATE POLICY "select_parametros" ON public.cliente_parametros FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- cliente_contas_origem
DROP POLICY IF EXISTS "select_contas_origem" ON public.cliente_contas_origem;
CREATE POLICY "select_contas_origem" ON public.cliente_contas_origem FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- cliente_mapeamento_mcse
DROP POLICY IF EXISTS "select_mapeamento" ON public.cliente_mapeamento_mcse;
CREATE POLICY "select_mapeamento" ON public.cliente_mapeamento_mcse FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );
