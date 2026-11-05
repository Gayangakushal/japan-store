/** Public browser configuration for the selected KUMO backend. RLS protects writes. */
export const defaultSupabaseProject = {
  url: "https://bawvmryvyddlxuikiarb.supabase.co",
  publishableKey: "sb_publishable_bD7MPWpWdRHQfm1teaBK6Q_jMDRJWB6",
} as const;

export function resolvePublicSupabaseConfig(overrides: { url?: string | undefined; publishableKey?: string | undefined } = {}) {
  const url = overrides.url?.trim();
  const publishableKey = overrides.publishableKey?.trim();
  if (!url && !publishableKey) return defaultSupabaseProject;
  if (!url || !publishableKey) throw new Error("Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or remove both to use the configured KUMO project.");
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Supabase URL must use HTTP or HTTPS.');
  if (publishableKey.startsWith('sb_secret_')) throw new Error('Use a Supabase publishable key in browser configuration, never a secret key.');
  return { url: url.replace(/\/+$/, ''), publishableKey };
}
