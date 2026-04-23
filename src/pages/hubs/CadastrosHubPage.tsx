import { Users, UserCheck, Package, UserPlus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import HubGrid, { type HubItem } from "@/components/HubGrid";

const items: HubItem[] = [
  { to: "/clientes", label: "Clientes", description: "Gerencie a carteira de clientes auditados.", icon: Users },
  { to: "/auditores", label: "Auditores", description: "Equipe responsável pelas auditorias.", icon: UserCheck },
  { to: "/produtos-auditoria", label: "Produtos de Auditoria", description: "Catálogo de produtos contratáveis.", icon: Package },
  { to: "/cliente-usuarios", label: "Usuários do Cliente", description: "Acesso de clientes ao portal externo.", icon: UserPlus },
];

export default function CadastrosHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Cadastros" description="Acesse as bases de cadastro do sistema." />
      <HubGrid items={items} columns={2} />
    </div>
  );
}
