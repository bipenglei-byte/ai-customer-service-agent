"use client";

import { FormEvent, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Loader2,
  Send,
  ThumbsDown,
  ThumbsUp,
  UserRound
} from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  chatId?: string;
  isResolved?: boolean;
  feedbackScore?: number;
};

const quickQuestions = [
  "你们的产品适合什么企业？",
  "退款政策是什么？",
  "发货一般需要多久？",
  "售后问题怎么处理？"
];

export default function ChatBox() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "您好，我是智答 AI客服。您可以咨询产品、价格、售后、退款、发货等问题，我会优先基于企业知识库为您解答。"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function askQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: trimmed })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "客服响应失败");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.answer,
          chatId: payload.chatId,
          isResolved: payload.isResolved
        }
      ]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "客服响应失败";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "抱歉，当前客服服务暂时不可用，请稍后再试。"
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitFeedback(messageId: string, chatId: string, score: 1 | -1) {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? { ...item, feedbackScore: score } : item
      )
    );

    await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ chatId, score })
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askQuestion(input);
  }

  return (
    <section className="grid min-h-[680px] gap-6 lg:grid-cols-[0.95fr_1.3fr]">
      <div className="flex flex-col justify-between rounded-[8px] bg-ink p-8 text-white shadow-panel">
        <div>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-sm text-white/75">
            <span className="h-2 w-2 rounded-full bg-coral" />
            RAG 知识库 + Agent 工作流
          </div>
          <h1 className="text-4xl font-semibold tracking-normal">
            智答 AI客服Agent
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-white/72">
            面向中小企业、电商店铺、教育机构和 SaaS 团队的智能客服系统，支持知识库问答、转人工、记录沉淀和经营看板。
          </p>
        </div>

        <div className="mt-10 grid gap-3 text-sm text-white/78">
          {["仅基于企业知识库回答", "无答案自动转人工", "咨询记录与满意度追踪"].map(
            (item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-coral" />
                <span>{item}</span>
              </div>
            )
          )}
        </div>
      </div>

      <div className="flex min-h-[680px] flex-col rounded-[8px] border border-black/10 bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-ink">在线咨询</p>
            <p className="text-xs text-ink/55">7×24 小时自动答疑</p>
          </div>
          <div className="rounded-full bg-moss/10 px-3 py-1 text-xs font-medium text-moss">
            AI 在线
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-mist/60 p-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss text-white">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[78%] rounded-[8px] px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-ink text-white"
                    : "border border-black/8 bg-white text-ink"
                }`}
              >
                <p>{message.content}</p>

                {message.role === "assistant" && message.chatId && (
                  <div className="mt-3 flex items-center gap-2 border-t border-black/8 pt-3">
                    <span className="text-xs text-ink/50">这个回答有帮助吗？</span>
                    <button
                      aria-label="满意"
                      className={`rounded-full p-1.5 ${
                        message.feedbackScore === 1
                          ? "bg-moss text-white"
                          : "bg-mist text-ink/65"
                      }`}
                      type="button"
                      onClick={() =>
                        void submitFeedback(message.id, message.chatId!, 1)
                      }
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label="不满意"
                      className={`rounded-full p-1.5 ${
                        message.feedbackScore === -1
                          ? "bg-coral text-white"
                          : "bg-mist text-ink/65"
                      }`}
                      type="button"
                      onClick={() =>
                        void submitFeedback(message.id, message.chatId!, -1)
                      }
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-white">
                  <UserRound className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-sm text-ink/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI客服正在思考中
            </div>
          )}
        </div>

        <div className="border-t border-black/10 bg-white p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {quickQuestions.map((question) => (
              <button
                key={question}
                className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-ink/65 transition hover:border-moss hover:text-moss"
                type="button"
                onClick={() => void askQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>
          <form className="flex gap-3" onSubmit={handleSubmit}>
            <input
              className="min-w-0 flex-1 rounded-[8px] border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-moss"
              placeholder="请输入您的问题，例如：退款需要多久？"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-moss text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isLoading || !input.trim()}
              type="submit"
              aria-label="发送"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-coral">{error}</p>}
        </div>
      </div>
    </section>
  );
}
