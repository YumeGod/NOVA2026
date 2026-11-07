import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles, Sprout } from "lucide-react";
import { api, money, precise } from "../lib/api";
import {
  Kpis,
  MoneyChart,
  MenuChart,
  MenuMatrix,
} from "../components/Insights";
import type { State, Metrics, Dish } from "../types";
export function Overview({
  state,
  metrics,
}: {
  state: State;
  metrics: Metrics;
}) {
  const menu = useQuery({
    queryKey: ["menu-analysis"],
    queryFn: () =>
      api<{ dishes: Dish[]; baseline: any; method: string }>("/analytics/menu"),
  });
  const staff = useQuery({
    queryKey: ["staffing"],
    queryFn: () => api("/analytics/staffing"),
  });
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE WEEKLY PICTURE</div>
          <h1>A little clarity goes a long way.</h1>
          <p>
            Here’s how {state.restaurant.name} is doing, based on your recorded
            week.
          </p>
        </div>
        <Link className="button primary" to="/advisor">
          <Sparkles size={17} /> Ask your advisor
        </Link>
      </div>
      <Kpis metrics={metrics} />
      {metrics.warnings.map((w) => (
        <div className="notice amber" key={w}>
          {w}
        </div>
      ))}
      <div className="dashboard-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FINANCIAL HEALTH</span>
              <h3>Where your revenue goes</h3>
            </div>
            <span className="badge">Per week</span>
          </div>
          <MoneyChart metrics={metrics} />
          <p className="footnote">
            Operating result includes recorded ingredients, scheduled wages and
            fixed costs. Taxes and unrecorded costs are excluded.
          </p>
        </section>
        <section className="card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR MENU AT WORK</span>
              <h3>Contribution by dish</h3>
            </div>
            <Link to="/menu">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {menu.data ? (
            <MenuChart dishes={menu.data.dishes} />
          ) : (
            <p>Loading menu analysis…</p>
          )}
        </section>
        <section className="card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MENU ENGINEERING</span>
              <h3>Popularity meets contribution</h3>
            </div>
          </div>
          {menu.data && (
            <>
              <MenuMatrix
                dishes={menu.data.dishes}
                baseline={menu.data.baseline}
              />
              <p className="footnote">{menu.data.method}</p>
            </>
          )}
        </section>
        <section className="card opportunities">
          <span className="eyebrow">
            <Sprout size={15} /> OPPORTUNITIES IN YOUR DATA
          </span>
          <h3>Small moves. Meaningful impact.</h3>
          {menu.data?.dishes
            .filter((d) => d.classification === "Opportunity")
            .slice(0, 2)
            .map((d) => (
              <div className="opportunity" key={d.id}>
                <span className="opportunity-icon">
                  <ArrowUpRight size={17} />
                </span>
                <div>
                  <strong>
                    Give {d.name.toLowerCase()} a little spotlight
                  </strong>
                  <p>
                    {precise(d.contribution_per_dish)} contribution per serving,
                    with {d.weekly_sales_volume} servings a week. Promotion is
                    worth testing; demand is unknown.
                  </p>
                </div>
              </div>
            ))}
          <div className="opportunity">
            <span className="opportunity-icon">
              <Sprout size={17} />
            </span>
            <div>
              <strong>Build backup into your kitchen</strong>
              <p>
                {staff.data?.single_points_of_failure.length ?? "…"} dishes rely
                on one recorded team member. Review cross-training before
                changing schedules.
              </p>
            </div>
          </div>
          <Link to="/advisor" className="text-link">
            Explore these with Juniper <ArrowUpRight size={16} />
          </Link>
          <small>
            Computed observations. Ask the advisor for an AI explanation.
          </small>
        </section>
      </div>
      <section className="card">
        <h3>The details behind the dishes</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dish</th>
                <th>Food cost</th>
                <th>Food cost %</th>
                <th>Contribution / serving</th>
                <th>Weekly contribution</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {menu.data?.dishes
                .filter((d) => d.is_active)
                .map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{precise(d.ingredient_cost)}</td>
                    <td>
                      {d.food_cost_percentage == null
                        ? "Unknown"
                        : `${d.food_cost_percentage}%`}
                    </td>
                    <td>{precise(d.contribution_per_dish)}</td>
                    <td>{money(d.weekly_contribution)}</td>
                    <td>
                      <span className="badge">{d.classification}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
