import { BarChart3, Handshake, MessagesSquare, PhoneForwarded, Smile } from "lucide-react";

export type DashboardStats = {
  totalConsultations: number;
  resolvedCount: number;
  transferredCount: number;
  resolutionRate: number;
  satisfactionRate: number;
};

type Props = {
  stats: DashboardStats;
};

export default function Dashboard({ stats }: Props) {
  const items = [
    {
      label: "总咨询数",
      value: stats.totalConsultations,
      icon: MessagesSquare
    },
    {
      label: "AI解决数",
      value: stats.resolvedCount,
      icon: Handshake
    },
    {
      label: "转人工数",
      value: stats.transferredCount,
      icon: PhoneForwarded
    },
    {
      label: "AI解决率",
      value: `${stats.resolutionRate}%`,
      icon: BarChart3
    },
    {
      label: "用户满意度",
      value: `${stats.satisfactionRate}%`,
      icon: Smile
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            className="rounded-[8px] border border-black/10 bg-white p-4 shadow-panel"
            key={item.label}
          >
            <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-[8px] bg-moss/10 text-moss">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-semibold text-ink">{item.value}</p>
            <p className="mt-1 text-xs text-ink/55">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}
