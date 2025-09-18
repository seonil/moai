export interface ToolRoute {
  slug: string;
  path: string;
  name: string;
  summary: string;
  accent: string;
  category: "visual" | "avatar" | "story" | "style";
}

export const toolRoutes: ToolRoute[] = [
  {
    slug: "image-editor",
    path: "/image-editor",
    name: "AI 이미지 에디터",
    summary:
      "브러시 없이도 보정·요소 제거·합성을 간단히 완성하는 올인원 에디터입니다.",
    accent: "from-emerald-500 to-teal-400",
    category: "visual",
  },
  {
    slug: "profile-photo",
    path: "/profile-photo",
    name: "AI 프로필 포토 스튜디오",
    summary:
      "조명·배경·의상을 바꿔 비즈니스와 SNS에 어울리는 프로필 사진을 만들어 줍니다.",
    accent: "from-sky-500 to-indigo-500",
    category: "visual",
  },
  {
    slug: "scenario-storyboard",
    path: "/scenario-storyboard",
    name: "AI 시나리오 이미지 생성기",
    summary:
      "텍스트/이미지를 분석해 발표용 장면 프롬프트와 스토리보드를 설계합니다.",
    accent: "from-slate-500 to-blue-500",
    category: "story",
  },
  {
    slug: "fashion-fitting",
    path: "/fashion-fitting",
    name: "AI 패션 가상 피팅룸",
    summary:
      "실루엣과 컬러를 골라 사진 속 착장만 바꿔주는 가상 스타일링 서비스입니다.",
    accent: "from-emerald-500 to-lime-400",
    category: "style",
  },
  {
    slug: "hair-couture",
    path: "/hair-couture",
    name: "AI 헤어 스타일 디자이너",
    summary:
      "스타일·컬러·참고 이미지를 조합해 새로운 헤어를 자연스럽게 합성합니다.",
    accent: "from-pink-500 to-fuchsia-500",
    category: "style",
  },
  {
    slug: "beard-studio",
    path: "/beard-studio",
    name: "AI 수염 시뮬레이터",
    summary: "얼굴형과 분위기에 맞는 수염 스타일을 초실감으로 합성합니다.",
    accent: "from-sky-500 to-cyan-400",
    category: "style",
  },
  {
    slug: "muscle-studio",
    path: "/muscle-studio",
    name: "AI 근육질 몸매 변신",
    summary: "목표 체형과 운동 히스토리에 맞춰 보디 프로필을 디자인합니다.",
    accent: "from-rose-500 to-orange-500",
    category: "style",
  },
  {
    slug: "global-transformer",
    path: "/global-transformer",
    name: "AI 글로벌 변신",
    summary: "국가·인종·분위기를 선택해 새로운 정체성으로 사진을 재구성합니다.",
    accent: "from-indigo-500 to-violet-500",
    category: "avatar",
  },
  {
    slug: "mbti-lab",
    path: "/mbti",
    name: "AI MBTI 성향 분석",
    summary:
      "간단한 질문에 답하면 16가지 MBTI 유형 중 당신의 협업 스타일을 분석해 드립니다.",
    accent: "from-purple-500 to-rose-500",
    category: "story",
  },
  {
    slug: "past-life",
    path: "/past-life",
    name: "AI 전생 탐험",
    summary: "감성 퀴즈를 통해 AI가 당신의 전생 콘셉트를 찾아줍니다.",
    accent: "from-amber-500 to-yellow-400",
    category: "story",
  },
];

export const primaryNavigation = toolRoutes.map(({ name, path }) => ({
  label: name,
  path,
}));
