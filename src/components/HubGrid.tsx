import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface HubItem {
  to: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** Optional accent color class (e.g. "text-primary") */
  accent?: string;
}

interface HubGridProps {
  items: HubItem[];
  /** Tailwind grid columns at lg breakpoint. Defaults to 3. */
  columns?: 2 | 3 | 4;
}

const COLS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export default function HubGrid({ items, columns = 3 }: HubGridProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", COLS[columns])}>
      {items.map((item) => (
        <HubCard key={item.to} item={item} />
      ))}
    </div>
  );
}

function HubCard({ item }: { item: HubItem }) {
  const Icon = item.icon;
  return (
    <Link to={item.to} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      <Card className="h-full p-5 transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md group-hover:-translate-y-0.5 cursor-pointer">
        <div className="flex items-start gap-4">
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-md bg-accent shrink-0",
            item.accent || "text-primary",
          )}>
            <Icon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-foreground truncate">{item.label}</h3>
              <ArrowRight size={16} className="text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-snug">{item.description}</p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
