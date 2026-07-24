import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://zqoywwtdsbtqtytvyzwl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxb3l3d3Rkc2J0cXR5dHZ5endsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODcxODYsImV4cCI6MjA5MTA2MzE4Nn0.r2NXJ5bh9fYntoZoDaMFYUmdp5u5zJC9zYJ46gZVWuM";

export default defineTool({
  name: "list_clientes",
  title: "Listar clientes",
  description:
    "Lista clientes acessíveis ao usuário autenticado (respeita RLS). Retorna id, razão social e nome fantasia.",
  inputSchema: {
    limit: z.number().int().min(1).max(500).optional(),
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
      .from("clientes")
      .select("id, razao_social, nome_fantasia")
      .order("razao_social", { ascending: true })
      .limit(limit ?? 100);

    if (error) {
      return {
        content: [{ type: "text", text: `Erro: ${error.message}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { clientes: data ?? [] },
    };
  },
});
