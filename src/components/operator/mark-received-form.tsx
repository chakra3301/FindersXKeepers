"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { markReceivedAction } from "@/app/operator/[id]/actions";
import { ALLOWED_PROOF_MIMES } from "@/lib/storage/types";

export function MarkReceivedForm({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  const accept = ALLOWED_PROOF_MIMES.join(",");

  return (
    <form
      encType="multipart/form-data"
      className="flex flex-col gap-4"
      action={(formData) => start(() => markReceivedAction(requestId, formData))}
    >
      <div className="grid gap-2">
        <Label htmlFor="receivedImages">In-hand proof photos (optional)</Label>
        <Input
          id="receivedImages"
          name="receivedImages"
          type="file"
          accept={accept}
          multiple
          disabled={pending}
        />
        <p className="text-[12px] text-muted-foreground">
          Photos the customer sees on the final ship approval screen.
        </p>
      </div>

      <Button type="submit" disabled={pending} className="h-10 w-fit gap-2">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Mark received at hub
      </Button>
    </form>
  );
}
