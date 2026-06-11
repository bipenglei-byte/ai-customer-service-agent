import { CUSTOMER_AGENT_SYSTEM_PROMPT } from "@/lib/prompts";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmProvider =
  | "ollama"
  | "openrouter"
  | "groq"
  | "siliconflow"
  | "deepseek";

type OllamaConfig = {
  provider: "ollama";
  baseUrl: string;
  endpoint: string;
  model: string;
};

type CloudConfig = {
  provider: Exclude<LlmProvider, "ollama">;
  apiKey: string;
  endpoint: string;
  model: string;
};

export type LlmConfig = OllamaConfig | CloudConfig;

type OpenAiCompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type OllamaResponse = {
  message?: {
    content?: string;
  };
};

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "qwen2.5:7b";
const DEFAULT_SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";

const providerApiKeyEnv: Record<Exclude<LlmProvider, "ollama">, string> = {
  openrouter: "OPENROUTER_API_KEY",
  groq: "GROQ_API_KEY",
  siliconflow: "SILICONFLOW_API_KEY",
  deepseek: "DEEPSEEK_API_KEY"
};

function cleanBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

function ollamaConfig(): OllamaConfig {
  const baseUrl = cleanBaseUrl(
    process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL
  );

  return {
    provider: "ollama",
    baseUrl,
    endpoint: `${baseUrl}/api/chat`,
    model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL
  };
}

function providerFromEnv(): LlmProvider {
  const provider = (process.env.LLM_PROVIDER || "ollama").toLowerCase();
  const supportedProviders: LlmProvider[] = [
    "ollama",
    "openrouter",
    "groq",
    "siliconflow",
    "deepseek"
  ];

  if (supportedProviders.includes(provider as LlmProvider)) {
    return provider as LlmProvider;
  }

  return "ollama";
}

function deepseekEndpoint() {
  const baseUrl = cleanBaseUrl(
    process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1"
  );

  if (baseUrl.endsWith("/chat/completions")) {
    return baseUrl;
  }

  if (baseUrl.endsWith("/v1")) {
    return `${baseUrl}/chat/completions`;
  }

  return `${baseUrl}/v1/chat/completions`;
}

export function resolveLlmConfig(): LlmConfig {
  const provider = providerFromEnv();

  if (provider === "ollama") {
    return ollamaConfig();
  }

  const apiKey = process.env[providerApiKeyEnv[provider]];

  if (!apiKey) {
    return ollamaConfig();
  }

  if (provider === "openrouter") {
    return {
      provider,
      apiKey,
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: process.env.OPENROUTER_MODEL || ""
    };
  }

  if (provider === "groq") {
    return {
      provider,
      apiKey,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: process.env.GROQ_MODEL || ""
    };
  }

  if (provider === "siliconflow") {
    const baseUrl = cleanBaseUrl(
      process.env.SILICONFLOW_BASE_URL || DEFAULT_SILICONFLOW_BASE_URL
    );

    return {
      provider,
      apiKey,
      endpoint: `${baseUrl}/chat/completions`,
      model: process.env.SILICONFLOW_MODEL || ""
    };
  }

  return {
    provider,
    apiKey,
    endpoint: deepseekEndpoint(),
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat"
  };
}

function buildMessages(userPrompt: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: CUSTOMER_AGENT_SYSTEM_PROMPT
    },
    {
      role: "user",
      content: userPrompt
    }
  ];
}

async function generateWithOllama(
  config: OllamaConfig,
  messages: ChatMessage[]
) {
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as OllamaResponse;
  const answer = payload.message?.content?.trim();

  if (!answer) {
    throw new Error("Ollama response did not include an answer.");
  }

  return answer;
}

async function generateWithOpenAiCompatible(
  config: CloudConfig,
  messages: ChatMessage[]
) {
  if (!config.model) {
    throw new Error(`${config.provider.toUpperCase()} model is missing.`);
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `${config.provider} request failed: ${response.status} ${detail}`
    );
  }

  const payload = (await response.json()) as OpenAiCompatibleResponse;
  const answer = payload.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error(`${config.provider} response did not include an answer.`);
  }

  return answer;
}

export async function generateCustomerAnswer(userPrompt: string): Promise<string> {
  const config = resolveLlmConfig();
  const messages = buildMessages(userPrompt);

  if (config.provider === "ollama") {
    return generateWithOllama(config, messages);
  }

  return generateWithOpenAiCompatible(config, messages);
}
