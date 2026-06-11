import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmbedding, resolveEmbeddingConfig } from "@/lib/embeddings";

const originalEnv = { ...process.env };

function resetEnv() {
  process.env = { ...originalEnv };
  delete process.env.EMBEDDING_PROVIDER;
  delete process.env.EMBEDDING_DIMENSION;
  delete process.env.SILICONFLOW_API_KEY;
  delete process.env.SILICONFLOW_EMBEDDING_MODEL;
  delete process.env.OLLAMA_BASE_URL;
  delete process.env.OLLAMA_EMBEDDING_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_EMBEDDING_MODEL;
}

describe("embedding provider resolver", () => {
  afterEach(() => {
    resetEnv();
    vi.restoreAllMocks();
  });

  it("uses SiliconFlow by default when the key exists", () => {
    resetEnv();
    process.env.SILICONFLOW_API_KEY = "silicon-key";

    expect(resolveEmbeddingConfig()).toMatchObject({
      provider: "siliconflow",
      apiKey: "silicon-key",
      endpoint: "https://api.siliconflow.com/v1/embeddings",
      model: "BAAI/bge-m3",
      dimension: 1024
    });
  });

  it("normalizes pasted API keys with Bearer prefix, quotes, or whitespace", () => {
    resetEnv();
    process.env.SILICONFLOW_API_KEY = ' "Bearer silicon-key" ';

    expect(resolveEmbeddingConfig()).toMatchObject({
      provider: "siliconflow",
      apiKey: "silicon-key"
    });
  });

  it("falls back to Ollama when SiliconFlow key is missing", () => {
    resetEnv();

    expect(resolveEmbeddingConfig()).toMatchObject({
      provider: "ollama",
      endpoint: "http://localhost:11434/api/embed",
      model: "mxbai-embed-large",
      dimension: 1024
    });
  });

  it("uses OpenAI only when explicitly selected", () => {
    resetEnv();
    process.env.EMBEDDING_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "openai-key";

    expect(resolveEmbeddingConfig()).toMatchObject({
      provider: "openai",
      apiKey: "openai-key",
      endpoint: "https://api.openai.com/v1/embeddings",
      model: "text-embedding-3-small",
      dimension: 1536
    });
  });
});

describe("createEmbedding", () => {
  afterEach(() => {
    resetEnv();
    vi.restoreAllMocks();
  });

  it("calls SiliconFlow embeddings and parses data[0].embedding", async () => {
    resetEnv();
    process.env.SILICONFLOW_API_KEY = "silicon-key";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer silicon-key");
      expect(body.model).toBe("BAAI/bge-m3");
      expect(body.input).toBe("退款政策");

      return Response.json({
        data: [
          {
            embedding: [0.1, 0.2, 0.3]
          }
        ]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createEmbedding("退款政策")).resolves.toEqual([0.1, 0.2, 0.3]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.siliconflow.com/v1/embeddings",
      expect.any(Object)
    );
  });

  it("calls Ollama /api/embed and parses embeddings[0]", async () => {
    resetEnv();
    process.env.EMBEDDING_PROVIDER = "ollama";
    process.env.OLLAMA_EMBEDDING_MODEL = "mxbai-embed-large";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("mxbai-embed-large");
      expect(body.input).toBe("发货政策");

      return Response.json({
        embeddings: [[0.4, 0.5, 0.6]]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createEmbedding("发货政策")).resolves.toEqual([0.4, 0.5, 0.6]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/api/embed",
      expect.any(Object)
    );
  });
});
