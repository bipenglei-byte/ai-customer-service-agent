import { createClient } from "@supabase/supabase-js";

export type KnowledgeBaseRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export type KnowledgeMatch = KnowledgeBaseRow & {
  similarity: number;
};

export type ChatLogRow = {
  id: string;
  user_question: string;
  ai_answer: string;
  is_resolved: boolean;
  created_at: string;
};

export type FeedbackRow = {
  id: string;
  chat_id: string;
  score: number;
  comment: string | null;
  created_at: string;
};

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
