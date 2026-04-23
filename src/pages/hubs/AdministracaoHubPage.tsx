import { Database, List, GitCompare, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import HubGrid, { type HubItem } from "@/components/HubGrid";

const items: HubItem[] = [
  { to: "/mcse", label: "Estruturas de Referência", description: "Base MCSE: grupos, subgrupos e contas.", icon: Database },
  { to: "/plano-contas", label: "Plano de Contas", description: "Plano de contas dos clientes.", icon: List },
  { to: "/mapeamento", label: "Mapeamento de Contas", description: "Vínculo entre contas do cliente e MCSE.", icon: GitCompare },
  { to: "/regras", label: "Regras de Auditoria", description: "Regras documentais, instruções e ERP.", icon: ShieldCheck },
];

export default function AdministracaoHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Administração" description="Configurações e bases estruturais do sistema." />
      <HubGrid items={items} columns={2} />
    </div>
  );
}
