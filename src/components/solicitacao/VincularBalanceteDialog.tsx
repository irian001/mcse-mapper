import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Link2, Search } from "lucide-react";

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type TipoVinculo = "principal" | "complementar" | "parcial" | "analitico";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documento: any;
  trabalhoAuditoriaId: string;
  clienteId: string;
  exercicioId: string;
}

export default function VincularBalanceteDialog({
  open,
  onOpenChange,
  documento,
  trabalhoAuditoriaId,
  clienteId,
  exercicioId,
}: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedLinhas, setSelectedLinhas] = useState<Set<string>>(new Set());
  const [valorDocumento, setValorDocumento] = useState("");
  const [valorConsiderado, setValorConsiderado] = useState("");
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo>("principal");
  const [observacao, setObservacao] = useState("");

  const { data: linhas = [], isLoading } = useQuery({
    queryKey: ["bal_linhas_vincular", trabalhoAuditoriaId],
    enabled: open && !!trabalhoAuditoriaId,
    queryFn: async () => {
      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("balancete_linhas")
          .select("id, codigo_conta_balancete, descricao_conta_balancete, saldo_atual, codigo_mcse, grupo_mcse")
          .eq("trabalho_auditoria_id", trabalhoAuditoriaId)
          .order("codigo_conta_balancete")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (data) allData.push(...data);
        hasMore = data?.length === pageSize;
        from += pageSize;
      }
      return allData;
    },
  });

  // Fetch existing links for this document
  const { data: existingLinks = [] } = useQuery({
    queryKey: ["doc_links", documento?.id],
    enabled: open && !!documento?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("balancete_linha_documentos")
        .select("balancete_linha_id")
        .eq("solicitacao_item_documento_id", documento.id);
      return (data || []).map((d: any) => d.balancete_linha_id);
    },
  });

  const filtered = linhas.filter((l: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.codigo_conta_balancete.toLowerCase().includes(s) ||
      l.descricao_conta_balancete.toLowerCase().includes(s) ||
      (l.codigo_mcse || "").toLowerCase().includes(s)
    );
  });

  const toggleLinha = (id: string) => {
    setSelectedLinhas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const vincularMutation = useMutation({
    mutationFn: async () => {
      if (selectedLinhas.size === 0) throw new Error("Selecione pelo menos uma linha");

      const rows = Array.from(selectedLinhas).map((linhaId) => ({
        balancete_linha_id: linhaId,
        solicitacao_item_documento_id: documento.id,
        trabalho_auditoria_id: trabalhoAuditoriaId,
        cliente_id: clienteId,
        exercicio_id: exercicioId,
        valor_documento: valorDocumento ? parseFloat(valorDocumento) : null,
        valor_considerado_validacao: valorConsiderado ? parseFloat(valorConsiderado) : null,
        tipo_vinculo: tipoVinculo,
        aceito_para_validacao: true,
        observacao_vinculo: observacao.trim() || null,
      }));

      const { error } = await supabase
        .from("balancete_linha_documentos")
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Documento vinculado a ${selectedLinhas.size} linha(s)`);
      qc.invalidateQueries({ queryKey: ["doc_links"] });
      qc.invalidateQueries({ queryKey: ["bal_linha_docs_summary"] });
      qc.invalidateQueries({ queryKey: ["linked_docs_detail"] });
      setSelectedLinhas(new Set());
      setValorDocumento("");
      setValorConsiderado("");
      setObservacao("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao vincular"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 size={18} /> Vincular ao Balancete
          </DialogTitle>
          <DialogDescription>
            {documento?.nome_arquivo} — v{documento?.versao}
          </DialogDescription>
        </DialogHeader>

        {/* Values */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Valor do Documento</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valorDocumento}
              onChange={(e) => setValorDocumento(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor p/ Validação</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valorConsiderado}
              onChange={(e) => setValorConsiderado(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo de Vínculo</Label>
            <Select value={tipoVinculo} onValueChange={(v) => setTipoVinculo(v as TipoVinculo)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principal">Principal</SelectItem>
                <SelectItem value="complementar">Complementar</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="analitico">Analítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="min-h-[32px] text-xs"
              rows={1}
              placeholder="Opcional..."
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2 text-muted-foreground" />
          <Input
            placeholder="Buscar conta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Lines table */}
        <div className="rounded border max-h-[340px] overflow-auto">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Carregando linhas...</p>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[80px]">MCSE</TableHead>
                  <TableHead className="text-right w-[110px]">Saldo Atual</TableHead>
                  <TableHead className="w-[60px]">Vínc.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((l: any) => {
                  const alreadyLinked = existingLinks.includes(l.id);
                  return (
                    <TableRow
                      key={l.id}
                      className={`cursor-pointer ${selectedLinhas.has(l.id) ? "bg-primary/10" : ""} ${alreadyLinked ? "opacity-50" : ""}`}
                      onClick={() => !alreadyLinked && toggleLinha(l.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedLinhas.has(l.id)}
                          disabled={alreadyLinked}
                          onCheckedChange={() => !alreadyLinked && toggleLinha(l.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.codigo_conta_balancete}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{l.descricao_conta_balancete}</TableCell>
                      <TableCell className="font-mono text-xs">{l.codigo_mcse || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(l.saldo_atual)}</TableCell>
                      <TableCell>
                        {alreadyLinked && (
                          <Badge variant="outline" className="text-[10px]">Vinc.</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {filtered.length > 200 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              Mostrando 200 de {filtered.length} — refine a busca
            </p>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedLinhas.size} linha(s) selecionada(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => vincularMutation.mutate()}
              disabled={vincularMutation.isPending || selectedLinhas.size === 0}
            >
              <Link2 size={14} className="mr-1" />
              {vincularMutation.isPending ? "Vinculando..." : "Confirmar Vínculo"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
