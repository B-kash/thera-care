/** Mirrors backend `isPublicRegisterAllowed` for login/register UI. */
export function isPublicRegisterUiAllowed(): boolean {
  const v = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_REGISTER;
  if (v === "true") return true;
  if (v === "false") return false;
  return process.env.NODE_ENV !== "production";
}
