import { Database, List, GitCompare, ShieldCheck, Building2, Layers, Network } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import HubGrid, { type HubItem } from "@/components/HubGrid";

const items: HubItem[] = [
  { to: "/empresa-auditoria", label: "Empresa de Auditoria", description: "Dados cadastrais e registros profissionais da empresa.", icon: Building2 },
  { to: "/segmentos-modalidades", label: "Segmentos e Modalidades de Atuação", description: "Visualize segmentos e mantenha modalidades por segmento.", icon: Network },
  { to: "/estruturas-auditoria", label: "Estruturas de Auditoria", description: "Gerencie estruturas por segmento (MCSE, COSIF, etc.).", icon: Layers },
  { to: "/mcse", label: "Estruturas base de referência", description: "Plano de contas estruturado (grupos, subgrupos e contas).", icon: Database },
  { to: "/plano-contas", label: "Plano de Contas", description: "Plano de contas dos clientes.", icon: List },
  { to: "/mapeamento", label: "Mapeamento de Contas", description: "Vínculo entre contas do cliente e MCSE.", icon: GitCompare },
  { to: "/regras", label: "Regras de Auditoria", description: "Regras documentais, instruções e ERP.", icon: ShieldCheck },
];

export default function AdministracaoHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Parâmetros" description="Configurações e bases estruturais do sistema." />
      <HubGrid items={items} columns={2} />
    </div>
  );
}
