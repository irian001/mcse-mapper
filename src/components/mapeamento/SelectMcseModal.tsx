import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchContas } from "@/lib/supabase-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MappingInfo {
  allSameMcse: boolean;
  commonMcseCode?: string;
  commonMcseDesc?: string;
  hasDifferentMappings: boolean;
  mappedCount: number;
}

interface SelectMcseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (contaMcse: any) => void;
  mappingInfo?: MappingInfo;
}

export default function SelectMcseModal({ open, onOpenChange, selectedCount, onConfirm, mappingInfo }: SelectMcseModalProps) {
  const [search, setSearch] = useState("");
  const [selectedMcse, setSelectedMcse] = useState<any>(null);

  const { data: mcseContas = [] } = useQuery({
    queryKey: ["mcse_contas_all"],
    queryFn: async () => {
      const { data } = await fetchContas();
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return mcseContas;
    const s = search.toLowerCase();
    return mcseContas.filter((c: any) =>
      (c.codigo_mcse || "").toLowerCase().includes(s) ||
      (c.descricao_conta || "").toLowerCase().includes(s) ||
      (c.mcse_grupos?.descricao_grupo || "").toLowerCase().includes(s) ||
      (c.mcse_subgrupos?.descricao_subgrupo || "").toLowerCase().includes(s)
    );
  }, [mcseContas, search]);

  const handleConfirm = () => {
    if (selectedMcse) {
      onConfirm(selectedMcse);
      setSelectedMcse(null);
      setSearch("");
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSelectedMcse(null);
      setSearch("");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mapear {selectedCount} conta(s) para MCSE</DialogTitle>
          <DialogDescription>
            Pesquise e selecione uma conta da Base MCSE para aplicar a todas as contas selecionadas.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição MCSE..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border rounded">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-28">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-40">Grupo</TableHead>
                <TableHead className="w-40">Subgrupo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((mc: any) => (
                <TableRow
                  key={mc.id}
                  className={`cursor-pointer transition-colors ${selectedMcse?.id === mc.id ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-muted/50"}`}
                  onClick={() => setSelectedMcse(mc)}
                >
                  <TableCell className="font-mono text-sm font-medium">{mc.codigo_mcse}</TableCell>
                  <TableCell className="text-sm">{mc.descricao_conta}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{mc.mcse_grupos?.descricao_grupo || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{mc.mcse_subgrupos?.descricao_subgrupo || "—"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhuma conta MCSE encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filtered.length > 200 && (
            <p className="text-center text-xs text-muted-foreground py-2">Mostrando 200 de {filtered.length}. Refine a busca.</p>
          )}
        </ScrollArea>

        {selectedMcse && (
          <div className="bg-primary/5 border border-primary/20 rounded p-3 text-sm">
            <span className="text-muted-foreground">Selecionada: </span>
            <span className="font-mono font-medium">{selectedMcse.codigo_mcse}</span>
            {" — "}
            <span>{selectedMcse.descricao_conta}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedMcse}>
            Confirmar mapeamento em lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
