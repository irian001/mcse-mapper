import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Link } from "lucide-react";
import { toast } from "sonner";

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  ptaId: string;
  trabalhoId: string;
  clienteId: string;
  exercicioId: string;
  contaMcseId: string | null;
  linkedLineIds: string[];
  onClose: () => void;
}

export default function PtaVincularLinhasDialog({ ptaId, trabalhoId, clienteId, exercicioId, contaMcseId, linkedLineIds, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [onlyMcse, setOnlyMcse] = useState(!!contaMcseId);
  const [selected, setSelected] = useState<string[]>([]);

  const { data: linhas = [], isLoading } = useQuery({
    queryKey: ["linhas_para_vincular", trabalhoId, clienteId, exercicioId],
    queryFn: async () => {
      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data } = await supabase
          .from("balancete_linhas")
          .select("id, codigo_conta_balancete, descricao_conta_balancete, saldo_atual, valor_validado, diferenca_validacao, status_linha, possui_pendencia, severidade, conta_mcse_id, codigo_mcse")
          .eq("trabalho_auditoria_id", trabalhoId)
          .eq("cliente_id", clienteId)
          .eq("exercicio_id", exercicioId)
          .order("codigo_conta_balancete")
          .range(from, from + pageSize - 1);
        if (data) allData.push(...data);
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }
      return allData;
    },
  });

  const available = linhas.filter((l: any) => {
    if (linkedLineIds.includes(l.id)) return false;
    if (onlyMcse && contaMcseId && l.conta_mcse_id !== contaMcseId) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!l.codigo_conta_balancete.toLowerCase().includes(s) && !l.descricao_conta_balancete.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const vincularMutation = useMutation({
    mutationFn: async () => {
      const rows = selected.map(linhaId => {
        const l = linhas.find((x: any) => x.id === linhaId);
        return {
          papel_trabalho_id: ptaId,
          balancete_linha_id: linhaId,
          trabalho_auditoria_id: trabalhoId,
          saldo_atual_linha: l?.saldo_atual,
          valor_validado_linha: l?.valor_validado,
          diferenca_linha: l?.diferenca_validacao,
          status_linha_snapshot: l?.status_linha,
        };
      });
      const { error } = await supabase.from("papel_trabalho_linhas").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selected.length} linha(s) vinculada(s)`);
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Link size={18} /> Vincular Linhas ao PTA
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Buscar conta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          {contaMcseId && (
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="checkbox" checked={onlyMcse} onChange={e => setOnlyMcse(e.target.checked)} className="rounded" />
              Apenas mesma conta MCSE
            </label>
          )}
        </div>

        <div className="text-xs text-muted-foreground">{available.length} linhas disponíveis · {selected.length} selecionadas</div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <div className="rounded border max-h-[350px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-xs">Código</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">MCSE</TableHead>
                  <TableHead className="text-xs text-right">Saldo</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {available.slice(0, 200).map((l: any) => (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleSelect(l.id)}>
                    <TableCell>
                      <Checkbox checked={selected.includes(l.id)} onCheckedChange={() => toggleSelect(l.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.codigo_conta_balancete}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{l.descricao_conta_balancete}</TableCell>
                    <TableCell className="font-mono text-xs">{l.codigo_mcse || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(l.saldo_atual)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{l.status_linha || "pendente"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {available.length > 200 && <p className="text-xs text-center text-muted-foreground py-1">Mostrando 200 de {available.length}</p>}
          </div>
        )}

        <Button onClick={() => vincularMutation.mutate()} disabled={selected.length === 0 || vincularMutation.isPending} className="w-full">
          {vincularMutation.isPending ? "Vinculando..." : `Vincular ${selected.length} Linha(s)`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
