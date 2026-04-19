import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  procedimento: any;
}

const fmtBRL = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "—";

export default function TermoContagemCaixa({ open, onClose, procedimento }: Props) {
  const procedimentoId = procedimento?.id;

  const { data: itens = [] } = useQuery({
    queryKey: ["termo-cc-itens", procedimentoId],
    enabled: !!procedimentoId && open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedimento_contagem_caixa_itens")
        .select("*")
        .eq("procedimento_auxiliar_id", procedimentoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: detalhes = [] } = useQuery({
    queryKey: ["termo-cc-detalhes", procedimentoId, itens.map((i: any) => i.id).join(",")],
    enabled: !!procedimentoId && open && itens.length > 0,
    queryFn: async () => {
      const ids = itens.map((i: any) => i.id);
      const { data, error } = await (supabase as any)
        .from("procedimento_contagem_caixa_detalhes")
        .select("*")
        .in("contagem_caixa_item_id", ids)
        .order("tipo_denomincacao", { ascending: true })
        .order("valor_unitario", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: exercicio } = useQuery({
    queryKey: ["termo-cc-exercicio", procedimento?.exercicio_id],
    enabled: !!procedimento?.exercicio_id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercicios")
        .select("ano_exercicio, data_inicio, data_fim")
        .eq("id", procedimento.exercicio_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const detalhesPorItem: Record<string, any[]> = {};
  for (const d of detalhes as any[]) {
    (detalhesPorItem[d.contagem_caixa_item_id] ||= []).push(d);
  }

  const totalContado = itens.reduce((s: number, i: any) => s + (Number(i.valor_contado) || 0), 0);
  const totalInformado = itens.reduce((s: number, i: any) => s + (Number(i.valor_informado) || 0), 0);
  const diferencaTotal = totalContado - totalInformado;

  const handlePrint = () => {
    window.print();
  };

  if (!procedimento) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto print:max-w-full print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Termo de Contagem de Caixa</DialogTitle>
        </DialogHeader>

        <div id="termo-print-area" className="bg-white text-black p-8 print:p-0 font-serif text-sm leading-relaxed">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #termo-print-area, #termo-print-area * { visibility: visible; }
              #termo-print-area { position: absolute; left: 0; top: 0; width: 100%; }
              .no-print { display: none !important; }
              @page { size: A4; margin: 18mm 15mm; }
            }
          `}</style>

          {/* Cabeçalho */}
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <div className="text-xl font-bold uppercase tracking-wide">Termo de Contagem de Caixa</div>
            <div className="text-xs mt-1">Documento de evidência de auditoria</div>
          </div>

          <table className="w-full text-xs mb-4 border-collapse">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-semibold w-1/4 bg-gray-100">Cliente</td>
                <td className="border border-black p-2" colSpan={3}>
                  {procedimento.clientes?.razao_social || "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100">Exercício</td>
                <td className="border border-black p-2">{exercicio?.ano_exercicio || "—"}</td>
                <td className="border border-black p-2 font-semibold bg-gray-100 w-1/4">Trabalho</td>
                <td className="border border-black p-2">{procedimento.trabalhos_auditoria?.nome_trabalho || "—"}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100">Procedimento</td>
                <td className="border border-black p-2" colSpan={3}>{procedimento.titulo}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100">Tipo</td>
                <td className="border border-black p-2">Contagem de Caixa</td>
                <td className="border border-black p-2 font-semibold bg-gray-100">Conta MCSE</td>
                <td className="border border-black p-2">
                  {procedimento.codigo_mcse ? `${procedimento.codigo_mcse} — ${procedimento.descricao_mcse || ""}` : "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-100">Data do Procedimento</td>
                <td className="border border-black p-2">{fmtDate(procedimento.data_procedimento)}</td>
                <td className="border border-black p-2 font-semibold bg-gray-100">Data Base de Referência</td>
                <td className="border border-black p-2">{fmtDate(procedimento.data_base_referencia)}</td>
              </tr>
            </tbody>
          </table>

          {procedimento.objetivo_procedimento && (
            <div className="mb-4">
              <div className="font-bold text-xs uppercase mb-1">Objetivo do Procedimento</div>
              <div className="text-xs border border-black p-2 whitespace-pre-wrap">{procedimento.objetivo_procedimento}</div>
            </div>
          )}

          {/* Itens de Contagem */}
          {itens.map((item: any, idx: number) => {
            const dets = detalhesPorItem[item.id] || [];
            return (
              <div key={item.id} className="mb-5">
                <div className="font-bold text-xs uppercase border-b border-black mb-1">
                  Caixa #{idx + 1} — {item.caixa_identificacao}
                </div>
                <table className="w-full text-xs mb-2 border-collapse">
                  <tbody>
                    <tr>
                      <td className="border border-black p-1.5 font-semibold w-1/4 bg-gray-100">Local</td>
                      <td className="border border-black p-1.5">{item.descricao_local || "—"}</td>
                      <td className="border border-black p-1.5 font-semibold bg-gray-100 w-1/4">Responsável</td>
                      <td className="border border-black p-1.5">{item.responsavel_caixa || "—"}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 font-semibold bg-gray-100">Valor Informado</td>
                      <td className="border border-black p-1.5 font-mono">{fmtBRL(item.valor_informado)}</td>
                      <td className="border border-black p-1.5 font-semibold bg-gray-100">Valor Contado</td>
                      <td className="border border-black p-1.5 font-mono">{fmtBRL(item.valor_contado)}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 font-semibold bg-gray-100">Diferença</td>
                      <td className="border border-black p-1.5 font-mono font-bold" colSpan={3}>
                        {fmtBRL(Number(item.diferenca) || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {dets.length > 0 && (
                  <>
                    <div className="text-xs font-semibold mb-1 mt-2">Mapa de Contagem</div>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-black p-1.5 text-left">Tipo</th>
                          <th className="border border-black p-1.5 text-right">Valor Unitário</th>
                          <th className="border border-black p-1.5 text-right">Quantidade</th>
                          <th className="border border-black p-1.5 text-right">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dets.map((d: any) => (
                          <tr key={d.id}>
                            <td className="border border-black p-1.5">{d.tipo_denomincacao === "nota" ? "Nota (cédula)" : "Moeda"}</td>
                            <td className="border border-black p-1.5 text-right font-mono">{fmtBRL(d.valor_unitario)}</td>
                            <td className="border border-black p-1.5 text-right font-mono">{d.quantidade}</td>
                            <td className="border border-black p-1.5 text-right font-mono">{fmtBRL(d.valor_total_linha)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100">
                          <td colSpan={3} className="border border-black p-1.5 text-right font-bold">Total Contado</td>
                          <td className="border border-black p-1.5 text-right font-mono font-bold">{fmtBRL(item.valor_contado)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}

                {item.observacao && (
                  <div className="text-xs mt-2">
                    <span className="font-semibold">Observação:</span> {item.observacao}
                  </div>
                )}
              </div>
            );
          })}

          {/* Consolidação geral */}
          {itens.length > 1 && (
            <div className="mb-5">
              <div className="font-bold text-xs uppercase border-b border-black mb-1">Consolidação Geral</div>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr>
                    <td className="border border-black p-1.5 font-semibold bg-gray-100">Total Informado</td>
                    <td className="border border-black p-1.5 text-right font-mono">{fmtBRL(totalInformado)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 font-semibold bg-gray-100">Total Contado</td>
                    <td className="border border-black p-1.5 text-right font-mono">{fmtBRL(totalContado)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5 font-semibold bg-gray-100">Diferença Total</td>
                    <td className="border border-black p-1.5 text-right font-mono font-bold">{fmtBRL(diferencaTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Declaração */}
          <div className="text-xs text-justify mt-6 mb-8">
            Declaramos que a contagem física dos valores em caixa foi realizada na presença do responsável pelo caixa
            e do auditor abaixo identificados, conforme valores descritos neste termo. As partes confirmam a
            integridade das informações e atestam o resultado apurado.
          </div>

          {/* Assinaturas */}
          <div className="grid grid-cols-2 gap-12 mt-12 text-xs">
            <div className="text-center">
              <div className="border-t border-black pt-1">Responsável pelo Caixa</div>
              <div className="mt-1">Nome: {itens[0]?.responsavel_caixa || "_______________________"}</div>
              <div className="mt-1">Data: ____/____/______</div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1">Auditor</div>
              <div className="mt-1">Nome: {procedimento.exec?.nome || "_______________________"}</div>
              <div className="mt-1">Data: ____/____/______</div>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print print:hidden">
          <Button variant="outline" onClick={onClose}>
            <X size={14} className="mr-1" /> Fechar
          </Button>
          <Button onClick={handlePrint}>
            <Printer size={14} className="mr-1" /> Imprimir / Salvar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
