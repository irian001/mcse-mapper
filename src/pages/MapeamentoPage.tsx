import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchClientes, fetchContas, fetchContasOrigem, fetchMapeamentos } from "@/lib/supabase-queries";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, Search } from "lucide-react";

export default function MapeamentoPage() {
  const qc = useQueryClient();
  const { data: clientes = [] } = useQuery({ queryKey: ["clientes"], queryFn: async () => { const { data } = await fetchClientes(); return data || []; } });
  const { data: mcseContas = [] } = useQuery({ queryKey: ["mcse_contas_all"], queryFn: async () => { const { data } = await fetchContas(); return data || []; } });

  const [selectedCliente, setSelectedCliente] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "nao_mapeados" | "nao_homologados">("todos");

  const { data: contasOrigem = [] } = useQuery({
    queryKey: ["contas_origem", selectedCliente],
    queryFn: async () => { if (!selectedCliente) return []; const { data } = await fetchContasOrigem(selectedCliente); return data || []; },
    enabled: !!selectedCliente,
  });

  const { data: mapeamentos = [] } = useQuery({
    queryKey: ["mapeamentos", selectedCliente],
    queryFn: async () => { if (!selectedCliente) return []; const { data } = await fetchMapeamentos(selectedCliente); return data || []; },
    enabled: !!selectedCliente,
  });

  // Build a map: conta_origem_id -> mapeamento
  const mapByOrigem = useMemo(() => {
    const m: Record<string, any> = {};
    mapeamentos.forEach((mp: any) => { m[mp.conta_origem_id] = mp; });
    return m;
  }, [mapeamentos]);

  // Filter & search
  const filteredContas = useMemo(() => {
    let list = contasOrigem;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((c: any) => c.codigo_origem.toLowerCase().includes(s) || c.descricao_origem.toLowerCase().includes(s));
    }
    if (filter === "nao_mapeados") {
      list = list.filter((c: any) => !mapByOrigem[c.id]?.conta_mcse_id);
    }
    if (filter === "nao_homologados") {
      list = list.filter((c: any) => mapByOrigem[c.id]?.conta_mcse_id && !mapByOrigem[c.id]?.homologado);
    }
    return list;
  }, [contasOrigem, search, filter, mapByOrigem]);

  const saveMapeamento = useMutation({
    mutationFn: async ({ contaOrigemId, contaMcseId }: { contaOrigemId: string; contaMcseId: string }) => {
      const existing = mapByOrigem[contaOrigemId];
      if (existing) {
        await supabase.from("cliente_mapeamento_mcse").update({ conta_mcse_id: contaMcseId, tipo_mapeamento: "manual" as const }).eq("id", existing.id);
      } else {
        await supabase.from("cliente_mapeamento_mcse").insert({
          cliente_id: selectedCliente,
          conta_origem_id: contaOrigemId,
          conta_mcse_id: contaMcseId,
          tipo_mapeamento: "manual" as const,
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mapeamentos"] }); },
  });

  const homologar = useMutation({
    mutationFn: async (mapeamentoId: string) => {
      await supabase.from("cliente_mapeamento_mcse").update({
        homologado: true,
        data_homologacao: new Date().toISOString(),
        homologado_por: "auditor",
      }).eq("id", mapeamentoId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mapeamentos"] }); toast.success("Homologado!"); },
  });

  const stats = useMemo(() => {
    const total = contasOrigem.length;
    const mapeadas = contasOrigem.filter((c: any) => mapByOrigem[c.id]?.conta_mcse_id).length;
    const homologadas = contasOrigem.filter((c: any) => mapByOrigem[c.id]?.homologado).length;
    return { total, mapeadas, homologadas };
  }, [contasOrigem, mapByOrigem]);

  return (
    <div>
      <PageHeader title="Mapeamento de Contas" description="Mapear contas do cliente para a base MCSE" />

      <div className="flex items-center gap-4 mb-4">
        <div className="w-80">
          <Select value={selectedCliente} onValueChange={setSelectedCliente}>
            <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
            <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {selectedCliente && (
          <>
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Buscar conta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="nao_mapeados">Não mapeados</SelectItem>
                <SelectItem value="nao_homologados">Não homologados</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {selectedCliente && contasOrigem.length > 0 && (
        <>
          <div className="flex gap-4 mb-4">
            <div className="bg-card border rounded px-4 py-2 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-card border rounded px-4 py-2 text-center">
              <div className="text-2xl font-bold text-info">{stats.mapeadas}</div>
              <div className="text-xs text-muted-foreground">Mapeadas</div>
            </div>
            <div className="bg-card border rounded px-4 py-2 text-center">
              <div className="text-2xl font-bold text-success">{stats.homologadas}</div>
              <div className="text-xs text-muted-foreground">Homologadas</div>
            </div>
            <div className="bg-card border rounded px-4 py-2 text-center">
              <div className="text-2xl font-bold text-warning">{stats.total - stats.mapeadas}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
          </div>

          <div className="rounded border bg-card overflow-auto max-h-[calc(100vh-300px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-32">Código Origem</TableHead>
                  <TableHead className="w-64">Descrição Origem</TableHead>
                  <TableHead className="w-72">Conta MCSE</TableHead>
                  <TableHead className="w-36">Grupo</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContas.map((conta: any) => {
                  const mp = mapByOrigem[conta.id];
                  const isMapped = !!mp?.conta_mcse_id;
                  const isHomologado = !!mp?.homologado;

                  return (
                    <TableRow key={conta.id} className={!isMapped ? "bg-warning/5" : isHomologado ? "" : "bg-info/5"}>
                      <TableCell className="font-mono text-sm">{conta.codigo_origem}</TableCell>
                      <TableCell className="text-sm">{conta.descricao_origem}</TableCell>
                      <TableCell>
                        <Select
                          value={mp?.conta_mcse_id || ""}
                          onValueChange={v => saveMapeamento.mutate({ contaOrigemId: conta.id, contaMcseId: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecionar conta MCSE..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mcseContas.map((mc: any) => (
                              <SelectItem key={mc.id} value={mc.id}>
                                <span className="font-mono">{mc.codigo_mcse}</span> — {mc.descricao_conta}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {mp?.mcse_contas?.mcse_grupos?.descricao_grupo || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={isHomologado ? "homologado" : isMapped ? "mapeado" : "nao_mapeado"} />
                      </TableCell>
                      <TableCell>
                        {isMapped && !isHomologado && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => homologar.mutate(mp.id)}>
                            <CheckCircle2 size={14} className="mr-1" /> Homologar
                          </Button>
                        )}
                        {isHomologado && <span className="text-success text-xs">✓</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredContas.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {contasOrigem.length === 0 ? "Importe o plano de contas primeiro" : "Nenhuma conta encontrada com os filtros atuais"}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {selectedCliente && contasOrigem.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p>Nenhuma conta importada para este cliente</p>
          <p className="text-sm mt-1">Vá para "Importar Contas" para carregar o plano de contas</p>
        </div>
      )}
    </div>
  );
}
