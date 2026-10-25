"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

// Must match the roles defined in server/src/authz/roles.ts
export type Role = "student" | "teacher" | "admin";

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export const ROLE_LABELS: Record<Role, string> = {
  student: "ผู้เรียน",
  teacher: "ผู้สอน / วิปัสสนาจารย์",
  admin: "ผู้ดูแลระบบ",
};

// Loads the logged-in account from /api/auth/me. The server is the source of truth for the role.
// Use this to hide menus and show the right screen. The API still checks permissions on every call.
export function useCurrentUser(): { user: CurrentUser | null; loading: boolean } {
  const [state, setState] = useState<{ user: CurrentUser | null; loading: boolean }>({ user: null, loading: true });

  useEffect(() => {
    let active = true;
    apiGet<{ user: CurrentUser }>("/auth/me").then((res) => {
      if (active) setState({ user: res.ok ? res.data.user : null, loading: false });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
