"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiPost } from "@/lib/api";

const EDUCATION_LEVELS = [
  "ประถมศึกษา",
  "มัธยมศึกษาตอนต้น",
  "มัธยมศึกษาตอนปลาย / ปวช.",
  "ปวส. / อนุปริญญา",
  "ปริญญาตรี",
  "ปริญญาโท",
  "ปริญญาเอก",
  "อื่น ๆ",
];

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  educationLevel: string;
  hasPracticed: boolean | null;
  experienceDetail: string;
  password: string;
  confirm: string;
  pdpaConsent: boolean;
}

const INITIAL: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  educationLevel: "",
  hasPracticed: null,
  experienceDetail: "",
  password: "",
  confirm: "",
  pdpaConsent: false,
};

// Shows the server's message for one field, if there is one
function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="error-text" role="alert">
      {message}
    </p>
  ) : null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear the error as soon as the person edits that field
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    // Only the confirmation is checked here. Everything else is validated by the server.
    if (values.password !== values.confirm) {
      setFieldErrors({ confirm: "รหัสผ่านยืนยันไม่ตรงกัน" });
      return;
    }

    setSubmitting(true);
    const { password: _pw, confirm: _cf, ...payload } = values;
    const res = await apiPost<{ user?: unknown }>("/auth/register", { ...payload, password: values.password });
    setSubmitting(false);

    if (res.ok) {
      router.push("/dashboard");
      return;
    }
    setFieldErrors(res.data.fields ?? {});
    setFormError(res.data.message ?? "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่");
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
        <ThemeToggle />
      </header>

      <main className="auth-wrap">
        <div className="auth-card" style={{ maxWidth: 1040 }}>
          <aside className="auth-aside">
            <div>
              <span className="chip" style={{ background: "rgba(255,255,255,0.12)", color: "#e8f3ed" }}>
                สติปัฏฐาน ๔ · Four Foundations of Mindfulness
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontSize: "1.9rem", lineHeight: 1.4 }}>เริ่มต้นเส้นทางแห่งสติและการเจริญปัญญา</h2>
              <p>การศึกษาและปฏิบัติวิปัสสนากัมมัฏฐาน ตามแนวทางพระไตรปิฎก เพื่อพัฒนาความตื่นรู้และความผ่อนคลายแห่งจิต</p>
            </div>
            <div className="pillars">
              <div className="pillar">
                <strong>๐๑ · กาย</strong>
                <small>กายานุปัสสนา</small>
              </div>
              <div className="pillar">
                <strong>๐๒ · เวทนา</strong>
                <small>เวทนานุปัสสนา</small>
              </div>
              <div className="pillar">
                <strong>๐๓ · จิต</strong>
                <small>จิตตานุปัสสนา</small>
              </div>
              <div className="pillar">
                <strong>๐๔ · ธรรม</strong>
                <small>ธัมมานุปัสสนา</small>
              </div>
            </div>
          </aside>

          <section className="auth-main" aria-labelledby="register-title">
            <div>
              <span className="chip">ระบบสื่อบทเรียนออนไลน์เพื่อการศึกษาและปฏิบัติธรรม</span>
            </div>
            <div>
              <h1 id="register-title">ลงทะเบียนผู้เรียนใหม่</h1>
              <p style={{ marginTop: "0.4rem" }}>กรอกข้อมูลเพื่อสร้างบัญชี บันทึกชั่วโมงการเจริญสติ และเข้าสู่คลังบทเรียน</p>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="firstName">ชื่อ</label>
                  <input
                    id="firstName"
                    className="input"
                    autoComplete="given-name"
                    placeholder="เช่น สมิตรา"
                    value={values.firstName}
                    aria-invalid={!!fieldErrors.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                  />
                  <FieldError message={fieldErrors.firstName} />
                </div>
                <div className="field">
                  <label htmlFor="lastName">นามสกุล</label>
                  <input
                    id="lastName"
                    className="input"
                    autoComplete="family-name"
                    placeholder="เช่น บุญมั่น"
                    value={values.lastName}
                    aria-invalid={!!fieldErrors.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                  />
                  <FieldError message={fieldErrors.lastName} />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="email">อีเมล</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={values.email}
                    aria-invalid={!!fieldErrors.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                  <FieldError message={fieldErrors.email} />
                </div>
                <div className="field">
                  <label htmlFor="phone">เบอร์โทรศัพท์</label>
                  <input
                    id="phone"
                    type="tel"
                    className="input"
                    autoComplete="tel"
                    placeholder="0812345678"
                    value={values.phone}
                    aria-invalid={!!fieldErrors.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                  <FieldError message={fieldErrors.phone} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="educationLevel">ระดับการศึกษาสูงสุด</label>
                <select
                  id="educationLevel"
                  className="input"
                  value={values.educationLevel}
                  aria-invalid={!!fieldErrors.educationLevel}
                  onChange={(e) => set("educationLevel", e.target.value)}
                >
                  <option value="">-- เลือกระดับการศึกษา --</option>
                  {EDUCATION_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.educationLevel} />
              </div>

              <fieldset style={{ border: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <legend style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.4rem" }}>
                  เคยปฏิบัติวิปัสสนากรรมฐานมาก่อนหรือไม่?
                </legend>
                <div role="radiogroup" className="choice-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={values.hasPracticed === true}
                    className="choice"
                    onClick={() => set("hasPracticed", true)}
                  >
                    เคยปฏิบัติ
                    <small>เคยเข้าอบรมหรือปฏิบัติเป็นประจำ</small>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={values.hasPracticed === false}
                    className="choice"
                    onClick={() => set("hasPracticed", false)}
                  >
                    ยังไม่เคย
                    <small>เริ่มต้นศึกษาเป็นครั้งแรก</small>
                  </button>
                </div>
                <FieldError message={fieldErrors.hasPracticed} />
                {values.hasPracticed === true && (
                  <div className="field" style={{ marginTop: "0.4rem" }}>
                    <label htmlFor="experienceDetail">ระบุประสบการณ์ (ไม่บังคับ)</label>
                    <textarea
                      id="experienceDetail"
                      className="input"
                      rows={3}
                      placeholder="เช่น เคยเข้าคอร์สอานาปานสติ ๑๐ วัน ที่วัด..."
                      value={values.experienceDetail}
                      onChange={(e) => set("experienceDetail", e.target.value)}
                      style={{ resize: "vertical" }}
                    />
                    <FieldError message={fieldErrors.experienceDetail} />
                  </div>
                )}
              </fieldset>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="password">รหัสผ่าน</label>
                  <input
                    id="password"
                    type="password"
                    className="input"
                    autoComplete="new-password"
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    value={values.password}
                    aria-invalid={!!fieldErrors.password}
                    onChange={(e) => set("password", e.target.value)}
                  />
                  <FieldError message={fieldErrors.password} />
                </div>
                <div className="field">
                  <label htmlFor="confirm">ยืนยันรหัสผ่าน</label>
                  <input
                    id="confirm"
                    type="password"
                    className="input"
                    autoComplete="new-password"
                    placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                    value={values.confirm}
                    aria-invalid={!!fieldErrors.confirm}
                    onChange={(e) => set("confirm", e.target.value)}
                  />
                  <FieldError message={fieldErrors.confirm} />
                </div>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.9rem", color: "var(--text-2)" }}>
                  <input
                    type="checkbox"
                    checked={values.pdpaConsent}
                    onChange={(e) => set("pdpaConsent", e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 4, accentColor: "var(--primary)" }}
                  />
                  <span>
                    ข้าพเจ้ายินยอมให้เก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลข้างต้นเพื่อการลงทะเบียนและการศึกษาตาม{" "}
                    <Link href="/pdpa" target="_blank" style={{ color: "var(--primary)", fontWeight: 600 }}>
                      นโยบายความเป็นส่วนตัว (PDPA)
                    </Link>
                  </span>
                </label>
                <FieldError message={fieldErrors.pdpaConsent} />
              </div>

              {formError && (
                <p role="alert" className="error-text">
                  {formError}
                </p>
              )}

              <button type="submit" className="btn btn-primary btn-block" style={{ minHeight: 52 }} disabled={submitting}>
                {submitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชีและเริ่มต้นการเรียนรู้ →"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: "0.92rem" }}>
              มีบัญชีผู้ใช้งานอยู่แล้วใช่หรือไม่?{" "}
              <Link href="/login" style={{ color: "var(--secondary)", fontWeight: 700 }}>
                เข้าสู่ระบบ
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
