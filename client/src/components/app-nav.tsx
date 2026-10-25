"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser, type Role } from "@/lib/current-user";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  // Who can see this item. Undefined means every logged-in user.
  roles?: Role[];
}

const STAFF: Role[] = ["teacher", "admin"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", icon: "◧" },
  { href: "/lesson", label: "บทเรียน", icon: "▤" },
  { href: "/admin/lessons", label: "จัดการบทเรียน", icon: "✎", roles: STAFF },
  { href: "/admin", label: "แดชบอร์ดผู้สอน", icon: "⚙", roles: STAFF },
];

// While the role is still loading, show only items that do not need one
function visibleItems(role: Role | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role !== undefined && item.roles.includes(role)));
}

// The item whose path matches the current page. /admin/lessons/... also counts as "จัดการบทเรียน".
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  return (
    <nav className="nav" aria-label="เมนูหลัก">
      <span className="nav-label">เมนูหลัก</span>
      {visibleItems(user?.role).map((item) => (
        <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  return (
    <nav className="mobile-nav" aria-label="เมนูล่าง">
      {visibleItems(user?.role).map((item) => (
        <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
          <span aria-hidden="true" style={{ fontSize: "1.1rem" }}>
            {item.icon}
          </span>
          {item.label.split(" ")[0]}
        </Link>
      ))}
    </nav>
  );
}
