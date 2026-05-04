
-- 1) Drop shadow USING(true) SELECT policies
DROP POLICY IF EXISTS "select_bal_linhas" ON public.balancete_linhas;
DROP POLICY IF EXISTS "select_solicitacao_itens" ON public.solicitacao_itens;

-- 2) Scope cliente_usuarios SELECT
DROP POLICY IF EXISTS "select_cliente_usuarios" ON public.cliente_usuarios;
CREATE POLICY "select_cliente_usuarios" ON public.cliente_usuarios
  FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR cliente_id = public.get_cliente_usuario_cliente_id()
  );

-- 3) Scope clientes SELECT
DROP POLICY IF EXISTS "select_clientes" ON public.clientes;
CREATE POLICY "select_clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (
    NOT public.is_cliente_usuario()
    OR id = public.get_cliente_usuario_cliente_id()
  );

-- 4) Scope INSERT/UPDATE on operational tables.
-- Pattern: auditors (non client users) keep full write; admins always allowed;
-- client users blocked from writing audit tables (except where noted).

-- balancetes
DROP POLICY IF EXISTS "insert_balancetes" ON public.balancetes;
DROP POLICY IF EXISTS "update_balancetes" ON public.balancetes;
CREATE POLICY "insert_balancetes" ON public.balancetes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));
CREATE POLICY "update_balancetes" ON public.balancetes
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));

-- balancete_linhas
DROP POLICY IF EXISTS "insert_bal_linhas" ON public.balancete_linhas;
DROP POLICY IF EXISTS "update_bal_linhas" ON public.balancete_linhas;
CREATE POLICY "insert_bal_linhas" ON public.balancete_linhas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));
CREATE POLICY "update_bal_linhas" ON public.balancete_linhas
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));

-- balancete_linha_documentos
DROP POLICY IF EXISTS "insert_bal_linha_docs" ON public.balancete_linha_documentos;
DROP POLICY IF EXISTS "update_bal_linha_docs" ON public.balancete_linha_documentos;
CREATE POLICY "insert_bal_linha_docs" ON public.balancete_linha_documentos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));
CREATE POLICY "update_bal_linha_docs" ON public.balancete_linha_documentos
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));

-- documentos_referencia_balancete
DROP POLICY IF EXISTS "insert_docs_ref" ON public.documentos_referencia_balancete;
DROP POLICY IF EXISTS "update_docs_ref" ON public.documentos_referencia_balancete;
CREATE POLICY "insert_docs_ref" ON public.documentos_referencia_balancete
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));
CREATE POLICY "update_docs_ref" ON public.documentos_referencia_balancete
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));

-- exercicios
DROP POLICY IF EXISTS "insert_exercicios" ON public.exercicios;
DROP POLICY IF EXISTS "update_exercicios" ON public.exercicios;
CREATE POLICY "insert_exercicios" ON public.exercicios
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())));
CREATE POLICY "update_exercicios" ON public.exercicios
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())));

-- papeis_trabalho
DROP POLICY IF EXISTS "insert_papeis" ON public.papeis_trabalho;
DROP POLICY IF EXISTS "update_papeis" ON public.papeis_trabalho;
CREATE POLICY "insert_papeis" ON public.papeis_trabalho
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));
CREATE POLICY "update_papeis" ON public.papeis_trabalho
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));

-- papel_trabalho_linhas
DROP POLICY IF EXISTS "insert_papel_linhas" ON public.papel_trabalho_linhas;
DROP POLICY IF EXISTS "update_papel_linhas" ON public.papel_trabalho_linhas;
CREATE POLICY "insert_papel_linhas" ON public.papel_trabalho_linhas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));
CREATE POLICY "update_papel_linhas" ON public.papel_trabalho_linhas
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())));

-- cliente_contas_origem
DROP POLICY IF EXISTS "insert_contas_origem" ON public.cliente_contas_origem;
DROP POLICY IF EXISTS "update_contas_origem" ON public.cliente_contas_origem;
CREATE POLICY "insert_contas_origem" ON public.cliente_contas_origem
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())));
CREATE POLICY "update_contas_origem" ON public.cliente_contas_origem
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())));

-- cliente_mapeamento_mcse
DROP POLICY IF EXISTS "insert_mapeamento" ON public.cliente_mapeamento_mcse;
DROP POLICY IF EXISTS "update_mapeamento" ON public.cliente_mapeamento_mcse;
CREATE POLICY "insert_mapeamento" ON public.cliente_mapeamento_mcse
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())));
CREATE POLICY "update_mapeamento" ON public.cliente_mapeamento_mcse
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())));

-- cliente_parametros
DROP POLICY IF EXISTS "insert_parametros" ON public.cliente_parametros;
DROP POLICY IF EXISTS "update_parametros" ON public.cliente_parametros;
CREATE POLICY "insert_parametros" ON public.cliente_parametros
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())));
CREATE POLICY "update_parametros" ON public.cliente_parametros
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND cliente_id IN (SELECT public.get_accessible_cliente_ids())));

-- trabalhos_auditoria (UPDATE only — INSERT already admin-only)
DROP POLICY IF EXISTS "update_trabalhos" ON public.trabalhos_auditoria;
CREATE POLICY "update_trabalhos" ON public.trabalhos_auditoria
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (NOT public.is_cliente_usuario() AND id IN (SELECT public.get_accessible_trabalho_ids())))
  WITH CHECK (public.is_admin() OR (NOT public.is_cliente_usuario() AND id IN (SELECT public.get_accessible_trabalho_ids())));

-- solicitacao_itens (UPDATE only — INSERT already admin-only)
DROP POLICY IF EXISTS "update_solicitacao_itens" ON public.solicitacao_itens;
CREATE POLICY "update_solicitacao_itens" ON public.solicitacao_itens
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (NOT public.is_cliente_usuario() AND solicitacao_id IN (SELECT s.id FROM public.solicitacoes_documentos s WHERE s.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())))
    OR (public.is_cliente_usuario() AND solicitacao_id IN (SELECT s.id FROM public.solicitacoes_documentos s WHERE s.cliente_id = public.get_cliente_usuario_cliente_id()))
  )
  WITH CHECK (
    public.is_admin()
    OR (NOT public.is_cliente_usuario() AND solicitacao_id IN (SELECT s.id FROM public.solicitacoes_documentos s WHERE s.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids())))
    OR (public.is_cliente_usuario() AND solicitacao_id IN (SELECT s.id FROM public.solicitacoes_documentos s WHERE s.cliente_id = public.get_cliente_usuario_cliente_id()))
  );

-- solicitacao_item_documentos (client users CAN upload here)
DROP POLICY IF EXISTS "insert_sol_item_docs" ON public.solicitacao_item_documentos;
DROP POLICY IF EXISTS "update_sol_item_docs" ON public.solicitacao_item_documentos;
CREATE POLICY "insert_sol_item_docs" ON public.solicitacao_item_documentos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR solicitacao_item_id IN (
      SELECT i.id FROM public.solicitacao_itens i
      JOIN public.solicitacoes_documentos s ON s.id = i.solicitacao_id
      WHERE
        (NOT public.is_cliente_usuario() AND s.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
        OR (public.is_cliente_usuario() AND s.cliente_id = public.get_cliente_usuario_cliente_id())
    )
  );
CREATE POLICY "update_sol_item_docs" ON public.solicitacao_item_documentos
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR solicitacao_item_id IN (
      SELECT i.id FROM public.solicitacao_itens i
      JOIN public.solicitacoes_documentos s ON s.id = i.solicitacao_id
      WHERE
        (NOT public.is_cliente_usuario() AND s.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
        OR (public.is_cliente_usuario() AND s.cliente_id = public.get_cliente_usuario_cliente_id())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR solicitacao_item_id IN (
      SELECT i.id FROM public.solicitacao_itens i
      JOIN public.solicitacoes_documentos s ON s.id = i.solicitacao_id
      WHERE
        (NOT public.is_cliente_usuario() AND s.trabalho_auditoria_id IN (SELECT public.get_accessible_trabalho_ids()))
        OR (public.is_cliente_usuario() AND s.cliente_id = public.get_cliente_usuario_cliente_id())
    )
  );
