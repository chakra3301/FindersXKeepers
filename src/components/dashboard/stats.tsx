import { Boxes, BellRing, ShieldCheck, Truck } from "lucide-react";
import { formatJpy } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export interface DashboardStats {
  active: number;
  needsAction: number;
  inEscrowJpy: number;
  inTransit: number;
}

export function StatsRow({ stats }: { stats: DashboardStats }) {
  const tiles = [
    {
      label: "Active requests",
      value: String(stats.active),
      icon: Boxes,
      tone: "text-foreground",
    },
    {
      label: "Needs your attention",
      value: String(stats.needsAction),
      icon: BellRing,
      tone: stats.needsAction > 0 ? "text-blue-600 dark:text-blue-400" : "text-foreground",
      highlight: stats.needsAction > 0,
    },
    {
      label: "Held in escrow",
      value: formatJpy(stats.inEscrowJpy),
      icon: ShieldCheck,
      tone: "text-foreground",
    },
    {
      label: "On its way",
      value: String(stats.inTransit),
      icon: Truck,
      tone: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={cn(
            "rounded-xl border bg-card p-4 lift",
            tile.highlight
              ? "border-blue-300/70 ring-1 ring-blue-200/50 dark:border-blue-400/30 dark:ring-blue-400/10"
              : "border-border",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {tile.label}
            </span>
            <tile.icon className="size-4 text-muted-foreground/70" />
          </div>
          <div className={cn("tnum mt-2 font-heading text-2xl font-medium", tile.tone)}>
            {tile.value}
          </div>
        </div>
      ))}
    </div>
  );
}
