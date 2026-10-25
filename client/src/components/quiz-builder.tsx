"use client";

import { FieldError } from "@/components/field-error";
import { CHOICE_LABELS, MAX_QUESTIONS, emptyQuestion, type Question } from "@/lib/lessons";

interface Props {
  prefix: "pretest" | "posttest";
  title: string;
  hint: string;
  questions: Question[];
  onChange: (questions: Question[]) => void;
  // Server errors keyed by path, e.g. "pretest" or "pretest[0].stem"
  errors: Record<string, string>;
  // Optional button that copies another quiz into this one. After copying, the two quizzes are independent.
  copyAction?: { label: string; hint: string; disabled: boolean; onCopy: () => void };
}

// Editor for one quiz (pre-test or post-test). Each question has 4 choices and one correct answer.
export function QuizBuilder({ prefix, title, hint, questions, onChange, errors, copyAction }: Props) {
  function patch(index: number, change: Partial<Question>) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...change } : q)));
  }

  function patchOption(index: number, choice: number, value: string) {
    const options = [...questions[index].options];
    options[choice] = value;
    patch(index, { options });
  }

  function remove(index: number) {
    onChange(questions.filter((_, i) => i !== index));
  }

  return (
    <section className="card" aria-labelledby={`${prefix}-title`} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h2 id={`${prefix}-title`}>{title}</h2>
        <p className="hint" style={{ marginTop: "0.3rem" }}>
          {hint}
        </p>
        {copyAction && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-start", marginTop: "0.8rem" }}>
            <button type="button" className="btn btn-ghost" onClick={copyAction.onCopy} disabled={copyAction.disabled}>
              {copyAction.label}
            </button>
            <p className="hint">{copyAction.hint}</p>
          </div>
        )}
      </div>

      <FieldError message={errors[prefix]} />
      {questions.length === 0 && <p className="hint">ยังไม่มีคำถาม ต้องมีอย่างน้อยหนึ่งข้อก่อนเผยแพร่</p>}

      {questions.map((q, i) => (
        <article
          key={i}
          className="card"
          style={{ background: "var(--surface-alt)", border: "none", display: "flex", flexDirection: "column", gap: "0.8rem" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
            <strong>คำถามที่ {i + 1}</strong>
            <button type="button" className="btn btn-ghost" onClick={() => remove(i)}>
              ลบข้อนี้
            </button>
          </div>

          <div className="field">
            <label htmlFor={`${prefix}-${i}-stem`}>คำถาม</label>
            <input
              id={`${prefix}-${i}-stem`}
              className="input"
              value={q.stem}
              aria-invalid={!!errors[`${prefix}[${i}].stem`]}
              onChange={(e) => patch(i, { stem: e.target.value })}
            />
            <FieldError message={errors[`${prefix}[${i}].stem`]} />
          </div>

          <fieldset style={{ border: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <legend style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.4rem" }}>
              ตัวเลือก (เลือกข้อที่ถูกต้องด้วยปุ่มวงกลม)
            </legend>
            {q.options.map((opt, j) => (
              <div key={j} style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                <input
                  type="radio"
                  name={`${prefix}-${i}-correct`}
                  checked={q.correctIndex === j}
                  onChange={() => patch(i, { correctIndex: j })}
                  aria-label={`ตัวเลือก ${CHOICE_LABELS[j]} เป็นเฉลย`}
                  style={{ width: 18, height: 18, accentColor: "var(--primary)", flex: "none" }}
                />
                <input
                  className="input"
                  value={opt}
                  placeholder={`ตัวเลือก ${CHOICE_LABELS[j]}`}
                  aria-label={`ตัวเลือก ${CHOICE_LABELS[j]}`}
                  onChange={(e) => patchOption(i, j, e.target.value)}
                />
              </div>
            ))}
            <FieldError message={errors[`${prefix}[${i}].options`]} />
            <FieldError message={errors[`${prefix}[${i}].correctIndex`]} />
          </fieldset>

          <div className="field">
            <label htmlFor={`${prefix}-${i}-explanation`}>คำอธิบายเฉลย (แสดงให้ผู้เรียนหลังส่งคำตอบ)</label>
            <textarea
              id={`${prefix}-${i}-explanation`}
              className="input"
              rows={2}
              value={q.explanation}
              onChange={(e) => patch(i, { explanation: e.target.value })}
              style={{ resize: "vertical" }}
            />
          </div>
        </article>
      ))}

      <div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onChange([...questions, emptyQuestion()])}
          disabled={questions.length >= MAX_QUESTIONS}
        >
          + เพิ่มคำถาม
        </button>
      </div>
    </section>
  );
}
