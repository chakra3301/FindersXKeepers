"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { markReceivedAction } from "@/app/operator/[id]/actions";

export function MarkReceivedForm({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => start(() => markReceivedAction(requestId, formData))}
    >
      <div className="grid gap-2">
        <Label htmlFor="receivedImageUrls">Proof image URLs (optional)</Label>
        <Textarea
          id="receivedImageUrls"
          name="receivedImageUrls"
          rows={3}
          placeholder="One URL per line — in-hand photos for the customer"
          disabled={pending}
        />
      </div>

      <Button type="submit" disabled={pending} className="h-10 w-fit gap-2">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Mark received at hub
      </Button>
    </form>
  );
}
