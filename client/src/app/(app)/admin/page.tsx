"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { ROLE_LABELS, useCurrentUser, type Role } from "@/lib/current-user";
import { formatDate, type LearnerRow } from "@/lib/learner-progress";


interface AdminUserView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  createdAt: string;
}

const ROLE_OPTIONS: Role[] = ["student", "teacher", "admin"];

export default function AdminPage() {
  const { user, loading } = useCurrentUser();
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [error, setError] = useState("");

  const canSeeLearners = user?.role === "teacher" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const loadData = useCallback(async () => {
    setError("");
    if (canSeeLearners) {
      const res = await apiGet<{ learners: LearnerRow[] }>("/learners");
      if (res.ok) setLearners(res.data.learners);
      else setError(res.data.message ?? "โหลดข้อมูลผู้เรียนไม่สำเร็จ");
    }
    if (isAdmin) {
      const res = await apiGet<{ users: AdminUserView[] }>("/admin/users");
      if (res.ok) setUsers(res.data.users);
      else setError(res.data.message ?? "โหลดรายชื่อผู้ใช้ไม่สำเร็จ");
    }
  }, [canSeeLearners, isAdmin]);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  async function changeRole(target: AdminUserView, role: Role) {
    setError("");
    const res = await apiPatch(`/admin/users/${target.id}/role`, { role });
    if (!res.ok) {
      setError(res.data.message ?? "เปลี่ยนบทบาทไม่สำเร็จ");
      return;
    }
    await loadData();
  }

  if (loading) {
    return (
      <main className="content">
        <p>กำลังโหลด...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="content">
        <section className="card">
          <h2>กรุณาเข้าสู่ระบบก่อน</h2>
          <p style={{ marginTop: "0.5rem" }}>
            <Link href="/login" style={{ color: "var(--secondary)", fontWeight: 700 }}>
              ไปหน้าเข้าสู่ระบบ
            </Link>
          </p>
        </section>
      </main>
    );
  }

  if (!canSeeLearners) {
    return (
      <main className="content">
        <section className="card">
          <h2>ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
          <p style={{ marginTop: "0.5rem" }}>หน้านี้สงวนไว้สำหรับผู้สอนและผู้ดูแลระบบ</p>
        </section>
      </main>
    );
  }

  const teacherCount = users.filter((u) => u.role === "teacher").length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <main className="content" aria-labelledby="admin-title">
      <div>
        <span className="chip">{ROLE_LABELS[user.role]}</span>
        <h1 id="admin-title" style={{ marginTop: "0.6rem" }}>
          {isAdmin ? "แดชบอร์ดผู้ดูแลระบบ" : "แดชบอร์ดผู้สอน"}
        </h1>
        {isAdmin || user.role === "teacher" ? (
          <Link href="/admin/lessons" className="btn btn-primary" style={{ marginTop: "0.8rem", alignSelf: "flex-start" }}>
            จัดการบทเรียน →
          </Link>
        ) : null}
        <p className="hint" style={{ marginTop: "0.4rem" }}>
          ติดตามความก้าวหน้าของผู้เรียน{isAdmin ? " และจัดการบทบาทของผู้ใช้" : ""}
        </p>
      </div>

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}

      <section className="grid-12" aria-label="ตัวชี้วัดหลัก">
        <div className="card" style={{ gridColumn: "span 4" }}>
          <div className="stat">
            <span className="stat-label">ผู้เรียนทั้งหมด</span>
            <span className="stat-value">{learners.length}</span>
          </div>
        </div>
        {isAdmin && (
          <>
            <div className="card" style={{ gridColumn: "span 4" }}>
              <div className="stat">
                <span className="stat-label">ผู้สอน</span>
                <span className="stat-value">{teacherCount}</span>
              </div>
            </div>
            <div className="card" style={{ gridColumn: "span 4" }}>
              <div className="stat">
                <span className="stat-label">ผู้ดูแลระบบ</span>
                <span className="stat-value">{adminCount}</span>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="learners-title">
        <h2 id="learners-title" style={{ marginBottom: "1rem" }}>
          รายชื่อผู้เรียน
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">ชื่อ-นามสกุล</th>
                <th scope="col">ระดับการศึกษา</th>
                <th scope="col">ผ่านแล้ว</th>
                <th scope="col">ความคืบหน้า</th>
                <th scope="col">เรียนล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {learners.length === 0 && (
                <tr>
                  <td colSpan={5} className="hint">
                    ยังไม่มีผู้เรียน
                  </td>
                </tr>
              )}
              {learners.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link href={`/admin/learners/detail?id=${l.id}`} style={{ color: "var(--primary)", fontWeight: 600 }}>
                      {l.firstName} {l.lastName}
                    </Link>
                  </td>
                  <td>{l.educationLevel}</td>
                  <td>
                    {l.lessonsPassed} / {l.lessonsTotal} บท
                  </td>
                  <td style={{ minWidth: 150 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div className="progress" style={{ flex: 1 }}>
                        <span style={{ width: `${l.percent}%` }} />
                      </div>
                      <span style={{ fontSize: "0.85rem", minWidth: 40 }}>{l.percent}%</span>
                    </div>
                  </td>
                  <td>{formatDate(l.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin && (
        <section className="card" aria-labelledby="users-title">
          <h2 id="users-title" style={{ marginBottom: "1rem" }}>
            จัดการบทบาทผู้ใช้
          </h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">ชื่อ-นามสกุล</th>
                  <th scope="col">อีเมล</th>
                  <th scope="col">บทบาท</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.firstName} {u.lastName}
                      {u.id === user.id && <span className="hint"> (คุณ)</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="input"
                        style={{ minHeight: 40, maxWidth: 220 }}
                        aria-label={`บทบาทของ ${u.firstName} ${u.lastName}`}
                        value={u.role}
                        disabled={u.id === user.id}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
