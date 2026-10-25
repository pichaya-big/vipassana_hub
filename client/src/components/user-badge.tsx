"use client";

import { ROLE_LABELS, useCurrentUser } from "@/lib/current-user";

// Shows the logged-in name and role in the top bar
export function UserBadge() {
  const { user, loading } = useCurrentUser();

  if (loading) return <span className="hint">กำลังโหลด...</span>;
  if (!user) return null;

  return (
    <div style={{ textAlign: "right", lineHeight: 1.3 }}>
      <strong style={{ fontSize: "0.9rem", color: "var(--text)" }}>
        {user.firstName} {user.lastName}
      </strong>
      <br />
      <small style={{ color: "var(--text-muted)" }}>{ROLE_LABELS[user.role]}</small>
    </div>
  );
}
