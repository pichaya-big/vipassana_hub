"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { unitStatus, type Courses, type Unit } from "@/lib/courses";
import { plainText } from "@/lib/plain-text";
import { TRACK_LABELS, type Track } from "@/lib/lessons";

const TRACK_HINT: Record<Track, string> = {
  reading: "อ่านเนื้อหาตามลำดับ บทที่ 1, 2, 3 ...",
  video: "ดูวิดีโอตามลำดับ ตอนที่ 1, 2, 3 ...",
};

const STATUS_STYLE = {
  done: { color: "var(--primary)", background: "var(--primary-soft)" },
  active: { color: "var(--secondary)", background: "var(--secondary-bg)" },
  muted: { color: "var(--text-muted)", background: "var(--surface-alt)" },
} as const;

// One lesson in a track. Full width, number on the left, title and short summary, status on the right.
function UnitRow({ unit, locked }: { unit: Unit; locked: boolean }) {
  const status = unitStatus(unit);
  const summary = plainText(unit.summary);
  const body = (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", width: "100%" }}>
      <span
        aria-hidden="true"
        style={{
          flex: "none",
          width: 40,
          height: 40,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          color: unit.unlocked ? "var(--primary)" : "var(--text-muted)",
          background: unit.unlocked ? "var(--primary-soft)" : "var(--surface-alt)",
        }}
      >
        {unit.order}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <strong style={{ color: unit.unlocked ? "var(--text)" : "var(--text-muted)", overflowWrap: "anywhere" }}>{unit.title}</strong>
        {summary && (
          <p
            className="hint"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}
          >
            {summary}
          </p>
        )}
      </div>
      <span
        className="chip"
        style={{ ...STATUS_STYLE[status.tone], flex: "none", whiteSpace: "nowrap", alignSelf: "center" }}
      >
        {status.label}
      </span>
    </div>
  );

  const rowStyle = {
    display: "block",
    padding: "0.9rem 1rem",
    boxShadow: "none",
    opacity: locked ? 0.6 : 1,
  };

  return (
    <li>
      {locked ? (
        <div className="card" aria-disabled="true" style={rowStyle}>
          {body}
        </div>
      ) : (
        <Link href={`/lesson/view?id=${unit.id}`} className="card" style={rowStyle}>
          {body}
        </Link>
      )}
    </li>
  );
}

export default function LessonOverviewPage() {
  const [courses, setCourses] = useState<Courses | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void apiGet<Courses>("/courses").then((res) => {
      if (res.ok) setCourses(res.data);
      else setError(res.data.message ?? "โหลดบทเรียนไม่สำเร็จ");
    });
  }, []);

  return (
    <main className="content" aria-labelledby="lessons-title">
      <div>
        <span className="chip">สติปัฏฐาน ๔</span>
        <h1 id="lessons-title" style={{ marginTop: "0.6rem" }}>
          บทเรียนทั้งหมด
        </h1>
        <p className="hint" style={{ marginTop: "0.4rem" }}>
          เรียนได้สองรูปแบบพร้อมกัน แต่ละรูปแบบเริ่มจากบทที่ 1 และต้องผ่านบทก่อนหน้าก่อนจึงเปิดบทถัดไป
        </p>
      </div>

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {!courses && !error && <p className="hint">กำลังโหลด...</p>}

      {courses &&
        (["reading", "video"] as Track[]).map((track) => {
          const units = courses.tracks[track];
          const passed = units.filter((u) => u.progress.passed).length;
          return (
            <section key={track} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }} aria-labelledby={`track-${track}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <h2 id={`track-${track}`}>{TRACK_LABELS[track]}</h2>
                  <p className="hint">{TRACK_HINT[track]}</p>
                </div>
                {units.length > 0 && (
                  <span className="chip" style={{ alignSelf: "flex-start" }}>
                    ผ่านแล้ว {passed} / {units.length}
                  </span>
                )}
              </div>
              {units.length === 0 ? (
                <p className="hint">ยังไม่มีบทในรูปแบบนี้</p>
              ) : (
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {units.map((unit) => (
                    <UnitRow key={unit.id} unit={unit} locked={!unit.unlocked} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
    </main>
  );
}
