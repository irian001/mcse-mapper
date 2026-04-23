-- Garante tabela
CREATE TABLE IF NOT EXISTS public.empresa_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  razao_social text NOT NULL DEFAULT '',
  nome_fantasia text,
  cnpj text NOT NULL DEFAULT '',
  inscricao_estadual text,
  inscricao_municipal text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  telefone text,
  email_contato text,
  website text,
  crc_numero text,
  crc_uf text,
  registro_cvm text,
  registro_bacen text,
  registro_aneel text,
  auditor_responsavel_id uuid REFERENCES public.auditores(id) ON DELETE SET NULL,
  logo_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS empresa_auditoria_singleton_uniq
  ON public.empresa_auditoria (singleton)
  WHERE singleton = true;

ALTER TABLE public.empresa_auditoria ENABLE ROW LEVEL SECURITY;

-- Recria policies (drop + create para idempotência)
DROP POLICY IF EXISTS "select_empresa_auditoria" ON public.empresa_auditoria;
DROP POLICY IF EXISTS "insert_empresa_auditoria" ON public.empresa_auditoria;
DROP POLICY IF EXISTS "update_empresa_auditoria" ON public.empresa_auditoria;
DROP POLICY IF EXISTS "delete_empresa_auditoria" ON public.empresa_auditoria;

CREATE POLICY "select_empresa_auditoria"
  ON public.empresa_auditoria FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "insert_empresa_auditoria"
  ON public.empresa_auditoria FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "update_empresa_auditoria"
  ON public.empresa_auditoria FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "delete_empresa_auditoria"
  ON public.empresa_auditoria FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Trigger updated_at (idempotente)
DROP TRIGGER IF EXISTS update_empresa_auditoria_updated_at ON public.empresa_auditoria;
CREATE TRIGGER update_empresa_auditoria_updated_at
  BEFORE UPDATE ON public.empresa_auditoria
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Força recarregamento do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';