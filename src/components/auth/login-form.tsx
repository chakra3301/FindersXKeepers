"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { lookupAccount } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "email" | "signup" | "code";

// OAuth providers render only once configured in Supabase Auth. Flip the
// matching NEXT_PUBLIC_*_AUTH_ENABLED flag after wiring the provider up there so
// we never ship a button that errors on click.
const APPLE_ENABLED = process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === "true";
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
const OAUTH_ENABLED = APPLE_ENABLED || GOOGLE_ENABLED;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=${encodeURIComponent(next)}`;

  /** Send a one-time passcode. `create` lets Supabase mint a user for new emails. */
  async function sendOtp(create: boolean) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: create,
        emailRedirectTo: redirectTo,
        data: create && fullName.trim() ? { full_name: fullName.trim() } : undefined,
      },
    });
    if (error) throw error;
  }

  // Step 1 — email entered. Detect new vs returning, then branch.
  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await lookupAccount(email);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setEmail(res.email);
      if (res.exists) {
        setIsNew(false);
        await sendOtp(false);
        setStep("code");
        toast.success("We sent a sign-in code to your email.");
      } else {
        setIsNew(true);
        setStep("signup");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 (new accounts) — confirm details, then send the first code.
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendOtp(true);
      setStep("code");
      toast.success("We sent a verification code to your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Step 3 — verify the code and land in the app.
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "That code didn't work.",
        { description: "Double-check the 6 digits, or request a new code." },
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await sendOtp(isNew);
      toast.success("New code sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't resend.");
    } finally {
      setResending(false);
    }
  }

  async function handleOAuth(provider: "apple" | "google") {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    } catch {
      toast.error(`${provider === "apple" ? "Apple" : "Google"} sign-in isn't configured yet.`, {
        description: "Add it as an OAuth provider in your Supabase project.",
      });
      setLoading(false);
    }
  }

  function backToEmail() {
    setStep("email");
    setCode("");
  }

  // ── Code screen ──────────────────────────────────────────────────────────
  if (step === "code") {
    return (
      <div className="flex flex-col gap-6 rise">
        <button
          type="button"
          onClick={backToEmail}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Use a different email
        </button>

        <div className="flex flex-col gap-2">
          <span className="grid size-11 place-items-center rounded-xl border border-border bg-background text-primary">
            <MailCheck className="size-[20px]" />
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {isNew ? "Confirm your email" : "Enter your code"}
          </h2>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              pattern="[0-9]*"
              placeholder="······"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={loading}
              className="tnum h-14 text-center text-2xl font-semibold tracking-[0.5em] focus-visible:ring-primary/15"
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full text-[0.9rem]"
            disabled={loading || code.length < 6}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {isNew ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Didn&rsquo;t get it?{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
        </p>
      </div>
    );
  }

  // ── Signup screen (new email) ────────────────────────────────────────────
  if (step === "signup") {
    return (
      <div className="flex flex-col gap-6 rise">
        <button
          type="button"
          onClick={backToEmail}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </button>

        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Create your account
          </h2>
          <p className="text-sm text-muted-foreground">
            First time with{" "}
            <span className="font-medium text-foreground">{email}</span> — tell us
            your name and we&rsquo;ll send a code to finish.
          </p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              autoComplete="name"
              autoFocus
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              className="h-11 focus-visible:ring-primary/15"
            />
            <p className="text-xs text-muted-foreground">Optional — for your receipts and updates.</p>
          </div>

          <Button type="submit" className="h-11 w-full text-[0.9rem]" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Send verification code
          </Button>
        </form>
      </div>
    );
  }

  // ── Email screen (entry) ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {OAUTH_ENABLED && (
        <>
          <div className="flex flex-col gap-3">
            {APPLE_ENABLED && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 border-border bg-card text-[0.9rem] font-medium"
                onClick={() => handleOAuth("apple")}
                disabled={loading}
              >
                <AppleGlyph className="size-4" />
                Continue with Apple
              </Button>
            )}
            {GOOGLE_ENABLED && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 border-border bg-card text-[0.9rem] font-medium"
                onClick={() => handleOAuth("google")}
                disabled={loading}
              >
                <GoogleGlyph className="size-4" />
                Continue with Google
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={handleEmail} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-11 focus-visible:ring-primary/15"
          />
        </div>

        <Button type="submit" className="h-11 w-full text-[0.9rem]" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Continue
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        No passwords — we email you a one-time code. By continuing you agree to our
        Terms and escrow policy.
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

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}
