/** Users visible on public browse surfaces (search, charts, homepage, directory). */
export const ACTIVE_USER = {
  status: "ACTIVE" as const,
};

export type UserAccountFields = {
  status: string;
};

export function isUserActive(user: UserAccountFields): boolean {
  return user.status === ACTIVE_USER.status;
}

export function isUserStaff(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "EDITOR";
}

/** Public profile pages and artist discovery. */
export function canViewerAccessUserProfile(
  user: UserAccountFields & { id: string },
  viewer: { userId?: string | null; role?: string | null },
): boolean {
  if (isUserStaff(viewer.role)) return true;
  if (viewer.userId && viewer.userId === user.id) return true;
  return isUserActive(user);
}

export function accountInactiveMessage(status: string): string {
  if (status === "SUSPENDED") return "This account has been suspended.";
  if (status === "INVITED") return "This account is not active yet.";
  return "This account is not active.";
}
