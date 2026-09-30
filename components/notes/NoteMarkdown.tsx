"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// No @tailwindcss/typography in this project, so each element is styled here.
// react-markdown never renders raw HTML and its default urlTransform drops javascript:/data: links.
// react-markdown passes its AST `node` prop to overrides; keep it off the DOM element.
function strip<P extends { node?: unknown }>(props: P): Omit<P, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

const components: Components = {
  h1: (props) => <h1 className="mb-2 mt-4 text-xl font-bold text-brand-dark first:mt-0" {...strip(props)} />,
  h2: (props) => <h2 className="mb-2 mt-4 text-lg font-semibold text-brand-dark first:mt-0" {...strip(props)} />,
  h3: (props) => <h3 className="mb-1 mt-3 text-base font-semibold text-brand-dark first:mt-0" {...strip(props)} />,
  h4: (props) => <h4 className="mb-1 mt-3 text-sm font-semibold text-brand-dark first:mt-0" {...strip(props)} />,
  p: (props) => <p className="my-2 leading-6" {...strip(props)} />,
  a: (props) => <a className="text-brand-royal underline" target="_blank" rel="noopener noreferrer" {...strip(props)} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-6 [&.contains-task-list]:list-none [&.contains-task-list]:pl-1" {...strip(props)} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-6" {...strip(props)} />,
  li: (props) => <li className="[&>input]:mr-2" {...strip(props)} />,
  blockquote: (props) => <blockquote className="my-2 border-l-4 border-brand-royal/40 pl-3 italic text-gray-600" {...strip(props)} />,
  hr: () => <hr className="my-4 border-gray-300" />,
  pre: (props) => <pre className="my-2 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100 [&>code]:bg-transparent [&>code]:p-0" {...strip(props)} />,
  code: (props) => <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs" {...strip(props)} />,
  table: (props) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" {...strip(props)} />
    </div>
  ),
  th: (props) => <th className="border border-gray-300 bg-gray-100 px-2 py-1 font-semibold" {...strip(props)} />,
  td: (props) => <td className="border border-gray-300 px-2 py-1" {...strip(props)} />,
  img: ({ alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URLs, not optimizable
    <img alt={alt ?? ""} className="my-2 max-w-full rounded" {...strip(props)} />
  ),
};

export function NoteMarkdown({ content }: { content: string }) {
  if (!content.trim()) return <p className="italic text-gray-400">Nothing to preview yet.</p>;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
