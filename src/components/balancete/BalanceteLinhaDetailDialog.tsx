import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return v.toFixed(1) + "%";
}

function statusLocBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    localizada: { label: "Localizada", cls: "bg-green-100 text-green-800 border-green-200" },
    localizada_por_codigo: { label: "Por Código", cls: "bg-green-50 text-green-700 border-green-200" },
    localizada_por_classificacao: { label: "Por Classif.", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    localizada_por_descricao: { label: "Por Desc.", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    nao_localizada: { label: "Não Localizada", cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const m = map[s] || { label: s, cls: "" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

function statusMapBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    mapeado: { label: "Mapeado", cls: "bg-green-100 text-green-800 border-green-200" },
    sem_mapeamento: { label: "Sem MCSE", cls: "bg-orange-100 text-orange-800 border-orange-200" },
    conta_nao_localizada: { label: "Conta N/L", cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const m = map[s] || { label: s, cls: "" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

function statusValBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pronto_para_analise: { label: "Pronto", cls: "bg-green-100 text-green-800 border-green-200" },
    revisar_mapeamento: { label: "Revisar", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    pendente: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[s] || { label: s, cls: "" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

interface Props {
  linha: any;
  balanceteId: string;
  onClose: () => void;
}

export default function BalanceteLinhaDetailDialog({ linha, balanceteId, onClose }: Props) {
  const queryClient = useQueryClient();

  const [valorValidado, setValorValidado] = useState<string>("");
  const [diferencaAceita, setDiferencaAceita] = useState<boolean | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (linha) {
      setValorValidado(linha.valor_validado != null ? String(linha.valor_validado) : "");
      setDiferencaAceita(linha.diferenca_aceita ?? null);
      setJustificativa(linha.justificativa_diferenca ?? "");
      setError("");
    }
  }, [linha]);

  const diferencaValidacao = valorValidado !== ""
    ? (linha?.saldo_atual ?? 0) - parseFloat(valorValidado || "0")
    : linha?.diferenca_validacao ?? null;

  const hasDiferenca = diferencaValidacao != null && diferencaValidacao !== 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (diferencaAceita === true && !justificativa.trim()) {
        throw new Error("Justificativa é obrigatória quando a diferença é aceita.");
      }

      const valValidado = valorValidado !== "" ? parseFloat(valorValidado) : null;
      const difVal = valValidado != null ? (linha.saldo_atual ?? 0) - valValidado : null;

      const { error } = await supabase
        .from("balancete_linhas")
        .update({
          valor_validado: valValidado,
          diferenca_validacao: difVal,
          diferenca_aceita: hasDiferenca || difVal != null && difVal !== 0 ? diferencaAceita : null,
          justificativa_diferenca: justificativa.trim() || null,
        })
        .eq("id", linha.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Validação salva com sucesso");
      queryClient.invalidateQueries({ queryKey: ["balancete_linhas", balanceteId] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  if (!linha) return null;

  return (
    <Dialog open={!!linha} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-base">Detalhe da Linha</DialogTitle></DialogHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">Código:</span>
          <span className="font-mono">{linha.codigo_conta_balancete}</span>
          <span className="text-muted-foreground">Descrição:</span>
          <span>{linha.descricao_conta_balancete}</span>
          <span className="text-muted-foreground">Classificação:</span>
          <span className="font-mono">{linha.classificacao_origem || "—"}</span>

          <span className="text-muted-foreground col-span-2 font-medium pt-2 border-t">Conta MCSE</span>
          <span className="text-muted-foreground">Código MCSE:</span>
          <span className="font-mono">{linha.codigo_mcse || "—"}</span>
          <span className="text-muted-foreground">Descrição MCSE:</span>
          <span>{linha.descricao_mcse || "—"}</span>
          <span className="text-muted-foreground">Grupo:</span>
          <span>{linha.grupo_mcse || "—"}</span>
          <span className="text-muted-foreground">Subgrupo:</span>
          <span>{linha.subgrupo_mcse || "—"}</span>

          <span className="text-muted-foreground col-span-2 font-medium pt-2 border-t">Valores</span>
          <span className="text-muted-foreground">Saldo Anterior:</span>
          <span className="font-mono">{fmt(linha.saldo_anterior)}</span>
          <span className="text-muted-foreground">Débitos:</span>
          <span className="font-mono">{fmt(linha.debitos)}</span>
          <span className="text-muted-foreground">Créditos:</span>
          <span className="font-mono">{fmt(linha.creditos)}</span>
          <span className="text-muted-foreground">Saldo Atual:</span>
          <span className="font-mono">{fmt(linha.saldo_atual)}</span>
          <span className="text-muted-foreground">Variação Abs.:</span>
          <span className="font-mono">{fmt(linha.variacao_absoluta)}</span>
          <span className="text-muted-foreground">Variação %:</span>
          <span className="font-mono">{fmtPct(linha.variacao_percentual)}</span>

          <span className="text-muted-foreground col-span-2 font-medium pt-2 border-t">Status</span>
          <span className="text-muted-foreground">Localização:</span>
          {statusLocBadge(linha.status_localizacao_conta)}
          <span className="text-muted-foreground">MCSE:</span>
          {statusMapBadge(linha.status_mapeamento_mcse)}
          <span className="text-muted-foreground">Validação:</span>
          {statusValBadge(linha.status_validacao)}
          {linha.observacao_importacao && (
            <>
              <span className="text-muted-foreground">Observação:</span>
              <span>{linha.observacao_importacao}</span>
            </>
          )}
        </div>

        {/* Validation section */}
        <div className="border-t pt-4 mt-2 space-y-4">
          <h4 className="font-medium text-sm">Validação e Diferença</h4>

          <div className="space-y-2">
            <Label htmlFor="valor_validado" className="text-xs">Valor Validado</Label>
            <Input
              id="valor_validado"
              type="number"
              step="0.01"
              placeholder="Informe o valor validado"
              value={valorValidado}
              onChange={e => setValorValidado(e.target.value)}
              className="h-9"
            />
          </div>

          {diferencaValidacao != null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Diferença:</span>
              <span className={`font-mono text-sm font-semibold ${diferencaValidacao === 0 ? "text-green-700" : "text-amber-600"}`}>
                {fmt(diferencaValidacao)}
              </span>
            </div>
          )}

          {hasDiferenca && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="diferenca_aceita"
                  checked={diferencaAceita === true}
                  onCheckedChange={(checked) => {
                    setDiferencaAceita(checked === true ? true : checked === false ? false : null);
                    if (checked !== true) setError("");
                  }}
                />
                <Label htmlFor="diferenca_aceita" className="text-xs cursor-pointer">
                  Diferença aceita pelo auditor
                </Label>
              </div>

              <div className="space-y-1">
                <Label htmlFor="justificativa" className="text-xs">
                  Justificativa da diferença
                  {diferencaAceita === true && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Textarea
                  id="justificativa"
                  placeholder={diferencaAceita === true ? "Obrigatório — informe a justificativa técnica" : "Opcional — informe a justificativa se necessário"}
                  value={justificativa}
                  onChange={e => { setJustificativa(e.target.value); setError(""); }}
                  className="min-h-[60px]"
                  disabled={!hasDiferenca}
                />
              </div>
            </>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            <Save size={14} className="mr-1" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Validação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
