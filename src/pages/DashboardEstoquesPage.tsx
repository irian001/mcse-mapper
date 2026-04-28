import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Boxes,
  PackageCheck,
  PackageX,
  AlertTriangle,
  DollarSign,
  Percent,
  Building2,
  Layers,
  TrendingDown,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KpiDef {
  label: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "neutral" | "positive" | "warning" | "negative";
}

const KPIS: KpiDef[] = [
  { label: "Itens importados", icon: Boxes, hint: "Total de itens recebidos para contagem" },
  { label: "Itens contados", icon: PackageCheck, tone: "positive" },
  { label: "Itens não contados", icon: PackageX, tone: "warning" },
  { label: "Itens com divergência", icon: AlertTriangle, tone: "negative" },
  { label: "Diferença financeira", icon: DollarSign, hint: "Impacto consolidado em R$" },
  { label: "Percentual de execução", icon: Percent, hint: "Contados / Importados" },
];

interface ChartPlaceholderDef {
  title: string;
  description: string;
  icon: LucideIcon;
}

const CHARTS: ChartPlaceholderDef[] = [
  {
    title: "Execução da contagem",
    description: "Evolução de itens contados vs. pendentes ao longo do tempo.",
    icon: Activity,
  },
  {
    title: "Divergências por filial",
    description: "Distribuição das divergências encontradas entre as filiais.",
    icon: Building2,
  },
  {
    title: "Divergências por tipo de estoque",
    description: "Comparativo de divergências por categoria/tipo de estoque.",
    icon: Layers,
  },
  {
    title: "Maiores diferenças",
    description: "Ranking dos itens com maior impacto financeiro.",
    icon: TrendingDown,
  },
];

export default function DashboardEstoquesPage() {
  const [searchParams] = useSearchParams();
  const clienteId = searchParams.get("cliente_id");
  const trabalhoId = searchParams.get("trabalho_id");
  const procedimentoId = searchParams.get("procedimento_id");

  const hasContexto = Boolean(clienteId || trabalhoId || procedimentoId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Estoques"
        description="Análise consolidada das contagens de estoque por cliente, trabalho, filial, setor e tipo de estoque."
        actions={
          <Badge variant="outline" className="gap-1.5">
            <BarChart3 size={12} /> Em construção
          </Badge>
        }
      />

      {hasContexto && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-medium text-foreground">Contexto recebido:</span>
            {clienteId && <span>cliente_id: <code className="text-foreground">{clienteId}</code></span>}
            {trabalhoId && <span>trabalho_id: <code className="text-foreground">{trabalhoId}</code></span>}
            {procedimentoId && <span>procedimento_id: <code className="text-foreground">{procedimentoId}</code></span>}
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FiltroPlaceholder label="Cliente" placeholder="Todos os clientes" />
          <FiltroPlaceholder label="Trabalho de Auditoria" placeholder="Todos os trabalhos" />
          <FiltroPlaceholder label="Procedimento de Contagem" placeholder="Todos os procedimentos" />
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Gráficos placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CHARTS.map((c) => (
          <ChartPlaceholder key={c.title} {...c} />
        ))}
      </div>
    </div>
  );
}

function FiltroPlaceholder({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function KpiCard({ label, icon: Icon, hint, tone = "neutral" }: KpiDef) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "warning"
      ? "text-warning-foreground"
      : tone === "negative"
      ? "text-destructive"
      : "text-primary";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold text-foreground leading-none">—</p>
          {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
        </div>
        <div className={`shrink-0 ${toneClass}`}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}

function ChartPlaceholder({ title, description, icon: Icon }: ChartPlaceholderDef) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon size={14} className="text-primary" /> {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="h-48 rounded-md border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-muted-foreground">
          <BarChart3 size={28} className="opacity-40 mb-2" />
          <p className="text-xs">Gráfico será implementado em etapa futura</p>
        </div>
      </CardContent>
    </Card>
  );
}
