"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";

import { motion } from "framer-motion";

import { generateGeminiImage } from "@/lib/gemini";

import {
  themeAccentButtonStyle,
  themeCardShadow,
  themeInsetStyle,
  themeLoaderOverlayStyle,
  themeMessageStyles,
  themeMutedTextStyle,
  themeOutlineButtonStyle,
  themePillStyles,
  themePrimaryTextStyle,
  themeSecondaryTextStyle,
  themeSurfaceStyle,
} from "@/styles/theme";

interface QuizAnswer {
  text: string;

  tags: string[];
}

interface QuizQuestion {
  question: string;

  answers: QuizAnswer[];
}

interface PastLifeProfile {
  id: string;

  title: string;

  description: string;

  affirmation: string;

  tags: string[];

  imagePrompt: (gender: "female" | "male") => string;
}

const quiz: QuizQuestion[] = [
  {
    question: "밤길에서 빛나는 문을 만났습니다. 어떤 문을 열어볼까요?",

    answers: [
      { text: "자개가 반짝이는 전통 목문", tags: ["heritage", "intellectual"] },

      {
        text: "스테인드글라스로 뒤덮인 성당의 아치",
        tags: ["artistic", "spiritual"],
      },

      { text: "미래 도시의 네온 게이트", tags: ["innovator", "adventurous"] },

      { text: "푸른 덩굴이 감싼 비밀의 돌문", tags: ["nature", "empathetic"] },
    ],
  },

  {
    question: "과거의 내가 가장 소중히 여긴 것은?",

    answers: [
      { text: "사람과 사람을 이어주는 신뢰", tags: ["leader", "social"] },

      {
        text: "진리를 탐구하는 고요한 시간",
        tags: ["intellectual", "solitary"],
      },

      { text: "예술로 남긴 흔적과 영감", tags: ["artistic"] },

      { text: "모험과 자유, 낯선 땅의 바람", tags: ["adventurous", "freedom"] },
    ],
  },

  {
    question: "아래 중 나를 가장 닮은 풍경은?",

    answers: [
      { text: "장엄한 도서관의 사다리와 열람실", tags: ["intellectual"] },

      { text: "바람을 가르며 달리는 초원의 전차", tags: ["adventurous"] },

      { text: "캔버스와 향료가 가득한 공방", tags: ["artistic", "sensory"] },

      {
        text: "별빛이 내려앉은 사막의 오아시스",
        tags: ["spiritual", "solitary"],
      },
    ],
  },

  {
    question: "어려움 앞에서 나는...?",

    answers: [
      {
        text: "자료를 모으고 전략을 세운다",
        tags: ["intellectual", "innovator"],
      },

      { text: "사람을 모아 팀을 만든다", tags: ["leader", "social"] },

      { text: "바로 현장으로 뛰어들어 해결한다", tags: ["adventurous"] },

      { text: "감각과 직관으로 길을 찾는다", tags: ["artistic", "spiritual"] },
    ],
  },

  {
    question: "지금의 나에게 필요한 덕목은?",

    answers: [
      { text: "새로운 기술과 지식", tags: ["innovator", "intellectual"] },

      { text: "사람과의 조화로운 협력", tags: ["social", "empathetic"] },

      { text: "자신을 믿는 용기", tags: ["freedom", "adventurous"] },

      { text: "감성을 일깨우는 여유", tags: ["artistic", "spiritual"] },
    ],
  },
];

const profiles: PastLifeProfile[] = [
  {
    id: "scholar",

    title: "별을 읽는 조선의 학자",

    description:
      "새벽 제일 먼저 서재의 창호를 열고 하늘을 살피던 학자였습니다. 세상사를 기록하며 올곧은 판단으로 사람들을 돕던 이지요.",

    affirmation:
      "선명한 통찰은 여전히 당신 안에 남아 있습니다. 당신의 말은 많은 이에게 기준이 됩니다.",

    tags: ["intellectual", "solitary", "heritage"],

    imagePrompt: (gender) =>
      `A hyper-detailed portrait of a Joseon dynasty ${gender} scholar wearing white dopo and a black gat, surrounded by scrolls and star maps, lit by warm candlelight, cinematic realism`,
  },

  {
    id: "artisan",

    title: "보라빛 향기를 남긴 궁중 향공",

    description:
      "궁중의 비밀스러운 향을 조합하던 향공이었습니다. 향료와 꽃, 시간을 섬세하게 다루어 왕실의 순간을 기록했죠.",

    affirmation:
      "세상에 없는 아름다움을 만들어내는 감각이 지금도 살아 있습니다. 당신의 손끝은 이야기를 품습니다.",

    tags: ["artistic", "sensory", "empathetic"],

    imagePrompt: (gender) =>
      `A cinematic illustration of a ${gender} artisan blending royal perfumes in a Joseon palace atelier, glass bottles and flowers surrounding them, soft purple and gold palette`,
  },

  {
    id: "explorer",

    title: "끝없는 초원을 누비던 초원의 방랑자",

    description:
      "당신은 말을 타고 새로운 길을 개척하던 여행자였습니다. 별과 바람을 길잡이 삼아 영토를 넓히고 사람들을 이끌었죠.",

    affirmation:
      "움직임이 곧 생명인 사람입니다. 당신의 변화와 도전은 주변 사람에게 용기를 줍니다.",

    tags: ["adventurous", "leader", "freedom"],

    imagePrompt: (gender) =>
      `A realistic painting of a ${gender} nomad riding a horse across the Mongolian steppe at sunrise, wearing traditional deel and holding a fluttering banner`,
  },

  {
    id: "inventor",

    title: "증기와 별빛을 연구한 발명가",

    description:
      "새로운 도구와 기계를 만들며 도시를 변화시킨 발명가였습니다. 사람들의 삶을 바꾸는 해결책을 찾아냈죠.",

    affirmation:
      "번뜩이는 아이디어는 우연이 아닙니다. 당신은 체계와 창조를 동시에 다루는 사람입니다.",

    tags: ["innovator", "intellectual", "social"],

    imagePrompt: (gender) =>
      `A detailed concept art of a ${gender} steampunk inventor in a workshop full of gears and glowing blueprints, dynamic warm lighting, realistic`,
  },

  {
    id: "oracle",

    title: "사막 별빛을 읽던 나이트 오라클",

    description:
      "고요한 사막에서 별의 언어를 해독하며, 길 잃은 이들에게 방향을 알려주던 신비로운 안내자였습니다.",

    affirmation:
      "당신의 직관은 사람을 살리는 나침반입니다. 조용한 시간 속에서 해답을 발견합니다.",

    tags: ["spiritual", "solitary", "empathetic"],

    imagePrompt: (gender) =>
      `A cinematic portrait of a ${gender} oracle standing under a star-filled desert sky, holding a glowing astrolabe, long flowing robes, ethereal lighting`,
  },
];

function resolveProfile(tagSelections: string[]): PastLifeProfile {
  const scoreMap = new Map<string, number>();

  for (const tag of tagSelections) {
    scoreMap.set(tag, (scoreMap.get(tag) ?? 0) + 1);
  }

  let bestProfile = profiles[0];

  let bestScore = -Infinity;

  for (const profile of profiles) {
    const score =
      profile.tags.reduce((sum, tag) => sum + (scoreMap.get(tag) ?? 0), 0) +
      Math.random() * 0.1;

    if (score > bestScore) {
      bestScore = score;

      bestProfile = profile;
    }
  }

  return bestProfile;
}

export default function PastLifePage() {
  const [step, setStep] = useState(0);

  const [answers, setAnswers] = useState<string[]>([]);

  const [gender, setGender] = useState<"female" | "male">("female");

  const [profile, setProfile] = useState<PastLifeProfile | null>(null);

  const [portrait, setPortrait] = useState<string | null>(null);

  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(
    () => Math.round(((profile ? quiz.length : step) / quiz.length) * 100),

    [profile, step],
  );

  const currentQuestion = quiz[step];

  const handleAnswer = (answer: QuizAnswer) => {
    const updated = [...answers, ...answer.tags];

    if (step === quiz.length - 1) {
      const resolved = resolveProfile(updated);

      setProfile(resolved);

      setAnswers(updated);
    } else {
      setAnswers(updated);

      setStep((prev) => prev + 1);
    }
  };

  const restart = () => {
    setStep(0);

    setAnswers([]);

    setProfile(null);

    setPortrait(null);

    setError(null);
  };

  const generatePortrait = async () => {
    if (!profile) return;

    try {
      setIsLoadingImage(true);

      setError(null);

      const payload = {
        contents: [
          {
            parts: [{ text: profile.imagePrompt(gender) }],
          },
        ],
      } as const;

      const image = await generateGeminiImage(payload, { retries: 2 });

      setPortrait(image);
    } catch (err) {
      console.error(err);

      setError("이미지를 생성하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setIsLoadingImage(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <section
        className="mb-10 rounded-3xl border p-8"
        style={{ ...themeSurfaceStyle, boxShadow: themeCardShadow }}
      >
        <h1
          className="text-3xl font-bold md:text-4xl"
          style={themePrimaryTextStyle}
        >
          AI 전생 탐험
        </h1>

        <p className="mt-3 text-sm leading-6" style={themeSecondaryTextStyle}>
          감성 퀴즈를 통해 숨겨진 전생의 기억을 찾아드립니다. 마지막에는 AI가
          전생의 모습을 그려주는 일러스트도 받을 수 있어요.
        </p>
      </section>

      {!profile ? (
        <div className="rounded-3xl border p-6" style={themeSurfaceStyle}>
          <div
            className="flex items-center justify-between text-xs uppercase tracking-[0.3em]"
            style={{ color: themeMutedTextStyle.color }}
          >
            <span>Question {step + 1}</span>

            <span>{progress}%</span>
          </div>

          <div className="mt-6 space-y-6">
            <motion.h2
              key={currentQuestion.question}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-semibold"
              style={themePrimaryTextStyle}
            >
              {currentQuestion.question}
            </motion.h2>

            <div className="grid gap-3 md:grid-cols-2">
              {currentQuestion.answers.map((answer) => (
                <motion.button
                  key={answer.text}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswer(answer)}
                  className="rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition hover:opacity-90"
                  style={{
                    ...themeInsetStyle,
                    color: themePrimaryTextStyle.color,
                  }}
                >
                  {answer.text}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div
            className="rounded-3xl border p-6 md:p-10"
            style={{ ...themeSurfaceStyle, boxShadow: themeCardShadow }}
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="flex-1 space-y-4">
                <div
                  className="flex items-center gap-3 text-xs uppercase tracking-[0.3em]"
                  style={{ color: themeMutedTextStyle.color }}
                >
                  <span>당신의 전생</span>

                  <span
                    className="h-px flex-1"
                    style={{ backgroundColor: "var(--border-color)" }}
                  />
                </div>

                <h2
                  className="text-3xl font-bold"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {profile.title}
                </h2>

                <p
                  className="text-sm leading-7"
                  style={themeSecondaryTextStyle}
                >
                  {profile.description}
                </p>

                <p
                  className="rounded-2xl border p-4 text-sm"
                  style={{
                    borderColor: "var(--accent-primary)",
                    backgroundColor: "var(--accent-secondary)",
                    color: themePrimaryTextStyle.color,
                    opacity: 0.95,
                  }}
                >
                  {profile.affirmation}
                </p>

                <div
                  className="flex flex-wrap gap-2 text-xs"
                  style={{ color: themeMutedTextStyle.color }}
                >
                  {profile.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border px-3 py-1"
                      style={{
                        borderColor: "var(--border-color)",
                        color: themeMutedTextStyle.color,
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="md:w-64">
                <div
                  className="flex gap-2 text-xs"
                  style={{ color: themeMutedTextStyle.color }}
                >
                  <button
                    className="flex-1 rounded-full border px-3 py-2 font-semibold transition hover:opacity-90"
                    style={
                      gender === "female"
                        ? themePillStyles.active
                        : themeOutlineButtonStyle
                    }
                    onClick={() => setGender("female")}
                  >
                    여성 버전
                  </button>

                  <button
                    className="flex-1 rounded-full border px-3 py-2 font-semibold transition hover:opacity-90"
                    style={
                      gender === "male"
                        ? themePillStyles.active
                        : themeOutlineButtonStyle
                    }
                    onClick={() => setGender("male")}
                  >
                    남성 버전
                  </button>
                </div>

                <div className="mt-4 flex flex-col items-center gap-3">
                  <div
                    className="relative aspect-square w-full overflow-hidden rounded-2xl border"
                    style={themeInsetStyle}
                  >
                    {isLoadingImage && (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs"
                        style={{
                          ...themeLoaderOverlayStyle,
                          color: themeSecondaryTextStyle.color,
                        }}
                      >
                        <div
                          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                          style={{
                            borderColor: "var(--accent-primary)",
                            borderTopColor: "transparent",
                            opacity: 0.5,
                          }}
                        />

                        <span style={themeSecondaryTextStyle}>
                          전생 초상화를 그리는 중...
                        </span>
                      </div>
                    )}

                    {portrait ? (
                      <img
                        src={portrait}
                        alt="전생 초상화"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-full items-center justify-center text-xs"
                        style={themeMutedTextStyle}
                      >
                        결과를 이미지로 만나보세요.
                      </span>
                    )}
                  </div>

                  <button
                    className="w-full rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    style={themeAccentButtonStyle}
                    onClick={generatePortrait}
                    disabled={isLoadingImage}
                  >
                    전생 일러스트 생성
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="rounded-2xl border p-4 text-sm"
              style={themeMessageStyles.error}
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <button
              className="rounded-full border px-5 py-2 font-semibold transition hover:opacity-90"
              style={themeOutlineButtonStyle}
              onClick={restart}
            >
              다시 테스트하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
