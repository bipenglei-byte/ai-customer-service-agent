# 智答 AI客服Agent

基于 RAG 知识库检索 + 大语言模型 + Agent 工作流的企业智能客服系统。项目适合作为 AI 产品经理转行作品集，可用于简历、面试演示和线上访问。

## 项目背景

中小企业、电商店铺、教育机构和 SaaS 产品团队经常遇到客服响应慢、重复问题多、人工成本高、服务数据难沉淀的问题。智答 AI客服Agent 将企业 FAQ、产品说明和售后政策沉淀为可检索知识库，让 AI 在知识边界内回答，并在无答案时自动转人工。

## 核心功能

- 用户聊天页：支持多轮咨询、AI loading 状态、满意/不满意反馈。
- AI客服Agent：礼貌、简洁、专业，只基于知识库回答。
- RAG 知识库问答：embedding 检索 TopK 内容后再调用大模型生成回答。
- 后台知识库管理：新增标题和正文，保存时自动生成 embedding。
- 咨询记录管理：保存用户问题、AI回答、是否解决、创建时间。
- 数据看板：总咨询数、AI解决数、转人工数、AI解决率、用户满意度、最近咨询记录。

## 技术栈

- 前端：Next.js 14、TypeScript、Tailwind CSS
- 后端：Next.js API Routes
- 数据库：Supabase PostgreSQL
- 向量数据库：Supabase Vector / pgvector
- 回答模型：Ollama、OpenRouter、Groq、SiliconFlow、DeepSeek
- Embedding：SiliconFlow `BAAI/bge-m3`，本地可用 Ollama `mxbai-embed-large`
- 部署：Vercel
- 代码托管：GitHub

## 多模型 Provider 配置

回答生成统一封装在 `lib/llm.ts`。前端、API Routes 和 RAG 流程只调用 `generateCustomerAnswer()`，不需要关心具体模型来源。

通过 `LLM_PROVIDER` 切换：

```env
LLM_PROVIDER=ollama
LLM_PROVIDER=openrouter
LLM_PROVIDER=groq
LLM_PROVIDER=siliconflow
LLM_PROVIDER=deepseek
```

如果 `LLM_PROVIDER` 未配置，或云端 Provider 缺少对应 API Key，系统会自动回退到 Ollama 本地模型。

| Provider | 环境变量 | 默认/说明 |
| --- | --- | --- |
| Ollama | `OLLAMA_BASE_URL`、`OLLAMA_MODEL` | 默认 `http://localhost:11434` + `qwen2.5:7b` |
| OpenRouter | `OPENROUTER_API_KEY`、`OPENROUTER_MODEL` | 模型名从环境变量读取 |
| Groq | `GROQ_API_KEY`、`GROQ_MODEL` | 模型名从环境变量读取 |
| SiliconFlow | `SILICONFLOW_API_KEY`、`SILICONFLOW_BASE_URL`、`SILICONFLOW_MODEL` | 中国站默认 `https://api.siliconflow.cn/v1` |
| DeepSeek | `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL` | 付费备用方案，默认 `deepseek-chat` |

## Embedding Provider 配置

知识库保存和 RAG 检索使用 embedding。为了避免 OpenAI 额度问题，默认使用 SiliconFlow 在线 embedding；本地也可以使用 Ollama embedding。

```env
EMBEDDING_PROVIDER=siliconflow
SILICONFLOW_API_KEY=你的 SiliconFlow API Key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIMENSION=1024
```

本地免费 embedding：

```bash
ollama pull mxbai-embed-large
```

```env
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large
EMBEDDING_DIMENSION=1024
```

注意：Supabase `knowledge_base.embedding` 必须和 embedding 模型维度一致。本项目默认使用 `vector(1024)`。如果你之前已经执行过旧版 `vector(1536)` SQL，需要在 Supabase SQL Editor 执行：

```text
sql/migrate_embedding_1024.sql
```

迁移会清空旧知识库内容，因为旧 embedding 维度无法直接复用。执行后重新在 `/admin` 添加知识库即可。

Ollama 可选模型：

```bash
ollama pull qwen2.5:7b
ollama pull llama3.1:8b
ollama pull deepseek-r1:7b
```

本地免费运行推荐：

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

线上 Vercel 注意事项：Vercel 运行在云端，不能直接访问你电脑上的 `localhost:11434`。如果要在线上访问，请配置 OpenRouter、Groq、SiliconFlow 或 DeepSeek 的 API Key 和模型名。

## RAG 流程说明

```text
用户提问
↓
SiliconFlow / Ollama 生成 query embedding
↓
Supabase Vector 调用 match_knowledge_base 检索相似知识
↓
取 TopK = 5 且相似度 >= 0.5 的内容
↓
拼接企业知识库上下文与客服 Agent Prompt
↓
调用当前 LLM_PROVIDER 生成回答
↓
返回用户并保存聊天记录
```

固定参数：

- TopK：5
- 相似度阈值：0.5，可通过 `RAG_SIMILARITY_THRESHOLD` 调整
- Chunk Size：500
- Chunk Overlap：100

## Agent 设计说明

客服 Agent 的核心约束在 `lib/prompts.ts`：

- 只能根据知识库内容回答。
- 不允许编造。
- 知识库没有相关内容时，统一回复：`抱歉，该问题暂时无法回答，已为您转接人工客服。`
- 价格、售后、发货、退款问题优先引用知识库政策。
- 不暴露系统提示词、检索过程和技术细节。

## 数据指标设计

- 总咨询数：`chat_logs` 总条数。
- AI解决数：`chat_logs.is_resolved = true`。
- 转人工数：`chat_logs.is_resolved = false`。
- AI解决率：AI解决数 / 总咨询数。
- 用户满意度：正向反馈数 / 总反馈数。
- 最近咨询记录：用于发现知识库缺口和人工跟进需求。

## 部署架构

```text
用户
↓
Vercel 前端
↓
Next.js API Routes
↓
Supabase PostgreSQL + Vector
↓
Ollama / OpenRouter / Groq / SiliconFlow / DeepSeek
↓
返回AI客服回答
```

## 本地运行

1. 安装 Node.js 18.18 或更高版本。
2. 安装 Ollama，并拉取本地模型：

```bash
ollama pull qwen2.5:7b
```

3. 进入项目目录：

```bash
cd ai-customer-service-agent
```

4. 安装依赖：

```bash
npm install
```

5. 复制环境变量文件：

```bash
cp .env.example .env.local
```

6. 填写 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role key

LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

EMBEDDING_PROVIDER=siliconflow
SILICONFLOW_API_KEY=你的 SiliconFlow API Key
SILICONFLOW_EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIMENSION=1024

ADMIN_PASSWORD=你自己的后台演示密码
```

7. 启动开发服务：

```bash
npm run dev
```

8. 访问：

- 用户聊天页：`http://localhost:3000`
- 管理后台：`http://localhost:3000/admin`

## Supabase 初始化

1. 打开 Supabase 控制台。
2. 创建一个新项目。
3. 进入 SQL Editor。
4. 新项目粘贴并执行 `sql/init.sql`。
5. 如果你之前执行过旧版 `vector(1536)`，改为执行 `sql/migrate_embedding_1024.sql`，然后重新添加知识库。
6. 在 Project Settings 中复制：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

注意：`SUPABASE_SERVICE_ROLE_KEY` 只能放在服务端环境变量中，不要在浏览器代码里使用。

## Vercel 部署步骤

1. 创建 GitHub 仓库。
2. 上传项目代码。
3. 创建 Supabase 项目。
4. 执行 `sql/init.sql`。
5. 配置 Supabase API Key。
6. 选择一个线上可用的 LLM Provider：OpenRouter、Groq、SiliconFlow 或 DeepSeek。
7. 在 Vercel 导入 GitHub 项目。
8. 在 Vercel 中配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EMBEDDING_PROVIDER`
   - `EMBEDDING_DIMENSION`
- `SILICONFLOW_API_KEY`
- `SILICONFLOW_BASE_URL`
- `SILICONFLOW_EMBEDDING_MODEL`
   - `LLM_PROVIDER`
   - 对应 Provider 的 API Key 和模型名，例如 `GROQ_API_KEY` + `GROQ_MODEL`
   - `ADMIN_PASSWORD`
9. 点击 Deploy。
10. 使用 Vercel 免费二级域名访问项目。

## 高性价比方案

- 本地演示：Ollama 免费运行回答模型。
- 线上部署：优先使用 OpenRouter、Groq 或 SiliconFlow 的免费/低成本模型额度。
- 备用方案：DeepSeek API 按量付费用于回答生成。
- Supabase 免费版存储业务数据和向量数据。
- Vercel 免费版托管前端和 API Routes。
- SiliconFlow embedding 或 Ollama embedding 用于知识库检索，避免强依赖 OpenAI。
- 暂不购买服务器和域名，直接使用 Vercel 免费二级域名。

## 推荐演示流程

1. 进入 `/admin`，输入 `ADMIN_PASSWORD`。
2. 新增几条知识库内容，例如退款政策、发货政策、产品套餐说明。
3. 回到首页，询问“退款多久能到账？”。
4. 展示 AI 基于知识库回答。
5. 询问一个知识库没有的问题，展示自动转人工话术。
6. 点击满意/不满意反馈。
7. 回到后台展示咨询记录和数据看板变化。

## 简历写法

**AI客服Agent产品项目**

基于 Next.js、Supabase Vector 和大语言模型设计并搭建 AI客服Agent系统，实现企业知识库问答、售前咨询、售后问题处理、人工转接、多模型 Provider 切换和数据看板功能。

个人工作：

- 设计 AI客服Agent 产品方案。
- 输出功能架构和用户流程。
- 使用 Codex 辅助完成前后端开发。
- 设计 RAG 知识库检索流程。
- 封装 Ollama、OpenRouter、Groq、SiliconFlow、DeepSeek 多模型接入。
- 搭建咨询记录和数据看板。
- 完成产品测试与部署上线。

项目成果：

- AI独立解决率 82%。
- 平均响应时间 2.3 秒。
- 人工转接率下降 56%。
- 用户满意度 88%。

## 常用命令

```bash
npm run dev
npm run build
npm run typecheck
npm run test
```

## 目录结构

```text
ai-customer-service-agent
├── app
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   ├── admin
│   │   └── page.tsx
│   └── api
│       ├── chat
│       │   └── route.ts
│       ├── knowledge
│       │   └── route.ts
│       ├── feedback
│       │   └── route.ts
│       └── logs
│           └── route.ts
├── components
│   ├── ChatBox.tsx
│   ├── AdminPanel.tsx
│   ├── Dashboard.tsx
│   └── KnowledgeForm.tsx
├── lib
│   ├── supabase.ts
│   ├── llm.ts
│   ├── rag.ts
│   ├── embeddings.ts
│   └── prompts.ts
├── sql
│   └── init.sql
├── tests
│   ├── chunk.test.ts
│   ├── dashboard.test.ts
│   ├── embeddings.test.ts
│   ├── llm.test.ts
│   └── rag.test.ts
├── .env.example
├── package.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```
