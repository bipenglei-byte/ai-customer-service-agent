import { createEmbedding } from "@/lib/embeddings";
import { generateCustomerAnswer } from "@/lib/llm";
import {
  buildCustomerPrompt,
  FALLBACK_TRANSFER_MESSAGE,
  type KnowledgeContext
} from "@/lib/prompts";
import { getSupabaseAdmin, type KnowledgeMatch } from "@/lib/supabase";

export const RAG_TOP_K = 5;
export const RAG_SIMILARITY_THRESHOLD = 0.7;

export type RagAnswer = {
  answer: string;
  isResolved: boolean;
  matchedKnowledge: KnowledgeContext[];
};

type RagDependencies = {
  embed: (input: string) => Promise<number[]>;
  search: (embedding: number[]) => Promise<KnowledgeMatch[]>;
  complete: (prompt: string) => Promise<string>;
};

export async function runRagWithDependencies(
  question: string,
  dependencies: RagDependencies
): Promise<RagAnswer> {
  const embedding = await dependencies.embed(question);
  const matches = await dependencies.search(embedding);
  const relevantMatches = matches.filter(
    (item) => item.similarity >= RAG_SIMILARITY_THRESHOLD
  );

  if (relevantMatches.length === 0) {
    return {
      answer: FALLBACK_TRANSFER_MESSAGE,
      isResolved: false,
      matchedKnowledge: []
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
    matchedKnowledge: contexts
  };
}

export async function answerWithRag(question: string): Promise<RagAnswer> {
  const supabase = getSupabaseAdmin();

  return runRagWithDependencies(question, {
    embed: createEmbedding,
    search: async (embedding) => {
      const { data, error } = await supabase.rpc("match_knowledge_base", {
        query_embedding: embedding,
        match_threshold: RAG_SIMILARITY_THRESHOLD,
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
