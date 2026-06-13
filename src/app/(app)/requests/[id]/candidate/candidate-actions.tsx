"use client";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { approveAction, keepHuntingAction } from "./actions";
import { Button } from "@/components/ui/button";

export function CandidateActions({
  requestId,
  candidateId,
  overCap,
}: {
  requestId: string;
  candidateId: string;
  overCap: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2.5">
      <Button
        size="lg"
        disabled={overCap || pending}
        className="h-11 gap-2 text-[14.5px] font-[560]"
        onClick={() => start(() => approveAction(requestId, candidateId))}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Approve &amp; buy
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="h-11 text-[14px] font-[540]"
        disabled={pending}
        onClick={() => start(() => keepHuntingAction(requestId, candidateId))}
      >
        Keep hunting
      </Button>
      {overCap ? (
        <p className="text-[12.5px] leading-relaxed text-warning">
          This candidate is over your cap — approving would need re-authorising
          your escrow hold, which isn&apos;t available yet. You can keep hunting
          instead.
        </p>
      ) : (
        <p className="mt-1 text-center text-[12px] leading-relaxed text-muted-foreground">
          Approving draws from your escrow to purchase. You&apos;ll approve once
          more — against the real photos — before it ships.
        </p>
      )}
    </div>
  );
}
