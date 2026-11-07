import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import type { State } from "../types";
export function Settings({ state }: { state: State }) {
  const {
    name,
    cuisine_type,
    description,
    operating_days,
    weekly_fixed_costs,
    goals,
  } = state.restaurant;
  const [form, setForm] = useState({
    name,
    cuisine_type,
    description,
    operating_days,
    weekly_fixed_costs,
    goals,
  });
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => api("/restaurant", "PUT", form),
    onSuccess: () => qc.invalidateQueries(),
  });
  const reset = useMutation({
    mutationFn: () => api("/demo/reset", "POST"),
    onSuccess: () => {
      localStorage.removeItem("juniper-conversation");
      qc.invalidateQueries();
    },
  });
  return (
    <div className="page narrow">
      
      <h1>Restaurant details</h1>
      <p>Give your advisor the context behind the numbers.</p>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="form-grid">
          {Object.entries(form).map(([key, value]) => (
            <label className="form-field" key={key}>
              {
                (
                  {
                    name: "Restaurant name",
                    cuisine_type: "Cuisine",
                    description: "Business description",
                    operating_days: "Operating days per week",
                    weekly_fixed_costs: "Known fixed costs per week ($)",
                    goals: "Your business goals",
                  } as Record<string, string>
                )[key]
              }
              <input
                required={
                  !["goals", "description", "weekly_fixed_costs"].includes(key)
                }
                type={
                  ["operating_days", "weekly_fixed_costs"].includes(key)
                    ? "number"
                    : "text"
                }
                min={key === "operating_days" ? 1 : 0}
                max={key === "operating_days" ? 7 : undefined}
                step="any"
                value={value ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [key]: ["operating_days", "weekly_fixed_costs"].includes(
                      key,
                    )
                      ? e.target.value === ""
                        ? null
                        : Number(e.target.value)
                      : e.target.value,
                  })
                }
              />
            </label>
          ))}
        </div>
        <p className="footnote">
          Fixed costs exclude wages and ingredients, which are calculated
          separately. Leave fixed costs blank if unknown.
        </p>
        {save.isError && <p className="error">{save.error.message}</p>}
        {save.isSuccess && <p className="success">Restaurant profile saved.</p>}
        <Button disabled={save.isPending}>Save restaurant profile</Button>
      </form>
      <section className="card">
        <h3>A fresh demo, whenever you need it.</h3>
        <p>
          Reset restores Juniper Kitchen’s seeded records and removes
          conversations, proposals, and saved simulations.
        </p>
        <Button
          variant="outline"
          disabled={reset.isPending}
          onClick={() => {
            if (
              confirm(
                "Reset all demo records and conversations? This cannot be undone.",
              )
            )
              reset.mutate();
          }}
        >
          Reset demo restaurant
        </Button>
        {reset.isSuccess && (
          <p className="success">Demo restaurant restored.</p>
        )}
        {reset.isError && <p className="error">{reset.error.message}</p>}
      </section>
      <p className="footnote">
        Local, unauthenticated demo. This configuration is not intended for real
        customer data or public deployment.
      </p>
    </div>
  );
}
