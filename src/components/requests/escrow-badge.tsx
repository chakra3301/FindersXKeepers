import {
  Check,
  LockOpen,
  RotateCcw,
  Shield,
  ShieldCheck,
  X,
} from "lucide-react";
import { ESCROW_META, type EscrowState } from "@/lib/escrow/display";
import { TONE_BADGE } from "@/lib/requests/status";
import { cn } from "@/lib/utils";

const ICONS = {
  "lock-open": LockOpen,
  "shield-check": ShieldCheck,
  shield: Shield,
  check: Check,
  "rotate-ccw": RotateCcw,
  x: X,
} as const;

export function EscrowBadge({
  state,
  className,
}: {
  state: EscrowState;
  className?: string;
}) {
  const meta = ESCROW_META[state];
  const Icon = ICONS[meta.icon];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_BADGE[meta.tone],
        className,
      )}
      title={meta.blurb}
    >
      <Icon className="size-3.5" />
      Escrow · {meta.label}
    </span>
  );
}
