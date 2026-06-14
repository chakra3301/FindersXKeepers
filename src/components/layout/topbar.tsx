import Link from "next/link";
import { Plus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

export function Topbar({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
        <div className="lg:hidden">
          <Link href="/dashboard" aria-label="Finders Keepers — home">
            <Logo showWordmark={false} />
          </Link>
        </div>
        <div className="hidden text-sm text-muted-foreground lg:block">
          <span className="font-sans text-[0.95rem] text-foreground">
            Concierge desk
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/requests/new"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="size-4" />
            New request
          </Link>
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
