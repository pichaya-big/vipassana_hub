"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

// Ends the session on the server (clears the cookie), then goes to the login page.
// The final step is a full page load, not a client-side route change, so no stale state is kept.
// It always runs, even if the API call fails, so the user is never stuck on this button.
export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await apiPost("/auth/logout");
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="btn btn-ghost"
      style={{ minHeight: 40, padding: "0.4rem 1rem" }}
    >
      {busy ? "กำลังออก..." : "ออกจากระบบ"}
    </button>
  );
}
