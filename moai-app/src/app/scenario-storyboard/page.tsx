"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { callGeminiJson, generateGeminiImage } from "@/lib/gemini";
import {
  readFileAsDataURL,
  extractBase64Payload,
  downloadBase64Image,
} from "@/lib/file";

type GeminiJsonPart = { text?: string };
type GeminiJsonResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiJsonPart[] };
  }>;
};

interface StoryPrompt {
  id: string;
  text: string;
}

interface GeneratedImage {
  prompt: string;
  status: "pending" | "success" | "failed";
  url: string | null;
}

interface StyleOptions {
  lookAndFeel: string;
  aspectRatio: string;
  mood: string;
  negativePrompt: string;
}

function parsePromptsFromResponse(response: GeminiJsonResponse): string[] {
  const candidates = response?.candidates ?? [];
  const firstText = candidates
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .find((part) => typeof part.text === "string")?.text;

  if (!firstText) {
    return [];
  }

  const normalizeSceneValue = (value: unknown): string | null => {
    if (value == null) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    if (typeof value === "number") {
      return value.toString();
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const numberish =
        record.scene_number ?? record.scene ?? record.index ?? record.id;
      const textualKeys = [
        "visual_prompt",
        "description",
        "prompt",
        "scene",
        "details",
        "summary",
      ];
      const body = textualKeys
        .map((key) =>
          typeof record[key] === "string"
            ? (record[key] as string).trim()
            : null,
        )
        .find((entry) => entry && entry.length);

      if (body) {
        if (numberish !== undefined && numberish !== null) {
          return `Scene ${numberish}: ${body}`;
        }
        return body;
      }

      try {
        return JSON.stringify(record);
      } catch {
        return null;
      }
    }
    return String(value);
  };

  const extractFromJsonStructure = (input: unknown): string[] => {
    if (input == null) return [];
    if (Array.isArray(input)) {
      return input
        .flatMap((item) => extractFromJsonStructure(item))
        .filter((item): item is string => Boolean(item));
    }

    if (typeof input === "object") {
      const record = input as Record<string, unknown>;
      if (Array.isArray(record.prompts)) {
        return extractFromJsonStructure(record.prompts);
      }
      if (Array.isArray(record.scenes)) {
        return extractFromJsonStructure(record.scenes);
      }
      const normalized = normalizeSceneValue(record);
      return normalized ? [normalized] : [];
    }

    const normalized = normalizeSceneValue(input);
    return normalized ? [normalized] : [];
  };

  try {
    const parsed = JSON.parse(firstText.trim());
    const fromJson = extractFromJsonStructure(parsed).filter(
      (item) => item.length > 0,
    );
    if (fromJson.length > 0) {
      return fromJson;
    }
  } catch (error) {
    console.warn("Failed to parse JSON from Gemini response", error, firstText);
  }

  return firstText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d\.\s]+/, "").trim())
    .filter((line) => line.length > 0);
}

// UI 컴포넌트
const Button = ({
  children,
  onClick,
  disabled,
  primary = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
    style={
      primary
        ? {
            backgroundColor: "var(--accent-primary)",
            color: "var(--bg-primary)",
            boxShadow: "0 1px 2px rgba(160, 144, 107, 0.2)",
          }
        : {
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }
    }
  >
    {children}
  </button>
);

const RadioPill = ({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <label
    className="cursor-pointer px-4 py-2 text-sm rounded-full transition-colors font-semibold shadow-sm"
    style={
      checked
        ? {
            backgroundColor: "var(--accent-primary)",
            color: "var(--bg-primary)",
            boxShadow: "0 0 0 2px var(--accent-secondary)",
          }
        : {
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }
    }
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="hidden"
    />
    {label}
  </label>
);

const OptionSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-6">
    <h3 className="text-md font-semibold text-gray-800 mb-3">{title}</h3>
    <div className="flex flex-wrap gap-3">{children}</div>
  </div>
);

const LoadingCard = () => (
  <div className="relative bg-white p-4 rounded-lg shadow-md border border-gray-200 w-full aspect-video">
    <div className="w-full h-full bg-gray-200 rounded-md animate-pulse"></div>
    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  </div>
);

const ErrorCard = ({ onRegenerate }: { onRegenerate: () => void }) => (
  <div className="bg-red-50 p-4 rounded-lg shadow-md border border-red-200 w-full flex flex-col justify-center items-center aspect-video">
    <p className="text-red-600 font-medium mb-4">생성에 실패했습니다.</p>
    <Button onClick={onRegenerate}>재시도</Button>
  </div>
);

export default function ScenarioStoryboardPage() {
  // 1. 입력 상태
  const [scenario, setScenario] = useState<string>("");
  const [supportImage, setSupportImage] = useState<string | null>(null);
  const [initialReferenceImage, setInitialReferenceImage] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialRefFileInputRef = useRef<HTMLInputElement | null>(null);

  // 2. 분석 상태
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<StoryPrompt[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 3. 스타일 옵션 상태
  const [options, setOptions] = useState<StyleOptions>({
    lookAndFeel: "photorealistic",
    aspectRatio: "16:9",
    mood: "optimistic",
    negativePrompt: "",
  });
  const [customLook, setCustomLook] = useState("");

  // 4. 이미지 생성 상태
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  // 5. 드래그앤드롭 상태
  const draggedItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleImageUpload = async (
    files: FileList | null,
    type: "support" | "reference",
  ) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      if (type === "support") {
        setSupportImage(dataUrl);
      } else {
        setInitialReferenceImage(dataUrl);
      }
    } catch {
      setError("이미지를 불러오지 못했습니다.");
    }
  };

  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          try {
            const dataUrl = await readFileAsDataURL(file);
            setSupportImage(dataUrl);
          } catch {
            setError("클립보드 이미지를 붙여넣는 데 실패했습니다.");
          }
        }
        return;
      }
    }
  }, []);

  const analyzeScenario = async () => {
    if (!scenario.trim() && !supportImage) {
      setError("텍스트나 참고 이미지를 입력해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setPrompts([]);
      setGeneratedImages([]);
      setCurrentSceneIndex(0);

      const systemPrompt = `You are a scenario analyzer. Your task is to break down the user's input (text or image) into a series of visual scenes for a presentation. For each scene, create a concise, descriptive image generation prompt in English. Return the result as a JSON object with a single key "prompts" containing an array of strings.`;

      let combinedText =
        "Analyze the following scenario to break it down into visual scenes.";
      if (scenario.trim() && supportImage) {
        combinedText = `Analyze the following scenario, described in the text and shown in the image, to break it down into visual scenes.\n\nText: ${scenario}`;
      } else if (scenario.trim()) {
        combinedText = `Analyze the following text scenario to break it down into visual scenes.\n\n${scenario}`;
      } else if (supportImage) {
        combinedText = `Analyze the flow diagram in the attached image to break it down into visual scenes.`;
      }

      const extraParts = supportImage
        ? [
            {
              inlineData: {
                mimeType: "image/png" as const,
                data: supportImage.split(",")[1],
              },
            },
          ]
        : [];

      const response = await callGeminiJson(combinedText, extraParts, {
        retries: 2,
      });
      const lines = parsePromptsFromResponse(response as GeminiJsonResponse);

      setPrompts(
        lines.map((text, index) => ({
          id: `${Date.now()}-${index}`,
          text,
        })),
      );
    } catch (err) {
      console.error(err);
      setError(
        "시나리오 분석에 실패했습니다. 입력을 조금 더 구체적으로 작성해 보세요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptChange = (index: number, newText: string) => {
    const updatedPrompts = [...prompts];
    updatedPrompts[index].text = newText;
    setPrompts(updatedPrompts);
  };

  const handleAddScene = () => {
    setPrompts([...prompts, { id: `${Date.now()}`, text: "A new scene..." }]);
  };

  const handleDeleteScene = (indexToDelete: number) => {
    setPrompts((prev) => prev.filter((_, index) => index !== indexToDelete));
    setGeneratedImages((prev) => {
      const newImages = [...prev];
      if (newImages.length > indexToDelete) {
        newImages.splice(indexToDelete, 1);
      }
      return newImages;
    });
    if (currentSceneIndex > indexToDelete) {
      setCurrentSceneIndex((prev) => prev - 1);
    }
  };

  const handleDragSort = () => {
    if (draggedItem.current === null || dragOverItem.current === null) return;

    const promptsClone = [...prompts];
    const imagesClone = [...generatedImages];

    const draggedPrompt = promptsClone.splice(draggedItem.current, 1)[0];
    promptsClone.splice(dragOverItem.current, 0, draggedPrompt);

    if (imagesClone.length > draggedItem.current) {
      const draggedImage = imagesClone.splice(draggedItem.current, 1)[0];
      if (draggedImage)
        imagesClone.splice(dragOverItem.current, 0, draggedImage);
    }

    draggedItem.current = null;
    dragOverItem.current = null;
    setPrompts(promptsClone);
    setGeneratedImages(imagesClone);
  };

  const buildFinalPrompt = (basePrompt: string, isReference = false) => {
    const lookAndFeelStyle =
      options.lookAndFeel === "custom" ? customLook : options.lookAndFeel;
    const styleInstructions = `
      **Master Style Guide:**
      - Style: A high-quality, professional ${lookAndFeelStyle}.
      - Mood: The overall mood is ${options.mood}.
      - Aspect Ratio: ${options.aspectRatio}.
      - Negative Prompts: Do NOT include: ${options.negativePrompt || "text, words, blurry, watermark, signature, ugly, tiling, poorly drawn hands"}.
      ${isReference ? "Crucially, maintain the characters, objects, and overall art style from the provided reference image, but depict the new scene described below." : "Adhere strictly to this master style guide for the following scene."}
    `;
    return `${styleInstructions.trim()}\n\n**Scene to generate:** "${basePrompt}"`;
  };

  const handleGenerateOrAdvance = async () => {
    setIsGeneratingScene(true);
    const indexToGenerate = currentSceneIndex;
    let referenceImage = null;

    if (indexToGenerate > 0) {
      referenceImage = generatedImages[indexToGenerate - 1]?.url;
    } else {
      referenceImage = initialReferenceImage;
    }

    setGeneratedImages((prev) => {
      const newImages = [...prev];
      if (newImages.length <= indexToGenerate) {
        newImages.push({
          prompt: prompts[indexToGenerate].text,
          status: "pending",
          url: null,
        });
      } else {
        newImages[indexToGenerate].status = "pending";
      }
      return newImages;
    });

    try {
      const finalPrompt = buildFinalPrompt(
        prompts[indexToGenerate].text,
        !!referenceImage,
      );

      const parts: Array<{
        text?: string;
        inlineData?: { mimeType: string; data: string };
      }> = [{ text: finalPrompt }];

      if (referenceImage) {
        parts.unshift({
          inlineData: {
            mimeType: "image/png",
            data: extractBase64Payload(referenceImage),
          },
        });
      }

      const payload = { contents: [{ parts }] };
      const imageUrl = await generateGeminiImage(payload, { retries: 3 });

      setGeneratedImages((prev) => {
        const newImages = [...prev];
        newImages[indexToGenerate] = {
          ...newImages[indexToGenerate],
          status: "success",
          url: imageUrl,
        };
        return newImages;
      });
      setCurrentSceneIndex(indexToGenerate + 1);
    } catch (error) {
      console.error(
        `Image generation failed for scene ${indexToGenerate + 1}:`,
        error,
      );
      setGeneratedImages((prev) => {
        const newImages = [...prev];
        newImages[indexToGenerate] = {
          ...newImages[indexToGenerate],
          status: "failed",
          url: null,
        };
        return newImages;
      });
    } finally {
      setIsGeneratingScene(false);
    }
  };

  const regenerateImage = async (index: number) => {
    setIsGeneratingScene(true);
    setGeneratedImages((prev) => {
      const newImages = [...prev];
      newImages[index].status = "pending";
      return newImages;
    });

    let referenceImage = null;
    if (index > 0) {
      referenceImage = generatedImages[index - 1]?.url;
    } else {
      referenceImage = initialReferenceImage;
    }

    try {
      const finalPrompt = buildFinalPrompt(
        prompts[index].text,
        !!referenceImage,
      );

      const parts: Array<{
        text?: string;
        inlineData?: { mimeType: string; data: string };
      }> = [{ text: finalPrompt }];

      if (referenceImage) {
        parts.unshift({
          inlineData: {
            mimeType: "image/png",
            data: extractBase64Payload(referenceImage),
          },
        });
      }

      const payload = { contents: [{ parts }] };
      const imageUrl = await generateGeminiImage(payload, { retries: 3 });

      setGeneratedImages((prev) => {
        const newImages = [...prev];
        newImages[index] = {
          ...newImages[index],
          status: "success",
          url: imageUrl,
        };
        return newImages;
      });
    } catch (error) {
      console.error(`Image regeneration failed for scene ${index + 1}:`, error);
      setGeneratedImages((prev) => {
        const newImages = [...prev];
        newImages[index].status = "failed";
        return newImages;
      });
    } finally {
      setIsGeneratingScene(false);
    }
  };

  const copyPrompt = async (prompt: StoryPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.text);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (copyError) {
      console.error(copyError);
      setError("클립보드에 복사하지 못했습니다.");
    }
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOptions({ ...options, [e.target.name]: e.target.value });
  };

  const isGenerationComplete = currentSceneIndex >= prompts.length;
  const mainButtonText = () => {
    if (prompts.length === 0) return "첫 씬 생성 시작";
    if (isGenerationComplete) return "모든 씬 생성 완료";
    if (currentSceneIndex === 0) return "첫 씬 생성 시작";
    return `다음 씬 (${currentSceneIndex + 1}/${prompts.length}) 생성`;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap'); 
        body { font-family: 'Noto Sans KR', sans-serif; background-color: var(--bg-primary); } 
        .dragging { opacity: 0.5; }
      `}</style>

      <div className="container mx-auto p-4 sm:p-8">
        <header className="text-center my-8">
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            AI 시나리오 이미지 생성기
          </h1>
          <p
            className="mt-4 text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            텍스트나 다이어그램으로 아이디어를 설명하면, AI가 통일된 스타일의
            발표 자료용 이미지를 만들어드립니다.
          </p>
        </header>

        <main className="space-y-8">
          {/* STEP 1: 입력 */}
          <div
            className="p-6 rounded-2xl shadow-lg border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
              boxShadow: "0 10px 25px rgba(160, 144, 107, 0.1)",
            }}
            onPaste={handlePaste}
          >
            <h2
              className="text-2xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Step 1: 시나리오 입력
            </h2>
            <div className="space-y-4">
              <textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="여기에 시나리오를 텍스트로 설명하고, 필요하다면 아래에 이미지를 첨부하거나 붙여넣으세요..."
              />
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="dropzone-file"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  {supportImage ? (
                    <img
                      src={supportImage}
                      alt="업로드된 플로우"
                      className="h-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">클릭 또는 드래그</span>
                        하여 이미지 업로드
                      </p>
                      <p className="text-xs text-gray-500">
                        또는 클립보드 이미지 붙여넣기 (Ctrl+V)
                      </p>
                    </div>
                  )}
                  <input
                    id="dropzone-file"
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) =>
                      handleImageUpload(e.target.files, "support")
                    }
                    accept="image/*"
                  />
                </label>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Button onClick={analyzeScenario} primary disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    <span>분석 중...</span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c.251-.11.516-.184.793-.223A4.5 4.5 0 0 1 15 5.25c0 2.485-2.015 4.5-4.5 4.5-1.776 0-3.324-1.034-4.098-2.522M15 12a4.5 4.5 0 0 1-4.5 4.5c-1.776 0-3.324-1.034-4.098-2.522m0 0-3.454-3.454a2.25 2.25 0 0 0-1.591-.659h-2.102"
                      />
                    </svg>
                    <span>시나리오 분석</span>
                  </>
                )}
              </Button>
            </div>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-2 text-center text-red-500"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* STEP 2: 옵션 설정 및 프롬프트 수정 */}
          <AnimatePresence>
            {prompts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200"
              >
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                  Step 2: 스타일 설정 및 씬 관리
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-gray-700">
                      전체 스타일
                    </h3>
                    <div className="space-y-6">
                      <OptionSection title="룩앤필 (Look & Feel)">
                        {[
                          "photorealistic",
                          "infographic",
                          "3d-render",
                          "flat-illustration",
                          "anime",
                          "pixel-art",
                          "watercolor",
                          "cinematic",
                          "minimalist",
                          "comic-book",
                          "fantasy-art",
                          "cyberpunk",
                          "custom",
                        ].map((style) => {
                          const labels: Record<string, string> = {
                            photorealistic: "실사",
                            infographic: "인포그래픽",
                            "3d-render": "3D 렌더",
                            "flat-illustration": "플랫 일러스트",
                            anime: "애니메이션",
                            "pixel-art": "픽셀 아트",
                            watercolor: "수채화",
                            cinematic: "시네마틱",
                            minimalist: "미니멀리스트",
                            "comic-book": "코믹북",
                            "fantasy-art": "판타지 아트",
                            cyberpunk: "사이버펑크",
                            custom: "직접 입력",
                          };
                          return (
                            <RadioPill
                              key={style}
                              name="lookAndFeel"
                              value={style}
                              label={labels[style]}
                              checked={options.lookAndFeel === style}
                              onChange={handleOptionChange}
                            />
                          );
                        })}
                      </OptionSection>
                      <AnimatePresence>
                        {options.lookAndFeel === "custom" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <input
                              type="text"
                              value={customLook}
                              onChange={(e) => setCustomLook(e.target.value)}
                              placeholder="원하는 스타일을 영어로 입력하세요..."
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <OptionSection title="화면 비율">
                        <RadioPill
                          name="aspectRatio"
                          value="16:9"
                          label="16:9 (와이드)"
                          checked={options.aspectRatio === "16:9"}
                          onChange={handleOptionChange}
                        />
                        <RadioPill
                          name="aspectRatio"
                          value="4:3"
                          label="4:3 (표준)"
                          checked={options.aspectRatio === "4:3"}
                          onChange={handleOptionChange}
                        />
                        <RadioPill
                          name="aspectRatio"
                          value="1:1"
                          label="1:1 (정방형)"
                          checked={options.aspectRatio === "1:1"}
                          onChange={handleOptionChange}
                        />
                      </OptionSection>
                      <OptionSection title="전체적인 분위기">
                        <RadioPill
                          name="mood"
                          value="optimistic"
                          label="밝고 긍정적"
                          checked={options.mood === "optimistic"}
                          onChange={handleOptionChange}
                        />
                        <RadioPill
                          name="mood"
                          value="professional"
                          label="진중하고 전문적"
                          checked={options.mood === "professional"}
                          onChange={handleOptionChange}
                        />
                        <RadioPill
                          name="mood"
                          value="futuristic"
                          label="미래지향적"
                          checked={options.mood === "futuristic"}
                          onChange={handleOptionChange}
                        />
                      </OptionSection>
                      <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-2">
                          제외할 요소 (Negative Prompt)
                        </h3>
                        <input
                          type="text"
                          name="negativePrompt"
                          value={options.negativePrompt}
                          onChange={handleOptionChange}
                          placeholder="예: text, words, blurry"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-2">
                          최초 레퍼런스 이미지 (선택)
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">
                          첫 씬 생성 시 참고할 스타일/캐릭터 이미지입니다.
                        </p>
                        <label
                          htmlFor="initial-ref-file"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          {initialReferenceImage ? (
                            <img
                              src={initialReferenceImage}
                              alt="레퍼런스 이미지"
                              className="h-full object-contain p-2"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center">
                              <svg
                                className="w-8 h-8 text-gray-400"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                                />
                              </svg>
                              <p className="text-sm text-gray-500">
                                클릭 또는 드래그
                              </p>
                            </div>
                          )}
                          <input
                            id="initial-ref-file"
                            type="file"
                            className="hidden"
                            ref={initialRefFileInputRef}
                            onChange={(e) =>
                              handleImageUpload(e.target.files, "reference")
                            }
                            accept="image/*"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-gray-700">
                      생성될 씬 목록 ({prompts.length}개)
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {prompts.map((prompt, index) => (
                        <div
                          key={prompt.id}
                          draggable
                          onDragStart={() => (draggedItem.current = index)}
                          onDragEnter={() => (dragOverItem.current = index)}
                          onDragEnd={handleDragSort}
                          onDragOver={(e) => e.preventDefault()}
                          className="flex items-start gap-2 p-2 rounded-md bg-gray-50 border border-gray-200 cursor-grab active:cursor-grabbing"
                        >
                          <span className="text-sm font-bold text-gray-500 pt-2">
                            {index + 1}.
                          </span>
                          <textarea
                            value={prompt.text}
                            onChange={(e) =>
                              handlePromptChange(index, e.target.value)
                            }
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 resize-none"
                            rows={3}
                          />
                          <button
                            onClick={() => handleDeleteScene(index)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors mt-1"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-right">
                      <Button onClick={handleAddScene}>+ 씬 추가</Button>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-8">
                  <Button
                    onClick={handleGenerateOrAdvance}
                    primary
                    disabled={isGeneratingScene || isGenerationComplete}
                    className="px-10 py-4 text-lg"
                  >
                    {isGeneratingScene ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        <span>생성 중...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-6 h-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                          />
                        </svg>
                        <span>{mainButtonText()}</span>
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP 3: 결과 확인 */}
          <AnimatePresence>
            {generatedImages.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200"
              >
                <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
                  Step 3: 생성된 이미지 결과
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedImages.map((image, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`bg-gray-50 p-3 rounded-lg border flex flex-col ${currentSceneIndex === index && isGeneratingScene ? "ring-2 ring-indigo-500" : ""}`}
                    >
                      <div className="relative aspect-video mb-2">
                        {image.status === "pending" && <LoadingCard />}
                        {image.status === "failed" && (
                          <ErrorCard
                            onRegenerate={() => regenerateImage(index)}
                          />
                        )}
                        {image.status === "success" && image.url && (
                          <img
                            src={image.url}
                            alt={`Generated scene ${index + 1}`}
                            className="w-full h-full object-cover rounded-md"
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-snug flex-grow">
                        <span className="font-bold">{index + 1}.</span>{" "}
                        {image.prompt}
                      </p>
                      {image.status === "success" && image.url && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() =>
                              downloadBase64Image(
                                image.url!,
                                `scenario-image-${index + 1}.png`,
                              )
                            }
                            className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-100"
                          >
                            다운로드
                          </button>
                          <button
                            onClick={() => regenerateImage(index)}
                            disabled={isGeneratingScene}
                            className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"
                          >
                            재생성
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 기존 프롬프트 목록 (복사 기능) */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              장면별 프롬프트
            </h2>
            {isLoading && (
              <div className="mt-6 flex items-center gap-3 text-sm text-gray-600">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400/50 border-t-transparent" />
                AI가 시나리오를 분해하고 있습니다...
              </div>
            )}
            <ul className="mt-6 space-y-4">
              {prompts.map((prompt, index) => (
                <li
                  key={prompt.id}
                  className="rounded-2xl border border-gray-300 bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-gray-500">
                    <span>Scene {index + 1}</span>
                    <button
                      className="rounded-full border border-gray-400 px-3 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-indigo-500 hover:text-indigo-600"
                      onClick={() => copyPrompt(prompt)}
                    >
                      {copiedId === prompt.id ? "복사 완료" : "복사"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-700">
                    {prompt.text}
                  </p>
                </li>
              ))}
            </ul>
            {!isLoading && prompts.length === 0 && (
              <p className="mt-4 text-sm text-gray-500">
                시나리오를 입력하면 장면별 프롬프트가 여기 표시됩니다.
              </p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
