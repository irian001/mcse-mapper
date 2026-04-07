import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";

export default function GerarPtaDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("auto");

  // Auto form
  const [autoTrabalhoId, setAutoTrabalhoId] = useState("");
  const [autoContaMcseId, setAutoContaMcseId] = useState("");

  // Manual form
  const [manTrabalhoId, setManTrabalhoId] = useState("");
  const [manTitulo, setManTitulo] = useState("");

  const { data: trabalhos = [] } = useQuery({
    queryKey: ["trabalhos_for_gerar_pta"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trabalhos_auditoria")
        .select("id, nome_trabalho, cliente_id, exercicio_id, clientes(razao_social)")
        .order("nome_trabalho");
      return data || [];
    },
  });

  // Fetch MCSE accounts that have lines in the selected trabalho
  const { data: contasMcse = [] } = useQuery({
    queryKey: ["contas_mcse_no_trabalho", autoTrabalhoId],
    queryFn: async () => {
      if (!autoTrabalhoId) return [];
      const { data } = await supabase
        .from("balancete_linhas")
        .select("conta_mcse_id, codigo_mcse, descricao_mcse")
        .eq("trabalho_auditoria_id", autoTrabalhoId)
        .not("conta_mcse_id", "is", null);
      if (!data) return [];
      // Deduplicate by conta_mcse_id
      const map = new Map<string, any>();
      data.forEach(d => { if (d.conta_mcse_id && !map.has(d.conta_mcse_id)) map.set(d.conta_mcse_id, d); });
      return Array.from(map.values()).sort((a, b) => (a.codigo_mcse || "").localeCompare(b.codigo_mcse || ""));
    },
    enabled: !!autoTrabalhoId,
  });

  const gerarAutoMutation = useMutation({
    mutationFn: async () => {
      if (!autoTrabalhoId || !autoContaMcseId) throw new Error("Selecione trabalho e conta MCSE");
      const trabalho = trabalhos.find((t: any) => t.id === autoTrabalhoId) as any;
      const conta = contasMcse.find((c: any) => c.conta_mcse_id === autoContaMcseId);

      // Fetch MCSE details
      const { data: mcse } = await supabase.from("mcse_contas")
        .select("*, mcse_grupos(descricao_grupo), mcse_subgrupos(descricao_subgrupo)")
        .eq("id", autoContaMcseId)
        .maybeSingle();

      // Fetch lines
      const { data: linhas } = await supabase
        .from("balancete_linhas")
        .select("id, saldo_anterior, saldo_atual, valor_validado, diferenca_validacao, status_linha, possui_pendencia")
        .eq("trabalho_auditoria_id", autoTrabalhoId)
        .eq("conta_mcse_id", autoContaMcseId);

      if (!linhas || linhas.length === 0) throw new Error("Nenhuma linha encontrada para essa conta MCSE neste trabalho");

      const saldoAnt = linhas.reduce((s, l) => s + (l.saldo_anterior || 0), 0);
      const saldoAtual = linhas.reduce((s, l) => s + (l.saldo_atual || 0), 0);
      const hasVal = linhas.some(l => l.valor_validado != null);
      const valValidado = hasVal ? linhas.reduce((s, l) => s + (l.valor_validado || 0), 0) : null;
      const diferenca = valValidado != null ? saldoAtual - valValidado : null;
      const varAbs = saldoAtual - saldoAnt;
      const varPct = saldoAnt !== 0 ? ((saldoAtual - saldoAnt) / saldoAnt) * 100 : null;
      const pendencias = linhas.filter(l => l.possui_pendencia).length;

      const { data: pta, error: ptaError } = await supabase.from("papeis_trabalho").insert({
        trabalho_auditoria_id: autoTrabalhoId,
        cliente_id: trabalho.cliente_id,
        exercicio_id: trabalho.exercicio_id,
        conta_mcse_id: autoContaMcseId,
        codigo_mcse: conta?.codigo_mcse,
        descricao_mcse: conta?.descricao_mcse,
        grupo_mcse: mcse?.mcse_grupos?.descricao_grupo || null,
        subgrupo_mcse: mcse?.mcse_subgrupos?.descricao_subgrupo || null,
        titulo_pta: `PTA — ${conta?.codigo_mcse} — ${conta?.descricao_mcse || ""}`,
        saldo_anterior_total: saldoAnt,
        saldo_atual_total: saldoAtual,
        valor_validado_total: valValidado,
        diferenca_total: diferenca,
        variacao_absoluta_total: varAbs,
        variacao_percentual_total: varPct,
        total_linhas_vinculadas: linhas.length,
        total_linhas_com_pendencia: pendencias,
      }).select("id").single();

      if (ptaError) throw ptaError;

      // Insert linked lines
      const ptaLinhas = linhas.map(l => ({
        papel_trabalho_id: pta.id,
        balancete_linha_id: l.id,
        trabalho_auditoria_id: autoTrabalhoId,
        saldo_atual_linha: l.saldo_atual,
        valor_validado_linha: l.valor_validado,
        diferenca_linha: l.diferenca_validacao,
        status_linha_snapshot: l.status_linha,
      }));

      const { error: linhasError } = await supabase.from("papel_trabalho_linhas").insert(ptaLinhas);
      if (linhasError) throw linhasError;

      return linhas.length;
    },
    onSuccess: (count) => {
      toast.success(`PTA gerado com ${count} linhas vinculadas`);
      queryClient.invalidateQueries({ queryKey: ["papeis_trabalho"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const gerarManualMutation = useMutation({
    mutationFn: async () => {
      if (!manTrabalhoId || !manTitulo.trim()) throw new Error("Selecione trabalho e informe título");
      const trabalho = trabalhos.find((t: any) => t.id === manTrabalhoId) as any;

      const { error } = await supabase.from("papeis_trabalho").insert({
        trabalho_auditoria_id: manTrabalhoId,
        cliente_id: trabalho.cliente_id,
        exercicio_id: trabalho.exercicio_id,
        titulo_pta: manTitulo.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PTA criado (sem linhas vinculadas)");
      queryClient.invalidateQueries({ queryKey: ["papeis_trabalho"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ClipboardList size={18} /> Gerar Papel de Trabalho
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="auto" className="flex-1">Automático (por conta MCSE)</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="auto" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Trabalho de Auditoria</Label>
              <Select value={autoTrabalhoId} onValueChange={setAutoTrabalhoId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {trabalhos.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome_trabalho} — {t.clientes?.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {autoTrabalhoId && (
              <div className="space-y-1.5">
                <Label className="text-xs">Conta MCSE ({contasMcse.length} disponíveis)</Label>
                <Select value={autoContaMcseId} onValueChange={setAutoContaMcseId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a conta..." /></SelectTrigger>
                  <SelectContent>
                    {contasMcse.map((c: any) => (
                      <SelectItem key={c.conta_mcse_id} value={c.conta_mcse_id}>
                        {c.codigo_mcse} — {c.descricao_mcse || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={() => gerarAutoMutation.mutate()} disabled={!autoTrabalhoId || !autoContaMcseId || gerarAutoMutation.isPending} className="w-full">
              {gerarAutoMutation.isPending ? "Gerando..." : "Gerar PTA Automático"}
            </Button>
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Trabalho de Auditoria</Label>
              <Select value={manTrabalhoId} onValueChange={setManTrabalhoId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {trabalhos.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome_trabalho} — {t.clientes?.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Título do PTA</Label>
              <Input value={manTitulo} onChange={e => setManTitulo(e.target.value)} className="h-9" placeholder="Ex: PTA — Caixa e Equivalentes" />
            </div>
            <Button onClick={() => gerarManualMutation.mutate()} disabled={!manTrabalhoId || !manTitulo.trim() || gerarManualMutation.isPending} className="w-full">
              {gerarManualMutation.isPending ? "Criando..." : "Criar PTA Manual"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
