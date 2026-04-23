import { Wallet, Boxes, FileText, ShoppingCart, Building2, ClipboardCheck } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import HubGrid, { type HubItem } from "@/components/HubGrid";

const items: HubItem[] = [
  { to: "/procedimentos-auxiliares?tipo=contagem_caixa", label: "Contagem de Caixa", description: "Registro de contagem de numerário e termos.", icon: Wallet },
  { to: "/procedimentos-auxiliares?tipo=contagem_estoque", label: "Contagem de Estoque", description: "Contagem física com importação por bloco.", icon: Boxes },
  { to: "/procedimentos-auxiliares?tipo=faturas_aberto", label: "Faturas em Aberto", description: "Análise de títulos e faturas pendentes.", icon: FileText },
  { to: "/procedimentos-auxiliares?tipo=ordens_compra", label: "Ordens de Compra", description: "Verificação de ordens de compra.", icon: ShoppingCart },
  { to: "/procedimentos-auxiliares?tipo=ordens_imobilizacao", label: "Ordens de Imobilização", description: "Movimentação e baixa de imobilizado.", icon: Building2 },
  { to: "/procedimentos-auxiliares", label: "Todos os Procedimentos", description: "Visão consolidada de todos os procedimentos.", icon: ClipboardCheck },
];

export default function ProcedimentosHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Procedimentos" description="Procedimentos auxiliares e evidências de auditoria." />
      <HubGrid items={items} columns={3} />
    </div>
  );
}
