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
  themePrimaryTextStyle,
  themeSecondaryTextStyle,
  themeSurfaceStyle,
} from "@/styles/theme";

function sanitizeFilename(input: string) {
  return (
    input
      .replace(/[^0-9a-zA-Z가-힣\s-_]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 40) || "moai-edit"
  );
}

export default function ImageEditorPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [workingImage, setWorkingImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/png");
  const [prompt, setPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<
    { type: "info" | "success" | "error"; text: string } | null
  >(null);

  const baseImage = workingImage ?? originalImage;
  const isReady = Boolean(baseImage && prompt.trim().length > 0);

  const promptPlaceholder = useMemo(
    () =>
      "예) 배경의 잡동사니 제거하고, 피부를 자연스럽게 보정해줘. 혹은 '하늘을 노을빛으로 바꿔줘'.",
    [],
  );

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setOriginalImage(dataUrl);
      setWorkingImage(null);
      setResultImage(null);
      setMimeType(file.type || "image/png");
      setMessage({
        type: "info",
        text: "이미지가 업로드되었습니다. 편집 프롬프트를 입력해 보세요.",
      });
    } catch {
      setMessage({ type: "error", text: "이미지를 불러오지 못했습니다." });
    }
  };

  const handleSubmit = async () => {
    if (!isReady || !baseImage) {
      setMessage({ type: "error", text: "이미지와 편집 지시문을 모두 준비해 주세요." });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ type: "info", text: "AI가 이미지를 편집하는 중입니다..." });
      setResultImage(null);

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt.trim() },
              { inlineData: { mimeType, data: extractBase64Payload(baseImage) } },
            ],
          },
        ],
      } as const;

      const generated = await generateGeminiImage(payload, { retries: 3 });
      setResultImage(generated);
      setWorkingImage(generated);
      setMessage({ type: "success", text: "이미지 편집이 완료되었습니다." });
    } catch (generationError) {
      console.error(generationError);
      setMessage({
        type: "error",
        text:
          generationError instanceof Error
            ? generationError.message
            : "이미지 편집 중 오류가 발생했습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setWorkingImage(null);
    setResultImage(null);
    setPrompt("");
    setMessage(null);
  };

  const messageStyle = message
    ? message.type === "error"
      ? themeMessageStyles.error
      : message.type === "success"
      ? themeMessageStyles.success
      : themeMessageStyles.info
    : undefined;

  const presets = [
    "피부 톤을 자연스럽게 보정하고 잡티를 제거해줘.",
    "배경의 산만한 요소를 모두 제거하고 보케 효과를 넣어줘.",
    "사진을 밤의 네온사인 거리 분위기로 바꿔줘.",
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <section
        className="mb-10 rounded-3xl border p-8 shadow-lg"
        style={{ ...themeSurfaceStyle, boxShadow: themeCardShadow }}
      >
        <h1 className="text-3xl font-bold md:text-4xl" style={themePrimaryTextStyle}>
          AI 이미지 에디터
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6" style={themeSecondaryTextStyle}>
          간단한 텍스트 지시로 보정, 제거, 합성을 모두 처리할 수 있는 올인원 편집기입니다. 동일한 이미지에 여러 번 편집을 이어붙일 수도 있어요.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px,1fr]">
        <div className="flex flex-col gap-4 rounded-3xl border p-6" style={themeSurfaceStyle}>
          <div className="space-y-2">
            <label className="text-sm font-semibold" style={themePrimaryTextStyle}>
              1. 이미지 업로드
            </label>
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition hover:opacity-95"
              style={{ ...themeInsetStyle, color: themeMutedTextStyle.color }}
            >
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(event) => handleUpload(event.target.files)}
              />
              <svg
                className="h-10 w-10"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                style={{ color: "var(--accent-primary)" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-sm font-semibold" style={themePrimaryTextStyle}>
                이미지 선택하기
              </span>
              <span className="text-xs" style={themeMutedTextStyle}>
                PNG, JPG 파일을 지원합니다.
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <label htmlFor="prompt" className="text-sm font-semibold" style={themePrimaryTextStyle}>
              2. 편집 지시 입력
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={promptPlaceholder}
              className="h-32 w-full resize-none rounded-2xl border px-4 py-3 text-sm focus:outline-none"
              style={{ ...themeInsetStyle, color: themePrimaryTextStyle.color }}
            />
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            {presets.map((preset, idx) => (
              <button
                key={preset}
                type="button"
                className="rounded-full border px-3 py-1 transition hover:opacity-90"
                style={{ borderColor: "var(--border-color)", color: themeSecondaryTextStyle.color }}
                onClick={() => setPrompt((prev) => `${prev}${prev ? "\n" : ""}${preset}`)}
              >
                {idx === 0
                  ? "피부 보정 프리셋"
                  : idx === 1
                  ? "배경 정리 프리셋"
                  : "무드 체인지 프리셋"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <button
              className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={themeAccentButtonStyle}
              onClick={handleSubmit}
              disabled={!isReady || isLoading}
            >
              {isLoading ? "편집 중..." : workingImage ? "추가 편집 적용" : "편집 시작"}
            </button>
            <button
              className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-80"
              style={themeOutlineButtonStyle}
              onClick={handleReset}
            >
              초기화
            </button>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border px-4 py-3 text-sm"
                style={messageStyle}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-3xl border p-6" style={themeSurfaceStyle}>
            <h3 className="text-base font-semibold" style={themePrimaryTextStyle}>
              현재 기준 이미지
            </h3>
            <div
              className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl border border-dashed"
              style={themeInsetStyle}
            >
              {baseImage ? (
                <img src={baseImage} alt="기준 이미지" className="h-full w-full object-contain" />
              ) : (
                <span className="text-sm" style={themeMutedTextStyle}>
                  사진을 업로드하면 여기에 표시됩니다.
                </span>
              )}
            </div>
            <p className="text-xs" style={themeMutedTextStyle}>
              편집을 반복하면 결과가 기준 이미지로 누적됩니다.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border p-6" style={themeSurfaceStyle}>
            <h3 className="text-base font-semibold" style={themePrimaryTextStyle}>
              편집 결과
            </h3>
            <div
              className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl border border-dashed"
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
                    이미지를 편집하는 중...
                  </span>
                </div>
              )}
              {resultImage ? (
                <img src={resultImage} alt="편집 결과" className="h-full w-full object-contain" />
              ) : (
                <span className="text-sm" style={themeMutedTextStyle}>
                  편집 후 결과가 여기에 표시됩니다.
                </span>
              )}
            </div>
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={resultImage ? themeAccentButtonStyle : themeOutlineButtonStyle}
              disabled={!resultImage}
              onClick={() =>
                resultImage &&
                downloadBase64Image(
                  resultImage,
                  `${sanitizeFilename(prompt)}.${mimeType.split("/")[1] || "png"}`,
                )
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
