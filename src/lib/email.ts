export const SFIT_EMAIL_DOMAINS = ["student.sfit.ac.in", "sfit.ac.in"] as const;

export const SFIT_EMAIL_HINT = "Use your @student.sfit.ac.in or @sfit.ac.in Google account.";

export function isAllowedSfitEmail(email: string | null | undefined) {
  if (!email) return false;

  const trimmed = email.trim().toLowerCase();
  const parts = trimmed.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  const domain = parts[1];
  return domain === "student.sfit.ac.in" || domain === "sfit.ac.in";
}

export function sfitEmailError(email?: string | null) {
  if (!email) {
    return "Sign in with an SFIT Google account.";
  }

  return "Only SFIT emails (@student.sfit.ac.in or @sfit.ac.in) can use CampusFind.";
}
