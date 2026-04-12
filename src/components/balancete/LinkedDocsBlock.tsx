import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";

function fmt(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TIPO_LABELS: Record<string, string> = {
  principal: "Principal",
  complementar: "Complementar",
  parcial: "Parcial",
  analitico: "Analítico",
};

interface Props {
  linhaId: string;
  saldoAtual: number | null;
}

export default function LinkedDocsBlock({ linhaId, saldoAtual }: Props) {
  const { data: vinculos = [], isLoading } = useQuery({
    queryKey: ["linked_docs_detail", linhaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("balancete_linha_documentos")
        .select("*, solicitacao_item_documentos(nome_arquivo, url_arquivo, versao, status_documento)")
        .eq("balancete_linha_id", linhaId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!linhaId,
  });

  const totalConsiderado = vinculos
    .filter((v: any) => v.aceito_para_validacao)
    .reduce((sum: number, v: any) => sum + (v.valor_considerado_validacao || 0), 0);

  const diferenca = saldoAtual != null ? (saldoAtual - totalConsiderado) : null;

  const openSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("solicitacao-documentos")
      .createSignedUrl(path, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Erro ao gerar link do documento.");
    }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Carregando documentos vinculados...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1.5">
          <Link2 size={14} /> Documentos Vinculados da Solicitação
        </h4>
        {vinculos.length > 0 && (
          <Badge variant="outline" className="text-xs">{vinculos.length} doc(s)</Badge>
        )}
      </div>

      {vinculos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-xs bg-muted/30 rounded-md p-3">
          <div className="text-center">
            <span className="text-muted-foreground block">Total Considerado</span>
            <span className="font-mono font-semibold">{fmt(totalConsiderado)}</span>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground block">Saldo Atual</span>
            <span className="font-mono font-medium">{fmt(saldoAtual)}</span>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground block">Diferença</span>
            <span className={`font-mono font-semibold ${diferenca != null && diferenca !== 0 ? "text-amber-600" : "text-success"}`}>
              {fmt(diferenca)}
            </span>
          </div>
        </div>
      )}

      {vinculos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhum documento da solicitação vinculado a esta linha
        </p>
      ) : (
        <div className="space-y-1.5">
          {vinculos.map((v: any) => {
            const doc = v.solicitacao_item_documentos;
            return (
              <div
                key={v.id}
                className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-xs"
              >
                <FileText size={14} className="text-red-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc?.nome_arquivo || "—"}</p>
                  <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                    <span>v{doc?.versao}</span>
                    <Badge variant="outline" className="text-[10px]">{TIPO_LABELS[v.tipo_vinculo] || v.tipo_vinculo}</Badge>
                    {v.aceito_para_validacao && (
                      <Badge variant="outline" className="text-[10px] text-success border-success/30 bg-success/10">
                        Aceito p/ validação
                      </Badge>
                    )}
                    <span>Val.: {fmt(v.valor_considerado_validacao)}</span>
                  </div>
                  {v.observacao_vinculo && (
                    <p className="text-muted-foreground mt-0.5 italic">{v.observacao_vinculo}</p>
                  )}
                </div>
                {doc?.url_arquivo && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    title="Abrir documento"
                    onClick={() => openSignedUrl(doc.url_arquivo)}
                  >
                    <ExternalLink size={12} />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
