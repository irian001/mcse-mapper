import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, FileText, CheckCircle2, Clock, Eye, XCircle } from "lucide-react";
import DocumentosReferenciaBlock from "./DocumentosReferenciaBlock";
import LinkedDocsBlock from "./LinkedDocsBlock";

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return v.toFixed(1) + "%";
}

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente", icon: Clock, cls: "text-yellow-700" },
  { value: "em_analise", label: "Em Análise", icon: Eye, cls: "text-blue-700" },
  { value: "validado", label: "Validado", icon: CheckCircle2, cls: "text-green-700" },
  { value: "divergente", label: "Divergente", icon: XCircle, cls: "text-destructive" },
  { value: "revisado", label: "Revisado", icon: CheckCircle2, cls: "text-purple-700" },
  { value: "concluido", label: "Concluído", icon: CheckCircle2, cls: "text-green-800" },
];

const SEVERIDADE_OPTIONS = [
  { value: "baixa", label: "Baixa", cls: "bg-green-100 text-green-800 border-green-200" },
  { value: "media", label: "Média", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "alta", label: "Alta", cls: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "critica", label: "Crítica", cls: "bg-red-100 text-red-800 border-red-200" },
];

interface Props {
  linha: any;
  balanceteId: string;
  onClose: () => void;
}

export default function BalanceteLinhaDetailDialog({ linha, balanceteId, onClose }: Props) {
  const queryClient = useQueryClient();

  // Form state
  const [valorValidado, setValorValidado] = useState("");
  const [statusLinha, setStatusLinha] = useState("pendente");
  const [comentarioAuditor, setComentarioAuditor] = useState("");
  const [comentarioRevisor, setComentarioRevisor] = useState("");
  const [possuiPendencia, setPossuiPendencia] = useState(false);
  const [descricaoPendencia, setDescricaoPendencia] = useState("");
  const [severidade, setSeveridade] = useState<string>("");
  const [diferencaAceita, setDiferencaAceita] = useState<boolean | null>(null);
  const [justificativa, setJustificativa] = useState("");

  // Check if this line is linked to a closed PTA
  const { data: ptaFechado } = useQuery({
    queryKey: ["pta_fechado_check", linha?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("papel_trabalho_linhas")
        .select("papel_trabalho_id, papeis_trabalho(fechado, titulo_pta)")
        .eq("balancete_linha_id", linha.id);
      const closed = (data || []).find((d: any) => d.papeis_trabalho?.fechado === true);
      return closed ? closed.papeis_trabalho : null;
    },
    enabled: !!linha?.id,
  });

  const validationDisabled = linha?.is_analitica === true || !!ptaFechado;

  useEffect(() => {
    if (linha) {
      setValorValidado(linha.valor_validado != null ? String(linha.valor_validado) : "");
      setStatusLinha(linha.status_linha || "pendente");
      setComentarioAuditor(linha.comentario_auditor || "");
      setComentarioRevisor(linha.comentario_revisor || "");
      setPossuiPendencia(linha.possui_pendencia || false);
      setDescricaoPendencia(linha.descricao_pendencia || "");
      setSeveridade(linha.severidade || "");
      setDiferencaAceita(linha.diferenca_aceita ?? null);
      setJustificativa(linha.justificativa_diferenca || "");
    }
  }, [linha]);

  const diferencaCalc = valorValidado !== ""
    ? (linha?.saldo_atual ?? 0) - parseFloat(valorValidado || "0")
    : null;

  const hasDiferenca = diferencaCalc != null && diferencaCalc !== 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (diferencaAceita === true && !justificativa.trim()) {
        throw new Error("Justificativa é obrigatória quando a diferença é aceita.");
      }
      if (possuiPendencia && severidade && !descricaoPendencia.trim()) {
        throw new Error("Descrição da pendência é obrigatória quando severidade é informada.");
      }

      const valValidado = valorValidado !== "" ? parseFloat(valorValidado) : null;
      const difVal = valValidado != null ? (linha.saldo_atual ?? 0) - valValidado : null;

      const updateData: any = {
        valor_validado: valValidado,
        diferenca_validacao: difVal,
        status_linha: statusLinha,
        comentario_auditor: comentarioAuditor.trim() || null,
        comentario_revisor: comentarioRevisor.trim() || null,
        possui_pendencia: possuiPendencia,
        descricao_pendencia: descricaoPendencia.trim() || null,
        severidade: severidade || null,
        diferenca_aceita: hasDiferenca ? diferencaAceita : null,
        justificativa_diferenca: justificativa.trim() || null,
      };

      if (statusLinha === "validado" || statusLinha === "divergente" || statusLinha === "concluido") {
        updateData.data_validacao = new Date().toISOString();
      }
      if (statusLinha === "revisado") {
        updateData.data_revisao = new Date().toISOString();
      }

      const { error } = await supabase
        .from("balancete_linhas")
        .update(updateData)
        .eq("id", linha.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Linha atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["balancete_linhas", balanceteId] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  if (!linha) return null;

  return (
    <Dialog open={!!linha} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText size={18} />
            Detalhe da Linha — {linha.codigo_conta_balancete}
          </DialogTitle>
        </DialogHeader>

        {/* Block 1 — Account Data */}
        <div className="space-y-1">
          <h4 className="font-medium text-sm text-muted-foreground">Dados da Conta</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm bg-muted/30 rounded-md p-3">
            <span className="text-muted-foreground">Código:</span>
            <span className="font-mono">{linha.codigo_conta_balancete}</span>
            <span className="text-muted-foreground">Descrição:</span>
            <span className="font-semibold text-base">{linha.descricao_conta_balancete}</span>
            <span className="text-muted-foreground">Classificação:</span>
            <span className="font-mono">{linha.classificacao_origem || "—"}</span>
            <span className="text-muted-foreground">MCSE:</span>
            <span className="font-mono">{linha.codigo_mcse || "—"} {linha.descricao_mcse ? `— ${linha.descricao_mcse}` : ""}</span>
            <span className="text-muted-foreground">Grupo / Subgrupo:</span>
            <span>{linha.grupo_mcse || "—"} / {linha.subgrupo_mcse || "—"}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs bg-muted/30 rounded-md p-3">
            <div className="text-center">
              <span className="text-muted-foreground block">Saldo Ant.</span>
              <span className="font-mono font-medium">{fmt(linha.saldo_anterior)}</span>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground block">Débitos</span>
              <span className="font-mono font-medium">{fmt(linha.debitos)}</span>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground block">Créditos</span>
              <span className="font-mono font-medium">{fmt(linha.creditos)}</span>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground block">Saldo Atual</span>
              <span className="font-mono font-semibold">{fmt(linha.saldo_atual)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Block 2 — Validation */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Validação</h4>
          {ptaFechado && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-md p-3 border border-destructive/30 flex items-center gap-2">
              <XCircle size={14} />
              PTA fechado ({ptaFechado.titulo_pta || "sem título"}) — validação bloqueada. Reabra o PTA para continuar.
            </div>
          )}
          {linha.is_analitica === true && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 border border-border">
              Conta analítica — a validação é permitida apenas para contas sintéticas (níveis superiores).
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor Validado</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Informe o valor validado"
                value={valorValidado}
                onChange={e => setValorValidado(e.target.value)}
                className="h-9"
                disabled={validationDisabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Diferença (saldo − validado)</Label>
              <div className={`h-9 flex items-center px-3 rounded-md border text-sm font-mono ${
                diferencaCalc != null && diferencaCalc !== 0 ? "bg-amber-50 border-amber-200 text-amber-700 font-semibold" : "bg-muted/50"
              }`}>
                {diferencaCalc != null ? fmt(diferencaCalc) : "—"}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-green-300 text-green-700 hover:bg-green-50"
            disabled={validationDisabled}
            onClick={() => {
              setValorValidado(String(linha.saldo_atual ?? 0));
              setStatusLinha("validado");
            }}
          >
            <CheckCircle2 size={14} className="mr-1" />
            Validar Saldo
          </Button>

          <div className="space-y-1.5">
            <Label className="text-xs">Status da Linha</Label>
            <Select value={statusLinha} onValueChange={setStatusLinha} disabled={validationDisabled}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className={s.cls}>{s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasDiferenca && (
            <div className="space-y-2 p-3 rounded-md border border-amber-200 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dif_aceita"
                  checked={diferencaAceita === true}
                  onCheckedChange={(checked) => setDiferencaAceita(checked === true ? true : false)}
                />
                <Label htmlFor="dif_aceita" className="text-xs cursor-pointer">Diferença aceita pelo auditor</Label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Justificativa da diferença
                  {diferencaAceita === true && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Textarea
                  placeholder={diferencaAceita === true ? "Obrigatório — justificativa técnica" : "Opcional"}
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                  className="min-h-[50px]"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Block 3 — Comments */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Comentários</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Comentário do Auditor</Label>
            <Textarea
              placeholder="Registre observações da análise..."
              value={comentarioAuditor}
              onChange={e => setComentarioAuditor(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Comentário do Revisor</Label>
            <Textarea
              placeholder="Registre observações da revisão..."
              value={comentarioRevisor}
              onChange={e => setComentarioRevisor(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </div>

        <Separator />

        {/* Block 4 — Pendencies */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Pendências</h4>
          <div className="flex items-center gap-2">
            <Checkbox
              id="pendencia"
              checked={possuiPendencia}
              onCheckedChange={(checked) => setPossuiPendencia(checked === true)}
            />
            <Label htmlFor="pendencia" className="text-xs cursor-pointer">Possui pendência</Label>
          </div>
          {possuiPendencia && (
            <div className="space-y-2 p-3 rounded-md border border-yellow-200 bg-yellow-50/50">
              <div className="space-y-1.5">
                <Label className="text-xs">Severidade</Label>
                <Select value={severidade} onValueChange={setSeveridade}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {SEVERIDADE_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição da Pendência</Label>
                <Textarea
                  placeholder="Descreva a pendência..."
                  value={descricaoPendencia}
                  onChange={e => setDescricaoPendencia(e.target.value)}
                  className="min-h-[50px]"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Block 5 — Documents */}
        <DocumentosReferenciaBlock linha={linha} />

        <Separator />

        {/* Block 6 — Linked Solicitation Documents */}
        <LinkedDocsBlock linhaId={linha.id} saldoAtual={linha.saldo_atual} />

        <Separator />

        {/* Save */}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          <Save size={14} className="mr-1" />
          {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
