import { NextRequest, NextResponse } from "next/server";
import { answerWithRag } from "@/lib/rag";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { question?: string };
    const question = body.question?.trim();

    if (!question) {
      return NextResponse.json({ error: "请输入咨询问题。" }, { status: 400 });
    }

    const ragResult = await answerWithRag(question);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("chat_logs")
      .insert({
        user_question: question,
        ai_answer: ragResult.answer,
        is_resolved: ragResult.isResolved
      })
      .select("id,user_question,ai_answer,is_resolved,created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      chatId: data.id,
      answer: ragResult.answer,
      isResolved: ragResult.isResolved,
      matchedKnowledge: ragResult.matchedKnowledge
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "客服响应失败，请稍后再试。", detail: message },
      { status: 500 }
    );
  }
}
