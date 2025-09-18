"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation } from "@/config/routes";

export function SiteHeader() {
  const pathname = usePathname();
  const activePath =
    primaryNavigation.find(
      (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
    )?.path ?? "";

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{
        borderColor: "var(--border-color)",
        backgroundColor: "rgba(247, 244, 241, 0.95)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-lg"
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "var(--bg-primary)",
            }}
          >
            MO
          </span>
          <span className="hidden sm:inline">MOAI 바이브코딩</span>
        </Link>
        <nav
          className="hidden items-center gap-1 text-sm font-medium md:flex"
          style={{ color: "var(--text-secondary)" }}
        >
          {primaryNavigation.map((item) => {
            const isActive = activePath === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className="rounded-full px-4 py-2 transition-colors hover:bg-slate-200 hover:text-slate-900"
                style={{
                  backgroundColor: isActive
                    ? "var(--bg-tertiary)"
                    : "transparent",
                  color: isActive
                    ? "var(--accent-primary)"
                    : "var(--text-secondary)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex md:hidden">
          <select
            className="rounded-full px-4 py-2 text-sm outline-none ring-1"
            style={{
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-primary)",
              borderColor: "var(--border-color)",
            }}
            value={activePath}
            onChange={(event) => {
              const url = event.target.value;
              if (url) {
                window.location.href = url;
              }
            }}
          >
            <option value="">도구 선택</option>
            {primaryNavigation.map((item) => (
              <option key={item.path} value={item.path}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}

