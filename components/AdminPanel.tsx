"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Database, LockKeyhole, RefreshCw, Trash2 } from "lucide-react";
import Dashboard, { type DashboardStats } from "@/components/Dashboard";
import KnowledgeForm from "@/components/KnowledgeForm";

type KnowledgeItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

type ChatLog = {
  id: string;
  user_question: string;
  ai_answer: string;
  is_resolved: boolean;
  created_at: string;
};

const emptyStats: DashboardStats = {
  totalConsultations: 0,
  resolvedCount: 0,
  transferredCount: 0,
  resolutionRate: 0,
  satisfactionRate: 0
};

export default function AdminPanel() {
  const [passwordInput, setPasswordInput] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const headers = useMemo(
    () => ({
      "x-admin-password": adminPassword
    }),
    [adminPassword]
  );

  async function loadAdminData(password = adminPassword) {
    if (!password) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [knowledgeResponse, logsResponse] = await Promise.all([
        fetch("/api/knowledge", {
          headers: {
            "x-admin-password": password
          }
        }),
        fetch("/api/logs", {
          headers: {
            "x-admin-password": password
          }
        })
      ]);

      const knowledgePayload = await knowledgeResponse.json();
      const logsPayload = await logsResponse.json();

      if (!knowledgeResponse.ok) {
        throw new Error(knowledgePayload.error || "知识库加载失败");
      }

      if (!logsResponse.ok) {
        throw new Error(logsPayload.error || "咨询记录加载失败");
      }

      setKnowledge(knowledgePayload.items || []);
      setLogs(logsPayload.logs || []);
      setStats(logsPayload.stats || emptyStats);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "后台数据加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteKnowledge(id: string) {
    const response = await fetch(`/api/knowledge?id=${id}`, {
      method: "DELETE",
      headers
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error || "删除失败");
      return;
    }

    await loadAdminData();
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminPassword(passwordInput);
    void loadAdminData(passwordInput);
  }

  useEffect(() => {
    const saved = window.sessionStorage.getItem("admin-password");
    if (saved) {
      setPasswordInput(saved);
      setAdminPassword(saved);
      void loadAdminData(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (adminPassword) {
      window.sessionStorage.setItem("admin-password", adminPassword);
    }
  }, [adminPassword]);

  if (!adminPassword) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-md items-center">
        <form
          className="w-full rounded-[8px] border border-black/10 bg-white p-8 shadow-panel"
          onSubmit={handleLogin}
        >
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-[8px] bg-moss/10 text-moss">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold text-ink">后台管理</h1>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            输入演示密码后可管理知识库、查看咨询记录和数据看板。
          </p>
          <input
            className="mt-6 w-full rounded-[8px] border border-black/10 px-3 py-3 text-sm outline-none focus:border-moss"
            placeholder="ADMIN_PASSWORD"
            type="password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
          />
          <button
            className="mt-4 w-full rounded-[8px] bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-moss"
            type="submit"
          >
            进入后台
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-black/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-moss">Admin Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">智答运营后台</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
            管理企业知识库、查看 AI 解决效果、定位需要人工跟进的咨询。
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-[8px] border border-black/10 bg-white px-4 py-2.5 text-sm text-ink transition hover:border-moss hover:text-moss"
          type="button"
          onClick={() => void loadAdminData()}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          刷新数据
        </button>
      </div>

      {error && (
        <div className="rounded-[8px] border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </div>
      )}

      <Dashboard stats={stats} />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[8px] border border-black/10 bg-white p-5 shadow-panel">
          <div className="mb-5 flex items-center gap-2">
            <Database className="h-4 w-4 text-moss" />
            <h2 className="text-base font-semibold text-ink">新增知识库内容</h2>
          </div>
          <KnowledgeForm
            adminPassword={adminPassword}
            onSaved={() => loadAdminData()}
          />
        </section>

        <section className="rounded-[8px] border border-black/10 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">已有知识库</h2>
          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto">
            {knowledge.length === 0 && (
              <p className="rounded-[8px] bg-mist px-4 py-6 text-center text-sm text-ink/55">
                暂无知识库内容。
              </p>
            )}
            {knowledge.map((item) => (
              <div
                className="rounded-[8px] border border-black/10 p-4"
                key={item.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-ink">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/58">
                      {item.content}
                    </p>
                  </div>
                  <button
                    className="rounded-full bg-mist p-2 text-ink/55 transition hover:bg-coral hover:text-white"
                    type="button"
                    aria-label="删除知识库"
                    onClick={() => void deleteKnowledge(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[8px] border border-black/10 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">最近咨询记录</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs text-ink/50">
                <th className="py-3 pr-4 font-medium">用户问题</th>
                <th className="py-3 pr-4 font-medium">AI回答</th>
                <th className="py-3 pr-4 font-medium">状态</th>
                <th className="py-3 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr className="border-b border-black/5" key={log.id}>
                  <td className="max-w-[220px] py-4 pr-4 text-ink">
                    {log.user_question}
                  </td>
                  <td className="max-w-[320px] py-4 pr-4 text-ink/62">
                    {log.ai_answer}
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        log.is_resolved
                          ? "bg-moss/10 text-moss"
                          : "bg-coral/10 text-coral"
                      }`}
                    >
                      {log.is_resolved ? "AI已解决" : "已转人工"}
                    </span>
                  </td>
                  <td className="py-4 text-ink/50">
                    {new Date(log.created_at).toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <p className="rounded-[8px] bg-mist px-4 py-6 text-center text-sm text-ink/55">
              暂无咨询记录。
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
