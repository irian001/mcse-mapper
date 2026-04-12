import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

export type UserRole = "auditor" | "cliente_usuario" | "sem_vinculo";

export interface UserProfile {
  role: UserRole;
  auditor?: any;
  clienteUsuario?: any;
}

export function useUserProfile() {
  return useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { role: "sem_vinculo" as const };

      // Check auditor first
      const { data: auditor } = await supabase
        .from("auditores")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (auditor) return { role: "auditor" as const, auditor };

      // Check client user
      const { data: clienteUsuario } = await supabase
        .from("cliente_usuarios")
        .select("*, clientes(razao_social, nome_fantasia)")
        .eq("auth_user_id", user.id)
        .eq("ativo", true)
        .maybeSingle();

      if (clienteUsuario) return { role: "cliente_usuario" as const, clienteUsuario };

      return { role: "sem_vinculo" as const };
    },
  });
}
