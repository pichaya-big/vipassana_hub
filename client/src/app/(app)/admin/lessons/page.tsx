"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import { STATUS_LABELS, TRACK_LABELS, type LessonAdmin, type Track } from "@/lib/lessons";

const TRACKS: Track[] = ["reading", "video"];

export default function LessonListPage() {
  const { user, loading } = useCurrentUser();
  const [lessons, setLessons] = useState<LessonAdmin[]>([]);
  const [error, setError] = useState("");
  const canManage = !!user && user.role !== "student";

  useEffect(() => {
    if (!canManage) return;
    void apiGet<{ lessons: LessonAdmin[] }>("/admin/lessons").then((res) => {
      if (res.ok) setLessons(res.data.lessons);
      else setError(res.data.message ?? "โหลดรายการบทเรียนไม่สำเร็จ");
    });
  }, [canManage]);

  if (loading) return <main className="content">กำลังโหลด...</main>;
  if (!canManage) {
    return (
      <main className="content">
        <section className="card">
          <h2>ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
          <p style={{ marginTop: "0.5rem" }}>หน้านี้สงวนไว้สำหรับผู้สอนและผู้ดูแลระบบ</p>
        </section>
      </main>
    );
  }

  return (
    <main className="content" aria-labelledby="lessons-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <span className="chip">จัดการบทเรียน</span>
          <h1 id="lessons-title" style={{ marginTop: "0.6rem" }}>
            บทเรียนทั้งหมด
          </h1>
          <p className="hint" style={{ marginTop: "0.4rem" }}>
            แต่ละรูปแบบเริ่มจากลำดับที่ 1 และเพิ่มได้ไม่จำกัด ผู้สอนเผยแพร่ได้เฉพาะบทที่ตัวเองสร้าง
          </p>
        </div>
        <Link href="/admin/lessons/editor" className="btn btn-primary">
          + เพิ่มบทเรียนใหม่
        </Link>
      </div>

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}

      {TRACKS.map((track) => {
        const inTrack = lessons.filter((l) => l.track === track).sort((a, b) => a.order - b.order);
        return (
          <section key={track} className="card" aria-labelledby={`track-${track}`}>
            <h2 id={`track-${track}`} style={{ marginBottom: "1rem" }}>
              {TRACK_LABELS[track]}
            </h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">ลำดับ</th>
                    <th scope="col">ชื่อบทเรียน</th>
                    <th scope="col">สถานะ</th>
                    <th scope="col">แก้ไขล่าสุด</th>
                    <th scope="col">
                      <span className="sr-only">การจัดการ</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inTrack.length === 0 && (
                    <tr>
                      <td colSpan={5} className="hint">
                        ยังไม่มีบทเรียนในรูปแบบนี้
                      </td>
                    </tr>
                  )}
                  {inTrack.map((l) => (
                    <tr key={l.id}>
                      <td>{l.order}</td>
                      <td>{l.title}</td>
                      <td>
                        <span className="chip" style={l.status === "published" ? undefined : { background: "var(--surface-alt)", color: "var(--text-muted)" }}>
                          {STATUS_LABELS[l.status]}
                        </span>
                      </td>
                      <td>{new Date(l.updatedAt).toLocaleString("th-TH")}</td>
                      <td>
                        <Link href={`/admin/lessons/editor?id=${l.id}`} className="btn btn-ghost" style={{ minHeight: 36, padding: "0.3rem 0.9rem" }}>
                          แก้ไข
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </main>
  );
}
