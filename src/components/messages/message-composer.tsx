"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MESSAGE_LENGTH } from "@/lib/requests/message-validation";

type SendAction = (requestId: string, formData: FormData) => Promise<void>;

export function MessageComposer({
  requestId,
  sendAction,
  placeholder = "Write a message…",
}: {
  requestId: string;
  sendAction: SendAction;
  placeholder?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData();
        fd.set("body", draft);
        start(async () => {
          try {
            await sendAction(requestId, fd);
            setDraft("");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't send message.");
          }
        });
      }}
    >
      <Textarea
        name="body"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        rows={2}
        maxLength={MAX_MESSAGE_LENGTH}
        disabled={pending}
        className="min-h-[72px] resize-none border-input text-sm"
      />
      <div className="flex items-center justify-between gap-3">
        {error ? (
          <p className="text-[12px] text-destructive">{error}</p>
        ) : (
          <p className="text-[11.5px] text-muted-foreground">
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </p>
        )}
        <Button type="submit" size="sm" disabled={pending || !draft.trim()} className="gap-1.5">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Send
        </Button>
      </div>
    </form>
  );
}
