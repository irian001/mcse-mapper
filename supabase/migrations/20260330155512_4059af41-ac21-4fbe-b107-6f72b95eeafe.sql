
-- Create ENUM types
CREATE TYPE public.natureza_conta AS ENUM ('ativo', 'passivo', 'patrimonio_liquido', 'receita', 'despesa', 'compensacao');
CREATE TYPE public.status_cliente AS ENUM ('ativo', 'inativo', 'prospecto');
CREATE TYPE public.status_exercicio AS ENUM ('aberto', 'em_andamento', 'fechado', 'arquivado');
CREATE TYPE public.tipo_mapeamento AS ENUM ('manual', 'automatico');
CREATE TYPE public.segmento_cliente AS ENUM ('setor_eletrico', 'outro');

-- 1. MCSE_GRUPOS
CREATE TABLE public.mcse_grupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_grupo TEXT NOT NULL UNIQUE,
  descricao_grupo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. MCSE_SUBGRUPOS
CREATE TABLE public.mcse_subgrupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID NOT NULL REFERENCES public.mcse_grupos(id) ON DELETE CASCADE,
  codigo_subgrupo TEXT NOT NULL,
  descricao_subgrupo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(grupo_id, codigo_subgrupo)
);

-- 3. MCSE_CONTAS
CREATE TABLE public.mcse_contas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_mcse TEXT NOT NULL UNIQUE,
  descricao_conta TEXT NOT NULL,
  grupo_id UUID NOT NULL REFERENCES public.mcse_grupos(id) ON DELETE CASCADE,
  subgrupo_id UUID REFERENCES public.mcse_subgrupos(id) ON DELETE SET NULL,
  nivel INTEGER NOT NULL DEFAULT 1,
  natureza natureza_conta NOT NULL,
  aceita_lancamento BOOLEAN NOT NULL DEFAULT false,
  conta_critica BOOLEAN NOT NULL DEFAULT false,
  aceita_reg_soc BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. MCSE_REGRAS_CONTA
CREATE TABLE public.mcse_regras_conta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_id UUID NOT NULL REFERENCES public.mcse_contas(id) ON DELETE CASCADE,
  materialidade_padrao DECIMAL(15,4),
  limite_variacao_percentual DECIMAL(8,4),
  limite_variacao_absoluta DECIMAL(15,2),
  requer_documento_obrigatorio BOOLEAN NOT NULL DEFAULT false,
  requer_revisao_humana BOOLEAN NOT NULL DEFAULT false,
  requer_conciliacao_reg_soc BOOLEAN NOT NULL DEFAULT false,
  observacao_regra TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CLIENTES
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL UNIQUE,
  segmento segmento_cliente NOT NULL DEFAULT 'setor_eletrico',
  status status_cliente NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. EXERCICIOS
CREATE TABLE public.exercicios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ano_exercicio INTEGER NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status status_exercicio NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, ano_exercicio)
);

-- 7. CLIENTE_CONTAS_ORIGEM
CREATE TABLE public.cliente_contas_origem (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  codigo_origem TEXT NOT NULL,
  descricao_origem TEXT NOT NULL,
  natureza_origem TEXT,
  nivel_origem INTEGER,
  aceita_lancamento BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, codigo_origem)
);

-- 8. CLIENTE_MAPEAMENTO_MCSE
CREATE TABLE public.cliente_mapeamento_mcse (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  conta_origem_id UUID NOT NULL REFERENCES public.cliente_contas_origem(id) ON DELETE CASCADE,
  conta_mcse_id UUID REFERENCES public.mcse_contas(id) ON DELETE SET NULL,
  tipo_mapeamento tipo_mapeamento NOT NULL DEFAULT 'manual',
  confianca_mapeamento DECIMAL(5,2),
  homologado BOOLEAN NOT NULL DEFAULT false,
  homologado_por TEXT,
  data_homologacao TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, conta_origem_id)
);

-- 9. CLIENTE_PARAMETROS
CREATE TABLE public.cliente_parametros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE UNIQUE,
  materialidade_global DECIMAL(15,2),
  limite_variacao_padrao DECIMAL(8,4),
  erp_principal TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.mcse_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcse_subgrupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcse_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcse_regras_conta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_contas_origem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_mapeamento_mcse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_parametros ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow all operations for authenticated users (single-tenant for now)
-- MCSE tables
CREATE POLICY "Allow all on mcse_grupos" ON public.mcse_grupos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on mcse_subgrupos" ON public.mcse_subgrupos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on mcse_contas" ON public.mcse_contas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on mcse_regras_conta" ON public.mcse_regras_conta FOR ALL USING (true) WITH CHECK (true);

-- Client tables
CREATE POLICY "Allow all on clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on exercicios" ON public.exercicios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on cliente_contas_origem" ON public.cliente_contas_origem FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on cliente_mapeamento_mcse" ON public.cliente_mapeamento_mcse FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on cliente_parametros" ON public.cliente_parametros FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_mcse_grupos_updated_at BEFORE UPDATE ON public.mcse_grupos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mcse_subgrupos_updated_at BEFORE UPDATE ON public.mcse_subgrupos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mcse_contas_updated_at BEFORE UPDATE ON public.mcse_contas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mcse_regras_conta_updated_at BEFORE UPDATE ON public.mcse_regras_conta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exercicios_updated_at BEFORE UPDATE ON public.exercicios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cliente_contas_origem_updated_at BEFORE UPDATE ON public.cliente_contas_origem FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cliente_mapeamento_mcse_updated_at BEFORE UPDATE ON public.cliente_mapeamento_mcse FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cliente_parametros_updated_at BEFORE UPDATE ON public.cliente_parametros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_mcse_subgrupos_grupo ON public.mcse_subgrupos(grupo_id);
CREATE INDEX idx_mcse_contas_grupo ON public.mcse_contas(grupo_id);
CREATE INDEX idx_mcse_contas_subgrupo ON public.mcse_contas(subgrupo_id);
CREATE INDEX idx_mcse_regras_conta ON public.mcse_regras_conta(conta_id);
CREATE INDEX idx_exercicios_cliente ON public.exercicios(cliente_id);
CREATE INDEX idx_cliente_contas_origem_cliente ON public.cliente_contas_origem(cliente_id);
CREATE INDEX idx_cliente_mapeamento_cliente ON public.cliente_mapeamento_mcse(cliente_id);
CREATE INDEX idx_cliente_mapeamento_origem ON public.cliente_mapeamento_mcse(conta_origem_id);
CREATE INDEX idx_cliente_mapeamento_mcse ON public.cliente_mapeamento_mcse(conta_mcse_id);
