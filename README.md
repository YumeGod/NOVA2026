# Juniper — Your restaurant, understood.

An AI-powered restaurant business advisor for NOVA 2026. Juniper turns natural-language questions into database-backed analyses, staffing comparisons, menu ideas, and reversible what-if scenarios. The included **Juniper Kitchen** is fictional, clearly labeled demo data.

## Run locally

Requires Python 3.11+ and Node.js 20.19+ (tested with Python 3.13 and Node 24).

```bash
cd ~/Desktop/NOVA2026
./scripts/dev.sh
```

The script installs missing dependencies, starts both services, and stops its processes on Ctrl+C.

- App: http://127.0.0.1:5173
- Backend: http://127.0.0.1:8000
- Interactive REST API documentation: http://127.0.0.1:8000/docs

SQLite tables and the demo dataset initialize automatically on backend startup. No account or authentication is required. This is a loopback-only, single-restaurant demo, **not a production configuration for real customer data**.

### Configure real AI

If `backend/.env` does not already exist, copy the example:

```bash
cp backend/.env.example backend/.env
```

Set these values locally, then restart the backend:

```dotenv
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemini-3.8-flash
OPENROUTER_REASONING_EFFORT=low
DATABASE_URL=sqlite:///./juniper.db
FRONTEND_ORIGIN=http://localhost:5173
```

The model is configurable. Gemini 3.8 Flash was selected from the live OpenRouter model catalog for structured JSON support and a practical demo cost profile. Provider availability/prices can change; see https://openrouter.ai/google/gemini-3.8-flash. The model must support JSON response formatting. `OPENROUTER_REASONING_EFFORT` is optional; low is configured for the demo. Remove it when switching to a model without reasoning controls. Set a different model slug in `.env` to switch without changing application code.

**Never put the key in frontend variables or source files.** `.env`, SQLite files, virtual environments, and build artifacts are ignored by Git. The browser only calls `/api`; all provider calls originate in FastAPI. No keys appear in health responses or client bundles. Missing credentials and provider errors produce explicit messages, not canned AI advice. All deterministic features remain usable.

### Start separately

Backend:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend, in another terminal:

```bash
cd frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Vite proxies `/api` to `127.0.0.1:8000`. There are no frontend secrets. If you deploy the frontend separately, configure a same-origin reverse proxy for `/api` and the backend CORS origin. A static frontend alone cannot run the Python backend. Public hosting/authentication were intentionally not added to this local demo.

## Product capabilities

- **AI Advisor:** persistent conversations and history, suggested questions, bounded recent context, Markdown explanations, explicit missing-information questions, typed scenario actions, inline comparisons, proposed employee/menu changes, and explicit confirmation before saving.
- **Overview:** calculated weekly KPIs, revenue/expense chart, dish contribution chart, popularity/contribution scatter plot, food-cost percentages, and deterministic opportunities with links back to the advisor.
- **Team:** create, edit, and delete employees; wages/hours, availability notes, skill proficiency, explicit dish capabilities, skill coverage, and single-person dependencies.
- **Menu & ingredients:** editable recipes, prices, sales assumptions, active status, required skills, stock levels, ingredient costs and units. Referenced ingredients cannot be deleted or silently switched to another unit.
- **What-if studio:** hire, remove employee, change hours, remove multiple dishes, change one price, or add a recipe. Before/after metrics, ingredient usage changes, lost/gained preparation capabilities, assumptions, and historical scenario snapshots.
- **Hiring:** deterministic missing/underrepresented skill profile, unsupported dishes, and an explicitly illustrative $22/hour × 30-hour hire action that can be revised in the studio.
- **Innovation:** AI proposes recipes with existing ingredient IDs; backend calculates costs and contribution and checks capability/inventory. The card previews financial impact and offers a separate confirm/save action.
- **Settings:** restaurant profile, cuisine, goals, operating days, known weekly fixed costs, and an explicit demo reset.

## Architecture

```text
frontend/                    React + TypeScript + Vite
  src/components/ui/         shadcn-style Button, Radix Slot and CVA
  src/components/Insights    Shared Recharts charts and comparisons
  src/pages/                 Advisor, overview, records, simulator, settings
  src/lib/                   REST client and formatting
  src/types/                 Client data contracts
backend/
  app/api/routes.py          Validated REST endpoints and orchestration entry points
  app/models/                SQLAlchemy relational entities and associations
  app/schemas/               Pydantic input and AI action schemas
  app/services/
    data.py                  Serialization, validated record writes
    seed.py                  Idempotent fictional restaurant seed
    analytics.py             Recipe cost, contribution, weekly aggregation
    staffing.py              Individual preparation capability and skill resilience
    simulator.py             Isolated scenario copies and deltas
    menu_optimizer.py        Proposed recipe feasibility and costing
    ai_service.py            OpenRouter routing and grounded explanation
  app/database.py            SQLite engine, FK enforcement, environment loading
  tests/                     Engine, API, provider-contract and isolation tests
scripts/                     Combined development, verification, opt-in live AI checks
```

React Router provides navigation; TanStack Query owns server state and invalidates affected data after writes. Tailwind plus a custom responsive stylesheet supplies the warm sage/off-white design. Recharts and Markdown are split into separate production chunks. All charts consume API results.

The normalized schema includes Restaurant, Employee, Skill, EmployeeSkill, EmployeeDishCapability, Ingredient, MenuItem, RecipeIngredient, MenuItemSkillRequirement, Conversation, Message, Simulation, and Proposal. No business dataset is hardcoded into frontend charts. Proposal records provide one-time, explicit confirmation before persistence.

### AI request flow

1. Persist the owner's message and retrieve up to 12 recent messages (each bounded in length), plus current structured restaurant records.
2. Send a backend-only request to `https://openrouter.ai/api/v1/chat/completions` with a dedicated system prompt and Pydantic action schema.
3. Parse JSON and validate intent, IDs, parameters, bounds, and proposed fields. Invalid actions never execute arbitrary code/SQL.
4. Run the selected deterministic service. Missing essential parameters trigger a focused follow-up.
5. Send computed results to the model for a concise, evidence-based explanation.
6. Return typed analysis, scenario buttons, assumptions and optional proposal cards.
7. A separate confirmation endpoint applies a proposed record once. Chat alone never changes employees or dishes.

Provider timeouts are 45 seconds per model request (typically two calls per question, up to three when repairing an invalid structured response once). A 6,000-token budget accommodates model reasoning and recipe JSON; reasoning text is excluded from the response. Responses are not streamed. Provider error bodies and raw exceptions are not exposed. Explanations remain model-generated and should be reviewed; the canonical financial values are the backend result objects. There is no arbitrary tool execution, generated SQL, or unlimited history.

### REST API

| Resource | Endpoints |
| --- | --- |
| Status and context | `GET /api/health`, `GET /api/state` |
| Restaurant | `GET /api/restaurant`, `PUT /api/restaurant` |
| Employees | `GET/POST /api/employees`, `PATCH/DELETE /api/employees/{id}` |
| Dishes | `GET/POST /api/menu`, `PATCH/DELETE /api/menu/{id}` |
| Ingredients | `GET/POST /api/ingredients`, `PATCH/DELETE /api/ingredients/{id}` |
| Analytics | `GET /api/analytics/{overview,menu,staffing,hiring}` |
| Scenarios | `POST /api/simulations`, `GET /api/simulations` |
| Conversations | `GET/POST /api/conversations` |
| Messages | `GET/POST /api/conversations/{id}/messages` |
| Confirm AI proposal | `POST /api/proposals/{id}/confirm` |
| Reset demo | `POST /api/demo/reset` |

Example scenario:

```bash
curl http://127.0.0.1:8000/api/simulations \
  -H 'Content-Type: application/json' \
  -d '{"type":"remove_employee","employee_id":2}'
```

The result contains `before`, `after`, `delta`, `coverage_before`, `coverage_after`, `lost_dishes`, `gained_dishes`, `ingredient_usage_changes`, `risks`, and `assumptions`. Only the scenario snapshot is persisted. No staff/menu state changes.

Employee input example:

```json
{"name":"Avery","role":"Cook","hourly_wage":22,"weekly_hours":30,"skills":[{"name":"pastry","proficiency":3}],"dish_ids":[],"availability":"Tue–Sat"}
```

Dish input example (ingredient IDs refer to current records; quantities use their recorded unit):

```json
{"name":"Mushroom rice bowl","category":"Bowls","selling_price":18,"weekly_sales_volume":30,"prep_time_minutes":15,"is_active":true,"recipe":[{"ingredient_id":5,"quantity_required":100},{"ingredient_id":8,"quantity_required":90}],"skills":[{"name":"prep","proficiency":2}]}
```

For unknown sales or costs, use `null`, not zero. PATCH merges the supplied fields with the existing record, then validates the complete result. Zero price is allowed; its food-cost percentage is unknown rather than division by zero. Negative/non-finite amounts and conflicting scenario parameters are rejected.

## Calculations and assumptions

- Ingredient cost per serving = sum of recipe quantity × ingredient unit cost. Recipe units are `g`, `ml`, or `each`; enter quantities in the selected ingredient unit. Automatic kg/oz conversions are not implemented.
- Contribution per serving = selling price − ingredient cost. It is **not net profit**.
- Weekly revenue = price × recorded weekly servings.
- Weekly ingredient cost = recipe cost × recorded weekly servings.
- Weekly contribution = weekly revenue − weekly ingredient cost.
- Scheduled labor = sum of wage × scheduled hours.
- Estimated operating result = contribution − scheduled labor − known fixed costs.
- Monetary line totals use decimal arithmetic and half-up cent rounding; contribution reconciles to rounded revenue and ingredient costs.
- Unknown costs, missing recipes or sales propagate as unknown totals; the system never fills them with fabricated numbers. Empty active menus yield zero recorded revenue with a warning.
- Menu engineering compares active, complete dishes against their **unweighted average contribution per serving and weekly sales**: Star (high/high), Workhorse (popular/lower contribution), Opportunity (less popular/high contribution), Review (low/low). These labels support exploration, not automatic removal decisions.
- A cook supports a dish when they have all required skills at sufficient proficiency, or an explicit dish capability, and positive scheduled hours. A dish without skills/capabilities has unknown/unsupported recorded coverage. Proficiency uses a simple 1–5 scale, not certifications.
- A reduced schedule is not a labor-capacity optimization. Availability is stored as notes; there is no shift solver, demand-by-hour data, overtime, payroll taxes, benefit costs, or kitchen throughput model.
- Staffing simulations hold sales constant and separately flag lost capabilities. They do **not** claim unchanged service quality or guaranteed operating savings.
- Price simulations hold volume constant; elasticity is unknown. Removing dishes removes their recorded sales, with no assumed customer substitution. Fixed costs remain constant.
- A hire adds recorded hypothetical wages; it does not automatically increase sales. Added dishes need an explicit weekly sales assumption for financial estimates.
- Inventory is a static recorded quantity; recipe preview checks only one serving. No inventory depletion, supplier integration or automatic reorder is implemented.
- Generated recipes and suggested prices require a kitchen trial. Ingredient reuse and skills are checked against known records. The current innovation workflow favors known ingredient IDs; adding new ingredients happens through the ingredients editor.
- Conversational writes currently support employees and dishes. Restaurant profile and ingredient editing use their forms. No POS import, accounting integration, payments, multi-tenancy, public hosting, or production authentication is included.
- The dashboard's observations are deterministic and labeled accordingly; personalized AI explanations live in the advisor.

## Five-minute demo

1. Open the app directly into **Ask Juniper**. Expand **This week** for a quick summary; choose **View detailed numbers** only if needed.
2. Ask **“How profitable is my restaurant right now?”** Explain that AI narrates; Python computes.
3. Ask **“Would reducing staff save money without affecting my menu?”** Inspect the staffing comparison actions. Maria's removal saves $660/week but removes the only recorded pastry/baking coverage. Compare another cook with overlapping skills.
4. Click a scenario button. Review current/scenario metrics and the capability risk. Point out that original employee records remain unchanged. Optionally ask **“What if I increase wild mushroom pasta to $24?”** (At 125 servings, the unchanged-volume assumption adds $250/week.)
5. Ask **“Suggest a new dish using my existing ingredients.”** Inspect recipe quantities, computed per-serving cost, skills, and stock feasibility. Preview it, then explicitly confirm if you want it added to the actual demo menu.

You can also ask **“Which dishes should I focus on?”** and **“What skills should my next chef have?”**.

Without an AI key, walk through the dashboard, team, and all six scenario types. The UI explicitly shows that AI setup is needed.

### Reset

Use **My restaurant → Details → Reset demo restaurant** and confirm. This removes demo conversations/proposals/scenarios and restores 6 employees, 10 dishes (9 active and 1 skill-gap idea), 16 ingredients, and a weekly fixed-cost estimate. The reset API does the same; it is destructive to local demo records.

## Verification

```bash
./scripts/check.sh
```

Runs pytest and the production TypeScript/Vite build. Tests cover recipe/contribution calculation, reconciliation, aggregation, unknown values, skill proficiency, six scenario types, ingredient usage, state isolation, CRUD constraints, input validation, confirmation idempotence, persistent conversations, safe provider failures, the OpenRouter HTTP contract, and mocked two-stage AI orchestration.

Optional real-provider check (uses configured credentials, incurs provider usage, and works against an ephemeral in-memory restaurant):

```bash
backend/.venv/bin/python scripts/live_ai_check.py
```

It sends the five guided questions through the real orchestrator without modifying saved restaurant records. Credentials are never printed.

Verification includes **31 passing backend tests**, a successful TypeScript/Vite production build, all five live demo prompts against `google/gemini-3.8-flash` with low reasoning effort, and local HTTP/proxy checks. Observed responses in the five-question run were 5.2–12.1 seconds; this is not a latency guarantee. One Starlette test-client deprecation warning remains; it does not affect runtime or test results. Automated browser visual QA was unavailable because the computer-use browser host could not be reached; responsive layouts are implemented but that visual verification limit remains.

## Simplified interface

The app opens directly into the advisor. There are three navigation choices: **Ask Juniper**, **My restaurant**, and **Try a change**. Menu, ingredients, team and restaurant details share one editing area. The weekly summary, detailed analytics, skill coverage, additional advisor actions, and previous comparisons are available on demand. The extra welcome screen, persistent insights sidebar and duplicate guided prompts have been removed. AI explanations are instructed to lead with a direct answer and at most two recommendations. Saved business data and deterministic calculations are unchanged.

## Voice input

Tap the microphone, speak, and tap stop (45-second maximum). Juniper records audio with browser noise suppression, converts it to mono WAV, and sends it through the backend to OpenRouter for transcription. The model receives menu, staff, and ingredient names as vocabulary hints. Review and edit the transcript before sending. Audio is not persisted by Juniper; it is transmitted to OpenRouter and its model provider. Configure `OPENROUTER_AUDIO_MODEL` to change the audio-capable model (default `google/gemini-2.5-flash`). Use localhost or HTTPS and allow microphone permission. Actual microphone accuracy requires testing with the user's voice and environment.
