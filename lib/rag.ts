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
