"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  Clock,
  Settings,
  Wrench,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { formatJpy } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/history", label: "Order history", icon: Clock },
  { href: "/account", label: "Account", icon: Settings },
];

interface SidebarProps {
  escrowTotal: number;
  activeCount: number;
  isStaff?: boolean;
}

export function Sidebar({ escrowTotal, activeCount, isStaff = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-[100svh] w-[256px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
      <Link href="/dashboard" className="px-2 py-1.5">
        <Logo />
      </Link>

      <Link
        href="/requests/new"
        className={cn(
          buttonVariants({ variant: "default" }),
          "mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-[540]",
        )}
      >
        <Plus className="size-4 shrink-0" />
        New request
      </Link>

      <nav className="mt-4 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "size-[18px] transition-colors",
                  active
                    ? "text-sidebar-accent-foreground"
                    : "text-muted-foreground/80 group-hover:text-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
        {isStaff ? (
          <Link
            href="/operator"
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/operator")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Wrench
              className={cn(
                "size-[18px] transition-colors",
                pathname.startsWith("/operator")
                  ? "text-sidebar-accent-foreground"
                  : "text-muted-foreground/80 group-hover:text-foreground",
              )}
            />
            Operator console
          </Link>
        ) : null}
      </nav>

      <div className="mt-auto">
        <div className="rounded-xl border border-success-border bg-secondary p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-[540] text-success">
            <ShieldCheck size={13} className="shrink-0" />
            Held in escrow
          </div>
          <p className="tnum mt-1 text-lg font-[600] leading-tight text-foreground">
            {formatJpy(escrowTotal)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            across {activeCount} active {activeCount === 1 ? "hunt" : "hunts"}
          </p>
        </div>

        <Link
          href="/"
          className="mt-2.5 flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight size={14} className="shrink-0" />
          View public site
        </Link>
      </div>
    </aside>
  );
}
