"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { approveAndShip } from "./actions";
import { Button } from "@/components/ui/button";

const CHECKS = [
  "The item matches the photos and description",
  "The condition meets what I asked for",
  "I want this shipped to me now",
];

export function ReceivedForm({ requestId }: { requestId: string }) {
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [pending, start] = useTransition();
  const allChecked = checked.every(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2.5">
        {CHECKS.map((c, i) => (
          <li key={c}>
            <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-snug">
              <span
                className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
                  checked[i]
                    ? "border-success bg-success-muted text-success"
                    : "border-input bg-background text-transparent"
                }`}
                aria-hidden
              >
                <Check size={13} strokeWidth={2.6} />
              </span>
              <input
                type="checkbox"
                checked={checked[i]}
                className="sr-only"
                onChange={(e) =>
                  setChecked((p) =>
                    p.map((v, j) => (j === i ? e.target.checked : v)),
                  )
                }
              />
              <span>{c}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button
        size="lg"
        disabled={!allChecked || pending}
        className="gap-2 bg-success text-success-foreground hover:bg-success/90"
        onClick={() => start(() => approveAndShip(requestId))}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Approve &amp; ship
      </Button>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Approving settles your escrow — the real total is released to us, any
        unused part of your cap is returned to you, and the item goes in transit.
        This is the last step.
      </p>
    </div>
  );
}
