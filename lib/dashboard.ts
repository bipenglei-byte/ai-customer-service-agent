import type { ChatLogRow, FeedbackRow } from "@/lib/supabase";

export type DashboardStats = {
  totalConsultations: number;
  resolvedCount: number;
  transferredCount: number;
  resolutionRate: number;
  satisfactionRate: number;
};

export function calculateDashboardStats(
  logs: Pick<ChatLogRow, "is_resolved">[],
  feedback: Pick<FeedbackRow, "score">[]
): DashboardStats {
  const totalConsultations = logs.length;
  const resolvedCount = logs.filter((item) => item.is_resolved).length;
  const transferredCount = totalConsultations - resolvedCount;
  const positiveFeedback = feedback.filter((item) => item.score > 0).length;

  return {
    totalConsultations,
    resolvedCount,
    transferredCount,
    resolutionRate: totalConsultations
      ? Math.round((resolvedCount / totalConsultations) * 100)
      : 0,
    satisfactionRate: feedback.length
      ? Math.round((positiveFeedback / feedback.length) * 100)
      : 0
  };
}
