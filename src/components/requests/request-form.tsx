"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, ShieldAlert, X } from "lucide-react";
import {
  createRequest,
  type CreateRequestState,
} from "@/app/(app)/requests/new/actions";
import { MIN_CONDITIONS, RUSH_TIERS } from "@/lib/validation/request";
import { RUSH_LABEL } from "@/lib/pricing";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONDITION_LABEL: Record<(typeof MIN_CONDITIONS)[number], string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  acceptable: "Acceptable",
  any: "Any",
};

const RUSH_BLURB: Record<(typeof RUSH_TIERS)[number], string> = {
  standard: "No rush",
  priority: "Faster sourcing",
  express: "Top priority",
};

const initialState: CreateRequestState = { status: "idle" };

export function RequestForm() {
  const [state, formAction, isPending] = useActionState(
    createRequest,
    initialState,
  );

  const [minCondition, setMinCondition] =
    useState<(typeof MIN_CONDITIONS)[number]>("any");
  const [rushTier, setRushTier] =
    useState<(typeof RUSH_TIERS)[number]>("standard");
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [niceToHaves, setNiceToHaves] = useState<string[]>([]);

  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {/* hidden serialised controlled values */}
      <input type="hidden" name="minCondition" value={minCondition} />
      <input type="hidden" name="rushTier" value={rushTier} />
      <input type="hidden" name="mustHaves" value={JSON.stringify(mustHaves)} />
      <input
        type="hidden"
        name="niceToHaves"
        value={JSON.stringify(niceToHaves)}
      />

      {state.status === "blocked" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
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
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      {/* What */}
      <fieldset className="flex flex-col gap-5">
        <legend className="font-heading text-base font-medium tracking-tight">
          What are you after?
        </legend>

        <Field label="Title" htmlFor="title" error={err.title} required>
          <Input
            id="title"
            name="title"
            placeholder="e.g. Vintage Comme des Garçons wool coat, size M"
            className="h-11"
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
              className="h-11"
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
              className="h-11"
              aria-invalid={!!err.referenceImageUrl}
            />
          </Field>
        </div>
      </fieldset>

      <div className="h-px bg-border" />

      {/* Constraints */}
      <fieldset className="flex flex-col gap-5">
        <legend className="font-heading text-base font-medium tracking-tight">
          Your constraints
        </legend>

        <Field
          label="Minimum condition"
          hint="The least you'll accept — we won't send anything below this."
        >
          <SegmentedControl
            options={MIN_CONDITIONS.map((c) => ({
              value: c,
              label: CONDITION_LABEL[c],
            }))}
            value={minCondition}
            onChange={setMinCondition}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
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

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Budget cap"
            htmlFor="budgetCapJpy"
            hint="The most you'll spend, in yen (item + fees + shipping)."
            error={err.budgetCapJpy}
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ¥
              </span>
              <Input
                id="budgetCapJpy"
                name="budgetCapJpy"
                inputMode="numeric"
                placeholder="50,000"
                className="tnum h-11 pl-7"
                aria-invalid={!!err.budgetCapJpy}
              />
            </div>
          </Field>
          <Field
            label="Deadline"
            htmlFor="deadlineAt"
            hint="Optional — when you need it by."
          >
            <Input
              id="deadlineAt"
              name="deadlineAt"
              type="date"
              className="h-11"
            />
          </Field>
        </div>

        <Field label="Rush tier" hint="How urgently should we hunt?">
          <SegmentedControl
            options={RUSH_TIERS.map((t) => ({
              value: t,
              label: RUSH_LABEL[t],
              sub: RUSH_BLURB[t],
            }))}
            value={rushTier}
            onChange={setRushTier}
          />
        </Field>
      </fieldset>

      <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
        <p className="max-w-xs text-xs text-muted-foreground">
          Posting is free. You only pay once you approve a sourced candidate —
          into escrow.
        </p>
        <Button type="submit" size="lg" className="gap-2" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Post request
        </Button>
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

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-start rounded-lg border px-3.5 py-2 text-sm transition-all",
              active
                ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            )}
          >
            <span className="font-medium">{opt.label}</span>
            {opt.sub && (
              <span className="text-[0.7rem] text-muted-foreground">
                {opt.sub}
              </span>
            )}
          </button>
        );
      })}
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
          className="h-11"
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
