"use client";

import { FormEvent, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

type Props = {
  adminPassword: string;
  onSaved: () => Promise<void>;
};

export default function KnowledgeForm({ adminPassword, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({ title, content })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "保存失败");
      }

      setTitle("");
      setContent("");
      setMessage("知识库已保存，并完成 embedding 生成。");
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">标题</label>
        <input
          className="w-full rounded-[8px] border border-black/10 px-3 py-2 text-sm outline-none focus:border-moss"
          placeholder="例如：退款政策"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-ink">正文</label>
        <textarea
          className="min-h-36 w-full resize-y rounded-[8px] border border-black/10 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
          placeholder="输入企业客服知识、政策、FAQ、产品说明等内容。"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>

      <button
        className="inline-flex items-center gap-2 rounded-[8px] bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving || !title.trim() || !content.trim()}
        type="submit"
      >
        {isSaving ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        保存知识
      </button>

      {message && <p className="text-sm text-ink/60">{message}</p>}
    </form>
  );
}
