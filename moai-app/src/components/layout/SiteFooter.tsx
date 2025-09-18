import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      className="border-t"
      style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}
    >
      <div
        className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between"
        style={{ color: "var(--text-muted)" }}
      >
        <div>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
            MOAI 바이브코딩 랩
          </p>
          <p className="mt-1 max-w-xl leading-relaxed">
            생성형 AI 실험실에서 만든 프로토타입 도구 모음입니다. 모든 결과물은 연구 및 학습 목적이며, 상업적 사용 전 반드시 가이드를 검토하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/"
            className="transition-colors hover:text-slate-900"
            style={{ color: "var(--text-muted)" }}
          >
            홈
          </Link>
          <Link
            href="/scenario-storyboard"
            className="transition-colors hover:text-slate-900"
            style={{ color: "var(--text-muted)" }}
          >
            시나리오 생성기
          </Link>
          <Link
            href="/image-editor"
            className="transition-colors hover:text-slate-900"
            style={{ color: "var(--text-muted)" }}
          >
            이미지 에디터
          </Link>
        </div>
      </div>
    </footer>
  );
}
