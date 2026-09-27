"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useId, useState } from "react";

function Mermaid({ code }: { code: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    import("mermaid").then(async ({ default: m }) => {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      m.initialize({ startOnLoad: false, theme: dark ? "dark" : "default", securityLevel: "strict" });
      try {
        const { svg } = await m.render(`m${id}`, code);
        if (alive) setSvg(svg);
      } catch { if (alive) setErr(true); }
    });
    return () => { alive = false; };
  }, [code, id]);
  if (err) return <pre>{code}</pre>;
  return <div className="my-4 flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-table:text-sm prose-quoteless">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...rest }) {
            const lang = /language-(\w+)/.exec(className || "")?.[1];
            if (lang === "mermaid") return <Mermaid code={String(children).trim()} />;
            return <code className={className} {...rest}>{children}</code>;
          },
          pre({ children }) {
            // Unwrap mermaid so it isn't inside <pre>
            const child = Array.isArray(children) ? children[0] : children;
            if ((child as any)?.props?.className?.includes("language-mermaid")) return <>{children}</>;
            return <pre>{children}</pre>;
          },
          blockquote({ children }) {
            return <blockquote className="rounded-r-lg border-l-4 border-brand-500 bg-brand-50 py-1 not-italic dark:bg-brand-900/30">{children}</blockquote>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
