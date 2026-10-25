"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FieldError } from "@/components/field-error";
import { MarkdownField } from "@/components/markdown-field";
import { QuizBuilder } from "@/components/quiz-builder";
import { apiGet, apiPatch, apiPost, type ApiResult } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import {
  EMPTY_FORM,
  MAX_VIDEO_MB,
  STATUS_LABELS,
  TRACK_LABELS,
  formFrom,
  type LessonAdmin,
  type LessonForm,
  type Question,
  type Track,
} from "@/lib/lessons";

interface Meta {
  id: string;
  version: number;
  status: LessonAdmin["status"];
  createdBy: string;
}

// Explains why the copy button is off, or what it will do
function copyHint(pretestCount: number, posttestCount: number): string {
  if (pretestCount === 0) return "ยังไม่มีข้อสอบก่อนเรียนให้คัดลอก";
  if (posttestCount > 0) return "ลบคำถามหลังเรียนทั้งหมดก่อน จึงจะคัดลอกชุดก่อนเรียนมาได้";
  return `จะคัดลอกคำถาม ${pretestCount} ข้อ แล้วปรับแยกจากชุดก่อนเรียนได้`;
}

function toMeta(lesson: LessonAdmin): Meta {
  return { id: lesson.id, version: lesson.version, status: lesson.status, createdBy: lesson.createdBy };
}

function LessonEditor() {
  const router = useRouter();
  const lessonId = useSearchParams().get("id");
  const { user, loading } = useCurrentUser();

  const [form, setForm] = useState<LessonForm>(EMPTY_FORM);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadError, setLoadError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // A video the person picked. It is uploaded when they press Save draft or Publish, not before.
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    apiGet<{ lesson: LessonAdmin }>(`/admin/lessons/${lessonId}`).then((res) => {
      if (res.ok) {
        setForm(formFrom(res.data.lesson));
        setMeta(toMeta(res.data.lesson));
      } else {
        setLoadError(res.data.message ?? "โหลดบทเรียนไม่สำเร็จ");
      }
    });
  }, [lessonId]);

  function set<K extends keyof LessonForm>(key: K, value: LessonForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setQuiz(kind: "pretest" | "posttest", questions: Question[]) {
    setForm((prev) => ({ ...prev, [kind]: questions }));
  }

  function showFailure<T>(res: ApiResult<T & { message?: string; fields?: Record<string, string> }>) {
    setFieldErrors(res.data.fields ?? {});
    setNotice({ kind: "error", text: res.data.message ?? "ทำรายการไม่สำเร็จ" });
  }

  // Uploads the video for this lesson. The server replies with the updated lesson.
  // Picking a file only remembers it. Nothing is saved or uploaded until Save draft or Publish.
  function chooseVideo(file: File) {
    setNotice(null);
    if (!file.name.toLowerCase().endsWith(".mp4")) {
      setFieldErrors({ video: "ไฟล์ต้องเป็น MP4" });
      return;
    }
    // Refuse a too-large file at once instead of waiting for the server to say no
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setFieldErrors({ video: `ไฟล์ใหญ่เกิน ${MAX_VIDEO_MB} MB (ไฟล์นี้ ${(file.size / 1024 / 1024).toFixed(1)} MB)` });
      return;
    }
    setFieldErrors({});
    setPendingVideo(file);
  }

  // Uploads the picked video to a saved lesson. Returns the updated lesson, or null if it failed.
  async function sendVideo(lessonId: string, file: File): Promise<LessonAdmin | null> {
    setBusy(true);
    const body = new FormData();
    body.append("video", file);
    const res = await apiPost<{ lesson: LessonAdmin }>(`/admin/lessons/${lessonId}/video`, body);
    setBusy(false);
    if (!res.ok) {
      showFailure(res);
      return null;
    }
    return res.data.lesson;
  }

  // Saves the draft. New lessons are created, existing ones are updated with the version we loaded.
  async function save(): Promise<Meta | null> {
    setBusy(true);
    setNotice(null);
    setFieldErrors({});
    const payload = {
      track: form.track,
      order: Number(form.order),
      title: form.title,
      summary: form.summary,
      body: form.body,
      videoUrl: form.videoUrl,
      passingScore: Number(form.passingScore),
      watchThreshold: Number(form.watchThreshold),
      pretest: form.pretest,
      posttest: form.posttest,
    };
    const res = meta
      ? await apiPatch<{ lesson: LessonAdmin }>(`/admin/lessons/${meta.id}`, { ...payload, version: meta.version })
      : await apiPost<{ lesson: LessonAdmin }>("/admin/lessons", payload);
    setBusy(false);

    if (!res.ok) {
      showFailure(res);
      return null;
    }
    const saved = res.data.lesson;
    let latest = saved;
    let uploadFailed = false;

    if (pendingVideo && form.track === "video") {
      const withVideo = await sendVideo(saved.id, pendingVideo);
      if (withVideo) {
        latest = withVideo;
        setPendingVideo(null);
      } else {
        uploadFailed = true; // the draft is saved, but the chosen file is kept so it can be tried again
      }
    } else if (pendingVideo) {
      setPendingVideo(null); // the lesson is no longer a video lesson
    }

    setForm(formFrom(latest));
    setMeta(toMeta(latest));
    // Only now move to the saved lesson's address, so the page does not reload mid-upload
    if (!meta) router.replace(`/admin/lessons/editor?id=${saved.id}`);
    if (uploadFailed) return null;
    setNotice({ kind: "ok", text: pendingVideo ? "บันทึกร่างและอัปโหลดวิดีโอแล้ว" : "บันทึกร่างแล้ว" });
    return toMeta(latest);
  }

  async function changePublication(action: "publish" | "unpublish") {
    // Publishing saves the latest edits first, so the published version matches the screen
    const target = action === "publish" ? await save() : meta;
    if (!target) return;

    setBusy(true);
    setNotice(null);
    const res = await apiPost<{ lesson: LessonAdmin }>(`/admin/lessons/${target.id}/${action}`);
    setBusy(false);

    if (!res.ok) {
      showFailure(res);
      return;
    }
    setForm(formFrom(res.data.lesson));
    setMeta(toMeta(res.data.lesson));
    setNotice({ kind: "ok", text: action === "publish" ? "เผยแพร่บทเรียนแล้ว" : "ยกเลิกการเผยแพร่แล้ว ผู้เรียนจะไม่เห็นบทนี้" });
  }

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
  if (loadError) {
    return (
      <main className="content">
        <section className="card">
          <p role="alert" className="error-text">
            {loadError}
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            <Link href="/admin/lessons" style={{ color: "var(--secondary)", fontWeight: 700 }}>
              กลับไปรายการบทเรียน
            </Link>
          </p>
        </section>
      </main>
    );
  }

  // Teachers can publish lessons they created, and new lessons they are about to create
  const canPublish = user.role === "admin" || !meta || meta.createdBy === user.id;

  return (
    <main className="content" aria-labelledby="editor-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <Link href="/admin/lessons" className="hint" style={{ color: "var(--primary)", fontWeight: 600 }}>
            ← กลับไปรายการบทเรียน
          </Link>
          <h1 id="editor-title" style={{ marginTop: "0.5rem" }}>
            {meta ? "แก้ไขบทเรียน" : "เพิ่มบทเรียนใหม่"}
          </h1>
        </div>
        {meta && <span className="chip">{STATUS_LABELS[meta.status]}</span>}
      </div>

      {notice && (
        <p role={notice.kind === "error" ? "alert" : "status"} className={notice.kind === "error" ? "error-text" : "hint"} style={{ fontWeight: 600 }}>
          {notice.text}
        </p>
      )}
      {fieldErrors.version && <FieldError message={fieldErrors.version} />}

      <div className="grid-12" style={{ alignItems: "start" }}>
        <section className="card" style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: "1rem" }} aria-labelledby="info-title">
          <h2 id="info-title">ข้อมูลบทเรียน</h2>

          <div className="form-row">
            <div className="field">
              <label htmlFor="track">รูปแบบการเรียน</label>
              <select id="track" className="input" value={form.track} onChange={(e) => set("track", e.target.value as Track)}>
                {(Object.keys(TRACK_LABELS) as Track[]).map((t) => (
                  <option key={t} value={t}>
                    {TRACK_LABELS[t]}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.track} />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="order">ลำดับ</label>
              <input id="order" type="number" min={1} className="input" value={form.order} onChange={(e) => set("order", Number(e.target.value))} />
              <FieldError message={fieldErrors.order} />
            </div>
            <div className="field">
              <label htmlFor="passingScore">คะแนนผ่าน post-test (%)</label>
              <input
                id="passingScore"
                type="number"
                min={0}
                max={100}
                className="input"
                value={form.passingScore}
                onChange={(e) => set("passingScore", Number(e.target.value))}
              />
              <FieldError message={fieldErrors.passingScore} />
            </div>
          </div>

          {form.track === "video" && (
            <div className="field">
              <label htmlFor="watchThreshold">ต้องดูวิดีโอให้ถึงกี่ % จึงจะผ่านไปได้</label>
              <input
                id="watchThreshold"
                type="number"
                min={1}
                max={100}
                className="input"
                value={form.watchThreshold}
                onChange={(e) => set("watchThreshold", Number(e.target.value))}
              />
              <p className="hint">ค่าเริ่มต้น 80% ผู้เรียนต้องดูวิดีโอถึงค่านี้ก่อนกดเรียนจบ</p>
              <FieldError message={fieldErrors.watchThreshold} />
            </div>
          )}

          <div className="field">
            <label htmlFor="title">ชื่อบทเรียน</label>
            <input id="title" className="input" value={form.title} onChange={(e) => set("title", e.target.value)} />
            <FieldError message={fieldErrors.title} />
          </div>

                    <MarkdownField
            id="summary"
            label="สรุปและวัตถุประสงค์"
            value={form.summary}
            onChange={(v) => set("summary", v)}
            rows={3}
            error={fieldErrors.summary}
          />

                    <MarkdownField
            id="body"
            label="เนื้อหาธรรม (สำหรับรูปแบบเนื้อหา)"
            value={form.body}
            onChange={(v) => set("body", v)}
            rows={12}
            error={fieldErrors.body}
          />

          {form.track === "video" && (
            <div className="field">
              <label htmlFor="videoFile">ไฟล์วิดีโอ (MP4)</label>
              <input
                id="videoFile"
                type="file"
                accept="video/mp4,.mp4"
                className="input"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) chooseVideo(file);
                  e.target.value = "";
                }}
              />
              {pendingVideo && (
                <div className="card" style={{ background: "var(--surface-alt)", border: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <strong>
                    เลือกไฟล์แล้ว: {pendingVideo.name} ({(pendingVideo.size / 1024 / 1024).toFixed(1)} MB)
                  </strong>
                  <p className="hint">ยังไม่ได้อัปโหลด ระบบจะอัปโหลดเมื่อกด &quot;บันทึกร่าง&quot; หรือ &quot;เผยแพร่&quot;</p>
                  <button type="button" className="btn btn-ghost" style={{ alignSelf: "flex-start" }} onClick={() => setPendingVideo(null)} disabled={busy}>
                    ยกเลิกไฟล์ที่เลือก
                  </button>
                </div>
              )}
              {busy && pendingVideo && (
                <p className="hint" role="status">
                  กำลังบันทึกและอัปโหลดวิดีโอ กรุณารอสักครู่...
                </p>
              )}
              {form.videoUrl && !busy && (
                <div className="card" style={{ background: "var(--surface-alt)", border: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <strong style={{ color: "var(--primary)" }}>มีวิดีโอที่อัปโหลดไว้แล้ว</strong>
                  <video controls preload="metadata" src={form.videoUrl} style={{ width: "100%", borderRadius: "var(--r-sm)", background: "#000" }} />
                  {pendingVideo && <p className="hint">ไฟล์ที่เลือกใหม่จะมาแทนที่วิดีโอนี้</p>}
                </div>
              )}
              {!form.videoUrl && !pendingVideo && (
                <p className="hint">{`ยังไม่มีไฟล์วิดีโอ ระบบรับเฉพาะไฟล์ MP4 ขนาดไม่เกิน ${MAX_VIDEO_MB} MB`}</p>
              )}
              <FieldError message={fieldErrors.video} />
              <FieldError message={fieldErrors.videoUrl} />
              {notice?.kind === "error" && <FieldError message={notice.text} />}
            </div>
          )}
        </section>

        <aside className="card" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "1rem" }} aria-labelledby="publish-title">
          <h2 id="publish-title">การเผยแพร่</h2>
          <p className="hint">
            {meta?.status === "published"
              ? "บทนี้เผยแพร่แล้ว การแก้ไขจะมีผลกับผู้เรียนทันทีหลังบันทึก"
              : "บทนี้ยังเป็นร่าง ผู้เรียนยังมองไม่เห็น"}
          </p>
          <button type="button" className="btn btn-ghost btn-block" onClick={save} disabled={busy}>
            บันทึกร่าง
          </button>
          {canPublish ? (
            <button type="button" className="btn btn-primary btn-block" onClick={() => changePublication("publish")} disabled={busy}>
              เผยแพร่บทเรียน
            </button>
          ) : (
            <p className="hint">ผู้สอนเผยแพร่ได้เฉพาะบทที่ตัวเองสร้าง</p>
          )}
          {meta?.status === "published" && (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => changePublication("unpublish")} disabled={busy}>
              ยกเลิกการเผยแพร่
            </button>
          )}
        </aside>

        <div style={{ gridColumn: "span 12", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <QuizBuilder
            prefix="pretest"
            title="แบบทดสอบก่อนเรียน (Pre-test)"
            hint="ผู้เรียนต้องทำก่อนเข้าเนื้อหา ไม่มีเกณฑ์ผ่าน"
            questions={form.pretest}
            onChange={(qs) => setQuiz("pretest", qs)}
            errors={fieldErrors}
          />
          <QuizBuilder
            prefix="posttest"
            title="แบบทดสอบหลังเรียน (Post-test)"
            hint="ต้องได้คะแนนถึงเกณฑ์ผ่านจึงจะจบบทนี้ ทำซ้ำได้ไม่จำกัด"
            questions={form.posttest}
            onChange={(qs) => setQuiz("posttest", qs)}
            errors={fieldErrors}
            copyAction={{
              label: "ใช้ข้อสอบชุดเดียวกับก่อนเรียน",
              hint: copyHint(form.pretest.length, form.posttest.length),
              disabled: form.pretest.length === 0 || form.posttest.length > 0,
              // Copies each question so the post-test can be edited on its own afterwards
              onCopy: () => setQuiz("posttest", form.pretest.map((q) => ({ ...q, options: [...q.options] }))),
            }}
          />
        </div>
      </div>
    </main>
  );
}

export default function LessonEditorPage() {
  return (
    <Suspense fallback={<main className="content">กำลังโหลด...</main>}>
      <LessonEditor />
    </Suspense>
  );
}
