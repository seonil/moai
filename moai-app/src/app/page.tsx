import { toolRoutes } from "@/config/routes";
import { ToolCard } from "@/components/shared/ToolCard";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
      <section className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]" style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'rgba(160, 144, 107, 0.1)', color: 'var(--accent-primary)' }}>
          Generative Lab
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl" style={{ color: 'var(--text-primary)' }}>
          MOAI 바이브코딩 생성형 AI 스튜디오
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-7" style={{ color: 'var(--text-secondary)' }}>
          여러 HTML 프로토타입으로 흩어져 있던 실험 도구를 하나의 React 앱으로 통합했습니다. 상단 내비게이션 혹은 아래 카드에서 원하는 서비스를 선택해 보세요.
        </p>
      </section>

      <section className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {toolRoutes.map((tool, index) => (
          <ToolCard key={tool.slug} tool={tool} index={index} />
        ))}
      </section>

      <section className="mt-20 rounded-3xl border p-10 text-left shadow-inner" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>배포 가이드</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
          Vercel에 배포할 때 <code className="rounded px-2 py-1 text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>NEXT_PUBLIC_GEMINI_API_KEY</code> 환경 변수를 설정하면 모든 이미지/텍스트 생성 기능이 동작합니다.
          로컬 개발 중에는 <code className="rounded px-2 py-1 text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>.env.local</code> 파일에 동일한 값을 넣어두세요.
        </p>
      </section>
    </div>
  );
}
