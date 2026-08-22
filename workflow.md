# Visual Notes — Development Workflow

> AI Content Summarizer ("Visual Notes") — task-wise build plan, adapted to your **actual** stack: TanStack Start + Supabase (Postgres / Auth / Storage / Edge Functions) + Groq. Not the generic Next.js + FastAPI + Redis/Celery version — that blueprint didn't know what you'd already built.

**Legend:** `Lang/Tool` = what to write it in · `UI/UX` = what the user sees/does · `Done when` = the acceptance check.

---

## Current State (Baseline)

| Layer | What you have |
|---|---|
| Frontend + server | TanStack Start (React + TypeScript) |
| DB / Auth / Storage | Supabase — Postgres, Auth, Edge Functions |
| LLM | Groq — `llama-3.3-70b-versatile` |
| Ingestion | YouTube transcripts via RapidAPI |
| Visualizations | Treemap, Mindmap (React Flow), Flashcards, Timeline — working end-to-end |
| Known next steps | Article URL extraction, PDF extraction |

Everything below builds **on top of this** — nothing here replaces what already works.

---

## Stack Decisions for This Workflow

| Need | Tool | Why |
|---|---|---|
| Async background jobs | Supabase `pgmq` + `pg_cron` + `pg_net` + Edge Functions | Native to Postgres — no Redis/Celery to host or pay for |
| Vector search | `pgvector` extension | Same database, no separate vector store |
| Embeddings | Groq `nomic-embed-text-v1_5` | Same API key you already use for Groq chat — no new provider. Free fallback: Supabase Edge Functions can run `gte-small` on-device with zero external calls if you ever want to drop the API dependency |
| Object storage | Supabase Storage | S3-compatible, already part of your project |
| Auth | Supabase Auth | Already resolved per your setup |
| PDF/Article extraction (MVP) | TypeScript, inside TanStack Start server functions | One language, one deploy target |
| OCR (later) | Decision point — see Phase 7 | Python's OCR ecosystem is stronger; only add a second service when scanned PDFs actually show up |

---

## Roadmap at a Glance

| Phase | Focus | Priority |
|---|---|---|
| 0 | Finish input pipeline (Article + PDF) | Now |
| 1 | Persistence layer (documents/summaries/viz history) | Now |
| 2 | Notes & Bookmarks tied to visualizations | Next |
| 3 | Search (keyword + semantic) | Next |
| 4 | Ask My Knowledge (RAG chat) | Next |
| 5 | Tags & Collections | Later |
| 6 | Study Intelligence (revision, quiz) | Later |
| 7 | Advanced extraction (OCR, audio, multi-doc) | Later |
| 8 | Hardening & deploy | Ongoing — finalize before public launch |

---

## Database Schema

Run as one Supabase migration. `auth.users` already exists — everything else hangs off it.

```sql
create extension if not exists vector;
create extension if not exists pgmq; -- if this errors, enable via Database → Extensions in the dashboard instead

-- Documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('youtube','pdf','article','text')),
  source_url text,
  title text not null,
  raw_content text,
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Summaries (multiple "views" per document)
create table summaries (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  type text not null check (type in ('short','detailed','bullet','exam','eli5')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Visualizations — persist your Treemap/Mindmap/Timeline/Flashcards output
create table visualizations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  viz_type text not null check (viz_type in ('treemap','mindmap','flashcards','timeline')),
  viz_data jsonb not null,
  created_at timestamptz not null default now()
);

-- Notes — can hang off a whole document OR one specific viz node
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  viz_id uuid references visualizations(id) on delete set null,
  viz_node_id text,
  title text,
  content text not null,
  created_at timestamptz not null default now()
);

-- Bookmarks
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  viz_node_id text,
  label text,
  created_at timestamptz not null default now()
);

-- Tags
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unique(user_id, name)
);

create table document_tags (
  document_id uuid references documents(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (document_id, tag_id)
);

-- Ask My Knowledge (chat)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

-- Chunks + embeddings for search / RAG
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  token_count int
);

create table embeddings (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references document_chunks(id) on delete cascade,
  embedding vector(768), -- confirm exact dim with a real nomic-embed-text-v1_5 call before locking this
  created_at timestamptz not null default now()
);

create index on embeddings using hnsw (embedding vector_cosine_ops);
```

**RLS — every table above, no exceptions:**

```sql
alter table documents enable row level security;

create policy "own documents"
on documents for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

For tables without a direct `user_id` (`summaries`, `visualizations`, `document_chunks`, `embeddings` — all keyed through `document_id`), join up to `documents`:

```sql
alter table summaries enable row level security;

create policy "own summaries"
on summaries for all
using (
  exists (select 1 from documents d where d.id = summaries.document_id and d.user_id = auth.uid())
)
with check (
  exists (select 1 from documents d where d.id = summaries.document_id and d.user_id = auth.uid())
);
```

Repeat this join pattern for `visualizations`, `document_chunks`, and `embeddings`.

---

## Server Function Pattern (reuse this shape everywhere)

```ts
// src/utils/documents.functions.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseServerClient } from './supabase.server'

export const saveDocument = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      sourceType: z.enum(['youtube', 'pdf', 'article', 'text']),
      sourceUrl: z.string().optional(),
      title: z.string(),
      rawContent: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: doc, error } = await supabase
      .from('documents')
      .insert({ ...data, status: 'processing' })
      .select()
      .single()
    if (error) throw error
    return doc
  })
```

Every "Lang/Tool: TypeScript — server function" task below reuses this shape: `.functions.ts` for the `createServerFn` wrapper, `.server.ts` for the DB/AI logic it calls into.

---

## Phase 0 — Finish the Input Pipeline
*(Your own already-identified next step — do this first.)*

- [ ] **Article URL extraction**
  - **Lang/Tool:** TypeScript — `@mozilla/readability` + `jsdom` inside a server function
  - **UI/UX:** "Paste a link" tab next to your existing YouTube input, same loading state
  - **Done when:** Pasting a blog/article URL produces a summary + at least one visualization, same as YouTube today

- [ ] **PDF extraction (text-based PDFs)**
  - **Lang/Tool:** TypeScript — `pdf-parse` or `unpdf` in a server function; files go through Supabase Storage first
  - **UI/UX:** "Upload PDF" tab, drag-and-drop, page count shown while processing
  - **Done when:** A normal (non-scanned) PDF produces summary + visualizations

---

## Phase 1 — Persistence Layer
*(This is the actual answer to your original question — "purana summary/notes wapas kaise dekhein".)*

- [ ] **Wire generation to `documents` + `summaries` + `visualizations` tables**
  - **Lang/Tool:** TypeScript, `createServerFn` (see pattern above)
  - **UI/UX:** No visible change yet — makes generation persistent instead of throwaway
  - **Done when:** Refreshing the page after generating a summary still shows it

- [ ] **Dashboard / History page**
  - **Lang/Tool:** New route `/dashboard` (TanStack file-based routing)
  - **UI/UX:** Grid of past documents — title, source icon, date, which viz types exist
  - **Done when:** Clicking a past document reopens its full summary + visualizations exactly as generated

- [ ] **"Regenerate as" dropdown on summaries**
  - **Lang/Tool:** TS — new `summaries` row per regeneration, `type` distinguishes short/detailed/exam/eli5
  - **UI/UX:** Dropdown next to the summary panel — Short / Detailed / Exam Notes / ELI5
  - **Done when:** Switching the dropdown shows a cached version if it exists, generates + saves if not

---

## Phase 2 — Notes & Bookmarks (tied to your visualizations, not plain text)

- [ ] **Contextual "Add Note" on visualization nodes**
  - **Lang/Tool:** TS — `notes` table; `viz_node_id` captured from whichever node was clicked in React Flow / Treemap / Timeline / Flashcards
  - **UI/UX:** "+" or right-click on any node → inline note box
  - **Done when:** A note saved on a Mindmap node is retrievable later, linked back to that exact node

- [ ] **Bookmarks (⭐)**
  - **Lang/Tool:** TS — `bookmarks` table
  - **UI/UX:** Star icon on nodes/summary sections; "My Bookmarks" page grouped by document
  - **Done when:** Starring persists across sessions and shows on the Bookmarks page

---

## Phase 3 — Search

- [ ] **Chunking on ingest**
  - **Lang/Tool:** TS — split `raw_content` into ~500–800 token chunks into `document_chunks`
  - **UI/UX:** None (backend only)
  - **Done when:** Every processed document has chunk rows

- [ ] **Embedding generation (async, Supabase-native)**
  - **Lang/Tool:** SQL trigger on `document_chunks` insert → `pgmq` queue → Edge Function (Deno/TS) calls Groq `nomic-embed-text-v1_5` → writes to `embeddings`. Follow Supabase's "Automatic Embeddings" guide (linked above) instead of hand-rolling a worker system
  - **UI/UX:** Document status shows "Indexing…" until embeddings finish, then "Ready"
  - **Done when:** New documents get embeddings without you manually triggering anything

- [ ] **Hybrid search function**
  - **Lang/Tool:** SQL — one Postgres function combining `pgvector` cosine search + Postgres full-text (`tsvector`) over documents/summaries/notes
  - **UI/UX:** None yet (used by the search page below)
  - **Done when:** The function returns ranked results for a test query across documents + notes

- [ ] **Global Search page**
  - **Lang/Tool:** New route `/search`, calls the hybrid search function via a server function
  - **UI/UX:** Search bar + tabs (All / Documents / Notes / Questions), results link back to source (document + specific node where applicable)
  - **Done when:** Searching a term you've actually studied returns the right document, note, and past question together

---

## Phase 4 — Ask My Knowledge (RAG chat)

- [ ] **Conversation + message persistence**
  - **Lang/Tool:** TS — `conversations` / `messages` tables
  - **UI/UX:** Chat panel, past conversations in a sidebar
  - **Done when:** Reopening a past conversation shows full history

- [ ] **RAG query flow**
  - **Lang/Tool:** Server function — embed the question (Groq `nomic-embed-text-v1_5`) → call your hybrid search function → build context from top ~5–10 chunks/notes → Groq chat completion (`llama-3.3-70b-versatile`) with that context
  - **UI/UX:** Answer streams in; source chips below it link back to the originating document/node
  - **Done when:** Asking "what did I learn about X" returns an answer grounded in your own saved content, with working source links

---

## Phase 5 — Tags & Collections

- [ ] **Tags**
  - **Lang/Tool:** TS — `tags` + `document_tags`
  - **UI/UX:** Tag chips on documents, filter bar on Dashboard/Search
  - **Done when:** Filtering by a tag shows only tagged documents

- [ ] **Collections/Folders** *(optional — only if tags feel insufficient once you have 50+ docs)*
  - **Lang/Tool:** TS — self-referencing `collections` table if you go this route
  - **UI/UX:** Sidebar folder tree
  - **Done when:** Documents can be filed into a folder and filtered by it

---

## Phase 6 — Study Intelligence

- [ ] **Revision mode for your existing Flashcards viz**
  - **Lang/Tool:** TS — add `reviewed`/`correct` flags per card, resurface wrong-answered cards sooner
  - **UI/UX:** "Start Revision" button on any document with flashcards; flip/swipe interaction
  - **Done when:** A revision session tracks right/wrong and resurfaces weak cards next session

- [ ] **Quiz/MCQ generator**
  - **Lang/Tool:** Groq prompt over a document's summary + notes, structured JSON output (question, options, correct answer)
  - **UI/UX:** "Generate Quiz" button on document view
  - **Done when:** Quiz questions are answerable and scored in-app

---

## Phase 7 — Advanced Extraction

- [ ] **OCR for scanned PDFs — decision point**
  - **Option A:** Small Python (FastAPI) microservice with `pytesseract` + `pdf2image`, called the way you already call RapidAPI
  - **Option B:** Hosted OCR API — no service to run yourself
  - **UI/UX:** Same PDF upload flow — detect "no extractable text" and route to OCR
  - **Done when:** A scanned PDF produces a usable summary

- [ ] **Audio/transcript summarization** — reuse the YouTube pipeline's summarization step; Groq's own Whisper endpoint is a natural transcript source since you already have a Groq key

- [ ] **Multi-document comparison / cross-doc Q&A** — extend the Phase 4 RAG flow to pull chunks from multiple `document_id`s instead of one

---

## Phase 8 — Hardening & Deploy

- [ ] **RLS audit** — every table above scoped to `auth.uid()`, no exceptions
- [ ] **Upload validation** — check MIME type + size + actual content in the server function before storing, not just the file extension
- [ ] **Rate limiting** — on extraction and chat endpoints specifically (these cost you Groq/RapidAPI usage)
- [ ] **Basic error logging** — enough to catch failed jobs; a full observability stack is overkill pre-launch
- [ ] **Deploy** — TanStack Start ships via Nitro (deploy-anywhere: Vercel/Netlify/your own Node host); wire up env vars for Supabase + Groq + RapidAPI keys

---

## Open Decisions (only you can make these)

| Decision | Options | Recommendation |
|---|---|---|
| Embedding source | Groq `nomic-embed-text-v1_5` vs. Supabase local `gte-small` | Groq — one less provider, you already have the key |
| OCR approach | Python microservice vs. hosted OCR API | Defer to Phase 7 — don't add a second backend before you need it |
| Collections vs. tags-only | Nested folders vs. flat tags | Start tags-only; add folders only if it genuinely feels insufficient later |