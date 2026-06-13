import { getMessageThreads, getThreadMessages } from "@/lib/requests/queries";
import { MessagesView } from "./messages-view";

export const metadata = { title: "Messages — Finders Keepers" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  const { request } = await searchParams;
  const threads = await getMessageThreads();
  const requested = request && threads.some((t) => t.requestId === request)
    ? request
    : null;
  const activeId = requested ?? threads[0]?.requestId ?? null;
  const messages = activeId ? await getThreadMessages(activeId) : [];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-10 py-10">
      <header className="mb-6">
        <h1 className="font-sans text-2xl font-medium tracking-tight sm:text-3xl">
          Messages
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your hunter&rsquo;s updates, one thread per hunt.
        </p>
      </header>
      <MessagesView threads={threads} activeId={activeId} messages={messages} />
    </div>
  );
}
