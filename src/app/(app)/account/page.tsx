import { Info, CreditCard } from "lucide-react";
import { getProfile, requireUser } from "@/lib/auth";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

export const metadata = { title: "Account — Finders Keepers" };

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,17,21,.04)]">
      <h2 className="mb-3 text-[13px] font-[600] uppercase tracking-[.03em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 text-sm ${
        last ? "" : "border-b border-border/60"
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-[540]">{value}</span>
    </div>
  );
}

/** Read-only, decorative toggle pinned to a fixed state (no interactivity). */
function StaticToggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative inline-block h-[22px] w-[38px] rounded-full transition-colors ${
        on ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm ${
          on ? "right-[2px]" : "left-[2px]"
        }`}
      />
    </span>
  );
}

export default async function AccountPage() {
  const [user, profile] = await Promise.all([requireUser(), getProfile()]);

  const currencyPref = profile?.currency_pref ?? "JPY";
  const notifications = [
    { label: "Action needed (candidate found, item arrived)", on: true },
    { label: "Hunter updates & messages", on: true },
    { label: "Item shipped", on: true },
  ];

  return (
    <div className="mx-auto w-full max-w-[680px]">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Account &amp; settings
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Editing and saving open in a later phase — every value below is real and
        read-only for now.
      </p>

      <div className="flex flex-col gap-4">
        <Section title="Account">
          <Row label="Email" value={user.email ?? "—"} />
          <Row
            label="Shipping country"
            value={profile?.shipping_country ?? "Not set"}
          />
          <Row label="Display currency" value={currencyPref} last />
          <div className="mt-3 flex items-start gap-2 border-t border-border/60 pt-3 text-[12.5px] text-muted-foreground">
            <Info className="mt-px size-[15px] shrink-0 text-primary" />
            <span>
              Your country sets shipping options and customs estimates across
              the app.
            </span>
          </div>
        </Section>

        <Section title="Currency &amp; language">
          <label className="block text-sm">
            <span className="text-muted-foreground">Display currency</span>
            <select
              disabled
              defaultValue={currencyPref}
              aria-label="Display currency (read-only)"
              className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground disabled:opacity-100"
            >
              <option value="JPY">JPY (¥)</option>
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Local-currency amounts are indicative; you always pay in JPY.
          </p>
        </Section>

        <Section title="Payment method">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2.5 text-muted-foreground">
              <CreditCard className="size-5 text-muted-foreground/70" />
              No card connected
            </span>
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Connecting a card opens with real checkout in a later phase.
          </p>
        </Section>

        <Section title="Notifications">
          {notifications.map((n, i) => (
            <div
              key={n.label}
              className={`flex items-center justify-between py-3 text-sm ${
                i === notifications.length - 1
                  ? ""
                  : "border-b border-border/60"
              }`}
            >
              <span>{n.label}</span>
              <StaticToggle on={n.on} />
            </div>
          ))}
          <p className="mt-2 text-[12px] text-muted-foreground">
            Notification preferences are presentational — managing them comes in
            a later phase.
          </p>
        </Section>
      </div>
    </div>
  );
}
