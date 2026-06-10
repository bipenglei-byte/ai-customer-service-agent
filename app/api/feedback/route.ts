import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      chatId?: string;
      score?: number;
      comment?: string;
    };

    if (!body.chatId || ![1, -1].includes(Number(body.score))) {
      return NextResponse.json(
        { error: "反馈参数不完整。" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("feedback")
      .insert({
        chat_id: body.chatId,
        score: Number(body.score),
        comment: body.comment?.trim() || null
      })
      .select("id,chat_id,score,comment,created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ feedback: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "提交反馈失败。", detail: message },
      { status: 500 }
    );
  }
}
