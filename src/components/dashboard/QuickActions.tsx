import { Link } from "react-router-dom";
import { UserPlus, FileSignature, Briefcase, BookOpen, Boxes, FileText, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuickAction {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: "primary" | "info" | "success" | "warning" | "chart3" | "chart5";
}

const TONE: Record<QuickAction["tone"], { bg: string; ring: string; icon: string }> = {
  primary: { bg: "bg-primary/10", ring: "group-hover:ring-primary/40", icon: "text-primary" },
  info: { bg: "bg-info/10", ring: "group-hover:ring-info/40", icon: "text-info" },
  success: { bg: "bg-success/10", ring: "group-hover:ring-success/40", icon: "text-success" },
  warning: { bg: "bg-warning/15", ring: "group-hover:ring-warning/40", icon: "text-warning-foreground" },
  chart3: { bg: "bg-chart-3/10", ring: "group-hover:ring-chart-3/40", icon: "text-chart-3" },
  chart5: { bg: "bg-chart-5/10", ring: "group-hover:ring-chart-5/40", icon: "text-chart-5" },
};

const actions: QuickAction[] = [
  { to: "/clientes?novo=1", label: "Novo Cliente", description: "Cadastrar empresa auditada", icon: UserPlus, tone: "primary" },
  { to: "/contratos?novo=1", label: "Novo Contrato", description: "Registrar contrato de auditoria", icon: FileSignature, tone: "info" },
  { to: "/trabalhos?novo=1", label: "Novo Trabalho", description: "Iniciar trabalho de auditoria", icon: Briefcase, tone: "chart3" },
  { to: "/balancetes?importar=1", label: "Importar Balancete", description: "Carregar balancete contábil", icon: BookOpen, tone: "warning" },
  { to: "/procedimentos-auxiliares?novo=contagem_estoque", label: "Nova Contagem de Estoque", description: "Iniciar contagem física", icon: Boxes, tone: "success" },
  { to: "/solicitacoes?novo=1", label: "Nova Solicitação", description: "Solicitar documentos ao cliente", icon: FileText, tone: "chart5" },
];

export default function QuickActions() {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-3">Ações rápidas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          const tone = TONE[a.tone];
          return (
            <Link key={a.to} to={a.to} className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
              <Card className={cn(
                "p-4 flex items-center gap-3 transition-all duration-200 ring-1 ring-transparent",
                "group-hover:-translate-y-0.5 group-hover:shadow-md",
                tone.ring,
              )}>
                <div className={cn("h-11 w-11 rounded-md flex items-center justify-center shrink-0", tone.bg)}>
                  <Icon size={22} className={tone.icon} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{a.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
