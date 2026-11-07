import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  SlidersHorizontal,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { api, money } from "../lib/api";
import { Button } from "../components/ui/button";
import { SimulationResult } from "../components/Insights";
import { RecordEditor } from "./DataPage";
import type { State, Scenario, Simulation } from "../types";
const options = [
  ["remove_employee", "Remove a team member"],
  ["change_hours", "Change working hours"],
  ["hire", "Hire someone"],
  ["remove_dishes", "Remove dishes"],
  ["change_price", "Change a dish price"],
  ["add_dish", "Add a dish"],
];
export function Simulator({ state }: { state: State }) {
  const [type, setType] = useState("remove_employee");
  const [employee, setEmployee] = useState(
    String(state.employees[0]?.id ?? ""),
  );
  const [dishes, setDishes] = useState<number[]>([]);
  const [number, setNumber] = useState(30);
  const [editor, setEditor] = useState(false);
  const [result, setResult] = useState<Simulation | null>(null);
  const history = useQuery({
    queryKey: ["simulation-history", result?.id],
    queryFn: () => api<any[]>("/simulations"),
  });
  const run = useMutation({
    mutationFn: (s: Scenario) => api<Simulation>("/simulations", "POST", s),
    onSuccess: setResult,
  });
  function execute() {
    if (type === "hire" || type === "add_dish") {
      setEditor(true);
      return;
    }
    const s: Scenario = { type };
    if (type === "remove_employee" || type === "change_hours")
      s.employee_id = Number(employee);
    if (type === "change_hours") s.hours = number;
    if (type === "remove_dishes" || type === "change_price")
      s.dish_ids = dishes;
    if (type === "change_price") s.price = number;
    run.mutate(s);
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          
          <h1>Try a change</h1>
          <p>
            Explore the numbers. Understand the trade-offs. Leave your real
            records untouched.
          </p>
        </div>
        <span className="badge">
          <ShieldCheck size={14} /> Your records stay unchanged
        </span>
      </div>
      <div className="simulator-layout">
        <section className="card scenario-controls">
          
          <h3>What would you change?</h3>
          <label className="form-field">Choose a change<select value={type} onChange={e=>{setType(e.target.value);setDishes([]);setResult(null);run.reset()}}>{options.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
          {["remove_employee", "change_hours"].includes(type) && (
            <label className="form-field">
              Team member
              <select
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
              >
                <option value="">Choose a person</option>
                {state.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {money(e.hourly_wage * e.weekly_hours)}/week
                  </option>
                ))}
              </select>
            </label>
          )}
          {["remove_dishes", "change_price"].includes(type) && (
            <div className="form-section">
              <h4>
                {type === "change_price" ? "Choose one dish" : "Choose dishes"}
              </h4>
              {state.menu
                .filter((d) => d.is_active)
                .map((d) => (
                  <label className="checkbox-label" key={d.id}>
                    <input
                      type={type === "change_price" ? "radio" : "checkbox"}
                      name="dish"
                      checked={dishes.includes(d.id)}
                      onChange={(e) =>
                        setDishes(
                          type === "change_price"
                            ? [d.id]
                            : e.target.checked
                              ? [...dishes, d.id]
                              : dishes.filter((id) => id !== d.id),
                        )
                      }
                    />
                    {d.name}
                  </label>
                ))}
            </div>
          )}
          {["change_hours", "change_price"].includes(type) && (
            <label className="form-field">
              {type === "change_hours"
                ? "Hypothetical weekly hours"
                : "Hypothetical selling price ($)"}
              <input
                type="number"
                min="0"
                max={type === "change_hours" ? 168 : 10000}
                value={number}
                onChange={(e) => setNumber(Number(e.target.value))}
              />
            </label>
          )}
          {type === "hire" && (
            <p className="footnote">
              Define the skills, wage and hours of a hypothetical hire. No
              additional revenue is assumed.
            </p>
          )}
          {type === "add_dish" && (
            <p className="footnote">
              Build a recipe using your ingredients. Enter an explicit sales
              assumption to estimate weekly impact.
            </p>
          )}
          {run.isError && (
            <div className="notice amber">{run.error.message}</div>
          )}
          <Button
            className="full-width"
            onClick={execute}
            disabled={run.isPending}
          >
            {run.isPending
              ? "Calculating…"
              : type === "hire" || type === "add_dish"
                ? "Define scenario"
                : "Run simulation"}
            <ArrowRight size={16} />
          </Button>
        </section>
        <section className="card scenario-output">
          <div className="section-heading">
            <span className="eyebrow">RESULT</span>
            {result && (
              <button className="text-link" onClick={() => setResult(null)}>
                <RotateCcw size={14} /> Reset view
              </button>
            )}
          </div>
          {result ? (
            <SimulationResult result={result} />
          ) : (
            <div className="scenario-empty">
              <div className="bot-symbol">
                <SlidersHorizontal size={32} />
              </div>
              <h2>Your comparison will appear here.</h2>
              <p>
                Choose a scenario to compare weekly revenue, costs, operating
                results, and menu capabilities.
              </p>
              <div className="empty-comparison">
                <span>YOUR RESTAURANT TODAY</span>
                <ArrowRight />
                <span>ONE POSSIBLE TOMORROW</span>
              </div>
            </div>
          )}
        </section>
      </div>
      {!!history.data?.length && (
        <details className="card"><summary>Previous comparisons</summary>
          <div className="history-scenarios">
            {history.data.map((r) => (
              <button
                key={r.id}
                onClick={() => setResult({ id: r.id, ...r.result })}
              >
                <span>
                  {options.find((x) => x[0] === r.scenario_type)?.[1]}
                </span>
                <strong>
                  {money(r.result.delta.operating_result)} result change
                </strong>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
          <p className="footnote">
            Saved comparisons are historical snapshots. Run again to use your
            latest records.
          </p>
        </details>
      )}
      {editor && (
        <RecordEditor
          kind={type === "hire" ? "employee" : "menu"}
          initial={{}}
          state={state}
          onClose={() => setEditor(false)}
          onSubmit={(data) =>
            run.mutate(
              type === "hire" ? { type, employee: data } : { type, dish: data },
            )
          }
        />
      )}
    </div>
  );
}
