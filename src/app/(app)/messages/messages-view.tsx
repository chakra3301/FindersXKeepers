"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/dates";
import type { MessageThread } from "@/lib/requests/queries";
import type { Message } from "@/lib/db/types";

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
                className="grid size-8 flex-none place-items-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary"
                aria-hidden
              >
                A
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-[560] text-foreground">
                  Aoi &middot; your hunter
                </div>
                <div className="text-[11.5px] text-success">
                  {activeThread?.title ?? "Conversation"}
                </div>
              </div>
            </div>

            <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
              {messages.map((m) => {
                const mine = m.sender === "customer";
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "max-w-[74%] px-3.5 py-2.5 text-[13px] leading-relaxed",
                      mine
                        ? "ml-auto rounded-[14px_14px_4px_14px] bg-primary text-primary-foreground"
                        : "mr-auto rounded-[14px_14px_14px_4px] bg-secondary text-secondary-foreground",
                    )}
                  >
                    {m.body}
                    <div
                      className={cn(
                        "mt-1 text-[10.5px] tnum",
                        mine
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatRelativeTime(m.created_at)}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
                <input
                  disabled
                  placeholder="Messaging opens in a later phase"
                  aria-label="Message (disabled — coming in a later phase)"
                  className="flex-1 cursor-not-allowed bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground"
                >
                  Send
                </button>
              </div>
              <p className="mt-2 px-1 text-[11.5px] text-muted-foreground">
                Read-only for now &mdash; sending messages to your hunter
                arrives in a later phase.
              </p>
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
