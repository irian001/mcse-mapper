
-- Fix storage upload policy to verify user has access to the work
DROP POLICY IF EXISTS "upload_docs" ON storage.objects;
CREATE POLICY "upload_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos-balancete'
    AND (
      NOT public.has_any_admin()
      OR public.is_admin()
      OR (
        split_part(name, '/', 1)::uuid IN (SELECT public.get_accessible_trabalho_ids())
      )
    )
  );
