"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  updateNotificationPrefsAction,
  notificationPrefsInitialState,
} from "@/app/(app)/account/actions";
import { Button } from "@/components/ui/button";

interface Prefs {
  notify_action_needed: boolean;
  notify_messages: boolean;
  notify_shipped: boolean;
}

const TOGGLES: { name: keyof Prefs; label: string; hint?: string }[] = [
  {
    name: "notify_action_needed",
    label: "Action needed (candidate found, item arrived)",
  },
  { name: "notify_messages", label: "Hunter updates & messages" },
  { name: "notify_shipped", label: "Item shipped" },
];

/** A label-wrapped checkbox styled as a switch — submits with the form. */
function Toggle({
  name,
  label,
  defaultChecked,
  last,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  last: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between py-3 text-sm ${
        last ? "" : "border-b border-border/60"
      }`}
    >
      <span>{label}</span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="h-[22px] w-[38px] rounded-full bg-muted-foreground/30 transition-colors peer-checked:bg-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50" />
        <span className="pointer-events-none absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function NotificationsForm({ prefs }: { prefs: Prefs }) {
  const [state, formAction, isPending] = useActionState(
    updateNotificationPrefsAction,
    notificationPrefsInitialState,
  );

  return (
    <form action={formAction} className="flex flex-col">
      {state.status === "success" && state.message ? (
        <p className="mb-2 rounded-lg border border-success-border bg-success-muted px-3 py-2 text-[13px] text-success">
          {state.message}
        </p>
      ) : null}
      {state.status === "error" && state.message ? (
        <p className="mb-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          {state.message}
        </p>
      ) : null}

      {TOGGLES.map((t, i) => (
        <Toggle
          key={t.name}
          name={t.name}
          label={t.label}
          defaultChecked={prefs[t.name]}
          last={i === TOGGLES.length - 1}
        />
      ))}

      <p className="mt-2 text-[12px] text-muted-foreground">
        Payment and refund receipts always send. Other updates follow these
        preferences.
      </p>

      <Button type="submit" disabled={isPending} className="mt-3 h-10 w-fit gap-2">
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Save preferences
      </Button>
    </form>
  );
}
