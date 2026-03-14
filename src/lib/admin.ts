import "server-only";

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminEmailAllowlist(): string[] {
  return parseCsv(process.env.ADMIN_EMAILS);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }

  const allowlist = getAdminEmailAllowlist();
  if (allowlist.length === 0) {
    return false;
  }

  return allowlist.includes(email.toLowerCase());
}
