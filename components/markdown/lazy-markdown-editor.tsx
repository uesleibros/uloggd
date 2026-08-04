"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { MarkdownEditor as MarkdownEditorComponent } from "./markdown-editor";

type MarkdownEditorProps = ComponentProps<typeof MarkdownEditorComponent>;

function MarkdownEditorLoading() {
  return (
    <div className="md-editor md-editor-loading" aria-busy="true">
      <span className="sr-only">Carregando editor Markdown…</span>
      <div className="md-editor-loading-tabs" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="md-editor-loading-toolbar" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="md-editor-loading-stage" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

/**
 * Keeps CodeMirror out of the route bundle until an editing surface is
 * actually mounted. The small shell reserves the editor's space while that
 * one-time chunk is downloaded, avoiding a jump in the dialog or settings.
 */
export const MarkdownEditor = dynamic<MarkdownEditorProps>(
  () =>
    import("./markdown-editor").then((module) => module.MarkdownEditor),
  {
    ssr: false,
    loading: MarkdownEditorLoading,
  },
);
