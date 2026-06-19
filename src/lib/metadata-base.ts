import { headers } from "next/headers";
import { siteUrl } from "@/lib/site-url";

/** Origin for absolute Open Graph / Twitter URLs — matches the served host. */
export async function metadataBaseUrl(): Promise<URL> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    headersList.get("host");

  if (host && !host.startsWith("localhost")) {
    return new URL(`https://${host.replace(/\/+$/, "")}/`);
  }

  return new URL(`${siteUrl()}/`);
}
