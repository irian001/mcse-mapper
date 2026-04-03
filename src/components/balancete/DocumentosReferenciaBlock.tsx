import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, Trash2, ExternalLink } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Props {
  linha: any;
}

export default function DocumentosReferenciaBlock({ linha }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [observacao, setObservacao] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["documentos_referencia", linha?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("documentos_referencia_balancete")
        .select("*")
        .eq("balancete_linha_id", linha.id)
        .eq("ativo", true)
        .order("uploaded_at", { ascending: false });
      return data || [];
    },
    enabled: !!linha?.id,
  });

  const handleUpload = async (file: File) => {
    if (!file.type.includes("pdf")) {
      toast.error("Apenas arquivos PDF são aceitos nesta fase.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 20MB.");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${linha.trabalho_auditoria_id}/${linha.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos-balancete")
        .upload(filePath, file, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documentos-balancete")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("documentos_referencia_balancete")
        .insert({
          balancete_linha_id: linha.id,
          trabalho_auditoria_id: linha.trabalho_auditoria_id,
          cliente_id: linha.cliente_id,
          exercicio_id: linha.exercicio_id,
          nome_arquivo: file.name,
          tipo_arquivo: "application/pdf",
          caminho_arquivo_ou_url: urlData.publicUrl,
          observacao_documento: observacao.trim() || null,
        });

      if (insertError) throw insertError;

      toast.success("Documento anexado com sucesso");
      setObservacao("");
      queryClient.invalidateQueries({ queryKey: ["documentos_referencia", linha.id] });
    } catch (err: any) {
      toast.error("Erro ao enviar documento: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const inativarMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from("documentos_referencia_balancete")
        .update({ ativo: false })
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento removido");
      queryClient.invalidateQueries({ queryKey: ["documentos_referencia", linha.id] });
    },
    onError: (err: any) => {
      toast.error("Erro: " + err.message);
    },
  });

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-muted-foreground">Arquivos de Referência (PDF)</h4>

      {/* Upload area */}
      <div className="space-y-2 p-3 rounded-md border border-dashed border-muted-foreground/30">
        <div className="space-y-1.5">
          <Label className="text-xs">Observação do documento (opcional)</Label>
          <Input
            placeholder="Ex: Razão analítico, extrato bancário..."
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload size={14} className="mr-1" />
          {uploading ? "Enviando..." : "Adicionar PDF de Referência"}
        </Button>
      </div>

      {/* Document list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando documentos...</p>
      ) : documentos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum documento anexado</p>
      ) : (
        <div className="space-y-1.5">
          {documentos.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-xs">
              <FileText size={14} className="text-red-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{doc.nome_arquivo}</p>
                <p className="text-muted-foreground">
                  {new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}
                  {doc.observacao_documento && ` — ${doc.observacao_documento}`}
                </p>
              </div>
              <a
                href={doc.caminho_arquivo_ou_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
                onClick={e => e.stopPropagation()}
              >
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ExternalLink size={12} />
                </Button>
              </a>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                    <Trash2 size={12} />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O documento "{doc.nome_arquivo}" será inativado e não aparecerá mais na listagem.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => inativarMutation.mutate(doc.id)}>Remover</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
