import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import ImportBalanceteFlow from "@/components/balancete/ImportBalanceteFlow";
import BalanceteLinhasTable from "@/components/balancete/BalanceteLinhasTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, FileSpreadsheet, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function BalancetesPage() {
  const [mode, setMode] = useState<"list" | "import">("list");
  const [selectedBalancete, setSelectedBalancete] = useState<string | null>(null);
  const [filterTrabalho, setFilterTrabalho] = useState("all");

  const { data: balancetes = [], refetch } = useQuery({
    queryKey: ["balancetes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("balancetes")
        .select("*, trabalhos_auditoria(nome_trabalho), clientes(razao_social), exercicios(ano_exercicio)")
        .order("data_importacao", { ascending: false });
      return data || [];
    },
  });

  const { data: trabalhos = [] } = useQuery({
    queryKey: ["trabalhos_for_filter"],
    queryFn: async () => {
      const { data } = await supabase.from("trabalhos_auditoria").select("id, nome_trabalho").order("nome_trabalho");
      return data || [];
    },
  });

  const queryClient = useQueryClient();

  const deleteBalanceteMutation = useMutation({
    mutationFn: async (balanceteId: string) => {
      const { error: linhasError } = await supabase
        .from("balancete_linhas")
        .delete()
        .eq("balancete_id", balanceteId);
      if (linhasError) throw linhasError;
      const { error } = await supabase
        .from("balancetes")
        .delete()
        .eq("id", balanceteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Balancete apagado com sucesso");
      setSelectedBalancete(null);
      queryClient.invalidateQueries({ queryKey: ["balancetes"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao apagar balancete: " + err.message);
    },
  });

  const filtered = filterTrabalho === "all" ? balancetes : balancetes.filter((b: any) => b.trabalho_auditoria_id === filterTrabalho);

  if (mode === "import") {
    return (
      <div>
        <PageHeader title="Importar Balancete" description="Importar balancete vinculado a um trabalho de auditoria" />
        <Button variant="outline" className="mb-4" onClick={() => setMode("list")}>← Voltar</Button>
        <ImportBalanceteFlow onComplete={() => { setMode("list"); refetch(); }} />
      </div>
    );
  }

  if (selectedBalancete) {
    const bal = balancetes.find((b: any) => b.id === selectedBalancete) as any;
    return (
      <div>
        <PageHeader
          title={`Balancete: ${bal?.nome_arquivo || ""}`}
          description={`${(bal?.trabalhos_auditoria as any)?.nome_trabalho} — ${(bal?.clientes as any)?.razao_social} (${(bal?.exercicios as any)?.ano_exercicio})`}
        />
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" onClick={() => setSelectedBalancete(null)}>← Voltar</Button>
          <div className="flex gap-2 text-sm">
            <Badge variant="outline">{bal?.total_linhas} linhas</Badge>
            <Badge variant="outline" className="text-green-700 bg-green-50">{bal?.total_linhas_com_mapeamento} com MCSE</Badge>
            <Badge variant="outline" className="text-orange-700 bg-orange-50">{bal?.total_linhas_sem_mapeamento} sem MCSE</Badge>
          </div>
        </div>
        <BalanceteLinhasTable balanceteId={selectedBalancete} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Balancetes" description="Balancetes importados vinculados aos trabalhos de auditoria" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Label className="text-xs">Trabalho:</Label>
          <Select value={filterTrabalho} onValueChange={setFilterTrabalho}>
            <SelectTrigger className="h-9 w-64 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os trabalhos</SelectItem>
              {trabalhos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_trabalho}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setMode("import")}><Plus size={14} className="mr-1" /> Importar Balancete</Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet size={36} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum balancete importado</p>
            <Button className="mt-4" onClick={() => setMode("import")}>Importar Primeiro Balancete</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded border bg-card overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Arquivo</th>
                <th className="text-left px-4 py-3 font-medium">Trabalho</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Exercício</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-center px-4 py-3 font-medium">Linhas</th>
                <th className="text-center px-4 py-3 font-medium">Com MCSE</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b.id} className="border-b hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedBalancete(b.id)}>
                  <td className="px-4 py-2.5 font-medium">{b.nome_arquivo}</td>
                  <td className="px-4 py-2.5">{b.trabalhos_auditoria?.nome_trabalho}</td>
                  <td className="px-4 py-2.5">{b.clientes?.razao_social}</td>
                  <td className="px-4 py-2.5">{b.exercicios?.ano_exercicio}</td>
                  <td className="px-4 py-2.5 capitalize">{b.tipo_balancete}</td>
                  <td className="px-4 py-2.5 text-center">{b.total_linhas}</td>
                  <td className="px-4 py-2.5 text-center">{b.total_linhas_com_mapeamento}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className={b.status_importacao === "finalizado" ? "text-green-700 bg-green-50" : "text-yellow-700 bg-yellow-50"}>
                      {b.status_importacao}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(b.data_importacao).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
