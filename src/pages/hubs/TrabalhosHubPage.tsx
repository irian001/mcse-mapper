import { Briefcase, BookOpen, ClipboardList } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import HubGrid, { type HubItem } from "@/components/HubGrid";

const items: HubItem[] = [
  { to: "/trabalhos", label: "Trabalhos de Auditoria", description: "Gerencie todos os trabalhos por exercício.", icon: Briefcase },
  { to: "/balancetes", label: "Balancetes", description: "Importação e análise de balancetes contábeis.", icon: BookOpen },
  { to: "/papeis-trabalho", label: "Papéis de Trabalho (PTA)", description: "Consolidação e conclusões por conta MCSE.", icon: ClipboardList },
];

export default function TrabalhosHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Trabalhos" description="Execução e organização dos trabalhos de auditoria." />
      <HubGrid items={items} columns={3} />
    </div>
  );
}
