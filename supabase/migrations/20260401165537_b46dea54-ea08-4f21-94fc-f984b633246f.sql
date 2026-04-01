
-- Enum for cargo/perfil de auditor
CREATE TYPE public.cargo_auditor AS ENUM ('assistente', 'senior', 'gerente', 'socio', 'revisor');

-- Enum for status do trabalho
CREATE TYPE public.status_trabalho AS ENUM ('planejado', 'iniciado', 'em_execucao', 'revisao_1', 'revisao_2', 'finalizado_para_parecer', 'encerrado');

-- Enum for papel no trabalho
CREATE TYPE public.papel_trabalho AS ENUM ('elaborador', 'revisor_1', 'revisor_2', 'gerente', 'socio');

-- Table: auditores
CREATE TABLE public.auditores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  cargo cargo_auditor NOT NULL DEFAULT 'assistente',
  perfil cargo_auditor NOT NULL DEFAULT 'assistente',
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: trabalhos_auditoria
CREATE TABLE public.trabalhos_auditoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  exercicio_id UUID NOT NULL REFERENCES public.exercicios(id) ON DELETE CASCADE,
  nome_trabalho TEXT NOT NULL,
  descricao TEXT,
  data_inicio_programada DATE,
  data_fim_programada DATE,
  data_inicio_real DATE,
  data_fim_real DATE,
  status_trabalho status_trabalho NOT NULL DEFAULT 'planejado',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: trabalho_auditores (vínculo N:N)
CREATE TABLE public.trabalho_auditores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trabalho_auditoria_id UUID NOT NULL REFERENCES public.trabalhos_auditoria(id) ON DELETE CASCADE,
  auditor_id UUID NOT NULL REFERENCES public.auditores(id) ON DELETE CASCADE,
  papel_no_trabalho papel_trabalho NOT NULL DEFAULT 'elaborador',
  responsavel_principal BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trabalho_auditoria_id, auditor_id)
);

-- RLS policies
ALTER TABLE public.auditores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on auditores" ON public.auditores FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.trabalhos_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on trabalhos_auditoria" ON public.trabalhos_auditoria FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.trabalho_auditores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on trabalho_auditores" ON public.trabalho_auditores FOR ALL USING (true) WITH CHECK (true);
