import { NavLink, useLocation } from "react-router-dom";
import { FileText, LogOut, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoAudiconsult from "@/assets/logo_audiconsult.jpg";

const menuItems = [
  { to: "/cliente/solicitacoes", label: "Minhas Solicitações", icon: FileText },
  { to: "/cliente/pendencias", label: "Pendências", icon: AlertTriangle },
];

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const { data: profile } = useUserProfile();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <header className="h-12 shrink-0 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
            Portal do Cliente
          </h2>
          <p className="text-xs text-muted-foreground">
            {profile?.clienteUsuario?.clientes?.razao_social || ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <img src={logoAudiconsult} alt="Audiconsult Auditores" className="h-9 object-contain" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
          <div className="p-4 border-b border-sidebar-border">
            <h1 className="text-lg font-bold tracking-tight text-sidebar-primary">AuditEletric</h1>
            <p className="text-xs text-sidebar-accent-foreground/60 mt-0.5">Área do Cliente</p>
          </div>
          <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-auto">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-sidebar-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sidebar-foreground/40">v1.0 — Fase 1</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={() => supabase.auth.signOut()}>
                <LogOut size={14} />
              </Button>
            </div>
            <div className="text-xs text-sidebar-foreground/60 truncate">
              {profile?.clienteUsuario?.nome || "Cliente"}
            </div>
            <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-sidebar-primary/70 bg-sidebar-accent px-1.5 py-0.5 rounded">
              Cliente
            </span>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
