
-- Table for client external users
CREATE TABLE public.cliente_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE,
  nome TEXT NOT NULL,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cliente_usuarios ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "select_cliente_usuarios" ON public.cliente_usuarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_cliente_usuarios" ON public.cliente_usuarios
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "update_cliente_usuarios" ON public.cliente_usuarios
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "delete_cliente_usuarios" ON public.cliente_usuarios
  FOR DELETE TO authenticated USING (public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_cliente_usuarios_updated_at
  BEFORE UPDATE ON public.cliente_usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_cliente_usuarios_cliente_id ON public.cliente_usuarios(cliente_id);
CREATE INDEX idx_cliente_usuarios_auth_user_id ON public.cliente_usuarios(auth_user_id);

-- Helper function: check if current user is a client user
CREATE OR REPLACE FUNCTION public.is_cliente_usuario()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cliente_usuarios
    WHERE auth_user_id = auth.uid() AND ativo = true
  );
$$;

-- Helper function: get the cliente_id for the current user
CREATE OR REPLACE FUNCTION public.get_cliente_usuario_cliente_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cliente_id FROM public.cliente_usuarios
  WHERE auth_user_id = auth.uid() AND ativo = true
  LIMIT 1;
$$;
