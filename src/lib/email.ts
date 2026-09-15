export const SFIT_EMAIL_DOMAINS = ["student.sfit.ac.in", "sfit.ac.in"] as const;

export const SFIT_EMAIL_HINT = "Use your @student.sfit.ac.in or @sfit.ac.in Google account.";

export const SFIT_LOCK_MANAGER_EMAIL = "kencoelhoo@student.sfit.ac.in";

export function canManageSfitEmailLock(email: string | null | undefined) {
  return (email || "").trim().toLowerCase() === SFIT_LOCK_MANAGER_EMAIL;
}

let runtimeEmailLock: boolean | null = null;

export function setEmailLockCache(enabled: boolean) {
  runtimeEmailLock = enabled;
}

export function getEmailLockCache() {
  return runtimeEmailLock ?? false;
}

export function isSfitEmailDomain(email: string | null | undefined) {
  if (!email) return false;

  const trimmed = email.trim().toLowerCase();
  const parts = trimmed.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  const domain = parts[1];
  return domain === "student.sfit.ac.in" || domain === "sfit.ac.in";
}

export function isAllowedSfitEmail(email: string | null | undefined) {
  if (!getEmailLockCache()) {
    if (!email) return false;
    const trimmed = email.trim().toLowerCase();
    const parts = trimmed.split("@");
    return parts.length === 2 && Boolean(parts[0] && parts[1]);
  }
  return isSfitEmailDomain(email);
}

export function sfitEmailError(email?: string | null) {
  if (!email) {
    return "Sign in with an SFIT Google account.";
  }

  return "Only @student.sfit.ac.in or @sfit.ac.in accounts are permitted.";
}

export function extractEmailFromCredential(credential: string): string | null {
  try {
    const payloadPart = credential.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonStr);
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export function formatAuthError(error: { message?: string } | Error | string | null | undefined): string {
  if (!error) return "Could not complete sign in. Please try again.";
  const msg = typeof error === "string" ? error : error.message || "";
  const lower = msg.toLowerCase();
  if (
    lower.includes("database error saving new user") ||
    lower.includes("check_signup_email_domain") ||
    lower.includes("sfit") ||
    lower.includes("domain") ||
    lower.includes("email not allowed") ||
    lower.includes("violates") ||
    lower.includes("not authorized")
  ) {
    return "Only @student.sfit.ac.in or @sfit.ac.in accounts are permitted.";
  }
  return msg;
}
