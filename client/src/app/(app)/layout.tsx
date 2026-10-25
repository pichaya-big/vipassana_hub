import { Brand } from "@/components/brand";
import { MobileNav, SidebarNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/logout-button";
import { UserBadge } from "@/components/user-badge";
import { ThemeToggle } from "@/components/theme-toggle";

// Shared shell for every signed-in page: sidebar on desktop, bottom bar on mobile
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        <SidebarNav />
        <div className="card" style={{ marginTop: "auto", padding: "1rem" }}>
          <span className="chip chip-amber">วันนี้</span>
          <p style={{ fontSize: "0.88rem", marginTop: "0.6rem" }}>
            ธรรมะประจำวัน: สติคือเครื่องมือที่ทำให้เรารู้ตามความเป็นจริง
          </p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <Brand />
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <UserBadge />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        {children}
      </div>

      <MobileNav />
    </div>
  );
}
