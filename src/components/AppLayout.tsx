import { NavLink, useLocation } from "react-router-dom";
import { Database, Users, FileSpreadsheet, GitCompare, ShieldCheck } from "lucide-react";

const navItems = [
  { to: "/mcse", label: "Base MCSE", icon: Database },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/importar", label: "Importar Contas", icon: FileSpreadsheet },
  { to: "/mapeamento", label: "Mapeamento", icon: GitCompare },
  { to: "/regras", label: "Regras MCSE", icon: ShieldCheck },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="text-lg font-bold tracking-tight text-sidebar-primary">AuditEletric</h1>
          <p className="text-xs text-sidebar-accent-foreground/60 mt-0.5">Auditoria Contábil</p>
        </div>
        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {navItems.map((item) => (
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
        <div className="p-3 border-t border-sidebar-border text-xs text-sidebar-foreground/40">
          v1.0 — Fase 1
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
