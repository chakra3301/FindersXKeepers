"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postCandidateAction } from "@/app/operator/[id]/actions";

export function PostCandidateForm({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => start(() => postCandidateAction(requestId, formData))}
    >
      <div className="grid gap-2">
        <Label htmlFor="priceJpy">Listing price (JPY)</Label>
        <Input
          id="priceJpy"
          name="priceJpy"
          type="text"
          inputMode="numeric"
          placeholder="28500"
          required
          disabled={pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="listingUrl">Source listing URL</Label>
        <Input
          id="listingUrl"
          name="listingUrl"
          type="url"
          placeholder="https://…"
          disabled={pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="listingImages">Listing image URLs</Label>
        <Textarea
          id="listingImages"
          name="listingImages"
          rows={3}
          placeholder="One URL per line"
          disabled={pending}
        />
        <p className="text-[12px] text-muted-foreground">
          Paste image URLs for now — Storage upload comes in a later phase.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes for the customer</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Condition, seller notes, why this match fits…"
          disabled={pending}
        />
      </div>

      <Button type="submit" disabled={pending} className="h-10 w-fit gap-2">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Post candidate
      </Button>
    </form>
  );
}
