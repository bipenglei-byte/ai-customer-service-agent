import { describe, expect, it, vi } from "vitest";
import {
  FALLBACK_TRANSFER_MESSAGE,
  buildCustomerPrompt
} from "@/lib/prompts";
import { RAG_SIMILARITY_THRESHOLD, runRagWithDependencies } from "@/lib/rag";

describe("RAG参数", () => {
  it("默认相似度阈值适合中文短问题演示", () => {
    expect(RAG_SIMILARITY_THRESHOLD).toBe(0.5);
  });
});

describe("RAG客服流程", () => {
  it("知识库相似度低于阈值时转人工且不调用大模型", async () => {
    const complete = vi.fn(async () => "不应该被调用");

    const result = await runRagWithDependencies("你们支持海外退款吗？", {
      embed: vi.fn(async () => [0.1, 0.2]),
      search: vi.fn(async () => [
        {
          id: "kb-1",
          title: "发货政策",
          content: "国内订单 48 小时内发货。",
          similarity: 0.42,
          created_at: new Date().toISOString()
        }
      ]),
      complete
    });

    expect(result.answer).toBe(FALLBACK_TRANSFER_MESSAGE);
    expect(result.isResolved).toBe(false);
    expect(result.matchedKnowledge).toEqual([]);
    expect(result.retrievedKnowledge).toHaveLength(1);
    expect(complete).not.toHaveBeenCalled();
  });

  it("命中知识库时拼接上下文并调用大模型", async () => {
    const complete = vi.fn(async (prompt: string) => {
      expect(prompt).toContain("退款政策");
      expect(prompt).toContain("7 个工作日内原路退回");
      return "您好，退款会在审核通过后 7 个工作日内原路退回。";
    });

    const result = await runRagWithDependencies("退款多久到账？", {
      embed: vi.fn(async () => [0.3, 0.4]),
      search: vi.fn(async () => [
        {
          id: "kb-2",
          title: "退款政策",
          content: "退款审核通过后，款项将在 7 个工作日内原路退回。",
          similarity: 0.91,
          created_at: new Date().toISOString()
        }
      ]),
      complete
    });

    expect(result.isResolved).toBe(true);
    expect(result.answer).toContain("7 个工作日");
    expect(result.matchedKnowledge).toHaveLength(1);
  });
});

describe("客服Prompt", () => {
  it("只把知识库和用户问题放入最终提示词", () => {
    const prompt = buildCustomerPrompt("发货多久？", [
      {
        title: "发货政策",
        content: "现货商品 48 小时内发货。"
      }
    ]);

    expect(prompt).toContain("发货政策");
    expect(prompt).toContain("现货商品 48 小时内发货");
    expect(prompt).toContain("发货多久？");
  });
});
