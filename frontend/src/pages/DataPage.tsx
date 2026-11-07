import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, X, Trash2, Users, ChefHat } from "lucide-react";
import { api, money, precise } from "../lib/api";
import type { State } from "../types";
import { Button } from "../components/ui/button";
type Kind = "employee" | "menu" | "ingredient";
const paths = {
  employee: "/employees",
  menu: "/menu",
  ingredient: "/ingredients",
};
export function DataPage({
  kind,
  state,
  initialTab,
  simplified = false,
}: {
  initialTab?: Kind;
  simplified?: boolean;
  kind: "employee" | "menu";
  state: State;
}) {
  const [tab, setTab] = useState<Kind>(initialTab ?? kind);
  const actual = kind === "employee" ? "employee" : tab;
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const staffing = useQuery({
    queryKey: ["staffing"],
    queryFn: () => api("/analytics/staffing"),
  });
  const records =
    actual === "employee"
      ? state.employees
      : actual === "menu"
        ? state.menu
        : state.ingredients;
  const remove = useMutation({
    mutationFn: (id: number) => api(`${paths[actual]}/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e) => setError(e.message),
  });
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {kind === "employee"
              ? "PEOPLE MAKE THE PLACE"
              : "GOOD INGREDIENTS. BETTER INSIGHTS."}
          </div>
          <h1>
            {kind === "employee"
              ? "Team"
              : actual === "ingredient"
                ? "Ingredients"
                : "Menu"}
          </h1>
          <p>
            {kind === "employee"
              ? "Add people, wages, hours, and cooking skills."
              : "Edit your prices, recipes, and ingredient costs."}
          </p>
        </div>
        <Button onClick={() => setEditing({})}>
          <Plus size={17} /> Add {actual === "menu" ? "dish" : actual}
        </Button>
      </div>
      {kind === "employee" && !simplified && (
        <div className="team-summary">
          <div>
            <Users size={22} />
            <strong>{state.employees.length}</strong>
            <span>team members</span>
          </div>
          <div>
            <ChefHat size={22} />
            <strong>{staffing.data?.recommended_skills.length ?? "—"}</strong>
            <span>skills to strengthen</span>
          </div>
          <div>
            <strong>
              {money(
                state.employees.reduce(
                  (n, e) => n + e.hourly_wage * e.weekly_hours,
                  0,
                ),
              )}
            </strong>
            <span>weekly scheduled wages</span>
          </div>
        </div>
      )}
      <div className="list-toolbar">
        {kind === "menu" && !simplified ? (
          <div className="tabs">
            <button
              className={tab === "menu" ? "selected" : ""}
              onClick={() => setTab("menu")}
            >
              Menu items <span>{state.menu.length}</span>
            </button>
            <button
              className={tab === "ingredient" ? "selected" : ""}
              onClick={() => setTab("ingredient")}
            >
              Ingredients <span>{state.ingredients.length}</span>
            </button>
          </div>
        ) : (
          <span />
        )}
        <label className="search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            aria-label="Search records"
          />
        </label>
      </div>
      {error && <div className="notice amber">{error}</div>}
      {!records.length ? (
        <div className="empty-state">
          <ChefHat />
          <h3>A fresh start</h3>
          <p>Add your first {actual} to bring your business into focus.</p>
        </div>
      ) : (
        <div
          className={
            actual === "employee" ? "employee-grid" : "card table-wrap"
          }
        >
          {actual === "employee" ? (
            state.employees
              .filter((e) =>
                e.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((e, i) => (
                <article className="employee-card" key={e.id}>
                  <div className="employee-top">
                    <div className={"employee-avatar tone-" + (i % 3)}>
                      {e.name
                        .split(" ")
                        .map((x) => x[0])
                        .join("")}
                    </div>
                    <button
                      className="icon-button"
                      aria-label={"Edit " + e.name}
                      onClick={() => setEditing(e)}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                  <h3>{e.name}</h3>
                  <p>{e.role}</p>
                  <div className="skill-tags">
                    {e.skills.map((sk) => (
                      <span key={sk.name}>
                        {sk.name}
                        <small> L{sk.proficiency}</small>
                      </span>
                    ))}
                  </div>
                  <div className="employee-cost">
                    <div>
                      <strong>{precise(e.hourly_wage)}</strong>
                      <small>per hour</small>
                    </div>
                    <div>
                      <strong>{e.weekly_hours}h</strong>
                      <small>per week</small>
                    </div>
                    <div>
                      <strong>{money(e.hourly_wage * e.weekly_hours)}</strong>
                      <small>weekly cost</small>
                    </div>
                  </div>
                  <button
                    className="delete-link"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete ${e.name} from actual team records? To explore a hypothetical change, use the simulator.`,
                        )
                      )
                        remove.mutate(e.id);
                    }}
                  >
                    Remove record
                  </button>
                </article>
              ))
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{actual === "menu" ? "Dish" : "Ingredient"}</th>
                  <th>{actual === "menu" ? "Category" : "Unit"}</th>
                  <th>
                    {actual === "menu" ? "Selling price" : "Cost per unit"}
                  </th>
                  <th>{actual === "menu" ? "Weekly servings" : "Inventory"}</th>
                  <th>{actual === "menu" ? "Status" : "Reorder at"}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records
                  .filter((r) =>
                    r.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.name}</strong>
                      </td>
                      <td>{r.category ?? r.unit}</td>
                      <td>
                        {actual === "menu"
                          ? precise(r.selling_price)
                          : r.unit_cost == null
                            ? "Unknown"
                            : `$${r.unit_cost.toFixed(4)}`}
                      </td>
                      <td>
                        {r.weekly_sales_volume ??
                          r.inventory_quantity ??
                          "Unknown"}
                      </td>
                      <td>
                        <span className="badge">
                          {actual === "menu"
                            ? r.is_active
                              ? "Active"
                              : "Idea / inactive"
                            : (r.reorder_threshold ?? "Not set")}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={"Edit " + r.name}
                          onClick={() => setEditing(r)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={"Delete " + r.name}
                          onClick={() => {
                            if (
                              confirm(`Delete ${r.name} from actual records?`)
                            )
                              remove.mutate(r.id);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {kind === "employee" && staffing.data && (
        <details className="card coverage">
          <summary>View skill coverage</summary>
          <span className="eyebrow">SKILL RESILIENCE</span>
          <h3>Where a little backup would help</h3>
          <div className="coverage-grid">
            {staffing.data.skills.map((s: any) => (
              <div key={s.name}>
                <strong>{s.name}</strong>
                <span
                  className={"badge " + (s.count < 2 ? "warning-badge" : "")}
                >
                  {s.count} capable {s.count === 1 ? "person" : "people"}
                </span>
                <small>
                  {s.employees.join(", ") || "No recorded coverage"} · minimum L
                  {s.minimum_proficiency}
                </small>
              </div>
            ))}
          </div>
          <p className="footnote">
            Skill coverage is based on proficiency and positive scheduled hours.
            It does not guarantee shift availability or workload capacity.
          </p>
        </details>
      )}
      {editing && (
        <RecordEditor
          kind={actual}
          initial={editing}
          state={state}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
export function RecordEditor({
  kind,
  initial,
  state,
  onClose,
  onSubmit,
}: {
  kind: Kind;
  initial: any;
  state: State;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}) {
  const [value, setValue] = useState<any>(() =>
    kind === "employee"
      ? {
          name: "",
          role: "Line cook",
          hourly_wage: 20,
          weekly_hours: 30,
          skills: [],
          dish_ids: [],
          availability: "",
          ...initial,
        }
      : kind === "menu"
        ? {
            name: "",
            category: "Mains",
            selling_price: 20,
            weekly_sales_volume: null,
            prep_time_minutes: null,
            is_active: true,
            skills: [],
            recipe: [],
            ...initial,
          }
        : {
            name: "",
            unit: "g",
            unit_cost: null,
            inventory_quantity: null,
            reorder_threshold: null,
            ...initial,
          },
  );
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (data: any) =>
      api(
        `${paths[kind]}${initial.id ? "/" + initial.id : ""}`,
        initial.id ? "PATCH" : "POST",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
    onError: (e) => setError(e.message),
  });
  const set = (k: string, v: any) =>
    setValue((prev: any) => ({ ...prev, [k]: v }));
  const field = (
    label: string,
    key: string,
    type = "text",
    optional = false,
  ) => (
    <label className="form-field">
      {label}
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        required={!optional}
        value={value[key] ?? ""}
        onChange={(e) =>
          set(
            key,
            type === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : e.target.value,
          )
        }
      />
      {optional && <small>Leave blank if unknown.</small>}
    </label>
  );
  const skillNames = [
    ...new Set(
      [...state.employees, ...state.menu].flatMap((e) =>
        e.skills.map((s) => s.name),
      ),
    ),
  ];
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const { id, restaurant_id, ...data } = value;
    if (onSubmit) {
      onSubmit(data);
      onClose();
    } else save.mutate(data);
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              {onSubmit ? "HYPOTHETICAL SCENARIO" : "YOUR RESTAURANT RECORDS"}
            </span>
            <h2 id="editor-title">
              {initial.id ? "Edit" : "Add"} {kind === "menu" ? "dish" : kind}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close editor"
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            {field("Name", "name")}
            {kind === "employee" ? (
              <>
                {field("Role", "role")}
                {field("Hourly wage ($)", "hourly_wage", "number")}
                {field("Weekly hours", "weekly_hours", "number")}
                {field("Availability / shifts", "availability", "text", true)}
              </>
            ) : kind === "menu" ? (
              <>
                {field("Category", "category")}
                {field("Selling price ($)", "selling_price", "number")}
                {field(
                  "Weekly servings (sales assumption)",
                  "weekly_sales_volume",
                  "number",
                  true,
                )}
                {field(
                  "Prep time (minutes)",
                  "prep_time_minutes",
                  "number",
                  true,
                )}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={value.is_active}
                    onChange={(e) => set("is_active", e.target.checked)}
                  />{" "}
                  Active on the menu
                </label>
              </>
            ) : (
              <>
                <label className="form-field">
                  Inventory & recipe unit
                  <select
                    value={value.unit}
                    onChange={(e) => set("unit", e.target.value)}
                  >
                    <option value="g">Grams (g)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="each">Each</option>
                  </select>
                </label>
                {field(
                  "Cost per " + value.unit + " ($)",
                  "unit_cost",
                  "number",
                  true,
                )}
                {field(
                  "Available quantity (" + value.unit + ")",
                  "inventory_quantity",
                  "number",
                  true,
                )}
                {field(
                  "Reorder threshold (" + value.unit + ")",
                  "reorder_threshold",
                  "number",
                  true,
                )}
              </>
            )}
          </div>
          {kind !== "ingredient" && (
            <section className="form-section">
              <h4>
                {kind === "employee"
                  ? "Skills & proficiency"
                  : "Required skills & minimum proficiency"}
              </h4>
              <datalist id="known-skills">
                {skillNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {value.skills.map((s: any, i: number) => (
                <div className="form-row" key={i}>
                  <input
                    aria-label="Skill name"
                    list="known-skills"
                    placeholder="Search or add a skill"
                    required
                    value={s.name}
                    onChange={(e) =>
                      set(
                        "skills",
                        value.skills.map((v: any, j: number) =>
                          j === i ? { ...v, name: e.target.value } : v,
                        ),
                      )
                    }
                  />
                  <select
                    aria-label="Skill proficiency"
                    value={s.proficiency}
                    onChange={(e) =>
                      set(
                        "skills",
                        value.skills.map((v: any, j: number) =>
                          j === i
                            ? { ...v, proficiency: Number(e.target.value) }
                            : v,
                        ),
                      )
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        Level {n}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remove skill"
                    onClick={() =>
                      set(
                        "skills",
                        value.skills.filter((_: any, j: number) => j !== i),
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  set("skills", [...value.skills, { name: "", proficiency: 2 }])
                }
              >
                <Plus size={14} /> Add skill
              </Button>
            </section>
          )}
          {kind === "employee" && (
            <section className="form-section">
              <h4>Explicit dish capabilities</h4>
              <p className="footnote">
                Optional: record a dish this person can prepare independently of
                their skill tags.
              </p>
              <div className="checkbox-grid">
                {state.menu.map((d) => (
                  <label className="checkbox-label" key={d.id}>
                    <input
                      type="checkbox"
                      checked={value.dish_ids.includes(d.id)}
                      onChange={(e) =>
                        set(
                          "dish_ids",
                          e.target.checked
                            ? [...value.dish_ids, d.id]
                            : value.dish_ids.filter((i: number) => i !== d.id),
                        )
                      }
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </section>
          )}
          {kind === "menu" && (
            <section className="form-section">
              <h4>Recipe for one serving</h4>
              <p className="footnote">
                Quantities use each ingredient’s recorded unit. An empty recipe
                means cost is unknown.
              </p>
              {value.recipe.map((r: any, i: number) => (
                <div className="form-row" key={i}>
                  <select
                    aria-label="Recipe ingredient"
                    required
                    value={r.ingredient_id || ""}
                    onChange={(e) =>
                      set(
                        "recipe",
                        value.recipe.map((v: any, j: number) =>
                          j === i
                            ? { ...v, ingredient_id: Number(e.target.value) }
                            : v,
                        ),
                      )
                    }
                  >
                    <option value="">Select ingredient</option>
                    {state.ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Quantity per serving"
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={r.quantity_required}
                    onChange={(e) =>
                      set(
                        "recipe",
                        value.recipe.map((v: any, j: number) =>
                          j === i
                            ? {
                                ...v,
                                quantity_required: Number(e.target.value),
                              }
                            : v,
                        ),
                      )
                    }
                  />
                  <span>
                    {
                      state.ingredients.find((x) => x.id === r.ingredient_id)
                        ?.unit
                    }
                  </span>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Remove recipe ingredient"
                    onClick={() =>
                      set(
                        "recipe",
                        value.recipe.filter((_: any, j: number) => j !== i),
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  set("recipe", [
                    ...value.recipe,
                    { ingredient_id: 0, quantity_required: 1 },
                  ])
                }
              >
                <Plus size={14} /> Add ingredient
              </Button>
            </section>
          )}
          {error && (
            <div className="notice amber" role="alert">
              {error}
            </div>
          )}
          <div className="form-footer">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={save.isPending} type="submit">
              {save.isPending
                ? "Saving…"
                : onSubmit
                  ? "Run hypothetical scenario"
                  : "Save changes"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
