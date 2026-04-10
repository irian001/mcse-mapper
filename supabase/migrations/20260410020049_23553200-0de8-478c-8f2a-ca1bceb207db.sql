
-- Enum para status da solicitação
CREATE TYPE public.status_solicitacao AS ENUM (
  'rascunho', 'enviada', 'parcialmente_respondida', 'respondida', 'concluida', 'cancelada'
);

-- Enum para status do item
CREATE TYPE public.status_item_solicitacao AS ENUM (
  'pendente', 'recebido', 'aceito', 'rejeitado', 'dispensado'
);

-- Tabela principal de solicitações
CREATE TABLE public.solicitacoes_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trabalho_auditoria_id UUID NOT NULL REFERENCES public.trabalhos_auditoria(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  exercicio_id UUID NOT NULL REFERENCES public.exercicios(id),
  titulo_solicitacao TEXT NOT NULL DEFAULT '',
  origem_solicitacao TEXT NOT NULL DEFAULT 'balancete',
  data_solicitacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  prazo_resposta DATE,
  status_solicitacao public.status_solicitacao NOT NULL DEFAULT 'rascunho',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_solicitacoes" ON public.solicitacoes_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_solicitacoes" ON public.solicitacoes_documentos FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_solicitacoes" ON public.solicitacoes_documentos FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_solicitacoes" ON public.solicitacoes_documentos FOR DELETE TO authenticated USING (is_admin());

CREATE INDEX idx_solicitacoes_trabalho ON public.solicitacoes_documentos(trabalho_auditoria_id);
CREATE INDEX idx_solicitacoes_cliente ON public.solicitacoes_documentos(cliente_id);

CREATE TRIGGER update_solicitacoes_documentos_updated_at
  BEFORE UPDATE ON public.solicitacoes_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de itens da solicitação
CREATE TABLE public.solicitacao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_documentos(id) ON DELETE CASCADE,
  regra_mcse_id UUID REFERENCES public.mcse_regras_conta(id),
  conta_mcse_id UUID REFERENCES public.mcse_contas(id),
  codigo_mcse TEXT,
  descricao_mcse TEXT,
  tipo_documento TEXT NOT NULL DEFAULT '',
  descricao_documento TEXT NOT NULL DEFAULT '',
  instrucoes_cliente TEXT,
  prazo_item DATE,
  obrigatorio BOOLEAN NOT NULL DEFAULT true,
  status_item public.status_item_solicitacao NOT NULL DEFAULT 'pendente',
  observacao_auditor TEXT,
  observacao_cliente TEXT,
  ordem INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_solicitacao_itens" ON public.solicitacao_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_solicitacao_itens" ON public.solicitacao_itens FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "update_solicitacao_itens" ON public.solicitacao_itens FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete_solicitacao_itens" ON public.solicitacao_itens FOR DELETE TO authenticated USING (is_admin());

CREATE INDEX idx_solicitacao_itens_solicitacao ON public.solicitacao_itens(solicitacao_id);
CREATE INDEX idx_solicitacao_itens_conta ON public.solicitacao_itens(conta_mcse_id);

CREATE TRIGGER update_solicitacao_itens_updated_at
  BEFORE UPDATE ON public.solicitacao_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
