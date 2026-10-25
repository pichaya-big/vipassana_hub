"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { type LearnerLesson, type LearnerQuestion, type PosttestResult } from "@/lib/courses";
import { Markdown } from "@/components/markdown";
import { TRACK_LABELS } from "@/lib/lessons";

const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];
const isDirectVideo = (url: string) => /\.(mp4|webm|ogg)(\?|$)/i.test(url);

function QuestionList({
  questions,
  answers,
  onPick,
}: {
  questions: LearnerQuestion[];
  answers: number[];
  onPick: (question: number, choice: number) => void;
}) {
  return (
    <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {questions.map((q, i) => (
        <li key={i} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <strong>
            {i + 1}. {q.stem}
          </strong>
          <div role="radiogroup" aria-label={`ข้อ ${i + 1}`} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {q.options.map((opt, j) => (
              <button key={j} type="button" role="radio" aria-checked={answers[i] === j} className="option" onClick={() => onPick(i, j)}>
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
  );
}

// If the learner has not touched the page for this long while a video plays, the video is paused.
const IDLE_PAUSE_MS = 10 * 60 * 1000;

// Video player for the video track. Starts where the learner stopped last time, and saves the
// furthest share watched plus the current position: every 5 percent, every 15 seconds, and on pause or end.
function VideoPlayer({
  url,
  watched,
  threshold,
  startAt,
  onReport,
}: {
  url: string;
  watched: number;
  threshold: number;
  startAt: number;
  onReport: (percent: number, position: number) => void;
}) {
  const lastSent = useRef(watched);
  const lastSentAt = useRef(0);
  const resumed = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pausedReason, setPausedReason] = useState<string | null>(null);

  // Stop the video when the learner leaves the tab or stops using the page, so time away is not counted as watching
  useEffect(() => {
    let lastActivity = Date.now();
    const pauseFor = (reason: string) => {
      const el = videoRef.current;
      if (el && !el.paused) {
        el.pause();
        setPausedReason(reason);
      }
    };
    const onVisibility = () => {
      if (document.hidden) pauseFor("หยุดเล่นชั่วคราว เพราะคุณเปลี่ยนไปหน้าอื่น กดเล่นต่อเมื่อพร้อม");
    };
    const onActivity = () => {
      lastActivity = Date.now();
    };
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity > IDLE_PAUSE_MS) {
        pauseFor("หยุดเล่นชั่วคราว เพราะไม่มีการใช้งานนาน กดเล่นต่อได้เลย");
      }
    }, 15000);
    const activityEvents = ["pointerdown", "keydown", "mousemove", "touchstart", "scroll"] as const;

    document.addEventListener("visibilitychange", onVisibility);
    for (const ev of activityEvents) window.addEventListener(ev, onActivity, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      for (const ev of activityEvents) window.removeEventListener(ev, onActivity);
      window.clearInterval(timer);
    };
  }, []);

  function report(el: HTMLVideoElement, force = false) {
    if (!el.duration || !Number.isFinite(el.duration)) return;
    const percent = Math.floor((el.currentTime / el.duration) * 100);
    const now = Date.now();
    const due = force || percent >= lastSent.current + 5 || now - lastSentAt.current >= 15000;
    if (!due) return;
    lastSent.current = Math.max(lastSent.current, percent);
    lastSentAt.current = now;
    onReport(percent, Math.floor(el.currentTime));
  }

  // Jump to the saved position once the length is known. Near the end, start from the beginning.
  function resume(el: HTMLVideoElement) {
    if (resumed.current) return;
    resumed.current = true;
    if (startAt > 0 && startAt < el.duration - 5) el.currentTime = startAt;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {isDirectVideo(url) ? (
        <video
          ref={videoRef}
          controls
          src={url}
          preload="metadata"
          onLoadedMetadata={(e) => resume(e.currentTarget)}
          onTimeUpdate={(e) => report(e.currentTarget)}
          onPause={(e) => report(e.currentTarget, true)}
          onEnded={(e) => report(e.currentTarget, true)}
          onPlay={() => setPausedReason(null)}
          style={{ width: "100%", borderRadius: "var(--r-md)", background: "#000" }}
        />
      ) : (
        <p className="error-text">
          วิดีโอนี้เปิดจากภายนอกระบบ ระบบบันทึกการดูไม่ได้ จึงยังเรียนจบไม่ได้ กรุณาแจ้งผู้สอนให้อัปโหลดไฟล์วิดีโอ
        </p>
      )}
      {pausedReason && (
        <p className="hint" role="status" style={{ color: "var(--secondary)", fontWeight: 600 }}>
          {pausedReason}
        </p>
      )}
      {isDirectVideo(url) && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
            <span>ดูไปแล้ว {watched}%</span>
            <span>ต้องดูให้ถึง {threshold}%</span>
          </div>
          <div className="progress progress-amber">
            <span style={{ width: `${Math.min(watched, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function ContentPanel({
  lesson,
  watched,
  onReport,
  busy,
  onFinish,
}: {
  lesson: LearnerLesson;
  watched: number;
  onReport: (percent: number, position: number) => void;
  busy: boolean;
  onFinish: () => void;
}) {
  const content = lesson.content;
  if (!content) return null;
  const isVideo = lesson.track === "video";
  const canFinish = !isVideo || (isDirectVideo(content.videoUrl) && watched >= lesson.watchThreshold);

  return (
    <>
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }} aria-labelledby="content-title">
        <h2 id="content-title">เนื้อหาบทเรียน</h2>
        {isVideo && content.videoUrl && (
          <VideoPlayer
            url={content.videoUrl}
            watched={watched}
            threshold={lesson.watchThreshold}
            startAt={lesson.progress.lastPositionSec}
            onReport={onReport}
          />
        )}
        {content.body && <Markdown>{content.body}</Markdown>}
      </section>
      <div className="bottom-bar">
        <span className="hint">
          {canFinish ? "อ่านหรือดูจบแล้ว ไปแบบทดสอบหลังเรียนได้" : `ต้องดูวิดีโอให้ถึง ${lesson.watchThreshold}% ก่อนจึงจะกดเรียนจบได้`}
        </span>
        <button
          type="button"
          onClick={onFinish}
          disabled={busy || !canFinish}
          aria-label={canFinish ? "เรียนจบแล้ว ไปแบบทดสอบหลังเรียน" : `ยังไม่ผ่านเกณฑ์ ต้องดูวิดีโอให้ถึง ${lesson.watchThreshold}%`}
          className={canFinish ? "btn btn-primary" : "btn"}
          style={
            canFinish
              ? undefined
              : {
                  background: "var(--surface-alt)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  cursor: "not-allowed",
                  boxShadow: "none",
                }
          }
        >
          {!canFinish && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          )}
          เรียนจบแล้ว ไปแบบทดสอบหลังเรียน →
        </button>
      </div>
    </>
  );
}

function LessonView() {
  const lessonId = useSearchParams().get("id");
  const [lesson, setLesson] = useState<LearnerLesson | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PosttestResult | null>(null);
  const [pretestScore, setPretestScore] = useState<{ correct: number; total: number } | null>(null);
  const [watched, setWatched] = useState(0);

  const load = useCallback(async () => {
    if (!lessonId) return;
    const res = await apiGet<{ lesson: LearnerLesson }>(`/lessons/${lessonId}`);
    if (res.ok) {
      setLesson(res.data.lesson);
      setWatched(res.data.lesson.progress.watchedPercent);
      setError("");
    } else {
      setError(res.data.message ?? "โหลดบทเรียนไม่สำเร็จ");
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset the answer sheet whenever the quiz being shown changes
  const quizKey = lesson ? (lesson.progress.preDone ? (lesson.posttest ? "post" : "none") : "pre") : "";
  useEffect(() => {
    const questions = lesson?.pretest ?? lesson?.posttest ?? [];
    setAnswers(new Array(questions.length).fill(-1));
    // quizKey is the only trigger needed; the question list is read from the current lesson
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizKey]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function reportWatch(percent: number, position: number) {
    const res = await apiPost<{ watchedPercent: number }>(`/lessons/${lessonId}/watch-progress`, { percent, position });
    if (res.ok) setWatched(res.data.watchedPercent);
  }

  async function submitPretest() {
    await run(async () => {
      const res = await apiPost<{ correct: number; total: number }>(`/lessons/${lessonId}/pretest`, { answers });
      if (!res.ok) return setError(res.data.message ?? "ส่งแบบทดสอบไม่สำเร็จ");
      setPretestScore({ correct: res.data.correct, total: res.data.total });
      await load();
    });
  }

  async function finishContent() {
    await run(async () => {
      const res = await apiPost(`/lessons/${lessonId}/content-complete`);
      if (!res.ok) return setError(res.data.message ?? "บันทึกไม่สำเร็จ");
      await load();
    });
  }

  async function submitPosttest() {
    await run(async () => {
      const res = await apiPost<PosttestResult>(`/lessons/${lessonId}/posttest`, { answers });
      if (!res.ok) return setError(res.data.message ?? "ส่งแบบทดสอบไม่สำเร็จ");
      setResult(res.data);
      await load();
    });
  }

  if (!lessonId) {
    return (
      <main className="content">
        <p>ไม่พบบทเรียนที่ต้องการ</p>
        <Link href="/lesson" style={{ color: "var(--secondary)", fontWeight: 700 }}>
          กลับไปหน้าบทเรียน
        </Link>
      </main>
    );
  }
  if (error && !lesson) {
    return (
      <main className="content">
        <p role="alert" className="error-text">
          {error}
        </p>
        <Link href="/lesson" style={{ color: "var(--secondary)", fontWeight: 700 }}>
          กลับไปหน้าบทเรียน
        </Link>
      </main>
    );
  }
  if (!lesson) return <main className="content">กำลังโหลด...</main>;

  const p = lesson.progress;
  const allAnswered = answers.length > 0 && answers.every((a) => a >= 0);

  return (
    <main className="content" aria-labelledby="lesson-title">
      <div>
        <Link href="/lesson" className="hint" style={{ color: "var(--primary)", fontWeight: 600 }}>
          ← กลับไปหน้าบทเรียน
        </Link>
        <span className="chip" style={{ marginTop: "0.6rem", display: "inline-flex" }}>
          {TRACK_LABELS[lesson.track]}
        </span>
        <h1 id="lesson-title" style={{ marginTop: "0.6rem" }}>
          {lesson.order}. {lesson.title}
        </h1>
        {lesson.summary && (
          <div style={{ marginTop: "0.4rem" }}>
            <Markdown>{lesson.summary}</Markdown>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}

      {/* Step 1: pre-test is required before the content */}
      {!p.preDone && lesson.pretest && (
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }} aria-labelledby="pre-title">
          <div>
            <h2 id="pre-title">ขั้นที่ 1: แบบทดสอบก่อนเรียน</h2>
            <p className="hint" style={{ marginTop: "0.3rem" }}>
              ตอบให้ครบทุกข้อก่อนเข้าเนื้อหา ผลนี้ใช้วัดพื้นฐานของคุณ ไม่มีเกณฑ์ผ่าน
            </p>
          </div>
          {pretestScore && (
            <p style={{ fontWeight: 600 }}>
              ทำแบบทดสอบก่อนเรียนแล้ว ได้ {pretestScore.correct} จาก {pretestScore.total} ข้อ
            </p>
          )}
          <QuestionList questions={lesson.pretest} answers={answers} onPick={(q, c) => setAnswers((a) => a.map((v, i) => (i === q ? c : v)))} />
          <button type="button" className="btn btn-primary" disabled={!allAnswered || busy} onClick={submitPretest} style={{ alignSelf: "flex-start" }}>
            ส่งคำตอบก่อนเรียน
          </button>
        </section>
      )}

      {/* Step 2: content, finished explicitly by the learner. Video needs the watch threshold first. */}
      {p.preDone && !p.contentCompleted && lesson.content && (
        <ContentPanel lesson={lesson} watched={watched} onReport={reportWatch} busy={busy} onFinish={finishContent} />
      )}

      {/* Step 3: post-test, passing score required, retakes allowed */}
      {p.preDone && p.contentCompleted && lesson.posttest && (
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }} aria-labelledby="post-title">
          <div>
            <h2 id="post-title">ขั้นที่ 3: แบบทดสอบหลังเรียน</h2>
            <p className="hint" style={{ marginTop: "0.3rem" }}>
              ต้องได้อย่างน้อย {lesson.passingScore}% จึงจะผ่านบทนี้ ทำซ้ำได้ไม่จำกัด
            </p>
            {p.passed && <span className="chip" style={{ marginTop: "0.6rem", display: "inline-flex" }}>ผ่านบทนี้แล้ว</span>}
          </div>

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }} role="status">
              <strong style={{ color: result.passed ? "var(--primary)" : "var(--danger)" }}>
                ได้ {result.score}% ({result.correct} จาก {result.total} ข้อ) {result.passed ? "ผ่านแล้ว" : "ยังไม่ผ่าน"}
              </strong>
              {result.passed && (
                <Link href="/lesson" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
                  กลับไปเลือกบทถัดไป
                </Link>
              )}
              <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {result.results.map((r, i) => (
                  <li key={i} className="card" style={{ background: "var(--surface-alt)", border: "none", padding: "0.9rem 1rem" }}>
                    <strong style={{ color: r.correct ? "var(--primary)" : "var(--danger)" }}>
                      ข้อ {i + 1}: {r.correct ? "ถูกต้อง" : "ยังไม่ถูก"}
                    </strong>
                    <p style={{ marginTop: "0.3rem" }}>
                      เฉลย: {CHOICE_LABELS[r.correctIndex]}. {lesson.posttest?.[i]?.options[r.correctIndex]}
                    </p>
                    {r.explanation && <p className="hint" style={{ marginTop: "0.3rem" }}>{r.explanation}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <QuestionList questions={lesson.posttest} answers={answers} onPick={(q, c) => setAnswers((a) => a.map((v, i) => (i === q ? c : v)))} />
          <button type="button" className="btn btn-primary" disabled={!allAnswered || busy} onClick={submitPosttest} style={{ alignSelf: "flex-start" }}>
            ส่งคำตอบหลังเรียน
          </button>
        </section>
      )}
    </main>
  );
}

export default function LessonViewPage() {
  return (
    <Suspense fallback={<main className="content">กำลังโหลด...</main>}>
      <LessonView />
    </Suspense>
  );
}
