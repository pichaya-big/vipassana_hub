"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { allUnits, nextUnit, type Courses } from "@/lib/courses";
import { remainingLessons, TRACK_NAME, type CourseProgress } from "@/lib/course-progress";
import { TRACK_LABELS, type Track } from "@/lib/lessons";
import { useCurrentUser } from "@/lib/current-user";

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [courses, setCourses] = useState<Courses | null>(null);
  const [course, setCourse] = useState<CourseProgress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void apiGet<Courses>("/courses").then((res) => {
      if (res.ok) setCourses(res.data);
      else setError(res.data.message ?? "โหลดข้อมูลไม่สำเร็จ");
    });
    void apiGet<CourseProgress>("/course").then((res) => {
      if (res.ok) setCourse(res.data);
    });
  }, []);

  const units = courses ? allUnits(courses) : [];
  const passed = units.filter((u) => u.progress.passed).length;
  const next = courses ? nextUnit(courses) : null;
  const left = course ? remainingLessons(course) : null;

  return (
    <main className="content" aria-labelledby="dash-title">
      <section className="card card-hero hero-dark" style={{ padding: "2rem" }}>
        <div className="grid-12" style={{ alignItems: "center" }}>
          <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <span className="chip" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", alignSelf: "flex-start" }}>
              หลักสูตรสติปัฏฐาน ๔ ออนไลน์
            </span>
            <h1 id="dash-title" style={{ color: "#fff" }}>
              ยินดีต้อนรับ{user ? `, ${user.firstName}` : ""}
            </h1>
            <p>เรียนให้ครบทั้งเนื้อหาและวิดีโอ แต่ละบทต้องทำแบบทดสอบก่อนเรียนและผ่านแบบทดสอบหลังเรียนก่อนไปบทถัดไป</p>
          </div>
          <div style={{ gridColumn: "span 5" }}>
            <div className="card" style={{ background: "var(--surface)", border: "none", color: "var(--text)" }}>
              <span className="chip chip-amber">เรียนต่อ</span>
              {!courses && !error && <p className="hint" style={{ marginTop: "0.6rem" }}>กำลังโหลด...</p>}
              {courses && !next && <h3 style={{ marginTop: "0.6rem", color: "var(--primary-deep)" }}>ยังไม่มีบทที่เปิดให้เรียน</h3>}
              {next && (
                <>
                  <h3 style={{ marginTop: "0.6rem", color: "var(--primary-deep)" }}>{next.title}</h3>
                  <p className="hint" style={{ marginBottom: "0.8rem", color: "var(--text-muted)" }}>
                    บทที่ {next.order}
                  </p>
                  <Link href={`/lesson/view?id=${next.id}`} className="btn btn-primary btn-block">
                    เรียนต่อ ▶
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}

      {/* What to do to finish the course */}
      <section className="card" aria-labelledby="steps-title" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        <div>
          <h2 id="steps-title">ขั้นตอนการจบหลักสูตร</h2>
          <p className="hint">เรียนให้ผ่านทุกบทในทั้งสองรูปแบบ แล้วทำแบบทดสอบรวม</p>
        </div>
        <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <li>
            <strong>1. เรียนให้ผ่านทุกบท</strong>
            <p className="hint">
              {left === null ? "กำลังโหลด..." : left === 0 ? "เรียนผ่านครบทุกบทแล้ว" : `ยังเหลืออีก ${left} บท`}
            </p>
          </li>
          {course?.tracks.map((t) => (
            <li key={t.track} className="hint" style={{ paddingLeft: "1.2rem" }}>
              {TRACK_NAME[t.track]}: ผ่านแล้ว {t.passed} จาก {t.total} บท
            </li>
          ))}
          <li>
            <strong>2. แบบทดสอบรวม</strong>
            <p className="hint">
              {!course
                ? "กำลังโหลด..."
                : course.finalExam.passed
                  ? `สอบผ่านแล้ว คะแนนดีที่สุด ${course.finalExam.bestScore}%`
                  : course.finalExam.unlocked
                    ? `เปิดแล้ว ต้องได้อย่างน้อย ${course.finalExam.passingScore}%`
                    : "จะเปิดเมื่อเรียนผ่านครบทุกบท"}
            </p>
            {course?.finalExam.unlocked && !course.finalExam.passed && (
              <Link href="/final-exam" className="btn btn-primary" style={{ marginTop: "0.5rem", alignSelf: "flex-start" }}>
                เริ่มทำแบบทดสอบรวม
              </Link>
            )}
          </li>
          <li>
            <strong>3. ใบประกาศนียบัตร</strong>
            <p className="hint">จะเปิดให้ใช้งานในภายหลัง</p>
          </li>
        </ol>
      </section>

      <section className="grid-12" aria-label="สถิติ">
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="stat">
            <span className="stat-label">บทที่ผ่านแล้ว</span>
            <span className="stat-value">
              {passed} / {units.length}
            </span>
          </div>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }} aria-labelledby="tracks-title">
        <div>
          <h2 id="tracks-title">ความก้าวหน้าแยกตามรูปแบบ</h2>
          <p className="hint">แต่ละรูปแบบนับความก้าวหน้าแยกกัน</p>
        </div>
        <div className="grid-12">
          {(["reading", "video"] as Track[]).map((track) => {
            const list = courses?.tracks[track] ?? [];
            const done = list.filter((u) => u.progress.passed).length;
            const percent = list.length ? Math.round((done / list.length) * 100) : 0;
            return (
              <article key={track} className="card" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                <h3>{TRACK_LABELS[track]}</h3>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    <span>{list.length === 0 ? "ยังไม่มีบทเรียน" : `ผ่านแล้ว ${done} จาก ${list.length} บท`}</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <div>
                  <Link href="/lesson" className="btn btn-ghost">
                    ดูบทเรียน →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
