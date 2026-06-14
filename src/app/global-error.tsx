"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
            Application error
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Finders Keepers couldn&apos;t load
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={reset}
            className={cn(
              buttonVariants({ variant: "default" }),
              "mt-8",
            )}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
