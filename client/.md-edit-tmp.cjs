const fs = require("fs");

const editorPath = "src/app/(app)/admin/lessons/editor/page.tsx";
let s = fs.readFileSync(editorPath, "utf8");

// Replace one plain textarea field block (label + textarea + error) with a MarkdownField
function replaceField(id, label, rows, errorKey, replacement) {
  const labelAt = s.indexOf(`<label htmlFor="${id}">`);
  if (labelAt < 0) throw new Error(`label ${id} not found`);
  const start = s.lastIndexOf('<div className="field">', labelAt);
  const endMarker = `<FieldError message={fieldErrors.${errorKey}} />\n          </div>\n`;
  const end = s.indexOf(endMarker, labelAt);
  if (start < 0 || end < 0) throw new Error(`block ${id} bounds not found`);
  s = s.slice(0, start) + replacement + s.slice(end + endMarker.length);
  console.log("replaced field", id);
}

replaceField("summary", "สรุปและวัตถุประสงค์", 2, "summary",
`          <MarkdownField
            id="summary"
            label="สรุปและวัตถุประสงค์"
            value={form.summary}
            onChange={(v) => set("summary", v)}
            rows={3}
            error={fieldErrors.summary}
          />
`);

replaceField("body", "เนื้อหาธรรม (สำหรับรูปแบบเนื้อหา)", 8, "body",
`          <MarkdownField
            id="body"
            label="เนื้อหาธรรม (สำหรับรูปแบบเนื้อหา)"
            value={form.body}
            onChange={(v) => set("body", v)}
            rows={12}
            error={fieldErrors.body}
          />
`);

s = s.replace('import { FieldError } from "@/components/field-error";', 'import { FieldError } from "@/components/field-error";\nimport { MarkdownField } from "@/components/markdown-field";');
fs.writeFileSync(editorPath, s);

// Learner lesson view: render body and summary as Markdown
const viewPath = "src/app/(app)/lesson/view/page.tsx";
let v = fs.readFileSync(viewPath, "utf8");
function rep(a, b) {
  const n = v.split(a).length - 1;
  if (n !== 1) throw new Error(`view: ${n} matches: ${a.slice(0, 60)}`);
  v = v.replace(a, b);
}
rep(`        {content.body && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {content.body.split(/\n{2,}/).map((para, i) => (
              <p key={i} style={{ whiteSpace: "pre-line", color: "var(--text)" }}>
                {para}
              </p>
            ))}
          </div>
        )}`, `        {content.body && <Markdown>{content.body}</Markdown>}`);
rep(`        {lesson.summary && <p style={{ marginTop: "0.4rem" }}>{lesson.summary}</p>}`,
    `        {lesson.summary && (
          <div style={{ marginTop: "0.4rem" }}>
            <Markdown>{lesson.summary}</Markdown>
          </div>
        )}`);
rep(`import { TRACK_LABELS } from "@/lib/lessons";`, `import { Markdown } from "@/components/markdown";\nimport { TRACK_LABELS } from "@/lib/lessons";`);
fs.writeFileSync(viewPath, v);
console.log("learner view updated");
