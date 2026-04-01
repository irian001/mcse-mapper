
-- Enums for balancete
CREATE TYPE public.tipo_balancete AS ENUM ('mensal', 'trimestral', 'semestral', 'anual', 'outro');
CREATE TYPE public.status_importacao_balancete AS ENUM ('importado', 'processando', 'erro', 'finalizado');
CREATE TYPE public.status_localizacao_conta AS ENUM ('localizada', 'nao_localizada', 'localizada_por_classificacao', 'localizada_por_codigo', 'localizada_por_descricao');
CREATE TYPE public.status_mapeamento_mcse AS ENUM ('mapeado', 'sem_mapeamento', 'conta_nao_localizada');
CREATE TYPE public.status_validacao_linha AS ENUM ('pendente', 'pronto_para_analise', 'revisar_mapeamento');

-- Balancetes (header)
CREATE TABLE public.balancetes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trabalho_auditoria_id UUID NOT NULL REFERENCES public.trabalhos_auditoria(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  exercicio_id UUID NOT NULL REFERENCES public.exercicios(id),
  nome_arquivo TEXT NOT NULL,
  tipo_balancete tipo_balancete NOT NULL DEFAULT 'mensal',
  data_importacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_importacao TEXT,
  total_linhas INTEGER NOT NULL DEFAULT 0,
  total_linhas_com_mapeamento INTEGER NOT NULL DEFAULT 0,
  total_linhas_sem_mapeamento INTEGER NOT NULL DEFAULT 0,
  observacao TEXT,
  status_importacao status_importacao_balancete NOT NULL DEFAULT 'importado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Balancete lines
CREATE TABLE public.balancete_linhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  balancete_id UUID NOT NULL REFERENCES public.balancetes(id) ON DELETE CASCADE,
  trabalho_auditoria_id UUID NOT NULL REFERENCES public.trabalhos_auditoria(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  exercicio_id UUID NOT NULL REFERENCES public.exercicios(id),
  -- Conta
  codigo_conta_balancete TEXT NOT NULL,
  descricao_conta_balancete TEXT NOT NULL DEFAULT '',
  conta_origem_id UUID REFERENCES public.cliente_contas_origem(id),
  conta_mcse_id UUID REFERENCES public.mcse_contas(id),
  classificacao_origem TEXT,
  codigo_mcse TEXT,
  descricao_mcse TEXT,
  grupo_mcse TEXT,
  subgrupo_mcse TEXT,
  -- Valores
  saldo_anterior NUMERIC DEFAULT 0,
  debitos NUMERIC DEFAULT 0,
  creditos NUMERIC DEFAULT 0,
  saldo_atual NUMERIC DEFAULT 0,
  variacao_absoluta NUMERIC,
  variacao_percentual NUMERIC,
  -- Status
  status_localizacao_conta status_localizacao_conta NOT NULL DEFAULT 'nao_localizada',
  status_mapeamento_mcse status_mapeamento_mcse NOT NULL DEFAULT 'sem_mapeamento',
  status_validacao status_validacao_linha NOT NULL DEFAULT 'pendente',
  -- Controle
  observacao_importacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.balancetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balancete_linhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access on balancetes" ON public.balancetes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on balancete_linhas" ON public.balancete_linhas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_balancete_linhas_balancete_id ON public.balancete_linhas(balancete_id);
CREATE INDEX idx_balancete_linhas_conta_origem ON public.balancete_linhas(conta_origem_id);
CREATE INDEX idx_balancete_linhas_codigo_conta ON public.balancete_linhas(codigo_conta_balancete);
CREATE INDEX idx_balancetes_trabalho ON public.balancetes(trabalho_auditoria_id);
