/**
 * Tolerant env-value reader.
 *
 * Dashboards (Vercel) make it easy to paste a whole `KEY=value` line into the
 * value box, or to leave trailing spaces / wrapping quotes. Any of those would
 * otherwise fail validation and take down the build. This normalizes:
 *   "DEEPSEEK_BASE_URL=https://x "  -> "https://x"
 *   '"sk-..."'                       -> "sk-..."
 *   ""                               -> undefined
 */
export function cleanEnvValue(
  name: string,
  raw: string | undefined,
): string | undefined {
  if (raw == null) return undefined;
  let v = raw.trim();
  if (v.startsWith(`${name}=`)) v = v.slice(name.length + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.length ? v : undefined;
}
