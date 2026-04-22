import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";

const STATUS_PROCEDIMENTO = [
  { value: "planejado", label: "Planejado", className: "bg-muted text-muted-foreground border-border" },
  { value: "em_execucao", label: "Em Execução", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  { value: "aguardando_documentos", label: "Aguardando Documentos", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  { value: "em_revisao", label: "Em Revisão", className: "bg-primary/15 text-primary border-primary/30" },
  { value: "concluido", label: "Concluído", className: "bg-success/15 text-success border-success/30" },
  { value: "encerrado", label: "Encerrado", className: "bg-destructive/15 text-destructive border-destructive/30" },
];

interface Props {
  procedimento: any;
  onUpdated?: () => void;
}

export default function ConclusaoProcedimentoPanel({ procedimento, onUpdated }: Props) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(procedimento?.status_procedimento || "planejado");
  const [conclusaoPreliminar, setConclusaoPreliminar] = useState(procedimento?.conclusao_preliminar || "");
  const [conclusaoFinal, setConclusaoFinal] = useState(procedimento?.conclusao_final || "");
  const [observacoes, setObservacoes] = useState(procedimento?.observacoes || "");

  useEffect(() => {
    setStatus(procedimento?.status_procedimento || "planejado");
    setConclusaoPreliminar(procedimento?.conclusao_preliminar || "");
    setConclusaoFinal(procedimento?.conclusao_final || "");
    setObservacoes(procedimento?.observacoes || "");
  }, [procedimento?.id]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("procedimentos_auxiliares")
        .update({
          status_procedimento: status,
          conclusao_preliminar: conclusaoPreliminar || null,
          conclusao_final: conclusaoFinal || null,
          observacoes: observacoes || null,
        })
        .eq("id", procedimento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conclusão salva");
      qc.invalidateQueries({ queryKey: ["procedimentos-auxiliares"] });
      onUpdated?.();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const cfg = STATUS_PROCEDIMENTO.find((s) => s.value === status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} /> Conclusão e Status
          </h3>
          <p className="text-xs text-muted-foreground">
            Registre a análise do auditor, conclusões preliminar/final e atualize o status do procedimento.
          </p>
        </div>
        <Badge variant="outline" className={cfg?.className}>
          {cfg?.label || status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 bg-card border border-border rounded-lg p-4">
        <div>
          <Label>Status do Procedimento *</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_PROCEDIMENTO.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Conclusão Preliminar</Label>
          <Textarea
            rows={3}
            value={conclusaoPreliminar}
            onChange={(e) => setConclusaoPreliminar(e.target.value)}
            placeholder="Análise inicial do auditor após execução do procedimento..."
          />
        </div>

        <div>
          <Label>Conclusão Final</Label>
          <Textarea
            rows={4}
            value={conclusaoFinal}
            onChange={(e) => setConclusaoFinal(e.target.value)}
            placeholder="Conclusão definitiva, considerando evidências e revisão..."
          />
        </div>

        <div>
          <Label>Observações Finais</Label>
          <Textarea
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Notas adicionais, ressalvas ou pontos de atenção..."
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save size={14} className="mr-1" />
            {save.isPending ? "Salvando..." : "Salvar Conclusão"}
          </Button>
        </div>
      </div>
    </div>
  );
}
