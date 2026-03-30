import { Badge } from "@/components/ui/badge";

type StatusType = "mapeado" | "nao_mapeado" | "homologado" | "ativo" | "inativo" | "critico";

const config: Record<StatusType, { label: string; className: string }> = {
  mapeado: { label: "Mapeado", className: "bg-info/15 text-info border-info/30" },
  nao_mapeado: { label: "Não Mapeado", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  homologado: { label: "Homologado", className: "bg-success/15 text-success border-success/30" },
  ativo: { label: "Ativo", className: "bg-success/15 text-success border-success/30" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-border" },
  critico: { label: "Crítica", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function StatusBadge({ status }: { status: StatusType }) {
  const c = config[status];
  return <Badge variant="outline" className={`text-xs font-medium ${c.className}`}>{c.label}</Badge>;
}
