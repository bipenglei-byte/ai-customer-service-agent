import { createEmbedding } from "@/lib/embeddings";
import { generateCustomerAnswer } from "@/lib/llm";
import {
  buildCustomerPrompt,
  FALLBACK_TRANSFER_MESSAGE,
  type KnowledgeContext
} from "@/lib/prompts";
import { getSupabaseAdmin, type KnowledgeMatch } from "@/lib/supabase";

export const RAG_TOP_K = 5;
export const RAG_SIMILARITY_THRESHOLD = Number(
  process.env.RAG_SIMILARITY_THRESHOLD || 0.5
);

const CUSTOMER_SERVICE_KEYWORDS = [
  "退款",
  "退货",
  "发货",
  "物流",
  "售后",
  "价格",
  "费用",
  "套餐",
  "订单",
  "产品",
  "人工",
  "客服"
];

export type RagAnswer = {
  answer: string;
  isResolved: boolean;
  matchedKnowledge: KnowledgeContext[];
  retrievedKnowledge: KnowledgeContext[];
};

type RagDependencies = {
  embed: (input: string) => Promise<number[]>;
  search: (embedding: number[]) => Promise<KnowledgeMatch[]>;
  complete: (prompt: string) => Promise<string>;
};

export function extractKnowledgeKeywords(question: string) {
  return CUSTOMER_SERVICE_KEYWORDS.filter((keyword) =>
    question.includes(keyword)
  );
}

async function answerFromContexts(
  question: string,
  contexts: KnowledgeContext[]
): Promise<RagAnswer> {
  const prompt = buildCustomerPrompt(question, contexts);
  const answer = await generateCustomerAnswer(prompt);

  return {
    answer,
    isResolved: answer.trim() !== FALLBACK_TRANSFER_MESSAGE,
    matchedKnowledge: contexts,
    retrievedKnowledge: contexts
  };
}

export async function runRagWithDependencies(
  question: string,
  dependencies: RagDependencies
): Promise<RagAnswer> {
  const embedding = await dependencies.embed(question);
  const matches = await dependencies.search(embedding);
  const retrievedKnowledge = matches.map((item) => ({
    title: item.title,
    content: item.content,
    similarity: item.similarity
  }));
  const relevantMatches = matches.filter(
    (item) => item.similarity >= RAG_SIMILARITY_THRESHOLD
  );

  if (relevantMatches.length === 0) {
    console.info(
      "[rag:no-match]",
      JSON.stringify({
        threshold: RAG_SIMILARITY_THRESHOLD,
        retrieved: retrievedKnowledge.map((item) => ({
          title: item.title,
          similarity: item.similarity
        }))
      })
    );

    return {
      answer: FALLBACK_TRANSFER_MESSAGE,
      isResolved: false,
      matchedKnowledge: [],
      retrievedKnowledge
    };
  }

  const contexts = relevantMatches.map((item) => ({
    title: item.title,
    content: item.content,
    similarity: item.similarity
  }));

  const prompt = buildCustomerPrompt(question, contexts);
  const answer = await dependencies.complete(prompt);

  return {
    answer,
    isResolved: answer.trim() !== FALLBACK_TRANSFER_MESSAGE,
    matchedKnowledge: contexts,
    retrievedKnowledge
  };
}

export async function answerWithRag(question: string): Promise<RagAnswer> {
  const supabase = getSupabaseAdmin();
  const keywordMatches = await searchKnowledgeByKeywords(supabase, question);

  if (keywordMatches.length > 0) {
    const contexts = keywordMatches.map((item) => ({
      title: item.title,
      content: item.content,
      similarity: item.similarity
    }));

    return answerFromContexts(question, contexts);
  }

  return runRagWithDependencies(question, {
    embed: createEmbedding,
    search: async (embedding) => {
      const { data, error } = await supabase.rpc("match_knowledge_base", {
        query_embedding: embedding,
        match_threshold: 0,
        match_count: RAG_TOP_K
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as KnowledgeMatch[];
    },
    complete: generateCustomerAnswer
  });
}

async function searchKnowledgeByKeywords(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  question: string
) {
  const keywords = extractKnowledgeKeywords(question);

  if (keywords.length === 0) {
    return [];
  }

  const orFilter = keywords
    .flatMap((keyword) => [
      `title.ilike.%${keyword}%`,
      `content.ilike.%${keyword}%`
    ])
    .join(",");

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id,title,content,created_at")
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(RAG_TOP_K);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item) => ({
    ...item,
    similarity: 1
  })) as KnowledgeMatch[];
}
