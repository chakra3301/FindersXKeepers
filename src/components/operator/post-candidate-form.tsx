"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postCandidateAction } from "@/app/operator/[id]/actions";
import { ALLOWED_PROOF_MIMES } from "@/lib/storage/types";

export function PostCandidateForm({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  const accept = ALLOWED_PROOF_MIMES.join(",");

  return (
    <form
      encType="multipart/form-data"
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
        <Label htmlFor="listingImages">Listing photos</Label>
        <Input
          id="listingImages"
          name="listingImages"
          type="file"
          accept={accept}
          multiple
          disabled={pending}
        />
        <p className="text-[12px] text-muted-foreground">
          JPEG, PNG, WebP, or GIF — up to 5 MB each. Upload at least one so the
          customer can review proof.
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
