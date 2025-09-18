/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { readFileAsDataURL, extractBase64Payload, downloadBase64Image } from "@/lib/file";
import { generateGeminiImage } from "@/lib/gemini";

// --- New Data Presets ---

const clothingData = {
  male: {
    Casual: { tops: ["T-shirt", "Hoodie", "Sweatshirt"], bottoms: ["Jeans", "Jogger Pants", "Shorts"] },
    "Business Casual": { tops: ["Oxford Shirt", "Knit Sweater", "Blazer"], bottoms: ["Chino Pants", "Slacks"] },
    Formal: { tops: ["Dress Shirt", "Suit Jacket"], bottoms: ["Suit Pants", "Slacks"] },
    Street: { tops: ["Oversized T-shirt", "Graphic Hoodie", "Anorak"], bottoms: ["Wide-leg Pants", "Cargo Pants"] },
    Athleisure: { tops: ["Training Top", "Windbreaker", "Sleeveless Shirt"], bottoms: ["Training Pants", "Shorts"] },
    Dandy: { tops: ["Tailored Jacket", "Vest", "Polo Shirt"], bottoms: ["Slacks", "Linen Pants"] },
    "Rock Chic": { tops: ["Leather Jacket", "Band T-shirt", "Distressed Sweater"], bottoms: ["Skinny Jeans", "Leather Pants"] },
    Gorpcore: { tops: ["Fleece Jacket", "Tech Vest", "Shell Jacket"], bottoms: ["Hiking Pants", "Cargo Shorts"] },
    Minimalist: { tops: ["Plain Knit", "Neat Shirt", "Unstructured Blazer"], bottoms: ["Wide Slacks", "Straight-fit Trousers"] },
    Vacation: { tops: ["Hawaiian Shirt", "Linen Shirt", "Henley Neck"], bottoms: ["Shorts", "Linen Pants"] },
  },
  female: {
    Casual: { tops: ["Lettering T-shirt", "Sweatshirt", "Hoodie"], bottoms: ["Boyfriend Jeans", "Mini Skirt"] },
    "Office Look": { tops: ["Blouse", "Silk Shirt", "Fitted Knit"], bottoms: ["Slacks", "Pencil Skirt"] },
    "Date Look": { tops: ["Puff-sleeve Blouse", "Cropped Cardigan", "Slip Dress"], bottoms: ["A-line Long Skirt", "Wide-leg Slacks"] },
    "Street/Festival": { tops: ["Crop Top", "Oversized Shirt", "Graphic T-shirt"], bottoms: ["Cargo Pants", "Low-rise Jeans"] },
    Athleisure: { tops: ["Bra Top", "Cropped Hoodie", "Windbreaker"], bottoms: ["Leggings", "Biker Shorts", "Training Pants"] },
    Lovely: { tops: ["Frill Blouse", "Ribbon Knit", "Pastel Cardigan"], bottoms: ["Pleated Skirt", "Skort"] },
    Glamorous: { tops: ["Sequin Top", "Off-shoulder Blouse", "Velvet Top"], bottoms: ["Leather Skirt", "Slit Dress"] },
    Gorpcore: { tops: ["Fleece Vest", "Anorak", "Functional T-shirt"], bottoms: ["Nylon Skirt", "Cargo Pants"] },
    Minimalist: { tops: ["Simple Blouse", "Cashmere Knit", "Wide Collar Shirt"], bottoms: ["Straight Slacks", "Long Skirt"] },
    Preppy: { tops: ["Polo Shirt", "Argyle Sweater Vest", "Oxford Shirt"], bottoms: ["Pleated Mini Skirt", "Chino Pants"] },
  },
} as const;

const colorPalettes = [
  "Monotone (Black, White, Gray)",
  "Neutral (Beige, Ivory, Khaki)",
  "Earth Tones (Brown, Olive, Terracotta)",
  "Deep Tones (Burgundy, Navy, Forest Green)",
  "Vibrant (Red, Cobalt Blue, Yellow)",
  "Pastel (Sky Blue, Baby Pink, Mint)",
];
const seasonOptions = ["선택 안함", "봄/가을", "여름", "겨울"];
const accessoryOptions = ["선택 안함", "볼캡 모자", "선글라스", "목걸이", "귀걸이", "스카프", "손목시계"];

// --- Type Definitions ---
type Gender = "male" | "female";

type ClothingItem = {
  tops: string[];
  bottoms: string[];
};

type ClothingDataType = typeof clothingData;

interface FashionOptions {
  gender: Gender;
  style: string;
  top: string;
  bottom: string;
  color: string;
  season: string;
  accessory: string;
  additionalRequest: string;
}

// --- Updated Prompt Builder ---
function buildPrompt(options: FashionOptions) {
  const baseInstruction = `You are an expert AI photo editor specializing in virtual clothing try-on. Your task is to realistically change ONLY the clothes and add specified accessories to the person in the provided image.
It is CRITICAL that you follow these rules precisely:
1.  **Preserve Identity**: You MUST preserve the person's original face, hair, body shape, pose, and all facial features EXACTLY as they are. DO NOT alter their identity.
2.  **Preserve Background**: You MUST keep the original background and all surrounding objects completely unchanged.
3.  **Natural Integration**: The new clothing and accessories MUST seamlessly match the original photo's lighting, shadows, and color temperature to look natural.`;

  let clothingDescription = `
Change the clothing to the following style:
- Gender: ${options.gender}
- Style: ${options.style}
- Top: ${options.top}
- Bottom: ${options.bottom}
- Color Palette: ${options.color}`;

  if (options.season && options.season !== "선택 안함") {
    clothingDescription += `\n- Season: The clothing should be suitable for ${options.season.replace("/", " or ")}.`;
  }
  if (options.accessory && options.accessory !== "선택 안함") {
    clothingDescription += `\n- Accessory: The person should also be wearing a ${options.accessory}.`;
  }
  if (options.additionalRequest && options.additionalRequest.trim() !== "") {
    clothingDescription += `\n- Additional Request: ${options.additionalRequest.trim()}`;
  }

  // Combine and clean up the final prompt
  return `${baseInstruction.trim()} ${clothingDescription.trim()}`.replace(/\s+/g, " ");
}

const selectClassName =
  "w-full rounded-full border px-4 py-2 text-xs font-semibold transition focus:outline-none";

const selectStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

const selectHoverStyle = {
  borderColor: 'var(--accent-primary)',
  color: 'var(--accent-primary)',
};

// --- Main Component ---
export default function FashionFittingPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [options, setOptions] = useState<FashionOptions>({
    gender: "male",
    style: "Casual",
    top: "T-shirt",
    bottom: "Jeans",
    color: colorPalettes[0],
    season: seasonOptions[0],
    accessory: accessoryOptions[0],
    additionalRequest: "",
  });

  const isReady = Boolean(sourceImage);

  const currentStyles = useMemo(() => clothingData[options.gender], [options.gender]);
  const currentItems = useMemo(() => {
    return clothingData[options.gender][options.style];
  }, [options.gender, options.style]);

  const handleGenderChange = (gender: Gender) => {
    const styles = clothingData[gender];
    const newStyle = Object.keys(styles)[0];
    const newTop = styles[newStyle].tops[0];
    const newBottom = styles[newStyle].bottoms[0];
    setOptions({
      ...options,
      gender,
      style: newStyle,
      top: newTop,
      bottom: newBottom,
    });
  };

  const handleStyleChange = (style: string) => {
    const styles = clothingData[options.gender];
    const newTop = styles[style].tops[0];
    const newBottom = styles[style].bottoms[0];
    setOptions((prev) => ({ ...prev, style, top: newTop, bottom: newBottom }));
  };

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setSourceImage(dataUrl);
      setResultImage(null);
      setMessage("이미지가 업로드되었습니다. 어울리는 착장을 구성해 보세요.");
      setError(null);
    } catch {
      setError("이미지를 불러오지 못했습니다.");
    }
  };

  const handleGenerate = async () => {
    if (!sourceImage) {
      setError("먼저 본인 사진을 업로드해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage("AI가 가상 피팅을 진행 중입니다...");

      const prompt = buildPrompt(options);
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }, { inlineData: { mimeType: "image/png" as const, data: extractBase64Payload(sourceImage) } }],
          },
        ],
      };

      const generated = await generateGeminiImage(payload, { retries: 3 });
      setResultImage(generated);
      setMessage("완성! 새로운 스타일을 확인해 보세요.");
    } catch (generationError) {
      console.error(generationError);
      setError(
        generationError instanceof Error ? generationError.message : "이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="mb-10 rounded-3xl border p-8 shadow-lg" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', boxShadow: '0 10px 25px rgba(160, 144, 107, 0.1)' }}>
        <h1 className="text-3xl font-bold md:text-4xl" style={{ color: 'var(--text-primary)' }}>AI 패션 가상 피팅룸</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
          사진 속 실룣은 그대로 유지하면서 룩만 교체해 주는 가상 피팅 서비스입니다. 성별, 스타일, 의상 등을 선택하면 AI가
          화보급 스타일링을 완성합니다.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[420px,1fr]">
        <div className="flex flex-col gap-6 rounded-3xl border p-6" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="space-y-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>1. 현재 착장 사진</span>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition hover:border-opacity-80" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              <input type="file" className="hidden" accept="image/*" onChange={(event) => handleUpload(event.target.files)} />
              <svg className="h-10 w-10" style={{ color: 'var(--accent-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-sm font-semibold">이미지 선택하기</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>전신 또는 허리 위 사진이 가장 잘 어울립니다.</span>
            </label>
          </div>

          {/* --- Options UI --- */}
          <div>
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>성별</span>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => handleGenderChange("male")} className="rounded-full border px-4 py-2 text-xs font-semibold transition" style={options.gender === "male" ? { borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', opacity: 0.9 } : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
                남성
              </button>
              <button onClick={() => handleGenderChange("female")} className="rounded-full border px-4 py-2 text-xs font-semibold transition" style={options.gender === "female" ? { borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', opacity: 0.9 } : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
                여성
              </button>
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>스타일</span>
            <div className="mt-3">
              <select value={options.style} onChange={(e) => handleStyleChange(e.target.value)} className={selectClassName} style={selectStyle}>
                {Object.keys(currentStyles).map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>상의</span>
              <div className="mt-3">
                <select value={options.top} onChange={(e) => setOptions((p) => ({ ...p, top: e.target.value }))} className={selectClassName} style={selectStyle}>
                  {currentItems.tops.map((item: string) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>하의</span>
              <div className="mt-3">
                <select value={options.bottom} onChange={(e) => setOptions((p) => ({ ...p, bottom: e.target.value }))} className={selectClassName} style={selectStyle}>
                  {currentItems.bottoms.map((item: string) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>계절</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {seasonOptions.map((season) => (
                <button key={season} onClick={() => setOptions((p) => ({ ...p, season }))} className="rounded-full border px-4 py-2 text-xs font-semibold transition" style={options.season === season ? { borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', opacity: 0.9 } : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
                  {season}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>액세서리</span>
            <div className="mt-3">
              <select value={options.accessory} onChange={(e) => setOptions((p) => ({ ...p, accessory: e.target.value }))} className={selectClassName} style={selectStyle}>
                {accessoryOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>색상 계열</span>
            <div className="mt-3">
              <select value={options.color} onChange={(e) => setOptions((p) => ({ ...p, color: e.target.value }))} className={selectClassName} style={selectStyle}>
                {colorPalettes.map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>추가 요청</span>
            <textarea
              value={options.additionalRequest}
              onChange={(event) => setOptions((prev) => ({ ...prev, additionalRequest: event.target.value }))}
              placeholder="예) 셔츠 단추 두 개 풀고, 바지는 롤업 스타일로"
              className="mt-2 h-24 w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none"
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          <button
            className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }}
            onClick={handleGenerate}
            disabled={!isReady || isLoading}
          >
            {isLoading ? "피팅 중..." : "AI 가상 피팅"}
          </button>

          <AnimatePresence>
            {(message || error) && (
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
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>원본 이미지</h3>
            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
              {sourceImage ? (
                <img src={sourceImage} alt="원본" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>사진을 업로드하면 미리보기됩니다.</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border p-6" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>결과 미리보기</h3>
            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ backgroundColor: 'rgba(160, 144, 107, 0.1)' }}>
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent', opacity: 0.5 }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>새로운 룩을 합성하는 중...</span>
                </div>
              )}
              {resultImage ? (
                <img src={resultImage} alt="패션 결과" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>가상 피팅 결과가 여기에 표시됩니다.</span>
              )}
            </div>
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={!resultImage || isLoading ? 
                { backgroundColor: 'var(--border-color)', color: 'var(--text-muted)' } : 
                { backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }
              }
              disabled={!resultImage || isLoading}
              onClick={() => resultImage && downloadBase64Image(resultImage, "ai-fashion-fitting.png")}
            >
              결과 다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

