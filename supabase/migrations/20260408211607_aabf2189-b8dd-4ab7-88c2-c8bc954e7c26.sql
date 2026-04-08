
-- =============================================
-- AUDITORES - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_auditores" ON public.auditores;
CREATE POLICY "select_auditores" ON public.auditores
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- CLIENTES - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_clientes" ON public.clientes;
CREATE POLICY "select_clientes" ON public.clientes
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- EXERCICIOS - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_exercicios" ON public.exercicios;
CREATE POLICY "select_exercicios" ON public.exercicios
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- TRABALHOS_AUDITORIA - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_trabalhos" ON public.trabalhos_auditoria;
CREATE POLICY "select_trabalhos" ON public.trabalhos_auditoria
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- TRABALHO_AUDITORES - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_trabalho_auditores" ON public.trabalho_auditores;
CREATE POLICY "select_trabalho_auditores" ON public.trabalho_auditores
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- BALANCETES - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_balancetes" ON public.balancetes;
CREATE POLICY "select_balancetes" ON public.balancetes
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- BALANCETE_LINHAS - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_bal_linhas" ON public.balancete_linhas;
CREATE POLICY "select_bal_linhas" ON public.balancete_linhas
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- CLIENTE_CONTAS_ORIGEM - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_contas_origem" ON public.cliente_contas_origem;
CREATE POLICY "select_contas_origem" ON public.cliente_contas_origem
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- CLIENTE_MAPEAMENTO_MCSE - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_mapeamento" ON public.cliente_mapeamento_mcse;
CREATE POLICY "select_mapeamento" ON public.cliente_mapeamento_mcse
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- CLIENTE_PARAMETROS - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_parametros" ON public.cliente_parametros;
CREATE POLICY "select_parametros" ON public.cliente_parametros
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- DOCUMENTOS_REFERENCIA_BALANCETE - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_docs_ref" ON public.documentos_referencia_balancete;
CREATE POLICY "select_docs_ref" ON public.documentos_referencia_balancete
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- PAPEIS_TRABALHO - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_papeis" ON public.papeis_trabalho;
CREATE POLICY "select_papeis" ON public.papeis_trabalho
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- PAPEL_TRABALHO_LINHAS - SELECT: all authenticated
-- =============================================
DROP POLICY IF EXISTS "select_papel_linhas" ON public.papel_trabalho_linhas;
CREATE POLICY "select_papel_linhas" ON public.papel_trabalho_linhas
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- Also open INSERT/UPDATE on operational tables for all authenticated
-- =============================================

-- BALANCETES
DROP POLICY IF EXISTS "insert_balancetes" ON public.balancetes;
CREATE POLICY "insert_balancetes" ON public.balancetes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_balancetes" ON public.balancetes;
CREATE POLICY "update_balancetes" ON public.balancetes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- BALANCETE_LINHAS
DROP POLICY IF EXISTS "insert_bal_linhas" ON public.balancete_linhas;
CREATE POLICY "insert_bal_linhas" ON public.balancete_linhas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_bal_linhas" ON public.balancete_linhas;
CREATE POLICY "update_bal_linhas" ON public.balancete_linhas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- CLIENTE_CONTAS_ORIGEM
DROP POLICY IF EXISTS "insert_contas_origem" ON public.cliente_contas_origem;
CREATE POLICY "insert_contas_origem" ON public.cliente_contas_origem
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_contas_origem" ON public.cliente_contas_origem;
CREATE POLICY "update_contas_origem" ON public.cliente_contas_origem
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- CLIENTE_MAPEAMENTO_MCSE
DROP POLICY IF EXISTS "insert_mapeamento" ON public.cliente_mapeamento_mcse;
CREATE POLICY "insert_mapeamento" ON public.cliente_mapeamento_mcse
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_mapeamento" ON public.cliente_mapeamento_mcse;
CREATE POLICY "update_mapeamento" ON public.cliente_mapeamento_mcse
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- CLIENTE_PARAMETROS
DROP POLICY IF EXISTS "insert_parametros" ON public.cliente_parametros;
CREATE POLICY "insert_parametros" ON public.cliente_parametros
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_parametros" ON public.cliente_parametros;
CREATE POLICY "update_parametros" ON public.cliente_parametros
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DOCUMENTOS_REFERENCIA_BALANCETE
DROP POLICY IF EXISTS "insert_docs_ref" ON public.documentos_referencia_balancete;
CREATE POLICY "insert_docs_ref" ON public.documentos_referencia_balancete
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_docs_ref" ON public.documentos_referencia_balancete;
CREATE POLICY "update_docs_ref" ON public.documentos_referencia_balancete
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- EXERCICIOS
DROP POLICY IF EXISTS "insert_exercicios" ON public.exercicios;
CREATE POLICY "insert_exercicios" ON public.exercicios
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_exercicios" ON public.exercicios;
CREATE POLICY "update_exercicios" ON public.exercicios
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TRABALHOS_AUDITORIA
DROP POLICY IF EXISTS "update_trabalhos" ON public.trabalhos_auditoria;
CREATE POLICY "update_trabalhos" ON public.trabalhos_auditoria
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- PAPEIS_TRABALHO
DROP POLICY IF EXISTS "insert_papeis" ON public.papeis_trabalho;
CREATE POLICY "insert_papeis" ON public.papeis_trabalho
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_papeis" ON public.papeis_trabalho;
CREATE POLICY "update_papeis" ON public.papeis_trabalho
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- PAPEL_TRABALHO_LINHAS
DROP POLICY IF EXISTS "insert_papel_linhas" ON public.papel_trabalho_linhas;
CREATE POLICY "insert_papel_linhas" ON public.papel_trabalho_linhas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_papel_linhas" ON public.papel_trabalho_linhas;
CREATE POLICY "update_papel_linhas" ON public.papel_trabalho_linhas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
