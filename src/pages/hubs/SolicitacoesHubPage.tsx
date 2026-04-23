import { FileText, Inbox, AlertCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import HubGrid, { type HubItem } from "@/components/HubGrid";

const items: HubItem[] = [
  { to: "/solicitacoes", label: "Solicitações", description: "Gestão de solicitações documentais ao cliente.", icon: FileText },
  { to: "/solicitacoes?aba=documentos", label: "Documentos Recebidos", description: "Arquivos enviados pelos clientes.", icon: Inbox },
  { to: "/solicitacoes?aba=pendencias", label: "Pendências", description: "Itens em atraso ou aguardando resposta.", icon: AlertCircle },
];

export default function SolicitacoesHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Solicitações" description="Comunicação documental com os clientes." />
      <HubGrid items={items} columns={3} />
    </div>
  );
}
