import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentAuditor() {
  return useQuery({
    queryKey: ["current-auditor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("auditores")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      return data;
    },
  });
}
