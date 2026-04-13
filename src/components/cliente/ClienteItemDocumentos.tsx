import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const DOC_STATUS: Record<string, { label: string; color: string }> = {
  enviado: { label: "Enviado", color: "text-blue-600 bg-blue-500/10 border-blue-500/30" },
  em_analise: { label: "Em análise", color: "text-warning bg-warning/10 border-warning/30" },
  aceito: { label: "Aceito", color: "text-success bg-success/10 border-success/30" },
  recusado: { label: "Necessita reenvio", color: "text-destructive bg-destructive/10 border-destructive/30" },
  complementar: { label: "Complementar", color: "text-orange-600 bg-orange-500/10 border-orange-500/30" },
};

interface Props {
  itemId: string;
  solicitacaoId: string;
  /** Status atual do item para exibir alertas de pendência */
  statusItem?: string;
}

export default function ClienteItemDocumentos({ itemId, solicitacaoId, statusItem }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [obsCliente, setObsCliente] = useState("");
  const [expanded, setExpanded] = useState(false);

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["cliente_item_docs", itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from("solicitacao_item_documentos")
        .select("*")
        .eq("solicitacao_item_id", itemId)
        .order("versao", { ascending: false });
      return data || [];
    },
  });

  // Último documento enviado (maior versão)
  const ultimoDoc = documentos.length > 0 ? documentos[0] : null;
  const precisaReenvio = ultimoDoc && (ultimoDoc.status_documento === "recusado" || ultimoDoc.status_documento === "complementar");

  const handleUpload = async (file: File) => {
    if (!file.type.includes("pdf")) {
      toast.error("Apenas arquivos PDF são aceitos.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 20MB.");
      return;
    }

    setUploading(true);
    try {
      const nextVersion =
        documentos.length > 0
          ? Math.max(...documentos.map((d: any) => d.versao || 1)) + 1
          : 1;

      const filePath = `${solicitacaoId}/${itemId}/${Date.now()}_v${nextVersion}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("solicitacao-documentos")
        .upload(filePath, file, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("solicitacao_item_documentos")
        .insert({
          solicitacao_item_id: itemId,
          nome_arquivo: file.name,
          tipo_arquivo: "application/pdf",
          url_arquivo: filePath,
          uploaded_by: user?.email || null,
          versao: nextVersion,
          status_documento: "enviado",
          observacao_cliente: obsCliente.trim() || null,
        });

      if (insertError) throw insertError;

      await supabase
        .from("solicitacao_itens")
        .update({ status_item: "recebido" })
        .eq("id", itemId);

      toast.success(`Documento v${nextVersion} enviado com sucesso!`);
      setObsCliente("");
      qc.invalidateQueries({ queryKey: ["cliente_item_docs", itemId] });
      qc.invalidateQueries({ queryKey: ["cliente_sol_itens", solicitacaoId] });
    } catch (err: any) {
      console.error("Erro ao enviar documento:", err);
      toast.error("Erro ao enviar documento.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

  const docCount = documentos.length;

  return (
    <div className="mt-2">
      {/* Alerta de pendência do auditor */}
      {precisaReenvio && (
        <div className={`flex items-start gap-2 p-3 rounded-md border mb-2 ${
          ultimoDoc.status_documento === "recusado"
            ? "bg-destructive/5 border-destructive/30"
            : "bg-orange-500/5 border-orange-500/30"
        }`}>
          <AlertTriangle size={16} className={
            ultimoDoc.status_documento === "recusado" ? "text-destructive shrink-0 mt-0.5" : "text-orange-600 shrink-0 mt-0.5"
          } />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">
              {ultimoDoc.status_documento === "recusado"
                ? "Documento recusado — necessário reenvio"
                : "Complementação solicitada pelo auditor"}
            </p>
            {ultimoDoc.observacao_auditor && (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                {ultimoDoc.observacao_auditor}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Compact toggle + upload row */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <Button
          variant={precisaReenvio ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {precisaReenvio ? <RefreshCw size={12} className="mr-1" /> : <Upload size={12} className="mr-1" />}
          {uploading ? "Enviando..." : precisaReenvio ? "Reenviar documento" : "Anexar PDF"}
        </Button>

        {docCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            <FileText size={12} className="mr-1" />
            {docCount} arquivo(s) enviado(s)
            {expanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
          </Button>
        )}
      </div>

      {/* Observation field */}
      <div className="mt-2">
        <Textarea
          value={obsCliente}
          onChange={(e) => setObsCliente(e.target.value)}
          rows={2}
          placeholder="Observação sobre o documento (opcional)..."
          className="text-xs"
        />
      </div>

      {/* Document history */}
      {expanded && (
        <div className="mt-2 space-y-1.5 border-t border-border pt-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : (
            documentos.map((doc: any) => {
              const ds = DOC_STATUS[doc.status_documento] || { label: doc.status_documento, color: "" };
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 p-2 rounded border bg-background text-xs"
                >
                  <FileText size={14} className="text-red-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.nome_arquivo}</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>v{doc.versao}</span>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {doc.observacao_cliente && (
                      <p className="text-muted-foreground mt-0.5">📝 {doc.observacao_cliente}</p>
                    )}
                    {doc.observacao_auditor && (
                      <p className="text-muted-foreground mt-0.5 italic">Auditor: {doc.observacao_auditor}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${ds.color}`}>
                    {ds.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    title="Visualizar documento"
                    onClick={() => openSignedUrl(doc.url_arquivo)}
                  >
                    <ExternalLink size={12} />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
