"use client";

import type { Message } from "@/lib/db/types";
import { MessageList } from "@/components/messages/message-list";
import { MessageComposer } from "@/components/messages/message-composer";
import { sendTeamMessageAction } from "@/app/operator/[id]/actions";

export function OperatorMessagePanel({
  requestId,
  messages,
}: {
  requestId: string;
  messages: Message[];
}) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-[13px] font-[600] uppercase tracking-[.02em] text-muted-foreground">
        Customer thread
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Replies show up in the customer&apos;s Messages tab for this hunt.
      </p>

      <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-border bg-muted/20 p-4">
        <MessageList messages={messages} perspective="team" />
      </div>

      <div className="mt-4">
        <MessageComposer
          requestId={requestId}
          sendAction={sendTeamMessageAction}
          placeholder="Reply to the customer…"
        />
      </div>
    </section>
  );
}
