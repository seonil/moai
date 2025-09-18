import Link from "next/link";
import type { ToolRoute } from "@/config/routes";

interface ToolCardProps {
  tool: ToolRoute;
  index: number;
}

export function ToolCard({ tool, index }: ToolCardProps) {
  return (
    <Link
      href={tool.path}
      className="group relative flex flex-col overflow-hidden rounded-3xl border p-6 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        borderColor: "var(--border-color)",
        backgroundColor: "var(--bg-secondary)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <div
        className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${tool.accent} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20`}
      />
      <div
        className="flex items-center justify-between text-xs uppercase tracking-widest"
        style={{ color: "var(--text-muted)" }}
      >
        <span>{tool.category}</span>
        <span className="font-semibold" style={{ color: "var(--text-muted)" }}>
          #{String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mt-4 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {tool.name}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
        {tool.summary}
      </p>
      <span
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold"
        style={{ color: "var(--accent-primary)" }}
      >
        도구 열기
        <svg
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}
