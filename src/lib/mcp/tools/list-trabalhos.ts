import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://zqoywwtdsbtqtytvyzwl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxb3l3d3Rkc2J0cXR5dHZ5endsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODcxODYsImV4cCI6MjA5MTA2MzE4Nn0.r2NXJ5bh9fYntoZoDaMFYUmdp5u5zJC9zYJ46gZVWuM";

export default defineTool({
  name: "list_trabalhos_auditoria",
  title: "Listar trabalhos de auditoria",
  description:
    "Lista trabalhos de auditoria acessíveis ao usuário autenticado (respeita RLS). Retorna id, cliente_id, exercicio_id e status.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe("Número máximo de trabalhos a retornar (padrão 50)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Não autenticado." }],
        isError: true,
      };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("trabalhos_auditoria")
      .select("id, cliente_id, exercicio_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);

    if (error) {
      return {
        content: [{ type: "text", text: `Erro: ${error.message}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { trabalhos: data ?? [] },
    };
  },
});
