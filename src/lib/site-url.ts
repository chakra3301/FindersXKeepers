const DEFAULT_SITE_URL = "http://localhost:3000";

/** Public site origin for metadata, emails, and Stripe redirects. */
export function siteUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  let url = (env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(
    /\/+$/,
    "",
  );
  if (!/^https?:\/\//i.test(url)) {
    url = /localhost|127\.0\.0\.1/.test(url) ? `http://${url}` : `https://${url}`;
  }
  return url;
}
