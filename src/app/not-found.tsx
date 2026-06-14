import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        404
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        That URL doesn&apos;t match anything here — maybe the hunt moved on or
        the link is outdated.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
          Home
        </Link>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
