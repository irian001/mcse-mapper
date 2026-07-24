import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTrabalhos from "./tools/list-trabalhos";
import listClientes from "./tools/list-clientes";
import getMcseConta from "./tools/get-mcse-conta";

export default defineMcp({
  name: "audiconsult-mcp",
  title: "Audiconsult Auditoria — MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas de leitura sobre trabalhos de auditoria, clientes e contas MCSE do sistema Audiconsult. Todas as chamadas respeitam a identidade do usuário autenticado (RLS).",
  auth: auth.oauth.issuer({
    issuer: "https://zqoywwtdsbtqtytvyzwl.supabase.co/auth/v1",
    acceptedAudiences: "authenticated",
  }),
  tools: [listTrabalhos, listClientes, getMcseConta],
});
