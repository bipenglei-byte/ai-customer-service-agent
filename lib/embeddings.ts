export type EmbeddingProvider = "siliconflow" | "ollama" | "openai";

type CloudEmbeddingConfig = {
  provider: "siliconflow" | "openai";
  apiKey: string;
  endpoint: string;
  model: string;
  dimension: number;
};

type OllamaEmbeddingConfig = {
  provider: "ollama";
  endpoint: string;
  model: string;
  dimension: number;
};

export type EmbeddingConfig = CloudEmbeddingConfig | OllamaEmbeddingConfig;

type OpenAiCompatibleEmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
};

type OllamaEmbeddingResponse = {
  embeddings?: number[][];
  embedding?: number[];
};

const DEFAULT_SILICONFLOW_MODEL = "BAAI/bge-m3";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_EMBEDDING_MODEL = "mxbai-embed-large";

function cleanBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

function cleanApiKey(apiKey: string) {
  return apiKey
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function embeddingDimension(defaultDimension: number) {
  const configured = Number(process.env.EMBEDDING_DIMENSION);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : defaultDimension;
}

function ollamaEmbeddingConfig(): OllamaEmbeddingConfig {
  const baseUrl = cleanBaseUrl(
    process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL
  );

  return {
    provider: "ollama",
    endpoint: `${baseUrl}/api/embed`,
    model: process.env.OLLAMA_EMBEDDING_MODEL || DEFAULT_OLLAMA_EMBEDDING_MODEL,
    dimension: embeddingDimension(1024)
  };
}

function embeddingProviderFromEnv(): EmbeddingProvider {
  const provider = (process.env.EMBEDDING_PROVIDER || "siliconflow").toLowerCase();
  const supportedProviders: EmbeddingProvider[] = [
    "siliconflow",
    "ollama",
    "openai"
  ];

  if (supportedProviders.includes(provider as EmbeddingProvider)) {
    return provider as EmbeddingProvider;
  }

  return "siliconflow";
}

export function resolveEmbeddingConfig(): EmbeddingConfig {
  const provider = embeddingProviderFromEnv();

  if (provider === "ollama") {
    return ollamaEmbeddingConfig();
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY
      ? cleanApiKey(process.env.OPENAI_API_KEY)
      : "";
    if (!apiKey) {
      return ollamaEmbeddingConfig();
    }

    return {
      provider,
      apiKey,
      endpoint: "https://api.openai.com/v1/embeddings",
      model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
      dimension: embeddingDimension(1536)
    };
  }

  const apiKey = process.env.SILICONFLOW_API_KEY
    ? cleanApiKey(process.env.SILICONFLOW_API_KEY)
    : "";
  if (!apiKey) {
    return ollamaEmbeddingConfig();
  }

  return {
    provider,
    apiKey,
    endpoint: "https://api.siliconflow.com/v1/embeddings",
    model: process.env.SILICONFLOW_EMBEDDING_MODEL || DEFAULT_SILICONFLOW_MODEL,
    dimension: embeddingDimension(1024)
  };
}

async function createOpenAiCompatibleEmbedding(
  input: string,
  config: CloudEmbeddingConfig
) {
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      input
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `${config.provider} embedding request failed: ${response.status} ${detail}`
    );
  }

  const payload = (await response.json()) as OpenAiCompatibleEmbeddingResponse;
  const embedding = payload.data?.[0]?.embedding;

  if (!embedding) {
    throw new Error(`${config.provider} response did not include an embedding.`);
  }

  return embedding;
}

async function createOllamaEmbedding(
  input: string,
  config: OllamaEmbeddingConfig
) {
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      input
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama embedding request failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as OllamaEmbeddingResponse;
  const embedding = payload.embeddings?.[0] || payload.embedding;

  if (!embedding) {
    throw new Error("Ollama response did not include an embedding.");
  }

  return embedding;
}

export async function createEmbedding(input: string): Promise<number[]> {
  const config = resolveEmbeddingConfig();

  if (config.provider === "ollama") {
    return createOllamaEmbedding(input, config);
  }

  return createOpenAiCompatibleEmbedding(input, config);
}
