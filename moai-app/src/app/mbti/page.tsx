"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  themeAccentButtonStyle,
  themeCardShadow,
  themeInsetStyle,
  themeMessageStyles,
  themeMutedTextStyle,
  themeOutlineButtonStyle,
  themePillStyles,
  themePrimaryTextStyle,
  themeSecondaryTextStyle,
  themeSurfaceStyle,
} from "@/styles/theme";

type Dimension = "EI" | "SN" | "TF" | "JP";

type AnswerOption = {
  label: string;
  helper: string;
  value: "first" | "second";
};

type Question = {
  id: string;
  title: string;
  dimension: Dimension;
  prompt: string;
  options: AnswerOption[];
};

const QUESTIONS: Question[] = [
  {
    id: "ei-1",
    title: "팀 브리핑",
    dimension: "EI",
    prompt: "새 프로젝트 킥오프 회의에서 나는…",
    options: [
      {
        label: "아이디어를 먼저 던지며 에너지를 끌어 올린다",
        helper: "모두가 적응하기 전에 분위기를 주도",
        value: "first",
      },
      {
        label: "묵묵히 듣다가 정리가 되면 의견을 보탠다",
        helper: "전체 흐름을 파악한 뒤 차분히 발언",
        value: "second",
      },
    ],
  },
  {
    id: "ei-2",
    title: "에너지 충전",
    dimension: "EI",
    prompt: "업무가 끝난 뒤 퇴근길에는…",
    options: [
      {
        label: "동료들과 번개 모임을 만들고 활력을 얻는다",
        helper: "사람들과 어울릴수록 힘이 난다",
        value: "first",
      },
      {
        label: "혼자만의 시간을 가지며 내일을 준비한다",
        helper: "고요함 속에서 생각을 정리",
        value: "second",
      },
    ],
  },
  {
    id: "sn-1",
    title: "정보 수집",
    dimension: "SN",
    prompt: "신규 기능 기획서를 볼 때 나는…",
    options: [
      {
        label: "사용자 데이터와 근거를 먼저 찾는다",
        helper: "현재 확인 가능한 팩트를 중시",
        value: "first",
      },
      {
        label: "미래 가능성과 확장 아이디어를 상상한다",
        helper: "패턴과 시나리오를 그려본다",
        value: "second",
      },
    ],
  },
  {
    id: "sn-2",
    title: "업무 방식",
    dimension: "SN",
    prompt: "새로운 업무를 맡으면…",
    options: [
      {
        label: "기존 사례와 체계부터 확인한다",
        helper: "과거 레퍼런스에서 배우기",
        value: "first",
      },
      {
        label: "완전히 새로운 접근을 실험한다",
        helper: "가능성을 탐색하며 혁신을 시도",
        value: "second",
      },
    ],
  },
  {
    id: "tf-1",
    title: "의사 결정",
    dimension: "TF",
    prompt: "갈등이 생겼을 때 나는…",
    options: [
      {
        label: "논리와 원칙을 기준으로 해결책을 찾는다",
        helper: "객관적인 기준을 세운다",
        value: "first",
      },
      {
        label: "관계와 감정을 배려하며 조율한다",
        helper: "모두의 마음을 살펴본다",
        value: "second",
      },
    ],
  },
  {
    id: "tf-2",
    title: "피드백",
    dimension: "TF",
    prompt: "동료의 산출물을 리뷰할 때…",
    options: [
      {
        label: "구체적인 개선 포인트를 빠르게 짚는다",
        helper: "정확한 피드백으로 성장 지원",
        value: "first",
      },
      {
        label: "수고와 감정을 먼저 공감해 준다",
        helper: "격려와 응원이 먼저",
        value: "second",
      },
    ],
  },
  {
    id: "jp-1",
    title: "스케줄 관리",
    dimension: "JP",
    prompt: "마감이 일주일 남았을 때 나는…",
    options: [
      {
        label: "세부 계획을 나누고 바로 실행한다",
        helper: "체크리스트로 일정 관리",
        value: "first",
      },
      {
        label: "전체 맥락을 보며 융통성 있게 진행한다",
        helper: "상황에 따라 우선순위를 조정",
        value: "second",
      },
    ],
  },
  {
    id: "jp-2",
    title: "협업 선호",
    dimension: "JP",
    prompt: "다음 스프린트를 준비할 때…",
    options: [
      {
        label: "정해진 역할과 프로세스를 선호한다",
        helper: "명확한 규칙이 편안",
        value: "first",
      },
      {
        label: "열린 구조 속에서 자유롭게 정리한다",
        helper: "유연한 대응이 장점",
        value: "second",
      },
    ],
  },
];

const DIMENSION_LETTERS: Record<Dimension, [string, string]> = {
  EI: ["E", "I"],
  SN: ["S", "N"],
  TF: ["T", "F"],
  JP: ["J", "P"],
};

const TRAIT_DESCRIPTIONS: Record<string, string> = {
  E: "외향형 – 팀 전체를 에너지로 이끄는 촉매 역할",
  I: "내향형 – 집중력과 깊이 있는 통찰로 팀을 안정화",
  S: "감각형 – 현재 데이터와 현실적인 계획을 강조",
  N: "직관형 – 가능성과 패턴을 연결하며 혁신을 제안",
  T: "사고형 – 논리적인 구조와 분명한 기준을 제시",
  F: "감정형 – 구성원의 감정과 협업 분위기를 조율",
  J: "판단형 – 정돈된 프로세스와 일정 관리에 강점",
  P: "인식형 – 유연성과 임기응변으로 새로운 길 탐색",
};

const MBTI_OVERVIEW: Record<string, { title: string; summary: string }> = {
  ENTP: {
    title: "아이디어 탐험가",
    summary:
      "새로운 문제를 발견하고 참신한 해결책을 빠르게 제시합니다. 다만 마무리는 함께 챙겨야 합니다.",
  },
  ENFP: {
    title: "분위기 메이커",
    summary:
      "팀의 긴장을 풀어주고 사람 중심의 협업을 주도합니다. 실행 계획을 구체화해 주면 더 빛납니다.",
  },
  ESTJ: {
    title: "프로젝트 매니저",
    summary:
      "목표를 명확히 세우고 추진력 있게 이끌어 갑니다. 강한 추진력에 유연성을 더하면 완벽합니다.",
  },
  INFJ: {
    title: "통찰형 코치",
    summary:
      "구성원의 가능성을 발견하고 사려 깊은 조언을 전합니다. 명확한 의사결정 파트너가 있으면 좋습니다.",
  },
  INTP: {
    title: "분석형 전략가",
    summary:
      "복잡한 문제를 쪼개 구조화하고 논리적으로 해법을 찾습니다. 실행 파트너와 함께할 때 더 강력해집니다.",
  },
  ISFP: {
    title: "감성 크리에이터",
    summary:
      "섬세한 관찰과 감각으로 사용자가 사랑할 결과물을 만듭니다. 일정 관리는 동료가 함께 챙겨주세요.",
  },
};

const DIMENSION_ORDER: Dimension[] = ["EI", "SN", "TF", "JP"];

export default function MbtiLabPage() {
  const [answers, setAnswers] = useState<Record<string, AnswerOption["value"]>>(
    {},
  );
  const [isSubmitted, setIsSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === QUESTIONS.length;
  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);

  const result = useMemo(() => {
    if (!isComplete) return null;

    const letterScores: Record<string, number> = {
      E: 0,
      I: 0,
      S: 0,
      N: 0,
      T: 0,
      F: 0,
      J: 0,
      P: 0,
    };

    for (const question of QUESTIONS) {
      const selected = answers[question.id];
      if (!selected) continue;
      const [first, second] = DIMENSION_LETTERS[question.dimension];
      if (selected === "first") {
        letterScores[first] += 1;
      } else {
        letterScores[second] += 1;
      }
    }

    const type = DIMENSION_ORDER.map((dimension) => {
      const [first, second] = DIMENSION_LETTERS[dimension];
      return letterScores[first] >= letterScores[second] ? first : second;
    }).join("");

    const overview = MBTI_OVERVIEW[type] ?? {
      title: `${type} 유형`,
      summary:
        "당신만의 협업 장점과 에너지가 돋보이는 유형입니다. 팀 동료와 강점을 공유해 보세요.",
    };

    const traits = type.split("").map((letter) => ({
      letter,
      description: TRAIT_DESCRIPTIONS[letter],
      score: letterScores[letter],
    }));

    return { type, overview, traits };
  }, [answers, isComplete]);

  const handleSelect = (questionId: string, value: AnswerOption["value"]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setIsSubmitted(false);
  };

  const handleReset = () => {
    setAnswers({});
    setIsSubmitted(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section
        className="rounded-3xl border p-8 md:p-12"
        style={{ ...themeSurfaceStyle, boxShadow: themeCardShadow }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]"
              style={{
                borderColor: "var(--accent-primary)",
                backgroundColor: "rgba(160, 144, 107, 0.12)",
                color: "var(--accent-primary)",
              }}
            >
              Collaboration MBTI
            </div>
            <h1
              className="text-3xl font-bold md:text-4xl"
              style={themePrimaryTextStyle}
            >
              팀워크 MBTI 성향 분석
            </h1>
            <p className="text-sm leading-7" style={themeSecondaryTextStyle}>
              여덟 가지 질문에 답하면 16가지 MBTI 유형 중 당신의 협업 스타일을
              분석해 드립니다. 결과는 개인 강점과 팀에서 기대되는 역할에 초점을
              맞춰 설명됩니다.
            </p>
          </div>
          <div
            className="rounded-2xl border px-5 py-4 text-sm"
            style={{
              ...themeSurfaceStyle,
              backgroundColor: "var(--bg-tertiary)",
            }}
          >
            <p style={themeSecondaryTextStyle}>완료율</p>
            <p className="text-2xl font-semibold" style={themePrimaryTextStyle}>
              {progress}%
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  backgroundColor: "var(--accent-primary)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
        <section className="space-y-6">
          {QUESTIONS.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-3xl border p-6"
              style={themeSurfaceStyle}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span
                    className="text-xs font-semibold uppercase"
                    style={themeMutedTextStyle}
                  >
                    Q{index + 1}. {question.title}
                  </span>
                  <p
                    className="mt-2 text-base font-semibold"
                    style={themePrimaryTextStyle}
                  >
                    {question.prompt}
                  </p>
                </div>
                <span className="text-xs" style={themeMutedTextStyle}>
                  {DIMENSION_LETTERS[question.dimension].join(" / ")}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {question.options.map((option) => {
                  const isActive = answers[question.id] === option.value;
                  return (
                    <button
                      key={option.label}
                      className="w-full rounded-2xl border px-4 py-3 text-left transition"
                      style={
                        isActive
                          ? themePillStyles.active
                          : themeOutlineButtonStyle
                      }
                      onClick={() => handleSelect(question.id, option.value)}
                    >
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span
                        className="mt-1 block text-xs"
                        style={themeMutedTextStyle}
                      >
                        {option.helper}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={themeAccentButtonStyle}
              onClick={() => setIsSubmitted(true)}
              disabled={!isComplete}
            >
              결과 확인하기
            </button>
            <button
              className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-80"
              style={themeOutlineButtonStyle}
              onClick={handleReset}
            >
              다시 시작
            </button>
          </div>
          <AnimatePresence>
            {isSubmitted && !isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border px-4 py-3 text-sm"
                style={themeMessageStyles.info}
              >
                모든 문항에 답하면 결과가 표시됩니다.
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border p-6" style={themeSurfaceStyle}>
            <h2 className="text-lg font-semibold" style={themePrimaryTextStyle}>
              MBTI 유형 결과
            </h2>
            <AnimatePresence mode="wait">
              {isComplete && result ? (
                <motion.div
                  key={result.type}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="mt-4 space-y-5"
                >
                  <div>
                    <span
                      className="text-xs font-semibold uppercase"
                      style={themeMutedTextStyle}
                    >
                      당신의 협업 유형
                    </span>
                    <p
                      className="mt-2 text-3xl font-bold"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {result.type}
                    </p>
                    <p
                      className="mt-3 text-sm leading-6"
                      style={themeSecondaryTextStyle}
                    >
                      <strong style={themePrimaryTextStyle}>
                        {result.overview.title}
                      </strong>
                      <br />
                      {result.overview.summary}
                    </p>
                  </div>
                  <div
                    className="rounded-2xl border p-4"
                    style={themeInsetStyle}
                  >
                    <p
                      className="text-xs font-semibold uppercase"
                      style={themeMutedTextStyle}
                    >
                      핵심 키워드
                    </p>
                    <ul
                      className="mt-3 space-y-2 text-sm"
                      style={themeSecondaryTextStyle}
                    >
                      {result.traits.map((trait) => (
                        <li key={trait.letter}>
                          <span
                            className="font-semibold"
                            style={themePrimaryTextStyle}
                          >
                            {trait.letter}
                          </span>{" "}
                          – {trait.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="placeholder"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-4 text-sm"
                  style={themeMutedTextStyle}
                >
                  질문에 답하면 이곳에 결과가 표시됩니다.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-3xl border p-6" style={themeSurfaceStyle}>
            <h3
              className="text-base font-semibold"
              style={themePrimaryTextStyle}
            >
              해석 가이드
            </h3>
            <ul
              className="mt-3 space-y-3 text-sm"
              style={themeSecondaryTextStyle}
            >
              <li>
                • 유형은 절대적인 성격 판결이 아니라 협업 시 나타나는 선호도를
                표시합니다.
              </li>
              <li>
                • 답변이 비슷하게 갈렸다면, 두 가지 방향을 모두 활용할 수 있다는
                의미로 이해하세요.
              </li>
              <li>
                • 팀 동료와 결과를 공유하고 서로의 강점을 어떻게 연결할지 대화를
                나눠보세요.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
