"use client";

import dynamic from "next/dynamic";
import { FieldError } from "@/components/field-error";

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  error?: string;
}

// The editor touches the browser APIs, so it is loaded on the client only
const MarkdownEditor = dynamic(() => import("@/components/markdown-editor-core"), {
  ssr: false,
  loading: () => <div className="input" style={{ minHeight: 160, color: "var(--text-muted)" }}>กำลังโหลดตัวแก้ไข...</div>,
});

// Rich-text editor that saves Markdown. Teachers format with the toolbar and the text is stored as Markdown.
export function MarkdownField({ id, label, value, onChange, rows, error }: Props) {
  return (
    <div className="field" id={id}>
      <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>{label}</span>
      <MarkdownEditor value={value} onChange={onChange} minHeight={rows * 28} />
      <p className="hint">เลือกข้อความแล้วใช้แถบเครื่องมือ หรือพิมพ์ Markdown เองได้ เช่น `# หัวข้อ`</p>
      <FieldError message={error} />
    </div>
  );
}
