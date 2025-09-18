import { extractBase64Payload } from "@/lib/file";
import { withRetry } from "@/lib/retry";

const IMAGE_MODEL = "gemini-2.5-flash-image-preview";
const TEXT_MODEL = "gemini-2.5-flash-preview-05-20";

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
};

type GeminiResponse<TPart = GeminiPart> = {
  candidates?: Array<{
    content?: { parts?: TPart[] };
    finishReason?: string;
  }>;
};

type GeminiContent = {
  parts: GeminiPart[];
};

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: Record<string, unknown>;
}

interface GeminiCallOptions {
  model?: string;
  retries?: number;
  minTimeout?: number;
}

function resolveApiKey() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API 키(NEXT_PUBLIC_GEMINI_API_KEY)가 설정되어 있지 않습니다.");
  }
  return apiKey;
}

async function callGemini<TResponse>(
  endpoint: string,
  payload: GeminiRequest,
  { retries = 3, minTimeout = 800 }: GeminiCallOptions = {},
): Promise<TResponse> {
  const apiKey = resolveApiKey();
  const url = `${endpoint}?key=${apiKey}`;

  const response = await withRetry(
    async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini API 오류 (${res.status}): ${text}`);
      }

      return (await res.json()) as TResponse;
    },
    {
      retries,
      minTimeout,
      onRetry: (attempt, error) => {
        console.warn(`Gemini API 재시도 ${attempt}/${retries}:`, error);
      },
    },
  );

  return response;
}

export async function generateGeminiImage(
  payload: GeminiRequest,
  options: GeminiCallOptions = {},
): Promise<string> {
  const model = options.model ?? IMAGE_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const result = await callGemini<GeminiResponse>(endpoint, payload, options);

  const candidates = result.candidates ?? [];
  const inlinePart = candidates
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .find((part) => part?.inlineData?.data);

  if (!inlinePart?.inlineData?.data) {
    const finishReason = candidates[0]?.finishReason;
    throw new Error(
      finishReason
        ? `이미지 생성이 중단되었습니다: ${finishReason}`
        : "Gemini API가 이미지 데이터를 반환하지 않았습니다.",
    );
  }

  return `data:image/png;base64,${inlinePart.inlineData.data}`;
}

export async function generateGeminiImageFromDataUrl(
  prompt: string,
  dataUrl: string,
  options: GeminiCallOptions = {},
) {
  const payload: GeminiRequest = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: extractBase64Payload(dataUrl) } },
        ],
      },
    ],
  };

  return generateGeminiImage(payload, options);
}

export async function callGeminiJson(
  prompt: string,
  extraParts: GeminiContent["parts"] = [],
  options: GeminiCallOptions = {},
) {
  const model = options.model ?? TEXT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const payload: GeminiRequest = {
    contents: [
      {
        parts: [{ text: prompt }, ...extraParts],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  return callGemini<GeminiResponse>(endpoint, payload, options);
}
