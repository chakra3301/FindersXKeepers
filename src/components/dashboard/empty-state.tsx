import Link from "next/link";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState() {
  return (
    <div className="rounded-[18px] border border-dashed border-input bg-secondary px-7 py-16 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <span className="inline-grid size-14 place-items-center rounded-[15px] border border-border bg-card mb-[18px]">
          <Search className="size-6 text-muted-foreground" />
        </span>
        <h2 className="text-[19px] font-[600] tracking-tight">
          Start your first hunt
        </h2>
        <p className="mt-2.5 text-pretty text-sm leading-relaxed text-muted-foreground">
          Post the item you want from Japan — a specific listing, a grail
          you&rsquo;ve been hunting, or just a description. Set a budget and
          the condition you&rsquo;ll accept, and our finders take it from there.
        </p>
        <div className="mt-7">
          <Link
            href="/requests/new"
            className={cn(
              buttonVariants({ size: "lg" }),
              "inline-flex items-center gap-2",
            )}
          >
            Make a request
          </Link>
        </div>
      </div>
    </div>
  );
}
