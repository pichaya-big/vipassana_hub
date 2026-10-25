// Roles and permissions in one place. Routes ask for a permission, never for a role name,
// so changing what a role can do only touches this file.
export const ROLES = ["student", "teacher", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "student";

export type Permission =
  | "learn" // study lessons and take quizzes
  | "learners:read" // see learner names and progress
  | "users:read" // see every account and its role
  | "users:manage" // change other accounts' roles
  | "content:write" // create and edit lessons and quizzes (drafts)
  | "content:publish"; // publish lessons. Teachers can only publish lessons they created; see lesson.service.ts

const PERMISSIONS: Record<Role, readonly Permission[]> = {
  student: ["learn"],
  teacher: ["learn", "learners:read", "content:write", "content:publish"],
  admin: ["learn", "learners:read", "users:read", "users:manage", "content:write", "content:publish"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

// Accounts created before roles existed have no role field. They are treated as students.
export function normalizeRole(value: unknown): Role {
  return isRole(value) ? value : DEFAULT_ROLE;
}

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}
