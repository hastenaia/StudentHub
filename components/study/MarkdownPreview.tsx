"use client";

import * as React from "react";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Only these schemes become links; anything else (javascript:, data:, vbscript:…) renders as plain text.
// Runs on the already-escaped URL, so entity-encoded tricks like `java&#115;cript:` can't sneak past as a scheme.
const SAFE_URL = /^(https?:|mailto:)/i;

export function renderMarkdown(md: string): string {
  const escaped = escapeHtml(md);
  // Code blocks ``` ```
  let html = escaped.replace(/```([\s\S]*?)```/g, (_m, code) => `<pre class="rounded bg-gray-900 text-gray-100 p-3 text-xs overflow-auto"><code>${code}</code></pre>`);
  // Links [text](url) — swapped for placeholders first so inline code/bold/italic can't rewrite `_`/`*` inside the URL
  // (signed-URL tokens and sanitized PDF names contain them) and inject tags into the href.
  const links: string[] = [];
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, url: string) => {
    if (!SAFE_URL.test(url.trim())) return label;
    links.push(`<a href="${url.trim()}" target="_blank" rel="noopener noreferrer" class="text-brand-royal underline">${label}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });
  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-gray-100 px-1 py-0.5 text-xs font-mono">$1</code>');
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-brand-dark mt-3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-brand-dark mt-3">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-brand-dark mt-3">$1</h1>');
  // Bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
  // Italic *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');
  html = html.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => links[Number(i)] ?? "");
  // Unordered lists
  html = html.replace(/^\s*[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  // Ordered lists
  html = html.replace(/^\s*\d+\.\s(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  // Paragraphs — wrap lines not already in tags
  html = html
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (/^<(h[1-3]|pre|ul|ol|li|code|a)/.test(t)) return t;
      return `<p class="my-1 text-sm leading-relaxed text-gray-700">${t}</p>`;
    })
    .join("\n");
  // Wrap consecutive <li> in <ul> if not already
  html = html.replace(/(<li class="ml-4 list-disc">.*<\/li>\n?)+/g, (m) => `<ul class="my-2">${m}</ul>`);
  html = html.replace(/(<li class="ml-4 list-decimal">.*<\/li>\n?)+/g, (m) => `<ol class="my-2">${m}</ol>`);
  return html;
}

export function MarkdownPreview({ content }: { content: string }) {
  const html = React.useMemo(() => renderMarkdown(content || "*No content*"), [content]);
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}
