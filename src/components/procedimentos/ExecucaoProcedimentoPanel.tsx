import { ClipboardList, Construction } from "lucide-react";
import ContagemCaixaPanel from "./ContagemCaixaPanel";

interface Props {
  procedimento: any;
}

/**
 * Renderiza dinamicamente a interface de execução de acordo com o tipo do procedimento.
 *
 * Para adicionar suporte a um novo tipo:
 *  1. Crie o componente de execução em `src/components/procedimentos/<NomePainel>.tsx`
 *  2. Importe-o aqui
 *  3. Adicione um novo `case` no switch abaixo retornando o componente
 *  4. Garanta que o `tipo_procedimento` esteja listado em `TIPOS_PROCEDIMENTO` (ProcedimentosAuxiliaresPage)
 */
export default function ExecucaoProcedimentoPanel({ procedimento }: Props) {
  if (!procedimento) return null;
  const tipo = procedimento.tipo_procedimento;

  switch (tipo) {
    case "contagem_caixa":
      return <ContagemCaixaPanel procedimentoId={procedimento.id} procedimento={procedimento} />;

    case "contagem_estoque":
    case "faturas_em_aberto":
    case "ordens_compra":
    case "ordens_imobilizacao":
      return <PlaceholderExecucao tipo={tipo} />;

    default:
      return <PlaceholderExecucao tipo={tipo} />;
  }
}

function PlaceholderExecucao({ tipo }: { tipo: string }) {
  return (
    <div className="border border-dashed border-border rounded-lg p-8 text-center bg-muted/20">
      <Construction className="mx-auto mb-3 text-muted-foreground" size={32} />
      <h4 className="font-semibold text-foreground flex items-center justify-center gap-2">
        <ClipboardList size={16} /> Execução não implementada
      </h4>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        O painel de execução para o tipo <code className="px-1 py-0.5 rounded bg-muted text-foreground">{tipo}</code>{" "}
        ainda não está disponível. Você pode utilizar a aba <strong>Evidências</strong> para anexar documentos de
        suporte e a aba <strong>Conclusão</strong> para registrar análises e observações.
      </p>
    </div>
  );
}
