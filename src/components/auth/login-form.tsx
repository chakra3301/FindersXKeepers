"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          toast.success("Check your email to confirm your account.", {
            description:
              "Or disable email confirmations in Supabase Auth settings for instant sign-in.",
          });
          setMode("signin");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch {
      toast.error("Apple sign-in isn't configured yet.", {
        description: "Add Apple as an OAuth provider in your Supabase project.",
      });
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full gap-2 border-border bg-card text-[0.9rem] font-medium"
        onClick={handleApple}
        disabled={loading}
      >
        <AppleGlyph className="size-4" />
        Continue with Apple
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-11 focus-visible:ring-primary/15"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-11 focus-visible:ring-primary/15"
          />
        </div>

        <Button
          type="submit"
          className="h-11 w-full bg-primary text-primary-foreground text-[0.9rem] hover:bg-primary/80"
          disabled={loading}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          disabled={loading}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.22-1.2 3.06-.84.93-2.16 1.65-3.3 1.56-.15-1.11.42-2.28 1.14-3.03.81-.9 2.19-1.56 3.36-1.59zM20.6 17.2c-.6 1.38-.9 1.98-1.65 3.18-1.05 1.65-2.55 3.72-4.38 3.72-1.62 0-2.04-1.05-4.26-1.05-2.22 0-2.67 1.08-4.29 1.05-1.83-.03-3.24-1.86-4.29-3.51C-.45 17.16-.69 11.4 1.59 8.4c1.05-1.41 2.7-2.31 4.26-2.31 1.65 0 2.79 1.08 4.2 1.08 1.38 0 2.22-1.08 4.2-1.08 1.41 0 2.91.78 3.96 2.13-3.48 1.92-2.91 6.84.39 8.16z" />
    </svg>
  );
}
