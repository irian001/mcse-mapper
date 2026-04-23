import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  FileSignature,
  Briefcase,
  ClipboardCheck,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import logoAudiconsult from "@/assets/logo_audiconsult.jpg";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEmpresaAuditoria } from "@/hooks/useEmpresaAuditoria";
import { ThemeToggle } from "@/components/ThemeToggle";

const menuItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: ["/dashboard"] },
  { to: "/cadastros", label: "Cadastros", icon: FolderKanban, match: ["/cadastros", "/clientes", "/auditores", "/produtos-auditoria", "/cliente-usuarios"] },
  { to: "/contratos", label: "Contratos", icon: FileSignature, match: ["/contratos"] },
  { to: "/trabalhos-hub", label: "Trabalhos", icon: Briefcase, match: ["/trabalhos-hub", "/trabalhos", "/balancetes", "/papeis-trabalho"] },
  { to: "/procedimentos", label: "Procedimentos", icon: ClipboardCheck, match: ["/procedimentos", "/procedimentos-auxiliares"] },
  { to: "/solicitacoes-hub", label: "Solicitações", icon: FileText, match: ["/solicitacoes-hub", "/solicitacoes"] },
  { to: "/administracao", label: "Administração", icon: Settings, match: ["/administracao", "/empresa-auditoria", "/mcse", "/plano-contas", "/mapeamento", "/regras"] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { data: profile } = useUserProfile();
  const { data: empresa } = useEmpresaAuditoria();
  const nomeEmpresa = empresa?.nome_fantasia?.trim() || empresa?.razao_social?.trim() || "Audiconsult Auditores S/S.";

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      {/* Top header bar */}
      <header className="h-12 shrink-0 bg-card border-b border-border flex items-center justify-between px-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">
            Sistema de Auditoria Contábil
          </h2>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            {nomeEmpresa}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <img src={logoAudiconsult} alt="Audiconsult Auditores" className="h-9 object-contain" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
          <div className="p-4 border-b border-sidebar-border">
            <h1 className="text-lg font-bold tracking-tight text-sidebar-primary">AuditEletric</h1>
            <p className="text-xs text-sidebar-accent-foreground/60 mt-0.5">Auditoria Contábil</p>
          </div>
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-auto">
            {menuItems.map((item) => {
              const isActive = item.match.some((m) => location.pathname === m || location.pathname.startsWith(m + "/"));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={() =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`
                  }
                >
                  <item.icon size={18} />
                  <span className="text-left">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="p-3 border-t border-sidebar-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-sidebar-foreground/40">v1.0</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={() => supabase.auth.signOut()}>
                <LogOut size={14} />
              </Button>
            </div>
            <div className="text-xs text-sidebar-foreground/60 truncate">
              {profile?.auditor?.nome || "Usuário"}
            </div>
            <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-sidebar-primary/70 bg-sidebar-accent px-1.5 py-0.5 rounded">
              Auditor
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
