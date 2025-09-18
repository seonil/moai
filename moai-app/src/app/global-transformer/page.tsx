"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  downloadBase64Image,
  extractBase64Payload,
  readFileAsDataURL,
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

interface RaceOption {
  label: string;
  prompt: string;
}

interface GenderOption {
  label: "여성" | "남성";
  prompt: string;
}

interface OutfitDescription {
  ko: string;
  en: string;
}

interface CountryProfile {
  id: string;
  name: string;
  description: string;
  outfits: Record<GenderOption["label"], OutfitDescription>;
  palette: string;
}

const RACES: RaceOption[] = [
  { label: "동아시아", prompt: "East Asian" },
  { label: "서유럽", prompt: "Western European" },
  { label: "북유럽", prompt: "Nordic" },
  { label: "중동", prompt: "Middle Eastern" },
  { label: "남미", prompt: "Latin American" },
  { label: "남아시아", prompt: "South Asian" },
  { label: "아프리카", prompt: "Sub-Saharan African" },
  { label: "북미", prompt: "North American" },
  { label: "오세아니아", prompt: "Oceanian" },
  { label: "중앙아시아", prompt: "Central Asian" },
];

const GENDERS: GenderOption[] = [
  { label: "여성", prompt: "female" },
  { label: "남성", prompt: "male" },
];

const COUNTRIES: CountryProfile[] = [
  {
    id: "korea",
    name: "대한민국",
    description: "현대와 전통이 공존하는 절제된 한옥 미학",
    palette: "따뜻한 자연광, 부드러운 파스텔 톤",
    outfits: {
      여성: { ko: "모던 한복 드레스", en: "a modern hanbok inspired dress" },
      남성: {
        ko: "정갈한 한복 정장",
        en: "a tailored contemporary hanbok suit",
      },
    },
  },
  {
    id: "japan",
    name: "일본",
    description: "잔잔한 다도 문화와 목재 건축의 조화",
    palette: "소프트 톤과 정제된 조명",
    outfits: {
      여성: { ko: "우아한 기모노", en: "an elegant silk kimono" },
      남성: { ko: "격식을 갖춘 하카마", en: "a formal hakama" },
    },
  },
  {
    id: "india",
    name: "인도",
    description: "화려한 자수와 대담한 색채의 향연",
    palette: "사프란, 에메랄드, 골드 하이라이트",
    outfits: {
      여성: {
        ko: "전통 사리",
        en: "an embellished saree with intricate embroidery",
      },
      남성: { ko: "셰르와니 수트", en: "a detailed sherwani ensemble" },
    },
  },
  {
    id: "brazil",
    name: "브라질",
    description: "열정적인 리듬과 프리미엄 리조트 무드",
    palette: "선명한 트로피컬 톤, 따뜻한 햇빛",
    outfits: {
      여성: { ko: "브라질리안 리조트웨어", en: "luxury Brazilian resort wear" },
      남성: { ko: "화이트 린넨 수트", en: "a crisp white linen suit" },
    },
  },
  {
    id: "egypt",
    name: "이집트",
    description: "파라오 문명의 장엄함과 현대적 감각",
    palette: "사막의 황금색과 깊은 청록",
    outfits: {
      여성: { ko: "보석 장식 드레스", en: "a jewel-adorned ceremonial gown" },
      남성: {
        ko: "전통 갈라비아",
        en: "a ceremonial galabeya with gold accents",
      },
    },
  },
  {
    id: "morocco",
    name: "모로코",
    description: "타일 패턴과 향신료 시장의 생동감",
    palette: "짙은 블루, 테라코타, 황금 조명",
    outfits: {
      여성: { ko: "카프탄 드레스", en: "an ornate Moroccan kaftan" },
      남성: {
        ko: "자바도르",
        en: "a traditional djellaba with fine embroidery",
      },
    },
  },
  {
    id: "france",
    name: "프랑스",
    description: "파리의 시크함과 하우트 쿠튀르 감성",
    palette: "차분한 뉴트럴과 은은한 조명",
    outfits: {
      여성: { ko: "오뜨꾸뛰르 이브닝", en: "a haute couture evening gown" },
      남성: { ko: "클래식 턱시도", en: "a tailored black tuxedo" },
    },
  },
  {
    id: "us",
    name: "미국",
    description: "메트로폴리탄 캐주얼과 스트리트 무드",
    palette: "도시 네온과 콘트라스트 라이트",
    outfits: {
      여성: {
        ko: "하이패션 스트리트 스타일",
        en: "a high-fashion streetwear look",
      },
      남성: {
        ko: "컨템포러리 수트",
        en: "a contemporary tailored suit with street details",
      },
    },
  },
  {
    id: "turkey",
    name: "튀르키예",
    description: "비잔틴과 오스만 제국의 장식성",
    palette: "보석톤과 황혼빛",
    outfits: {
      여성: { ko: "전통 장식 의상", en: "an ornate Ottoman-inspired gown" },
      남성: {
        ko: "베스트와 카프탄",
        en: "a richly detailed kaftan with a silk vest",
      },
    },
  },
  {
    id: "finland",
    name: "핀란드",
    description: "북유럽의 미니멀리즘과 오로라 분위기",
    palette: "차가운 블루와 은은한 실버",
    outfits: {
      여성: { ko: "울 케이프 코트", en: "a minimal nordic wool cape" },
      남성: { ko: "캐시미어 롱코트", en: "a tailored cashmere overcoat" },
    },
  },
];

function buildPrompt(options: {
  race: RaceOption;
  gender: GenderOption;
  country: CountryProfile;
}) {
  const outfit = options.country.outfits[options.gender.label];

  return `You are a cultural concept artist. Transform the person from the reference image into a ${options.race.prompt} ${options.gender.prompt} living in ${options.country.name}. Keep their face, identity, pose, expression, lighting and background identical. Dress them in ${outfit.en} (${outfit.ko}) and express the mood of ${options.country.description}. The colour palette should reflect ${options.country.palette}. Output only a photorealistic image.`;
}

export default function GlobalTransformerPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedRace, setSelectedRace] = useState<RaceOption | null>(null);
  const [selectedGender, setSelectedGender] = useState<GenderOption | null>(
    null,
  );
  const [selectedCountry, setSelectedCountry] = useState<CountryProfile | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "info" | "success";
    text: string;
  } | null>(null);

  const isReady = Boolean(
    sourceImage && selectedRace && selectedGender && selectedCountry,
  );

  const promptPreview = useMemo(() => {
    if (!isReady || !selectedRace || !selectedGender || !selectedCountry)
      return "";
    return buildPrompt({
      race: selectedRace,
      gender: selectedGender,
      country: selectedCountry,
    });
  }, [isReady, selectedRace, selectedGender, selectedCountry]);

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setSourceImage(dataUrl);
      setResultImage(null);
      setError(null);
      setFeedback({
        type: "info",
        text: "이미지 업로드 완료. 변신 옵션을 선택하세요.",
      });
    } catch {
      setError("이미지를 읽어오지 못했습니다.");
      setFeedback(null);
    }
  };

  const handleGenerate = async () => {
    if (
      !isReady ||
      !selectedRace ||
      !selectedGender ||
      !selectedCountry ||
      !sourceImage
    ) {
      setError("이미지와 옵션을 모두 설정해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResultImage(null);
      setFeedback({ type: "info", text: "문화 변환을 적용하는 중입니다..." });

      const prompt = buildPrompt({
        race: selectedRace,
        gender: selectedGender,
        country: selectedCountry,
      });
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
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      } as const;

      const generated = await generateGeminiImage(payload, { retries: 3 });
      setResultImage(generated);
      setFeedback({
        type: "success",
        text: `${selectedCountry.name} 스타일 변환이 완료되었습니다.`,
      });
    } catch (generationError) {
      console.error(generationError);
      setFeedback(null);
      setError(
        generationError instanceof Error
          ? generationError.message
          : "이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandom = () => {
    const race = RACES[Math.floor(Math.random() * RACES.length)];
    const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
    const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    setSelectedRace(race);
    setSelectedGender(gender);
    setSelectedCountry(country);
    setError(null);
    setFeedback({
      type: "info",
      text: `${country.name} 감성으로 랜덤 조합을 불러왔습니다.`,
    });
  };

  const handleDownload = () => {
    if (!resultImage) return;
    downloadBase64Image(resultImage, `moai-global-transform-${Date.now()}.png`);
  };

  const resetSelections = () => {
    setSelectedRace(null);
    setSelectedGender(null);
    setSelectedCountry(null);
    setResultImage(null);
    setFeedback(null);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section
        className="rounded-3xl border p-8"
        style={{ ...themeSurfaceStyle, boxShadow: themeCardShadow }}
      >
        <h1
          className="text-3xl font-bold md:text-4xl"
          style={themePrimaryTextStyle}
        >
          글로벌 변신 스튜디오
        </h1>
        <p className="mt-3 text-sm leading-6" style={themeSecondaryTextStyle}>
          한 장의 사진으로 다양한 문화권의 의상과 팔레트를 입혀보세요. 얼굴과
          배경은 그대로 유지한 채로 옷차림과 분위기만 자연스럽게 바꿔드립니다.
        </p>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,360px),1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border p-6" style={themeSurfaceStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm font-semibold"
                  style={themePrimaryTextStyle}
                >
                  1. 기준 사진 업로드
                </p>
                <p className="mt-1 text-xs" style={themeMutedTextStyle}>
                  얼굴이 선명하게 보이는 상반신 사진이 가장 잘 어울립니다.
                </p>
              </div>
              <input
                id="global-transformer-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleUpload(event.target.files)}
              />
              <label
                htmlFor="global-transformer-upload"
                className="cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                style={themeOutlineButtonStyle}
              >
                이미지 선택하기
              </label>
            </div>

            <div
              className="mt-5 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed"
              style={themeInsetStyle}
            >
              {sourceImage ? (
                <img
                  src={sourceImage}
                  alt="업로드된 사진"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm" style={themeMutedTextStyle}>
                  사진을 업로드하면 여기에서 미리볼 수 있습니다.
                </span>
              )}
            </div>
          </div>

          <div
            className="space-y-6 rounded-3xl border p-6"
            style={themeSurfaceStyle}
          >
            <div>
              <span
                className="text-xs uppercase tracking-[0.3em]"
                style={themeMutedTextStyle}
              >
                문화권 선택
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {RACES.map((race) => {
                  const isActive = selectedRace?.label === race.label;
                  return (
                    <button
                      key={race.label}
                      className="rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                      style={
                        isActive
                          ? themePillStyles.active
                          : themeOutlineButtonStyle
                      }
                      onClick={() => setSelectedRace(race)}
                    >
                      {race.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span
                className="text-xs uppercase tracking-[0.3em]"
                style={themeMutedTextStyle}
              >
                성별 표현
              </span>
              <div className="mt-3 flex gap-2">
                {GENDERS.map((genderOption) => {
                  const isActive = selectedGender?.label === genderOption.label;
                  return (
                    <button
                      key={genderOption.label}
                      className="flex-1 rounded-full border px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                      style={
                        isActive
                          ? themePillStyles.active
                          : themeOutlineButtonStyle
                      }
                      onClick={() => setSelectedGender(genderOption)}
                    >
                      {genderOption.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span
                className="text-xs uppercase tracking-[0.3em]"
                style={themeMutedTextStyle}
              >
                국가 스타일
              </span>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {COUNTRIES.map((country) => {
                  const isActive = selectedCountry?.id === country.id;
                  return (
                    <button
                      key={country.id}
                      className="rounded-2xl border p-4 text-left transition hover:opacity-90"
                      style={{
                        borderColor: isActive
                          ? "var(--accent-primary)"
                          : "var(--border-color)",
                        backgroundColor: isActive
                          ? "var(--accent-secondary)"
                          : "var(--bg-secondary)",
                        color: themePrimaryTextStyle.color,
                        opacity: isActive ? 0.95 : 1,
                      }}
                      onClick={() => setSelectedCountry(country)}
                    >
                      <p className="text-sm font-semibold">{country.name}</p>
                      <p
                        className="mt-1 text-xs"
                        style={themeSecondaryTextStyle}
                      >
                        {country.description}
                      </p>
                      <p
                        className="mt-2 text-[11px]"
                        style={themeMutedTextStyle}
                      >
                        팔레트: {country.palette}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="space-y-4 rounded-3xl border p-6"
            style={themeSurfaceStyle}
          >
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={themeAccentButtonStyle}
                onClick={handleGenerate}
                disabled={!isReady || isLoading}
              >
                {isLoading ? "문화 변환 중..." : "글로벌 변신 실행"}
              </button>
              <button
                className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={themeOutlineButtonStyle}
                onClick={handleRandom}
                disabled={isLoading}
              >
                랜덤 조합
              </button>
              <button
                className="rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-80"
                style={themeOutlineButtonStyle}
                onClick={resetSelections}
                disabled={isLoading}
              >
                선택 초기화
              </button>
            </div>

            <AnimatePresence>
              {(error || feedback) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border px-4 py-3 text-sm"
                  style={
                    error
                      ? themeMessageStyles.error
                      : feedback?.type === "success"
                        ? themeMessageStyles.success
                        : themeMessageStyles.info
                  }
                >
                  {error ?? feedback?.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border p-6" style={themeSurfaceStyle}>
            <h3
              className="text-base font-semibold"
              style={themePrimaryTextStyle}
            >
              결과 미리보기
            </h3>
            <div
              className="relative mt-4 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-dashed"
              style={themeInsetStyle}
            >
              {isLoading && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs"
                  style={{
                    ...themeLoaderOverlayStyle,
                    color: themeSecondaryTextStyle.color,
                  }}
                >
                  <div
                    className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
                    style={{
                      borderColor: "var(--accent-primary)",
                      borderTopColor: "transparent",
                      opacity: 0.55,
                    }}
                  />
                  <span style={themeSecondaryTextStyle}>
                    새로운 이미지를 합성하는 중...
                  </span>
                </div>
              )}

              {resultImage ? (
                <img
                  src={resultImage}
                  alt="글로벌 변신 결과"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm" style={themeMutedTextStyle}>
                  변환을 실행하면 결과가 여기에 표시됩니다.
                </span>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={
                  resultImage ? themeAccentButtonStyle : themeOutlineButtonStyle
                }
                onClick={handleDownload}
                disabled={!resultImage || isLoading}
              >
                결과 다운로드
              </button>
            </div>
          </div>

          {promptPreview && (
            <motion.pre
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="whitespace-pre-wrap rounded-3xl border p-6 text-xs leading-6"
              style={{
                ...themeSurfaceStyle,
                backgroundColor: "var(--bg-tertiary)",
              }}
            >
              {promptPreview}
            </motion.pre>
          )}
        </div>
      </div>
    </div>
  );
}
