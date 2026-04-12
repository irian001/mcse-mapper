import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  Upload,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
} from "lucide-react";

const DOC_STATUS_LABELS: Record<string, string> = {
  enviado: "Enviado",
  em_analise: "Em Análise",
  aceito: "Aceito",
  recusado: "Recusado",
  complementar: "Complementar",
};

const DOC_STATUS_COLORS: Record<string, string> = {
  enviado: "text-blue-600 bg-blue-500/10 border-blue-500/30",
  em_analise: "text-warning bg-warning/10 border-warning/30",
  aceito: "text-success bg-success/10 border-success/30",
  recusado: "text-destructive bg-destructive/10 border-destructive/30",
  complementar: "text-orange-600 bg-orange-500/10 border-orange-500/30",
};

type StatusDocumento = "enviado" | "em_analise" | "aceito" | "recusado" | "complementar";
const DOC_TO_ITEM_STATUS: Record<string, string> = {
  enviado: "recebido",
  em_analise: "recebido",
  aceito: "aceito",
  recusado: "rejeitado",
  complementar: "pendente",
};

interface Props {
  itemId: string;
  itemDescricao: string;
  solicitacaoId: string;
}

export default function ItemDocumentosPanel({
  itemId,
  itemDescricao,
  solicitacaoId,
}: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showAnaliseDialog, setShowAnaliseDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [novoStatus, setNovoStatus] = useState<"enviado" | "em_analise" | "aceito" | "recusado" | "complementar">("enviado");
  const [obsAuditor, setObsAuditor] = useState("");

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["sol_item_docs", itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from("solicitacao_item_documentos")
        .select("*")
        .eq("solicitacao_item_id", itemId)
        .order("versao", { ascending: false });
      return data || [];
    },
  });

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
        });

      if (insertError) throw insertError;

      // Update item status to recebido
      await supabase
        .from("solicitacao_itens")
        .update({ status_item: "recebido" })
        .eq("id", itemId);

      toast.success(`Documento v${nextVersion} enviado com sucesso`);
      qc.invalidateQueries({ queryKey: ["sol_item_docs", itemId] });
      qc.invalidateQueries({
        queryKey: ["solicitacao_itens", solicitacaoId],
      });
    } catch (err: any) {
      console.error("Erro ao enviar documento:", err);
      toast.error("Erro ao enviar documento.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const analisarMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDoc || !novoStatus) throw new Error("Selecione um status");

      const { error } = await supabase
        .from("solicitacao_item_documentos")
        .update({
          status_documento: novoStatus,
          observacao_auditor: obsAuditor.trim() || null,
        })
        .eq("id", selectedDoc.id);
      if (error) throw error;

      // Update item status based on latest doc status
      const itemStatus = DOC_TO_ITEM_STATUS[novoStatus] || "recebido";
      await supabase
        .from("solicitacao_itens")
        .update({ status_item: itemStatus as any })
        .eq("id", itemId);
    },
    onSuccess: () => {
      toast.success("Análise registrada");
      qc.invalidateQueries({ queryKey: ["sol_item_docs", itemId] });
      qc.invalidateQueries({
        queryKey: ["solicitacao_itens", solicitacaoId],
      });
      setShowAnaliseDialog(false);
      setSelectedDoc(null);
      setNovoStatus("");
      setObsAuditor("");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao analisar"),
  });

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

  return (
    <div className="space-y-2 p-3 border-t border-border bg-muted/20">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-medium text-muted-foreground">
          Documentos Anexados
        </h5>
        <div>
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
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={12} className="mr-1" />
            {uploading ? "Enviando..." : "Anexar PDF"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : documentos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-1">
          Nenhum documento anexado
        </p>
      ) : (
        <div className="space-y-1">
          {documentos.map((doc: any) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 p-2 rounded border bg-background text-xs"
            >
              <FileText size={14} className="text-red-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{doc.nome_arquivo}</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>v{doc.versao}</span>
                  <span>
                    {new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}
                  </span>
                  {doc.uploaded_by && <span>{doc.uploaded_by}</span>}
                </div>
                {doc.observacao_auditor && (
                  <p className="text-muted-foreground mt-0.5 italic">
                    Auditor: {doc.observacao_auditor}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 ${DOC_STATUS_COLORS[doc.status_documento] || ""}`}
              >
                {DOC_STATUS_LABELS[doc.status_documento] ||
                  doc.status_documento}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                title="Abrir documento"
                onClick={() => openSignedUrl(doc.url_arquivo)}
              >
                <ExternalLink size={12} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                title="Analisar documento"
                onClick={() => {
                  setSelectedDoc(doc);
                  setNovoStatus(doc.status_documento);
                  setObsAuditor(doc.observacao_auditor || "");
                  setShowAnaliseDialog(true);
                }}
              >
                <Search size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de análise */}
      <Dialog open={showAnaliseDialog} onOpenChange={setShowAnaliseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analisar Documento</DialogTitle>
            <DialogDescription>
              {selectedDoc?.nome_arquivo} — versão {selectedDoc?.versao}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Status do Documento</Label>
              <Select value={novoStatus} onValueChange={setNovoStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enviado">
                    <span className="flex items-center gap-2">
                      <Upload size={12} /> Enviado
                    </span>
                  </SelectItem>
                  <SelectItem value="em_analise">
                    <span className="flex items-center gap-2">
                      <Search size={12} /> Em Análise
                    </span>
                  </SelectItem>
                  <SelectItem value="aceito">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={12} /> Aceito
                    </span>
                  </SelectItem>
                  <SelectItem value="recusado">
                    <span className="flex items-center gap-2">
                      <XCircle size={12} /> Recusado
                    </span>
                  </SelectItem>
                  <SelectItem value="complementar">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={12} /> Complementar
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observação do Auditor</Label>
              <Textarea
                value={obsAuditor}
                onChange={(e) => setObsAuditor(e.target.value)}
                rows={3}
                placeholder="Comentários sobre o documento..."
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => selectedDoc && openSignedUrl(selectedDoc.url_arquivo)}
            >
              <ExternalLink size={12} className="mr-1" /> Visualizar Documento
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAnaliseDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => analisarMutation.mutate()}
              disabled={analisarMutation.isPending}
            >
              {analisarMutation.isPending ? "Salvando..." : "Salvar Análise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
