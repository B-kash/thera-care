/** Optional clinic slug from env (matches backend default `default` when unset). */
export function defaultTenantSlugBody(): { tenantSlug?: string } {
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG?.trim();
  if (fromEnv) return { tenantSlug: fromEnv };
  return {};
}
