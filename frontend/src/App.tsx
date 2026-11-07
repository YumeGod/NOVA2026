import { useState } from "react";
import { NavLink, Route, Routes, Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sprout,
  Sparkles,
  Utensils,
  SlidersHorizontal,
  PanelLeftClose,
} from "lucide-react";
import { api } from "./lib/api";
import type { State, Metrics } from "./types";
import { Advisor } from "./pages/Advisor";
import { Overview } from "./pages/Overview";
import { RestaurantPage } from "./pages/RestaurantPage";
import { Simulator } from "./pages/Simulator";
export default function App() {
  const [open, setOpen] = useState(false);
  const state = useQuery({
    queryKey: ["state"],
    queryFn: () => api<State>("/state"),
  });
  const metrics = useQuery({
    queryKey: ["overview"],
    queryFn: () => api<Metrics>("/analytics/overview"),
  });
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<{ ai_configured: boolean }>("/health"),
  });
  const nav = [
    ["/advisor", "Ask Juniper", Sparkles],
    ["/restaurant", "My restaurant", Utensils],
    ["/simulator", "Try a change", SlidersHorizontal],
  ] as const;
  return (
    <div className="app-shell simple-app">
      {open&&<button className="navigation-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
      <aside className={"sidebar " + (open ? "mobile-open" : "")}>
        <Link to="/advisor" className="brand">
          <div className="brand-icon">
            <Sprout size={24} />
          </div>
          juniper
        </Link>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink to={to} key={to} onClick={() => setOpen(false)}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <strong>{state.data?.restaurant.name ?? "Your restaurant"}</strong>
          <small>Demo restaurant</small>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="mobile-toggle"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            <PanelLeftClose size={20} />
          </button>
          <span>{state.data?.restaurant.name ?? "Juniper"}</span>
          <span className="demo-pill">DEMO</span>
        </header>
        {state.isError || metrics.isError ? (
          <div className="page">
            <p>We couldn’t load your restaurant.</p>
            <button
              className="button primary"
              onClick={() => {
                state.refetch();
                metrics.refetch();
              }}
            >
              Try again
            </button>
          </div>
        ) : !state.data || !metrics.data ? (
          <div className="loading-page">
            <Sprout className="pulse" /> Loading your restaurant…
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/advisor" replace />} />
            <Route
              path="/advisor"
              element={
                <Advisor
                  state={state.data}
                  metrics={metrics.data}
                  aiReady={!!health.data?.ai_configured}
                />
              }
            />
            <Route
              path="/restaurant"
              element={<RestaurantPage state={state.data} />}
            />
            <Route
              path="/simulator"
              element={<Simulator state={state.data} />}
            />
            <Route
              path="/overview"
              element={<Overview state={state.data} metrics={metrics.data} />}
            />
            <Route
              path="/team"
              element={<Navigate to="/restaurant?tab=team" replace />}
            />
            <Route
              path="/menu"
              element={<Navigate to="/restaurant?tab=menu" replace />}
            />
            <Route
              path="/settings"
              element={<Navigate to="/restaurant?tab=details" replace />}
            />
            <Route path="*" element={<Navigate to="/advisor" replace />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
