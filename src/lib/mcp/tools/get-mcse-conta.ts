import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://zqoywwtdsbtqtytvyzwl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxb3l3d3Rkc2J0cXR5dHZ5endsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODcxODYsImV4cCI6MjA5MTA2MzE4Nn0.r2NXJ5bh9fYntoZoDaMFYUmdp5u5zJC9zYJ46gZVWuM";

export default defineTool({
  name: "get_mcse_conta",
  title: "Buscar conta MCSE",
  description:
    "Busca uma conta canônica do MCSE pelo código. Retorna descrição, grupo e subgrupo.",
  inputSchema: {
    codigo: z.string().trim().min(1).describe("Código da conta MCSE."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ codigo }, ctx) => {
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
      .from("mcse_contas")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) {
      return {
        content: [{ type: "text", text: `Erro: ${error.message}` }],
        isError: true,
      };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: `Nenhuma conta MCSE encontrada para o código ${codigo}.` }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { conta: data },
    };
  },
});
