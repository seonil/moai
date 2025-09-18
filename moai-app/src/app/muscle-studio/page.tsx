"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { downloadBase64Image, extractBase64Payload, readFileAsDataURL } from "@/lib/file";
import { generateGeminiImage } from "@/lib/gemini";
import { motion, AnimatePresence } from "framer-motion";
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

type FocusArea = "전신 밸런스" | "가슴" | "등" | "어깨" | "팔" | "하체" | "복근";

type TanningLevel = "기본" | "데일리 브론즈" | "헬스장 구릿빛" | "컴페티션" | "슈퍼 다크";

interface MuscleStyle {
  label: string;
  prompt: string;
  description: string;
}

const MUSCLE_STYLES: MuscleStyle[] = [
  {
    label: "핏 모델",
    prompt: "a lean fitness model physique with slim muscle definition",
    description: "슬림하지만 선명한 선이 살아있는 모델 체형",
  },
  {
    label: "애슬레틱",
    prompt: "an athletic toned physique with balanced upper and lower body",
    description: "균형 잡힌 근육과 탄탄한 실루엣",
  },
  {
    label: "크로스핏",
    prompt: "a functional crossfit athlete physique with dense muscle mass",
    description: "전신이 단단하게 발달한 크로스핏 체형",
  },
  {
    label: "머슬핏",
    prompt: "a muscular fitness physique with sharp separation",
    description: "명확한 분리도와 굵직한 근육의 머슬핏 스타일",
  },
  {
    label: "보디빌더",
    prompt: "a professional bodybuilder physique with extreme definition and vascularity",
    description: "대회 준비 수준의 극강 근육",
  },
  {
    label: "파워빌더",
    prompt: "a powerbuilding physique with thick mass and heavy strength",
    description: "거대한 부피감과 파워풀한 인상",
  },
];

const FOCUS_AREAS: FocusArea[] = [
  "전신 밸런스",
  "가슴",
  "등",
  "어깨",
  "팔",
  "하체",
  "복근",
];

const TANNING_OPTIONS: Record<TanningLevel, string> = {
  기본: "자연스러운 피부 톤을 유지합니다.",
  "데일리 브론즈": "햇볕에 살짝 그을린 건강한 브론즈 톤으로 표현합니다.",
  "헬스장 구릿빛": "헬스장 조명에 어울리는 구릿빛 피부를 연출합니다.",
  컴페티션: "보디빌딩 대회용 프로 탄닝처럼 선명한 색감을 적용합니다.",
  "슈퍼 다크": "극한의 다크 탄닝으로 근육선을 극대화합니다.",
};

function buildPrompt(options: {
  style: MuscleStyle;
  focusAreas: FocusArea[];
  tanning: TanningLevel;
}) {
  const focusText = options.focusAreas.filter((area) => area !== "전신 밸런스");
  const focusDescription = focusText.length
    ? ` Emphasise the ${focusText.join(", ")} area${focusText.length > 1 ? "s" : ""} while preserving natural proportions.`
    : " Maintain overall symmetry.";

  const tanningDescription =
    options.tanning === "기본"
      ? " Keep the original skin tone."
      : ` Apply ${options.tanning} tanning effect so that ${TANNING_OPTIONS[options.tanning]}`;

  return `You are a physique retouch artist. Transform ONLY the body of the person into ${options.style.prompt}. Preserve their face, identity, hairstyle, clothing, background and lighting exactly as in the reference photo.${focusDescription}${tanningDescription} The final result must stay photorealistic without any painterly artifacts.`;
}

export default function MuscleStudioPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<MuscleStyle | null>(null);
  const [focusAreas, setFocusAreas] = useState<Set<FocusArea>>(new Set(["전신 밸런스"]));
  const [tanning, setTanning] = useState<TanningLevel>("기본");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isReady = Boolean(sourceImage && selectedStyle);

  const promptPreview = useMemo(() => {
    if (!isReady || !selectedStyle) return "";
    return buildPrompt({
      style: selectedStyle,
      focusAreas: Array.from(focusAreas),
      tanning,
    });
  }, [focusAreas, isReady, selectedStyle, tanning]);

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setSourceImage(dataUrl);
      setResultImage(null);
      setError(null);
      setStatus("이미지 업로드 완료. 원하는 체형을 선택하세요.");
    } catch {
      setError("이미지를 불러오지 못했습니다.");
    }
  };

  const toggleFocusArea = (area: FocusArea) => {
    setFocusAreas((prev) => {
      const next = new Set(prev);
      if (area === "전신 밸런스") {
        return new Set(["전신 밸런스"]);
      }
      if (next.has(area)) {
        next.delete(area);
      } else {
        next.add(area);
        next.delete("전신 밸런스");
      }
      if (next.size === 0) {
        next.add("전신 밸런스");
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!isReady || !selectedStyle || !sourceImage) {
      setError("이미지와 근육 스타일을 먼저 선택해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setStatus(`${selectedStyle.label} 체형으로 변환 중입니다...`);

      const prompt = buildPrompt({
        style: selectedStyle,
        focusAreas: Array.from(focusAreas),
        tanning,
      });

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/png", data: extractBase64Payload(sourceImage) } },
            ],
          },
        ],
        generationConfig: { responseModalities: ["IMAGE"] },
      } as const;

      const generated = await generateGeminiImage(payload, { retries: 3 });
      setResultImage(generated);
      setStatus("새로운 몸매가 완성되었습니다!");
    } catch (generationError) {
      console.error(generationError);
      setError(
        generationError instanceof Error
          ? generationError.message
          : "이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const feedback = error ?? status;
  const feedbackStyle = error
    ? themeMessageStyles.error
    : status
    ? themeMessageStyles.success
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section
        className="mb-10 rounded-3xl border p-8 shadow-lg"
        style={{ ...themeSurfaceStyle, boxShadow: themeCardShadow }}
      >
        <h1 className="text-3xl font-bold md:text-4xl" style={themePrimaryTextStyle}>
          AI 근육질 몸매 변신
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6" style={themeSecondaryTextStyle}>
          체형을 바꾸고 싶지만 바로 결과가 궁금할 때, 업로드한 사진을 기반으로 이상적인 근육 밸런스를 시뮬레이션합니다. 스타일과 강조 부위를 조합해 나만의 보디 프로필을 완성하세요.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[440px,1fr]">
        <div className="flex flex-col gap-6 rounded-3xl border p-6" style={themeSurfaceStyle}>
          <div className="space-y-3">
            <label className="text-sm font-semibold" style={themePrimaryTextStyle}>
              1. 현재 사진 업로드
            </label>
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition hover:opacity-95"
              style={{ ...themeInsetStyle, color: themeMutedTextStyle.color }}
            >
              <input type="file" className="hidden" accept="image/*" onChange={(event) => handleUpload(event.target.files)} />
              <svg
                className="h-10 w-10"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                style={{ color: "var(--accent-primary)" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 11.25 12 6.75m0 0 4.5 4.5M12 6.75v10.5" />
              </svg>
              <span className="text-sm font-semibold" style={themePrimaryTextStyle}>
                사진 선택
              </span>
              <span className="text-xs" style={themeMutedTextStyle}>
                정면 또는 45도 각도의 상반신 사진을 추천합니다.
              </span>
            </label>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider" style={themeMutedTextStyle}>
              근육 스타일
            </span>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {MUSCLE_STYLES.map((style) => {
                const isActive = selectedStyle?.label === style.label;
                return (
                  <button
                    key={style.label}
                    onClick={() => setSelectedStyle(style)}
                    className="flex flex-col gap-1 rounded-2xl border px-4 py-3 text-left text-sm transition hover:opacity-90"
                    style={isActive ? themePillStyles.active : themeOutlineButtonStyle}
                  >
                    <span className="font-semibold">{style.label}</span>
                    <span style={themeMutedTextStyle}>{style.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider" style={themeMutedTextStyle}>
              강조 부위
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {FOCUS_AREAS.map((area) => {
                const selected = focusAreas.has(area);
                return (
                  <button
                    key={area}
                    onClick={() => toggleFocusArea(area)}
                    className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                    style={selected ? themePillStyles.active : themeOutlineButtonStyle}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider" style={themeMutedTextStyle}>
              피부 톤
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(TANNING_OPTIONS) as TanningLevel[]).map((level) => {
                const isActive = tanning === level;
                return (
                  <button
                    key={level}
                    onClick={() => setTanning(level)}
                    className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                    style={isActive ? themePillStyles.active : themeOutlineButtonStyle}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs" style={themeMutedTextStyle}>
              {TANNING_OPTIONS[tanning]}
            </p>
          </div>

          <button
            className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={themeAccentButtonStyle}
            onClick={handleGenerate}
            disabled={!isReady || isLoading}
          >
            {isLoading ? "보정 중..." : "근육 변환 실행"}
          </button>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border px-4 py-3 text-sm"
                style={feedbackStyle}
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-3xl border p-6" style={themeSurfaceStyle}>
            <h3 className="text-base font-semibold" style={themePrimaryTextStyle}>
              원본
            </h3>
            <div
              className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed"
              style={themeInsetStyle}
            >
              {sourceImage ? (
                <img src={sourceImage} alt="원본" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm" style={themeMutedTextStyle}>
                  사진을 업로드하면 미리보기됩니다.
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border p-6" style={themeSurfaceStyle}>
            <h3 className="text-base font-semibold" style={themePrimaryTextStyle}>
              결과
            </h3>
            <div
              className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed"
              style={themeInsetStyle}
            >
              {isLoading && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                  style={themeLoaderOverlayStyle}
                >
                  <div
                    className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
                    style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent", opacity: 0.5 }}
                  />
                  <span className="text-xs" style={themeSecondaryTextStyle}>
                    체형을 재구성하는 중...
                  </span>
                </div>
              )}
              {resultImage ? (
                <img src={resultImage} alt="근육 변환" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm" style={themeMutedTextStyle}>
                  근육 스타일을 선택하고 실행해 보세요.
                </span>
              )}
            </div>
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={resultImage ? themeAccentButtonStyle : themeOutlineButtonStyle}
              disabled={!resultImage || isLoading}
              onClick={() =>
                resultImage && downloadBase64Image(resultImage, "moai-muscle-studio.png")
              }
            >
              결과 다운로드
            </button>
          </div>
          {promptPreview && (
            <motion.pre
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 whitespace-pre-wrap rounded-3xl border p-6 text-xs leading-6"
              style={{ ...themeSurfaceStyle, backgroundColor: "var(--bg-tertiary)" }}
            >
              {promptPreview}
            </motion.pre>
          )}
        </div>
      </div>
    </div>
  );
}
