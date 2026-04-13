/**
 * Public self-service registration for `POST /auth/register`.
 * - `ALLOW_PUBLIC_REGISTER=true` → always allowed.
 * - `ALLOW_PUBLIC_REGISTER=false` → always forbidden.
 * - unset → allowed outside production, forbidden in production.
 */
export function isPublicRegisterAllowed(): boolean {
  const v = process.env.ALLOW_PUBLIC_REGISTER;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}
