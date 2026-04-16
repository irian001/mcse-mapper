import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Package } from "lucide-react";
import ContratoEscopoTab from "./ContratoEscopoTab";

interface Props {
  contrato: any;
  open: boolean;
  onClose: () => void;
}

export default function ContratoDetailDialog({ contrato, open, onClose }: Props) {
  if (!contrato) return null;

  const clienteNome = contrato.clientes?.nome_fantasia || contrato.clientes?.razao_social || "—";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature size={18} />
            Contrato: {contrato.numero_contrato || contrato.descricao}
            <Badge variant="outline" className="ml-2 text-xs">{clienteNome}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="escopo" className="mt-2">
          <TabsList>
            <TabsTrigger value="escopo" className="flex items-center gap-1.5">
              <Package size={14} /> Produtos do Contrato
            </TabsTrigger>
          </TabsList>
          <TabsContent value="escopo" className="mt-4">
            <ContratoEscopoTab
              contratoId={contrato.id}
              tipoContratacao={contrato.tipo_contratacao || "preco_fixo"}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
