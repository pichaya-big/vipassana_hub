"use client";

import "@mdxeditor/editor/style.css";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  StrikeThroughSupSubToggles,
  UndoRedo,
  diffSourcePlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (markdown: string) => void;
  minHeight: number;
}

// The rich-text Markdown editor itself. Loaded only in the browser (see markdown-field.tsx).
export default function MarkdownEditorCore({ value, onChange, minHeight }: Props) {
  const editorRef = useRef<MDXEditorMethods>(null);
  // The wrapper element. Popups are placed inside it so they get the same dark colours as the editor.
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);
  // The last Markdown this editor reported or was given. Used to tell outside changes from its own.
  const lastKnown = useRef(value);

  // A lesson loaded from the server arrives after the editor is on screen, so push that text in
  useEffect(() => {
    if (value !== lastKnown.current) {
      lastKnown.current = value;
      editorRef.current?.setMarkdown(value);
    }
  }, [value]);

  return (
    <div ref={setWrapper} className="vh-mdx dark-theme" style={{ ["--vh-min-height" as string]: `${minHeight}px` }}>
      {wrapper && (
      <MDXEditor
        overlayContainer={wrapper}
        ref={editorRef}
        markdown={value}
        onChange={(markdown) => {
          lastKnown.current = markdown;
          onChange(markdown);
        }}
        className="dark-theme"
        contentEditableClassName="vh-mdx-content"
        plugins={[
          headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          markdownShortcutPlugin(),
          diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: "" }),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <UndoRedo />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <BoldItalicUnderlineToggles />
                <StrikeThroughSupSubToggles />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <InsertTable />
                <InsertThematicBreak />
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
      />
      )}
    </div>
  );
}
