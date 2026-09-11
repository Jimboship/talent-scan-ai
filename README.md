# TalentScan AI

A SaaS-style resume scanning app built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- Landing page with a primary CTA
- Supabase Auth email login UI
- Dashboard with drag-and-drop PDF upload (up to 500 resumes)
- Candidate table showing name, skills, experience, and uploaded date
- Search bar and results page with top 10 ranked matches
- PostgreSQL schema for resumes plus pgvector embeddings

## Tech stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Storage)
- SQL for database setup

## Local setup

1. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and keys (Settings → API).
2. In the Supabase dashboard, open **SQL Editor**, paste and run `supabase/schema.sql`. This enables pgvector, creates `resumes`, RLS (including updates for embeddings), the `match_resumes` search function, and a private Storage bucket named `resumes`.
3. Under **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the app:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000

## Supabase database schema

The source of truth is `supabase/schema.sql`. It defines:

- `vector` extension
- `resumes` (`id`, `user_id` → `auth.users`, `file_name`, `extracted_text`, `embedding vector(1536)`, `created_at`)
- HNSW cosine index on `embedding`
- Row Level Security so users only read/insert/update/delete their own rows
- `match_resumes(query_embedding, match_count)` — top 10 cosine matches for `auth.uid()`
- Private Storage bucket `resumes` with per-user folder policies (`{user_id}/...`)

## Notes

Email magic-link auth and PDF upload (Storage + text extraction + 1536-d embeddings) are in place. Wiring search to `match_resumes` is still to be completed. Add `OPENAI_API_KEY` to `.env.local` so uploads can be indexed.
