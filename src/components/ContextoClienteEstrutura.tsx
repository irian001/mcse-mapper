import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Layers, Tag } from "lucide-react";
import { useEstruturaPorCliente } from "@/hooks/useEstruturaPorCliente";

interface Props {
  clienteId?: string | null;
  /** layout compacto (uma linha) ou bloco. */
  variant?: "inline" | "block";
  className?: string;
}

/**
 * Exibe o contexto operacional derivado do cliente:
 *   - Segmento (quando disponível)
 *   - Estrutura de auditoria aplicável
 *   - Aviso discreto quando estiver em fallback MCSE.
 */
export default function ContextoClienteEstrutura({ clienteId, variant = "inline", className }: Props) {
  const { data, isLoading } = useEstruturaPorCliente(clienteId);

  if (!clienteId) return null;
  if (isLoading || !data) {
    return (
      <div className={`text-xs text-muted-foreground ${className || ""}`}>Carregando contexto…</div>
    );
  }

  const segLabel = data.segmento?.nome || (data.semSegmento ? "Sem segmento" : "—");
  const estLabel = data.estrutura ? `${data.estrutura.codigo} — ${data.estrutura.nome}` : "MCSE (legado)";

  const fallbackMsg = data.isFallback
    ? data.modoLegado
      ? "Operando em modo legado MCSE."
      : "Estrutura padrão MCSE aplicada por ausência de segmento/estrutura específica."
    : null;

  const containerCls =
    variant === "block"
      ? "rounded-md border bg-muted/30 p-3 space-y-2"
      : "flex flex-wrap items-center gap-2";

  return (
    <div className={`${containerCls} ${className || ""}`}>
      <Badge variant="outline" className="gap-1 text-xs">
        <Tag size={11} /> Segmento: <span className="font-medium ml-0.5">{segLabel}</span>
      </Badge>
      <Badge variant="outline" className="gap-1 text-xs bg-primary/10 border-primary/30 text-primary">
        <Layers size={11} /> Estrutura: <span className="font-medium ml-0.5">{estLabel}</span>
      </Badge>
      {fallbackMsg && (
        <span className="inline-flex items-center gap-1 text-[11px] text-warning-foreground/80">
          <AlertTriangle size={11} className="text-warning" /> {fallbackMsg}
        </span>
      )}
    </div>
  );
}
