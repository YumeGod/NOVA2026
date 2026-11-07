import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from "recharts";
import { ArrowUpRight, Leaf, ShieldCheck, TriangleAlert } from "lucide-react";
import { money } from "../lib/api";
import type { Metrics, Simulation, Dish } from "../types";
export function Kpis({
  metrics: m,
  compact = false,
}: {
  metrics: Metrics;
  compact?: boolean;
}) {
  return (
    <div className={"kpis " + (compact ? "compact" : "")}>
      {[
        ["Weekly revenue", m.revenue, "Recorded menu sales"],
        ["Operating result", m.operating_result, "After known weekly costs"],
        ["Food costs", m.food_cost, `${m.food_percentage ?? "—"}% of revenue`],
        ["Team investment", m.labor_cost, "Scheduled weekly wages"],
      ].map(([label, value, caption]) => (
        <div className="kpi" key={String(label)}>
          <span>{label}</span>
          <strong>{money(value as number | null)}</strong>
          <small>{caption}</small>
        </div>
      ))}
    </div>
  );
}
export function MoneyChart({ metrics: m }: { metrics: Metrics }) {
  const data = [
    { name: "Revenue", value: m.revenue },
    { name: "Ingredients", value: m.food_cost },
    { name: "Labor", value: m.labor_cost },
    { name: "Fixed costs", value: m.fixed_cost },
    { name: "Result", value: m.operating_result },
  ];
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ left: -15, right: 8, top: 10 }}>
          <CartesianGrid vertical={false} stroke="#ebece5" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v) => `${v / 1000}k`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(v: number) => money(v)}
            cursor={{ fill: "#f0f2eb" }}
          />
          <Bar
            dataKey="value"
            fill="#46735d"
            radius={[5, 5, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function MenuChart({ dishes }: { dishes: Dish[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={dishes.filter((d) => d.is_active)}
        layout="vertical"
        margin={{ left: 0, right: 20 }}
      >
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          width={145}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip formatter={(v: number) => money(v)} />
        <Bar
          dataKey="weekly_contribution"
          name="Weekly contribution"
          fill="#8ca38b"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
export function MenuMatrix({
  dishes,
  baseline,
}: {
  dishes: Dish[];
  baseline: any;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ left: 10, right: 20, bottom: 20, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="weekly_sales_volume"
          name="Weekly servings"
          label={{ value: "Weekly servings →", position: "bottom" }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="contribution_per_dish"
          name="Contribution / serving"
          unit="$"
          tick={{ fontSize: 11 }}
        />
        <ZAxis range={[80, 80]} />
        <ReferenceLine x={baseline.average_weekly_sales} stroke="#bd9767" />
        <ReferenceLine
          y={baseline.average_contribution_per_dish}
          stroke="#bd9767"
        />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="tooltip">
                {payload[0].payload.name}
                <br />
                {money(payload[0].payload.contribution_per_dish)} / serving ·{" "}
                {payload[0].payload.classification}
              </div>
            ) : null
          }
        />
        <Scatter
          data={dishes.filter(
            (d) =>
              d.is_active &&
              d.contribution_per_dish != null &&
              d.weekly_sales_volume != null,
          )}
          fill="#416e56"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
export function SimulationResult({ result: r }: { result: Simulation }) {
  return (
    <section className="simulation-result">
      <div className="eyebrow">
        <Leaf size={14} /> HYPOTHETICAL SCENARIO
      </div>
      <h3>A clearer view of the trade-offs.</h3>
      <div className="comparison">
        <div className="compare-head">
          <span>Weekly estimate</span>
          <span>Today</span>
          <span>Scenario</span>
          <span>Change</span>
        </div>
        {(
          ["revenue", "food_cost", "labor_cost", "operating_result"] as const
        ).map((k) => (
          <div className="compare-row" key={k}>
            <span>{k.replaceAll("_", " ")}</span>
            <strong>{money(r.before[k])}</strong>
            <strong>{money(r.after[k])}</strong>
            <span className={k === "operating_result" ? "emphasis" : ""}>
              {r.delta[k] != null && r.delta[k]! > 0 ? "+" : ""}
              {money(r.delta[k])}
            </span>
          </div>
        ))}
      </div>
      <div className={"notice " + (r.lost_dishes.length ? "amber" : "green")}>
        {r.lost_dishes.length ? (
          <TriangleAlert size={18} />
        ) : (
          <ShieldCheck size={18} />
        )}
        <span>
          {r.lost_dishes.length
            ? `Lost preparation capability: ${r.lost_dishes.join(", ")}`
            : "Recorded dish capability is retained. Shift coverage and workload still need review."}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={[
            {
              name: "Revenue",
              Current: r.before.revenue,
              Scenario: r.after.revenue,
            },
            {
              name: "Labor",
              Current: r.before.labor_cost,
              Scenario: r.after.labor_cost,
            },
            {
              name: "Operating result",
              Current: r.before.operating_result,
              Scenario: r.after.operating_result,
            },
          ]}
        >
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(n) => `${n / 1000}k`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(n: number) => money(n)} />
          <Bar dataKey="Current" fill="#c7cec0" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Scenario" fill="#315f49" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {!!r.gained_dishes?.length && (
        <div className="notice green">
          Newly supported dishes: {r.gained_dishes.join(", ")}
        </div>
      )}
      {!!r.ingredient_usage_changes?.length && (
        <details>
          <summary>Ingredient usage affected</summary>
          <ul>
            {r.ingredient_usage_changes.map((i) => (
              <li key={i.id}>
                {i.name}: {i.before ?? "Unknown"} → {i.after ?? "Unknown"}{" "}
                {i.unit}/week
              </li>
            ))}
          </ul>
        </details>
      )}
      <details>
        <summary>
          Assumptions & operational risks <ArrowUpRight size={14} />
        </summary>
        <ul>
          {[...r.assumptions, ...r.risks].map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
