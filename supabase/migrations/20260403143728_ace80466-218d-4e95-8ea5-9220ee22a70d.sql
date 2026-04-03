
-- Enum for PTA status
CREATE TYPE public.status_pta AS ENUM ('pendente', 'em_analise', 'em_revisao', 'concluido', 'finalizado');

-- Table: papeis_trabalho
CREATE TABLE public.papeis_trabalho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabalho_auditoria_id uuid NOT NULL REFERENCES public.trabalhos_auditoria(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  exercicio_id uuid NOT NULL REFERENCES public.exercicios(id) ON DELETE CASCADE,
  conta_mcse_id uuid REFERENCES public.mcse_contas(id),
  codigo_mcse text,
  descricao_mcse text,
  grupo_mcse text,
  subgrupo_mcse text,
  titulo_pta text NOT NULL DEFAULT '',
  objetivo_procedimento text,
  saldo_anterior_total numeric DEFAULT 0,
  saldo_atual_total numeric DEFAULT 0,
  valor_validado_total numeric,
  diferenca_total numeric,
  variacao_absoluta_total numeric,
  variacao_percentual_total numeric,
  total_linhas_vinculadas integer DEFAULT 0,
  total_linhas_com_pendencia integer DEFAULT 0,
  total_documentos_referencia integer DEFAULT 0,
  status_pta public.status_pta NOT NULL DEFAULT 'pendente',
  comentario_auditor text,
  comentario_revisor text,
  conclusao_preliminar text,
  conclusao_final text,
  materialidade_aplicavel boolean DEFAULT false,
  limite_materialidade numeric,
  limite_variacao numeric,
  criado_por text,
  atualizado_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.papeis_trabalho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access on papeis_trabalho" ON public.papeis_trabalho FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Table: papel_trabalho_linhas
CREATE TABLE public.papel_trabalho_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  papel_trabalho_id uuid NOT NULL REFERENCES public.papeis_trabalho(id) ON DELETE CASCADE,
  balancete_linha_id uuid NOT NULL REFERENCES public.balancete_linhas(id) ON DELETE CASCADE,
  trabalho_auditoria_id uuid NOT NULL REFERENCES public.trabalhos_auditoria(id) ON DELETE CASCADE,
  saldo_atual_linha numeric,
  valor_validado_linha numeric,
  diferenca_linha numeric,
  status_linha_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(papel_trabalho_id, balancete_linha_id)
);

ALTER TABLE public.papel_trabalho_linhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access on papel_trabalho_linhas" ON public.papel_trabalho_linhas FOR ALL TO authenticated USING (true) WITH CHECK (true);
