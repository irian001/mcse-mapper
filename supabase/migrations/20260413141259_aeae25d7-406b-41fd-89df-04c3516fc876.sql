-- Allow any authenticated user to insert documents (clients upload files)
DROP POLICY IF EXISTS "insert_sol_item_docs" ON public.solicitacao_item_documentos;
CREATE POLICY "insert_sol_item_docs"
  ON public.solicitacao_item_documentos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow any authenticated user to update solicitacao_itens (status changes after upload)
DROP POLICY IF EXISTS "update_solicitacao_itens" ON public.solicitacao_itens;
CREATE POLICY "update_solicitacao_itens"
  ON public.solicitacao_itens
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);