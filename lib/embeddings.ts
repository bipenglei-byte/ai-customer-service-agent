const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

export async function createEmbedding(input: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for embeddings.");
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Embedding request failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };

  const embedding = payload.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("Embedding response did not include an embedding.");
  }

  return embedding;
}
