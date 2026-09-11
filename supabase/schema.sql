create extension if not exists vector;

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_name text not null,
  extracted_text text,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx
  on public.resumes (user_id);

create index if not exists resumes_embedding_idx
  on public.resumes using hnsw (embedding vector_cosine_ops);

alter table public.resumes enable row level security;

create policy "Users can view own resumes"
  on public.resumes
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own resumes"
  on public.resumes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own resumes"
  on public.resumes
  for delete
  using (auth.uid() = user_id);
