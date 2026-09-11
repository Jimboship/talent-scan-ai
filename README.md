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

1. Copy `.env.example` to `.env.local` and fill in your Supabase values.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the app:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000

## Supabase database schema

```sql
create extension if not exists vector;

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_name text not null,
  extracted_text text,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists resumes_user_id_idx on resumes(user_id);
```

## Notes

This starter app includes the UI and Supabase client setup. To complete the production-ready workflow, connect your own Supabase project and add your PDF upload, extraction, and semantic search logic.
