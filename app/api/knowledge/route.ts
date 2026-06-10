import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, unauthorizedResponse } from "@/lib/auth";
import { splitIntoChunks } from "@/lib/chunk";
import { createEmbedding } from "@/lib/embeddings";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return unauthorizedResponse();
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("id,title,content,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ items: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "获取知识库失败。", detail: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return unauthorizedResponse();
    }

    const body = (await request.json()) as { title?: string; content?: string };
    const title = body.title?.trim();
    const content = body.content?.trim();

    if (!title || !content) {
      return NextResponse.json(
        { error: "标题和正文不能为空。" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const chunks = splitIntoChunks(content);
    const rows = await Promise.all(
      chunks.map(async (chunk, index) => ({
        title: chunks.length > 1 ? `${title} · 片段 ${index + 1}` : title,
        content: chunk,
        embedding: await createEmbedding(`${title}\n${chunk}`)
      }))
    );

    const { data, error } = await supabase
      .from("knowledge_base")
      .insert(rows)
      .select("id,title,content,created_at");

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ items: data || [] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "保存知识库失败。", detail: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminRequest(request)) {
      return unauthorizedResponse();
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少知识库 ID。" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("knowledge_base").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "删除知识库失败。", detail: message },
      { status: 500 }
    );
  }
}
