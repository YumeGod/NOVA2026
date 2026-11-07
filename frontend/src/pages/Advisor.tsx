import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  ArrowUp,
  ArrowUpRight,
  Plus,
  Sprout,
  ChartNoAxesCombined,
  Users,
  ChefHat,
  Check,
  History,
  LoaderCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { api, money, precise } from "../lib/api";
import { SimulationResult } from "../components/Insights";
import { Button } from "../components/ui/button";
import type { State, Metrics, Message, Scenario, Simulation } from "../types";
const starters = [
  {
    icon: ChartNoAxesCombined,
    title: "How is my business doing?",
    question: "How profitable is my restaurant right now?",
  },
  {
    icon: Users,
    title: "Can I lower staffing costs?",
    question: "What happens if I remove one employee?",
  },
  {
    icon: ChefHat,
    title: "Suggest a new dish",
    question: "Suggest a new dish using my existing ingredients.",
  },
];
export function Advisor({
  state,
  metrics,
  aiReady,
}: {
  state: State;
  metrics: Metrics;
  aiReady: boolean;
}) {
  const qc = useQueryClient();
  const [conversation, setConversation] = useState<number | null>(
    () => Number(localStorage.getItem("juniper-conversation")) || null,
  );
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
 const [expandedActions,setExpandedActions]=useState<number[]>([]);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState<Simulation | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api<{ id: number; title: string }[]>("/conversations"),
  });
  const messages = useQuery({
    queryKey: ["messages", conversation],
    queryFn: () => api<Message[]>(`/conversations/${conversation}/messages`),
    enabled: !!conversation,
    retry: false,
  });
  useEffect(() => {
    if (messages.isError) {
      setConversation(null);
      localStorage.removeItem("juniper-conversation");
    }
  }, [messages.isError]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.data]);
  const send = useMutation({
    mutationFn: async (content: string) => {
      let id = conversation;
      if (!id) {
        const c = await api<{ id: number }>("/conversations", "POST");
        id = c.id;
        setConversation(id);
        localStorage.setItem("juniper-conversation", String(id));
      }
      return api(`/conversations/${id}/messages`, "POST", { content });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e) => setError(e.message),
  });
  const simulate = useMutation({
    mutationFn: (s: Scenario) => api<Simulation>("/simulations", "POST", s),
    onSuccess: setScenario,
    onError: (e) => setError(e.message),
  });
  function submit(text = draft) {
    if (!text.trim() || send.isPending) return;
    setError("");
    setDraft("");
    send.mutate(text);
  }
  return (
    <div className="advisor-layout focused-advisor">
      <section className="conversation-pane">
        <div className="weekly-snapshot">
          <button
            onClick={() => setShowSnapshot(!showSnapshot)}
            aria-expanded={showSnapshot}
          >
            This week <strong>{money(metrics.operating_result)}</strong>{" "}
            estimated operating result <span>{showSnapshot ? "−" : "+"}</span>
          </button>
          {showSnapshot && (
            <div className="snapshot-details">
              <span>
                Revenue <strong>{money(metrics.revenue)}</strong>
              </span>
              <span>
                Food costs <strong>{money(metrics.food_cost)}</strong>
              </span>
              <span>
                Labor <strong>{money(metrics.labor_cost)}</strong>
              </span>
              <small>
                After known costs, before tax. {metrics.warnings.join(" ")}
              </small>
              <Link to="/overview" className="text-link">
                View detailed numbers <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
        <div className="advisor-toolbar">
          <div>
            <span className="advisor-mark">
              <Sparkles size={17} />
            </span>
            <strong>Ask Juniper</strong>
            <span className="subtle">Your restaurant advisor.</span>
          </div>
          <div>
            <button
              className="icon-button"
              aria-label="Conversation history"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <History size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="New conversation"
              onClick={() => {
                setConversation(null);
                localStorage.removeItem("juniper-conversation");
                setScenario(null);
              }}
            >
              <Plus size={19} />
            </button>
          </div>
        </div>
        {historyOpen && (
          <div className="history-list">
            <strong>Your conversations</strong>
            {conversations.data?.length ? (
              conversations.data.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setConversation(c.id);
                    localStorage.setItem("juniper-conversation", String(c.id));
                    setHistoryOpen(false);
                  }}
                >
                  {c.title}
                </button>
              ))
            ) : (
              <p>Your conversations will appear here.</p>
            )}
          </div>
        )}
        <div className="chat-scroll">
          {!messages.data?.length && !send.isPending ? (
            <div className="advisor-welcome">
              <div className="bot-symbol">
                <Sprout size={35} strokeWidth={1.5} />
              </div>

              <h1>How can I help?</h1>
              <p>
                Ask about your costs, team, or menu. I’ll use your restaurant’s
                information to help.
              </p>
              <div className="starter-grid">
                {starters.map((s) => (
                  <button key={s.title} onClick={() => submit(s.question)}>
                    <s.icon size={21} strokeWidth={1.5} />
                    <span>{s.title}</span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
              <div className="context-loaded">
                <span className="tiny-dot" />
                {state.employees.length} team members · {metrics.active_dishes}{" "}
                active dishes connected
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.data?.map((m) => (
                <article className={"message " + m.role} key={m.id}>
                  <div className="message-avatar">
                    {m.role === "assistant" ? <Sprout size={19} /> : "JD"}
                  </div>
                  <div className="message-body">
                    <div className="message-label">
                      {m.role === "assistant" ? "JUNIPER" : "YOU"}
                      {m.payload.source === "ai" && (
                        <span>AI explanation · grounded in your records</span>
                      )}
                    </div>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    {m.payload.analysis?.simulation && (
                      <SimulationResult
                        result={m.payload.analysis.simulation}
                      />
                    )}{" "}
                    {!!m.payload.actions?.length && (
                      <div className="action-list">
                        {m.payload.actions.slice(0,expandedActions.includes(m.id)?undefined:2).map((a, i) => (
                          <button
                            disabled={simulate.isPending}
                            key={i}
                            onClick={() => simulate.mutate(a.scenario)}
                          >
                            <span>
                              <strong>{a.label}</strong>
                              {a.detail && <small>{a.detail}</small>}
                            </span>
                            <ArrowUpRight size={17} />
                          </button>
                        ))}
                        {m.payload.actions.length>2&&<button className="text-link" onClick={()=>setExpandedActions(expandedActions.includes(m.id)?expandedActions.filter(id=>id!==m.id):[...expandedActions,m.id])}>{expandedActions.includes(m.id)?'Show fewer options':'Compare more options'}</button>}
                      </div>
                    )}
                    {m.payload.proposal && (
                      <ProposalCard
                        state={state}
                        proposal={m.payload.proposal}
                        preview={m.payload.analysis?.dish_preview}
                      />
                    )}{" "}
                    {!!m.payload.assumptions?.length && (
                      <details>
                        <summary>Assumptions</summary>
                        <ul>
                          {m.payload.assumptions.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </article>
              ))}
              {send.isPending && (
                <div className="thinking">
                  <LoaderCircle size={17} className="spin" /> Reading your
                  records and checking the numbers…
                </div>
              )}
              <div ref={bottom} />
            </div>
          )}
          {scenario && (
            <div className="inline-scenario">
              <button className="text-link" onClick={() => setScenario(null)}>
                Close comparison
              </button>
              <SimulationResult result={scenario} />
            </div>
          )}
        </div>
        <div className="composer-area">
          {!aiReady && (
            <div className="configuration-note">
              <span className="tiny-dot amber-dot" /> AI setup needed. Add your
              OpenRouter credentials to <code>backend/.env</code>.{" "}
              <Link to="/simulator">
                Try a real simulation <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
          {error && (
            <div role="alert" className="notice amber">
              {error}
              <button onClick={() => send.variables && submit(send.variables)}>
                Retry
              </button>
            </div>
          )}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <textarea
              aria-label="Message your advisor"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything about your restaurant…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className="composer-bottom">
              <span>
                <Sparkles size={14} /> Connected to your restaurant
              </span>
              <Button
                disabled={!draft.trim() || send.isPending}
                aria-label="Send message"
                type="submit"
              >
                <ArrowUp size={18} />
              </Button>
            </div>
          </form>
          <small className="composer-caption">
            Based on your saved restaurant information. Review suggestions
            before acting.
          </small>
        </div>
      </section>
    </div>
  );
}
function ProposalCard({
  proposal: p,
  preview,
  state,
}: {
  proposal: NonNullable<Message["payload"]["proposal"]>;
  preview: any;
  state: State;
}) {
  const qc = useQueryClient();
  const simulation = useMutation({
    mutationFn: () =>
      api<Simulation>("/simulations", "POST", {
        type: "add_dish",
        dish: p.data,
      }),
  });
  const apply = useMutation({
    mutationFn: () => api(`/proposals/${p.id}/confirm`, "POST"),
    onSuccess: () => qc.invalidateQueries(),
  });
  return (
    <div className="proposal-card">
      <span className="eyebrow">
        PROPOSED {p.kind.toUpperCase()} · REVIEW BEFORE SAVING
      </span>
      <h3>{p.data.name}</h3>
      {preview ? (
        <>
          <p>
            {precise(preview.ingredient_cost)} ingredients / serving ·{" "}
            {precise(preview.selling_price)} suggested price ·{" "}
            {precise(preview.contribution_per_dish)} contribution
          </p>
          <p>
            Capable team:{" "}
            {preview.capable_employees.join(", ") || "No recorded coverage"}.
            Inventory for one serving: {preview.inventory_status}.
          </p>
          <p>
            {preview.feasibility}.{" "}
            {preview.missing_skills?.length
              ? `Missing skills: ${preview.missing_skills.join(", ")}.`
              : ""}
          </p>
          <ul>
            {preview.recipe_details?.map((r: any) => (
              <li key={r.ingredient_id}>
                {r.name}: {r.quantity_required} {r.unit} / serving
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            disabled={simulation.isPending}
            onClick={() => simulation.mutate()}
          >
            Preview financial impact
          </Button>
          {simulation.isError && (
            <p className="error">{simulation.error.message}</p>
          )}
          {simulation.data && <SimulationResult result={simulation.data} />}
        </>
      ) : (
        <p>
          {p.data.role} · {precise(p.data.hourly_wage)}/hour ×{" "}
          {p.data.weekly_hours} hours/week
        </p>
      )}
      <details>
        <summary>Review proposed details</summary>
        <dl className="proposal-details">
          {Object.entries(p.data)
            .filter(([k]) => !["recipe", "skills", "dish_ids"].includes(k))
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k.replaceAll("_", " ")}</dt>
                <dd>
                  {v == null
                    ? "Unknown"
                    : typeof v === "boolean"
                      ? v
                        ? "Yes"
                        : "No"
                      : String(v)}
                </dd>
              </div>
            ))}
          <div>
            <dt>Skills</dt>
            <dd>
              {p.data.skills
                ?.map((s: any) => `${s.name} (level ${s.proficiency})`)
                .join(", ") || "None recorded"}
            </dd>
          </div>
          {p.kind === "employee" && (
            <div>
              <dt>Explicit dishes</dt>
              <dd>
                {p.data.dish_ids
                  ?.map(
                    (id: number) =>
                      state.menu.find((d) => d.id === id)?.name ??
                      "Unavailable dish",
                  )
                  .join(", ") || "None recorded"}
              </dd>
            </div>
          )}
        </dl>
      </details>
      {apply.isError && <p className="error">{apply.error.message}</p>}
      <Button
        disabled={apply.isPending || apply.isSuccess}
        onClick={() => apply.mutate()}
      >
        {apply.isSuccess ? (
          <>
            <Check size={15} /> Saved to your restaurant
          </>
        ) : (
          "Confirm & save to restaurant"
        )}
      </Button>
      <small>This updates your real demo records. Simulations never do.</small>
    </div>
  );
}
