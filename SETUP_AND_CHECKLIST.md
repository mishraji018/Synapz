# 🚀 Visual Notes (AI Summarizer) — Simple Setup & Checklist Guide (Hinglish)

Yeh guide bilkul simple bhasha (Hinglish) mein hai taaki aap easily samajh sakein ki is project ko chalane ke liye kya-kya chahiye, API keys kahan se milengi aur database kaise setup karna hai.

---

## 🔑 1. API Keys & Environment Variables (Kahan kya daalna hai)

Is project mein **2 jagah** API keys chahiye hoti hain:

---

### A. Frontend Setup (React App ke liye)
Apne project ke **root folder** mein ek `.env.local` file banayein (agar pehle se nahi hai) aur usme yeh daalein:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

#### Yeh dono keys kahan se milengi?
1. [Supabase Dashboard](https://supabase.com/dashboard) open karein aur apna project select karein.
2. Left side mein **Project Settings** (Gear icon) &rarr; **API** par click karein.
3. Wahan se **Project URL** copy karke `VITE_SUPABASE_URL` mein daalein.
4. Wahan se **`anon` `public` key** copy karke `VITE_SUPABASE_ANON_KEY` mein daalein.

---

### B. Backend / Supabase Edge Functions Setup (AI Features ke liye)
Yeh keys AI summaries, mindmaps, treemaps, quizzes aur YouTube transcript generate karne ke liye zaroori hain.

| Key Ka Naam | Kiske Liye Chahiye? | Kahan Se Milegi (Free)? |
|---|---|---|
| **`GROQ_API_KEY`** | **Most Important!** AI Summary, Mindmaps, Flashcards, Quiz aur Chat sab isse chalta hai. | [Groq Cloud Console](https://console.groq.com/keys) par free account banayein aur API Key create karein. |
| **`RAPIDAPI_KEY`** | **YouTube Videos ke liye:** YouTube link se automatically transcript nikalne ke liye. | [RapidAPI YouTube Transcriptor](https://rapidapi.com/kome-kome-default/api/youtube-transcriptor/) par free account banakar key lein. |

#### Supabase mein yeh Keys kaise set karein?
Terminal mein yeh commands run karein:
```powershell
npx supabase secrets set GROQ_API_KEY=gsk_aapki_groq_api_key_yahan
npx supabase secrets set RAPIDAPI_KEY=aapki_rapidapi_key_yahan
```
*(Ya fir Supabase Dashboard mein jaakar: **Edge Functions** &rarr; **Secrets** &rarr; **Add New Secret** karke bhi add kar sakte hain).*

---

## 🗄️ 2. Supabase Database Setup (Sirf 1 baar SQL run karna hai)

Aapko database mein `notes` table banana hoga. 
**Kaise karein:**
1. [Supabase Dashboard](https://supabase.com/dashboard) mein jayein.
2. Left menu se **SQL Editor** par click karein.
3. **New Query** kholein aur neeche diya gaya pura SQL code paste karke **Run** button daba dein:

```sql
-- 1. Notes table banayein
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  subject text default 'Uncategorized',
  source_type text not null,
  created_at timestamptz default now(),
  tags text[] default '{}',
  
  -- AI Summary aur points
  bullet_summary text[] default '{}',
  tldr text,
  key_points text[] default '{}',
  action_items text[] default '{}',
  keywords text[] default '{}',
  entities jsonb default '[]'::jsonb,
  document_type text default 'general',
  quality_score jsonb,
  summary_options jsonb,
  original_content text,
  
  -- Visualizations (Mindmap, Treemap, Flashcards, etc.)
  treemap jsonb default '{"main_topic": "", "subtopics": []}'::jsonb,
  mindmap jsonb default '{"nodes": [], "edges": []}'::jsonb,
  flashcards jsonb default '[]'::jsonb,
  timeline jsonb default '[]'::jsonb,
  suggested_videos jsonb default '[]'::jsonb,
  
  -- Annotations, Bookmarks aur Quizzes
  node_annotations jsonb default '[]'::jsonb,
  bookmarks jsonb default '[]'::jsonb,
  quizzes jsonb default '[]'::jsonb
);

-- 2. Row Level Security (RLS) on karein
alter table public.notes enable row level security;

-- 3. Security Rule: Har user sirf apna data dekh sakega
create policy "Users can manage their own notes"
  on public.notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## ⚡ 3. Supabase Edge Functions Deploy Karna

Aapke AI functions ko Supabase server pe deploy karne ke liye terminal mein yeh commands chalayein:

```powershell
npx supabase functions deploy process-content --no-verify-jwt
npx supabase functions deploy chat-with-note --no-verify-jwt
npx supabase functions deploy ask-knowledge --no-verify-jwt
npx supabase functions deploy generate-quiz --no-verify-jwt
npx supabase functions deploy extract-article --no-verify-jwt
npx supabase functions deploy get-youtube-transcript --no-verify-jwt
```

---

## 💻 4. Project Ko Local Machine Par Kaise Chalayein

```powershell
# Step 1: Sabhi packages install karein (agar nahi kiya hai)
npm install

# Step 2: Development server start karein
npm run dev
```

Ab browser mein **`http://localhost:5173`** open karein aur maze lein! 🎉

---

## 🌟 5. Future Suggestions (Aap isme aur kya-kya add kar sakte ho?)

Agar aapko is project ko aur next-level banana hai, toh yeh features aur APIs add kar sakte hain:

1. **🎙️ Voice / Audio Notes Upload (Groq Whisper API)**:
   * Users apni meeting recordings, college lectures ya voice notes (`.mp3`, `.m4a`) upload kar sakein aur AI 5 seconds mein usko transcribe karke visual notes bana de.
2. **📸 Scanned Notes & Handwriting OCR (Google Cloud Vision API / Tesseract)**:
   * Copy/kitab ki photo ya scanned PDF upload karke text extract karna.
3. **🔊 Audio Overview / Listen to Note (ElevenLabs / Web Speech)**:
   * Jaise Google NotebookLM mein audio podcast ban jata hai, waise hi summary ko bol kar sunane ka feature.
4. **🧠 Spaced Repetition Flashcards**:
   * Flashcards ko yaad rakhne ke liye smart revision scheduler (e.g. 1 din baad, 3 din baad, 7 din baad test lena).
5. **📲 Export to Anki / Notion**:
   * Direct flashcards ko Anki app mein ya notes ko Notion mein export karna.
