-- Tabela de cadastro da empresa de auditoria (registro único)
CREATE TABLE public.empresa_auditoria (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  singleton boolean NOT NULL DEFAULT true,
  
  -- Identificação
  razao_social text NOT NULL DEFAULT '',
  nome_fantasia text,
  cnpj text NOT NULL DEFAULT '',
  inscricao_estadual text,
  inscricao_municipal text,
  
  -- Endereço
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  
  -- Contato
  telefone text,
  email_contato text,
  website text,
  
  -- Registros profissionais
  crc_numero text,
  crc_uf text,
  registro_cvm text,
  registro_bacen text,
  registro_aneel text,
  
  -- Auditor responsável técnico
  auditor_responsavel_id uuid REFERENCES public.auditores(id) ON DELETE SET NULL,
  
  -- Identidade visual
  logo_url text,
  
  observacoes text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT empresa_auditoria_singleton_unique UNIQUE (singleton),
  CONSTRAINT empresa_auditoria_singleton_check CHECK (singleton = true)
);

ALTER TABLE public.empresa_auditoria ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER update_empresa_auditoria_updated_at
  BEFORE UPDATE ON public.empresa_auditoria
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insere o registro inicial vazio
INSERT INTO public.empresa_auditoria (razao_social, cnpj, nome_fantasia)
VALUES ('Audiconsult Auditores S/S.', '', 'Audiconsult Auditores');