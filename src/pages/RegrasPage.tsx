import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchContas, fetchRegras } from "@/lib/supabase-queries";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Search } from "lucide-react";

export default function RegrasPage() {
  const qc = useQueryClient();
  const { data: contas = [] } = useQuery({ queryKey: ["mcse_contas_all"], queryFn: async () => { const { data } = await fetchContas(); return data || []; } });
  const [selectedConta, setSelectedConta] = useState("");
  const [searchConta, setSearchConta] = useState("");

  const { data: regra } = useQuery({
    queryKey: ["regras", selectedConta],
    queryFn: async () => {
      if (!selectedConta) return null;
      const { data } = await fetchRegras(selectedConta);
      return data?.[0] || null;
    },
    enabled: !!selectedConta,
  });

  const [form, setForm] = useState({
    materialidade_padrao: "",
    limite_variacao_percentual: "",
    limite_variacao_absoluta: "",
    requer_documento_obrigatorio: false,
    requer_revisao_humana: false,
    requer_conciliacao_reg_soc: false,
    observacao_regra: "",
  });

  const loadForm = (r: any) => {
    if (r) {
      setForm({
        materialidade_padrao: r.materialidade_padrao?.toString() || "",
        limite_variacao_percentual: r.limite_variacao_percentual?.toString() || "",
        limite_variacao_absoluta: r.limite_variacao_absoluta?.toString() || "",
        requer_documento_obrigatorio: r.requer_documento_obrigatorio,
        requer_revisao_humana: r.requer_revisao_humana,
        requer_conciliacao_reg_soc: r.requer_conciliacao_reg_soc,
        observacao_regra: r.observacao_regra || "",
      });
    } else {
      setForm({ materialidade_padrao: "", limite_variacao_percentual: "", limite_variacao_absoluta: "", requer_documento_obrigatorio: false, requer_revisao_humana: false, requer_conciliacao_reg_soc: false, observacao_regra: "" });
    }
  };

  const handleSelectConta = (id: string) => {
    setSelectedConta(id);
    // Reset form, will be loaded via useEffect-like pattern
  };

  // Sync form when regra changes
  const contaInfo = contas.find((c: any) => c.id === selectedConta);

  const saveRegra = useMutation({
    mutationFn: async () => {
      const payload = {
        conta_id: selectedConta,
        materialidade_padrao: form.materialidade_padrao ? parseFloat(form.materialidade_padrao) : null,
        limite_variacao_percentual: form.limite_variacao_percentual ? parseFloat(form.limite_variacao_percentual) : null,
        limite_variacao_absoluta: form.limite_variacao_absoluta ? parseFloat(form.limite_variacao_absoluta) : null,
        requer_documento_obrigatorio: form.requer_documento_obrigatorio,
        requer_revisao_humana: form.requer_revisao_humana,
        requer_conciliacao_reg_soc: form.requer_conciliacao_reg_soc,
        observacao_regra: form.observacao_regra || null,
      };
      if (regra) {
        await supabase.from("mcse_regras_conta").update(payload).eq("id", regra.id);
      } else {
        await supabase.from("mcse_regras_conta").insert(payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["regras"] }); toast.success("Regras salvas!"); },
  });

  const filteredContas = searchConta
    ? contas.filter((c: any) => c.codigo_mcse.includes(searchConta) || c.descricao_conta.toLowerCase().includes(searchConta.toLowerCase()))
    : contas;

  // Load form when regra data arrives
  if (regra !== undefined && selectedConta) {
    const currentMat = form.materialidade_padrao;
    const regraMat = regra?.materialidade_padrao?.toString() || "";
    if (currentMat !== regraMat && !saveRegra.isPending) {
      loadForm(regra);
    }
  }

  return (
    <div>
      <PageHeader title="Regras MCSE" description="Definir regras de auditoria por conta" />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <div className="mb-3 relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input placeholder="Buscar conta..." value={searchConta} onChange={e => setSearchConta(e.target.value)} className="pl-8" />
          </div>
          <div className="rounded border bg-card max-h-[calc(100vh-220px)] overflow-auto">
            {filteredContas.map((c: any) => (
              <div
                key={c.id}
                className={`px-3 py-2 cursor-pointer border-b text-sm hover:bg-muted/50 ${selectedConta === c.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                onClick={() => handleSelectConta(c.id)}
              >
                <div className="font-mono text-xs text-muted-foreground">{c.codigo_mcse}</div>
                <div className="truncate">{c.descricao_conta}</div>
              </div>
            ))}
            {filteredContas.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma conta encontrada</p>}
          </div>
        </div>

        <div className="col-span-2">
          {selectedConta && contaInfo ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <span className="font-mono text-sm text-muted-foreground mr-2">{contaInfo.codigo_mcse}</span>
                  {contaInfo.descricao_conta}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Materialidade Padrão</Label><Input type="number" step="0.01" value={form.materialidade_padrao} onChange={e => setForm(f => ({ ...f, materialidade_padrao: e.target.value }))} /></div>
                  <div><Label>Variação Percentual (%)</Label><Input type="number" step="0.01" value={form.limite_variacao_percentual} onChange={e => setForm(f => ({ ...f, limite_variacao_percentual: e.target.value }))} /></div>
                  <div><Label>Variação Absoluta</Label><Input type="number" step="0.01" value={form.limite_variacao_absoluta} onChange={e => setForm(f => ({ ...f, limite_variacao_absoluta: e.target.value }))} /></div>
                </div>

                <div className="flex gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.requer_documento_obrigatorio} onCheckedChange={v => setForm(f => ({ ...f, requer_documento_obrigatorio: !!v }))} />
                    Documento obrigatório
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.requer_revisao_humana} onCheckedChange={v => setForm(f => ({ ...f, requer_revisao_humana: !!v }))} />
                    Revisão humana
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.requer_conciliacao_reg_soc} onCheckedChange={v => setForm(f => ({ ...f, requer_conciliacao_reg_soc: !!v }))} />
                    Conciliação reg. societário
                  </label>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.observacao_regra} onChange={e => setForm(f => ({ ...f, observacao_regra: e.target.value }))} rows={3} />
                </div>

                <Button onClick={() => saveRegra.mutate()} disabled={saveRegra.isPending}>
                  <Save size={14} className="mr-1" /> Salvar Regras
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">Selecione uma conta para ver/editar as regras</div>
          )}
        </div>
      </div>
    </div>
  );
}
