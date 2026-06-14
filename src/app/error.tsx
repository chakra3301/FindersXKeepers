"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        We hit an unexpected error
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Your escrow and request data are unchanged — try again, or head back to
        your dashboard.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Try again
        </button>
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
