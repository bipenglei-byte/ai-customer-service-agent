import { afterEach, describe, expect, it, vi } from "vitest";
import { generateCustomerAnswer, resolveLlmConfig } from "@/lib/llm";

const originalEnv = { ...process.env };

function resetEnv() {
  process.env = { ...originalEnv };
  delete process.env.LLM_PROVIDER;
  delete process.env.OLLAMA_BASE_URL;
  delete process.env.OLLAMA_MODEL;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_MODEL;
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_MODEL;
  delete process.env.SILICONFLOW_API_KEY;
  delete process.env.SILICONFLOW_BASE_URL;
  delete process.env.SILICONFLOW_MODEL;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_BASE_URL;
  delete process.env.DEEPSEEK_MODEL;
}

describe("LLM provider resolver", () => {
  afterEach(() => {
    resetEnv();
    vi.restoreAllMocks();
  });

  it("uses Ollama when LLM_PROVIDER is not set", () => {
    resetEnv();

    expect(resolveLlmConfig()).toMatchObject({
      provider: "ollama",
      baseUrl: "http://localhost:11434",
      model: "qwen2.5:7b"
    });
  });

  it("falls back to Ollama when a cloud provider has no API key", () => {
    resetEnv();
    process.env.LLM_PROVIDER = "openrouter";
    process.env.OPENROUTER_MODEL = "qwen/qwen-2.5-7b-instruct";

    expect(resolveLlmConfig()).toMatchObject({
      provider: "ollama",
      baseUrl: "http://localhost:11434",
      model: "qwen2.5:7b"
    });
  });

  it("uses Groq endpoint and model from environment when key exists", () => {
    resetEnv();
    process.env.LLM_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "groq-key";
    process.env.GROQ_MODEL = "llama-3.1-8b-instant";

    expect(resolveLlmConfig()).toMatchObject({
      provider: "groq",
      apiKey: "groq-key",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.1-8b-instant"
    });
  });

  it("uses SiliconFlow endpoint and model from environment when key exists", () => {
    resetEnv();
    process.env.LLM_PROVIDER = "siliconflow";
    process.env.SILICONFLOW_API_KEY = "silicon-key";
    process.env.SILICONFLOW_MODEL = "Qwen/Qwen2.5-7B-Instruct";

    expect(resolveLlmConfig()).toMatchObject({
      provider: "siliconflow",
      apiKey: "silicon-key",
      endpoint: "https://api.siliconflow.cn/v1/chat/completions",
      model: "Qwen/Qwen2.5-7B-Instruct"
    });
  });

  it("uses DeepSeek endpoint and model from environment when key exists", () => {
    resetEnv();
    process.env.LLM_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "deepseek-key";
    process.env.DEEPSEEK_MODEL = "deepseek-chat";

    expect(resolveLlmConfig()).toMatchObject({
      provider: "deepseek",
      apiKey: "deepseek-key",
      endpoint: "https://api.deepseek.com/v1/chat/completions",
      model: "deepseek-chat"
    });
  });
});

describe("generateCustomerAnswer", () => {
  afterEach(() => {
    resetEnv();
    vi.restoreAllMocks();
  });

  it("calls Ollama /api/chat with stream disabled and parses message.content", async () => {
    resetEnv();
    process.env.LLM_PROVIDER = "ollama";
    process.env.OLLAMA_MODEL = "llama3.1:8b";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("llama3.1:8b");
      expect(body.stream).toBe(false);
      expect(body.messages).toHaveLength(2);

      return Response.json({
        message: {
          content: "您好，这是 Ollama 的回答。"
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateCustomerAnswer("测试问题")).resolves.toBe(
      "您好，这是 Ollama 的回答。"
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/api/chat",
      expect.any(Object)
    );
  });

  it("calls OpenAI-compatible providers and parses choices[0].message.content", async () => {
    resetEnv();
    process.env.LLM_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    process.env.OPENROUTER_MODEL = "qwen/qwen-2.5-7b-instruct";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer openrouter-key");
      expect(body.model).toBe("qwen/qwen-2.5-7b-instruct");
      expect(body.messages).toHaveLength(2);

      return Response.json({
        choices: [
          {
            message: {
              content: "您好，这是 OpenRouter 的回答。"
            }
          }
        ]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateCustomerAnswer("测试问题")).resolves.toBe(
      "您好，这是 OpenRouter 的回答。"
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.any(Object)
    );
  });
});
