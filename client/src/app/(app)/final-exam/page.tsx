"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { CourseProgress } from "@/lib/course-progress";

interface Question {
  stem: string;
  options: string[];
}

interface Attempt {
  attemptId: string;
  questions: Question[];
}

interface Result {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  passingScore: number;
  results: { correct: boolean; correctIndex: number; explanation: string }[];
}

const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];

export default function FinalExamPage() {
  const [course, setCourse] = useState<CourseProgress | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function loadCourse() {
    void apiGet<CourseProgress>("/course").then((res) => {
      if (res.ok) setCourse(res.data);
      else setError(res.data.message ?? "โหลดข้อมูลไม่สำเร็จ");
    });
  }

  useEffect(() => {
    loadCourse();
  }, []);

  async function start() {
    setBusy(true);
    setError("");
    setResult(null);
    const res = await apiPost<Attempt>("/final-exam");
    setBusy(false);
    if (!res.ok) {
      setError(res.data.message ?? "เริ่มแบบทดสอบไม่สำเร็จ");
      return;
    }
    setAttempt(res.data);
    setAnswers(new Array(res.data.questions.length).fill(-1));
  }

  async function submit() {
    if (!attempt) return;
    setBusy(true);
    setError("");
    const res = await apiPost<Result>(`/final-exam/${attempt.attemptId}/submit`, { answers });
    setBusy(false);
    if (!res.ok) {
      setError(res.data.message ?? "ส่งคำตอบไม่สำเร็จ");
      return;
    }
    setResult(res.data);
    setAttempt(null);
    loadCourse();
  }

  const allAnswered = attempt !== null && answers.every((a) => a >= 0);

  return (
    <main className="content" aria-labelledby="exam-title">
      <div>
        <Link href="/dashboard" className="hint" style={{ color: "var(--primary)", fontWeight: 600 }}>
          ← กลับไปหน้าหลัก
        </Link>
        <h1 id="exam-title" style={{ marginTop: "0.6rem" }}>
          แบบทดสอบรวม
        </h1>
        <p className="hint" style={{ marginTop: "0.4rem" }}>
          สุ่มข้อสอบจากทุกบท ต้องได้อย่างน้อย {course?.finalExam.passingScore ?? 70}% จึงจะผ่าน ทำซ้ำได้ถ้ายังไม่ผ่าน
        </p>
      </div>

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}

      {!course && !error && <p className="hint">กำลังโหลด...</p>}

      {course && !course.finalExam.unlocked && (
        <section className="card">
          <h2>ยังทำแบบทดสอบรวมไม่ได้</h2>
          <p style={{ marginTop: "0.5rem" }}>ต้องเรียนให้ผ่านทุกบทในทั้งสองรูปแบบก่อน</p>
        </section>
      )}

      {result && (
        <section className="card" role="status" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          <strong style={{ color: result.passed ? "var(--primary)" : "var(--danger)", fontSize: "1.1rem" }}>
            ได้ {result.score}% ({result.correct} จาก {result.total} ข้อ) {result.passed ? "ผ่านแบบทดสอบรวมแล้ว" : "ยังไม่ผ่าน"}
          </strong>
          {!result.passed && (
            <button type="button" className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={start} disabled={busy}>
              ทำแบบทดสอบใหม่
            </button>
          )}
          <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {result.results.map((r, i) => (
              <li key={i} className="card" style={{ background: "var(--surface-alt)", border: "none", padding: "0.9rem 1rem" }}>
                <strong style={{ color: r.correct ? "var(--primary)" : "var(--danger)" }}>
                  ข้อ {i + 1}: {r.correct ? "ถูกต้อง" : "ยังไม่ถูก"}
                </strong>
                <p className="hint" style={{ marginTop: "0.3rem" }}>
                  เฉลย: {CHOICE_LABELS[r.correctIndex]}
                </p>
                {r.explanation && <p className="hint" style={{ marginTop: "0.3rem" }}>{r.explanation}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {!attempt && course?.finalExam.unlocked && !course.finalExam.passed && !result && (
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: "0.8rem", alignItems: "flex-start" }}>
          <p>พร้อมแล้ว กดเริ่มเพื่อสุ่มข้อสอบ</p>
          <button type="button" className="btn btn-primary" onClick={start} disabled={busy}>
            เริ่มทำแบบทดสอบรวม
          </button>
        </section>
      )}

      {attempt && (
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }} aria-labelledby="questions-title">
          <h2 id="questions-title">ข้อสอบ {attempt.questions.length} ข้อ</h2>
          <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {attempt.questions.map((q, i) => (
              <li key={i} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <strong>
                  {i + 1}. {q.stem}
                </strong>
                <div role="radiogroup" aria-label={`ข้อ ${i + 1}`} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {q.options.map((opt, j) => (
                    <button
                      key={j}
                      type="button"
                      role="radio"
                      aria-checked={answers[i] === j}
                      className="option"
                      onClick={() => setAnswers((prev) => prev.map((v, k) => (k === i ? j : v)))}
                    >
                      <span className="radio-dot" aria-hidden="true" />
                      <span>
                        <strong style={{ marginRight: "0.4rem", color: "var(--primary)" }}>{CHOICE_LABELS[j]}.</strong>
                        {opt}
                      </span>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={submit} disabled={!allAnswered || busy}>
            ส่งคำตอบ
          </button>
        </section>
      )}
    </main>
  );
}
