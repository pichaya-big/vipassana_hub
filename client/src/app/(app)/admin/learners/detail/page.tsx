"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import { describeLesson, formatDate, type LearnerProgressDetail, type LessonProgressRow } from "@/lib/learner-progress";
import { TRACK_LABELS, type Track } from "@/lib/lessons";

const STATUS_STYLE: Record<LessonProgressRow["status"], { color: string; background: string }> = {
  "ผ่านแล้ว": { color: "var(--primary)", background: "var(--primary-soft)" },
  "รอสอบหลังเรียน": { color: "var(--secondary)", background: "var(--secondary-bg)" },
  "กำลังเรียน": { color: "var(--secondary)", background: "var(--secondary-bg)" },
  "ทำก่อนเรียนแล้ว": { color: "var(--text-2)", background: "var(--surface-alt)" },
  "ยังไม่เริ่ม": { color: "var(--text-muted)", background: "var(--surface-alt)" },
};

function LessonRow({ row }: { row: LessonProgressRow }) {
  return (
    <li className="card" style={{ background: "var(--surface-alt)", border: "none", padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <strong style={{ overflowWrap: "anywhere" }}>
          {row.order}. {row.title}
        </strong>
        <span className="chip" style={{ ...STATUS_STYLE[row.status], whiteSpace: "nowrap" }}>
          {row.status}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <div className="progress" style={{ flex: 1 }}>
          <span style={{ width: `${row.percent}%` }} />
        </div>
        <span style={{ fontWeight: 700, minWidth: 48, textAlign: "right" }}>{row.percent}%</span>
      </div>
      <p className="hint">{describeLesson(row)}</p>
    </li>
  );
}

function TrackCard({ track, rows }: { track: Track; rows: LessonProgressRow[] }) {
  const passed = rows.filter((r) => r.passed).length;
  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }} aria-labelledby={`track-${track}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
        <h2 id={`track-${track}`}>{TRACK_LABELS[track]}</h2>
        <span className="chip">
          ผ่านแล้ว {passed} / {rows.length} บท
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="hint">ยังไม่มีบทที่เผยแพร่ในรูปแบบนี้</p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {rows.map((r) => (
            <LessonRow key={r.lessonId} row={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LearnerDetail() {
  const learnerId = useSearchParams().get("id");
  const { user, loading } = useCurrentUser();
  const [data, setData] = useState<LearnerProgressDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!learnerId || !user || user.role === "student") return;
    void apiGet<LearnerProgressDetail>(`/learners/${learnerId}/progress`).then((res) => {
      if (res.ok) {
        setData(res.data);
        setError("");
      } else {
        setError(res.data.message ?? "โหลดข้อมูลผู้เรียนไม่สำเร็จ");
      }
    });
  }, [learnerId, user]);

  if (loading) return <main className="content">กำลังโหลด...</main>;
  if (!user || user.role === "student") {
    return (
      <main className="content">
        <section className="card">
          <h2>ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
          <p style={{ marginTop: "0.5rem" }}>หน้านี้สงวนไว้สำหรับผู้สอนและผู้ดูแลระบบ</p>
        </section>
      </main>
    );
  }
  if (!learnerId) {
    return (
      <main className="content">
        <p>ไม่พบผู้เรียนที่ต้องการ</p>
      </main>
    );
  }

  return (
    <main className="content" aria-labelledby="learner-title">
      <div>
        <Link href="/admin" className="hint" style={{ color: "var(--primary)", fontWeight: 600 }}>
          ← กลับไปแดชบอร์ด
        </Link>
        <h1 id="learner-title" style={{ marginTop: "0.5rem" }}>
          {data ? `${data.learner.firstName} ${data.learner.lastName}` : "ความคืบหน้าของผู้เรียน"}
        </h1>
      </div>

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {!data && !error && <p className="hint">กำลังโหลด...</p>}

      {data && (
        <>
          <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }} aria-label="สรุป">
            <div className="grid-12" style={{ alignItems: "center" }}>
              <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span className="hint">ระดับการศึกษา: {data.learner.educationLevel}</span>
                <span className="hint">
                  เคยปฏิบัติวิปัสสนา: {data.learner.hasPracticed ? "เคย" : "ยังไม่เคย"}
                </span>
                <span className="hint">เรียนล่าสุด: {formatDate(data.learner.lastActiveAt)}</span>
              </div>
              <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span className="stat-label">ความคืบหน้ารวม</span>
                <span className="stat-value">{data.summary.percent}%</span>
                <div className="progress">
                  <span style={{ width: `${data.summary.percent}%` }} />
                </div>
                <span className="hint">ผ่านแล้ว {data.summary.lessonsPassed} / {data.summary.lessonsTotal} บท</span>
              </div>
            </div>
          </section>

          <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }} aria-labelledby="exam-title">
            <h2 id="exam-title">แบบทดสอบรวม</h2>
            <p>
              {data.finalExam.attempts === 0
                ? "ยังไม่เคยทำแบบทดสอบรวม"
                : `ทำแล้ว ${data.finalExam.attempts} ครั้ง คะแนนสูงสุด ${data.finalExam.bestScore}% ${data.finalExam.passed ? "(ผ่านแล้ว)" : "(ยังไม่ผ่าน)"}`}
            </p>
          </section>

          <div className="grid-12">
            <div style={{ gridColumn: "span 6" }}>
              <TrackCard track="reading" rows={data.tracks.reading} />
            </div>
            <div style={{ gridColumn: "span 6" }}>
              <TrackCard track="video" rows={data.tracks.video} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default function LearnerDetailPage() {
  return (
    <Suspense fallback={<main className="content">กำลังโหลด...</main>}>
      <LearnerDetail />
    </Suspense>
  );
}
