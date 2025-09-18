/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  readFileAsDataURL,
  extractBase64Payload,
  downloadBase64Image,
} from "@/lib/file";
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

type PhotoPurpose = "default" | "interview" | "passport";
type GenderOption = "male" | "female";
type MaleAttire =
  | "navy_suit_tie"
  | "charcoal_suit_tie"
  | "black_suit_tie"
  | "navy_suit_notie"
  | "custom";
type FemaleAttire =
  | "charcoal_jacket"
  | "navy_jacket"
  | "black_jacket"
  | "custom";
type AttireOption = MaleAttire | FemaleAttire;
type Composition = "headshot" | "half" | "full";
type RetouchLevel = "original" | "light" | "standard" | "strong";
type BackgroundPreset =
  | "white"
  | "soft-gray"
  | "pale-blue"
  | "warm-beige"
  | "deep-charcoal";
type MoodTone = "warm" | "cool" | "dramatic" | "natural";

interface ProfileOptions {
  purpose: PhotoPurpose;
  gender: GenderOption;
  attire: AttireOption;
  customAttire: string;
  composition: Composition;
  retouch: RetouchLevel;
  background: BackgroundPreset;
  mood: MoodTone;
  direction: string;
}

const PHOTO_PURPOSES: Array<{
  key: PhotoPurpose;
  label: string;
  helper: string;
}> = [
  { key: "default", label: "기본", helper: "일반 프로필·브랜딩 용" },
  { key: "interview", label: "면접용", helper: "신뢰감과 단정함 강조" },
  {
    key: "passport",
    label: "여권용",
    helper: "정면, 중립 표정, 균형 잡힌 조명",
  },
];

const GENDER_PRESETS: Array<{ key: GenderOption; label: string }> = [
  { key: "male", label: "남성" },
  { key: "female", label: "여성" },
];

const MALE_ATTIRE_PRESETS: Array<{ key: MaleAttire; label: string }> = [
  { key: "navy_suit_tie", label: "네이비 수트 / 타이" },
  { key: "charcoal_suit_tie", label: "차콜 수트 / 타이" },
  { key: "black_suit_tie", label: "블랙 수트 / 타이" },
  { key: "navy_suit_notie", label: "네이비 수트 / 노타이" },
  { key: "custom", label: "직접 입력" },
];

const FEMALE_ATTIRE_PRESETS: Array<{ key: FemaleAttire; label: string }> = [
  { key: "charcoal_jacket", label: "차콜 자켓" },
  { key: "navy_jacket", label: "네이비 자켓" },
  { key: "black_jacket", label: "블랙 자켓" },
  { key: "custom", label: "직접 입력" },
];

const COMPOSITION_PRESETS: Array<{
  key: Composition;
  label: string;
  helper: string;
}> = [
  { key: "headshot", label: "얼굴·어깨", helper: "어깨 위로 표현" },
  { key: "half", label: "상반신", helper: "가슴에서 허리까지" },
  { key: "full", label: "전신", helper: "전신을 균형 있게 프레이밍" },
];

const RETOUCH_LEVELS: Array<{
  key: RetouchLevel;
  label: string;
  helper: string;
}> = [
  { key: "original", label: "원본", helper: "보정 없이 사실적으로" },
  { key: "light", label: "최소", helper: "피부 톤을 가별게 정리" },
  {
    key: "standard",
    label: "기본",
    helper: "전문 촬영 수준의 자연스러운 리터칭",
  },
  { key: "strong", label: "강함", helper: "광고용 하이엔드 보정" },
];

const BACKGROUND_PRESETS: Array<{
  key: BackgroundPreset;
  label: string;
  hex: string;
  description: string;
}> = [
  {
    key: "white",
    label: "클래식 화이트",
    hex: "#ffffff",
    description: "깨끗한 스튜디오 배경",
  },
  {
    key: "soft-gray",
    label: "소프트 그레이",
    hex: "#dfe2e8",
    description: "중립적인 회색 톤",
  },
  {
    key: "pale-blue",
    label: "포그 블루",
    hex: "#cfdcf4",
    description: "차분한 파스텔 블루",
  },
  {
    key: "warm-beige",
    label: "웜 베이지",
    hex: "#f1e3d0",
    description: "따뜻한 베이지 조명",
  },
  {
    key: "deep-charcoal",
    label: "딕 차콜",
    hex: "#2f2f35",
    description: "무게감 있는 딕톤",
  },
];

const MOOD_LABELS: Record<MoodTone, string> = {
  warm: "따뜻하고 친근한",
  cool: "차분하고 세련된",
  dramatic: "콘트라스트 드라마틱",
  natural: "자연스럽고 투명한",
};

const PURPOSE_PROMPTS: Record<PhotoPurpose, string> = {
  default:
    "Create a polished professional portrait suitable for personal branding and online profiles.",
  interview:
    "Craft a confident, trustworthy portrait optimized for job interviews and corporate introductions.",
  passport:
    "Produce a neutral, front-facing portrait that satisfies passport photo conventions while remaining photorealistic.",
};

const COMPOSITION_PROMPTS: Record<Composition, string> = {
  headshot:
    "frame the subject from the shoulders up with gentle negative space",
  half: "capture the subject from mid-torso upward with balanced negative space",
  full: "show the subject in a full-length standing pose, centered with clean headroom",
};

const RETOUCH_PROMPTS: Record<RetouchLevel, string> = {
  original:
    "apply almost no retouching so natural skin texture and detail remain intact",
  light:
    "perform light retouching to softly even out skin tone and remove minor distractions",
  standard:
    "perform balanced professional retouching for smooth skin, enhanced eyes, and polished details",
  strong:
    "apply high-end beauty retouching with immaculate skin, brightened eyes, and refined highlights",
};

const MOOD_PROMPTS: Record<MoodTone, string> = {
  warm: "warm cinematic lighting with gentle golden highlights",
  cool: "cool-toned lighting with subtle teal accents",
  dramatic: "high contrast lighting with sculpted shadows and rim light",
  natural:
    "balanced daylight with soft diffused highlights and authentic skin tones",
};

const BACKGROUND_PROMPTS: Record<
  BackgroundPreset,
  { statement: string; hex: string }
> = BACKGROUND_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.key] = {
      statement: `set against a seamless studio backdrop washed in ${preset.label} (${preset.hex}) for a ${preset.description}`,
      hex: preset.hex,
    };
    return acc;
  },
  {} as Record<BackgroundPreset, { statement: string; hex: string }>,
);

function buildAttirePrompt(options: ProfileOptions) {
  const maleMap: Record<Exclude<MaleAttire, "custom">, string> = {
    navy_suit_tie:
      "wearing a tailored navy suit with a crisp dress shirt and coordinating tie",
    charcoal_suit_tie:
      "wearing a charcoal gray suit with a structured tie and polished details",
    black_suit_tie:
      "wearing a sharp black suit with a formal tie for a decisive corporate look",
    navy_suit_notie:
      "wearing a navy suit with an open collar shirt and no tie for relaxed professionalism",
  };

  const femaleMap: Record<Exclude<FemaleAttire, "custom">, string> = {
    charcoal_jacket: "wearing a charcoal tailored jacket layered over a clean blouse",
    navy_jacket: "wearing a navy blazer with minimal accessories for a focused presentation",
    black_jacket: "wearing a structured black jacket with refined lines and subtle details",
  };

  if (options.attire === "custom") {
    const fallback =
      options.gender === "male"
        ? "wearing a tailored outfit that suits a male professional"
        : "wearing a polished outfit that suits a female professional";
    const custom = options.customAttire.trim();
    return custom.length ? custom : fallback;
  }

  if (options.gender === "male") {
    return maleMap[options.attire as Exclude<MaleAttire, "custom">];
  }
  return femaleMap[options.attire as Exclude<FemaleAttire, "custom">];
}

function buildPrompt(options: ProfileOptions) {
  const attirePrompt = buildAttirePrompt(options);
  const background = BACKGROUND_PROMPTS[options.background];

  return `You are an award-winning portrait photographer. Transform the provided photo into a modern professional profile image while keeping the subject's identity, pose, and facial features untouched.
Usage: ${PURPOSE_PROMPTS[options.purpose]}
Subject: portray the ${options.gender === "male" ? "male" : "female"} subject with ${COMPOSITION_PROMPTS[options.composition]}.
Wardrobe: ${attirePrompt}.
Background: ${background.statement}.
Lighting: ${MOOD_PROMPTS[options.mood]}.
Retouching: ${RETOUCH_PROMPTS[options.retouch]}.
Additional direction: ${options.direction.trim() || "ensure the image feels confident, approachable, and high-resolution."}`;
}

export default function ProfilePhotoPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ProfileOptions>({
    purpose: "default",
    gender: "female",
    attire: "charcoal_jacket",
    customAttire: "",
    composition: "half",
    retouch: "standard",
    background: "white",
    mood: "natural",
    direction: "",
  });

  const isReady = Boolean(sourceImage);

  useEffect(() => {
    if (
      options.gender === "male" &&
      !MALE_ATTIRE_PRESETS.some((preset) => preset.key === options.attire)
    ) {
      setOptions((prev) => ({
        ...prev,
        attire: "navy_suit_tie",
        customAttire: "",
      }));
    }
    if (
      options.gender === "female" &&
      !FEMALE_ATTIRE_PRESETS.some((preset) => preset.key === options.attire)
    ) {
      setOptions((prev) => ({
        ...prev,
        attire: "charcoal_jacket",
        customAttire: "",
      }));
    }
  }, [options.gender, options.attire]);

  const attirePresets = useMemo(
    () => (options.gender === "male" ? MALE_ATTIRE_PRESETS : FEMALE_ATTIRE_PRESETS),
    [options.gender],
  );

  const backgroundSwatch = BACKGROUND_PRESETS.find(
    (preset) => preset.key === options.background,
  );

  const generateProfile = async () => {
    if (!sourceImage) {
      setError("먼저 원본 이미지를 업로드해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);
      setResultImage(null);

      const prompt = buildPrompt(options);
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: extractBase64Payload(sourceImage),
                },
              },
            ],
          },
        ],
      } as const;

      const generated = await generateGeminiImage(payload, { retries: 3 });
      setResultImage(generated);
      setMessage("새로운 프로필 사진이 생성되었습니다.");
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

  const feedback = error ?? message;
  const feedbackStyle = error ? themeMessageStyles.error : themeMessageStyles.success;

 return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
        <div
          className="flex flex-col gap-6 rounded-3xl border p-6"
          style={{ ...themeSurfaceStyle, boxShadow: themeCardShadow }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-2xl font-semibold"
                style={themePrimaryTextStyle}
              >
                AI 프로필 사진 스튜디오
              </h1>
              <p className="mt-2 text-sm" style={themeSecondaryTextStyle}>
                사진을 업로드하고 의도에 맞는 옵션들을 선택하면, 전문 스튜디오에서
                촬영한 듯한 고품질 프로필 이미지로 변환해 드립니다.
              </p>
            </div>
            <label
              className="flex h-28 w-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed"
              style={themeInsetStyle}
            >
              <span
                className="text-xs font-semibold"
                style={themeMutedTextStyle}
              >
                이미지 업로드
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    const dataUrl = await readFileAsDataURL(file);
                    setSourceImage(dataUrl);
                    setResultImage(null);
                    setMessage("원본 이미지가 등록되었습니다.");
                    setError(null);
                  } catch {
                    setError("이미지를 불러오지 못했습니다. 다른 파일로 시도해 주세요.");
                  }
                }}
              />
              <span className="text-[11px]" style={themeMutedTextStyle}>
                JPG 또는 PNG
              </span>
            </label>
          </div>

          <section>
            <span
              className="text-xs uppercase tracking-wider"
              style={themeMutedTextStyle}
            >
              사진 용도
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {PHOTO_PURPOSES.map((item) => (
                <button
                  key={item.key}
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, purpose: item.key }))
                  }
                  className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                  style={
                    options.purpose === item.key
                      ? themePillStyles.active
                      : themePillStyles.inactive
                  }
                >
                  <span>{item.label}</span>
                  <span
                    className="ml-1 text-[10px]"
                    style={themeMutedTextStyle}
                  >
                    {item.helper}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {GENDER_PRESETS.map((item) => (
                <button
                  key={item.key}
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, gender: item.key }))
                  }
                  className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                  style={
                    options.gender === item.key
                      ? themePillStyles.active
                      : themePillStyles.inactive
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div>
              <span
                className="text-xs uppercase tracking-wider"
                style={themeMutedTextStyle}
              >
                의상 스타일
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {attirePresets.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() =>
                      setOptions((prev) => ({ ...prev, attire: preset.key }))
                    }
                    className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                    style={
                      options.attire === preset.key
                        ? themePillStyles.active
                        : themePillStyles.inactive
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {options.attire === "custom" && (
                <textarea
                  value={options.customAttire}
                  onChange={(event) =>
                    setOptions((prev) => ({
                      ...prev,
                      customAttire: event.target.value,
                    }))
                  }
                  placeholder="예) 네이비 정장 슈트에 흰 와이셔츠와 연청 타이"
                  className="mt-3 h-20 w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none"
                  style={{
                    ...themeInsetStyle,
                    color: themePrimaryTextStyle.color,
                  }}
                />
              )}
            </div>
          </section>

          <section>
            <span
              className="text-xs uppercase tracking-wider"
              style={themeMutedTextStyle}
            >
              촬영 구도
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {COMPOSITION_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, composition: preset.key }))
                  }
                  className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                  style={
                    options.composition === preset.key
                      ? themePillStyles.active
                      : themePillStyles.inactive
                  }
                >
                  <span>{preset.label}</span>
                  <span
                    className="ml-1 text-[10px]"
                    style={themeMutedTextStyle}
                  >
                    {preset.helper}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <span
              className="text-xs uppercase tracking-wider"
              style={themeMutedTextStyle}
            >
              리터칭 강도
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {RETOUCH_LEVELS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, retouch: preset.key }))
                  }
                  className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                  style={
                    options.retouch === preset.key
                      ? themePillStyles.active
                      : themePillStyles.inactive
                  }
                >
                  <span>{preset.label}</span>
                  <span
                    className="ml-1 text-[10px]"
                    style={themeMutedTextStyle}
                  >
                    {preset.helper}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <span
              className="text-xs uppercase tracking-wider"
              style={themeMutedTextStyle}
            >
              배경 컬러
            </span>
            <div className="mt-3 flex flex-wrap gap-3">
              {BACKGROUND_PRESETS.map((preset) => {
                const active = options.background === preset.key;
                return (
                  <button
                    key={preset.key}
                    onClick={() =>
                      setOptions((prev) => ({
                        ...prev,
                        background: preset.key,
                      }))
                    }
                    className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-xs font-semibold transition hover:opacity-90"
                    style={
                      active ? themePillStyles.active : themeOutlineButtonStyle
                    }
                  >
                    <span
                      className="h-6 w-6 rounded-full border"
                      style={{
                        backgroundColor: preset.hex,
                        borderColor: "var(--border-color)",
                      }}
                    />
                    <span className="flex flex-col text-left">
                      <span>{preset.label}</span>
                      <span
                        className="text-[10px] font-normal"
                        style={themeMutedTextStyle}
                      >
                        {preset.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {backgroundSwatch && (
              <p className="mt-2 text-xs" style={themeMutedTextStyle}>
                Hex: {backgroundSwatch.hex}
              </p>
            )}
          </section>

          <section>
            <span
              className="text-xs uppercase tracking-wider"
              style={themeMutedTextStyle}
            >
              조명과 무드
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(MOOD_LABELS) as MoodTone[]).map((tone) => (
                <button
                  key={tone}
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, mood: tone }))
                  }
                  className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                  style={
                    options.mood === tone
                      ? themePillStyles.active
                      : themePillStyles.inactive
                  }
                >
                  {MOOD_LABELS[tone]}
                </button>
              ))}
            </div>
          </section>

          <div>
            <span
              className="text-xs uppercase tracking-wider"
              style={themeMutedTextStyle}
            >
              추가 지시 메모
            </span>
            <textarea
              value={options.direction}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  direction: event.target.value,
                }))
              }
              placeholder="예) 피부는 자연스럽게 놔두고, 조명만 자신감 있게 표현해줘"
              className="mt-2 h-24 w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none"
              style={{ ...themeInsetStyle, color: themePrimaryTextStyle.color }}
            />
          </div>

          <button
            className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={themeAccentButtonStyle}
            onClick={generateProfile}
            disabled={!isReady || isLoading}
          >
            {isLoading ? "생성 중..." : "프로필 사진 생성하기"}
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
          <div
            className="flex flex-col gap-3 rounded-3xl border p-6"
            style={{ ...themeSurfaceStyle, boxShadow: themeCardShadow }}
          >
            <h3
              className="text-base font-semibold"
              style={themePrimaryTextStyle}
            >
              원본 이미지
            </h3>
            <div
              className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed"
              style={themeInsetStyle}
            >
              {sourceImage ? (
                <img
                  src={sourceImage}
                  alt="원본"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm" style={themeMutedTextStyle}>
                  사진을 업로드하면 이곳에 표시됩니다.
                </span>
              )}
            </div>
          </div>

          <div
            className="flex flex-col gap-3 rounded-3xl border p-6"
            style={{ ...themeSurfaceStyle, boxShadow: themeCardShadow }}
          >
            <h3
              className="text-base font-semibold"
              style={themePrimaryTextStyle}
            >
              결과 이미지
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
                    style={{
                      borderColor: "var(--accent-primary)",
                      borderTopColor: "transparent",
                      opacity: 0.5,
                    }}
                  />
                  <span className="text-xs" style={themeSecondaryTextStyle}>
                    새로운 프로필을 생성하는 중...
                  </span>
                </div>
              )}
              {resultImage ? (
                <img
                  src={resultImage}
                  alt="프로필 결과"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm" style={themeMutedTextStyle}>
                  생성 후 결과가 여기에 표시됩니다.
                </span>
              )}
            </div>
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={
                resultImage ? themeAccentButtonStyle : themeOutlineButtonStyle
              }
              disabled={!resultImage || isLoading}
              onClick={() =>
                resultImage &&
                downloadBase64Image(resultImage, "moai-profile-photo.png")
              }
            >
              결과 다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}