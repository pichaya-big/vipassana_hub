"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiPost } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSubmitting(true);

    const res = await apiPost<{ user?: unknown }>("/auth/login", { identifier, password });
    setSubmitting(false);

    if (res.ok) {
      router.push("/dashboard");
      return;
    }
    setFieldErrors(res.data.fields ?? {});
    setError(res.data.message ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
  }

  return (
    <div className="auth-page">
      <header className="auth-topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <BrandMark />
          </span>
          <span className="brand-name" style={{ fontSize: "1.3rem" }}>
            ภาวนาสติ
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <ThemeToggle />
          <a href="#help" className="hint" style={{ color: "var(--primary)", fontWeight: 600 }}>
            ต้องการความช่วยเหลือ?
          </a>
        </div>
      </header>

      <main className="auth-wrap">
        <div className="auth-card">
          <aside className="auth-aside">
            <div>
              <span className="chip" style={{ background: "rgba(255,255,255,0.12)", color: "#e8f3ed" }}>
                สติปัฏฐานภาวนา · มรรคาแห่งความสงบเย็น
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h2 style={{ fontSize: "1.9rem", lineHeight: 1.4 }}>
                “การเจริญสติปัฏฐาน เป็นทางสายเอกที่จะนำพาจิตใจให้รู้แจ้งเห็นจริง เกิดความสงบระงับ”
              </h2>
              <p style={{ fontSize: "0.92rem" }}>
                พระพรหมมงคล ว. (หลวงปู่ทอง สิริมงฺคโล) · อดีตเจ้าอาวาสวัดพระธาตุศรีจอมทอง
              </p>
            </div>

            <div className="pillars">
              <div className="pillar">
                <strong>กายานุปัสสนา</strong>
                <small>Kāyānupassanā</small>
              </div>
              <div className="pillar">
                <strong>เวทนานุปัสสนา</strong>
                <small>Vedanānupassanā</small>
              </div>
              <div className="pillar">
                <strong>จิตตานุปัสสนา</strong>
                <small>Cittānupassanā</small>
              </div>
              <div className="pillar">
                <strong>ธัมมานุปัสสนา</strong>
                <small>Dhammānupassanā</small>
              </div>
            </div>
          </aside>

          <section className="auth-main" aria-labelledby="login-title">
            <div>
              <span className="chip">ระบบสื่อบทเรียนออนไลน์เพื่อการศึกษาและปฏิบัติธรรม</span>
            </div>
            <div>
              <h1 id="login-title">เข้าสู่ระบบ</h1>
              <p style={{ marginTop: "0.4rem" }}>ยินดีต้อนรับกลับสู่พื้นที่แห่งการเรียนรู้และเจริญสติภาวนา</p>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="field">
                <label htmlFor="identifier">อีเมลหรือเบอร์โทรศัพท์</label>
                <input
                  id="identifier"
                  className="input"
                  autoComplete="username"
                  placeholder="เช่น 0812345678 หรือ sadhu@vipassana.org"
                  value={identifier}
                  aria-invalid={!!fieldErrors.identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
                {fieldErrors.identifier && <p className="error-text">{fieldErrors.identifier}</p>}
              </div>

              <div className="field">
                <label htmlFor="password">รหัสผ่าน</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input"
                    autoComplete="current-password"
                    placeholder="กรอกรหัสผ่านของคุณ"
                    value={password}
                    aria-invalid={!!fieldErrors.password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: "3.5rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      padding: "0.4rem 0.6rem",
                      color: "var(--text-muted)",
                      fontSize: "0.82rem",
                    }}
                  >
                    {showPassword ? "ซ่อน" : "แสดง"}
                  </button>
                </div>
                {fieldErrors.password && <p className="error-text">{fieldErrors.password}</p>}
              </div>

              {error && (
                <p role="alert" className="error-text">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-primary btn-block" style={{ minHeight: 52 }} disabled={submitting}>
                {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบเพื่อปฏิบัติภาวนา →"}
              </button>
            </form>

            <div className="divider">หรือเข้าสู่ระบบด้วยวิธีอื่น</div>

            <div className="form-row">
              <button type="button" className="btn btn-ghost btn-block" disabled title="ยังไม่เปิดใช้งาน">
                Digital ThaiD
              </button>
              <button type="button" className="btn btn-ghost btn-block" disabled title="ยังไม่เปิดใช้งาน">
                LINE ID
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: "0.92rem" }}>
              ยังไม่มีบัญชีผู้ใช้งานใช่หรือไม่?{" "}
              <Link href="/register" style={{ color: "var(--secondary)", fontWeight: 700 }}>
                สมัครสมาชิกใหม่
              </Link>
            </p>
          </section>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "1rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
        © ภาวนาสติ · Serenity in Awareness
      </footer>
    </div>
  );
}
