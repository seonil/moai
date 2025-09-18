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

interface BeardStyle {
  label: string;
  prompt: string;
}

const BEARD_STYLES: BeardStyle[] = [
  { label: "구티", prompt: "Goatee" },
  { label: "콧수염", prompt: "Mustache" },
  { label: "반 다이크", prompt: "Van Dyke" },
  { label: "풀비어드", prompt: "Full Beard" },
  { label: "친 커튼", prompt: "Chin Curtain" },
  { label: "소울 패치", prompt: "Soul Patch" },
  { label: "힙스터", prompt: "Hipster Beard" },
  { label: "가리발디", prompt: "Garibaldi" },
  { label: "할리우디안", prompt: "Hollywoodian" },
  { label: "앵커", prompt: "Anchor Beard" },
  { label: "덕테일", prompt: "Ducktail" },
  { label: "프렌치 포크", prompt: "French Fork" },
  { label: "머튼 찹스", prompt: "Mutton Chops" },
  { label: "발보", prompt: "Balbo" },
  { label: "써클 비어드", prompt: "Circle Beard" },
  { label: "임페리얼", prompt: "Imperial" },
  { label: "친 스트랩", prompt: "Chin Strap" },
  { label: "그루밍 스터블", prompt: "Short Stubble" },
  { label: "바이킹", prompt: "Viking Beard" },
  { label: "내추럴 러기드", prompt: "Natural Scruffy Beard" },
];

function buildPrompt(style?: BeardStyle, useAiRecommendation?: boolean) {
  const baseInstruction =
    "You are a master barber and expert photo editor. Your only task is to add a beard to the provided portrait while keeping the identity, pose, expression, clothing, background and lighting completely unchanged. The beard must look hyper-realistic, perfectly integrated with matching lighting, texture and color that suits the subject.";

  if (useAiRecommendation) {
    return `${baseInstruction} Analyse the face shape, jawline and vibe of the person. Choose and apply the single most flattering beard style for them. Only output the final photorealistic portrait.`;
  }

  if (!style) {
    throw new Error("적용할 수염 스타일을 선택해 주세요.");
  }

  return `${baseInstruction} Apply a meticulously groomed ${style.prompt} beard.`;
}

export default function BeardStudioPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const styleChunks = useMemo(() => {
    const chunkSize = 5;
    const chunks: BeardStyle[][] = [];
    for (let i = 0; i < BEARD_STYLES.length; i += chunkSize) {
      chunks.push(BEARD_STYLES.slice(i, i + chunkSize));
    }
    return chunks;
  }, []);

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setSourceImage(dataUrl);
      setResultImage(null);
      setError(null);
      setMessage("이미지가 업로드되었습니다. 원하는 스타일을 선택해 보세요.");
    } catch {
      setError("이미지를 불러오지 못했습니다. 다른 파일로 시도해 주세요.");
    }
  };

  const runGeneration = async (style?: BeardStyle, aiRecommendation?: boolean) => {
    if (!sourceImage) {
      setError("먼저 얼굴 사진을 업로드해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage(
        aiRecommendation
          ? "AI가 어울리는 수염을 분석 중입니다."
          : `${style?.label ?? "스타일"} 수염을 적용하는 중입니다.`,
      );

      const prompt = buildPrompt(style, aiRecommendation);
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
      setMessage("완성! 아래 결과를 확인해 보세요.");
    } catch (generationError) {
      console.error(generationError);
      setError(
        generationError instanceof Error
          ? generationError.message
          : "이미지 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandom = () => {
    const random = BEARD_STYLES[Math.floor(Math.random() * BEARD_STYLES.length)];
    runGeneration(random);
  };

  const feedback = error ?? message;
  const feedbackStyle = error
    ? themeMessageStyles.error
    : message?.includes("완성")
    ? themeMessageStyles.success
    : message
    ? themeMessageStyles.info
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section
        className="mb-10 rounded-3xl border p-8 shadow-lg"
        style={{ ...themeSurfaceStyle, boxShadow: themeCardShadow }}
      >
        <h1 className="text-3xl font-bold md:text-4xl" style={themePrimaryTextStyle}>
          AI 수염 시뮬레이터
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6" style={themeSecondaryTextStyle}>
          얼굴 사진 한 장으로 다양한 수염 스타일을 테스트할 수 있는 인터랙티브 도구입니다. AI가 자동으로 가장 어울리는 스타일을 추천하거나, 직접 원하는 스타일을 선택해 초실감 합성을 확인하세요.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[420px,1fr]">
        <div className="flex flex-col gap-6 rounded-3xl border p-6" style={themeSurfaceStyle}>
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold" style={themePrimaryTextStyle}>
              1. 얼굴 사진 업로드
            </span>
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition hover:opacity-95"
              style={{ ...themeInsetStyle, color: themeMutedTextStyle.color }}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleUpload(event.target.files)}
              />
              <svg
                className="h-10 w-10"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ color: "var(--accent-primary)" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 11.25 12 6.75m0 0 4.5 4.5M12 6.75v10.5" />
              </svg>
              <span className="text-sm font-semibold" style={themePrimaryTextStyle}>
                클릭해서 사진 선택
              </span>
              <span className="text-xs" style={themeMutedTextStyle}>
                정면을 바라보는 고해상도 사진일수록 결과가 선명합니다.
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold" style={themePrimaryTextStyle}>
              2. 스타일 선택
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="rounded-full px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={themeAccentButtonStyle}
                onClick={() => runGeneration(undefined, true)}
                disabled={isLoading}
              >
                AI 맞춤 추천 받기
              </button>
              <button
                className="rounded-full px-4 py-3 text-sm font-semibold transition hover:opacity-80"
                style={themeOutlineButtonStyle}
                onClick={handleRandom}
                disabled={isLoading}
              >
                랜덤 스타일 적용
              </button>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-xs uppercase tracking-wider" style={themeMutedTextStyle}>
              스타일 모음
            </p>
            <div className="flex flex-col gap-3">
              {styleChunks.map((chunk, chunkIndex) => (
                <div key={chunkIndex} className="flex flex-wrap gap-2">
                  {chunk.map((style) => (
                    <button
                      key={style.prompt}
                      onClick={() => runGeneration(style)}
                      disabled={isLoading}
                      className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      style={themeOutlineButtonStyle}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

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
              원본 이미지
            </h3>
            <div
              className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed"
              style={themeInsetStyle}
            >
              {sourceImage ? (
                <img src={sourceImage} alt="업로드한 사진" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm" style={themeMutedTextStyle}>
                  아직 업로드된 사진이 없습니다.
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border p-6" style={themeSurfaceStyle}>
            <h3 className="text-base font-semibold" style={themePrimaryTextStyle}>
              결과 미리보기
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
                    계산 중...
                  </span>
                </div>
              )}
              {resultImage ? (
                <img src={resultImage} alt="합성된 수염" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm" style={themeMutedTextStyle}>
                  수염 스타일을 적용하면 결과가 표시됩니다.
                </span>
              )}
            </div>
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={resultImage ? themeAccentButtonStyle : themeOutlineButtonStyle}
              disabled={!resultImage || isLoading}
              onClick={() =>
                resultImage && downloadBase64Image(resultImage, "moai-beard-style.png")
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
