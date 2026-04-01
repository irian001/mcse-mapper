
-- Drop all existing permissive "Allow all" policies on all 12 tables
DROP POLICY IF EXISTS "Allow all on auditores" ON public.auditores;
DROP POLICY IF EXISTS "Allow all on cliente_contas_origem" ON public.cliente_contas_origem;
DROP POLICY IF EXISTS "Allow all on cliente_mapeamento_mcse" ON public.cliente_mapeamento_mcse;
DROP POLICY IF EXISTS "Allow all on cliente_parametros" ON public.cliente_parametros;
DROP POLICY IF EXISTS "Allow all on clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow all on exercicios" ON public.exercicios;
DROP POLICY IF EXISTS "Allow all on mcse_contas" ON public.mcse_contas;
DROP POLICY IF EXISTS "Allow all on mcse_grupos" ON public.mcse_grupos;
DROP POLICY IF EXISTS "Allow all on mcse_subgrupos" ON public.mcse_subgrupos;
DROP POLICY IF EXISTS "Allow all on mcse_regras_conta" ON public.mcse_regras_conta;
DROP POLICY IF EXISTS "Allow all on trabalhos_auditoria" ON public.trabalhos_auditoria;
DROP POLICY IF EXISTS "Allow all on trabalho_auditores" ON public.trabalho_auditores;

-- Create authenticated-only policies for all tables
-- Business data tables: full CRUD for authenticated users
CREATE POLICY "Authenticated full access on auditores" ON public.auditores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on cliente_contas_origem" ON public.cliente_contas_origem FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on cliente_mapeamento_mcse" ON public.cliente_mapeamento_mcse FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on cliente_parametros" ON public.cliente_parametros FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on exercicios" ON public.exercicios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on trabalhos_auditoria" ON public.trabalhos_auditoria FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on trabalho_auditores" ON public.trabalho_auditores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reference/master tables: full CRUD for authenticated (admin restriction can be added later)
CREATE POLICY "Authenticated full access on mcse_contas" ON public.mcse_contas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on mcse_grupos" ON public.mcse_grupos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on mcse_subgrupos" ON public.mcse_subgrupos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on mcse_regras_conta" ON public.mcse_regras_conta FOR ALL TO authenticated USING (true) WITH CHECK (true);
