"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { downloadBase64Image, extractBase64Payload, readFileAsDataURL } from "@/lib/file";
import { generateGeminiImage } from "@/lib/gemini";

type Gender = "female" | "male";

type Mode = "guided" | "custom" | "reference";

const STYLES: Record<Gender, string[]> = {
  male: [
    '숏컷 버즈컷', '클래식 폼파두르', '슬릭백 언더컷', '텍스처드 퀴프', '가르마펌',
    '쉐도우펌', '애즈펌', '아이비리그컷', '크루컷', '리젠트컷',
    '댄디컷', '울프컷', '장발 웨이브', '남자 번헤어', '파일컷'
  ],
  female: [
    '단발 태슬컷', '긴 생머리', '중단발 빌드펌', '숏컷 픽시컷', '히피펌',
    '허쉬컷', '젤리펌', '레이어드 C컬펌', '사이드뱅', '시스루뱅',
    '풀뱅', '업스타일 번헤어', '높은 포니테일', '땋은 머리', '글램펌'
  ]
};

const COLORS = [
  '자연 흑모', '다크 브라운', '애쉬 브라운', '밀크 브라운', '금발',
  '백금발', '오렌지 레드', '체리 레드', '애쉬 그레이', '애쉬 블루', '미스틱 바이올렛', '파스텔 핑크'
];

const COLOR_MAP: Record<string, string> = {
  '자연 흑모': '#1C1C1E',
  '다크 브라운': '#3B2A22',
  '애쉬 브라운': '#A59280',
  '밀크 브라운': '#C8A98D',
  '금발': '#F3D28A',
  '백금발': '#EAE0C8',
  '오렌지 레드': '#D95E36',
  '체리 레드': '#99000B',
  '애쉬 그레이': '#B0B0B0',
  '애쉬 블루': '#6D8A9F',
  '미스틱 바이올렛': '#7A4D8B',
  '파스텔 핑크': '#F4C2C2'
};

interface HairOptions {
  gender: Gender;
  style: string;
  color: string;
  extra: string;
  customPrompt: string;
}

function buildPrompt(mode: Mode, options: HairOptions) {
  const base = `You are a high-end hair stylist. Modify ONLY the hair of the subject while keeping the face, identity, pose, background and lighting identical to the reference photo. Blend strands naturally.`;

  if (mode === "reference") {
    return `${base} Use the additional image as the exact hairstyle reference. Adapt its volume and shape to the subject naturally.`;
  }

  if (mode === "custom" && options.customPrompt.trim()) {
    return `${base} The client requests: ${options.customPrompt.trim()}`;
  }

  let guided = `${base} Transform the hairstyle into "${options.style}" suitable for a ${options.gender === "female" ? "female" : "male"}. Set the colour to "${options.color}".`;
  if (options.extra.trim()) {
    guided += ` Additional notes: ${options.extra.trim()}`;
  }
  return guided;
}

export default function HairCouturePage() {
  const [mode, setMode] = useState<Mode>("guided");
  const [options, setOptions] = useState<HairOptions>({
    gender: "female",
    style: STYLES.female[0],
    color: COLORS[0],
    extra: "",
    customPrompt: "",
  });
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const baseInputRef = useRef<HTMLInputElement | null>(null);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);

  const availableStyles = useMemo(() => STYLES[options.gender], [options.gender]);

  const updateOptions = (patch: Partial<HairOptions>) => setOptions((prev) => ({ ...prev, ...patch }));

  const handleUpload = async (files: FileList | null, type: "base" | "reference") => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      if (type === "base") {
        setBaseImage(dataUrl);
        setResultImage(null);
        setMessage("기준 사진이 등록되었습니다.");
      } else {
        setReferenceImage(dataUrl);
        setMessage("참고 이미지가 등록되었습니다.");
      }
      setError(null);
    } catch {
      setError("이미지를 불러오지 못했습니다.");
    }
  };

  const handleGenerate = async () => {
    if (!baseImage) {
      setError("먼저 나의 사진을 업로드해 주세요.");
      return;
    }
    if (mode === "custom" && !options.customPrompt.trim()) {
      setError("원하는 헤어스타일을 자유롭게 작성해 주세요.");
      return;
    }
    if (mode === "reference" && !referenceImage) {
      setError("참고 이미지를 업로드해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage("새로운 헤어를 합성하는 중입니다...");

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: buildPrompt(mode, options) },
        { inlineData: { mimeType: "image/png", data: extractBase64Payload(baseImage) } },
      ];

      if (mode === "reference" && referenceImage) {
        parts.push({ inlineData: { mimeType: "image/png", data: extractBase64Payload(referenceImage) } });
      }

      const payload = { contents: [{ parts }] } as const;
      const generated = await generateGeminiImage(payload, { retries: 3 });
      setResultImage(generated);
      setMessage("헤어 스타일이 완성되었습니다!");
    } catch (generationError) {
      console.error(generationError);
      setError(
        generationError instanceof Error
          ? generationError.message
          : "헤어 변환에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <section className="mb-10 rounded-3xl border p-8 shadow-lg" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', boxShadow: '0 10px 25px rgba(160, 144, 107, 0.1)' }}>
        <h1 className="text-3xl font-bold md:text-4xl" style={{ color: 'var(--text-primary)' }}>AI 헤어 스타일 디자이너</h1>
        <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
          사진 한 장으로 스타일 · 컬러 · 무드까지 한번에 바꿔보세요. 옵션 선택형, 자유 프롬프트, 참고 이미지 변환을 자유롭게 전환할 수 있습니다.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px,1fr]">
        <div className="flex flex-col gap-6 rounded-3xl border p-6" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="space-y-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>1. 기준 사진</span>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition hover:border-opacity-80"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              onClick={() => baseInputRef.current?.click()}
            >
              {baseImage ? (
                <img src={baseImage} alt="기준" className="h-40 w-full max-w-xs rounded-xl object-cover" />
              ) : (
                <>
                  <svg
                    className="h-8 w-8"
                    style={{ color: 'var(--accent-primary)' }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-sm font-semibold">내 사진 업로드</span>
                </>
              )}
            </div>
            <input ref={baseInputRef} type="file" className="hidden" accept="image/*" onChange={(event) => handleUpload(event.target.files, "base")} />
          </div>

          <div className="flex gap-2 rounded-full p-1 text-xs font-semibold" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            {(["guided", "custom", "reference"] as Mode[]).map((value) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className="flex-1 rounded-full px-3 py-2 transition"
                style={mode === value ? 
                  { backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' } : 
                  { backgroundColor: 'transparent', color: 'var(--text-secondary)' }
                }
              >
                {value === "guided" ? "스타일 선택" : value === "custom" ? "자유 프롬프트" : "참고 이미지"}
              </button>
            ))}
          </div>

          {mode === "reference" && (
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>참고 이미지</span>
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition hover:border-opacity-80"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                onClick={() => referenceInputRef.current?.click()}
              >
                {referenceImage ? (
                  <img src={referenceImage} alt="참고" className="h-32 w-full max-w-xs rounded-xl object-cover" />
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>희망하는 헤어 이미지를 첨부해 보세요.</span>
                )}
              </div>
              <input ref={referenceInputRef} type="file" className="hidden" accept="image/*" onChange={(event) => handleUpload(event.target.files, "reference")} />
            </div>
          )}

          {mode === "custom" && (
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>원하는 느낌</span>
              <textarea
                value={options.customPrompt}
                onChange={(event) => updateOptions({ customPrompt: event.target.value })}
                placeholder="예) 앞머리는 시스루로, 전체는 애쉬 바이올렛 웨이브로 만들어줘"
                className="h-28 w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          {mode === "guided" && (
            <div className="space-y-5">
              <div>
                <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>성별</span>
                <div className="mt-3 flex gap-2">
                  {(["female", "male"] as Gender[]).map((gender) => (
                    <button
                      key={gender}
                      onClick={() => updateOptions({ gender, style: STYLES[gender][0] })}
                      className="flex-1 rounded-full border px-4 py-2 text-xs font-semibold transition"
                      style={options.gender === gender ? 
                        { borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', opacity: 0.9 } : 
                        { borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }
                      }
                    >
                      {gender === "female" ? "여성" : "남성"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>헤어 스타일</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableStyles.map((style) => (
                    <button
                      key={style}
                      onClick={() => updateOptions({ style })}
                      className="rounded-full border px-4 py-2 text-xs font-semibold transition"
                      style={options.style === style ? 
                        { borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', opacity: 0.9 } : 
                        { borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }
                      }
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>컬러</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateOptions({ color })}
                      className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition"
                      style={options.color === color ? 
                        { borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', opacity: 0.9 } : 
                        { borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }
                      }
                    >
                      <span 
                        className="h-3 w-3 rounded-full border" 
                        style={{ backgroundColor: COLOR_MAP[color], borderColor: 'var(--border-color)' }}
                      ></span>
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>추가 요청</span>
                <textarea
                  value={options.extra}
                  onChange={(event) => updateOptions({ extra: event.target.value })}
                  placeholder="예) 앞머리는 살짝 비껴서, 볼륨은 과하지 않게"
                  className="h-20 w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )}

          <button
            className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }}
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? "합성 중..." : "새로운 헤어 만들기"}
          </button>

          <AnimatePresence>
            {(error || message) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border px-4 py-3 text-sm"
                style={error ? 
                  { borderColor: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.1)', color: '#fca5a5' } : 
                  { borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-secondary)', color: 'var(--text-primary)', opacity: 0.9 }
                }
              >
                {error ?? message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-3xl border p-6" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>기준 이미지</h3>
            <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
              {baseImage ? (
                <img src={baseImage} alt="기준" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>사진을 업로드하면 여기에 표시됩니다.</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border p-6" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>결과</h3>
            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ backgroundColor: 'rgba(160, 144, 107, 0.1)' }}>
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent', opacity: 0.5 }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>새로운 헤어를 입히는 중...</span>
                </div>
              )}
              {resultImage ? (
                <img src={resultImage} alt="헤어 결과" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>헤어 생성 후 결과가 표시됩니다.</span>
              )}
            </div>
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={!resultImage ? 
                { backgroundColor: 'var(--border-color)', color: 'var(--text-muted)' } : 
                { backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }
              }
              disabled={!resultImage}
              onClick={() => resultImage && downloadBase64Image(resultImage, "moai-hair-style.png")}
            >
              결과 다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

