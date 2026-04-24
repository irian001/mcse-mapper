import { Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEstruturaAtiva } from "@/hooks/useEstruturaAtiva";

interface Props {
  /** Largura do select (classe Tailwind). Padrão: w-[260px]. */
  className?: string;
  /** Esconde o ícone à esquerda. */
  hideIcon?: boolean;
  /** Renderiza um badge à direita com o código da estrutura ativa. */
  showBadge?: boolean;
}

/**
 * Seletor compartilhado de Estrutura de Auditoria.
 * Usa o contexto persistente em localStorage via useEstruturaAtiva.
 * Se a tabela `estruturas_auditoria` não existir (Fase 1 SQL pendente),
 * o componente não renderiza nada (modo legado MCSE).
 */
export default function EstruturaSelector({ className = "w-[260px]", hideIcon, showBadge }: Props) {
  const { estruturas, estruturaId, setEstruturaId, hasEstruturas, estruturaAtiva } = useEstruturaAtiva();

  if (!hasEstruturas) return null;

  return (
    <div className="flex items-center gap-2">
      {!hideIcon && <Layers size={14} className="text-muted-foreground" />}
      <Select value={estruturaId || ""} onValueChange={(v) => setEstruturaId(v)}>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Estrutura de auditoria" />
        </SelectTrigger>
        <SelectContent>
          {estruturas.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              <span className="font-mono text-xs mr-2">{e.codigo}</span>
              {e.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showBadge && estruturaAtiva && (
        <Badge variant="outline" className="text-xs">
          {estruturaAtiva.codigo}
        </Badge>
      )}
    </div>
  );
}
