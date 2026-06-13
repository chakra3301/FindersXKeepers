"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, ShieldAlert, X } from "lucide-react";
import {
  createRequest,
  type CreateRequestState,
} from "@/app/(app)/requests/new/actions";
import { MIN_CONDITIONS, RUSH_TIERS } from "@/lib/validation/request";
import {
  RUSH_LABEL,
  computeFinderFee,
  formatJpy,
} from "@/lib/pricing";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const CONDITION_LABEL: Record<(typeof MIN_CONDITIONS)[number], string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  acceptable: "Acceptable",
  any: "Any",
};

const CONDITION_DESC: Record<(typeof MIN_CONDITIONS)[number], string> = {
  new: "Unopened, unused — tags on or sealed.",
  like_new: "Worn once or twice, no visible flaws.",
  good: "Normal wear, no damage, fully functional.",
  acceptable: "Visible wear or minor flaws, clearly disclosed.",
  any: "Condition doesn't matter — function over form.",
};

const RUSH_BLURB: Record<(typeof RUSH_TIERS)[number], string> = {
  standard: "No rush — we source at our own pace.",
  priority: "Faster sourcing — 1.5× finder's fee.",
  express: "Top priority — 2× finder's fee.",
};

const STEP_TITLES = [
  "What are you after?",
  "Minimum condition you'll accept",
  "Must-haves & nice-to-haves",
  "Your budget cap",
  "How fast do you need it?",
  "Review your request",
];

const initialState: CreateRequestState = { status: "idle" };

export function RequestForm() {
  const [state, formAction, isPending] = useActionState(
    createRequest,
    initialState,
  );

  const [step, setStep] = useState(0);
  const TOTAL_STEPS = 6;

  // Controlled state for serialized / computed fields.
  // Reorder prefill: lazy initializers read query params once on mount.
  const params = useSearchParams();
  const [title, setTitle] = useState(() => params.get("title") ?? "");
  const [minCondition, setMinCondition] = useState<
    (typeof MIN_CONDITIONS)[number]
  >(() => {
    const c = params.get("condition");
    return (MIN_CONDITIONS as readonly string[]).includes(c ?? "")
      ? (c as (typeof MIN_CONDITIONS)[number])
      : "any";
  });
  const [rushTier, setRushTier] = useState<(typeof RUSH_TIERS)[number]>(() => {
    const r = params.get("rush");
    return (RUSH_TIERS as readonly string[]).includes(r ?? "")
      ? (r as (typeof RUSH_TIERS)[number])
      : "standard";
  });
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [niceToHaves, setNiceToHaves] = useState<string[]>([]);
  // budgetCapJpy lifted to controlled state for live fee preview
  const [budgetCapRaw, setBudgetCapRaw] = useState(
    () => params.get("budget") ?? "",
  );

  const err = state.fieldErrors ?? {};

  // Parse budget cap for fee preview
  const parsedCap =
    parseInt(budgetCapRaw.replace(/[^0-9]/g, ""), 10) || 0;
  const finderFeePreview = computeFinderFee(parsedCap, rushTier);

  return (
    <form action={formAction} className="flex flex-col gap-0">
      {/* Hidden serialised controlled values — always present for submit */}
      <input type="hidden" name="minCondition" value={minCondition} />
      <input type="hidden" name="rushTier" value={rushTier} />
      <input type="hidden" name="mustHaves" value={JSON.stringify(mustHaves)} />
      <input
        type="hidden"
        name="niceToHaves"
        value={JSON.stringify(niceToHaves)}
      />
      {/* budgetCapJpy as hidden input synced to controlled state */}
      <input
        type="hidden"
        name="budgetCapJpy"
        value={budgetCapRaw.replace(/[^0-9]/g, "")}
      />

      {/* Error banners — always visible regardless of step */}
      {state.status === "blocked" && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <ShieldAlert className="size-4" />
            {state.message}
          </div>
          <ul className="mt-2.5 flex flex-col gap-1.5 text-sm text-destructive/90">
            {state.matches?.map((m, i) => (
              <li key={i} className="flex flex-wrap gap-x-1.5">
                <span className="font-medium">{m.category}:</span>
                <span className="text-destructive/80">{m.reason}</span>
                <span className="text-destructive/60">
                  (matched &ldquo;{m.term}&rdquo;)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.status === "error" && state.message && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      {/* Step progress indicator */}
      <div className="mb-8">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
      </div>

      {/* Step title */}
      <h1 className="mb-6 font-sans text-2xl font-medium tracking-tight sm:text-3xl">
        {STEP_TITLES[step]}
      </h1>

      {/* ── Step 0: What are you after? ── */}
      <div hidden={step !== 0} className={cn("flex flex-col gap-5", step !== 0 && "hidden")}>
        <Field label="Title" htmlFor="title" error={err.title} required>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Vintage Comme des Garçons wool coat, size M"
            className="h-11 border-input focus-visible:ring-primary/15"
            aria-invalid={!!err.title}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          hint="Colours, sizing, era, anything that helps us find the right one."
          error={err.description}
        >
          <Textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Tell us exactly what you're picturing…"
            className="border-input focus-visible:ring-primary/15"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Reference link"
            htmlFor="referenceUrl"
            hint="A listing, archive, or example."
            error={err.referenceUrl}
          >
            <Input
              id="referenceUrl"
              name="referenceUrl"
              inputMode="url"
              placeholder="https://…"
              className="h-11 border-input focus-visible:ring-primary/15"
              aria-invalid={!!err.referenceUrl}
            />
          </Field>
          <Field
            label="Reference image URL"
            htmlFor="referenceImageUrl"
            hint="Optional — paste an image link."
            error={err.referenceImageUrl}
          >
            <Input
              id="referenceImageUrl"
              name="referenceImageUrl"
              inputMode="url"
              placeholder="https://…"
              className="h-11 border-input focus-visible:ring-primary/15"
              aria-invalid={!!err.referenceImageUrl}
            />
          </Field>
        </div>
      </div>

      {/* ── Step 1: Minimum condition ── */}
      <div hidden={step !== 1} className={cn("flex flex-col gap-3", step !== 1 && "hidden")}>
        <p className="text-sm text-muted-foreground">
          The least you&rsquo;ll accept — we won&rsquo;t send anything below this.
        </p>
        {MIN_CONDITIONS.map((c) => {
          const active = minCondition === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setMinCondition(c)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-start rounded-xl border px-4 py-3.5 text-left transition-all",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-card hover:border-foreground/20",
              )}
            >
              <span className="text-sm font-medium">{CONDITION_LABEL[c]}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {CONDITION_DESC[c]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Step 2: Must-haves & nice-to-haves ── */}
      <div hidden={step !== 2} className={cn("flex flex-col gap-6", step !== 2 && "hidden")}>
        <Field label="Must-haves" hint="Non-negotiables. Press Enter to add.">
          <ChipInput
            values={mustHaves}
            onChange={setMustHaves}
            placeholder="e.g. No repairs"
          />
        </Field>
        <Field label="Nice-to-haves" hint="Bonuses, not deal-breakers.">
          <ChipInput
            values={niceToHaves}
            onChange={setNiceToHaves}
            placeholder="e.g. Original box"
          />
        </Field>
      </div>

      {/* ── Step 3: Budget cap ── */}
      <div hidden={step !== 3} className={cn("flex flex-col gap-4", step !== 3 && "hidden")}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budgetCapJpyDisplay">
            Budget cap
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (in yen)
            </span>
          </Label>
          <p className="text-xs text-muted-foreground">
            The most you&rsquo;ll spend — item cost + finder&rsquo;s fee + shipping + tax.
          </p>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
              ¥
            </span>
            {/* Display input is controlled; hidden input carries the name for the form */}
            <Input
              id="budgetCapJpyDisplay"
              inputMode="numeric"
              placeholder="50,000"
              value={budgetCapRaw}
              onChange={(e) => setBudgetCapRaw(e.target.value)}
              className="tnum h-12 pl-7 text-base border-input focus-visible:ring-primary/15"
              aria-invalid={!!err.budgetCapJpy}
            />
          </div>
          {err.budgetCapJpy && (
            <p className="text-xs text-destructive">{err.budgetCapJpy}</p>
          )}
        </div>

        {parsedCap > 0 && (
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            Our finder&rsquo;s fee on this would be about{" "}
            <span className="tnum font-medium text-foreground">
              {formatJpy(finderFeePreview)}
            </span>{" "}
            — charged only if we succeed.
          </div>
        )}
      </div>

      {/* ── Step 4: Rush tier + deadline ── */}
      <div hidden={step !== 4} className={cn("flex flex-col gap-6", step !== 4 && "hidden")}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            How urgently should we hunt? Rush multiplies our finder&rsquo;s fee.
          </p>
          {RUSH_TIERS.map((t) => {
            const active = rushTier === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setRushTier(t)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-start rounded-xl border px-4 py-3.5 text-left transition-all",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-foreground/20",
                )}
              >
                <span className="text-sm font-medium">{RUSH_LABEL[t]}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">
                  {RUSH_BLURB[t]}
                </span>
              </button>
            );
          })}
        </div>

        <Field
          label="Deadline"
          htmlFor="deadlineAt"
          hint="Optional — when you need it by."
        >
          <Input
            id="deadlineAt"
            name="deadlineAt"
            type="date"
            className="h-11 border-input focus-visible:ring-primary/15"
          />
        </Field>
      </div>

      {/* ── Step 5: Review ── */}
      <div hidden={step !== 5} className={cn("flex flex-col gap-5", step !== 5 && "hidden")}>
        <dl className="flex flex-col gap-4 rounded-xl border border-border bg-secondary/30 px-5 py-4 text-sm">
          <ReviewRow label="Item">
            {title || "—"}
          </ReviewRow>
          <ReviewRow label="Condition">
            {CONDITION_LABEL[minCondition]}{" "}
            <span className="text-muted-foreground">
              — {CONDITION_DESC[minCondition]}
            </span>
          </ReviewRow>
          <ReviewRow label="Must-haves">
            {mustHaves.length > 0
              ? mustHaves.join(", ")
              : <span className="text-muted-foreground italic">None</span>}
          </ReviewRow>
          <ReviewRow label="Nice-to-haves">
            {niceToHaves.length > 0
              ? niceToHaves.join(", ")
              : <span className="text-muted-foreground italic">None</span>}
          </ReviewRow>
          <ReviewRow label="Budget cap">
            {parsedCap > 0
              ? <span className="tnum">{formatJpy(parsedCap)}</span>
              : <span className="text-muted-foreground italic">Not set</span>}
          </ReviewRow>
          <ReviewRow label="Rush tier">{RUSH_LABEL[rushTier]}</ReviewRow>
          {parsedCap > 0 && (
            <ReviewRow label="Est. finder's fee">
              <span className="tnum">{formatJpy(finderFeePreview)}</span>
              <span className="ml-1 text-muted-foreground">
                (charged only on success)
              </span>
            </ReviewRow>
          )}
        </dl>

        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">Next: escrow deposit</p>
          <p className="mt-1 text-muted-foreground">
            After posting you&rsquo;ll deposit into escrow. You&rsquo;re not charged until
            your item ships — refunded in full if we can&rsquo;t find it.
          </p>
        </div>
      </div>

      {/* ── Navigation footer ── */}
      <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
        {/* Back */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setStep(step - 1)}
          className={cn(step === 0 && "invisible")}
        >
          Back
        </Button>

        {/* Cancel */}
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Cancel
        </Link>

        <div className="flex-1" />

        {/* Continue (steps 0–4) or Submit (step 5) */}
        {step < TOTAL_STEPS - 1 ? (
          <Button
            type="button"
            size="default"
            onClick={() => setStep(step + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            type="submit"
            size="default"
            className="gap-2"
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Post request
          </Button>
        )}
      </div>
    </form>
  );
}

/* ------------------------------- subparts -------------------------------- */

function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
        </Label>
        {hint && !error && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (v && !values.includes(v) && values.length < 20) {
      onChange([...values, v]);
    }
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-11 border-input focus-visible:ring-primary/15"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          onClick={add}
          aria-label="Add"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-muted-foreground transition-colors hover:text-destructive"
                aria-label={`Remove ${v}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <dt className="w-32 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="flex-1 text-foreground">{children}</dd>
    </div>
  );
}
