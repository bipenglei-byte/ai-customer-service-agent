import { CUSTOMER_AGENT_SYSTEM_PROMPT } from "@/lib/prompts";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function getChatConfig() {
  const provider = (process.env.LLM_PROVIDER || "deepseek").toLowerCase();

  if (provider === "openai") {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini"
    };
  }

  return {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    model: "deepseek-chat"
  };
}

export async function generateCustomerAnswer(userPrompt: string): Promise<string> {
  const config = getChatConfig();

  if (!config.apiKey) {
    throw new Error("LLM API key is missing.");
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: CUSTOMER_AGENT_SYSTEM_PROMPT
    },
    {
      role: "user",
      content: userPrompt
    }
  ];

  const response = await fetch(
    `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
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
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const answer = payload.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("LLM response did not include an answer.");
  }

  return answer;
}
