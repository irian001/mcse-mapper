import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Play, Paperclip, CheckCircle2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ExecucaoProcedimentoPanel from "./ExecucaoProcedimentoPanel";
import DocumentosProcedimentoPanel from "./DocumentosProcedimentoPanel";
import ConclusaoProcedimentoPanel from "./ConclusaoProcedimentoPanel";

const TIPOS_PROCEDIMENTO: Record<string, string> = {
  contagem_caixa: "Contagem de Caixa",
  contagem_estoque: "Contagem de Estoque",
  faturas_em_aberto: "Faturas em Aberto",
  ordens_compra: "Ordens de Compra",
  ordens_imobilizacao: "Ordens de Imobilização",
};

const STATUS_PROCEDIMENTO: Record<string, { label: string; className: string }> = {
  planejado: { label: "Planejado", className: "bg-muted text-muted-foreground border-border" },
  em_execucao: { label: "Em Execução", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  aguardando_documentos: { label: "Aguardando Documentos", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  em_revisao: { label: "Em Revisão", className: "bg-primary/15 text-primary border-primary/30" },
  concluido: { label: "Concluído", className: "bg-success/15 text-success border-success/30" },
  encerrado: { label: "Encerrado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

interface Props {
  procedimento: any | null;
  onClose: () => void;
}

export default function ProcedimentoDetailDialog({ procedimento, onClose }: Props) {
  if (!procedimento) return null;

  const tipoLabel = TIPOS_PROCEDIMENTO[procedimento.tipo_procedimento] || procedimento.tipo_procedimento;
  const statusCfg = STATUS_PROCEDIMENTO[procedimento.status_procedimento] || {
    label: procedimento.status_procedimento,
    className: "",
  };

  const defaultDocTipo =
    procedimento.tipo_procedimento === "contagem_caixa" ? "termo_contagem_assinado" : "anexo_suporte";
  const triggerDocLabel =
    procedimento.tipo_procedimento === "contagem_caixa" ? "Anexar Termo Assinado" : "Anexar Documento";

  return (
    <Dialog open={!!procedimento} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-lg truncate">{procedimento.titulo || "Procedimento"}</DialogTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline">{tipoLabel}</Badge>
                <Badge variant="outline" className={statusCfg.className}>
                  {statusCfg.label}
                </Badge>
                {procedimento.codigo_mcse && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {procedimento.codigo_mcse}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {procedimento.clientes?.nome_fantasia || procedimento.clientes?.razao_social || "—"}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="dados" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 grid grid-cols-4 w-auto">
            <TabsTrigger value="dados" className="gap-1.5">
              <FileText size={14} /> Dados Gerais
            </TabsTrigger>
            <TabsTrigger value="execucao" className="gap-1.5">
              <Play size={14} /> Execução
            </TabsTrigger>
            <TabsTrigger value="evidencias" className="gap-1.5">
              <Paperclip size={14} /> Evidências
            </TabsTrigger>
            <TabsTrigger value="conclusao" className="gap-1.5">
              <CheckCircle2 size={14} /> Conclusão
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="dados" className="mt-0">
              <DadosGeraisTab procedimento={procedimento} />
            </TabsContent>

            <TabsContent value="execucao" className="mt-0">
              <ExecucaoProcedimentoPanel procedimento={procedimento} />
            </TabsContent>

            <TabsContent value="evidencias" className="mt-0">
              <DocumentosProcedimentoPanel
                procedimentoId={procedimento.id}
                defaultTipo={defaultDocTipo}
                triggerLabel={triggerDocLabel}
              />
            </TabsContent>

            <TabsContent value="conclusao" className="mt-0">
              <ConclusaoProcedimentoPanel procedimento={procedimento} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function DadosGeraisTab({ procedimento }: { procedimento: any }) {
  const fmtDate = (d?: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <Field label="Cliente" value={procedimento.clientes?.razao_social || "—"} />
      <Field label="Trabalho" value={procedimento.trabalhos_auditoria?.nome_trabalho || "—"} />
      <Field label="Data do Procedimento" value={fmtDate(procedimento.data_procedimento)} />
      <Field label="Data Base de Referência" value={fmtDate(procedimento.data_base_referencia)} />
      <Field
        label="Grupo Contábil"
        value={
          procedimento.codigo_mcse
            ? `${procedimento.codigo_mcse} — ${procedimento.descricao_mcse || ""}`
            : "—"
        }
        className="col-span-2"
      />
      <Field label="Responsável Execução" value={procedimento.exec?.nome || "—"} />
      <Field label="Responsável Revisão" value={procedimento.rev?.nome || "—"} />
      <Field label="Descrição" value={procedimento.descricao || "—"} className="col-span-2" />
      <Field
        label="Objetivo do Procedimento"
        value={procedimento.objetivo_procedimento || "—"}
        className="col-span-2"
      />
    </div>
  );
}

function Field({ label, value, className = "" }: { label: string; value: any; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="mt-1 whitespace-pre-wrap break-words">{value}</div>
    </div>
  );
}
