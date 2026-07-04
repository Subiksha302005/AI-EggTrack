# 🥚 EggTrack — AI-Powered Poultry Farm Advisor

An AI-powered web application that helps egg (layer) poultry farms track flock age/stage, log daily production, and get grounded AI advice on feed, lighting, vaccination schedules, and disease/production-drop diagnosis.

Built as a demonstration of prompt engineering design principles applied to a real-world agricultural domain, using the poultry industry cluster of Namakkal, Tamil Nadu (India's largest egg-producing region) as the practical context.

---

## 1. Problem Statement

Egg poultry farming faces several recurring, well-documented real-world problems:

| Problem | Root Cause |
|---|---|
| Sudden egg production drops go uninvestigated too long | No structured way to link symptoms to causes |
| Disease outbreaks (Newcastle, coccidiosis, bronchitis) are caught late | No habit of early symptom logging, vet not always reachable |
| Feed and lighting are often generic instead of age-specific | Nutritional/lighting needs change across chick → grower → layer stages |
| No production record-keeping | Daily egg counts tracked on paper or not at all |
| Vaccination schedules are missed | Hard to track manually across a full flock cycle |

**EggTrack** addresses these by combining structured record-keeping (SQL database) with two purpose-built AI advisory features (LLM calls), rather than a single generic chatbot.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Language | JavaScript (100%) |
| Backend | Node.js + Express |
| Database | SQLite (`better-sqlite3`) |
| Frontend | HTML, CSS, vanilla JavaScript |
| LLM | Google Gemini API (`gemini-2.5-flash`) |
| Prompt Engineering | Role prompting, context injection, structured JSON output, domain grounding, confidence scoring, prompt chaining |

---

## 3. System Architecture

```
Browser (HTML/CSS/JS)
        │  fetch()
        ▼
Node.js + Express Server
        │
        ├──► SQLite Database (flocks, stage_advisories, production_logs, diagnoses)
        │
        └──► Gemini LLM API (two purpose-built prompts)
```

**Flow:** User interacts with a page → JS sends a request to Express → Express builds a context-specific prompt and calls the LLM (or queries SQL directly for non-AI features) → response is saved to SQLite → result is returned to the browser and rendered.

---

## 4. The Layer Poultry Timeline (Domain Knowledge Baked In)

The application's core logic keys all AI advice off the flock's **current age**, automatically calculated from the registered hatch date:

```
Chick Stage        (0–6 weeks)
Grower Stage        (6–18 weeks)
Pre-Lay / Point-of-Lay (18–20 weeks)
Peak Lay            (20–40 weeks)  — ~85–95% daily lay rate
Late Lay            (40–72 weeks)  — gradual production decline
Molting / Cull Decision (72+ weeks)
```

This mapping ensures the AI never gives generic, one-size-fits-all advice — every response is specific to where the flock actually is in its production cycle.

---

## 5. Database Schema

```sql
flocks (id, flock_name, breed, bird_count, hatch_date, housing_type, created_at)
stage_advisories (id, flock_id, current_stage, feed_recommendation, lighting_schedule,
                   vaccination_due, risk_alerts, logged_at)
production_logs (id, flock_id, log_date, eggs_collected, mortality_count,
                  feed_consumed_kg)
diagnoses (id, flock_id, symptoms, likely_cause, confidence, recommended_action,
           logged_at)
```

One flock → many stage advisories, many production logs, many diagnoses (1-to-many relational design).

---

## 6. Prompt Engineering — Design Decisions

This is the core deliverable of the project: two distinct, purpose-built prompts, each demonstrating specific, deliberate design principles rather than a single generic "ask the AI anything" interface.

### Prompt 1 — Stage Advisory (LLM Call 1)

```
You are a poultry farm advisor specializing in layer (egg-producing) birds.
Flock details: Breed: {breed}, Age: {ageInWeeks} weeks, Housing: {housingType},
Current stage: {stage}

Give advice specific to this exact stage only — do not give general lifecycle advice.
Return ONLY valid JSON, no other text, in this exact format:
{
  "feedRecommendation": "...",
  "lightingSchedule": "...",
  "vaccinationDue": ["..."],
  "riskAlerts": ["..."]
}
```

**Design principles demonstrated:**
- **Role prompting** — assigning the model a specific professional identity ("poultry farm advisor") sets tone and grounds its frame of reference before any data is given.
- **Context injection** — every prompt is dynamically filled with real flock data (breed, age, housing, stage), so no two responses are generic or reusable across flocks.
- **Output constraint (structured generation)** — forcing strict JSON output makes the response reliably parseable and storable, instead of unpredictable free-form prose that's hard to render or save.
- **Stage constraint** — explicitly instructing the model to address *only* the current stage prevents it from padding the answer with irrelevant lifecycle information.

### Prompt 2 — Symptom Diagnosis (LLM Call 2)

```
You are diagnosing a poultry production issue. Only consider causes well-documented in
layer poultry (e.g., Newcastle disease, infectious bronchitis, coccidiosis, heat stress,
calcium deficiency, lighting program error, molting, feed transition stress).

Flock age: {ageInWeeks} weeks. Current lay stage: {stage}.
Symptom/issue reported: "{symptoms}"

If symptoms don't clearly match a known issue, say so rather than guessing.
Always include a note to consult a veterinarian for confirmation.

Return ONLY valid JSON, no other text, in this exact format:
{
  "likelyCause": "...",
  "confidence": "low | medium | high",
  "recommendedAction": "...",
  "note": "Consult a veterinarian to confirm this diagnosis."
}
```

**Design principles demonstrated:**
- **Domain grounding** — restricting the model to a fixed list of real, documented poultry conditions prevents it from inventing a plausible-sounding but incorrect diagnosis.
- **Confidence scoring** — the model must self-rate its certainty (low/medium/high), giving the user a calibrated signal rather than false authority.
- **Refusal instruction (hallucination mitigation)** — explicitly instructing the model to say "this doesn't clearly match" when uncertain, rather than forcing a guess, is a responsible-AI pattern that matters here because a wrong diagnosis in poultry farming has real financial and biosecurity consequences.
- **Mandatory disclaimer** — every diagnosis includes a built-in instruction to consult a veterinarian, keeping the tool positioned as a first-line assistant rather than a replacement for professional care.

**In testing**, this exact behavior was observed: when given ambiguous symptoms ("lethargic, huddling, slightly cold"), the model correctly reported **low confidence** and explicitly noted the symptoms didn't clearly match the documented list — rather than forcing a fabricated diagnosis. This is direct evidence the grounding and refusal instructions work as designed.

### Prompt Chaining
Rather than one large "do-everything" prompt, the two LLM calls are kept separate and purpose-built. This makes each prompt easier to test, debug, and refine independently, and keeps each JSON output schema focused and predictable.

---

## 7. Core Features

1. **Flock Registration** — name, breed, bird count, hatch date, housing type
2. **Auto Stage Calculation** — age and lifecycle stage computed automatically from hatch date on every page load
3. **AI Stage Advisory** — feed, lighting, vaccination, and risk guidance specific to the current stage (LLM Call 1)
4. **Daily Production Logging** — eggs collected, mortality, feed consumed, stored in SQL
5. **AI Symptom Diagnosis** — grounded, confidence-scored diagnosis from a plain-language symptom description (LLM Call 2)
6. **Dashboard** — lists all registered flocks with quick links to each flock's detail page

---

## 8. API Routes

```
POST   /api/flocks                  → register a new flock
GET    /api/flocks                  → list all flocks
GET    /api/flocks/:id              → get one flock with calculated age/stage
POST   /api/flocks/:id/advisory     → generate AI stage advisory
POST   /api/flocks/:id/production   → log daily production
GET    /api/flocks/:id/production   → get production history
POST   /api/flocks/:id/diagnose     → submit symptoms, get AI diagnosis
GET    /api/flocks/:id/history      → full timeline of advisories + diagnoses
```

---

## 9. Regional Context — Namakkal Poultry Belt

This project is contextualized around Namakkal, Tamil Nadu — one of India's largest egg-producing regions, responsible for a major share of India's egg output through commercial layer farming that began in the 1970s. Common breeds/strains used in this region's commercial layer farms include BV-380, Lohmann Brown, Bovans White, Hy-Line Brown, and Babcock Brown, alongside locally developed varieties such as Namakkal Chicken-1, developed by the Department of Poultry Science at the Veterinary College and Research Institute, Namakkal.

---

## 10. How to Run

```bash
npm install
node server.js
```
Then open `http://localhost:3000` in a browser.

Requires a `.env` file with:
```
GEMINI_API_KEY=your_key_here
PORT=3000
```

---

## 11. Future Improvements
- Production trend chart on the dashboard (Chart.js)
- Multi-flock comparison view
- SMS/email alerts for high-confidence disease diagnoses
- Export flock history as PDF report
