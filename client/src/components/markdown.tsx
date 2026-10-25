import type { AnchorHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders lesson text written in Markdown. Raw HTML typed by a teacher is shown as text, not run,
// because the HTML renderer is not enabled. Links open in a new tab.
function SafeLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} target="_blank" rel="noopener noreferrer" />;
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: SafeLink }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
