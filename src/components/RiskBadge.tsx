import { Badge } from "@/components/ui/badge";

type RiskType = "alta" | "media" | "baixa" | "sem_sugestao";

const riskConfig: Record<RiskType, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-success/15 text-success border-success/30" },
  media: { label: "Média", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  baixa: { label: "Baixa", className: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  sem_sugestao: { label: "Sem sugestão", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function RiskBadge({ risk }: { risk: RiskType }) {
  const c = riskConfig[risk];
  return <Badge variant="outline" className={`text-xs font-medium ${c.className}`}>{c.label}</Badge>;
}
