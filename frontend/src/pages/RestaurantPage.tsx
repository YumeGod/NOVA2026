import { useSearchParams } from "react-router-dom";
import type { State } from "../types";
import { DataPage } from "./DataPage";
import { Settings } from "./Settings";
export function RestaurantPage({ state }: { state: State }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "menu";
  const tabs = [
    ["menu", "Menu"],
    ["ingredients", "Ingredients"],
    ["team", "Team"],
    ["details", "Details"],
  ];
  return (
    <div className="restaurant-page">
      <div className="restaurant-heading">
        <h1>My restaurant</h1>
        <p>
          Keep your information up to date. Juniper takes care of the
          calculations.
        </p>
        <div className="tabs" aria-label="Restaurant sections">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "selected" : ""}
              onClick={() => setParams({ tab: key })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "details" ? (
        <Settings state={state} />
      ) : (
        <DataPage
          key={tab}
          kind={tab === "team" ? "employee" : "menu"}
          initialTab={tab === "ingredients" ? "ingredient" : undefined}
          simplified
          state={state}
        />
      )}
    </div>
  );
}
