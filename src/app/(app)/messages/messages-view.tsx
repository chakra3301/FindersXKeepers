"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/dates";
import type { MessageThread } from "@/lib/requests/queries";
import type { Message } from "@/lib/db/types";
import { MessageList } from "@/components/messages/message-list";
import { MessageComposer } from "@/components/messages/message-composer";
import { sendCustomerMessageAction } from "@/app/(app)/messages/actions";

export function MessagesView({
  threads,
  activeId,
  messages,
}: {
  threads: MessageThread[];
  activeId: string | null;
  messages: Message[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const activeThread = threads.find((t) => t.requestId === activeId) ?? null;

  function select(requestId: string) {
    const p = new URLSearchParams(params);
    p.set("request", requestId);
    router.push(`/messages?${p.toString()}`);
  }

  return (
    <div className="grid h-[calc(100vh-13rem)] min-h-[24rem] grid-cols-[280px_1fr] gap-5">
      {/* Thread list */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Per hunt
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              No conversations yet.
            </li>
          )}
          {threads.map((t) => {
            const active = t.requestId === activeId;
            return (
              <li key={t.requestId}>
                <button
                  type="button"
                  onClick={() => select(t.requestId)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors",
                    active
                      ? "border-l-primary bg-secondary"
                      : "border-l-transparent hover:bg-secondary/50",
                  )}
                >
                  <span
                    className="mt-0.5 size-8 flex-none rounded-lg"
                    style={{
                      background:
                        "repeating-linear-gradient(135deg, var(--muted), var(--muted) 5px, var(--secondary) 5px, var(--secondary) 10px)",
                    }}
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-[560] text-foreground">
                      {t.title}
                    </span>
                    <span className="truncate text-[12px] text-muted-foreground">
                      {t.lastSender === "team" ? "Your hunter: " : "You: "}
                      {t.lastBody}
                    </span>
                    <span className="text-[11px] text-muted-foreground tnum">
                      {formatRelativeTime(t.lastAt)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Conversation */}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        {activeId ? (
          <>
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
              <span
                className="size-8 flex-none rounded-lg"
                style={{
                  background:
                    "repeating-linear-gradient(135deg, var(--muted), var(--muted) 5px, var(--secondary) 5px, var(--secondary) 10px)",
                }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-[560] text-foreground">
                  {activeThread?.title ?? "Conversation"}
                </div>
                <div className="text-[11.5px] text-success">Your hunter</div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
              <MessageList messages={messages} perspective="customer" />
            </div>

            <div className="border-t border-border p-3">
              <MessageComposer
                requestId={activeId}
                sendAction={sendCustomerMessageAction}
                placeholder="Message your hunter…"
              />
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center px-6 text-center text-sm text-muted-foreground">
            Select a conversation to read your hunter&rsquo;s updates.
          </div>
        )}
      </div>
    </div>
  );
}
