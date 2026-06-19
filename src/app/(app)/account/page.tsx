import { Info, CreditCard } from "lucide-react";
import { getProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { shippingCountryLabel } from "@/lib/profile/countries";
import { listAddresses } from "@/lib/addresses/queries";
import { AccountSettingsForm } from "@/components/account/account-settings-form";
import { AvatarUploader } from "@/components/account/avatar-uploader";
import { AddressBook } from "@/components/account/address-book";
import { NotificationsForm } from "@/components/account/notifications-form";

export const metadata = { title: "Account — Finders Keepers" };

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-5">
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

export default async function AccountPage() {
  // requireUser may redirect — keep it OUTSIDE the diagnostic try so the redirect propagates.
  const user = await requireUser();
  try {
    return await renderAccount(user);
  } catch (e) {
    // TEMP diagnostic: surface the real error on the page (prod hides it otherwise).
    const msg = e instanceof Error ? `${e.name}: ${e.message}\n\n${e.stack ?? ""}` : String(e);
    console.error("[AccountPage]", msg);
    return (
      <div className="mx-auto w-full max-w-[680px]">
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">Account debug</h1>
        <pre className="overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-[12px] whitespace-pre-wrap text-destructive">
          {msg}
        </pre>
      </div>
    );
  }
}

async function renderAccount(
  user: NonNullable<Awaited<ReturnType<typeof requireUser>>>,
) {
  const profile = await getProfile();
  const supabase = await createClient();
  const addresses = await listAddresses(user.id, supabase);
  const avatarInitial = (user.email ?? "?").charAt(0).toUpperCase();
  const avatarDisplayUrl = resolveAvatarUrl(profile?.avatar_url);

  const currencyPref = profile?.currency_pref ?? "USD";
  const shippingCountry = profile?.shipping_country ?? null;
  const notificationPrefs = {
    notify_action_needed: profile?.notify_action_needed ?? true,
    notify_messages: profile?.notify_messages ?? true,
    notify_shipped: profile?.notify_shipped ?? true,
  };

  return (
    <div className="mx-auto w-full max-w-[680px]">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Account &amp; settings
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Manage your profile, shipping, display currency, and notifications.
        Saved cards open with real checkout in a later phase.
      </p>

      <div className="flex flex-col gap-4">
        <Section title="Profile">
          <AvatarUploader
            userId={user.id}
            avatarUrl={avatarDisplayUrl}
            initial={avatarInitial}
          />
        </Section>

        <Section title="Account">
          <Row label="Email" value={user.email ?? "—"} last />
        </Section>

        <Section title="Shipping &amp; currency">
          <AccountSettingsForm
            shippingCountry={shippingCountry}
            currencyPref={currencyPref}
          />
          <div className="mt-4 flex items-start gap-2 border-t border-border/60 pt-3 text-[12.5px] text-muted-foreground">
            <Info className="mt-px size-[15px] shrink-0 text-primary" />
            <span>
              Currently saved as{" "}
              <span className="text-foreground">
                {shippingCountryLabel(shippingCountry)}
              </span>{" "}
              · display {currencyPref}.
            </span>
          </div>
        </Section>

        <Section title="Shipping addresses">
          <AddressBook addresses={addresses} />
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
          <NotificationsForm prefs={notificationPrefs} />
        </Section>
      </div>
    </div>
  );
}
