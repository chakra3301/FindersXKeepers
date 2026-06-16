import type { Address, AddressSnapshot } from "@/lib/db/types";

export type { Address, AddressSnapshot };

/** Build the frozen request snapshot from a saved address row. */
export function addressToSnapshot(a: Address): AddressSnapshot {
  return {
    recipient_name: a.recipient_name,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    region: a.region,
    postal_code: a.postal_code,
    country: a.country,
    phone: a.phone,
  };
}
