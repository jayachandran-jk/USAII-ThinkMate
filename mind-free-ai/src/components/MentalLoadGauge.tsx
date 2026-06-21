import { cn } from "@/lib/utils";

export function MentalLoadGauge({ score, risk, size = "lg" }: { score: number; risk: "low" | "moderate" | "high"; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? 200 : 120;
  const stroke = size === "lg" ? 14 : 10;
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const offset = c - (pct / 100) * c;

  const color = risk === "high" ? "var(--color-risk)" : risk === "moderate" ? "var(--color-warning)" : "var(--color-success)";
  const label = risk === "high" ? "High risk" : risk === "moderate" ? "Moderate" : "Manageable";

  return (
    <div className="relative" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} stroke="var(--color-muted)" strokeWidth={stroke} fill="none" />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-mono font-semibold tabular-nums", size === "lg" ? "text-5xl" : "text-3xl")} style={{ color }}>
          {score}
        </span>
        <span className={cn("uppercase tracking-[0.18em] text-muted-foreground mt-1", size === "lg" ? "text-[11px]" : "text-[9px]")}>
          {label}
        </span>
      </div>
    </div>
  );
}
