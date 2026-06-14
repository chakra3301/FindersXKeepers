import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/dates";
import type { Message } from "@/lib/db/types";

export function MessageList({
  messages,
  perspective,
}: {
  messages: Message[];
  /** Whose messages render on the right (primary bubble). */
  perspective: "customer" | "team";
}) {
  if (messages.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-muted-foreground">
        No messages yet — start the conversation below.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {messages.map((m) => {
        const mine =
          perspective === "customer"
            ? m.sender === "customer"
            : m.sender === "team";
        return (
          <li
            key={m.id}
            className={cn(
              "max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed",
              mine
                ? "ml-auto rounded-[14px_14px_4px_14px] bg-primary text-primary-foreground"
                : "mr-auto rounded-[14px_14px_14px_4px] bg-secondary text-secondary-foreground",
            )}
          >
            {m.body}
            <div
              className={cn(
                "mt-1 text-[10.5px] tnum",
                mine ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {formatRelativeTime(m.created_at)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
