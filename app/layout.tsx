import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "智答 AI客服Agent",
  description:
    "基于 RAG 知识库检索、大语言模型和 Agent 工作流的企业智能客服系统。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
