import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, unauthorizedResponse } from "@/lib/auth";
import { calculateDashboardStats } from "@/lib/dashboard";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return unauthorizedResponse();
    }

    const supabase = getSupabaseAdmin();
    const [{ data: logs, error: logsError }, { data: feedback, error: feedbackError }] =
      await Promise.all([
        supabase
          .from("chat_logs")
          .select("id,user_question,ai_answer,is_resolved,created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("feedback").select("id,chat_id,score,comment,created_at")
      ]);

    if (logsError) {
      throw new Error(logsError.message);
    }

    if (feedbackError) {
      throw new Error(feedbackError.message);
    }

    return NextResponse.json({
      stats: calculateDashboardStats(logs || [], feedback || []),
      logs: logs || []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "获取咨询记录失败。", detail: message },
      { status: 500 }
    );
  }
}
