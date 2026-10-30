import { GoogleGenAI, ThinkingLevel, type Schema } from '@google/genai';

export const KAIZEN_FAST_CHAT_MODEL = 'gemini-3.1-flash-lite';
export const KAIZEN_DEEP_REPORT_MODEL = 'gemini-3.8-flash';

export class GeminiConfigurationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 503, code = 'GEMINI_KEY_MISSING') {
    super(message);
    this.name = 'GeminiConfigurationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

let cachedClient: GoogleGenAI | null = null;
let cachedKey = '';

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiConfigurationError(
      'Gemini AI is not configured yet. Please ensure GEMINI_API_KEY is set in the Settings > Secrets panel.',
      503,
      'GEMINI_KEY_MISSING'
    );
  }

  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedKey = apiKey;
  }

  return cachedClient;
}

export async function generateStructuredJson<T>(params: {
  model?: string;
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  thinkingLevel?: ThinkingLevel;
  parse: (raw: unknown) => T;
}): Promise<T> {
  const ai = getGenAIClient();
  const targetModel = params.model || KAIZEN_FAST_CHAT_MODEL;
  const defaultThinking =
    targetModel === KAIZEN_FAST_CHAT_MODEL ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW;

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: params.prompt,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          thinkingConfig: {
            thinkingLevel: params.thinkingLevel ?? defaultThinking,
          },
        },
      });

      const text = (response.text ?? '{}').trim();
      const parsedJson = JSON.parse(text);
      return params.parse(parsedJson);
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err || '');
      const status = Number(err?.status || err?.statusCode || 0);

      if (
        status === 403 ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('API_KEY_INVALID')
      ) {
        throw new GeminiConfigurationError(
          'The configured Gemini API key could not be verified. Please check your key in the Settings > Secrets panel.',
          403,
          'GEMINI_KEY_INVALID'
        );
      }

      if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
        throw new GeminiConfigurationError(
          'Gemini API quota limit reached. Please wait a moment or select a billing-enabled key in Settings > Secrets.',
          429,
          'GEMINI_QUOTA_EXCEEDED'
        );
      }

      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  console.error('Gemini structured generation failed:', lastError);
  throw new Error(
    lastError instanceof Error
      ? `AI evaluation failed: ${lastError.message}`
      : 'AI evaluation failed unexpectedly.'
  );
}
