import { describe, expect, it } from "vitest";
import { calculateDashboardStats } from "@/lib/dashboard";

describe("数据看板统计", () => {
  it("计算咨询数、解决率和满意度", () => {
    const stats = calculateDashboardStats(
      [
        { is_resolved: true },
        { is_resolved: true },
        { is_resolved: false }
      ],
      [{ score: 1 }, { score: -1 }, { score: 1 }]
    );

    expect(stats).toEqual({
      totalConsultations: 3,
      resolvedCount: 2,
      transferredCount: 1,
      resolutionRate: 67,
      satisfactionRate: 67
    });
  });

  it("没有数据时返回 0 指标", () => {
    const stats = calculateDashboardStats([], []);

    expect(stats.totalConsultations).toBe(0);
    expect(stats.resolutionRate).toBe(0);
    expect(stats.satisfactionRate).toBe(0);
  });
});
