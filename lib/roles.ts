export type UserRole = 'Admin' | 'Accountant' | 'Contact';

/** Normalize any role string to a valid application role. */
export function normalizeRole(raw: string | undefined): UserRole {
  const r = (raw || '').toLowerCase().trim();
  if (r === 'admin') return 'Admin';
  if (r === 'accountant') return 'Accountant';
  if (r === 'contact' || r === 'user') return 'Contact';
  return 'Admin';
}

export function isAdmin(role: string | undefined): boolean {
  return normalizeRole(role) === 'Admin';
}

export function isStaffRole(role: string | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'Admin' || normalized === 'Accountant';
}
