import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendUp, className, onClick, theme }) {
  const isDark = theme?.isDark ?? false;
  const cardBg = theme?.cardBg ?? "#FFFFFF";
  const cardBorder = theme?.cardBorder ?? "#F1F5F9";
  const cardText = theme?.cardText ?? "#0F172A";
  const cardTextMuted = theme?.cardTextMuted ?? "#94A3B8";

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl p-5 transition-all duration-200 card-hover",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: cardTextMuted }}>{title}</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: cardText }}>{value}</p>
          {subtitle && (
            <p className="text-xs" style={{ color: cardTextMuted }}>{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
            background: isDark ? "rgba(200,169,126,0.12)" : "rgba(219,39,119,0.08)",
          }}>
            <Icon className="w-5 h-5" style={{ color: isDark ? "#C8A97E" : "#DB2777" }} />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 flex items-center gap-1.5" style={{ borderTop: `1px solid ${cardBorder}` }}>
          <span className={cn("text-sm font-semibold tabular-nums", trendUp ? "text-emerald-400" : "text-red-400")}>
            {trendUp ? "+" : ""}{trend}
          </span>
          <span className="text-xs" style={{ color: cardTextMuted }}>vs mês anterior</span>
        </div>
      )}
    </div>
  );
}
