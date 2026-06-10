import { describe, expect, it } from "vitest";
import { splitIntoChunks } from "@/lib/chunk";

describe("知识库切片", () => {
  it("按 chunk size 和 overlap 切分长文本", () => {
    const chunks = splitIntoChunks("abcdefghijklmnopqrstuvwxyz", 10, 3);

    expect(chunks).toEqual(["abcdefghij", "hijklmnopq", "opqrstuvwx", "vwxyz"]);
  });

  it("忽略空白内容", () => {
    expect(splitIntoChunks("   \n\t  ")).toEqual([]);
  });
});
