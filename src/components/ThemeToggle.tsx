import { Moon, Sun, Monitor, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, ThemeMode } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const Icon =
    theme === "system"
      ? Monitor
      : resolvedTheme === "dark"
        ? Moon
        : resolvedTheme === "retro"
          ? Terminal
          : Sun;

  const items: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "retro", label: "Retrô Clipper", icon: Terminal },
    { value: "system", label: "Automático", icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Alternar tema">
          <Icon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => setTheme(item.value)}
            className={theme === item.value ? "bg-accent text-accent-foreground" : ""}
          >
            <item.icon size={14} className="mr-2" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
