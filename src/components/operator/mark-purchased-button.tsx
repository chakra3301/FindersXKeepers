"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markPurchasedAction } from "@/app/operator/[id]/actions";

export function MarkPurchasedButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      disabled={pending}
      className="h-10 w-fit gap-2"
      onClick={() => start(() => markPurchasedAction(requestId))}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      Mark purchased
    </Button>
  );
}
